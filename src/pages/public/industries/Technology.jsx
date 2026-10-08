import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    ArrowUpRight,
    Boxes,
} from 'lucide-react';

import IndustryHeroVisual from '../../../components/public/IndustryHeroVisual';
import contentService from '../../../services/contentService';

const decodeHtml = (value) => {
    if (!value) return '';

    const textarea = document.createElement('textarea');
    textarea.innerHTML = value;
    return textarea.value;
};

const escapeHtml = (value) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

const markdownToHtml = (value) => {
    const decoded = decodeHtml(value || '').trim();

    if (!decoded) return '';

    if (/<[a-z][\s\S]*>/i.test(decoded)) {
        return decoded;
    }

    return decoded
        .split(/\n\s*\n/)
        .map((block) => {
            const text = block.trim();

            if (!text) return '';

            if (/^\*\*.+\*\*$/.test(text)) {
                return `<strong>${escapeHtml(text.slice(2, -2).trim())}</strong>`;
            }

            if (/^[-*]\s+/.test(text)) {
                const items = text
                    .split(/\n/)
                    .map((line) => line.replace(/^[-*]\s+/, '').trim())
                    .filter(Boolean)
                    .map((item) => `<li>${escapeHtml(item)}</li>`)
                    .join('');

                return `<ul>${items}</ul>`;
            }

            const formatted = escapeHtml(text)
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>')
                .replace(/\n/g, '<br />');

            return `<p>${formatted}</p>`;
        })
        .join('');
};

const getPlainText = (value) => {
    if (!value) return '';

    const decoded = decodeHtml(value);

    if (/<[a-z][\s\S]*>/i.test(decoded)) {
        const temp = document.createElement('div');
        temp.innerHTML = decoded;
        return (temp.textContent || temp.innerText || '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    return decoded
        .replace(/\*\*/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

const richTextMarkup = (value) => ({
    __html: markdownToHtml(value),
});

const parseSectionsFromRichText = (body) => {
    if (!body) return [];

    const decoded = decodeHtml(body);
    const parser = new DOMParser();
    const doc = parser.parseFromString(decoded, 'text/html');
    const nodes = Array.from(doc.body.children);

    const result = [];
    let current = null;

    const pushCurrent = () => {
        if (!current?.title || !current.body.trim()) return;

        result.push({
            title: current.title.trim(),
            body: current.body.trim(),
        });
    };

    const isHeadingNode = (node) => {
        const tag = node.tagName?.toLowerCase();
        if (/^h[1-6]$/.test(tag)) return true;

        // Rich Text editors commonly store bold headings as <p><strong>...</strong></p>.
        if (tag !== 'p') return false;

        const meaningful = Array.from(node.childNodes).filter((child) => {
            return child.nodeType === Node.TEXT_NODE
                ? child.textContent.trim()
                : true;
        });

        if (meaningful.length !== 1) return false;

        const onlyChild = meaningful[0];
        return (
            onlyChild.nodeType === Node.ELEMENT_NODE &&
            ['strong', 'b'].includes(onlyChild.tagName.toLowerCase())
        );
    };

    if (nodes.length) {
        nodes.forEach((node) => {
            if (isHeadingNode(node)) {
                pushCurrent();
                current = {
                    title: node.textContent?.trim() || '',
                    body: '',
                };
                return;
            }

            if (current) {
                current.body += node.outerHTML;
            }
        });

        pushCurrent();

        if (result.length) return result;
    }

    // Markdown / plain Rich Text fallback.
    const blocks = decoded
        .split(/\n\s*\n/)
        .map((block) => block.trim())
        .filter(Boolean);

    blocks.forEach((block) => {
        const headingMatch = block.match(/^\*\*(.+?)\*\*$/);

        if (headingMatch) {
            pushCurrent();
            current = {
                title: headingMatch[1].trim(),
                body: '',
            };
            return;
        }

        if (!current) return;
        current.body += `${current.body ? '\n\n' : ''}${block}`;
    });

    pushCurrent();
    return result;
};

const getIntroFromRichText = (body) => {
    if (!body) return { subtitle: '', description: '' };

    const decoded = decodeHtml(body);
    const parser = new DOMParser();
    const doc = parser.parseFromString(decoded, 'text/html');

    const paragraphs = Array.from(doc.body.children)
        .filter((node) => ['p', 'div'].includes(node.tagName.toLowerCase()))
        .filter((node) => {
            const text = node.textContent?.trim() || '';
            return text && !/^\*\*.+\*\*$/.test(text);
        })
        .map((node) => node.textContent?.trim() || '')
        .filter(Boolean);

    return {
        subtitle: paragraphs[0] || '',
        description: paragraphs[1] || '',
    };
};

async function getTechnologyContent() {
    const rootResponse = await contentService.getRootContent();
    const roots = Array.isArray(rootResponse.data) ? rootResponse.data : [];

    const visited = new Set();

    const findTechnology = async (items) => {
        for (const item of items) {
            if (!item?.id || visited.has(item.id)) continue;

            visited.add(item.id);

            const title = item?.title?.trim().toLowerCase() || '';

            if (
                title === 'technology' ||
                title === 'technology logistics' ||
                title.startsWith('technology -')
            ) {
                let children = [];

                try {
                    const childrenResponse = await contentService.getChildren(item.id);
                    children = Array.isArray(childrenResponse.data)
                        ? childrenResponse.data
                        : [];
                } catch (error) {
                    console.error(
                        `Failed to load Technology children for ${item.id}:`,
                        error
                    );
                }

                return {
                    ...item,
                    children,
                };
            }

            try {
                const childrenResponse = await contentService.getChildren(item.id);
                const children = Array.isArray(childrenResponse.data)
                    ? childrenResponse.data
                    : [];

                const found = await findTechnology(children);

                if (found) return found;
            } catch (error) {
                console.error(
                    `Failed to load content children for ${item.id}:`,
                    error
                );
            }
        }

        return null;
    };

    return findTechnology(roots);
}

const buildTechnologyModel = (content) => {
    if (!content) return null;

    const children = Array.isArray(content.children)
        ? content.children.filter((item) => item?.title)
        : [];

    const childSections = children
        .filter((item) => item.body && !/industry expertise/i.test(item.title))
        .map((item) => ({
            title: item.title,
            body: item.body,
        }));

    const parsedSections = parseSectionsFromRichText(content.body);
    const sections = childSections.length ? childSections : parsedSections;

    const intro = getIntroFromRichText(content.body);
    const expertise = children.find((item) => /industry expertise|expertise/i.test(item.title));

    return {
        ...content,
        sections,
        heroSubtitle: content.heroSubtitle || intro.subtitle,
        heroDescription: content.heroDescription || intro.description,
        expertiseTitle: expertise?.title || content.expertiseTitle || '',
        expertiseBody: expertise?.body || content.expertiseBody || '',
        capabilitiesTitle: content.capabilitiesTitle || content.title || '',
    };
};

function Technology() {
    const [content, setContent] = useState(null);

    useEffect(() => {
        let isMounted = true;

        const loadContent = async () => {
            try {
                const technology = await getTechnologyContent();

                if (isMounted) {
                    setContent(buildTechnologyModel(technology));
                }
            } catch (error) {
                console.error('Failed to load Technology content:', error);

                if (isMounted) {
                    setContent(null);
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
                                {content?.title || 'Technology'}
                            </h1>

                            <p className="mt-7 max-w-2xl text-2xl font-medium leading-tight text-sky-400 sm:text-3xl">
                                {content?.heroSubtitle || ''}
                            </p>

                            <p className="mt-7 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
                                {content?.heroDescription || ''}
                            </p>
                        </div>

                        <IndustryHeroVisual industry="technology" />
                    </div>
                </div>
            </section>

            {/* Technology logistics expertise */}
            <section className="py-24 sm:py-32">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                            Our capabilities
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
                            {content?.capabilitiesTitle || content?.title || ''}
                        </h2>
                    </div>

                    <div className="mt-16 space-y-8">
                        {sections.map((section, index) => (
                            <article
                                key={section.title}
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
                                    className={`bg-white p-8 sm:p-12 ${index % 2 ? 'lg:order-1' : ''
                                        }`}
                                >
                                    <div className="space-y-5 text-base leading-7 text-slate-600">
                                        <div
                                            className="[&_a]:text-sky-600 [&_a]:underline [&_strong]:font-semibold [&_em]:italic [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6"
                                            dangerouslySetInnerHTML={richTextMarkup(section.body)}
                                        />
                                    </div>
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
                        {content?.expertiseTitle || ''}
                    </h2>

                    {content?.expertiseBody && (
                        <div
                            className="mt-7 text-lg leading-8 text-white/65 [&_a]:text-sky-400 [&_a]:underline [&_strong]:font-semibold [&_em]:italic [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6"
                            dangerouslySetInnerHTML={richTextMarkup(content.expertiseBody)}
                        />
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

export default Technology;