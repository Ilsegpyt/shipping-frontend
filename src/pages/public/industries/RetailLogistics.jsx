import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    ArrowUpRight,
    Boxes,
} from 'lucide-react';

import IndustryHeroVisual from '../../../components/public/IndustryHeroVisual';
import contentService from '../../../services/contentService';

const decodeHtml = (value = '') => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = value;
    return textarea.value;
};

const plainText = (value = '') => {
    const temp = document.createElement('div');
    temp.innerHTML = decodeHtml(value);
    return (temp.textContent || temp.innerText || '')
        .replace(/\s+/g, ' ')
        .trim();
};

const renderRichText = (value, className = 'space-y-5 text-base leading-7 text-slate-600') => {
    if (!value) return null;

    const decoded = decodeHtml(value).trim();

    if (/<[a-z][\s\S]*>/i.test(decoded)) {
        return (
            <div
                className={`${className} [&_a]:text-sky-600 [&_a]:underline [&_strong]:font-semibold [&_em]:italic [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6`}
                dangerouslySetInnerHTML={{ __html: decoded }}
            />
        );
    }

    const paragraphs = decoded
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);

    return (
        <div className={className}>
            {paragraphs.map((paragraph, index) => {
                const parts = paragraph.split(/(\*\*[^*]+\*\*)/g);

                return (
                    <p key={`${index}-${paragraph}`} className={index ? 'mt-5' : ''}>
                        {parts.map((part, partIndex) => {
                            const match = part.match(/^\*\*(.+)\*\*$/);
                            return match ? (
                                <strong key={partIndex}>{match[1]}</strong>
                            ) : (
                                part
                            );
                        })}
                    </p>
                );
            })}
        </div>
    );
};

const isBoldParagraph = (node) => {
    const tag = node.tagName?.toLowerCase();
    if (tag !== 'p') return false;

    const text = (node.textContent || '').trim();
    if (!text) return false;

    const elements = Array.from(node.querySelectorAll?.('strong, b') || []);
    return elements.length > 0 && elements.some(
        (element) => (element.textContent || '').trim() === text
    );
};

const parseRichTextSections = (body) => {
    const decoded = decodeHtml(body || '').trim();
    if (!decoded) return [];

    // HTML Rich Text.
    if (/<[a-z][\s\S]*>/i.test(decoded)) {
        const doc = new DOMParser().parseFromString(decoded, 'text/html');
        const blocks = Array.from(doc.body.children);
        const sections = [];
        let currentTitle = '';
        let currentNodes = [];

        const flush = () => {
            if (currentTitle && currentNodes.length) {
                sections.push({
                    title: currentTitle,
                    body: currentNodes.join(''),
                });
            }
            currentTitle = '';
            currentNodes = [];
        };

        blocks.forEach((node) => {
            const tag = node.tagName.toLowerCase();
            const text = (node.textContent || '').trim();

            if (/^h[1-6]$/.test(tag) || isBoldParagraph(node)) {
                flush();
                currentTitle = text;
                return;
            }

            if (currentTitle && text) {
                currentNodes.push(node.outerHTML);
            }
        });

        flush();
        return sections;
    }

    // Markdown/plain Rich Text such as **Consumer goods**.
    const sections = [];
    let currentTitle = '';
    let currentLines = [];

    const flush = () => {
        if (currentTitle && currentLines.some((line) => line.trim())) {
            sections.push({
                title: currentTitle,
                body: currentLines.join('\n').trim(),
            });
        }
        currentTitle = '';
        currentLines = [];
    };

    decoded.replace(/\r\n/g, '\n').split('\n').forEach((line) => {
        const trimmed = line.trim();
        const heading = trimmed.match(/^\*\*(.+?)\*\*$/);

        if (heading) {
            flush();
            currentTitle = heading[1].trim();
            return;
        }

        if (currentTitle) currentLines.push(line);
    });

    flush();
    return sections;
};

const getParentId = (item) =>
    item?.parentId ??
    item?.parentContentId ??
    item?.parent?.id ??
    item?.parentContent?.id ??
    null;

const parseRetailContent = (item, children = []) => {
    if (!item) return null;

    const childSections = children
        .filter((child) => child?.title && child?.body)
        .map((child) => ({
            title: child.title.trim(),
            body: child.body,
        }));

    const sections = childSections.length
        ? childSections
        : parseRichTextSections(item.body);

    const bodyText = plainText(item.body);
    const paragraphs = bodyText
        .split(/(?<=[.!?])\s+/)
        .filter(Boolean);

    return {
        ...item,
        title: item.title || 'Retail logistics',
        heroSubtitle:
            item.heroSubtitle ||
            item.subtitle ||
            '',
        heroDescription:
            item.heroDescription ||
            item.description ||
            '',
        sections,
        expertiseText:
            item.excerpt ||
            item.summary ||
            item.description ||
            paragraphs.slice(0, 2).join(' '),
    };
};

async function getAllContent() {
    const response = await contentService.getRootContent();
    const roots = Array.isArray(response.data) ? response.data : [];
    const allContent = [];
    const visited = new Set();

    async function collect(items) {
        for (const item of items) {
            if (!item?.id || visited.has(item.id)) continue;

            visited.add(item.id);
            allContent.push(item);

            try {
                const childrenResponse = await contentService.getChildren(item.id);
                const children = Array.isArray(childrenResponse.data)
                    ? childrenResponse.data
                    : [];

                if (children.length) await collect(children);
            } catch (error) {
                console.error(
                    `Failed to load children for content ${item.id}:`,
                    error
                );
            }
        }
    }

    await collect(roots);
    return allContent;
}

function RetailLogistics() {
    const [content, setContent] = useState(null);

    useEffect(() => {
        let isMounted = true;

        const loadContent = async () => {
            try {
                const allContent = await getAllContent();

                const item = allContent.find((entry) => {
                    const title = entry?.title?.trim().toLowerCase() || '';
                    return (
                        title === 'retail logistics' ||
                        title === 'retail' ||
                        title.startsWith('retail logistics -')
                    );
                });

                if (!item) {
                    if (isMounted) setContent(null);
                    return;
                }

                // Fetch the actual children of the Retail page. getAllContent()
                // flattens them, so they are not available as item.children.
                let children = [];
                try {
                    const response = await contentService.getChildren(item.id);
                    children = Array.isArray(response.data) ? response.data : [];
                } catch (error) {
                    console.error('Failed to load Retail Logistics sections:', error);
                }

                // Fallback for APIs that return parentId instead of a children endpoint.
                if (!children.length) {
                    children = allContent.filter((entry) => getParentId(entry) === item.id);
                }

                if (isMounted) {
                    setContent(parseRetailContent(item, children));
                }
            } catch (error) {
                console.error('Failed to load Retail Logistics content:', error);
                if (isMounted) setContent(null);
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
                                {content?.title || 'Retail logistics'}
                            </h1>

                            <p className="mt-7 max-w-2xl text-2xl font-medium leading-tight text-sky-400 sm:text-3xl">
                                {content?.heroSubtitle}
                            </p>

                            <p className="mt-7 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
                                {content?.heroDescription}
                            </p>
                        </div>

                        <IndustryHeroVisual industry="retail" />
                    </div>
                </div>
            </section>

            {/* Retail logistics services */}
            <section className="py-24 sm:py-32">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                            Our capabilities
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
                            Retail logistics services
                        </h2>
                    </div>

                    <div className="mt-16 space-y-8">
                        {sections.map((section, index) => (
                            <article
                                key={`${section.title}-${index}`}
                                className="grid overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 lg:grid-cols-2"
                            >
                                <div
                                    className={`min-h-[320px] bg-gradient-to-br from-sky-100 via-white to-slate-100 p-8 sm:p-12 ${index % 2 ? 'lg:order-2' : ''}`}
                                >
                                    <div className="flex h-full flex-col justify-between">
                                        <div>
                                            <div className="inline-flex rounded-2xl bg-white p-3 text-sky-600 shadow-sm">
                                                <Boxes size={26} strokeWidth={1.8} />
                                            </div>

                                            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">
                                                Industry solution
                                            </p>

                                            <h3 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                                                {section.title}
                                            </h3>
                                        </div>

                                        <div className="mt-10 flex items-center gap-3 text-sm font-medium text-slate-500">
                                            <span className="h-px w-10 bg-sky-400" />
                                            Tailored supply chain support
                                        </div>
                                    </div>
                                </div>

                                <div
                                    className={`bg-white p-8 sm:p-12 ${index % 2 ? 'lg:order-1' : ''}`}
                                >
                                    {renderRichText(section.body)}
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
                        Industry expertise
                    </p>

                    <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                        {content?.title || ''}
                    </h2>

                    {content?.expertiseText && (
                        <p className="mt-7 text-lg leading-8 text-white/65">
                            {content.expertiseText}
                        </p>
                    )}

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

export default RetailLogistics;
