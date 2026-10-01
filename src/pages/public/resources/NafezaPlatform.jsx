import React from "react";

export default function NafezaPlatform() {
    return (
        <div className="min-h-screen bg-slate-50 px-4 py-12">
            <div className="mx-auto max-w-5xl">
                <div className="rounded-2xl bg-white p-10 text-center shadow-lg">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-900 text-2xl font-bold text-white">
                        N
                    </div>

                    <h1 className="text-4xl font-bold text-slate-900">
                        Nafeza Platform
                    </h1>

                    <p className="mx-auto mt-4 max-w-2xl text-slate-500">
                        Nafeza is Egypt's Unified Registration System for
                        electronic customs and foreign trade procedures.
                    </p>

                    <div className="mt-8 grid gap-4 md:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 p-6">
                            <h2 className="font-semibold text-slate-900">
                                Electronic Services
                            </h2>
                            <p className="mt-2 text-sm text-slate-500">
                                Access electronic services and manage your
                                foreign trade transactions.
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 p-6">
                            <h2 className="font-semibold text-slate-900">
                                ACI System
                            </h2>
                            <p className="mt-2 text-sm text-slate-500">
                                Information and services related to Advance
                                Cargo Information.
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 p-6">
                            <h2 className="font-semibold text-slate-900">
                                Customs Services
                            </h2>
                            <p className="mt-2 text-sm text-slate-500">
                                Customs declarations, tariff inquiry and
                                related services.
                            </p>
                        </div>
                    </div>

                    <a
                        href="https://www.nafeza.gov.eg/en"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-8 inline-block rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                        Visit Nafeza Platform
                    </a>
                </div>
            </div>
        </div>
    );
}