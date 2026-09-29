import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    ArrowUpRight,
    Boxes,
} from 'lucide-react';

import IndustryHeroVisual from '../../../components/public/IndustryHeroVisual';

const sections = [
    {
        title: 'What does ILS offer the consumer, retailers and the fashion industry as a retail logistics provider?',
        text: [
            'Our integrated services and technological capabilities help you to be more productive and efficient with agile supply chain solutions that are fully tailored to your requirements and expectations, and those of your customers.',
        ],
    },
    {
        title: "How can you meet my customers' different needs?",
        text: [
            'Our best-in-class supply chain solutions provide a full range of superior services, including order management, lead logistics solutions, and contract logistics solutions, such as fiscal representation, customs support and a wide variety of value-added services. Whatever your requirements, we can tailor the exact solution you need.',
        ],
    },
    {
        title: 'Can you integrate your technology with mine?',
        text: [
            'We can integrate our IT systems with your end-to-end order fulfilment systems providing order, item and SKU level visibility. We also offer integration of your e-commerce platform and the systems of your main freight forwarders to provide your customers with real-time inventory data, order status details and track and trace information. Learn more about ils Connectivity.',
        ],
    },
    {
        title: 'Consumer goods',
        text: [
            'Global sourcing and production with strict on-time deliveries require a global network able to be agile and act fast on the needs of FMCG companies. No matter if it is visibility and optimisation of global air or ocean freight or urgent need of warehouse space and solutions, we are ready to innovate and execute.',
        ],
    },
    {
        title: 'Sports and leisure',
        text: [
            'Winning is everything, and our operations deliver consistent performance all year round. Our value-added services range from sophisticated Lead Logistics and 4PL solutions to order management and flow optimisation. Our contract logistics solutions include quality inspection, price tagging, packaging up to your specific product assemblies, and kitting to provide that extra edge to get your sports and leisure wear over the line first.',
        ],
    },
    {
        title: 'Consumer electronics',
        text: [
            'We know being out of stock can mean out of a sale. Our supply chain is geared to making sure a customer leaves with the product he or she wants. New product launches, reverse logistics and timely deliveries are our stock in trade. Our extensive global network ensures inbound freight capacity is delivered at scheduled times, and the economies of scale offered by our TAPA-A distribution centres minimise the logistics burden on your margins.',
        ],
    },
    {
        title: 'Home improvement / DIY',
        text: [
            'The home improvement and DIY markets are growing in developing markets, and our global network can get your products into homes in the most out-of-the-way places. And we deliver the quality and flexibility retailers want. Our services include packaging or re-packaging, palletising or re-palletising, labelling or re-labelling and kitting. We manage waste, returns, stock levels and co-packing programmes.',
        ],
    },
    {
        title: 'Fashion',
        text: [
            '"In with the new and out with the old" sums up today\'s world of fast fashion. Ever-shorter product life cycles, the lure of global brands, the rise of social media and multiple distribution channels demand a market-responsive and agile supply chain solution for the fashion industry. Our end-to-end order management services combined with effective consolidation of shipments allow on-time delivery without compromising cost. We support coordination of your suppliers stretching from vendor management programs to running efficient and effective distribution centres on your behalf, so your supply chain creates the required competitive advantage.',
        ],
    },
    {
        title: 'Personal care',
        text: [
            'Our green and sustainable principles are embedded in the way we work and our supply chain mirrors your commitment as manufacturers of personal care products to sustainable sourcing, production and packaging.',
        ],
    },
    {
        title: 'Luxury goods and high fashion',
        text: [
            'We combine origin logistics, close to sourcing and act as your white glove agent on an end-to-end basis for luxury goods and supply chains. Combining effective origin logistics with destination logistics allows visibility throughout the supply chain and fast replenishment in major consumption areas.',
        ],
    },
];

function RetailLogistics() {
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
                                Retail logistics
                            </h1>

                            <p className="mt-7 max-w-2xl text-2xl font-medium leading-tight text-sky-400 sm:text-3xl">
                                Our agile solutions connect e-commerce and physical retail delivering transparency on a global scale
                            </p>

                            <p className="mt-7 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
                                Order management, multichannel fulfilment, white glove delivery and reverse logistics – we offer many retail shipping, transport and logistics solutions tailored for the retail industry.
                            </p>
                        </div>

                        <IndustryHeroVisual industry="retail" />
                    </div>
                </div>
            </section>

            {/* Retail logistics services */}
            <section className="py-24 sm:py-32">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                            Our capabilities
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
                            Retail logistics services
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
                        Retail logistics services
                    </h2>

                    <p className="mt-7 text-lg leading-8 text-white/65">
                        Our agile solutions connect e-commerce and physical retail delivering transparency on a global scale.
                    </p>

                    <p className="mt-6 text-lg leading-8 text-white/65">
                        Logistics for the retailing and fashion industries need to be highly flexible as rapid growth and exponential change are the standard, not the exception. Managing logistics in fashion markets requires supply chains that are increasingly reactive with technology that can help teams make decisions on urgent demand. Goods that sell steadily throughout the year need different models of supply chain than seasonal items with short shelf lives.
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

export default RetailLogistics;