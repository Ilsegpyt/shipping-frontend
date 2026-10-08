import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
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

const getChildren = async (contentId) => {
    const response = await contentService.getChildren(contentId);

    return Array.isArray(response?.data) ? response.data : [];
};

const getCargoInsurancePage = async () => {
    const rootResponse = await contentService.getRootContent();
    const roots = Array.isArray(rootResponse?.data) ? rootResponse.data : [];

    // Cargo Insurance is a Solutions page. Support both common CMS
    // parent names without hardcoding any Cargo Insurance content.
    const solutionParent = roots.find((item) => {
        const title = item?.title?.trim().toLowerCase();

        return (
            (title === 'ils solutions' || title === 'solutions') &&
            getTypeName(item.type) === 'Category'
        );
    });

    if (solutionParent?.id) {
        const children = await getChildren(solutionParent.id);

        const cargoPage = children.find(
            (item) =>
                item?.title?.trim().toLowerCase() === 'cargo insurance' &&
                getTypeName(item.type) === 'Page'
        );

        if (cargoPage?.id) {
            const pageResponse = await contentService.getById(cargoPage.id);

            if (pageResponse?.data) {
                return pageResponse.data;
            }
        }
    }

    // Also support a CMS where the page itself is returned at root level.
    const rootCargoPage = roots.find(
        (item) =>
            item?.title?.trim().toLowerCase() === 'cargo insurance' &&
            getTypeName(item.type) === 'Page'
    );

    if (rootCargoPage?.id) {
        const pageResponse = await contentService.getById(rootCargoPage.id);

        if (pageResponse?.data) {
            return pageResponse.data;
        }
    }

    throw new Error('Cargo Insurance page was not found in CMS.');
};

const decodeHtml = (value) => {
    if (!value) return '';

    let decoded = value;

    for (let index = 0; index < 3; index += 1) {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = decoded;

        const next = textarea.value;

        if (next === decoded) {
            break;
        }

        decoded = next;
    }

    return decoded;
};

const prepareCmsBody = (body) => {
    if (!body) return [];

    const parser = new DOMParser();
    const cmsDocument = parser.parseFromString(
        decodeHtml(body),
        'text/html'
    );

    // Keep CMS images working when the editor stores relative API paths.
    cmsDocument.querySelectorAll('img').forEach((image) => {
        const src = image.getAttribute('src');

        if (src && src.startsWith('/') && !src.startsWith('//')) {
            image.setAttribute('src', `http://localhost:5250${src}`);
        }
    });

    // If the editor stored a paragraph containing line breaks, keep the
    // breaks. We do not rewrite or remove any CMS content.
    const elements = Array.from(cmsDocument.body.children);

    const headingTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

    const isHeading = (element) =>
        headingTags.includes(element?.tagName?.toLowerCase());

    const getText = (element) =>
        element?.textContent?.replace(/\s+/g, ' ').trim() || '';

    const isLikelyHeadingParagraph = (element) => {
        if (!element || element.tagName.toLowerCase() !== 'p') {
            return false;
        }

        const text = getText(element);

        if (!text || text.length > 100) {
            return false;
        }

        // This only detects presentation-like headings. The actual text
        // still comes from the CMS.
        return text === text.toUpperCase() && /[A-Z]/.test(text);
    };

    const normalizedElements = elements.map((element) => {
        if (!isLikelyHeadingParagraph(element)) {
            return element;
        }

        const heading = cmsDocument.createElement('h2');
        heading.innerHTML = element.innerHTML;
        element.replaceWith(heading);

        return heading;
    });

    const finalElements = Array.from(cmsDocument.body.children);

    const sections = [];
    let currentSection = null;

    finalElements.forEach((element) => {
        if (isHeading(element)) {
            if (currentSection) {
                sections.push(currentSection);
            }

            currentSection = {
                title: getText(element),
                html: '',
            };

            return;
        }

        if (!currentSection) {
            currentSection = {
                title: '',
                html: '',
            };
        }

        currentSection.html += element.outerHTML;
    });

    if (currentSection) {
        sections.push(currentSection);
    }

    // If the CMS body has no headings, return all CMS content as one block.
    if (sections.length === 0 && finalElements.length > 0) {
        return [
            {
                title: '',
                html: cmsDocument.body.innerHTML,
            },
        ];
    }

    return sections;
};

const styleSectionHtml = (html) => {
    if (!html) return '';

    const parser = new DOMParser();
    const document = parser.parseFromString(html, 'text/html');

    document.querySelectorAll('p').forEach((paragraph) => {
        paragraph.className =
            'mb-6 text-base leading-8 text-slate-600 last:mb-0 sm:text-lg';
    });

    document.querySelectorAll('ul').forEach((list) => {
        list.className =
            'mb-6 list-disc space-y-3 pl-6 text-base leading-8 text-slate-600 sm:text-lg';
    });

    document.querySelectorAll('ol').forEach((list) => {
        list.className =
            'mb-6 list-decimal space-y-3 pl-6 text-base leading-8 text-slate-600 sm:text-lg';
    });

    document.querySelectorAll('li').forEach((item) => {
        item.className = 'pl-1';
    });

    document.querySelectorAll('a').forEach((link) => {
        link.className = 'text-sky-600 underline underline-offset-4';
    });

    document.querySelectorAll('img').forEach((image) => {
        image.className = 'my-8 max-w-full rounded-2xl';
    });

    document.querySelectorAll('strong').forEach((strong) => {
        strong.className = 'font-semibold text-slate-900';
    });

    return document.body.innerHTML;
};

function CargoInsurance() {
    const [page, setPage] = useState(null);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        window.scrollTo(0, 0);

        let isMounted = true;

        const loadContent = async () => {
            try {
                setLoading(true);
                setError('');

                const cmsPage = await getCargoInsurancePage();
                const cmsSections = prepareCmsBody(cmsPage.body || '');

                if (isMounted) {
                    setPage(cmsPage);
                    setSections(cmsSections);
                }
            } catch (loadError) {
                console.error(
                    'Failed to load Cargo Insurance content from CMS:',
                    loadError
                );

                if (isMounted) {
                    setError('Unable to load Cargo Insurance content from CMS.');
                    setPage(null);
                    setSections([]);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadContent();

        return () => {
            isMounted = false;
        };
    }, []);

    const fullTitle = page?.title?.trim() || 'Cargo Insurance';

    const titleParts = fullTitle.split(' - ');
    const heroTitle = titleParts[0]?.trim() || 'Cargo Insurance';
    const heroSubtitle =
        titleParts.slice(1).join(' - ').trim() || '';

    const visibleSections = sections.filter(
        (section) => section.html?.trim()
    );

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
                        ← Back to Solutions
                    </Link>

                    <div className="grid items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
                        <div>
                            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-md">
                                <span className="h-2 w-2 rounded-full bg-sky-400" />

                                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/85">
                                    {heroTitle}
                                </span>
                            </div>

                            <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
                                {heroTitle.toUpperCase()}
                            </h1>

                            <p className="mt-7 max-w-3xl text-xl leading-8 text-white/70 sm:text-2xl">
                                {loading
                                    ? 'Loading...'
                                    : heroSubtitle}
                            </p>
                        </div>

                        <div className="relative hidden h-[360px] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] lg:flex">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(14,165,233,0.16),transparent_55%)]" />

                            <div className="absolute left-1/2 top-1/2 flex h-48 w-48 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-sky-400/20">
                                <div className="absolute h-32 w-32 rounded-full border border-sky-400/20" />

                                <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-sky-400/20 bg-sky-400/10">
                                    <ShieldCheck
                                        size={46}
                                        strokeWidth={1.4}
                                        className="text-sky-400"
                                    />
                                </div>
                            </div>

                            <div className="absolute bottom-8 left-8">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
                                    {heroTitle}
                                </p>

                                <p className="mt-2 max-w-xs text-sm leading-6 text-white/50">
                                    {heroSubtitle || heroTitle}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {loading && (
                <section className="py-24 sm:py-28">
                    <div className="mx-auto max-w-7xl px-6 lg:px-8">
                        <p className="text-base text-slate-500">
                            Loading content...
                        </p>
                    </div>
                </section>
            )}

            {!loading && error && (
                <section className="py-24 sm:py-28">
                    <div className="mx-auto max-w-7xl px-6 lg:px-8">
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
                            {error}
                        </div>
                    </div>
                </section>
            )}

            {!loading &&
                !error &&
                visibleSections.map((section, index) => {
                    const darkSection = index % 4 === 3;
                    const splitSection =
                        index % 3 === 2 || section.html.length > 900;

                    return (
                        <section
                            key={`${section.title || 'section'}-${index}`}
                            className={
                                darkSection
                                    ? 'bg-slate-950 py-24 text-white sm:py-28'
                                    : index % 2 === 1
                                        ? 'bg-slate-50 py-24 sm:py-28'
                                        : 'py-24 sm:py-28'
                            }
                        >
                            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                                <div
                                    className={
                                        splitSection
                                            ? 'grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:items-start'
                                            : 'max-w-4xl'
                                    }
                                >
                                    <div>
                                        <p
                                            className={
                                                darkSection
                                                    ? 'text-sm font-semibold uppercase tracking-[0.2em] text-sky-400'
                                                    : 'text-sm font-semibold uppercase tracking-[0.2em] text-sky-600'
                                            }
                                        >
                                            {heroTitle}
                                        </p>

                                        {section.title && (
                                            <h2
                                                className={
                                                    darkSection
                                                        ? 'mt-4 text-3xl font-semibold tracking-tight sm:text-4xl'
                                                        : 'mt-4 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl'
                                                }
                                            >
                                                {section.title}
                                            </h2>
                                        )}
                                    </div>

                                    <div
                                        className={
                                            splitSection
                                                ? 'text-base leading-8 sm:text-lg'
                                                : 'mt-8 text-base leading-8 sm:text-lg'
                                        }
                                    >
                                        <div
                                            className={
                                                darkSection
                                                    ? '[&_*]:!text-slate-300'
                                                    : ''
                                            }
                                            dangerouslySetInnerHTML={{
                                                __html: styleSectionHtml(
                                                    section.html
                                                ),
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>
                    );
                })}

            {!loading && !error && page && (
                <section className="bg-sky-600 py-20">
                    <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 lg:flex-row lg:items-center lg:px-8">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                                {heroTitle}
                            </p>

                            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                                {heroSubtitle || heroTitle}
                            </h2>
                        </div>

                        <a
                            href={page.linkUrl || '/#contact'}
                            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                        >
                            Discuss your requirements
                            <ArrowUpRight size={17} />
                        </a>
                    </div>
                </section>
            )}
        </main>
    );
}

export default CargoInsurance;
