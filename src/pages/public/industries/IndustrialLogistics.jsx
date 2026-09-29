import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    ArrowUpRight,
    Boxes,
} from 'lucide-react';

import IndustryHeroVisual from '../../../components/public/IndustryHeroVisual';

const sections = [
    {
        title: 'Industrial logistics solutions',
        text: [
            'We provide industry-specific solutions to a diverse range of sectors, including food ingredients and raw materials, machinery and components, packaged chemicals, construction, and the wholesale and manufacturing sectors. We operate industrial facilities specially equipped for storing hazardous goods, tyres, food ingredients and odd-sized equipment. Specific services to meet your industrial needs include repackaging, drum filling, hazardous goods labelling and transport management. For a number of our key customers we run in-house operations facilitating production processes for various logistics activities.',
        ],
    },
    {
        title: 'Food ingredients and raw materials',
        text: [
            'Food ingredients can amount to 60% of the total costs for the process industry and raw materials up to 20% of costs for OEMs. The price volatility of these commodities varies depending on conditions. This is why improving supply chain transparency can help you manage this volatility and deliver short-term growth while achieving long-term competitive advantage.',
            'Our global network ensures timely source flows to your production facilities. We can also manage warehousing and distribution activities so goods arrive in perfect condition with your end customers.',
            'Our warehousing and cross-dock facilities are equipped to meet relevant requirements and regulations (such as HACCP, AIB, SQAS, ISO, GMP and GDP) and our IT systems easily meet your requirements for track and trace, batch registration and/or expiry-date monitoring right down to individual item level to ensure the quality of your stock.',
            'All of our processes are optimised to handle the high volumes and peaks in your supply chain.',
        ],
    },
    {
        title: 'Chemicals',
        text: [
            'Transport and logistics for chemicals requires expertise and full understanding of relevant Quality, Health & Safety, and Environment requirements. Our ILS team of chemical logistics experts understands the complex legislative environment in which your chemicals business operates and can deliver the chemical logistics solutions you need.',
            'ILS chemical transport and logistic solutions are fully flexible and designed to meet your needs for efficiency and safety. We offer safe and secure transport of chemicals using air, sea or road using our extensive network of suppliers. All suppliers are experienced in working with chemical shipments and have the required accreditation, licenses and insurance for chemical transportation.',
            'In addition to transport, we offer chemical warehousing facilities, product handling and packaging and on-site logistics services. All facilities comply with applicable safety regulations so you can have peace of mind that your chemicals are handled correctly at all times.',
        ],
    },
    {
        title: 'Machinery and components',
        text: [
            'The commoditisation of machines and components leaves manufacturers with ever thinning margins making it increasingly important to focus on product innovation, leading edge technology, cost containment and creation of high barriers to entry, while outsourcing the actual manufacturing and supply chain management.',
            'We maximise the amount of stock in transit, shifting the focus from warehouse management to supply chain execution. In addition, new concepts surrounding assembly at destination and bonded warehousing have decreased duty and tax exposure on capital intensive goods but have greatly increased the complexity of the supply chain.',
            'Our industrial solutions offer an entire range of services including assembly/disassembly and special packaging / repackaging, warehousing, machine modifications prior to final delivery, freight management and ‘out of stock’ time-sensitive deliveries throughout the world.',
            'Furthermore, our network of bonded warehouses will place you close to your customers, allowing you to better control your business.',
        ],
    },
    {
        title: 'Industrial spare parts logistics',
        text: [
            'Fast and reliable spare parts delivery is key to balancing minimum stock levels and avoiding downtime. Our highly efficient warehousing and distribution service allows late cut-off times with time definite, same-day or next-day deliveries to dealers, distributors or even on site.',
            'We manage numerous regional spare parts distribution centres across the world, and integrate and manage SLAs in the various parts of the spare parts chain.',
            'Importantly, we help you significantly reduce your spare parts inventory levels by increasing visibility through our company-wide WMS and FMS suite.',
        ],
    },
    {
        title: 'Warehouse automation',
        text: [
            'If you work with substantial volumes, warehouse automation can offer significant benefits for your business. We can guide you through the process of analysing your situation, designing a tailor-made solution and implementing the turn-key system, either in your own dedicated facility or in our multi-user warehouse.',
        ],
    },
];

function IndustrialLogistics() {
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
                                Industrial logistics
                            </h1>

                            <p className="mt-7 max-w-2xl text-2xl font-medium leading-tight text-sky-400 sm:text-3xl">
                                Balancing service and cost
                            </p>

                            <p className="mt-7 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
                                Our industrial logistics solutions give you the right balance between quality, cost, flexibility and standardisation. This lets you meet the challenges you face in a dynamic market that is often underpinned by regulatory demands.
                            </p>
                        </div>

                        <IndustryHeroVisual industry="industrial" />
                    </div>
                </div>
            </section>

            {/* Industrial logistics */}
            <section className="py-24 sm:py-32">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                            Our capabilities
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
                            Industrial logistics
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
                        Industrial logistics
                    </h2>

                    <p className="mt-7 text-lg leading-8 text-white/65">
                        Our industrial logistics solutions give you the right balance between quality, cost, flexibility and standardisation.
                    </p>

                    <p className="mt-6 text-lg leading-8 text-white/65">
                        We provide industry-specific solutions across food ingredients and raw materials, machinery and components, packaged chemicals, construction, wholesale and manufacturing.
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

export default IndustrialLogistics;