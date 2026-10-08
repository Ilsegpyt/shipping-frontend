import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    ArrowUpRight,
    Boxes,
} from 'lucide-react';

import contentService from '../../../services/contentService';
import IndustryHeroVisual from '../../../components/public/IndustryHeroVisual';

const API_BASE_URL = 'http://localhost:5250';

const getImageUrl = (image) => {
    if (!image) return '';
    if (image.startsWith('http://') || image.startsWith('https://')) return image;
    return `${API_BASE_URL}${image}`;
};

const stripHtml = (html) => {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
};

const escapeHtml = (value) =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

const normalizeRichTextHtml = (value) => {
    if (!value) return '';

    const raw = String(value).trim();

    // Rich Text from the CMS may already be HTML.
    if (/<[a-z][\s\S]*>/i.test(raw)) {
        return raw;
    }

    // Also support Markdown-style Rich Text exported by the CMS.
    return raw
        .split(/\n\s*\n/)
        .map((block) => {
            const escaped = escapeHtml(block.trim()).replace(
                /\*\*(.+?)\*\*/g,
                '<strong>$1</strong>'
            );

            return `<p>${escaped.replace(/\n/g, '<br />')}</p>`;
        })
        .join('');
};

const getText = (value) => stripHtml(normalizeRichTextHtml(value)).replace(/\s+/g, ' ').trim();

const getExcerpt = (value, maxLength = 260) => {
    const text = getText(value);
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength).trim()}...`;
};

const isHeadingElement = (element) =>
    ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(element.tagName);

const isBoldOnlyParagraph = (element) => {
    if (element.tagName !== 'P') return false;
    const children = Array.from(element.childNodes).filter(
        (node) => node.nodeType !== Node.TEXT_NODE || node.textContent.trim()
    );
    if (children.length !== 1) return false;

    const child = children[0];
    return (
        child.nodeType === Node.ELEMENT_NODE &&
        ['STRONG', 'B'].includes(child.tagName)
    );
};

const parseRichTextSections = (body, fallbackTitle = '') => {
    if (!body) return [];

    const html = normalizeRichTextHtml(body);
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const root = doc.body.firstElementChild;

    if (!root) return [];

    const blocks = Array.from(root.children);
    const parsed = [];
    let current = null;

    const startSection = (title) => {
        current = {
            title: title.trim(),
            html: '',
        };
        parsed.push(current);
    };

    blocks.forEach((element) => {
        const text = element.textContent?.trim() || '';
        if (!text) return;

        if (isHeadingElement(element) || isBoldOnlyParagraph(element)) {
            startSection(text);
            return;
        }

        if (!current) {
            startSection(fallbackTitle || '');
        }

        current.html += element.outerHTML;
    });

    return parsed
        .filter((section) => section.title || section.html)
        .map((section, index) => ({
            ...section,
            title: section.title || (index === 0 ? fallbackTitle : ''),
        }));
};

const toSection = (item) => ({
    title: item?.title?.trim() || '',
    html: normalizeRichTextHtml(item?.body || item?.content || item?.description || ''),
});

const getContentTitle = (item) => item?.title?.trim().toLowerCase() || '';

async function getPageContent() {
    const rootResponse = await contentService.getRootContent();
    const roots = Array.isArray(rootResponse.data) ? rootResponse.data : [];
    const visited = new Set();

    const collect = async (items) => {
        const result = [];

        for (const item of items) {
            if (!item?.id || visited.has(item.id)) continue;

            visited.add(item.id);
            result.push(item);

            try {
                const childrenResponse = await contentService.getChildren(item.id);
                const children = Array.isArray(childrenResponse.data)
                    ? childrenResponse.data
                    : [];

                if (children.length) {
                    result.push(...(await collect(children)));
                }
            } catch (error) {
                console.error(`Failed to load children for content ${item.id}:`, error);
            }
        }

        return result;
    };

    const allContent = await collect(roots);

    const page = allContent.find((item) => {
        const title = getContentTitle(item);
        return (
            title === 'industrial logistics' ||
            title === 'industrial logistics - egypt' ||
            title === 'industrial logistics solutions' ||
            title.startsWith('industrial logistics -')
        );
    });

    if (!page) return null;

    let children = [];
    try {
        const childrenResponse = await contentService.getChildren(page.id);
        children = Array.isArray(childrenResponse.data) ? childrenResponse.data : [];
    } catch (error) {
        console.error(`Failed to load Industrial Logistics children for ${page.id}:`, error);
    }

    const childSections = children
        .map(toSection)
        .filter((section) => section.title || section.html);

    const richTextSections = parseRichTextSections(
        page.body || page.content || page.description,
        page.title
    );

    const sections =
        childSections.length > 0
            ? childSections
            : richTextSections;

    const firstSection = sections[0];

    return {
        ...page,
        heroSubtitle:
            page.heroSubtitle ||
            page.subtitle ||
            page.hero?.subtitle ||
            '',
        heroDescription:
            page.heroDescription ||
            page.hero?.description ||
            page.description ||
            (firstSection?.html ? getExcerpt(firstSection.html, 320) : ''),
        sections,
    };
};

function IndustrialLogistics() {
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const loadContent = async () => {
            try {
                const page = await getPageContent();

                if (isMounted) {
                    setContent(page);
                }
            } catch (error) {
                console.error('Failed to load Industrial Logistics content:', error);

                if (isMounted) {
                    setContent(null);
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

    const sections = content?.sections || [];

    return (
        <main className="min-h-screen bg-white text-slate-900">
            {/* Hero */}
            <section className="relative overflow-hidden bg-slate-950">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(14,165,233,0.22),transparent_35%)]" />

                <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-sky-500/10 to-transparent" />

                <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-32 lg:px-8 lg:pb-32">
                    <Link
                        to="/"
                        className="mb-12 inline-flex items-center gap-2 text-sm font-medium text-white/70 transition hover:text-white"
                    >
                        <ArrowLeft size={16} />
                        Back to Home
                    </Link>

                    <div className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">
                        <div>
                            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-md">
                                <span className="h-2 w-2 rounded-full bg-sky-400" />

                                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/85">
                                    Industry
                                </span>
                            </div>

                            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
                                {content?.title || ''}
                            </h1>

                            <p className="mt-7 max-w-2xl text-2xl font-medium leading-tight text-sky-400 sm:text-3xl">
                                {content?.heroSubtitle || ''}
                            </p>

                            <p className="mt-7 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
                                {content?.heroDescription || ''}
                            </p>
                        </div>

                        <IndustryHeroVisual industry="industrial" />
                    </div>
                </div>
            </section>

            {/* Industrial logistics */}
            <section className="py-24 sm:py-32">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                            {content?.capabilitiesLabel || ''}
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
                            {content?.capabilitiesTitle || content?.title || ''}
                        </h2>
                    </div>

                    <div className="mt-16 space-y-8">
                        {sections.map((section, index) => (
                            <article
                                key={`${section.title}-${index}`}
                                className="grid overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 lg:grid-cols-2"
                            >
                                <div
                                    className={`min-h-[320px] bg-gradient-to-br from-sky-100 via-white to-slate-100 p-8 sm:p-12 ${index % 2 ? 'lg:order-2' : ''
                                        }`}
                                >
                                    <div className="flex h-full flex-col justify-between">
                                        <div>
                                            <div className="inline-flex rounded-2xl bg-white p-3 text-sky-600 shadow-sm">
                                                <Boxes
                                                    size={26}
                                                    strokeWidth={1.8}
                                                />
                                            </div>

                                            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">
                                                {content?.sectionLabel || ''}
                                            </p>

                                            <h3 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                                                {section.title}
                                            </h3>
                                        </div>

                                        <div className="mt-10 flex items-center gap-3 text-sm font-medium text-slate-500">
                                            <span className="h-px w-10 bg-sky-400" />
                                            {content?.sectionFooter || ''}
                                        </div>
                                    </div>
                                </div>

                                <div
                                    className={`bg-white p-8 sm:p-12 ${index % 2 ? 'lg:order-1' : ''
                                        }`}
                                >
                                    <div
                                        className="space-y-5 text-base leading-7 text-slate-600 [&_p]:m-0 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_strong]:font-semibold [&_a]:text-sky-600 [&_a]:underline"
                                        dangerouslySetInnerHTML={{
                                            __html: section.html,
                                        }}
                                    />
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            {/* Industry expertise */}
            <section className="bg-slate-950 py-24 sm:py-32">
                <div className="mx-auto max-w-5xl px-6 lg:px-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
                        {content?.expertiseLabel || ''}
                    </p>

                    <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                        {content?.expertiseTitle || content?.title || ''}
                    </h2>

                    <div
                        className="mt-7 text-lg leading-8 text-white/65 [&_p]:m-0 [&_p+p]:mt-6 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5"
                        dangerouslySetInnerHTML={{
                            __html:
                                content?.expertiseBody ||
                                (sections.length
                                    ? sections
                                        .slice(0, 2)
                                        .map((section) => section.html)
                                        .join('')
                                    : ''),
                        }}
                    />

                    <div className="mt-12 flex flex-wrap gap-4">
                        <Link
                            to="/"
                            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                        >
                            Back to Home
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

export default IndustrialLogistics;
