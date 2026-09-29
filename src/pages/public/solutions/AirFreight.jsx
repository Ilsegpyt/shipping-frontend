import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import {
    ArrowLeft,
    ArrowUpRight,
    Boxes,
    FileCheck2,
    Globe2,
    Plane,
} from 'lucide-react';

const sections = [
    {
        title: 'Delivery to your doorstep',
        icon: Globe2,
        text: [
            "As a global air freight forwarder, our network stretches around the world keeping your cargo within the ILS network throughout its journey from door-to-door.",
        ],
    },
    {
        title: 'No matter the size, type and frequency of your cargo',
        icon: Boxes,
        text: [
            'ILS have a service that fits your needs. Our air freight services include:',
        ],
        list: [
            'Full charter air freight',
            'Part charter air freight',
            'On-board courier',
            'Consolidation',
            'Back-to-back',
            'ILS Express - our courier service',
        ],
    },
    {
        title: 'Air freight compliance and documentation support',
        icon: FileCheck2,
        text: [
            "ILS's air freight team is always up to date with the latest requirements in air freight compliance. With first-hand knowledge of local conditions, rules and regulations, ILS can handle all administrative and documentation procedures and ensure the smooth handling of your air cargo – wherever in the world it may be. This includes customs clearance, security, license requirements and compliance with other local regulations.",
        ],
    },
    {
        title: 'Air freight carriers',
        icon: Plane,
        text: [
            'For your air freight cargo to arrive safely, on time and on budget, ILS use an array of reliable airlines and air freight carriers. They have the expertise and capacity to handle your shipments so you can enjoy complete flexibility to send your cargo wherever and whenever you need.',
        ],
    },
];

function AirFreight() {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

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
                                Air Freight
                            </h1>

                            <p className="mt-7 max-w-2xl text-2xl font-medium leading-tight text-sky-400 sm:text-3xl">
                                When you need it fast, you need air freight
                            </p>

                            <p className="mt-7 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
                                With daily worldwide departures, you can rely on ILS's air freight services
                            </p>
                        </div>

                        <div className="relative min-h-[430px] overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900 shadow-2xl">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(56,189,248,0.18),transparent_30%),radial-gradient(circle_at_75%_70%,rgba(14,165,233,0.14),transparent_32%)]" />

                            <div className="absolute inset-0 opacity-[0.08]">
                                <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white" />
                                <div className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white" />
                            </div>

                            <div className="relative flex min-h-[430px] items-center justify-center">
                                <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] border border-sky-400/20 bg-sky-400/10 text-sky-400 shadow-2xl">
                                    <Plane size={52} strokeWidth={1.5} />
                                </div>
                            </div>

                            <div className="absolute bottom-8 left-8 right-8 rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
                                <p className="text-sm font-semibold text-white">
                                    Air Freight
                                </p>

                                <p className="mt-1 text-sm text-white/50">
                                    Fast and reliable global air freight solutions
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
                        Air Freight
                    </p>

                    <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
                        Reliable air freight for every type of cargo
                    </h2>

                    <p className="mt-8 text-lg leading-8 text-slate-600">
                        ILS's air freight services are a reliable option for air
                        freight of all sizes and types. Whether you’re shipping
                        perishables, hazardous cargo or any commodity that needs
                        fast delivery, ILS can provide the solution that meets
                        your needs.
                    </p>
                </div>
            </section>

            {/* Services */}
            <section className="bg-slate-50 py-24 sm:py-32">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="space-y-8">
                        {sections.map((section, index) => {
                            const Icon = section.icon;

                            return (
                                <article
                                    key={section.title}
                                    className="grid overflow-hidden rounded-[2rem] border border-slate-200 bg-white lg:grid-cols-2"
                                >
                                    <div
                                        className={`min-h-[320px] bg-gradient-to-br from-sky-100 via-white to-slate-100 p-8 sm:p-12 ${index % 2
                                            ? 'lg:order-2'
                                            : ''
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
                                                    Air freight service
                                                </p>

                                                <h3 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                                                    {section.title}
                                                </h3>
                                            </div>

                                            <div className="mt-10 flex items-center gap-3 text-sm font-medium text-slate-500">
                                                <span className="h-px w-10 bg-sky-400" />
                                                Tailored air freight support
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        className={`bg-white p-8 sm:p-12 ${index % 2
                                            ? 'lg:order-1'
                                            : ''
                                            }`}
                                    >
                                        <div className="space-y-5 text-base leading-7 text-slate-600">
                                            {section.text.map((paragraph) => (
                                                <p key={paragraph}>
                                                    {paragraph}
                                                </p>
                                            ))}

                                            {section.list && (
                                                <ul className="space-y-3 pt-2">
                                                    {section.list.map((item) => (
                                                        <li
                                                            key={item}
                                                            className="flex items-start gap-3"
                                                        >
                                                            <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                                                            <span>{item}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="bg-slate-950 py-24 sm:py-32">
                <div className="mx-auto max-w-5xl px-6 text-center lg:px-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
                        ILS Solutions
                    </p>

                    <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                        Need a fast and reliable air freight solution?
                    </h2>

                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/60">
                        Let ILS help you move your cargo efficiently across
                        the supply chain.
                    </p>

                    <div className="mt-10 flex flex-wrap justify-center gap-4">
                        <Link
                            to="/solutions"
                            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                        >
                            Back to Solutions
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

export default AirFreight;