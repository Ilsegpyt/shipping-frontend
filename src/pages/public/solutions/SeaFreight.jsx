import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { Anchor, ArrowUpRight, Check, Ship } from 'lucide-react';

function SeaFreight() {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <main className="min-h-screen bg-white text-slate-900">

            {/* Hero */}
            <section className="relative overflow-hidden bg-slate-950">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(14,165,233,0.22),transparent_35%)]" />
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
                                    Sea Freight
                                </span>
                            </div>

                            <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
                                SEA FREIGHT
                            </h1>

                            <p className="mt-7 max-w-3xl text-xl leading-8 text-white/70 sm:text-2xl">
                                When cost matters and time is not an issue
                            </p>
                        </div>

                        <div className="relative hidden h-[360px] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] lg:flex">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(14,165,233,0.16),transparent_55%)]" />

                            <div className="absolute left-1/2 top-1/2 flex h-48 w-48 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-sky-400/20">
                                <div className="absolute h-32 w-32 rounded-full border border-sky-400/20" />

                                <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-sky-400/20 bg-sky-400/10">
                                    <Ship
                                        size={46}
                                        strokeWidth={1.4}
                                        className="text-sky-400"
                                    />
                                </div>
                            </div>

                            <div className="absolute bottom-8 left-8">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
                                    Global Sea Freight
                                </p>

                                <p className="mt-2 max-w-xs text-sm leading-6 text-white/50">
                                    Reliable capacity and flexible solutions across major ports worldwide.
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
                                <Anchor size={28} strokeWidth={1.7} />
                            </div>

                            <p className="mt-7 text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                                Sea Freight
                            </p>

                            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl">
                                ILS's SEA FREIGHT SERVICES SUPPORT YOUR NEEDS FOR OPTIMIZED, SECURE AND FLEXIBLE SOLUTIONS
                            </h2>
                        </div>

                        <div className="text-base leading-8 text-slate-600 sm:text-lg">
                            <p>
                                With the enormous volumes of freight that we
                                ship and the multitude of carriers we work with,
                                we can offer you frequent departures and the
                                capacity you need – to and from every major port
                                in the world. Whether your needs are complex or
                                straightforward and whatever your goods, we can
                                help you with you with end-to-end solutions
                                across transport modes whether it be by sea,
                                air, road, or rail.
                            </p>
                        </div>

                    </div>
                </div>
            </section>

            {/* Local Knowledge */}
            <section className="bg-slate-50 py-24 sm:py-28">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="max-w-3xl">

                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                            Local knowledge of local conditions
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                            LOCAL KNOWLEDGE OF LOCAL CONDITIONS
                        </h2>

                        <p className="mt-6 text-base leading-8 text-slate-600 sm:text-lg">
                            In every major port, we have experienced employees
                            with detailed knowledge of local and international
                            export and import compliance. Our staff can assist
                            you in understanding each country’s requirements,
                            as well as local pickup and last mile delivery. And
                            if you need logistics support or warehouse
                            management for your supply chain, we can handle
                            that too.
                        </p>

                    </div>
                </div>
            </section>

            {/* Services */}
            <section className="py-24 sm:py-28">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">

                    <div className="max-w-3xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                            Our services
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                            OUR SEA FREIGHT SERVICES INCLUDE:
                        </h2>
                    </div>

                    <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {[
                            'Full container load',
                            'Less than container load',
                            'Non-containerized load',
                            "Buyer's consolidation services",
                            'Break bulk',
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
            </section>

            {/* Compliance */}
            <section className="bg-slate-950 py-24 text-white sm:py-28">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">

                    <div className="max-w-4xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
                            Compliance
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                            SEA FREIGHT COMPLIANCE
                        </h2>

                        <p className="mt-6 text-base leading-8 text-slate-300 sm:text-lg">
                            Moving cargo from A to B across the world's seas
                            can be challenging. Transport documents,
                            regulations, country-specific compliance, local
                            requirements and customs clearance are just some
                            of the steps to be considered before your cargo can
                            be dispatched to its final destination. Proper
                            export documentation and import licenses and
                            requirements are becoming increasingly important
                            factors when transporting cargo. With years of
                            experience in cargo shipment, our staff can support
                            you in delivering your sea freight in full
                            compliance with all requirements.
                        </p>
                    </div>

                </div>
            </section>

            {/* Trusted Carriers */}
            <section className="py-24 sm:py-28">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">

                    <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">

                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                                Global carrier network
                            </p>

                            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                                A NETWORK OF TRUSTED SEA FREIGHT CARRIERS
                            </h2>
                        </div>

                        <p className="text-base leading-8 text-slate-600 sm:text-lg">
                            When you need the price advantage of sea freight,
                            our agreements with all the major global and
                            regional sea freight carriers will mean we can get
                            you the best competitive combination of routing,
                            carrier, price and departure and arrival times to
                            suit your needs. You get the flexibility to ship
                            your cargo when it suits you best.
                        </p>

                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="bg-sky-600 py-20">
                <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 lg:flex-row lg:items-center lg:px-8">

                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                            Sea Freight
                        </p>

                        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                            Need a reliable sea freight solution?
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

export default SeaFreight;
