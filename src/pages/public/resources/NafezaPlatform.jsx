import React from "react";
import SharedCmsPageHero from "../../../components/common/SharedCmsPageHero";

export default function NafezaPlatform() {
    return (
        <main className="min-h-screen bg-brand-surface text-brand-primary">
            <SharedCmsPageHero label="ILS Resources" title="Nafeza Platform">
                <p >Nafeza is Egypt's Unified Registration System for electronic customs and foreign trade procedures.</p>
            </SharedCmsPageHero>
            <section className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14 lg:px-12 lg:py-16 ">
                <div className="border border-brand-primary-hover bg-brand-surface p-5 sm:p-8 lg:p-10">
                    <div className="mb-7 h-1 w-12 bg-brand-accent" aria-hidden="true" />
                    <h2 className="text-2xl font-semibold text-brand-primary">Nafeza Services</h2>
                    <div className="mt-7 grid gap-4 md:grid-cols-3">
                        {[
                            { title: "Electronic Services", description: "Access electronic services and manage your foreign trade transactions." },
                            { title: "ACI System", description: "Information and services related to Advance Cargo Information." },
                            { title: "Customs Services", description: "Customs declarations, tariff inquiry and related services." },
                        ].map((service) => (
                            <article key={service.title} className="border border-brand-primary-hover bg-brand-bg p-5 sm:p-6">
                                <h3 className="font-semibold text-brand-primary">{service.title}</h3>
                                <p className="mt-3 text-sm leading-7 text-brand-primary-hover">{service.description}</p>
                            </article>
                        ))}
                    </div>
                    <a href="https://www.nafeza.gov.eg/en" target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex min-h-11 items-center justify-center bg-brand-primary px-6 py-3 text-sm font-semibold text-brand-surface transition-colors hover:bg-brand-accent">
                        Visit Nafeza Platform
                    </a>
                </div>
            </section>
        </main>
    );
}
