import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    ArrowUpRight,
    Boxes,
} from 'lucide-react';

import IndustryHeroVisual from '../../../components/public/IndustryHeroVisual';

const sections = [
    {
        title: 'Planning, execution and monitoring',
        text: [
            'We are a world-leader in energy logistics with expertise in the development and delivery of safe and economic transport solutions for the wind and solar energy industries.',
        ],
    },
    {
        title: 'Air, sea, road or intermodal freight services',
        text: [
            'Our services range from transport of large out of gauge wind turbine components to planning the logistics for an entire solar farm.',
        ],
    },
    {
        title: 'Dedicated heavy-lift engineers',
        text: [
            'Our experts can help you with dedicated heavy-lift engineering for renewable energy logistics.',
        ],
    },
    {
        title: 'Oversize transport and out of gauge installations',
        text: [
            'We provide solutions for oversize transport and out of gauge installations in challenging environments and remote locations.',
        ],
    },
    {
        title: 'Marine and cargo charters',
        text: [
            'Marine and cargo charters, as well as port agency and husbandry services.',
        ],
    },
    {
        title: 'Charter and Emergency Services',
        text: [
            'Charter and Emergency Services covering all global regions and time zones 24/7/365.',
        ],
    },
    {
        title: 'Regulatory compliance and contract bid assistance',
        text: [
            'Expertise in regulatory compliance and contract bid assistance.',
        ],
    },
    {
        title: 'Quality, Health, Safety, Environment',
        text: [
            'Our QHSE quality assurance system is our commitment to supplying the service and quality you require. As well as reducing the risks to people, shipments and surroundings, our investment in QHSE motivates our people to drive improvements and increase productivity.',
        ],
    },
    {
        title: 'For a more sustainable way forward',
        text: [
            'ILS is firmly committed to supporting the transition to greener, more environmentally-friendly practices in transport and logistics. We offer a range of Green Logistics solutions, ranging from CO2 reporting to strategic supply chain optimisation and sustainable fuel offerings. With Green Logistics solutions you can introduce greater sustainability into your operations and reduce the impact of transport and logistics on climate.',
        ],
    },
];

function Energy() {
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
                                Energy
                            </h1>

                            <p className="mt-7 max-w-2xl text-2xl font-medium leading-tight text-sky-400 sm:text-3xl">
                                Renewable energy logistics Solutions for cleaner, greener energy
                            </p>

                            <p className="mt-7 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
                                Renewable energy is vital for diversifying our energy supply and reducing dependence on polluting fossil fuels. We ensure you get innovative, reliable and tailored solutions for your renewable energy transport logistics – no matter how harsh your environment, or how remote your location.
                            </p>
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
                            The experience you need
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
                        The experience you need
                    </h2>

                    <p className="mt-7 text-lg leading-8 text-white/65">
                        We have been involved in the alternative energy industry for more than 20 years. This expertise means we understand the challenges you face and have the renewable energy logistics solutions you need.
                    </p>

                    <p className="mt-6 text-lg leading-8 text-white/65">
                        From source to site, under challenging conditions and across difficult terrains, you can rely on us to understand the unique requirements of each task. With this understanding, we can plan and configure solutions for solar and wind energy transport and logistics that deliver maximum benefits to you.
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