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

const sections = [
    {
        title: 'Electrification & Mobility Competence Center (EMC2)',
        icon: BatteryCharging,
        text: [
            "ILS’s Electrification and Mobility Competence Center EMC2 Support to create sustainable supply chains using our expertise with future mobility platforms, high energy lithium batteries and dangerous rated automotive goods",
        ],
    },
    {
        title: '3PL & 4PL',
        icon: Boxes,
        text: [
            "3PL & 4PL offerings Includes physical and digital operational control towers powered with ILS’s IT and TMS systems and tools for full track and traceability of your cargo that can be seamlessly integrated into ERP system.",
        ],
    },
    {
        title: 'Finished Vehicle Competency Center (VCC)',
        icon: CarFront,
        text: [
            'ILS provides Finished Vehicle transportation solutions for low volume high value production vehicles, test vehicles, exotics, concept, and show vehicles through our Vehicle Competency Center.',
        ],
    },
    {
        title: 'Automotive afterparts and service operations',
        icon: Wrench,
        text: [
            'A full suite of post part and vehicle manufacturing services including import and export Distribution Centers and dealer services (depending on geography).',
        ],
    },
    {
        title: 'Inbound',
        icon: Factory,
        text: [
            'Inbound to manufacturing planning, transportation, and optimisation.',
        ],
    },
    {
        title: 'Warehousing & value added solutions',
        icon: Warehouse,
        text: [
            'ILS has vast capability and experience in warehousing, value added solutions, packaging, vendor managed inventory, JIT, kitting, sequencing and other line side delivery and assembly services.',
        ],
    },
];

function AutomotiveLogistics() {
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
                                Automotive logistics
                            </h1>

                            <p className="mt-7 max-w-2xl text-2xl font-medium leading-tight text-sky-400 sm:text-3xl">
                                Driving the world’s automotive supply chains for over 30 years
                            </p>
                        </div>

                        <IndustryHeroVisual industry="automotive" />
                    </div>
                </div>
            </section>

            {/* Service Offerings */}
            <section className="bg-slate-50 py-24 sm:py-28">
                <div className="mx-auto max-w-4xl px-6 lg:px-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                        Automotive logistics
                    </p>

                    <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
                        Service offerings the way you need them
                    </h2>

                    <p className="mt-7 text-lg leading-8 text-slate-600">
                        Bespoke, standardised, stand alone or integrated
                    </p>
                </div>
            </section>

            {/* Specialist Solutions */}
            <section className="py-24 sm:py-32">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                            Our capabilities
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
                            Automotive logistics solutions
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
                                            {section.text.map((paragraph) => (
                                                <p key={paragraph}>{paragraph}</p>
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

                    <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                        Our experts are the strongest link in your supply chain
                    </h2>

                    <p className="mt-7 text-lg leading-8 text-white/65">
                        ILS’s Automotive Subject Matter Experts are critical thinkers
                        that can be the differentiator you need to keep the
                        manufacturing process running efficiently and end users’
                        vehicles on the road.
                    </p>

                    <p className="mt-6 text-lg leading-8 text-white/65">
                        Our global team know how the automotive industry gears turn
                        and use their knowledge and experience to design processes
                        and flows that match automotive development and production
                        milestones.
                    </p>

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