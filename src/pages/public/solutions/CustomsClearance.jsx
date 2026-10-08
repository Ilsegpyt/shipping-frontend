import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import contentService from '../../../services/contentService';
import {
    ArrowLeft,
    ArrowUpRight,
    Check,
    FileCheck2,
    Globe2,
} from 'lucide-react';

const getContentTypeName = (type) => {
    if (typeof type === 'string') {
        return type;
    }

    switch (type) {
        case 1:
            return 'Category';
        case 2:
            return 'Page';
        case 3:
            return 'Post';
        case 4:
            return 'Link';
        default:
            return '';
    }
};

function decodeHtml(value = '') {
    let decoded = value;

    for (let i = 0; i < 3; i += 1) {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = decoded;
        const next = textarea.value;

        if (next === decoded) {
            break;
        }

        decoded = next;
    }

    return decoded;
}

function parseCustomsClearanceContent(body = '') {
    const html = decodeHtml(body)
        .replace(/```(?:html|text)?/gi, '')
        .replace(/```/g, '')
        .trim();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const clean = (value = '') =>
        value
            .replace(/\u00a0/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

    const textOf = (node) => clean(node?.textContent || '');

    const headings = Array.from(
        doc.body.querySelectorAll('h1,h2,h3,h4')
    );

    const paragraphs = Array.from(
        doc.body.querySelectorAll('p')
    ).filter((node) => textOf(node));

    const findHeading = (patterns) =>
        headings.find((node) => {
            const value = textOf(node).toLowerCase();

            return patterns.some((pattern) =>
                value.includes(pattern)
            );
        });

    const titleNode =
        headings.find(
            (node) =>
                textOf(node).toLowerCase() ===
                'customs clearance'
        ) || headings[0];

    const expertiseHeadingNode = findHeading([
        'the expertise you need',
        'expertise you need',
    ]);

    const complianceHeadingNode = findHeading([
        'customs care and compliance',
    ]);

    const title =
        textOf(titleNode) || 'Customs Clearance';

    const subtitle =
        paragraphs.find((node) =>
            textOf(node)
                .toLowerCase()
                .includes(
                    'our licensed broker services ensure compliance'
                )
        )?.textContent?.trim() || '';

    const expertiseHeading =
        textOf(expertiseHeadingNode) ||
        'THE EXPERTISE YOU NEED TO ENSURE SUCCESSFUL TRANSPORT AND DELIVERY';

    const complianceHeading =
        textOf(complianceHeadingNode) ||
        'CUSTOMS CARE AND COMPLIANCE';

    /*
     * IMPORTANT:
     * Do not use doc.body.children here.
     * RichTextEditor can wrap the CMS content in divs.
     *
     * Instead, use the actual DOM order of the heading and paragraphs.
     * This works whether the paragraphs are direct children or nested
     * inside editor-generated divs.
     */
    const isAfter = (first, second) =>
        Boolean(
            first.compareDocumentPosition(second) &
            Node.DOCUMENT_POSITION_FOLLOWING
        );

    const getParagraphsBetween = (startHeading, endHeading) => {
        if (!startHeading) {
            return [];
        }

        return paragraphs
            .filter((paragraph) => {
                if (!isAfter(startHeading, paragraph)) {
                    return false;
                }

                if (
                    endHeading &&
                    !isAfter(paragraph, endHeading)
                ) {
                    return false;
                }

                return true;
            })
            .map(textOf)
            .filter(Boolean);
    };

    let expertiseParagraphs = getParagraphsBetween(
        expertiseHeadingNode,
        complianceHeadingNode
    );

    expertiseParagraphs = expertiseParagraphs.filter(
        (value) =>
            value.toLowerCase() !==
            subtitle.toLowerCase()
    );

    /*
     * If the CMS has no heading wrappers, fall back to the paragraph
     * order from the actual CMS body.
     */
    if (!expertiseParagraphs.length) {
        const allParagraphs = paragraphs
            .map(textOf)
            .filter(Boolean);

        expertiseParagraphs = allParagraphs.filter(
            (value) =>
                value.toLowerCase() !==
                subtitle.toLowerCase() &&
                !value
                    .toLowerCase()
                    .includes(
                        'our licensed broker services ensure compliance'
                    )
        );

        const complianceTextIndex =
            expertiseParagraphs.findIndex((value) =>
                value
                    .toLowerCase()
                    .includes(
                        'at ils, we understand the importance'
                    )
            );

        if (complianceTextIndex >= 0) {
            expertiseParagraphs =
                expertiseParagraphs.slice(
                    0,
                    complianceTextIndex
                );
        }
    }

    const complianceParagraphs = getParagraphsBetween(
        complianceHeadingNode,
        null
    );

    const complianceIntro =
        complianceParagraphs.find(
            (value) =>
                value
                    .toLowerCase()
                    .includes(
                        'at ils, we understand the importance'
                    )
        ) ||
        complianceParagraphs[0] ||
        '';

    const complianceServicesIntro =
        complianceParagraphs.find(
            (value) =>
                value
                    .toLowerCase()
                    .includes(
                        'depending on the country'
                    )
        ) ||
        complianceParagraphs[1] ||
        '';

    let services = Array.from(
        doc.body.querySelectorAll('li')
    )
        .map(textOf)
        .filter(Boolean);

    if (!services.length) {
        const knownServices = new Set([
            'import and export declarations',
            'temporary importation',
            'weekly groupage services from alexandria to port said',
            'customs warehousing',
            'duty drawback',
            'national customs rulings',
        ]);

        services = Array.from(
            doc.body.querySelectorAll('p,div,span')
        )
            .map(textOf)
            .filter((value) =>
                knownServices.has(value.toLowerCase())
            );
    }

    return {
        title,
        subtitle,
        expertiseHeading,
        expertiseParagraphs,
        complianceHeading,
        complianceIntro,
        complianceServicesIntro,
        services,
    };
}

function CustomsClearance() {
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        window.scrollTo(0, 0);

        const loadContent = async () => {
            try {
                const rootResponse = await contentService.getRootContent();

                if (!Array.isArray(rootResponse.data)) {
                    throw new Error(
                        'Invalid response from GET /api/content/root.'
                    );
                }

                const rootContent = rootResponse.data;

                if (rootContent.length === 0) {
                    throw new Error(
                        'GET /api/content/root returned no content.'
                    );
                }

                const visited = new Set();
                const allContent = [];

                const loadTree = async (items) => {
                    for (const item of items) {
                        if (!item?.id || visited.has(item.id)) {
                            continue;
                        }

                        visited.add(item.id);
                        allContent.push(item);

                        try {
                            const childrenResponse =
                                await contentService.getChildren(item.id);

                            const children = Array.isArray(
                                childrenResponse.data
                            )
                                ? childrenResponse.data
                                : [];

                            if (children.length > 0) {
                                await loadTree(children);
                            }
                        } catch (childError) {
                            console.error(
                                `Failed to load children for content ${item.id}:`,
                                childError
                            );

                            throw new Error(
                                `Failed to load children for "${item.title || item.id}".`
                            );
                        }
                    }
                };

                await loadTree(rootContent);

                const page = allContent.find(
                    (item) =>
                        getContentTypeName(item.type) === 'Page' &&
                        item?.title?.trim().toLowerCase() ===
                        'customs clearance'
                );

                if (!page) {
                    console.error(
                        'CMS content loaded, but Customs Clearance was not found.',
                        allContent.map((item) => ({
                            id: item.id,
                            title: item.title,
                            type: item.type,
                            typeName: getContentTypeName(item.type),
                        }))
                    );

                    throw new Error(
                        'Customs Clearance page was not found in CMS.'
                    );
                }

                const detailsResponse = await contentService.getById(page.id);
                const details = detailsResponse.data || page;

                setContent({
                    title: details.title || page.title,
                    ...parseCustomsClearanceContent(details.body || ''),
                });
            } catch (error) {
                console.error(
                    'Failed to load Customs Clearance content:',
                    error
                );
            } finally {
                setLoading(false);
            }
        };

        loadContent();
    }, []);

    const cms = content || {};
    const title = cms.title || 'Customs Clearance';
    const subtitle =
        cms.subtitle || 'Our licensed broker services ensure compliance';
    const expertiseHeading =
        cms.expertiseHeading ||
        'THE EXPERTISE YOU NEED TO ENSURE SUCCESSFUL TRANSPORT AND DELIVERY';
    const expertiseParagraphs = cms.expertiseParagraphs || [];
    const complianceHeading =
        cms.complianceHeading || 'CUSTOMS CARE AND COMPLIANCE';
    const complianceIntro = cms.complianceIntro || '';
    const complianceServicesIntro = cms.complianceServicesIntro || '';
    const services = cms.services || [];

    if (loading) {
        return (
            <main className="min-h-screen bg-white text-slate-900">
                <div className="flex min-h-screen items-center justify-center">
                    <div className="text-sm font-medium text-slate-500">
                        Loading...
                    </div>
                </div>
            </main>
        );
    }

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
                        Back to Solutions
                    </Link>

                    <div className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">
                        <div>
                            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-md">
                                <span className="h-2 w-2 rounded-full bg-sky-400" />

                                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/85">
                                    ILS Solutions
                                </span>
                            </div>

                            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
                                {title}
                            </h1>

                            <p className="mt-7 max-w-2xl text-2xl font-medium leading-tight text-sky-400 sm:text-3xl">
                                {subtitle}
                            </p>
                        </div>

                        <div className="relative min-h-[430px] overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900 shadow-2xl">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(56,189,248,0.18),transparent_30%),radial-gradient(circle_at_75%_70%,rgba(14,165,233,0.14),transparent_32%)]" />

                            <div className="absolute inset-0 opacity-[0.08]">
                                <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white" />
                                <div className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white" />
                                <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white" />
                            </div>

                            <div className="relative flex min-h-[430px] items-center justify-center">
                                <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] border border-sky-400/20 bg-sky-400/10 text-sky-400 shadow-2xl">
                                    <FileCheck2 size={52} strokeWidth={1.5} />
                                </div>
                            </div>

                            <div className="absolute bottom-8 left-8 right-8 rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
                                <p className="text-sm font-semibold text-white">
                                    {title}
                                </p>

                                <p className="mt-1 text-sm text-white/50">
                                    {subtitle}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Expertise */}
            <section className="py-24 sm:py-32">
                <div className="mx-auto max-w-5xl px-6 lg:px-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                        {title}
                    </p>

                    <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
                        {expertiseHeading}
                    </h2>

                    <div className="mt-8 space-y-6 text-lg leading-8 text-slate-600">
                        {expertiseParagraphs.map((paragraph, index) => (
                            <p key={`${index}-${paragraph.slice(0, 20)}`}>
                                {paragraph}
                            </p>
                        ))}
                    </div>
                </div>
            </section>

            {/* Customs Care and Compliance */}
            <section className="bg-slate-50 py-24 sm:py-32">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
                        <div>
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm">
                                <Globe2 size={28} strokeWidth={1.7} />
                            </div>

                            <p className="mt-7 text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                                Compliance
                            </p>

                            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                                {complianceHeading}
                            </h2>
                        </div>

                        <div>
                            <p className="text-lg leading-8 text-slate-600">
                                {complianceIntro}
                            </p>

                            <p className="mt-8 text-lg leading-8 text-slate-600">
                                {complianceServicesIntro}
                            </p>

                            <div className="mt-8 grid gap-4 sm:grid-cols-2">
                                {services.map((item, index) => (
                                    <div
                                        key={`${index}-${item}`}
                                        className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                                    >
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                                            <Check size={19} />
                                        </span>

                                        <span className="text-sm font-semibold leading-6 text-slate-800">
                                            {item}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="bg-sky-600 py-20">
                <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 lg:flex-row lg:items-center lg:px-8">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                            Customs Clearance
                        </p>

                        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                            Need support with customs clearance?
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

export default CustomsClearance;
