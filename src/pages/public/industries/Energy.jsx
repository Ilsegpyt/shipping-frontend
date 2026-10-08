import { useEffect, useState } from 'react';

import { Link } from 'react-router-dom';



import {



    ArrowLeft,



    ArrowUpRight,



    Boxes,



} from 'lucide-react';







import IndustryHeroVisual from '../../../components/public/IndustryHeroVisual';

import contentService from '../../../services/contentService';









const parseEnergyContent = (content) => {

    const result = {

        title: content?.title || '',

        heroSubtitle: '',

        heroDescription: '',

        capabilitiesLabel: 'Our capabilities',

        capabilitiesHeading: '',

        sections: [],

        expertiseLabel: 'Industry expertise',

        expertiseHeading: '',

        expertiseParagraphs: [],

    };



    if (!content?.body) {

        return result;

    }



    const decodeHtml = (value) => {

        const textarea = document.createElement('textarea');

        textarea.innerHTML = value;

        return textarea.value;

    };



    const body = decodeHtml(String(content.body))

        .replace(/\r\n/g, '\n')

        .replace(/\\n/g, '\n')

        .trim();



    const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(body);



    const blocks = [];



    if (looksLikeHtml) {

        const doc = new DOMParser().parseFromString(body, 'text/html');



        Array.from(

            doc.body.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li')

        ).forEach((node) => {

            const value = node.textContent?.replace(/\s+/g, ' ').trim();



            if (!value) {

                return;

            }



            if (/^H[1-6]$/.test(node.tagName)) {

                blocks.push({

                    type: 'heading',

                    level: Number(node.tagName.substring(1)),

                    text: value,

                });

                return;

            }



            if (node.tagName === 'LI') {

                blocks.push({

                    type: 'bullet',

                    text: value,

                });

                return;

            }



            const children = Array.from(node.children);

            const isBoldHeading =

                children.length > 0 &&

                children.every((child) =>

                    ['STRONG', 'B', 'EM'].includes(child.tagName)

                );



            if (isBoldHeading) {

                blocks.push({

                    type: 'heading',

                    level: 3,

                    text: value,

                });

                return;

            }



            blocks.push({

                type: 'paragraph',

                text: value,

            });

        });

    } else {

        const lines = body.split('\n');

        let paragraphBuffer = [];



        const flushParagraph = () => {

            if (!paragraphBuffer.length) {

                return;

            }



            const value = paragraphBuffer

                .join(' ')

                .replace(/\s+/g, ' ')

                .trim();



            if (value) {

                blocks.push({

                    type: 'paragraph',

                    text: value,

                });

            }



            paragraphBuffer = [];

        };



        for (const rawLine of lines) {

            const line = rawLine.trim();



            if (!line) {

                flushParagraph();

                continue;

            }



            const markdownHeading = line.match(/^#{1,6}\s+(.+)$/);



            if (markdownHeading) {

                flushParagraph();



                blocks.push({

                    type: 'heading',

                    level: markdownHeading[0].match(/^#+/)[0].length,

                    text: markdownHeading[1].trim(),

                });



                continue;

            }



            const boldHeading = line.match(/^\*\*(.+?)\*\*$/);



            if (boldHeading) {

                flushParagraph();



                blocks.push({

                    type: 'heading',

                    level: 3,

                    text: boldHeading[1].trim(),

                });



                continue;

            }



            const bullet = line.match(/^(?:[-\*•])\s+(.+)$/);



            if (bullet) {

                flushParagraph();



                blocks.push({

                    type: 'bullet',

                    text: bullet[1].trim(),

                });



                continue;

            }



            paragraphBuffer.push(

                line

                    .replace(/\*\*(.+?)\*\*/g, '$1')

                    .trim()

            );

        }



        flushParagraph();

    }



    const clean = (value) =>

        String(value || '')

            .replace(/\s+/g, ' ')

            .trim();



    const title = clean(content.title);



    // Remove a duplicated CMS title if RichText starts with the page title.

    let contentBlocks = [...blocks];



    if (

        contentBlocks[0]?.type === 'heading' &&

        clean(contentBlocks[0].text).toLowerCase() === title.toLowerCase()

    ) {

        contentBlocks.shift();

    }



    result.title = title || clean(contentBlocks[0]?.text);



    // The first two plain paragraphs belong to the original Hero:

    // 1) subtitle, 2) description. Nothing else is rendered in the Hero.

    const firstHeadingIndex = contentBlocks.findIndex(

        (block) => block.type === 'heading'

    );



    const beforeFirstHeading =

        firstHeadingIndex >= 0

            ? contentBlocks.slice(0, firstHeadingIndex)

            : contentBlocks;



    const beforeFirstHeadingParagraphs = beforeFirstHeading

        .filter((block) => block.type === 'paragraph')

        .map((block) => block.text);



    result.heroSubtitle = beforeFirstHeadingParagraphs[0] || '';

    result.heroDescription = beforeFirstHeadingParagraphs[1] || '';



    // Everything after the Hero's first two paragraphs remains in the

    // capabilities/expertise flow. This prevents capability text from being

    // repeated inside the Hero.

    const capabilityStartIndex = Math.min(

        2,

        beforeFirstHeading.length

    );



    const preHeadingContent =

        beforeFirstHeading.slice(capabilityStartIndex);



    const sectionBlocks = [

        ...preHeadingContent,

        ...(firstHeadingIndex >= 0

            ? contentBlocks.slice(firstHeadingIndex)

            : []),

    ];



    const expertiseIndex = sectionBlocks.findIndex(

        (block) =>

            block.type === 'heading' &&

            /experience you need|industry expertise|expertise/i.test(block.text)

    );



    const capabilityBlocks =

        expertiseIndex >= 0

            ? sectionBlocks.slice(0, expertiseIndex)

            : sectionBlocks;



    // Build capability cards from RichText headings.

    let currentSection = null;



    for (const block of capabilityBlocks) {

        if (block.type === 'heading') {

            if (currentSection && currentSection.text.length) {

                result.sections.push(currentSection);

            }



            currentSection = {

                title: block.text,

                text: [],

            };



            continue;

        }



        if (block.type === 'paragraph' || block.type === 'bullet') {

            // If RichText contains a bullet list without headings, use each

            // bullet as its own CMS-driven card title instead of dropping it.

            if (!currentSection && block.type === 'bullet') {

                result.sections.push({

                    title: block.text,

                    text: [],

                });

                continue;

            }



            if (currentSection) {

                currentSection.text.push(block.text);

            }

        }

    }



    if (currentSection && currentSection.text.length) {

        result.sections.push(currentSection);

    }



    // Expertise section is rendered separately.

    if (expertiseIndex >= 0) {

        const expertiseBlocks = sectionBlocks.slice(expertiseIndex);

        const headingIndex = expertiseBlocks.findIndex(

            (block) => block.type === 'heading'

        );



        result.expertiseHeading =

            expertiseBlocks[headingIndex]?.text || '';



        for (let i = headingIndex + 1; i < expertiseBlocks.length; i += 1) {

            const block = expertiseBlocks[i];



            if (block.type === 'heading') {

                // Any later RichText heading is a capability section, not

                // expertise prose. Preserve it as a card.

                const extraSection = {

                    title: block.text,

                    text: [],

                };



                for (let j = i + 1; j < expertiseBlocks.length; j += 1) {

                    const next = expertiseBlocks[j];



                    if (next.type === 'heading') {

                        break;

                    }



                    if (next.type === 'paragraph' || next.type === 'bullet') {

                        extraSection.text.push(next.text);

                    }

                }



                if (extraSection.text.length) {

                    result.sections.push(extraSection);

                }



                continue;

            }



            if (block.type === 'paragraph' || block.type === 'bullet') {

                result.expertiseParagraphs.push(block.text);

            }

        }

    }



    // If no explicit expertise heading exists, keep all remaining prose.

    if (!result.expertiseHeading) {

        result.expertiseHeading = 'The experience you need';

    }



    return result;

};



async function getAllContent() {

    const response = await contentService.getRootContent();

    const roots = Array.isArray(response.data) ? response.data : [];



    const allContent = [];

    const visited = new Set();



    async function collect(items) {

        for (const item of items) {

            if (!item?.id || visited.has(item.id)) {

                continue;

            }



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



function Energy() {





    const [energyContent, setEnergyContent] = useState(null);



    useEffect(() => {

        let isMounted = true;



        const loadContent = async () => {

            try {

                const allContent = await getAllContent();



                const energy = allContent.find((item) => {

                    const title = item?.title?.trim().toLowerCase() || '';



                    return (

                        title === 'energy' ||

                        title === 'energy logistics' ||

                        title.startsWith('energy -') ||

                        title.startsWith('energy logistics -')

                    );

                });



                if (isMounted) {

                    setEnergyContent(

                        energy ? parseEnergyContent(energy) : null

                    );

                }

            } catch (error) {

                console.error('Failed to load Energy content:', error);



                if (isMounted) {

                    setEnergyContent(null);

                }

            }

        };



        loadContent();



        return () => {

            isMounted = false;

        };

    }, []);



    const content = energyContent || {

        title: 'Energy',

        heroSubtitle: '',

        heroDescription: '',

        capabilitiesLabel: 'Our capabilities',

        capabilitiesHeading: 'The experience you need',

        sections: [],

        expertiseLabel: 'Industry expertise',

        expertiseHeading: 'The experience you need',

        expertiseParagraphs: [],

    };



    return (



        <main className="min-h-screen bg-white text-slate-900">



            {/* Hero */}



            <section className="relative overflow-hidden bg-slate-950">



                <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%\\\_35%,rgba(14,165,233,0.22),transparent_35%)]" />







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



                                {content.title}



                            </h1>







                            <p className="mt-7 max-w-2xl text-2xl font-medium leading-tight text-sky-400 sm:text-3xl">



                                {content.heroSubtitle}



                            </p>







                            <div className="mt-7 max-w-2xl space-y-4 text-base leading-7 text-white/70 sm:text-lg">

                                {content.heroDescription

                                    .split(/\n\n+/)

                                    .filter(Boolean)

                                    .map((paragraph, index) => (

                                        <p key={`hero-description-${index}`}>

                                            {paragraph}

                                        </p>

                                    ))}

                            </div>



                        </div>







                        <IndustryHeroVisual industry="energy" />



                    </div>



                </div>



            </section>







            {/* Capabilities */}



            <section className="py-24 sm:py-32">



                <div className="mx-auto max-w-7xl px-6 lg:px-8">



                    <div className="max-w-3xl">



                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">



                            Our capabilities



                        </p>







                        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">



                            {content.capabilitiesHeading}



                        </h2>



                    </div>







                    <div className="mt-16 space-y-8">



                        {content.sections.filter((section) => section.title && section.text.length > 0).map((section, index) => (



                            <article



                                key={section.title}



                                className="grid overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 lg:grid-cols-2"



                            >



                                <div



                                    className={`min-h-[320px] bg-gradient-to-br from-sky-100 via-white to-slate-100 p-8 sm:p-12 ${/quality,? health, safety, environment|for a more sustainable way forward/i.test(section.title)

                                        ? 'lg:order-1' : (index % 2 ? 'lg:order-2' : '')

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



                                    className={`bg-white p-8 sm:p-12 ${/quality,? health, safety, environment|for a more sustainable way forward/i.test(section.title)

                                        ? 'lg:order-2' : (index % 2 ? 'lg:order-1' : '')

                                        }`}



                                >



                                    <div className="space-y-5 text-base leading-7 text-slate-600">



                                        {section.text.map((paragraph) => (



                                            <p key={paragraph}>{paragraph}</p>



                                        ))}



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



                        {content.expertiseHeading}



                    </h2>







                    <p className="mt-7 text-lg leading-8 text-white/65">



                        {content.expertiseParagraphs[0]}



                    </p>







                    <p className="mt-6 text-lg leading-8 text-white/65">



                        {content.expertiseParagraphs[1]}



                    </p>







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







export default Energy;
