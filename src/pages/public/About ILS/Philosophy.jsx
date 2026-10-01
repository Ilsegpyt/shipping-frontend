import React from 'react';

export default function Philosophy() {
    return (
        <main className="min-h-screen bg-slate-50">
            {/* Hero */}
            <section className="bg-slate-950 px-6 py-20 sm:px-10 lg:px-16">
                <div className="mx-auto max-w-6xl">
                    <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
                        About ILS
                    </p>

                    <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
                        ILS Philosophy
                    </h1>
                </div>
            </section>

            {/* Content */}
            <section className="px-6 py-14 sm:px-10 lg:px-16">
                <div className="mx-auto max-w-5xl">
                    <article className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10 lg:p-12">
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                            THE SECRET TO SUCCESS
                        </h2>

                        <p className="mt-2 text-lg font-semibold text-sky-600">
                            NETWORKS + TECHNOLOGY
                        </p>

                        <div className="mt-8 space-y-6 text-base leading-8 text-slate-600 sm:text-lg">
                            <p className="font-semibold text-slate-800">
                                Great networks enable you to achieve your goals effectively and technology allows you to do so efficiently. At ILS, our philosophy is to optimally connect:
                            </p>

                            <ul className="space-y-3 pl-6 text-slate-700">
                                <li className="relative pl-2">
                                    <span className="absolute -left-5 text-sky-500">•</span>
                                    Production and sales
                                </li>
                                <li className="relative pl-2">
                                    <span className="absolute -left-5 text-sky-500">•</span>
                                    Manufacturer and consumer interests
                                </li>
                                <li className="relative pl-2">
                                    <span className="absolute -left-5 text-sky-500">•</span>
                                    Industry and retail sectors
                                </li>
                            </ul>

                            <p className="font-semibold text-slate-800">
                                You can always be one step ahead of the market, using our customized in-house platform which consolidates our services and industry expertise under one umbrella. Creative thinking and professional performance - This is our guiding principle at ILS as we move through the new generation of the Freight Forwarders.
                            </p>

                            <p>
                                Our goal is to think ahead and actively shape the future through innovation, efficiency and customized logistics solutions. We seek to achieve speed, endurance and to overcome vast distances as a result of thorough preparations.
                            </p>
                        </div>
                    </article>
                </div>
            </section>
        </main>
    );
}
