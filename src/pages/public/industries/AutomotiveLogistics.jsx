import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
    ArrowLeft,
    ArrowUpRight,
    CarFront,
    BatteryCharging,
    Boxes,
    Factory,
    Warehouse,
    Wrench,
} from 'lucide-react';

import IndustryHeroVisual from '../../../components/public/IndustryHeroVisual';
import contentService from '../../../services/contentService';

const sectionIcons = [
    BatteryCharging,
    Boxes,
    CarFront,
    Wrench,
    Factory,
    Warehouse,
];

const sectionTitles = [
    'Electrification & Mobility Competence Center (EMC2)',
    '3PL & 4PL',
    'Finished Vehicle Competency Center (VCC)',
    'Automotive afterparts and service operations',
    'Inbound',
    'Warehousing & value added solutions',
];

const normalizeText = (value = '') =>
    value
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const decodeHtml = (value = '') => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = value;
    return textarea.value;
};

const parseMarkdownLine = (line) => {
    const trimmed = line.trim();

    if (!trimmed) return null;

    const headingMatch = trimmed.match(/^#{1,6}\s+(.+)$/);
    if (headingMatch) {
        return {
            type: 'heading',
            text: normalizeText(headingMatch[1].replace(/\*\*/g, '')),
        };
    }

    const boldHeadingMatch = trimmed.match(/^\*\*(.+?)\*\*$/);
    if (boldHeadingMatch) {
        return {
            type: 'heading',
            text: normalizeText(boldHeadingMatch[1]),
        };
    }

    return {
        type: 'paragraph',
        text: normalizeText(trimmed.replace(/^\*\s+/, '')),
    };
};

const getContentBlocks = (body) => {
    if (!body) return [];

    const decodedBody = decodeHtml(body);

    // CMS can contain either HTML or plain/Markdown text.
    if (/<\/?[a-z][\s\S]*>/i.test(decodedBody)) {
        const doc = new DOMParser().parseFromString(decodedBody, 'text/html');
        const elements = Array.from(
            doc.body.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li')
        );

        return elements
            .map((element) => {
                const text = normalizeText(element.textContent || '');
                if (!text) return null;

                return {
                    type: /^h[1-6]$/i.test(element.tagName) ? 'heading' : 'paragraph',
                    text,
                };
            })
            .filter(Boolean);
    }

    return decodedBody
        .split(/\r?\n/)
        .map(parseMarkdownLine)
        .filter(Boolean);
};

const parseAutomotiveContent = (content) => {
    const blocks = getContentBlocks(content?.body);

    const result = {
        title: normalizeText(content?.title || '') || 'Automotive logistics',
        heroSubtitle: '',
        serviceHeading: '',
        serviceIntro: '',
        capabilitiesHeading: '',
        sections: [],
        expertHeading: '',
        expertParagraphs: [],
    };

    const findBlockIndex = (text) => {
        const target = normalizeText(text).toLowerCase();

        return blocks.findIndex(
            (block) => block.text.toLowerCase() === target
        );
    };

    const findBlockContaining = (text) => {
        const target = normalizeText(text).toLowerCase();

        return blocks.findIndex(
            (block) => block.text.toLowerCase().includes(target)
        );
    };

    const heroSubtitleIndex = findBlockContaining(
        'Driving the world’s automotive supply chains'
    );

    if (heroSubtitleIndex >= 0) {
        result.heroSubtitle = blocks[heroSubtitleIndex].text;
    }

    const serviceHeadingIndex = findBlockIndex(
        'Service offerings the way you need them'
    );

    if (serviceHeadingIndex >= 0) {
        result.serviceHeading = blocks[serviceHeadingIndex].text;

        const serviceIntro = blocks
            .slice(serviceHeadingIndex + 1)
            .find(
                (block) =>
                    block.type === 'paragraph' &&
                    !sectionTitles.some(
                        (title) =>
                            title.toLowerCase() === block.text.toLowerCase()
                    )
            );

        if (serviceIntro) {
            result.serviceIntro = serviceIntro.text;
        }
    }

    const capabilitiesIndex = findBlockIndex('Automotive logistics solutions');

    if (capabilitiesIndex >= 0) {
        result.capabilitiesHeading = blocks[capabilitiesIndex].text;
    }

    sectionTitles.forEach((sectionTitle, index) => {
        const sectionIndex = findBlockIndex(sectionTitle);

        if (sectionIndex < 0) return;

        const nextSectionIndexes = sectionTitles
            .map((title) => findBlockIndex(title))
            .filter((value) => value > sectionIndex);

        const expertIndex = findBlockContaining(
            'Our experts are the strongest link in your supply chain'
        );

        const nextIndex =
            nextSectionIndexes.length > 0
                ? Math.min(...nextSectionIndexes)
                : expertIndex > sectionIndex
                    ? expertIndex
                    : blocks.length;

        const text = blocks
            .slice(sectionIndex + 1, nextIndex)
            .filter((block) => block.type === 'paragraph')
            .map((block) => block.text)
            .filter(Boolean);

        const Icon = sectionIcons[index];

        result.sections.push({
            title: sectionTitle,
            text,
            icon: Icon,
        });
    });

    const expertIndex = findBlockContaining(
        'Our experts are the strongest link in your supply chain'
    );

    if (expertIndex >= 0) {
        result.expertHeading = blocks[expertIndex].text;

        result.expertParagraphs = blocks
            .slice(expertIndex + 1)
            .filter((block) => block.type === 'paragraph')
            .map((block) => block.text)
            .filter(Boolean);
    }

    return result;
};

function AutomotiveLogistics() {
    const [content, setContent] = useState(null);

    useEffect(() => {
        let isMounted = true;

        const getAllContent = async () => {
            const response = await contentService.getRootContent();
            const roots = Array.isArray(response.data) ? response.data : [];

            const allContent = [];
            const visited = new Set();

            const collect = async (items) => {
                for (const item of items) {
                    if (!item?.id || visited.has(item.id)) continue;

                    visited.add(item.id);
                    allContent.push(item);

                    try {
                        const childrenResponse = await contentService.getChildren(
                            item.id
                        );

                        const children = Array.isArray(childrenResponse.data)
                            ? childrenResponse.data
                            : [];

                        if (children.length) {
                            await collect(children);
                        }
                    } catch (error) {
                        console.error(
                            `Failed to load children for content ${item.id}:`,
                            error
                        );
                    }
                }
            };

            await collect(roots);

            return allContent;
        };

        const loadContent = async () => {
            try {
                const allContent = await getAllContent();

                const automotiveContent = allContent.find((item) => {
                    const title = item?.title?.trim().toLowerCase() || '';

                    return (
                        title === 'automotive logistics' ||
                        title === 'automotive'
                    );
                });

                if (isMounted) {
                    setContent(automotiveContent || null);
                }
            } catch (error) {
                console.error(
                    'Failed to load Automotive Logistics content:',
                    error
                );

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

    const pageContent = parseAutomotiveContent(content);

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
                                {pageContent.title}
                            </h1>

                            {pageContent.heroSubtitle && (
                                <p className="mt-7 max-w-2xl text-2xl font-medium leading-tight text-sky-400 sm:text-3xl">
                                    {pageContent.heroSubtitle}
                                </p>
                            )}
                        </div>

                        <IndustryHeroVisual industry="automotive" />
                    </div>
                </div>
            </section>

            {/* Service Offerings */}
            <section className="bg-slate-50 py-24 sm:py-28">
                <div className="mx-auto max-w-4xl px-6 lg:px-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                        {pageContent.title}
                    </p>

                    {pageContent.serviceHeading && (
                        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
                            {pageContent.serviceHeading}
                        </h2>
                    )}

                    {pageContent.serviceIntro && (
                        <p className="mt-7 text-lg leading-8 text-slate-600">
                            {pageContent.serviceIntro}
                        </p>
                    )}
                </div>
            </section>

            {/* Specialist Solutions */}
            <section className="py-24 sm:py-32">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                            Our capabilities
                        </p>

                        {pageContent.capabilitiesHeading && (
                            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
                                {pageContent.capabilitiesHeading}
                            </h2>
                        )}
                    </div>

                    <div className="mt-16 space-y-8">
                        {pageContent.sections.map((section, index) => {
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
                                                    <Icon
                                                        size={26}
                                                        strokeWidth={1.8}
                                                    />
                                                </div>

                                                <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">
                                                    Automotive solution
                                                </p>

                                                <h3 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                                                    {section.title}
                                                </h3>
                                            </div>

                                            <div className="mt-10 flex items-center gap-3 text-sm font-medium text-slate-500">
                                                <span className="h-px w-10 bg-sky-400" />
                                                Tailored automotive supply chain support
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        className={`bg-white p-8 sm:p-12 ${reverse ? 'lg:order-1' : ''
                                            }`}
                                    >
                                        <div className="space-y-5 text-base leading-7 text-slate-600">
                                            {section.text.map((paragraph, paragraphIndex) => (
                                                <p
                                                    key={`${section.title}-${paragraphIndex}`}
                                                >
                                                    {paragraph}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Experts */}
            <section className="bg-slate-950 py-24 sm:py-32">
                <div className="mx-auto max-w-5xl px-6 lg:px-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
                        Automotive expertise
                    </p>

                    {pageContent.expertHeading && (
                        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                            {pageContent.expertHeading}
                        </h2>
                    )}

                    {pageContent.expertParagraphs.map((paragraph, index) => (
                        <p
                            key={`expert-paragraph-${index}`}
                            className={`${index === 0 ? 'mt-7' : 'mt-6'
                                } text-lg leading-8 text-white/65`}
                        >
                            {paragraph}
                        </p>
                    ))}

                    <div className="mt-12 flex flex-wrap gap-4">
                        <Link
                            to="/"
                            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
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

export default AutomotiveLogistics;
