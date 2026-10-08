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

            return `<p>${text
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br />')}</p>`;
        })
        .join('');
};

const getText = (value) => {
    if (!value) return '';

    const temp = document.createElement('div');
    temp.innerHTML = decodeHtml(value);

    return (temp.textContent || temp.innerText || '')
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const INCOTERM_CODES = [
    'EXW',
    'FCA',
    'CPT',
    'CIP',
    'DAP',
    'DPU',
    'DDP',
    'FAS',
    'FOB',
    'CFR',
    'CIF',
];

const extractTermsFromRichText = (body) => {
    if (!body) return [];

    const decoded = decodeHtml(body);
    const doc = new DOMParser().parseFromString(decoded, 'text/html');

    // Rich Text can arrive as a single list/paragraph block.
    // Normalize it to plain text first, then split by every Incoterm
    // marker. This avoids putting all 11 terms into the first card.
    let text = doc.body?.textContent || '';

    text = text
        .replace(/\u00a0/g, ' ')
        .replace(/\r/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n+/g, ' ')
        .trim();

    if (!text) return [];

    const codePattern =
        '(EXW|FCA|CPT|CIP|DAP|DPU|DDP|FAS|FOB|CFR|CIF)';

    const markerRegex = new RegExp(
        `\\b${codePattern}\\s*\\(([^)]+)\\)\\s*:\\s*`,
        'gi'
    );

    const markers = [];
    let match;

    while ((match = markerRegex.exec(text)) !== null) {
        markers.push({
            code: match[1].toUpperCase(),
            name: match[2].trim(),
            start: match.index,
            end: markerRegex.lastIndex,
        });
    }

    const terms = [];

    markers.forEach((marker, index) => {
        if (terms.some((term) => term.code === marker.code)) return;

        const nextStart =
            index < markers.length - 1
                ? markers[index + 1].start
                : text.length;

        let description = text
            .slice(marker.end, nextStart)
            .trim()
            .replace(
                /(?:^|\s)For\s+Sea\s*&\s*Inland\s+Waterways\s+Only\s*\(\s*4\s*Terms\s*\)\s*:?\s*/gi,
                ' '
            )
            .replace(
                /(?:^|\s)For\s+Any\s+Mode\s+of\s+Transport\s*\(\s*7\s*Terms\s*\)\s*:?\s*/gi,
                ' '
            )
            .replace(/\s+/g, ' ')
            .trim();

        terms.push({
            code: marker.code,
            name: marker.name,
            description,
        });
    });

    return terms;
};
const getIntroHtml = () => {
    // The original page has only the section heading here.
    // The CMS Rich Text belongs to the term cards below.
    return '';
};

const extractImageFromBody = (body) => {
    if (!body) return '';

    const decoded = decodeHtml(body);

    const doc = new DOMParser().parseFromString(decoded, 'text/html');
    const image = doc.querySelector('img');

    if (image?.getAttribute('src')) {
        return image.getAttribute('src');
    }

    // Rich Text may contain the image as Markdown:
    // [image](https://...)
    const markdownMatch = decoded.match(
        /!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)|\[image\]\((https?:\/\/[^)\s]+)\)/i
    );

    if (markdownMatch) {
        return markdownMatch[1] || markdownMatch[2];
    }

    // Last fallback for a direct image URL in the body.
    const urlMatch = decoded.match(
        /https?:\/\/[^\s<>"')]+?\.(?:png|jpe?g|webp|gif)(?:\?[^\s<>"')]*)?/i
    );

    return urlMatch?.[0] || '';
};
const normalizeTerm = (item) => {
    const rawTitle = String(item?.title || '').trim();

    const match = rawTitle.match(
        /^(EXW|FCA|CPT|CIP|DAP|DPU|DDP|FAS|FOB|CFR|CIF)\s*(?:[-–—:]\s*)?(.*)$/i
    );

    return {
        code: match ? match[1].toUpperCase() : rawTitle,
        name: match?.[2]?.trim() || rawTitle,
        description: item?.body || '',
    };
};

const findIncotermsContent = async () => {
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
                title === 'incoterms 2020' ||
                title === 'incoterms' ||
                title.startsWith('incoterms 2020 -')
            ) {
                try {
                    const response = await contentService.getChildren(item.id);
                    const data = response?.data;

                    return {
                        ...item,
                        children: Array.isArray(data)
                            ? data
                            : Array.isArray(data?.items)
                                ? data.items
                                : [],
                    };
                } catch (error) {
                    console.error('Failed to load Incoterms children:', error);

                    return {
                        ...item,
                        children: [],
                    };
                }
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

const buildIncotermsModel = (content) => {
    if (!content) return null;

    const children = Array.isArray(content.children)
        ? content.children.filter((item) => item?.title)
        : [];

    // First parse the actual Rich Text body. This is important because
    // the CMS may contain a parent Page child that is not itself an
    // Incoterm.
    let terms = extractTermsFromRichText(content.body || '');

    // If Rich Text does not contain the terms, use CMS children.
    if (!terms.length) {
        terms = children
            .map(normalizeTerm)
            .filter((term) => INCOTERM_CODES.includes(term.code));
    }

    const anyModeCodes = ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'];

    return {
        ...content,
        title: content.title?.trim() || 'Incoterms 2020',
        heroDescription:
            content.heroDescription?.trim() ||
            'Understand the main Incoterms used in international trade and logistics.',
        introHtml: '',
        anyModeTerms: terms.filter((term) =>
            anyModeCodes.includes(term.code)
        ),
        seaTerms: terms.filter((term) =>
            ['FAS', 'FOB', 'CFR', 'CIF'].includes(term.code)
        ),
        featuredImage:
            content.featuredImage ||
            content.imageUrl ||
            content.image ||
            extractImageFromBody(content.body || ''),
    };
};
function TermCard({ code, name, description }) {
    return (
        <article className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-lg hover:shadow-slate-200/60">
            <span className="text-sm font-bold tracking-[0.18em] text-sky-600">
                {code}
            </span>

            <h3 className="mt-6 text-xl font-semibold text-slate-900">
                {name}
            </h3>

            {description && (
                <div
                    className="mt-3 text-sm leading-6 text-slate-600 [&_a]:text-sky-600 [&_a]:underline [&_strong]:font-semibold [&_em]:italic [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                    dangerouslySetInnerHTML={{
                        __html: richTextToHtml(description),
                    }}
                />
            )}
        </article>
    );
}

export default function Incoterms() {
    const [content, setContent] = useState(null);

    useEffect(() => {
        let mounted = true;

        const loadContent = async () => {
            try {
                const item = await findIncotermsContent();

                if (mounted) {
                    setContent(buildIncotermsModel(item));
                }
            } catch (error) {
                console.error('Failed to load Incoterms content:', error);

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

    const anyModeTerms = content?.anyModeTerms || [];
    const seaTerms = content?.seaTerms || [];

    return (
        <main className="min-h-screen bg-white">
            {/* Hero */}
            <section className="relative overflow-hidden bg-slate-950">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.18),_transparent_45%)]" />

                <div className="relative mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
                        Resources
                    </p>

                    <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                        {content?.title || 'Incoterms 2020'}
                    </h1>

                    <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                        {content?.heroDescription || ''}
                    </p>
                </div>
            </section>

            {/* Intro */}
            <section className="bg-slate-50 py-20 sm:py-24">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                            Incoterms 2020
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                            Types of Incoterms
                        </h2>


                    </div>
                </div>
            </section>

            {/* Any Mode */}
            <section className="bg-white py-20 sm:py-24">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                            7 Terms
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                            For Any Mode of Transport
                        </h2>
                    </div>

                    <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {anyModeTerms.map((term) => (
                            <TermCard key={term.code} {...term} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Source Image */}
            {content?.featuredImage && (
                <section className="bg-slate-50 py-12 sm:py-16">
                    <div className="mx-auto max-w-7xl px-6 lg:px-8">
                        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                            <img
                                src={content.featuredImage}
                                alt={content.title || 'Incoterms 2020'}
                                className="h-auto w-full object-cover"
                            />
                        </div>
                    </div>
                </section>
            )}

            {/* Sea & Inland Waterways */}
            <section className="bg-white py-20 sm:py-24">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                            4 Terms
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                            For Sea &amp; Inland Waterways Only
                        </h2>
                    </div>

                    <div className="mt-12 grid gap-5 md:grid-cols-2">
                        {seaTerms.map((term) => (
                            <TermCard key={term.code} {...term} />
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}
