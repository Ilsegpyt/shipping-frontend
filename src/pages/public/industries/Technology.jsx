import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    ArrowUpRight,
    Boxes,
} from 'lucide-react';

import IndustryHeroVisual from '../../../components/public/IndustryHeroVisual';

const sections = [
    {
        title: 'Computing and enterprise data centres',
        text: [
            'Our solutions give original design manufacturers (ODM) and original equipment manufacturers (OEM) control of the entire supply chain, from contract manufacturer to on-site installation at the end customer.',
            'As equipment manufacturing now takes place in different parts of the world, supply chain management is becoming the core competency, replacing production management.',
            'OEMs are moving beyond disconnected products and services into original solution orchestrators (OSOs), which dramatically increases the need for end-to-end process design, change management, analytics and project management skill sets within high-tech supply chain organisations.',
            'Our data processing and storage solutions give you the necessary visibility and reliability to maintain full end-to-end control.',
        ],
    },
    {
        title: 'Telecommunication and network equipment',
        text: [
            'We provide manufacturers of voice and data infrastructure with agile logistics solutions for component and spare part warehousing and finished product distribution, including complete order fulfilment and postponement. We can also operate your after sales service centres.',
            'Our innovative cross-dock and merge-in-transit solutions are always aligned with your ever changing demands and the stringent quality and safety standards of our TEM and NEP customers.',
            'With our one-stop-shop solution, we unite the dense DS road freight network and TAPA-A regional distribution centres with strategic third party partnerships to offer niche services like in-night delivery services and white glove deliveries.',
            'Given the high value and short life cycles of products coming from telecommunication equipment manufacturers (TEM) and network equipment providers (NEP), our supply chain deliverable is to combine or merge the various providers of commercial, off the shelf components to the telecommunications and network equipment industry into a finished product just before delivery to the end customer.',
        ],
    },
    {
        title: 'Consumer electronics',
        text: [
            'Our supply chain solutions are critically important to your reducing product life cycles. Between 50% and 70% of consumers buy an alternative product or leave a store empty handed when their first product choice is out of stock. This shows how important supply chain efficiency is for brand satisfaction and profit maximisation.',
            'We facilitate new product launches and offer after sales support, while our global network guarantees inbound freight capacity at scheduled lines.',
            'Our specialised TAPA-A Distribution Centres offer you agility and critical economies of scale, and our distribution network ensures timely delivery, whether to a large retail chain’s DC or to a consumer’s home.',
            'Additionally, as part of our commitment to the UN Global Compact initiative, we proactively advise you on carbon footprint reduction.',
        ],
    },
    {
        title: 'Reprographic equipment',
        text: [
            'Supply chains in the reprographic industry are consolidating to Remote Data Capture (RDC) and Electronic Data Capture (EDC) as digitalisation has slashed demand for traditional black-and-white and colour printing in developed markets.',
            'We have a long history serving the printing and copying equipment market and offer you light manufacturing and configuration of finished products, installation services upon delivery, repair/return services and spare part distribution.',
            'Our variable cost base allows easy up and downscaling so you can adapt your supply chains to match changing market conditions.',
        ],
    },
    {
        title: 'Service differentiation and excellence in e-commerce',
        text: [
            'We integrate our IT platform into your e-commerce platform, offering visibility into inventory, order status and track and trace data - and giving you greater channel mobility, increased personalisation and more delivery models.',
            'More than 50% of computers are sold online, and emerging opportunities such as m-commerce (mobiles/smartphones) and s-commerce (social media) are growing fast. Meeting logistics requirements plays an important role in increasing retention rates.',
        ],
    },
    {
        title: 'The back end - Will you tailor storage and picking solutions to meet my needs?',
        text: [
            "Yes, whether you need storage in bulk, on shelves, in racks or in temperature-controlled environments, we will tailor a solution to your needs. You can also choose from a wide variety of picking principles, including 'First Expired, First Out' (FEFO), ‘Last In First Out’ (LIFO) and 'First In, First Out' (FIFO).",
        ],
    },
];

function Technology() {
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
                                Technology
                            </h1>

                            <p className="mt-7 max-w-2xl text-2xl font-medium leading-tight text-sky-400 sm:text-3xl">
                                Integrated logistics solutions for a changing world
                            </p>

                            <p className="mt-7 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
                                Getting your products to market on time can be the difference between success and failure in an environment where product life cycles can be over in a matter of months.
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
                            Technology logistics expertise
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
                        Technology logistics expertise
                    </h2>

                    <p className="mt-7 text-lg leading-8 text-white/65">
                        We've been part of the technology revolution for more than 30 years with supply chain solutions that are innovative, flexible and tailor made for the industry. We cover the entire supply chain from multi-tier fulfilment and merge-in-transit to white glove deliveries and after sales services.
                    </p>

                    <p className="mt-6 text-lg leading-8 text-white/65">
                        Our proven expertise in this disruptive, fast-moving market enables us to work together with you to build solutions that harness our sector-tuned IT systems and provide you with the e-services and near-real-time visibility you need. What’s more our state-of-the-art IT systems can be fully integrated with your systems.
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

export default Technology;