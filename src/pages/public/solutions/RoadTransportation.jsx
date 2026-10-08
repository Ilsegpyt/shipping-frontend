import { useEffect, useState } from 'react';

import { Link } from 'react-router-dom';

import { ArrowLeft, ArrowUpRight, Check, Globe2, Truck } from 'lucide-react';

import contentService from '../../../services/contentService';





const API_BASE_URL = 'http://localhost:5250';



const stripHtml = (html) => {

    if (!html) return '';



    const temp = document.createElement('div');

    temp.innerHTML = html;



    return temp.textContent || temp.innerText || '';

};



const cleanText = (value) => {

    if (value === null || value === undefined) return '';

    return String(value).replace(/\s+/g, ' ').trim();

};



const getContentTypeName = (type) => {

    if (typeof type === 'string') return type;



    switch (type) {

        case 1: return 'Category';

        case 2: return 'Page';

        case 3: return 'Post';

        case 4: return 'Link';

        default: return '';

    }

};



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

                const childrenResponse = await contentService.getChildren(item.id);

                const children = Array.isArray(childrenResponse.data)

                    ? childrenResponse.data

                    : [];



                if (children.length) {

                    await collect(children);

                }

            } catch (error) {

                console.error(`Failed to load children for content ${item.id}:`, error);

            }

        }

    };



    await collect(roots);

    return allContent;

};



const parseRoadTransportationContent = (body) => {

    const empty = {

        subtitle: '',

        heroText: '',

        introTitle: '',

        introText: '',

        servicesTitle: '',

        services: [],

        introClosing: '',

        localTitle: '',

        localText: '',

        controlTitle: '',

        controlText: '',

    };



    if (!body) return empty;



    const temp = document.createElement('div');

    temp.innerHTML = body;



    // Read the CMS body in its original order.

    // Headings can be stored as H1-H4 OR as bold/strong paragraphs.

    const nodes = Array.from(

        temp.querySelectorAll('h1,h2,h3,h4,p,ul,ol')

    );



    const blocks = [];



    for (const node of nodes) {

        const tag = node.tagName.toLowerCase();



        if (tag === 'ul' || tag === 'ol') {

            const items = Array.from(node.querySelectorAll(':scope > li'))

                .map((li) => cleanText(li.textContent))

                .filter(Boolean);



            if (items.length) {

                blocks.push({

                    type: 'list',

                    items,

                });

            }



            continue;

        }



        const text = cleanText(node.textContent);

        if (!text) continue;



        const normalized = text.toLowerCase();

        const semanticHeading =

            normalized === 'road transportation' ||

            normalized.includes('road transport services') ||

            normalized.includes('services for') ||

            normalized.includes('services include') ||

            normalized.includes('local knowledge') ||

            normalized.includes('local presence') ||

            normalized.includes('control towers') ||

            normalized.includes('global setup');



        const isHeading =

            /^h[1-4]$/.test(tag) ||

            Boolean(node.querySelector(':scope > strong, :scope > b')) ||

            semanticHeading;



        blocks.push({

            type: isHeading ? 'heading' : 'paragraph',

            text,

        });

    }



    if (!blocks.length) return empty;



    const isTitle = (text) =>

        text.toLowerCase() === 'road transportation';



    const isServicesHeading = (text) => {

        const value = text.toLowerCase();



        return (

            value.includes('road transport services') ||

            value.includes('services for') ||

            value.includes('services include')

        );

    };



    const isLocalHeading = (text) => {

        const value = text.toLowerCase();



        return (

            value.includes('local knowledge') ||

            value.includes('local presence')

        );

    };



    const isControlHeading = (text) => {

        const value = text.toLowerCase();



        return (

            value.includes('control towers') ||

            value.includes('global setup')

        );

    };



    const titleIndex = blocks.findIndex(

        (block) => block.type === 'heading' && isTitle(block.text)

    );



    // Expected CMS order:

    // Road Transportation

    // subtitle

    // hero paragraph

    // intro paragraph

    // services heading

    // service items

    // closing paragraph

    // local heading + paragraph

    // control heading + paragraph

    const contentStart = titleIndex >= 0 ? titleIndex + 1 : 0;



    const subtitleBlock = blocks[contentStart];

    const heroBlock = blocks[contentStart + 1];



    const servicesIndex = blocks.findIndex(

        (block, index) =>

            index >= contentStart &&

            block.type === 'heading' &&

            isServicesHeading(block.text)

    );



    const localIndex = blocks.findIndex(

        (block, index) =>

            index >= contentStart &&

            block.type === 'heading' &&

            isLocalHeading(block.text)

    );



    const controlIndex = blocks.findIndex(

        (block, index) =>

            index >= contentStart &&

            block.type === 'heading' &&

            isControlHeading(block.text)

    );



    const introTextBlock =

        servicesIndex > contentStart + 1

            ? blocks[servicesIndex - 1]

            : null;



    let services = [];

    let introClosing = '';



    if (servicesIndex >= 0) {

        const nextSectionIndex = [localIndex, controlIndex]

            .filter((index) => index > servicesIndex)

            .sort((a, b) => a - b)[0] ?? blocks.length;



        const betweenServicesAndNext = blocks.slice(

            servicesIndex + 1,

            nextSectionIndex

        );



        for (const block of betweenServicesAndNext) {

            if (block.type === 'list') {

                services.push(...block.items);

            } else if (block.type === 'paragraph') {

                // If the CMS stores service items as normal paragraphs,

                // identify the known service rows separately.

                const text = block.text;



                if (

                    /full load shipments|part load shipments|groupage shipments/i.test(

                        text

                    )

                ) {

                    services.push(text);

                } else if (!introClosing) {

                    introClosing = text;

                }

            }

        }

    }



    // Fallback: if service items are individual paragraphs, collect the

    // three known rows from the entire CMS body.

    if (!services.length) {

        services = blocks

            .filter((block) => block.type === 'paragraph')

            .map((block) => block.text)

            .filter((text) =>

                /^(full load shipments|part load shipments|groupage shipments)$/i.test(

                    text

                )

            );

    }



    const getSectionText = (headingIndex, nextHeadingIndexes) => {

        if (headingIndex < 0) return '';



        const nextIndex =

            nextHeadingIndexes

                .filter((index) => index > headingIndex)

                .sort((a, b) => a - b)[0] ?? blocks.length;



        return blocks

            .slice(headingIndex + 1, nextIndex)

            .filter((block) => block.type === 'paragraph')

            .map((block) => block.text)

            .join(' ');

    };



    return {

        subtitle:

            subtitleBlock?.type === 'paragraph'

                ? subtitleBlock.text

                : '',

        heroText:

            heroBlock?.type === 'paragraph'

                ? heroBlock.text

                : '',

        introTitle:

            titleIndex >= 0

                ? blocks[titleIndex].text

                : '',
        introText:
            blocks[contentStart + 2]?.type === 'paragraph'
                ? blocks[contentStart + 2].text
                : '',
        servicesTitle:
            servicesIndex >= 0
                ? blocks[servicesIndex].text
                : '',

        services,

        introClosing:

            servicesIndex >= 0

                ? (() => {

                    const nextHeadingIndex = [localIndex, controlIndex]

                        .filter((index) => index > servicesIndex)

                        .sort((a, b) => a - b)[0] ?? blocks.length;



                    return blocks

                        .slice(servicesIndex + 1, nextHeadingIndex)

                        .filter(

                            (block) =>

                                block.type === 'paragraph' &&

                                !/^(full load shipments|part load shipments|groupage shipments)$/i.test(

                                    block.text

                                )

                        )

                        .map((block) => block.text)

                        .at(-1) || '';

                })()

                : '',

        localTitle:

            localIndex >= 0

                ? blocks[localIndex].text

                : '',

        localText: getSectionText(

            localIndex,

            [controlIndex]

        ),

        controlTitle:

            controlIndex >= 0

                ? blocks[controlIndex].text

                : '',

        controlText: getSectionText(

            controlIndex,

            []

        ),

    };

};



function RoadTransportation() {

    const [content, setContent] = useState(null);



    useEffect(() => {

        window.scrollTo(0, 0);



        let isMounted = true;



        const loadContent = async () => {

            try {

                const allContent = await getAllContent();



                const page = allContent.find(

                    (item) =>

                        getContentTypeName(item.type) === 'Page' &&

                        item?.title?.trim().toLowerCase() === 'road transportation'

                );



                if (!page) {

                    console.warn('Road Transportation page was not found in CMS.');

                    return;

                }



                const detailsResponse = await contentService.getById(page.id);

                const details = detailsResponse.data || page;



                if (isMounted) {

                    setContent({

                        title: details.title || page.title,

                        ...parseRoadTransportationContent(details.body),

                    });

                }

            } catch (error) {

                console.error('Failed to load Road Transportation content:', error);

            }

        };



        loadContent();



        return () => {

            isMounted = false;

        };

    }, []);



    const title = content?.title || 'Road Transportation';

    const subtitle = content?.subtitle || '';

    const heroText = content?.heroText || '';

    const introTitle = content?.introTitle || '';

    const introText = content?.introText || '';

    const services = content?.services || [];

    const introClosing = content?.introClosing || '';

    const localTitle = content?.localTitle || '';

    const localText = content?.localText || '';

    const controlTitle = content?.controlTitle || '';

    const controlText = content?.controlText || '';



    return (

        <main className="min-h-screen bg-white text-slate-900">

            {/* Hero */}

            <section className="relative overflow-hidden bg-slate-950">

                <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(14,165,233,0.22),transparent_35%)]" />

                <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-sky-500/10 to-transparent" />



                <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-32 lg:px-8 lg:pb-32">

                    <Link

                        to="/solutions"

                        className="mb-12 inline-flex items-center gap-2 text-sm font-medium text-white/70 transition hover:text-white"

                    >

                        <ArrowLeft size={16} />

                        Back to Solutions

                    </Link>



                    <div className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">

                        <div>

                            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-md">

                                <span className="h-2 w-2 rounded-full bg-sky-400" />



                                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/85">

                                    ILS Solutions

                                </span>

                            </div>



                            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">

                                {title}

                            </h1>



                            <p className="mt-7 max-w-2xl text-2xl font-medium leading-tight text-sky-400 sm:text-3xl">

                                {subtitle}

                            </p>



                            <p className="mt-7 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">

                                {heroText}

                            </p>

                        </div>



                        <div className="relative min-h-[430px] overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900 shadow-2xl">

                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(56,189,248,0.18),transparent_30%),radial-gradient(circle_at_75%_70%,rgba(14,165,233,0.14),transparent_32%)]" />



                            <div className="absolute inset-0 opacity-[0.08]">

                                <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white" />

                                <div className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white" />

                                <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white" />

                            </div>



                            <div className="relative flex min-h-[430px] items-center justify-center">

                                <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] border border-sky-400/20 bg-sky-400/10 text-sky-400 shadow-2xl">

                                    <Truck size={52} strokeWidth={1.5} />

                                </div>

                            </div>



                            <div className="absolute bottom-8 left-8 right-8 rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-xl">

                                <p className="text-sm font-semibold text-white">

                                    {title}

                                </p>



                                <p className="mt-1 text-sm text-white/50">

                                    {subtitle}

                                </p>

                            </div>

                        </div>

                    </div>

                </div>

            </section>



            {/* Introduction */}

            <section className="py-24 sm:py-32">

                <div className="mx-auto max-w-5xl px-6 lg:px-8">

                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">

                        {title}

                    </p>



                    <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">

                        {introTitle}

                    </h2>



                    <p className="mt-8 text-lg leading-8 text-slate-600">

                        {introText}

                    </p>



                    <div className="mt-12">

                        <h3 className="text-2xl font-semibold tracking-tight text-slate-900">

                            {content?.servicesTitle || introTitle}

                        </h3>



                        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                            {services.map((service) => (

                                <div

                                    key={service}

                                    className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"

                                >

                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">

                                        <Check size={19} />

                                    </span>



                                    <span className="text-sm font-semibold text-slate-800">

                                        {service}

                                    </span>

                                </div>

                            ))}

                        </div>

                    </div>



                    <p className="mt-10 text-lg leading-8 text-slate-600">

                        {introClosing}

                    </p>

                </div>

            </section>



            {/* Local Knowledge */}

            <section className="bg-slate-50 py-24 sm:py-32">

                <div className="mx-auto max-w-7xl px-6 lg:px-8">

                    <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">

                        <div>

                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm">

                                <Globe2 size={28} strokeWidth={1.7} />

                            </div>



                            <p className="mt-7 text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">

                                {localTitle || 'Local knowledge'}

                            </p>



                            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">

                                {localTitle}

                            </h2>

                        </div>



                        <p className="text-lg leading-8 text-slate-600">

                            {localText}

                        </p>

                    </div>

                </div>

            </section>



            {/* Control Towers */}

            <section className="bg-slate-950 py-24 text-white sm:py-32">

                <div className="mx-auto max-w-7xl px-6 lg:px-8">

                    <div className="max-w-4xl">

                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">

                            {controlTitle || 'Global setup'}

                        </p>



                        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">

                            {controlTitle}

                        </h2>



                        <p className="mt-6 text-lg leading-8 text-slate-300">

                            {controlText}

                        </p>

                    </div>

                </div>

            </section>



            {/* CTA */}

            <section className="bg-sky-600 py-20">

                <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 lg:flex-row lg:items-center lg:px-8">

                    <div>

                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">

                            {title}

                        </p>



                        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">

                            Need a reliable road transportation solution?

                        </h2>

                    </div>



                    <a

                        href="/#contact"

                        className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"

                    >

                        Discuss your requirements

                        <ArrowUpRight size={17} />

                    </a>

                </div>

            </section>

        </main>

    );

}



export default RoadTransportation;
