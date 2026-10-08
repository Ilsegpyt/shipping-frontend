import { useEffect, useState } from 'react';

import contentService from '../../../services/contentService';

const getTypeName = (type) => {
    if (typeof type === 'string') return type;

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

const getPurposeAndStrategyPage = async () => {
    const rootResponse = await contentService.getRootContent();
    const roots = Array.isArray(rootResponse.data) ? rootResponse.data : [];

    const aboutIls = roots.find(
        (item) =>
            item?.title?.trim().toLowerCase() === 'about ils' &&
            getTypeName(item.type) === 'Category'
    );

    if (!aboutIls?.id) {
        throw new Error('About ILS category was not found in CMS.');
    }

    const childrenResponse = await contentService.getChildren(aboutIls.id);
    const children = Array.isArray(childrenResponse.data)
        ? childrenResponse.data
        : [];

    const pageSummary = children.find(
        (item) =>
            item?.title?.trim().toLowerCase() === 'purpose and strategy' &&
            getTypeName(item.type) === 'Page'
    );

    if (!pageSummary?.id) {
        throw new Error(
            'Purpose and Strategy page was not found under About ILS in CMS.'
        );
    }

    const pageResponse = await contentService.getById(pageSummary.id);

    if (!pageResponse?.data) {
        throw new Error(
            'Purpose and Strategy page details could not be loaded from CMS.'
        );
    }

    return {
        page: pageResponse.data,
        parent: aboutIls,
    };
};

const parseCmsBody = (body) => {
    if (!body) {
        return {
            intro: '',
            sections: [],
        };
    }

    const parser = new DOMParser();
    const document = parser.parseFromString(body, 'text/html');
    const elements = Array.from(document.body.children);

    const headingTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

    const isHeading = (element) =>
        headingTags.includes(element?.tagName?.toLowerCase());

    const getHtml = (element) => element?.innerHTML?.trim() || '';
    const getText = (element) =>
        element?.textContent?.replace(/\s+/g, ' ').trim() || '';

    const firstHeadingIndex = elements.findIndex(isHeading);

    const introElements =
        firstHeadingIndex === -1
            ? elements
            : elements.slice(0, firstHeadingIndex);

    const intro = introElements
        .filter((element) => element.tagName.toLowerCase() === 'p')
        .map(getHtml)
        .filter(Boolean)
        .join('');

    const sections = [];

    for (let index = 0; index < elements.length; index += 1) {
        const element = elements[index];

        if (!isHeading(element)) {
            continue;
        }

        const label = getText(element);
        let cursor = index + 1;
        let subtitle = '';

        /*
         * The original design has:
         * label -> subtitle -> paragraphs.
         *
         * Read the next paragraph/heading from CMS as the subtitle.
         * Nothing is hardcoded.
         */
        while (cursor < elements.length && !getText(elements[cursor])) {
            cursor += 1;
        }

        if (cursor < elements.length && !isHeading(elements[cursor])) {
            const candidate = elements[cursor];

            if (candidate.tagName.toLowerCase() === 'p') {
                subtitle = getHtml(candidate);
                cursor += 1;
            }
        }

        const content = [];

        for (; cursor < elements.length; cursor += 1) {
            const nextElement = elements[cursor];

            if (isHeading(nextElement)) {
                break;
            }

            content.push(nextElement.outerHTML);
        }

        sections.push({
            label,
            subtitle,
            content: content.join(''),
        });
    }

    /*
     * If the CMS editor stored section labels as paragraphs instead of
     * semantic headings, support the common pattern:
     *
     * paragraph(label)
     * paragraph(subtitle)
     * paragraph(content...)
     *
     * without putting any actual page text in the React code.
     */
    if (sections.length === 0) {
        const paragraphs = elements.filter(
            (element) => element.tagName.toLowerCase() === 'p'
        );

        if (paragraphs.length > 1) {
            const firstParagraph = paragraphs[0];

            const remaining = paragraphs.slice(1);

            const section = {
                label: getText(remaining[0]),
                subtitle: remaining[1] ? getHtml(remaining[1]) : '',
                content: remaining
                    .slice(2)
                    .map((element) => element.outerHTML)
                    .join(''),
            };

            sections.push(section);

            return {
                intro: getHtml(firstParagraph),
                sections,
            };
        }
    }

    return {
        intro,
        sections,
    };
};

export default function PurposeAndStrategy() {
    const [page, setPage] = useState(null);
    const [parentTitle, setParentTitle] = useState('');
    const [content, setContent] = useState({
        intro: '',
        sections: [],
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let isMounted = true;

        const loadPage = async () => {
            try {
                setLoading(true);
                setError('');

                const result = await getPurposeAndStrategyPage();

                if (!isMounted) return;

                setPage(result.page);
                setParentTitle(result.parent?.title || '');
                setContent(parseCmsBody(result.page.body));
            } catch (loadError) {
                console.error(
                    'Failed to load Purpose and Strategy from CMS:',
                    loadError
                );

                if (isMounted) {
                    setError(
                        loadError?.message ||
                        'Unable to load Purpose and Strategy from CMS.'
                    );
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadPage();

        return () => {
            isMounted = false;
        };
    }, []);

    if (loading) {
        return (
            <main className="min-h-screen bg-slate-50">
                <section className="bg-slate-950 px-6 py-20 sm:px-10 lg:px-16">
                    <div className="mx-auto max-w-6xl">
                        <div className="h-4 w-24 animate-pulse rounded bg-sky-400/30" />
                        <div className="mt-5 h-12 w-96 max-w-full animate-pulse rounded bg-white/10" />
                        <div className="mt-6 h-7 w-[30rem] max-w-full animate-pulse rounded bg-white/10" />
                    </div>
                </section>

                <section className="px-6 py-14 sm:px-10 lg:px-16">
                    <div className="mx-auto max-w-5xl">
                        <div className="h-40 animate-pulse rounded-3xl bg-white shadow-sm" />
                    </div>

                    <div className="mx-auto mt-10 max-w-5xl">
                        <div className="h-72 animate-pulse rounded bg-white/70" />
                    </div>
                </section>
            </main>
        );
    }

    if (error || !page) {
        return (
            <main className="min-h-screen bg-slate-50">
                <section className="bg-slate-950 px-6 py-20 sm:px-10 lg:px-16">
                    <div className="mx-auto max-w-6xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
                            {parentTitle}
                        </p>

                        <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                            {page?.title || 'Purpose and Strategy'}
                        </h1>
                    </div>
                </section>

                <section className="px-6 py-16 sm:px-10 lg:px-16">
                    <div className="mx-auto max-w-5xl rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
                        <p className="text-red-600">
                            {error ||
                                'Purpose and Strategy content was not found.'}
                        </p>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50">
            <style>{`
                .purpose-content {
                    color: #475569;
                }

                .purpose-content p {
                    margin-top: 1.5rem;
                    font-size: 1rem;
                    line-height: 2rem;
                    color: #475569;
                }

                .purpose-content p:first-child {
                    margin-top: 0;
                }

                .purpose-content ul,
                .purpose-content ol {
                    margin-top: 1.5rem;
                    padding-left: 1.5rem;
                }

                .purpose-content li {
                    margin-top: 0.75rem;
                    padding-left: 0.25rem;
                    line-height: 1.75rem;
                }

                .purpose-content ul {
                    list-style: disc;
                }

                .purpose-content ol {
                    list-style: decimal;
                }

                .purpose-content strong {
                    color: #0f172a;
                    font-weight: 600;
                }

                .purpose-content a {
                    color: #0284c7;
                    text-decoration: underline;
                    text-underline-offset: 2px;
                }

                .purpose-content img {
                    display: block;
                    max-width: 100%;
                    height: auto;
                    margin: 1.5rem 0;
                    border-radius: 1rem;
                }

                @media (min-width: 640px) {
                    .purpose-content p {
                        font-size: 1.125rem;
                    }
                }
            `}</style>

            {/* Hero — same design as the original page */}
            <section className="bg-slate-950 px-6 py-20 sm:px-10 lg:px-16">
                <div className="mx-auto max-w-6xl">
                    <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
                        {parentTitle}
                    </p>

                    <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
                        {page.title}
                    </h1>

                    {content.sections[0]?.subtitle && (
                        <div
                            className="mt-6 max-w-3xl text-xl font-medium leading-8 text-slate-300"
                            dangerouslySetInnerHTML={{
                                __html: content.sections[0].subtitle,
                            }}
                        />
                    )}
                </div>
            </section>

            {/* Introduction — same card design */}
            {content.intro && (
                <section className="px-6 py-14 sm:px-10 lg:px-16">
                    <div className="mx-auto max-w-5xl">
                        <article className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10 lg:p-12">
                            <div
                                className="purpose-content"
                                dangerouslySetInnerHTML={{
                                    __html: content.intro,
                                }}
                            />
                        </article>
                    </div>
                </section>
            )}

            {/* Purpose / Vision / Mission sections from CMS */}
            {content.sections.length > 0 &&
                content.sections.map((section, index) => (
                    <section
                        key={`${section.label}-${index}`}
                        className={
                            index % 2 === 0
                                ? 'bg-white px-6 py-16 sm:px-10 lg:px-16'
                                : 'bg-slate-50 px-6 py-16 sm:px-10 lg:px-16'
                        }
                    >
                        <div className="mx-auto max-w-5xl">
                            <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                                    {section.label}
                                </p>

                                {index !== 0 && section.subtitle && (
                                    <div
                                        className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
                                        dangerouslySetInnerHTML={{
                                            __html: section.subtitle,
                                        }}
                                    />
                                )}

                                <div className="mt-5 h-1 w-16 rounded-full bg-sky-500" />
                            </div>

                            <div
                                className="purpose-content mt-8"
                                dangerouslySetInnerHTML={{
                                    __html: section.content,
                                }}
                            />
                        </div>
                    </section>
                ))}
        </main>
    );
}
