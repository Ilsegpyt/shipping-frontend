import { useEffect, useState } from 'react';

import { Link } from 'react-router-dom';

import {
    ArrowLeft,
    ArrowUpRight,
    ChevronDown,
    HeartPulse,
    ShieldCheck,
    Truck,
    Warehouse,
} from 'lucide-react';

import IndustryHeroVisual from '../../../components/public/IndustryHeroVisual';
import contentService from '../../../services/contentService';

const iconMap = {
    biopharma: HeartPulse,
    'medical devices and diagnostics': ShieldCheck,
    'medical products and personal care': Truck,
    'hospitals and care homes': Warehouse,
};

const normalizeText = (value = '') =>
    String(value)
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&ndash;/gi, '–')
        .replace(/&mdash;/gi, '—')
        .replace(/&lsquo;|&rsquo;/gi, "'")
        .replace(/&ldquo;|&rdquo;/gi, '"')
        .replace(/<br\s*\/?>/gi, '\n')
        .trim();

const stripHtml = (value = '') => {
    if (!value) return '';
    const container = document.createElement('div');
    container.innerHTML = value;
    return normalizeText(container.textContent || '');
};

const getPlainText = (value = '') => {
    if (!value) return '';
    if (!/<[a-z][\s\S]*>/i.test(value)) return normalizeText(value);
    return stripHtml(value);
};

const markdownToHtml = (value = '') => {
    if (!value) return '';
    if (/<[a-z][\s\S]*>/i.test(value)) return value;

    const escapeHtml = (text = '') =>
        String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

    const lines = String(value).replace(/\r\n/g, '\n').split('\n');
    const output = [];
    let listItems = [];

    const flushList = () => {
        if (!listItems.length) return;
        output.push(`<ul>${listItems.map((item) => `<li>${item}</li>`).join('')}</ul>`);
        listItems = [];
    };

    const inline = (text) =>
        escapeHtml(text)
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/__(.+?)__/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/_(.+?)_/g, '<em>$1</em>');

    lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) {
            flushList();
            return;
        }

        const heading = trimmed.match(/^(#{1,5})\s+(.+)$/);
        if (heading) {
            flushList();
            const level = Math.min(5, heading[1].length);
            output.push(`<h${level}>${inline(heading[2])}</h${level}>`);
            return;
        }

        const bullet = trimmed.match(/^[-*]\s+(.+)$/);
        if (bullet) {
            listItems.push(inline(bullet[1]));
            return;
        }

        flushList();
        output.push(`<p>${inline(trimmed)}</p>`);
    });

    flushList();
    return output.join('');
};

const parseHealthcareContent = (item) => {
    const rawBody = item?.body || item?.content || item?.description || '';
    const html = markdownToHtml(rawBody);
    const title = item?.title || 'Healthcare logistics';

    const result = {
        title,
        heroSubtitle: item?.heroSubtitle || '',
        heroDescription: item?.heroDescription || '',
        introLabel: 'Healthcare logistics',
        introTitle: '',
        introBodyHtml: '',
        capabilitiesLabel: 'Our capabilities',
        capabilitiesTitle: '',
        sections: [],
        faqLabel: 'Frequently asked questions',
        faqTitle: '',
        faqs: [],
        ctaLabel: item?.ctaLabel || 'Discuss your requirements',
        ctaHref: item?.ctaHref || '/#contact',
    };

    if (!html) return result;

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const nodes = Array.from(doc.body.children);
    const textOf = (node) => getPlainText(node?.innerHTML || node?.textContent || '');
    const isHeading = (node) => /^H[1-5]$/.test(node?.tagName || '');
    const isBoldOnlyParagraph = (node) =>
        node?.tagName === 'P' &&
        node.querySelector('strong') &&
        !node.querySelector('em, a, br') &&
        textOf(node).trim() === node.querySelector('strong')?.textContent?.trim();

    // If the CMS body does not provide explicit hero fields, use the first two paragraphs.
    const paragraphs = nodes.filter((node) => node.tagName === 'P');
    if (!result.heroSubtitle) {
        result.heroSubtitle = paragraphs
            .map(textOf)
            .find((text) => /logistics that make the world a better place/i.test(text)) || '';
    }
    if (!result.heroDescription) {
        result.heroDescription = paragraphs
            .map(textOf)
            .find((text) => text.length > 80 && !/logistics that make the world a better place/i.test(text)) || '';
    }

    const introTitleIndex = nodes.findIndex((node) =>
        /we can help you make a difference/i.test(textOf(node))
    );
    const capabilitiesTitleIndex = nodes.findIndex((node) =>
        /specialist healthcare solutions/i.test(textOf(node))
    );
    const faqTitleIndex = nodes.findIndex((node) =>
        /healthcare logistics, answered/i.test(textOf(node))
    );

    if (introTitleIndex >= 0) {
        result.introTitle = textOf(nodes[introTitleIndex]);
        const end = capabilitiesTitleIndex > introTitleIndex ? capabilitiesTitleIndex : nodes.length;
        result.introBodyHtml = nodes
            .slice(introTitleIndex + 1, end)
            .filter((node) => node.tagName === 'P')
            .map((node) => node.outerHTML)
            .join('');
    }

    if (capabilitiesTitleIndex >= 0) {
        result.capabilitiesTitle = textOf(nodes[capabilitiesTitleIndex]);
    }

    const knownSectionTitles = [
        'biopharma',
        'medical devices and diagnostics',
        'medical products and personal care',
        'hospitals and care homes',
    ];

    const sectionIndexes = [];
    nodes.forEach((node, index) => {
        const text = textOf(node).toLowerCase();
        if (knownSectionTitles.includes(text) || (isBoldOnlyParagraph(node) && knownSectionTitles.includes(text))) {
            sectionIndexes.push(index);
        }
    });

    result.sections = sectionIndexes.map((startIndex, sectionIndex) => {
        const headingNode = nodes[startIndex];
        const titleText = textOf(headingNode);
        const endIndex = sectionIndexes[sectionIndex + 1] ?? (faqTitleIndex >= 0 ? faqTitleIndex : nodes.length);
        const bodyNodes = nodes.slice(startIndex + 1, endIndex);
        const textNodes = bodyNodes.filter((node) => node.tagName === 'P' || node.tagName === 'UL' || node.tagName === 'OL');

        return {
            title: titleText,
            icon: iconMap[titleText.toLowerCase()] || Truck,
            textHtml: textNodes.map((node) => node.outerHTML).join(''),
        };
    });

    if (faqTitleIndex >= 0) {
        result.faqTitle = textOf(nodes[faqTitleIndex]);
        let current = null;

        nodes.slice(faqTitleIndex + 1).forEach((node) => {
            const text = textOf(node);
            if (!text) return;

            const isQuestion = text.endsWith('?') && (node.tagName === 'H2' || node.tagName === 'H3' || node.tagName === 'H4' || node.tagName === 'H5' || node.tagName === 'P' || isBoldOnlyParagraph(node));

            if (isQuestion) {
                current = { question: text, answerHtml: '' };
                result.faqs.push(current);
                return;
            }

            if (current && (node.tagName === 'P' || node.tagName === 'UL' || node.tagName === 'OL')) {
                current.answerHtml += node.outerHTML;
            }
        });
    }

    return result;
};

const collectContent = async () => {
    const rootResponse = await contentService.getRootContent();
    const rootItems = rootResponse?.data || [];

    const allItems = [];

    const walk = async (items) => {
        for (const item of items || []) {
            allItems.push(item);

            try {
                const childrenResponse = await contentService.getChildren(item.id);
                const children = childrenResponse?.data || [];
                if (children.length) await walk(children);
            } catch {
                // Leaf content is expected to return an empty child collection.
            }
        }
    };

    await walk(rootItems);
    return allItems;
};

function HealthcareLogistics() {
    const [openFaq, setOpenFaq] = useState(0);
    const [content, setContent] = useState(null);

    useEffect(() => {
        let cancelled = false;

        const loadContent = async () => {
            try {
                const items = await collectContent();

                const healthcare = items.find((item) => {
                    const title = normalizeText(item?.title).toLowerCase();

                    return (
                        title === 'healthcare logistics' ||
                        title === 'healthcare' ||
                        title.includes('healthcare logistics')
                    );
                });

                if (!cancelled) {
                    setContent(healthcare ? parseHealthcareContent(healthcare) : null);
                }
            } catch (error) {
                console.error('Failed to load Healthcare Logistics content:', error);
                if (!cancelled) setContent(null);
            }
        };

        loadContent();

        return () => {
            cancelled = true;
        };
    }, []);

    const sections = content?.sections || [];
    const faqs = content?.faqs || [];

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
                                {content?.title || 'Healthcare logistics'}
                            </h1>

                            <p className="mt-7 max-w-2xl text-2xl font-medium leading-tight text-sky-400 sm:text-3xl">
                                {content?.heroSubtitle || ''}
                            </p>

                            <p className="mt-7 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
                                {content?.heroDescription || ''}
                            </p>
                        </div>

                        <IndustryHeroVisual industry="healthcare" />
                    </div>
                </div>
            </section>

            {/* Intro */}
            <section className="bg-slate-50 py-24 sm:py-28">
                <div className="mx-auto max-w-4xl px-6 lg:px-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                        {content?.introLabel || 'Healthcare logistics'}
                    </p>

                    <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
                        {content?.introTitle || ''}
                    </h2>

                    <p className="mt-7 whitespace-pre-line text-lg leading-8 text-slate-600">
                        <span dangerouslySetInnerHTML={{ __html: content?.introBodyHtml || '' }} />
                    </p>
                </div>
            </section>

            {/* Specialist solutions */}
            <section className="py-24 sm:py-32">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                            {content?.capabilitiesLabel || 'Our capabilities'}
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
                            {content?.capabilitiesTitle || ''}
                        </h2>
                    </div>

                    <div className="mt-16 space-y-8">
                        {sections.map((section, index) => {
                            const Icon = section.icon;
                            const reverse = index % 2 === 1;

                            return (
                                <article
                                    key={section.title}
                                    className="grid overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 lg:grid-cols-2"
                                >
                                    <div
                                        className={`min-h-[320px] bg-gradient-to-br from-sky-100 via-white to-slate-100 p-8 sm:p-12 ${reverse ? 'lg:order-2' : ''
                                            }`}
                                    >
                                        <div className="flex h-full flex-col justify-between">
                                            <div>
                                                <div className="inline-flex rounded-2xl bg-white p-3 text-sky-600 shadow-sm">
                                                    <Icon size={26} strokeWidth={1.8} />
                                                </div>

                                                <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">
                                                    Healthcare solution
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
                                        className={`bg-white p-8 sm:p-12 ${reverse ? 'lg:order-1' : ''
                                            }`}
                                    >
                                        <div className="space-y-5 text-base leading-7 text-slate-600">
                                            <div dangerouslySetInnerHTML={{ __html: section.textHtml || '' }} />
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="bg-slate-950 py-24 sm:py-32">
                <div className="mx-auto max-w-5xl px-6 lg:px-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
                        {content?.faqLabel || 'Frequently asked questions'}
                    </p>

                    <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                        {content?.faqTitle || ''}
                    </h2>

                    <div className="mt-12 divide-y divide-white/10 rounded-3xl border border-white/10 bg-white/[0.03] px-6 sm:px-8">
                        {faqs.map((faq, index) => {
                            const isOpen = openFaq === index;

                            return (
                                <div key={faq.question}>
                                    <button
                                        type="button"
                                        onClick={() => setOpenFaq(isOpen ? -1 : index)}
                                        className="flex w-full items-center justify-between gap-6 py-7 text-left"
                                    >
                                        <span className="text-base font-semibold text-white sm:text-lg">
                                            {faq.question}
                                        </span>

                                        <ChevronDown
                                            size={20}
                                            className={`shrink-0 text-sky-400 transition-transform ${isOpen ? 'rotate-180' : ''
                                                }`}
                                        />
                                    </button>

                                    {isOpen && (
                                        <div className="whitespace-pre-line pb-7 pr-8 text-base leading-7 text-white/65">
                                            <div dangerouslySetInnerHTML={{ __html: faq.answerHtml || '' }} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-12 flex flex-wrap gap-4">
                        <Link
                            to="/"
                            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
                        >
                            Back to Home
                        </Link>

                        <a
                            href={content?.ctaHref || '/#contact'}
                            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
                        >
                            {content?.ctaLabel || 'Discuss your requirements'}
                            <ArrowUpRight size={17} />
                        </a>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default HealthcareLogistics;
