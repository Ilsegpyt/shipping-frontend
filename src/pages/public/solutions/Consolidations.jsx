import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { ArrowUpRight, Check, Boxes } from 'lucide-react';

function Consolidations() {
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
                                    Consolidations
                                </span>
                            </div>

                            <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
                                CONSOLIDATIONS
                            </h1>

                            <p className="mt-7 max-w-3xl text-xl leading-8 text-white/70 sm:text-2xl">
                                When it's urgent and you need something delivered fast
                            </p>
                        </div>

                        <div className="relative hidden h-[360px] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] lg:flex">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(14,165,233,0.16),transparent_55%)]" />

                            <div className="absolute left-1/2 top-1/2 flex h-48 w-48 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-sky-400/20">
                                <div className="absolute h-32 w-32 rounded-full border border-sky-400/20" />

                                <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-sky-400/20 bg-sky-400/10">
                                    <Boxes
                                        size={46}
                                        strokeWidth={1.4}
                                        className="text-sky-400"
                                    />
                                </div>
                            </div>

                            <div className="absolute bottom-8 left-8">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
                                    LCL Consolidation
                                </p>

                                <p className="mt-2 max-w-xs text-sm leading-6 text-white/50">
                                    Efficient groupage solutions connecting global destinations.
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
                                <Boxes size={28} strokeWidth={1.7} />
                            </div>

                            <p className="mt-7 text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                                Consolidations
                            </p>

                            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl">
                                ILS - THE PROFESSIONALS IN LCL
                            </h2>
                        </div>

                        <div className="space-y-6 text-base leading-8 text-slate-600 sm:text-lg">
                            <p>
                                As one of the most reliable consolidator ILS offers an excellent,
                                unique and cost-effective LCL (less than container-load) service to
                                all main ports in the world using the ports of Alexandria, Port Said ,
                                Cairo as receiving terminals ( Gateways).
                            </p>

                            <p>
                                ILS is the best alternative in the consolidation business.
                            </p>

                            <p>
                                The working procedures are according to the latest quality standards
                                in our industry, using their own modern C.F.S. (container freight
                                station) for handling all our Import and Export groupage cargo.
                            </p>

                            <p>
                                Having a unique system of hubs and networks of agents through the
                                whole world from main ports to inland destinations, results in a
                                weekly service to /from 400 destinations ! A unique one stop shopping
                                concept saving our clients time and costs.
                            </p>
                        </div>

                    </div>
                </div>
            </section>

            {/* LCL Services */}
            <section className="bg-slate-50 py-24 sm:py-28">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">

                    <div className="max-w-3xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                            Our services
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                            LCL SERVICES INCLUDE:
                        </h2>
                    </div>

                    <div className="mt-12 grid gap-4 sm:grid-cols-2">
                        {[
                            'Weekly direct Import Consolidation services from over than 400 global destinations',
                            'Weekly Export services to more than 400 destinations direct and via various Hubs in Europe, Asia, Middle East and North and South USA',
                            'Weekly groupage services from Alexandria to Port Said',
                            'Daily LTL services to the main Cities in Egypt (Cairo – Suez – Damietta – Sokhna.etc.)',
                            'Stuffing and de-stuffing',
                            'Modern CFS Services',
                            'Bonded and Non bonded Warehousing',
                            'Distributions',
                            'Packing and removals',
                            'Customs clearance',
                        ].map((service) => (
                            <div
                                key={service}
                                className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                            >
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                                    <Check size={19} />
                                </span>

                                <span className="text-sm font-semibold leading-6 text-slate-800">
                                    {service}
                                </span>
                            </div>
                        ))}
                    </div>

                </div>
            </section>

            {/* CTA */}
            <section className="bg-sky-600 py-20">
                <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 lg:flex-row lg:items-center lg:px-8">

                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                            Consolidations
                        </p>

                        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                            Need a fast and reliable consolidation solution?
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

export default Consolidations;
