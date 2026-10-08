import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import contentService from '../../../services/contentService';
import { Anchor, ArrowUpRight, Check, Ship } from 'lucide-react';

const getItems = (response) => {
    const data = response?.data ?? response;

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.data)) return data.data;

    return [];
};

const cleanText = (value) => {
    if (value === null || value === undefined) return '';

    if (typeof value === 'string' || typeof value === 'number') {
        return String(value).replace(/\s+/g, ' ').trim();
    }

    if (value instanceof Element) {
        return (value.textContent || '').replace(/\s+/g, ' ').trim();
    }

    return String(value).replace(/\s+/g, ' ').trim();
};

const isList = (element) =>
    element?.tagName === 'UL' || element?.tagName === 'OL';

const isStrongParagraph = (element) => {
    if (!element || element.tagName !== 'P') return false;

    const children = Array.from(element.children);

    return (
        children.length > 0 &&
        children.every((child) =>
            ['STRONG', 'B'].includes(child.tagName)
        )
    );
};

const isSectionHeading = (element) =>
    ['H2', 'H3', 'H4'].includes(element?.tagName) ||
    isStrongParagraph(element);

const parseCmsBody = (body, pageTitle) => {
    if (!body) {
        return {
            heroSubtitle: '',
            heroDescription: '',
            introTitle: '',
            introText: '',
            localKnowledge: null,
            services: null,
            compliance: null,
            carriers: null,
            ctaText: '',
        };
    }

    const doc = new DOMParser().parseFromString(body, 'text/html');
    const elements = Array.from(doc.body.children);

    const text = (element) =>
        element?.textContent?.replace(/\s+/g, ' ').trim() || '';

    const isList = (element) =>
        element?.tagName === 'UL' || element?.tagName === 'OL';

    const isStrongParagraph = (element) => {
        if (!element || element.tagName !== 'P') return false;

        const children = Array.from(element.children);

        return (
            children.length > 0 &&
            children.every((child) =>
                ['STRONG', 'B'].includes(child.tagName)
            )
        );
    };

    const isHeading = (element) =>
        ['H1', 'H2', 'H3', 'H4'].includes(element?.tagName) ||
        isStrongParagraph(element);

    const normalizedPageTitle =
        String(pageTitle || '').trim().toLowerCase();

    // Ignore the page title if it is also stored inside Body.
    const bodyElements = elements.filter(
        (element) =>
            !(
                isHeading(element) &&
                text(element).toLowerCase() === normalizedPageTitle
            )
    );

    /*
     * Actual CMS order for Sea Freight:
     *
     * Sea Freight
     * When cost matters...
     * 5555...
     * ILS's SEA FREIGHT SERVICES...
     * intro paragraph
     * LOCAL KNOWLEDGE...
     * paragraph
     * OUR SEA FREIGHT SERVICES INCLUDE:
     * list
     * SEA FREIGHT COMPLIANCE
     * paragraph
     * A NETWORK...
     * paragraph
     * final contact paragraph
     *
     * So do NOT infer hero content from all <p> elements blindly.
     */

    const headings = bodyElements
        .map((element, index) => ({
            element,
            index,
            title: text(element),
        }))
        .filter(({ element }) => isHeading(element));

    const firstHeadingIndex = headings[0]?.index ?? bodyElements.length;

    const beforeFirstHeading = bodyElements.slice(0, firstHeadingIndex);

    const heroParagraphs = beforeFirstHeading.filter(
        (element) => element.tagName === 'P'
    );

    const heroSubtitle = text(heroParagraphs[0]);
    const heroDescription = text(heroParagraphs[1]);

    const introHeading = headings[0];

    const introStart = introHeading
        ? introHeading.index + 1
        : firstHeadingIndex;

    const introEnd = headings[1]?.index ?? bodyElements.length;

    const introContent = bodyElements.slice(introStart, introEnd);

    const introParagraph = introContent.find(
        (element) => element.tagName === 'P'
    );

    const introTitle = introHeading?.title || pageTitle;
    const introText = introParagraph?.innerHTML || '';

    const sectionHeadings = headings.slice(1);

    const parseSection = (headingInfo, sectionIndex) => {
        const next = sectionHeadings[sectionIndex + 1];

        const endIndex = next
            ? next.index
            : bodyElements.length;

        const content = bodyElements.slice(
            headingInfo.index + 1,
            endIndex
        );

        const paragraphs = content
            .filter(
                (element) =>
                    element.tagName === 'P' &&
                    !isStrongParagraph(element)
            )
            .map((element) => element.innerHTML)
            .filter(Boolean);

        const lists = content
            .filter(isList)
            .flatMap((list) =>
                Array.from(
                    list.querySelectorAll(':scope > li')
                ).map((li) => li.innerHTML)
            );

        const isServicesSection =
            headingInfo.title
                .toLowerCase()
                .includes('sea freight services') ||
            headingInfo.title
                .toLowerCase()
                .includes('our services');

        return {
            title: headingInfo.title,
            text: isServicesSection ? [] : paragraphs,
            list: isServicesSection
                ? (
                    lists.length > 0
                        ? lists
                        : paragraphs
                )
                : lists,
        };
    };

    const sections = sectionHeadings.map(parseSection);

    // Always preserve the services list from the CMS. The editor may save
    // the section title as a plain paragraph, so the list must not depend
    // on the heading being detected as H2/H3/strong.
    const allCmsLists = bodyElements
        .filter(isList)
        .flatMap((list) =>
            Array.from(
                list.querySelectorAll(':scope > li')
            ).map((li) => li.innerHTML)
        );

    const servicesHeadingElement = bodyElements.find((element) => {
        const title = text(element).toLowerCase();

        return (
            title.includes('sea freight services include') ||
            title.includes('our services')
        );
    });

    const servicesFallback = servicesHeadingElement
        ? {
            title: text(servicesHeadingElement),
            text: [],
            list: allCmsLists,
        }
        : null;

    const findSection = (...keywords) =>
        sections.find((section) => {
            const title = section.title.toLowerCase();

            return keywords.some((keyword) =>
                title.includes(keyword)
            );
        }) || null;

    const carriers = findSection(
        'network of trusted',
        'trusted sea freight',
        'carrier'
    );

    /*
     * The last paragraph can be a CTA/contact sentence and should not
     * be swallowed into the carriers section.
     */
    let ctaText = '';

    if (carriers?.text?.length > 1) {
        ctaText = carriers.text.at(-1);
        carriers.text = carriers.text.slice(0, -1);
    }

    return {
        heroSubtitle,
        heroDescription,
        introTitle,
        introText,
        localKnowledge: findSection(
            'local knowledge',
            'local conditions'
        ),
        services:
            findSection(
                'services',
                'sea freight services include'
            ) || servicesFallback,
        compliance: findSection('compliance'),
        carriers,
        ctaText,
    };
};

function SeaFreight() {
    const [page, setPage] = useState(null);
    const [parent, setParent] = useState(null);
    const [body, setBody] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        window.scrollTo(0, 0);

        const loadPage = async () => {
            try {
                setLoading(true);
                setError('');

                const rootResponse =
                    await contentService.getRootContent();
                const roots = getItems(rootResponse);

                let summary = roots.find(
                    (item) =>
                        item?.title?.trim().toLowerCase() ===
                        'sea freight'
                );

                let parentItem = null;

                if (!summary) {
                    for (const root of roots) {
                        const childrenResponse =
                            await contentService.getChildren(root.id);

                        const children = getItems(childrenResponse);

                        const match = children.find(
                            (item) =>
                                item?.title?.trim().toLowerCase() ===
                                'sea freight'
                        );

                        if (match) {
                            summary = match;
                            parentItem = root;
                            break;
                        }
                    }
                }

                if (!summary) {
                    throw new Error(
                        'Sea Freight page was not found in the CMS.'
                    );
                }

                const pageResponse =
                    await contentService.getById(summary.id);

                const fullPage =
                    pageResponse?.data ?? pageResponse;

                setPage(fullPage);
                setParent(parentItem);
                setBody(
                    parseCmsBody(
                        fullPage?.body,
                        fullPage?.title || 'Sea Freight'
                    )
                );
            } catch (err) {
                console.error(
                    'Failed to load Sea Freight content:',
                    err
                );

                setError(
                    err?.message ||
                    'Failed to load Sea Freight content.'
                );
            } finally {
                setLoading(false);
            }
        };

        loadPage();
    }, []);

    const cms = useMemo(
        () =>
            body || {
                heroSubtitle: '',
                heroDescription: '',
                introTitle: '',
                introText: '',
                localKnowledge: null,
                services: null,
                compliance: null,
                carriers: null,
            },
        [body]
    );

    if (loading) {
        return <main className="min-h-screen bg-white" />;
    }

    if (error) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-white px-6">
                <p className="text-red-600">{error}</p>
            </main>
        );
    }

    const pageTitle = page?.title || 'Sea Freight';
    const parentTitle = parent?.title || 'Solutions';

    return (
        <main className="min-h-screen bg-white text-slate-900">

            {/* Hero */}
            <section className="relative overflow-hidden bg-slate-950">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(14,165,233,0.22),transparent_35%)]" />
                <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-sky-500/10 to-transparent" />

                <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-16 lg:px-8 lg:pb-32">
                    <Link
                        to="/solutions"
                        className="mb-12 inline-flex items-center gap-2 text-sm font-medium text-white/60 transition hover:text-white"
                    >
                        ← Back to {parentTitle}
                    </Link>

                    <div className="grid items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
                        <div>
                            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-md">
                                <span className="h-2 w-2 rounded-full bg-sky-400" />

                                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/85">
                                    {pageTitle}
                                </span>
                            </div>

                            <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
                                {pageTitle.toUpperCase()}
                            </h1>

                            <p className="mt-7 max-w-3xl text-xl leading-8 text-white/70 sm:text-2xl">
                                {cms.heroSubtitle}
                            </p>
                        </div>

                        <div className="relative hidden h-[360px] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] lg:flex">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(14,165,233,0.16),transparent_55%)]" />

                            <div className="absolute left-1/2 top-1/2 flex h-48 w-48 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-sky-400/20">
                                <div className="absolute h-32 w-32 rounded-full border border-sky-400/20" />

                                <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-sky-400/20 bg-sky-400/10">
                                    <Ship
                                        size={46}
                                        strokeWidth={1.4}
                                        className="text-sky-400"
                                    />
                                </div>
                            </div>

                            <div className="absolute bottom-8 left-8">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
                                    Global {pageTitle}
                                </p>

                                <p className="mt-2 max-w-xs text-sm leading-6 text-white/50">
                                    {cms.heroDescription}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Introduction */}
            <section className="py-24 sm:py-28">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">

                        <div>
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                                <Anchor size={28} strokeWidth={1.7} />
                            </div>

                            <p className="mt-7 text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                                {pageTitle}
                            </p>

                            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl">
                                ILS's {pageTitle.toUpperCase()} SERVICES SUPPORT YOUR NEEDS FOR OPTIMIZED, SECURE AND FLEXIBLE SOLUTIONS
                            </h2>
                        </div>

                        <div className="text-base leading-8 text-slate-600 sm:text-lg">
                            <p>
                                {cms.introText}
                            </p>
                        </div>

                    </div>
                </div>
            </section>

            {/* Local Knowledge */}
            <section className="bg-slate-50 py-24 sm:py-28">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="max-w-3xl">

                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                            {cms.localKnowledge?.title || 'Local knowledge of local conditions'}
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                            {cms.localKnowledge?.title || 'Local knowledge of local conditions'}
                        </h2>

                        <p className="mt-6 text-base leading-8 text-slate-600 sm:text-lg">
                            {cms.localKnowledge?.text?.[0] || ''}
                        </p>

                    </div>
                </div>
            </section>

            {/* Services */}
            <section className="py-24 sm:py-28">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">

                    <div className="max-w-3xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                            {cms.services?.title || 'Our services'}
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                            {cms.services?.title ||
                                `OUR ${pageTitle.toUpperCase()} SERVICES INCLUDE:`}
                        </h2>
                    </div>

                    <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {(cms.services?.list || []).map(
                            (service, index) => (
                                <div
                                    key={`${service}-${index}`}
                                    className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                                >
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                                        <Check size={19} />
                                    </span>

                                    <span
                                        className="text-sm font-semibold text-slate-800"
                                        dangerouslySetInnerHTML={{
                                            __html: service,
                                        }}
                                    />
                                </div>
                            )
                        )}
                    </div>

                </div>
            </section>

            {/* Compliance */}
            <section className="bg-slate-950 py-24 text-white sm:py-28">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">

                    <div className="max-w-4xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
                            Compliance
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                            {pageTitle.toUpperCase()} COMPLIANCE
                        </h2>

                        <p className="mt-6 text-base leading-8 text-slate-300 sm:text-lg">
                            {cms.compliance?.text?.[0] || ''}
                        </p>
                    </div>

                </div>
            </section>

            {/* Trusted Carriers */}
            <section className="py-24 sm:py-28">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">

                    <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">

                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                                Global carrier network
                            </p>

                            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                                A NETWORK OF TRUSTED {pageTitle.toUpperCase()} CARRIERS
                            </h2>
                        </div>

                        <div
                            className="text-base leading-8 text-slate-600 sm:text-lg"
                            dangerouslySetInnerHTML={{
                                __html:
                                    cms.carriers?.text?.[0] || '',
                            }}
                        />

                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="bg-sky-600 py-20">
                <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 lg:flex-row lg:items-center lg:px-8">

                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                            {pageTitle}
                        </p>

                        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                            {pageTitle} — Get the right solution for your cargo
                        </h2>
                    </div>

                    <a
                        href="/#contact"
                        className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                    >
                        Discuss your requirements
                        <ArrowUpRight size={17} />
                    </a>

                </div>
            </section>

        </main>
    );
}

export default SeaFreight;
