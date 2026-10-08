import { Link } from 'react-router-dom';

import { useEffect, useState } from 'react';

import { ArrowUpRight, Check, Boxes } from 'lucide-react';

import contentService from '../../../services/contentService';

function decodeHtml(value = '') {

    let decoded = value;

    for (let i = 0; i < 3; i += 1) {

        const textarea = document.createElement('textarea');

        textarea.innerHTML = decoded;

        const next = textarea.value;

        if (next === decoded) break;

        decoded = next;

    }

    return decoded;

}

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

            const childrenResponse = await contentService.getChildren(item.id);

            const children = Array.isArray(childrenResponse.data)

                ? childrenResponse.data

                : [];

            if (children.length) await collect(children);

        }

    }

    await collect(roots);

    return allContent;

}

function parseConsolidationsContent(body = '') {
    const html = decodeHtml(body)
        .replaceAll('```html', '')
        .replaceAll('```text', '')
        .replaceAll('```', '')
        .trim();

    const doc = new DOMParser().parseFromString(html, 'text/html');

    const clean = (value = '') =>
        value
            .replace(/\\u00a0/g, ' ')
            .replace(/\\s+/g, ' ')
            .trim();

    const blocks = Array.from(
        doc.body.querySelectorAll('h1,h2,h3,h4,p,li')
    )
        .map((node) => clean(node.textContent || ''))
        .filter(Boolean);

    const normalized = (value = '') => clean(value).toLowerCase();

    const titleBlock =
        blocks.find((value) =>
            normalized(value).startsWith('consolidations -')
        ) || '';

    let title = 'Consolidations';
    let subtitle = "When it's urgent and you need something delivered fast";

    if (titleBlock.includes(' - ')) {
        const parts = titleBlock.split(' - ');
        title = parts[0].trim();
        subtitle = parts.slice(1).join(' - ').trim();
    }

    const introTitleIndex = blocks.findIndex((value) =>
        normalized(value).includes('ils - the professionals in lcl')
    );

    const servicesTitleIndex = blocks.findIndex((value) =>
        normalized(value).includes('lcl services include')
    );

    const introTitle =
        introTitleIndex >= 0
            ? blocks[introTitleIndex]
            : 'ILS - The Professionals in LCL';

    const introParagraphs =
        introTitleIndex >= 0 && servicesTitleIndex > introTitleIndex
            ? blocks.slice(introTitleIndex + 1, servicesTitleIndex)
            : [];

    const services =
        servicesTitleIndex >= 0
            ? blocks
                .slice(servicesTitleIndex + 1)
                .filter(
                    (value) =>
                        !normalized(value).includes('need a fast and reliable')
                )
            : [];

    return {
        title,
        subtitle,

        miniLabel: 'LCL Consolidation',
        miniDescription:
            'Efficient groupage solutions connecting global destinations.',

        introLabel: 'Consolidations',
        introTitle,
        introParagraphs,

        servicesLabel: 'Our services',
        servicesTitle:
            servicesTitleIndex >= 0
                ? blocks[servicesTitleIndex]
                : 'LCL SERVICES INCLUDE:',
        services,

        ctaLabel: 'Consolidations',
        ctaTitle: 'Need a fast and reliable consolidation solution?',
        ctaButton: 'Discuss your requirements',
    };
}

function Consolidations() {

    const [content, setContent] = useState(null);

    const [loading, setLoading] = useState(true);

    useEffect(() => {

        window.scrollTo(0, 0);

        let isMounted = true;

        const loadContent = async () => {

            try {

                const allContent = await getAllContent();

                const page = allContent.find(

                    (item) =>

                        item?.title?.trim().toLowerCase() ===

                        'consolidations'

                );

                if (!page) {

                    throw new Error(

                        'Consolidations page was not found in CMS.'

                    );

                }

                const detailsResponse = await contentService.getById(page.id);

                const details = detailsResponse.data || page;

                const parsed = parseConsolidationsContent(

                    details.body || ''

                );

                if (isMounted) {

                    setContent(parsed);

                }

            } catch (error) {

                console.error(

                    'Failed to load Consolidations content:',

                    error

                );

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

    if (loading) {

        return (

            <main className="min-h-screen bg-white text-slate-900">

                <div className="flex min-h-screen items-center justify-center">

                    <div className="text-sm font-medium text-slate-500">

                        Loading...

                    </div>

                </div>

            </main>

        );

    }

    const cms = content || {};

    return (

        <main className="min-h-screen bg-white text-slate-900">

            {/* Hero */}

            <section className="relative overflow-hidden bg-slate-950">

                <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%\_35%,rgba(14,165,233,0.22),transparent_35%)]" />

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

                                    {cms.title}

                                </span>

                            </div>

                            <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">

                                {cms.title?.toUpperCase()}

                            </h1>

                            <p className="mt-7 max-w-3xl text-xl leading-8 text-white/70 sm:text-2xl">

                                {cms.subtitle}

                            </p>

                        </div>

                        <div className="relative hidden h-[360px] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] lg:flex">

                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%\_50%,rgba(14,165,233,0.16),transparent_55%)]" />

                            <div className="absolute left-1/2 top-1/2 flex h-48 w-48 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-sky-400/20">

                                <div className="absolute h-32 w-32 rounded-full border border-sky-400/20" />

                                <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-sky-400/20 bg-sky-400/10">

                                    <Boxes

                                        size={46}

                                        strokeWidth={1.4}

                                        className="text-sky-400"

                                    />

                                </div>

                            </div>

                            <div className="absolute bottom-8 left-8">

                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">

                                    {cms.miniLabel}

                                </p>

                                <p className="mt-2 max-w-xs text-sm leading-6 text-white/50">

                                    {cms.miniDescription}

                                </p>

                            </div>

                        </div>

                    </div>

                </div>

            </section>

            {/* Introduction */}

            <section className="py-24 sm:py-28">

                <div className="mx-auto max-w-7xl px-6 lg:px-8">

                    <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">

                        <div>

                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">

                                <Boxes size={28} strokeWidth={1.7} />

                            </div>

                            <p className="mt-7 text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">

                                {cms.introLabel}

                            </p>

                            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl">

                                {cms.introTitle}

                            </h2>

                        </div>

                        <div className="space-y-6 text-base leading-8 text-slate-600 sm:text-lg">

                            {(cms.introParagraphs || []).map((paragraph, index) => (

                                <p key={`${index}-${paragraph.slice(0, 20)}`}>

                                    {paragraph}

                                </p>

                            ))}

                        </div>

                    </div>

                </div>

            </section>

            {/* LCL Services */}

            <section className="bg-slate-50 py-24 sm:py-28">

                <div className="mx-auto max-w-7xl px-6 lg:px-8">

                    <div className="max-w-3xl">

                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">

                            {cms.servicesLabel}

                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">

                            {cms.servicesTitle}

                        </h2>

                    </div>

                    <div className="mt-12 grid gap-4 sm:grid-cols-2">

                        {(cms.services || []).map((service, index) => (

                            <div

                                key={`${index}-${service}`}

                                className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"

                            >

                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">

                                    <Check size={19} />

                                </span>

                                <span className="text-sm font-semibold leading-6 text-slate-800">

                                    {service}

                                </span>

                            </div>

                        ))}

                    </div>

                </div>

            </section>

            {/* CTA */}

            <section className="bg-sky-600 py-20">

                <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 lg:flex-row lg:items-center lg:px-8">

                    <div>

                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">

                            {cms.ctaLabel}

                        </p>

                        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">

                            {cms.ctaTitle}

                        </h2>

                    </div>

                    <a

                        href="/#contact"

                        className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"

                    >

                        {cms.ctaButton}

                        <ArrowUpRight size={17} />

                    </a>

                </div>

            </section>

        </main>

    );

}

export default Consolidations;