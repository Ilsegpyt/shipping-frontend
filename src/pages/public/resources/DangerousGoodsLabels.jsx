import { useEffect, useState } from 'react';
import contentService from '../../../services/contentService';
const decodeHtml = (value) => {
    if (!value) return '';

    const textarea = document.createElement('textarea');
    textarea.innerHTML = String(value);
    return textarea.value;
};

const richTextToHtml = (value) => {
    if (!value) return '';

    const decoded = decodeHtml(value);

    if (/<[a-z][\s\S]*>/i.test(decoded)) {
        return decoded;
    }

    return decoded
        .split(/\n\s*\n/)
        .map((block) => {
            const text = block.trim();
            if (!text) return '';

            const formatted = text
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br />');

            return `<p>${formatted}</p>`;
        })
        .join('');
};

const plainText = (value) => {
    if (!value) return '';

    const decoded = decodeHtml(value);
    const temp = document.createElement('div');
    temp.innerHTML = decoded;

    return (temp.textContent || temp.innerText || '')
        .replace(/\s+/g, ' ')
        .trim();
};

const extractDangerousGoodsClasses = (body) => {
    if (!body) return [];

    const decoded = decodeHtml(body);
    const parser = new DOMParser();
    const doc = parser.parseFromString(decoded, 'text/html');

    const result = [];

    // Rich Text headings + paragraphs/lists.
    const headings = Array.from(doc.querySelectorAll('h2, h3, h4'));
    if (headings.length) {
        headings.forEach((heading) => {
            const title = heading.textContent?.trim() || '';

            if (!title) return;

            const match = title.match(/^(Class\s+\d+)\s*:?\s*(.*)$/i);
            if (!match) return;

            let node = heading.nextElementSibling;
            const parts = [];

            while (node && !/^h[1-6]$/i.test(node.tagName)) {
                parts.push(node.outerHTML);
                node = node.nextElementSibling;
            }

            result.push({
                number: match[1],
                title: match[2].trim() || match[1],
                description: parts.join(' ').trim(),
            });
        });
    }

    if (result.length) {
        return result;
    }

    // Rich Text numbered list fallback.
    const items = Array.from(doc.querySelectorAll('ol li, ul li'))
        .map((li) => li.innerHTML?.trim())
        .filter(Boolean);

    if (items.length) {
        return items.map((html, index) => {
            const temp = document.createElement('div');
            temp.innerHTML = html;

            const text = (temp.textContent || '').trim();
            const match = text.match(/^Class\s*(\d+)\s*:?\s*(.*)$/i);

            return {
                number: match ? `Class ${match[1]}` : `Class ${index + 1}`,
                title: match ? match[2].trim() : text,
                description: '',
            };
        });
    }

    // Markdown/plain-text fallback.
    const lines = decoded
        .replace(/\r/g, '')
        .split(/\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    for (let i = 0; i < lines.length; i += 1) {
        const match = lines[i].match(
            /^(?:[-*]\s*)?(Class\s*\d+)\s*:?\s*(.*)$/i
        );

        if (!match) continue;

        const descriptionLines = [];
        let j = i + 1;

        while (
            j < lines.length &&
            !/^(?:[-*]\s*)?Class\s*\d+\s*:?\s*/i.test(lines[j])
        ) {
            descriptionLines.push(lines[j]);
            j += 1;
        }

        result.push({
            number: match[1].replace(/\s+/, ' '),
            title: match[2].trim(),
            description: descriptionLines.join(' '),
        });

        i = j - 1;
    }

    return result;
};

const getIntroFromBody = (body) => {
    if (!body) return '';

    const decoded = decodeHtml(body);
    const doc = new DOMParser().parseFromString(decoded, 'text/html');

    const paragraphs = Array.from(doc.querySelectorAll('p'))
        .map((p) => p.textContent?.trim())
        .filter(Boolean);

    if (paragraphs.length) {
        return paragraphs.slice(0, 2).join(' ');
    }

    const text = plainText(body);
    const classIndex = text.search(/Class\s*1\b/i);

    return classIndex > 0 ? text.slice(0, classIndex).trim() : text;
};

async function findDangerousGoodsContent() {
    const rootResponse = await contentService.getRootContent();
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
                title === 'classification of dangerous goods labels' ||
                title === 'dangerous goods labels' ||
                title === 'dangerous goods'
            ) {
                let children = [];

                try {
                    const response = await contentService.getChildren(item.id);
                    const data = response?.data;

                    children = Array.isArray(data)
                        ? data
                        : Array.isArray(data?.items)
                            ? data.items
                            : [];
                } catch (error) {
                    console.error(
                        'Failed to load Dangerous Goods children:',
                        error
                    );
                }

                return {
                    ...item,
                    children,
                };
            }

            try {
                const response = await contentService.getChildren(item.id);
                const data = response?.data;

                const children = Array.isArray(data)
                    ? data
                    : Array.isArray(data?.items)
                        ? data.items
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
};

const getIntroHtml = (body) => {
    if (!body) return '';

    const decoded = decodeHtml(body);
    const parser = new DOMParser();
    const doc = parser.parseFromString(decoded, 'text/html');

    const nodes = Array.from(doc.body.children);
    const introNodes = [];

    for (const node of nodes) {
        const tag = node.tagName.toLowerCase();

        // The first Class heading/list marks the beginning of the
        // classification content. Do not include it in the intro.
        if (
            (/^h[1-6]$/.test(tag) &&
                /^class\s+\d+/i.test(node.textContent?.trim() || '')) ||
            tag === 'ol' ||
            tag === 'ul'
        ) {
            break;
        }

        const text = node.textContent?.trim() || '';

        // Stop for plain-text/HTML Class headings too.
        if (/^class\s+\d+/i.test(text)) {
            break;
        }

        if (text) {
            introNodes.push(node.outerHTML);
        }
    }

    // Keep only the actual introductory content.
    return introNodes.slice(0, 2).join('');
};

const buildDangerousGoodsModel = (content) => {
    if (!content) return null;

    const children = Array.isArray(content.children)
        ? content.children.filter((item) => item?.title)
        : [];

    // If the CMS page has children, use them as the cards.
    let classes = children.map((item, index) => ({
        number: /^class\s+\d+/i.test(item.title)
            ? item.title.match(/^class\s+\d+/i)[0]
            : `Class ${index + 1}`,
        title: /^class\s+\d+/i.test(item.title)
            ? item.title.replace(/^class\s+\d+\s*:?\s*/i, '').trim()
            : item.title.trim(),
        description: item.body || '',
    }));

    // Otherwise parse the page Rich Text.
    if (!classes.length) {
        classes = extractDangerousGoodsClasses(content.body || '');
    }

    return {
        ...content,
        title:
            content.title?.trim() ||
            'Classification of Dangerous Goods Labels',
        description:
            content.heroDescription?.trim() ||
            'Dangerous goods labels must be used in transport to identify the risks of the products being transported.',
        introHtml: getIntroHtml(content.body || ''),
        classes,
    };
};

function DangerousGoodsCard({ number, title, description }) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-lg hover:shadow-slate-200/60">
            <span className="inline-flex rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-bold tracking-[0.14em] text-sky-600 ring-1 ring-sky-100">
                {number}
            </span>

            <h2 className="mt-5 text-xl font-semibold leading-snug text-slate-900">
                {title}
            </h2>

            <div
                className="mt-3 text-sm leading-6 text-slate-600 [&_a]:text-sky-600 [&_a]:underline [&_strong]:font-semibold [&_em]:italic [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                dangerouslySetInnerHTML={{
                    __html: richTextToHtml(description),
                }}
            />
        </article>
    );
}

export default function DangerousGoodsLabels() {
    const [content, setContent] = useState(null);

    useEffect(() => {
        let mounted = true;

        const loadContent = async () => {
            try {
                const item = await findDangerousGoodsContent();

                if (mounted) {
                    setContent(buildDangerousGoodsModel(item));
                }
            } catch (error) {
                console.error(
                    'Failed to load Dangerous Goods Labels content:',
                    error
                );

                if (mounted) {
                    setContent(null);
                }
            }
        };

        loadContent();

        return () => {
            mounted = false;
        };
    }, []);

    const dangerousGoodsClasses = content?.classes || [];

    return (
        <main className="min-h-screen bg-white">
            <section className="relative overflow-hidden bg-slate-950">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.18),_transparent_45%)]" />

                <div className="relative mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
                        Resources
                    </p>

                    <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                        {content?.title || 'Classification of Dangerous Goods Labels'}
                    </h1>

                    <p className="mt-6 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                        {content?.description || ''}
                    </p>
                </div>
            </section>

            <section className="bg-slate-50 py-20 sm:py-24">
                <div className="mx-auto max-w-4xl px-6 lg:px-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                        Dangerous Goods
                    </p>

                    <div
                        className="mt-6 space-y-5 text-base leading-8 text-slate-600 [&_a]:font-semibold [&_a]:text-sky-600 [&_a]:underline [&_a]:decoration-sky-200 [&_a]:underline-offset-4 [&_a]:transition [&_a]:hover:text-sky-500 [&_strong]:font-semibold [&_strong]:text-slate-900 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6"
                        dangerouslySetInnerHTML={{
                            __html: richTextToHtml(content?.introHtml || ''),
                        }}
                    />
                </div>
            </section>

            <section className="bg-white py-20 sm:py-24">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                            Classification
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                            {content?.classificationTitle || 'Dangerous goods classes'}
                        </h2>
                    </div>

                    <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {dangerousGoodsClasses.map((item) => (
                            <DangerousGoodsCard
                                key={item.number}
                                {...item}
                            />
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}
