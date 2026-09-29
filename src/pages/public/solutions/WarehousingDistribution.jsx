import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    ArrowUpRight,
    Boxes,
    Warehouse,
} from 'lucide-react';

export default function WarehousingDistribution() {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <main className="min-h-screen bg-white text-[#0B1736]">
            {/* Hero */}
            <section className="relative overflow-hidden bg-gradient-to-r from-[#020617] via-[#06152B] to-[#00345A] text-white">
                <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
                    <Link
                        to="/solutions"
                        className="mb-12 inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Solutions
                    </Link>

                    <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
                        <div>
                            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#00B8FF]" />
                                ILS Solutions
                            </div>

                            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                                Warehousing and distribution
                            </h1>

                            <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-[#00B8FF] sm:text-xl">
                                Complete control and overview of your shipments
                            </p>
                        </div>

                        <div className="relative mx-auto flex h-72 w-full max-w-xl items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-[#101A2E] shadow-2xl">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#142D46] via-[#101A2E] to-[#0A1325]" />

                            <div className="relative flex items-center justify-center">
                                <div className="absolute h-44 w-44 rounded-full border border-white/10" />
                                <div className="absolute h-60 w-60 rounded-full border border-white/5" />

                                <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl border border-[#00B8FF]/30 bg-[#0B2940] shadow-lg shadow-black/20">
                                    <Warehouse className="h-14 w-14 text-[#00B8FF]" />
                                </div>
                            </div>

                            <div className="absolute bottom-7 left-7 right-7 rounded-2xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur-sm">
                                <p className="text-sm font-semibold text-white">
                                    Warehousing and Distribution
                                </p>
                                <p className="mt-1 text-sm text-slate-300">
                                    Flexible storage and fulfillment solutions
                                </p>
                            </div>

                            <div className="absolute bottom-7 right-7 hidden h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-[#10243A] shadow-sm sm:flex">
                                <Boxes className="h-6 w-6 text-[#00B8FF]" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Introduction */}
            <section className="mx-auto max-w-5xl px-6 py-20 lg:px-8">
                <p className="text-lg leading-8 text-[#315A80]">
                    We offer more than just shipping services. We also offer packing and
                    storage, receiving, and warehousing solutions to assist and support
                    your business. Our services go further to Improve the performance of
                    your supply chain by working with us to create a customized solution
                    for your business. Our warehousing professionals receive inventory
                    and fulfill important product shipments or orders on a one-time or
                    recurring basis. In addition, we will warehouse items for the short
                    and long-term and provide you with regular status reports. Utilizing
                    for inventory, kitting, packaging, and shipping of your stored items
                    at the same location will reduce costs and allow for improved supply
                    chain management. Rely on ILS Egypt for all of your packing, shipping,
                    storage, and warehousing needs.
                </p>
            </section>

            {/* Services */}
            <section className="border-y border-[#DCE7F0] bg-[#F5F9FC]">
                <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
                    <div className="grid gap-12 lg:grid-cols-2">
                        <div>
                            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#55728E]">
                                ILS Solutions
                            </p>

                            <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-[#0B1736] sm:text-4xl">
                                WAREHOUSING AND DISTRIBUTION SERVICES:
                            </h2>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            {[
                                'Loading and unloading',
                                'Palatalizing',
                                'Consolidation',
                                'Labeling',
                                'Packing and Re-packing',
                                'Packaging',
                            ].map((item) => (
                                <div
                                    key={item}
                                    className="flex items-center justify-between rounded-2xl border border-[#DCE7F0] bg-white px-5 py-4 shadow-sm"
                                >
                                    <span className="text-sm font-medium text-[#315A80]">
                                        {item}
                                    </span>
                                    <ArrowUpRight className="h-4 w-4 text-[#7A94AB]" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Warehouse Types */}
            <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
                <div className="grid gap-12 lg:grid-cols-2">
                    <div>
                        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#55728E]">
                            ILS Solutions
                        </p>

                        <h2 className="text-3xl font-semibold tracking-tight text-[#0B1736] sm:text-4xl">
                            WAREHOUSES TYPES:
                        </h2>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        {[
                            'Danger goods',
                            'General goods',
                            'Reefer goods',
                            'Bonded warehouses',
                            'Inbounded warehouses',
                        ].map((item) => (
                            <div
                                key={item}
                                className="flex items-center justify-between rounded-2xl border border-[#DCE7F0] bg-white px-5 py-4 shadow-sm"
                            >
                                <span className="text-sm font-medium text-[#315A80]">
                                    {item}
                                </span>
                                <ArrowUpRight className="h-4 w-4 text-[#7A94AB]" />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="border-t border-[#132C49] bg-[#020617] text-white">
                <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
                    <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                ILS Solutions
                            </p>

                            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                                Need a reliable warehousing and distribution solution?
                            </h2>
                        </div>

                        <a
                            href="/#contact"
                            className="inline-flex w-fit items-center gap-2 rounded-full bg-[#00B8FF] px-6 py-3 text-sm font-semibold text-[#020617] transition-transform hover:-translate-y-0.5"
                        >
                            Discuss your requirements
                            <ArrowUpRight className="h-4 w-4" />
                        </a>
                    </div>
                </div>
            </section>
        </main>
    );
}
