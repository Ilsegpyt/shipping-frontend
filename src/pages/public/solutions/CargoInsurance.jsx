import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { ArrowUpRight, Check, ShieldCheck } from 'lucide-react';

function CargoInsurance() {
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
                                    Cargo Insurance
                                </span>
                            </div>

                            <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
                                CARGO INSURANCE
                            </h1>

                            <p className="mt-7 max-w-3xl text-xl leading-8 text-white/70 sm:text-2xl">
                                Enjoy peace of mind and work with ILS on your insurance for transport and logistics
                            </p>
                        </div>

                        <div className="relative hidden h-[360px] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] lg:flex">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(14,165,233,0.16),transparent_55%)]" />

                            <div className="absolute left-1/2 top-1/2 flex h-48 w-48 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-sky-400/20">
                                <div className="absolute h-32 w-32 rounded-full border border-sky-400/20" />

                                <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-sky-400/20 bg-sky-400/10">
                                    <ShieldCheck
                                        size={46}
                                        strokeWidth={1.4}
                                        className="text-sky-400"
                                    />
                                </div>
                            </div>

                            <div className="absolute bottom-8 left-8">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
                                    Cargo Protection
                                </p>

                                <p className="mt-2 max-w-xs text-sm leading-6 text-white/50">
                                    Tailored insurance coverage for your transport and logistics needs.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Introduction */}
            <section className="py-24 sm:py-28">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">

                    <div className="max-w-4xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                            Cargo Insurance
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl">
                            IT'S YOUR BUSINESS - MAKE SURE IT'S PROTECTED
                        </h2>

                        <div className="mt-8 space-y-6 text-base leading-8 text-slate-600 sm:text-lg">
                            <p>
                                Get tailored logistics insurance coverage matching your exact needs and peace of mind knowing that your goods are protected against unpredictable events.
                            </p>

                            <p>
                                We take the utmost care of your goods. Regardless, various unavoidable perils and accidents can cause damage and expose your goods to risks. Whether you ship by sea, air or road or store goods in warehouses, having your goods and shipments insured are crucial to protect your business.
                            </p>

                            <p>
                                Our logistics insurance solution allows you to secure your business in case of unexpected circumstances. De-risk your supply chain with Cargo insurance coverage and let ILS tailor the transport and logistics insurance to your needs.
                            </p>
                        </div>
                    </div>

                </div>
            </section>

            {/* Cover Your Goods */}
            <section className="bg-slate-50 py-24 sm:py-28">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">

                    <div className="max-w-4xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                            Protection
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                            COVER YOUR GOODS AND SHIPMENTS
                        </h2>

                        <div className="mt-8 space-y-6 text-base leading-8 text-slate-600 sm:text-lg">
                            <p>
                                You never know what can happen when your goods are transported by sea, air, or road. Unforeseen circumstances can impact your business in a split second.
                            </p>

                            <p>
                                Laws and international conventions dictate that your freight forwarder has only limited liability. So, it's up to you to insure the unforeseen. With the ILS Cargo Insurance, you can easily transfer the risk from you to us - and stay in business.
                            </p>

                            <p>
                                We offer comprehensive coverage options that allow you to protect your business against unexpected circumstances, quick and hassle-free.
                            </p>
                        </div>
                    </div>

                </div>
            </section>

            {/* Manage the Unforeseen */}
            <section className="py-24 sm:py-28">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">

                    <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                                Cargo Insurance
                            </p>

                            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                                MANAGE THE UNFORESEEN
                            </h2>
                        </div>

                        <div className="space-y-6 text-base leading-8 text-slate-600 sm:text-lg">
                            <p>
                                Incidents happen when goods are transported. Unavoidable perils, hazards, accidents, or even human errors often cause damage.
                            </p>

                            <p>
                                ILS Cargo Insurance will protect your potential loss in case the unforeseen happens while your goods are in transit.
                            </p>
                        </div>
                    </div>

                </div>
            </section>

            {/* Safeguard Your Business */}
            <section className="bg-slate-950 py-24 text-white sm:py-28">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">

                    <div className="max-w-4xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
                            Business Protection
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                            SAFEGUARD YOUR BUSINESS
                        </h2>

                        <div className="mt-8 space-y-6 text-base leading-8 text-slate-300 sm:text-lg">
                            <p>
                                National and international laws and conventions limit a freight forwarder's liability. Entitling you to relatively small compensation.
                            </p>

                            <p>
                                With freight insurance, you will be fully compensated in case of damage, theft, or loss in relation to the value for which the item is insured. Safeguarding your business.
                            </p>
                        </div>
                    </div>

                </div>
            </section>

            {/* Simplify the Process */}
            <section className="py-24 sm:py-28">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">

                    <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                                Simple and Flexible
                            </p>

                            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                                SIMPLIFY THE PROCESS
                            </h2>
                        </div>

                        <div className="space-y-6 text-base leading-8 text-slate-600 sm:text-lg">
                            <p>
                                Getting the right cargo insurance shouldn't be difficult. With ILS, you receive tailored shipping insurance that matches your needs.
                            </p>

                            <p>
                                Fast claims handling, no deductible, and all-risk coverage ensure the protection of goods in the event of loss or damage.
                            </p>
                        </div>
                    </div>

                </div>
            </section>

            {/* CTA */}
            <section className="bg-sky-600 py-20">
                <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 lg:flex-row lg:items-center lg:px-8">

                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                            Cargo Insurance
                        </p>

                        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                            Need to protect your cargo and shipments?
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

export default CargoInsurance;
