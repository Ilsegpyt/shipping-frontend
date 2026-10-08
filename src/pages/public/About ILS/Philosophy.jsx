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

const getPhilosophyPage = async () => {
    const rootResponse = await contentService.getRootContent();
    const roots = Array.isArray(rootResponse.data) ? rootResponse.data : [];

    const aboutIls = roots.find(
        (item) =>
            item?.title?.trim().toLowerCase() === 'about ils' &&
            getTypeName(item.type) === 'Category'
    );

    if (!aboutIls) {
        throw new Error('About ILS category was not found in CMS.');
    }

    const childrenResponse = await contentService.getChildren(aboutIls.id);
    const children = Array.isArray(childrenResponse.data)
        ? childrenResponse.data
        : [];

    const philosophyPage = children.find(
        (item) =>
            item?.title?.trim().toLowerCase() === 'ils philosophy' &&
            getTypeName(item.type) === 'Page'
    );

    if (!philosophyPage) {
        throw new Error('Philosophy page was not found under About ILS in CMS.');
    }

    const pageResponse = await contentService.getById(philosophyPage.id);

    if (!pageResponse?.data) {
        throw new Error('Philosophy page details could not be loaded from CMS.');
    }

    return pageResponse.data;
};

/*
 * Converts the CMS Body into semantic blocks.
 *
 * No Philosophy text is hardcoded here.
 * The visual component below only decides WHERE each CMS block appears.
 */
const parseCmsBody = (body) => {
    if (!body) {
        return {
            heading: '',
            subtitle: '',
            lead: '',
            list: [],
            emphasis: '',
            closing: '',
            other: [],
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

    const getText = (element) => element?.textContent?.trim() || '';

    const paragraphs = elements.filter(
        (element) => element.tagName.toLowerCase() === 'p'
    );

    const listElement = elements.find((element) =>
        ['ul', 'ol'].includes(element.tagName.toLowerCase())
    );

    const heading = getText(paragraphs[0]);
    const subtitle = getText(paragraphs[1]);
    const lead = getText(paragraphs[2]);

    const list = listElement
        ? Array.from(listElement.querySelectorAll(':scope > li'))
            .map((item) => item.innerHTML.trim())
            .filter(Boolean)
        : [];

    /*
     * The emphasis paragraph is identified by its existing strong mark.
     * This preserves the CMS formatting decision rather than inventing
     * a specific sentence in the frontend.
     */
    const strongParagraph = paragraphs.find(
        (paragraph) => paragraph.querySelector('strong')
    );

    const emphasis = strongParagraph
        ? strongParagraph.innerHTML.trim()
        : '';

    const closingParagraphs = paragraphs.filter(
        (paragraph) =>
            paragraph !== paragraphs[0] &&
            paragraph !== paragraphs[1] &&
            paragraph !== paragraphs[2] &&
            paragraph !== strongParagraph
    );

    const closing = closingParagraphs.length
        ? closingParagraphs[closingParagraphs.length - 1].innerHTML.trim()
        : '';

    return {
        heading,
        subtitle,
        lead,
        list,
        emphasis,
        closing,
        other: [],
    };
};

export default function Philosophy() {
    const [page, setPage] = useState(null);
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let isMounted = true;

        const loadPage = async () => {
            try {
                setLoading(true);
                setError('');

                const data = await getPhilosophyPage();

                if (!isMounted) return;

                setPage(data);
                setContent(parseCmsBody(data.body));
            } catch (loadError) {
                console.error(
                    'Failed to load Philosophy from CMS:',
                    loadError
                );

                if (isMounted) {
                    setError(
                        loadError?.message ||
                        'Unable to load Philosophy from CMS.'
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
                    </div>
                </section>

                <section className="px-6 py-16 sm:px-10 lg:px-16">
                    <div className="mx-auto max-w-5xl">
                        <div className="h-[520px] animate-pulse rounded-3xl bg-white shadow-sm" />
                    </div>
                </section>
            </main>
        );
    }

    if (error || !page || !content) {
        return (
            <main className="min-h-screen bg-slate-50">
                <section className="bg-slate-950 px-6 py-20 sm:px-10 lg:px-16">
                    <div className="mx-auto max-w-6xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
                            About ILS
                        </p>

                        <h1 className="mt-4 text-4xl font-bold text-white sm:text-5xl">
                            {page?.title || 'Philosophy'}
                        </h1>
                    </div>
                </section>

                <section className="px-6 py-16 sm:px-10 lg:px-16">
                    <div className="mx-auto max-w-5xl rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
                        <p className="text-red-600">
                            {error || 'Philosophy content was not found.'}
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
                        About ILS
                    </p>

                    <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                        {page.title}
                    </h1>

                    <div className="mt-7 h-1 w-16 rounded-full bg-sky-500" />
                </div>
            </section>

            {/* Main philosophy */}
            <section className="px-6 py-14 sm:px-10 sm:py-16 lg:px-16 lg:py-20">
                <div className="mx-auto max-w-5xl">
                    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        {/* Intro */}
                        <div className="p-8 sm:p-10 lg:p-12">
                            <div className="max-w-3xl">
                                <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-600">
                                    {content.heading}
                                </p>

                                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                                    {content.subtitle}
                                </h2>

                                <div className="mt-5 h-1 w-14 rounded-full bg-sky-500" />

                                <p className="mt-8 text-base leading-8 text-slate-600 sm:text-lg">
                                    {content.lead}
                                </p>
                            </div>

                            {/* Three connections */}
                            {content.list.length > 0 && (
                                <div className="mt-10 grid gap-4 sm:grid-cols-3">
                                    {content.list.map((item, index) => (
                                        <div
                                            key={`${index}-${item}`}
                                            className="group rounded-2xl border border-slate-200 bg-slate-50 p-6 transition duration-200 hover:-translate-y-1 hover:border-sky-200 hover:bg-white hover:shadow-md"
                                        >
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-600">
                                                {String(index + 1).padStart(2, '0')}
                                            </div>

                                            <div
                                                className="mt-5 text-base font-semibold leading-7 text-slate-800"
                                                dangerouslySetInnerHTML={{
                                                    __html: item,
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Highlight */}
                        {content.emphasis && (
                            <div className="border-y border-slate-200 bg-slate-950 px-8 py-10 sm:px-10 lg:px-12">
                                <div className="max-w-4xl border-l-4 border-sky-400 pl-6">
                                    <p
                                        className="text-base leading-8 text-slate-200 sm:text-lg"
                                        dangerouslySetInnerHTML={{
                                            __html: content.emphasis,
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Closing */}
                        {content.closing && (
                            <div className="px-8 py-10 sm:px-10 lg:px-12">
                                <div className="max-w-4xl">
                                    <p
                                        className="text-base leading-8 text-slate-600 sm:text-lg"
                                        dangerouslySetInnerHTML={{
                                            __html: content.closing,
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </article>
                </div>
            </section>
        </main>
    );
}
