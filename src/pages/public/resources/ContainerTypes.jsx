import { useEffect, useState } from 'react';
import { ArrowUpRight, Container } from 'lucide-react';
import contentService from '../../../services/contentService';

const decodeHtml = (value) => {
    if (!value) return '';

    const textarea = document.createElement('textarea');
    textarea.innerHTML = String(value);
    return textarea.value;
};

const getBodyDocument = (value) => {
    const decoded = decodeHtml(value);
    const parser = new DOMParser();
    return parser.parseFromString(decoded, 'text/html');
};

const getText = (node) =>
    (node?.textContent || '')
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const extractContainerTypes = (body) => {
    if (!body) return [];

    const decoded = decodeHtml(body);
    const doc = getBodyDocument(decoded);

    // 1) Normal Rich Text ordered/unordered list.
    const listItems = Array.from(doc.querySelectorAll('ol li, ul li'))
        .map((li) => getText(li))
        .filter(Boolean);

    if (listItems.length) {
        return listItems.map((title) => ({
            title,
            body: '',
        }));
    }

    // 2) Rich Text editors sometimes save numbered items as div/p/br text
    // instead of a real <ol>. Preserve line breaks before extracting them.
    const withLineBreaks = decoded
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|section|h[1-6])>/gi, '\n')
        .replace(/<li[^>]*>/gi, '\n')
        .replace(/<\/li>/gi, '\n');

    const plain = withLineBreaks
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\r/g, '')
        .trim();

    const numberedItems = [];
    const numberedRegex = /(?:^|\n)\s*\d+\s*[.)]\s*(.+?)(?=\n\s*\d+\s*[.)]\s*|\s*$)/gs;

    for (const match of plain.matchAll(numberedRegex)) {
        const title = match[1]
            .replace(/\s+/g, ' ')
            .trim();

        if (title) {
            numberedItems.push(title);
        }
    }

    if (numberedItems.length) {
        return numberedItems.map((title) => ({
            title,
            body: '',
        }));
    }

    // 3) Bullet-list fallback.
    const bulletItems = plain
        .split(/\n/)
        .map((line) => line.trim())
        .filter((line) => /^[-*•]\s+/.test(line))
        .map((line) => line.replace(/^[-*•]\s+/, '').trim())
        .filter(Boolean);

    return bulletItems.map((title) => ({
        title,
        body: '',
    }));
};

const getHeroDescription = (body) => {
    if (!body) return '';

    const doc = getBodyDocument(body);

    const firstParagraph = Array.from(doc.querySelectorAll('p'))
        .map(getText)
        .find(Boolean);

    if (firstParagraph) return firstParagraph;

    // If the editor did not create <p>, take the first text block before
    // the ordered list / first numbered item.
    const clone = doc.body.cloneNode(true);
    clone.querySelectorAll('ol, ul').forEach((list) => list.remove());

    const text = getText(clone);

    if (text) {
        const firstNumber = text.search(/\b1\s*[.)]\s*/);

        if (firstNumber > 0) {
            return text.slice(0, firstNumber).trim();
        }

        return text;
    }

    return '';
};

const parseContainerTypes = (content) => {
    if (!content) {
        return {
            title: 'Container Types',
            description: '',
            types: [],
        };
    }

    const body = content.body || '';

    // Children are supported, but the parent Rich Text is the source of truth
    // when the container list was entered directly in the Body editor.
    let types = extractContainerTypes(body);

    if (!types.length && Array.isArray(content.children)) {
        types = content.children
            .filter((item) => item?.title)
            .map((item) => ({
                title: item.title.trim(),
                body: item.body || '',
            }));
    }

    return {
        title: content.title?.trim() || 'Container Types',
        description:
            content.heroDescription?.trim() ||
            content.description?.trim() ||
            getHeroDescription(body),
        types,
    };
};

async function findContainerTypesContent() {
    const rootResponse = await contentService.getRootContent();

    // Support both API shapes:
    // data: []
    // data: { items: [] }
    const rootData = rootResponse?.data;
    const roots = Array.isArray(rootData)
        ? rootData
        : Array.isArray(rootData?.items)
            ? rootData.items
            : Array.isArray(rootData?.data)
                ? rootData.data
                : [];

    const visited = new Set();

    const walk = async (items) => {
        for (const item of items) {
            if (!item?.id || visited.has(item.id)) continue;

            visited.add(item.id);

            const title = String(item.title || '').trim().toLowerCase();

            if (
                title === 'container types' ||
                title === 'container type' ||
                title.startsWith('container types -')
            ) {
                try {
                    const childrenResponse = await contentService.getChildren(item.id);
                    const childrenData = childrenResponse?.data;

                    return {
                        ...item,
                        children: Array.isArray(childrenData)
                            ? childrenData
                            : Array.isArray(childrenData?.items)
                                ? childrenData.items
                                : [],
                    };
                } catch (error) {
                    console.error(
                        'Failed to load Container Types children:',
                        error
                    );

                    return {
                        ...item,
                        children: [],
                    };
                }
            }

            try {
                const childrenResponse = await contentService.getChildren(item.id);
                const childrenData = childrenResponse?.data;

                const children = Array.isArray(childrenData)
                    ? childrenData
                    : Array.isArray(childrenData?.items)
                        ? childrenData.items
                        : [];

                const found = await walk(children);

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

    return walk(roots);
}

export default function ContainerTypes() {
    const [content, setContent] = useState(null);

    useEffect(() => {
        let mounted = true;

        const loadContent = async () => {
            try {
                const item = await findContainerTypesContent();

                if (mounted) {
                    setContent(parseContainerTypes(item));
                }
            } catch (error) {
                console.error('Failed to load Container Types content:', error);

                if (mounted) {
                    setContent({
                        title: 'Container Types',
                        description: '',
                        types: [],
                    });
                }
            }
        };

        loadContent();

        return () => {
            mounted = false;
        };
    }, []);

    const containerTypes = content?.types || [];

    return (
        <main className="bg-white">
            {/* ==================== Hero ==================== */}
            <section className="relative overflow-hidden bg-slate-950 py-28 sm:py-32">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.18),transparent_35%)]" />

                <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
                            Resources
                        </p>

                        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                            {content?.title || 'Container Types'}
                        </h1>

                        <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                            {content?.description || ''}
                        </p>
                    </div>
                </div>
            </section>

            {/* ==================== Container Types ==================== */}
            <section className="bg-slate-50 py-24 sm:py-28">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {containerTypes.map((type, index) => (
                            <article
                                key={`${type.title}-${index}`}
                                className="group rounded-3xl border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl hover:shadow-slate-200/60"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                                        <Container size={24} strokeWidth={1.8} />
                                    </div>

                                    <span className="text-sm font-semibold text-slate-300">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                </div>

                                <h2 className="mt-7 text-xl font-semibold leading-snug text-slate-900">
                                    {type.title}
                                </h2>

                                {type.body && (
                                    <div
                                        className="mt-4 text-sm leading-6 text-slate-500 [&_a]:text-sky-600 [&_a]:underline [&_strong]:font-semibold [&_em]:italic [&_ul]:list-disc [&_ul]:pl-5"
                                        dangerouslySetInnerHTML={{
                                            __html: decodeHtml(type.body),
                                        }}
                                    />
                                )}

                                <div className="mt-5 flex items-center gap-2 text-sm font-medium text-slate-400 transition group-hover:text-sky-600">
                                    Container type
                                    <ArrowUpRight
                                        size={16}
                                        className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                                    />
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}
