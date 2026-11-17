import React from "react";
import SharedCmsPageHero from "../../../components/common/SharedCmsPageHero";

export default function NafezaPlatform() {
    return (
        <main className="min-h-screen bg-[#f7fbfe] text-[#1E3672]">
            <SharedCmsPageHero label="ILS Resources" title="Nafeza Platform">
                <p className="text-base leading-7 text-[#53677c] sm:text-lg sm:leading-8">Nafeza is Egypt's Unified Registration System for electronic customs and foreign trade procedures.</p>
            </SharedCmsPageHero>
            <section className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14 lg:px-12 lg:py-16">
                <div className="border border-[#dce9f2] bg-white p-5 sm:p-8 lg:p-10">
                    <div className="mb-7 h-1 w-12 bg-[#3097BF]" aria-hidden="true" />
                    <h2 className="text-2xl font-semibold text-[#1E3672]">Nafeza Services</h2>
                    <div className="mt-7 grid gap-4 md:grid-cols-3">
                        {[
                            { title: "Electronic Services", description: "Access electronic services and manage your foreign trade transactions." },
                            { title: "ACI System", description: "Information and services related to Advance Cargo Information." },
                            { title: "Customs Services", description: "Customs declarations, tariff inquiry and related services." },
                        ].map((service) => (
                            <article key={service.title} className="border border-[#dce9f2] bg-[#f7fbfe] p-5 sm:p-6">
                                <h3 className="font-semibold text-[#1E3672]">{service.title}</h3>
                                <p className="mt-3 text-sm leading-7 text-[#53677c]">{service.description}</p>
                            </article>
                        ))}
                    </div>
                    <a href="https://www.nafeza.gov.eg/en" target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex min-h-11 items-center justify-center bg-[#1E3672] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#3097BF]">
                        Visit Nafeza Platform
                    </a>
                </div>
            </section>
        </main>
    );
}
