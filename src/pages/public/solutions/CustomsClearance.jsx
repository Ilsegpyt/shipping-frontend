import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    ArrowUpRight,
    Check,
    FileCheck2,
    Globe2,
} from 'lucide-react';

function CustomsClearance() {
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
                                Customs Clearance
                            </h1>

                            <p className="mt-7 max-w-2xl text-2xl font-medium leading-tight text-sky-400 sm:text-3xl">
                                Our licensed broker services ensure compliance
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
                                    <FileCheck2 size={52} strokeWidth={1.5} />
                                </div>
                            </div>

                            <div className="absolute bottom-8 left-8 right-8 rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
                                <p className="text-sm font-semibold text-white">
                                    Customs Clearance
                                </p>

                                <p className="mt-1 text-sm text-white/50">
                                    Licensed customs brokerage and compliance
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Expertise */}
            <section className="py-24 sm:py-32">
                <div className="mx-auto max-w-5xl px-6 lg:px-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                        Customs Clearance
                    </p>

                    <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
                        THE EXPERTISE YOU NEED TO ENSURE SUCCESSFUL TRANSPORT AND DELIVERY
                    </h2>

                    <div className="mt-8 space-y-6 text-lg leading-8 text-slate-600">
                        <p>
                            In a global economy, customs clearance is a complex
                            and ever changing landscape of rules, regulations,
                            and paperwork. Let our experts manage your customs
                            clearance, saving you time and ensuring successful
                            transport and delivery.
                        </p>

                        <p>
                            In most countries with ILS offices, we are licensed
                            customs brokers. And in other countries we have
                            arrangements with agents.
                        </p>

                        <p>
                            Regardless of the precise local setup, our highly
                            experienced experts can help you handle all your
                            customs needs - from import and export declarations,
                            temporary importation and customs warehousing to
                            duty drawbacks and national customs rulings.
                        </p>

                        <p>
                            Our customs brokers have expertise in local
                            conditions, regulatory requirements, tariff
                            updates, and more. With this knowledge, we can
                            process your custom clearances with accuracy and
                            efficiency.
                        </p>
                    </div>
                </div>
            </section>

            {/* Customs Care and Compliance */}
            <section className="bg-slate-50 py-24 sm:py-32">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
                        <div>
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm">
                                <Globe2 size={28} strokeWidth={1.7} />
                            </div>

                            <p className="mt-7 text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                                Compliance
                            </p>

                            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                                CUSTOMS CARE AND COMPLIANCE
                            </h2>
                        </div>

                        <div>
                            <p className="text-lg leading-8 text-slate-600">
                                At ILS, we understand the importance of properly
                                handled customs formalities and compliance with
                                all laws and regulations governing the
                                importation and exportation of goods. Our
                                comprehensive local and global customs
                                compliance programme ensures that your customs
                                documentation is accurate and compliant.
                            </p>

                            <p className="mt-8 text-lg leading-8 text-slate-600">
                                Depending on the country, we can offer advice,
                                special customs entries and procedures
                                including:
                            </p>

                            <div className="mt-8 grid gap-4 sm:grid-cols-2">
                                {[
                                    'Import and export declarations',
                                    'Temporary importation',
                                    'Weekly groupage services from Alexandria to Port Said',
                                    'Customs warehousing',
                                    'Duty drawback',
                                    'National customs rulings',
                                ].map((item) => (
                                    <div
                                        key={item}
                                        className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                                    >
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                                            <Check size={19} />
                                        </span>

                                        <span className="text-sm font-semibold leading-6 text-slate-800">
                                            {item}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="bg-sky-600 py-20">
                <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 lg:flex-row lg:items-center lg:px-8">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                            Customs Clearance
                        </p>

                        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                            Need support with customs clearance?
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

export default CustomsClearance;
