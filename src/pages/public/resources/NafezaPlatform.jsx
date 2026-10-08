import React from "react";

export default function NafezaPlatform() {
    return (
        <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-12">
            {/* Site background */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.18),transparent_35%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(30,64,175,0.12),transparent_35%)]" />

            <div className="relative mx-auto max-w-5xl">
                <div className="rounded-2xl border border-slate-700/60 bg-slate-900/80 p-10 text-center shadow-2xl backdrop-blur-sm">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-sky-500 text-2xl font-bold text-white shadow-lg shadow-sky-500/20">
                        N
                    </div>

                    <h1 className="text-4xl font-bold text-white">
                        Nafeza Platform
                    </h1>

                    <p className="mx-auto mt-4 max-w-2xl text-slate-300">
                        Nafeza is Egypt's Unified Registration System for
                        electronic customs and foreign trade procedures.
                    </p>

                    <div className="mt-8 grid gap-4 md:grid-cols-3">
                        <div className="rounded-xl border border-slate-700/60 bg-slate-800/60 p-6 transition hover:border-sky-500/40 hover:bg-slate-800">
                            <h2 className="font-semibold text-white">
                                Electronic Services
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-slate-400">
                                Access electronic services and manage your
                                foreign trade transactions.
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-700/60 bg-slate-800/60 p-6 transition hover:border-sky-500/40 hover:bg-slate-800">
                            <h2 className="font-semibold text-white">
                                ACI System
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-slate-400">
                                Information and services related to Advance
                                Cargo Information.
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-700/60 bg-slate-800/60 p-6 transition hover:border-sky-500/40 hover:bg-slate-800">
                            <h2 className="font-semibold text-white">
                                Customs Services
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-slate-400">
                                Customs declarations, tariff inquiry and
                                related services.
                            </p>
                        </div>
                    </div>

                    <a
                        href="https://www.nafeza.gov.eg/en"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-8 inline-block rounded-lg bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
                    >
                        Visit Nafeza Platform
                    </a>
                </div>
            </div>
        </div>
    );
}