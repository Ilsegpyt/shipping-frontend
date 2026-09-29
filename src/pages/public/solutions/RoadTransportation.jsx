import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Check, Globe2, Truck } from 'lucide-react';

function RoadTransportation() {
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
                                Road Transportation
                            </h1>

                            <p className="mt-7 max-w-2xl text-2xl font-medium leading-tight text-sky-400 sm:text-3xl">
                                Local, national and international distances
                            </p>

                            <p className="mt-7 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
                                Whether you have a single shipment, a few
                                pallets or multiple full loads every week, we
                                can handle your cargo and give you the best
                                solution for your road freight needs.
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
                                    Road Transportation
                                </p>

                                <p className="mt-1 text-sm text-white/50">
                                    Flexible road freight solutions
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
                        Road Transportation
                    </p>

                    <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
                        Efficient road freight for every shipment
                    </h2>

                    <p className="mt-8 text-lg leading-8 text-slate-600">
                        With traffic hubs located all over the world, we make
                        sure your cargo is delivered safely and efficiently
                        wherever it needs to go.
                    </p>

                    <div className="mt-12">
                        <h3 className="text-2xl font-semibold tracking-tight text-slate-900">
                            We offer road transport services for:
                        </h3>

                        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {[
                                'Full load shipments',
                                'Part load shipments',
                                'Groupage shipments',
                            ].map((service) => (
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
                        Domestic shipments and shipments to neighbouring
                        countries can be completed within 24-48 hours. For
                        more remote or exotic destinations in Europe we offer
                        delivery within one to five days at all destinations.
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
                                Local knowledge
                            </p>

                            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                                LOCAL KNOWLEDGE AND LOCAL PRESENCE
                            </h2>
                        </div>

                        <p className="text-lg leading-8 text-slate-600">
                            All of our offices are staffed by experienced
                            freight forwarders and sales staff who know your
                            market and local transport conditions. Whether you
                            need one pallet transported or multiple shipments
                            each day, we can make sure you get the transport
                            solution that matches your needs exactly.
                        </p>
                    </div>
                </div>
            </section>

            {/* Control Towers */}
            <section className="bg-slate-950 py-24 text-white sm:py-32">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="max-w-4xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
                            Global setup
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                            CONTROL TOWERS FOR YOUR GLOBAL SETUP
                        </h2>

                        <p className="mt-6 text-lg leading-8 text-slate-300">
                            If you have a global setup and require visibility
                            in your supply chain, we can set up control towers
                            for your company. As one of the leading transport
                            and logistics providers, we help you maintain
                            control so you can benefit from reduced inventory,
                            improved on-time delivery and logistics costs
                            savings. Everything is handled by your single
                            point of contact at our Global Accounts department.
                        </p>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="bg-sky-600 py-20">
                <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 lg:flex-row lg:items-center lg:px-8">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                            Road Transportation
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
