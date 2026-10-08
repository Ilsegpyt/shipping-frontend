import { useEffect, useState } from 'react';

import contentService from '../../../services/contentService';

const API_BASE_URL = 'http://localhost:5250';

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

const getValuesPage = async () => {
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

    const valuesPage = children.find(
        (item) =>
            item?.title?.trim().toLowerCase() === 'ils values' &&
            getTypeName(item.type) === 'Page'
    );

    if (!valuesPage?.id) {
        throw new Error('ILS Values page was not found under About ILS in CMS.');
    }

    const pageResponse = await contentService.getById(valuesPage.id);

    if (!pageResponse?.data) {
        throw new Error('ILS Values page details could not be loaded from CMS.');
    }

    return {
        page: pageResponse.data,
        parent: aboutIls,
    };
};

const prepareCmsBody = (body) => {
    if (!body) {
        return {
            intro: '',
            groups: [],
        };
    }

    const parser = new DOMParser();
    const document = parser.parseFromString(body, 'text/html');

    document.querySelectorAll('img').forEach((image) => {
        const src = image.getAttribute('src');

        if (src && src.startsWith('/') && !src.startsWith('//')) {
            image.setAttribute('src', `${API_BASE_URL}${src}`);
        }
    });

    const elements = Array.from(document.body.children);

    const getText = (element) =>
        element?.textContent?.replace(/\s+/g, ' ').trim() || '';

    /*
     * The CMS controls all text.
     * We only interpret the existing HTML structure:
     *
     * paragraph(s) before the first heading/list -> introduction
     * heading + following list -> value card
     *
     * This keeps the frontend independent from the actual Value text.
     */
    const firstHeadingIndex = elements.findIndex((element) =>
        ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(
            element.tagName.toLowerCase()
        )
    );

    let intro = '';

    if (firstHeadingIndex > 0) {
        intro = elements
            .slice(0, firstHeadingIndex)
            .filter((element) => element.tagName.toLowerCase() === 'p')
            .map(getText)
            .filter(Boolean)
            .join(' ');
    }

    /*
     * If the CMS starts directly with a list/card heading structure,
     * use the first paragraph as the introduction and continue parsing.
     */
    if (!intro) {
        const firstParagraph = elements.find(
            (element) => element.tagName.toLowerCase() === 'p'
        );

        if (firstParagraph) {
            intro = getText(firstParagraph);
        }
    }

    const groups = [];

    for (let index = 0; index < elements.length; index += 1) {
        const element = elements[index];
        const tag = element.tagName.toLowerCase();

        if (!['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
            continue;
        }

        const title = getText(element);

        if (!title) {
            continue;
        }

        let points = [];

        for (let next = index + 1; next < elements.length; next += 1) {
            const nextElement = elements[next];
            const nextTag = nextElement.tagName.toLowerCase();

            if (
                ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(nextTag)
            ) {
                break;
            }

            if (nextTag === 'ul' || nextTag === 'ol') {
                points = Array.from(nextElement.children)
                    .filter(
                        (child) => child.tagName.toLowerCase() === 'li'
                    )
                    .map((li) => li.innerHTML.trim())
                    .filter(Boolean);

                break;
            }
        }

        groups.push({
            title,
            points,
        });
    }

    /*
     * Fallback for Tiptap content where the value titles are paragraphs
     * followed by lists instead of semantic h2/h3 elements.
     */
    if (groups.length === 0) {
        for (let index = 0; index < elements.length; index += 1) {
            const element = elements[index];

            if (element.tagName.toLowerCase() !== 'p') {
                continue;
            }

            const nextElement = elements[index + 1];

            if (
                nextElement &&
                ['ul', 'ol'].includes(nextElement.tagName.toLowerCase())
            ) {
                const title = getText(element);

                const points = Array.from(nextElement.children)
                    .filter(
                        (child) => child.tagName.toLowerCase() === 'li'
                    )
                    .map((li) => li.innerHTML.trim())
                    .filter(Boolean);

                if (title && points.length > 0) {
                    groups.push({ title, points });
                }
            }
        }
    }

    return {
        intro,
        groups,
    };
};

export default function Values() {
    const [page, setPage] = useState(null);
    const [parentTitle, setParentTitle] = useState('');
    const [content, setContent] = useState({
        intro: '',
        groups: [],
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let isMounted = true;

        const loadPage = async () => {
            try {
                setLoading(true);
                setError('');

                const result = await getValuesPage();

                if (!isMounted) return;

                setPage(result.page);
                setParentTitle(result.parent?.title || '');
                setContent(prepareCmsBody(result.page.body));
            } catch (loadError) {
                console.error('Failed to load ILS Values from CMS:', loadError);

                if (isMounted) {
                    setError(
                        loadError?.message ||
                        'Unable to load ILS Values from CMS.'
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
                        <div className="mt-5 h-12 w-80 animate-pulse rounded bg-white/10" />
                        <div className="mt-6 h-7 w-[28rem] max-w-full animate-pulse rounded bg-white/10" />
                    </div>
                </section>

                <section className="px-6 py-14 sm:px-10 lg:px-16">
                    <div className="mx-auto max-w-5xl">
                        <div className="h-32 animate-pulse rounded-3xl bg-white shadow-sm" />
                    </div>

                    <div className="mx-auto mt-8 grid max-w-6xl gap-6 lg:grid-cols-3">
                        <div className="h-80 animate-pulse rounded-3xl bg-white shadow-sm" />
                        <div className="h-80 animate-pulse rounded-3xl bg-white shadow-sm" />
                        <div className="h-80 animate-pulse rounded-3xl bg-white shadow-sm" />
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
                            {page?.title || 'ILS Values'}
                        </h1>
                    </div>
                </section>

                <section className="px-6 py-16 sm:px-10 lg:px-16">
                    <div className="mx-auto max-w-5xl rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
                        <p className="text-red-600">
                            {error || 'ILS Values content was not found.'}
                        </p>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50">
            {/* Hero */}
            <section className="relative overflow-hidden bg-slate-950 px-6 py-20 sm:px-10 lg:px-16">
                <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
                <div className="absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-cyan-400/5 blur-3xl" />

                <div className="relative mx-auto max-w-6xl">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
                        {parentTitle}
                    </p>

                    <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                        {page.title}
                    </h1>

                    <div className="mt-7 h-1 w-16 rounded-full bg-sky-500" />
                </div>
            </section>

            {/* Introduction */}
            {content.intro && (
                <section className="px-6 py-14 sm:px-10 lg:px-16">
                    <div className="mx-auto max-w-5xl">
                        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10 lg:p-12">
                            <div className="absolute left-0 top-0 h-full w-1 bg-sky-500" />

                            <p className="max-w-4xl text-lg leading-8 text-slate-600 sm:text-xl">
                                {content.intro}
                            </p>
                        </div>
                    </div>
                </section>
            )}

            {/* Values */}
            {content.groups.length > 0 && (
                <section className="px-6 pb-20 sm:px-10 lg:px-16">
                    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3">
                        {content.groups.map((value, index) => (
                            <article
                                key={`${value.title}-${index}`}
                                className="group rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl hover:shadow-slate-200/60 sm:p-8"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
                                            {String(index + 1).padStart(2, '0')}
                                        </p>

                                        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
                                            {value.title}
                                        </h2>
                                    </div>

                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-500 transition duration-300 group-hover:bg-sky-500 group-hover:text-white">
                                        <span className="text-lg font-semibold">
                                            +
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-6 h-1 w-12 rounded-full bg-sky-500" />

                                {value.points.length > 0 && (
                                    <ul className="mt-7 space-y-5">
                                        {value.points.map((point, pointIndex) => (
                                            <li
                                                key={`${pointIndex}-${point}`}
                                                className="relative pl-7 text-base leading-7 text-slate-600"
                                            >
                                                <span className="absolute left-0 top-3 h-1.5 w-1.5 rounded-full bg-sky-500" />

                                                <span
                                                    dangerouslySetInnerHTML={{
                                                        __html: point,
                                                    }}
                                                />
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {content.groups.length === 0 && !content.intro && (
                <section className="px-6 py-16 sm:px-10 lg:px-16">
                    <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-10 text-slate-600 shadow-sm">
                        No content is available for this page in the CMS.
                    </div>
                </section>
            )}
        </main>
    );
}
