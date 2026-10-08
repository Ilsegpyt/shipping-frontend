import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
    ArrowLeft,
    ArrowUpRight,
    Boxes,
    FileCheck2,
    Globe2,
    Plane,
} from 'lucide-react';
import contentService from '../../../services/contentService';

const SECTION_ICONS = [Globe2, Boxes, FileCheck2, Plane];

const getItems = (response) => {
    const data = response?.data ?? response;

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.data)) return data.data;

    return [];
};

const parseCmsBody = (body, pageTitle = '') => {
    if (!body) {
        return {
            heroSubtitle: '',
            heroDescription: '',
            introText: '',
            sections: [],
        };
    }

    const doc = new DOMParser().parseFromString(body, 'text/html');
    const elements = Array.from(doc.body.children);

    const cleanText = (value) =>
        value?.replace(/\s+/g, ' ').trim() || '';

    const getText = (element) =>
        cleanText(element?.textContent || '');

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

    const normalizedPageTitle = cleanText(pageTitle).toLowerCase();

    /*
     * The CMS body contains the page title in some cases.
     * It is NOT a service card, so explicitly exclude it from
     * the service-heading collection.
     */
    const headingEntries = elements
        .map((element, index) => ({
            element,
            index,
            text: getText(element),
        }))
        .filter(({ element, text }) => {
            if (!isHeading(element)) return false;

            return text.toLowerCase() !== normalizedPageTitle;
        });

    /*
     * Everything before the first actual service heading is the
     * top content of the old design:
     *
     * paragraph 1 = hero subtitle
     * paragraph 2 = hero description
     * paragraph 3 = introduction
     */
    const firstServiceIndex =
        headingEntries[0]?.index ?? elements.length;

    const topParagraphs = elements
        .slice(0, firstServiceIndex)
        .filter(
            (element) =>
                element.tagName === 'P' &&
                !isStrongParagraph(element)
        );

    const heroSubtitle = getText(topParagraphs[0]);
    const heroDescription = getText(topParagraphs[1]);
    const introText = topParagraphs[2]?.innerHTML || '';

    /*
     * Each remaining heading starts exactly one service card.
     */
    const sections = headingEntries.map(
        ({ element, index }, sectionIndex) => {
            const nextHeading = headingEntries[sectionIndex + 1];

            const endIndex = nextHeading
                ? nextHeading.index
                : elements.length;

            const content = elements.slice(index + 1, endIndex);

            const text = content
                .filter(
                    (item) =>
                        item.tagName === 'P' &&
                        !isStrongParagraph(item)
                )
                .map((item) => item.innerHTML)
                .filter(Boolean);

            const list = content
                .filter(isList)
                .flatMap((listElement) =>
                    Array.from(
                        listElement.querySelectorAll(':scope > li')
                    ).map((li) => li.innerHTML)
                );

            return {
                title: getText(element),
                icon: SECTION_ICONS[sectionIndex] || Plane,
                text,
                list,
            };
        }
    );

    /*
     * In the CMS, "Our services include:" belongs to the
     * "No matter the size..." card. If it sits before that
     * heading, move it there.
     */
    const serviceIntroIndex = sections.findIndex((section) =>
        section.text.some((html) =>
            cleanText(
                html.replace(/<[^>]*>/g, ' ')
            )
                .toLowerCase()
                .includes('our services include')
        )
    );

    if (
        serviceIntroIndex >= 0 &&
        sections[serviceIntroIndex + 1]
    ) {
        const serviceIntro =
            sections[serviceIntroIndex].text.find((html) =>
                cleanText(
                    html.replace(/<[^>]*>/g, ' ')
                )
                    .toLowerCase()
                    .includes('our services include')
            );

        sections[serviceIntroIndex].text =
            sections[serviceIntroIndex].text.filter(
                (html) => html !== serviceIntro
            );

        sections[serviceIntroIndex + 1].text.unshift(
            serviceIntro
        );
    }

    return {
        heroSubtitle,
        heroDescription,
        introText,
        sections,
    };
};

function AirFreight() {
    const [page, setPage] = useState(null);
    const [parent, setParent] = useState(null);
    const [cms, setCms] = useState({
        heroSubtitle: '',
        heroDescription: '',
        introText: '',
        sections: [],
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        window.scrollTo(0, 0);

        const loadPage = async () => {
            try {
                setLoading(true);
                setError('');

                const rootResponse = await contentService.getRootContent();
                const roots = getItems(rootResponse);

                let airFreight = roots.find(
                    (item) =>
                        item?.title?.trim().toLowerCase() === 'air freight'
                );
                let parentItem = null;

                if (!airFreight) {
                    for (const root of roots) {
                        const childrenResponse =
                            await contentService.getChildren(root.id);
                        const children = getItems(childrenResponse);

                        const match = children.find(
                            (item) =>
                                item?.title?.trim().toLowerCase() ===
                                'air freight'
                        );

                        if (match) {
                            airFreight = match;
                            parentItem = root;
                            break;
                        }
                    }
                }

                if (!airFreight) {
                    throw new Error(
                        'Air Freight page was not found in the CMS.'
                    );
                }

                const pageResponse = await contentService.getById(
                    airFreight.id
                );
                const fullPage = pageResponse?.data ?? pageResponse;

                setPage(fullPage);
                setParent(parentItem);
                setCms(parseCmsBody(fullPage?.body, fullPage?.title));
            } catch (err) {
                console.error(
                    'Failed to load Air Freight content:',
                    err
                );
                setError(
                    err?.message ||
                    'Failed to load Air Freight content.'
                );
            } finally {
                setLoading(false);
            }
        };

        loadPage();
    }, []);

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

    const pageTitle = page?.title || 'Air Freight';
    const parentTitle = parent?.title || 'Solutions';

    return (
        <main className="min-h-screen bg-white text-slate-900">
            {/* Hero */}
            <section className="relative overflow-hidden bg-slate-950">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(14,165,233,0.22),transparent_35%)]" />

                <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-sky-500/10 to-transparent" />

                <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-32 lg:px-8 lg:pb-32">
                    <Link
                        to="/solutions"
                        className="mb-12 inline-flex items-center gap-2 text-sm font-medium text-white/70 transition hover:text-white"
                    >
                        <ArrowLeft size={16} />
                        Back to {parentTitle}
                    </Link>

                    <div className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">
                        <div>
                            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-md">
                                <span className="h-2 w-2 rounded-full bg-sky-400" />

                                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/85">
                                    {parentTitle}
                                </span>
                            </div>

                            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
                                {pageTitle}
                            </h1>

                            {cms.heroSubtitle && (
                                <p className="mt-7 max-w-2xl text-2xl font-medium leading-tight text-sky-400 sm:text-3xl">
                                    {cms.heroSubtitle}
                                </p>
                            )}

                            {cms.heroDescription && (
                                <p className="mt-7 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
                                    {cms.heroDescription}
                                </p>
                            )}
                        </div>

                        <div className="relative min-h-[430px] overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900 shadow-2xl">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(56,189,248,0.18),transparent_30%),radial-gradient(circle_at_75%_70%,rgba(14,165,233,0.14),transparent_32%)]" />

                            <div className="absolute inset-0 opacity-[0.08]">
                                <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white" />
                                <div className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white" />
                            </div>

                            <div className="relative flex min-h-[430px] items-center justify-center">
                                <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] border border-sky-400/20 bg-sky-400/10 text-sky-400 shadow-2xl">
                                    <Plane size={52} strokeWidth={1.5} />
                                </div>
                            </div>

                            <div className="absolute bottom-8 left-8 right-8 rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
                                <p className="text-sm font-semibold text-white">
                                    {pageTitle}
                                </p>

                                <p className="mt-1 text-sm text-white/50">
                                    {cms.heroSubtitle || cms.heroDescription}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Introduction */}
            <section className="py-24 sm:py-32">
                <div className="mx-auto max-w-5xl px-6 lg:px-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                        {pageTitle}
                    </p>

                    <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
                        Reliable air freight for every type of cargo
                    </h2>

                    {cms.introText && (
                        <div
                            className="mt-8 text-lg leading-8 text-slate-600"
                            dangerouslySetInnerHTML={{
                                __html: cms.introText,
                            }}
                        />
                    )}
                </div>
            </section>

            {/* Services */}
            <section className="bg-slate-50 py-24 sm:py-32">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="space-y-8">
                        {cms.sections.map((section, index) => {
                            const Icon =
                                section.icon ||
                                SECTION_ICONS[index] ||
                                Plane;

                            return (
                                <article
                                    key={`${section.title}-${index}`}
                                    className="grid overflow-hidden rounded-[2rem] border border-slate-200 bg-white lg:grid-cols-2"
                                >
                                    <div
                                        className={`min-h-[320px] bg-gradient-to-br from-sky-100 via-white to-slate-100 p-8 sm:p-12 ${index % 2
                                                ? 'lg:order-2'
                                                : ''
                                            }`}
                                    >
                                        <div className="flex h-full flex-col justify-between">
                                            <div>
                                                <div className="inline-flex rounded-2xl bg-white p-3 text-sky-600 shadow-sm">
                                                    <Icon
                                                        size={26}
                                                        strokeWidth={1.8}
                                                    />
                                                </div>

                                                <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">
                                                    {pageTitle}
                                                </p>

                                                <h3 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                                                    {section.title}
                                                </h3>
                                            </div>

                                            <div className="mt-10 flex items-center gap-3 text-sm font-medium text-slate-500">
                                                <span className="h-px w-10 bg-sky-400" />
                                                {parentTitle}
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        className={`bg-white p-8 sm:p-12 ${index % 2
                                                ? 'lg:order-1'
                                                : ''
                                            }`}
                                    >
                                        <div className="space-y-5 text-base leading-7 text-slate-600">
                                            {section.text.map(
                                                (paragraph, paragraphIndex) => (
                                                    <div
                                                        key={paragraphIndex}
                                                        dangerouslySetInnerHTML={{
                                                            __html: paragraph,
                                                        }}
                                                    />
                                                )
                                            )}

                                            {section.list.length > 0 && (
                                                <ul className="space-y-3 pt-2">
                                                    {section.list.map(
                                                        (item, itemIndex) => (
                                                            <li
                                                                key={itemIndex}
                                                                className="flex items-start gap-3"
                                                            >
                                                                <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                                                                <span
                                                                    dangerouslySetInnerHTML={{
                                                                        __html:
                                                                            item,
                                                                    }}
                                                                />
                                                            </li>
                                                        )
                                                    )}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* CTA - UI block kept from the original design.
                The CMS body provided for this page does not contain CTA content. */}
            <section className="bg-slate-950 py-24 sm:py-32">
                <div className="mx-auto max-w-5xl px-6 text-center lg:px-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
                        {parentTitle}
                    </p>

                    <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                        Need a fast and reliable air freight solution?
                    </h2>

                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/60">
                        Let ILS help you move your cargo efficiently across
                        the supply chain.
                    </p>

                    <div className="mt-10 flex flex-wrap justify-center gap-4">
                        <Link
                            to="/solutions"
                            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                        >
                            Back to {parentTitle}
                        </Link>

                        <a
                            href="/#contact"
                            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
                        >
                            Discuss your requirements
                            <ArrowUpRight size={17} />
                        </a>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default AirFreight;
