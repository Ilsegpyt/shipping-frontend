const anyModeTerms = [
    {
        code: 'EXW',
        name: 'Ex Works',
        description:
            'Seller makes goods available at their premises. Buyer takes all risk and cost from there.',
    },
    {
        code: 'FCA',
        name: 'Free Carrier',
        description:
            'Seller delivers to carrier nominated by buyer; risk transfers at delivery.',
    },
    {
        code: 'CPT',
        name: 'Carriage Paid To',
        description:
            'Seller pays freight to destination, but risk transfers when delivered to the first carrier.',
    },
    {
        code: 'CIP',
        name: 'Carriage and Insurance Paid To',
        description:
            'Like CPT, but seller also provides insurance for buyer’s risk.',
    },
    {
        code: 'DAP',
        name: 'Delivered at Place',
        description:
            'Seller delivers goods ready for unloading at named place.',
    },
    {
        code: 'DPU',
        name: 'Delivered at Place Unloaded',
        description:
            'Seller delivers and unloads at named place.',
    },
    {
        code: 'DDP',
        name: 'Delivered Duty Paid',
        description:
            'Seller handles all costs and risks, including import duties, to the final destination.',
    },
];

const seaTerms = [
    {
        code: 'FAS',
        name: 'Free Alongside Ship',
        description:
            'Risk & cost transfer when goods are placed alongside the vessel.',
    },
    {
        code: 'FOB',
        name: 'Free On Board',
        description:
            'Risk & cost transfer when goods are loaded on board the vessel.',
    },
    {
        code: 'CFR',
        name: 'Cost and Freight',
        description:
            'Seller pays freight to destination port; risk transfers at loading.',
    },
    {
        code: 'CIF',
        name: 'Cost, Insurance, and Freight',
        description:
            'Like CFR, but seller also arranges minimum insurance.',
    },
];

function TermCard({ code, name, description }) {
    return (
        <article className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-lg hover:shadow-slate-200/60">
            <span className="text-sm font-bold tracking-[0.18em] text-sky-600">
                {code}
            </span>

            <h3 className="mt-6 text-xl font-semibold text-slate-900">
                {name}
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-600">
                {description}
            </p>
        </article>
    );
}

export default function Incoterms() {
    return (
        <main className="min-h-screen bg-white">
            {/* Hero */}
            <section className="relative overflow-hidden bg-slate-950">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.18),_transparent_45%)]" />

                <div className="relative mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
                        Resources
                    </p>

                    <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                        Incoterms 2020
                    </h1>

                    <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                        Understand the main Incoterms used in international trade
                        and logistics.
                    </p>
                </div>
            </section>

            {/* Intro */}
            <section className="bg-slate-50 py-20 sm:py-24">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                            Incoterms 2020
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                            Types of Incoterms
                        </h2>
                    </div>
                </div>
            </section>

            {/* Any Mode */}
            <section className="bg-white py-20 sm:py-24">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                            7 Terms
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                            For Any Mode of Transport
                        </h2>
                    </div>

                    <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {anyModeTerms.map((term) => (
                            <TermCard key={term.code} {...term} />
                        ))}
                    </div>
                </div>
            </section>

            {/* Source Image */}
            <section className="bg-slate-50 py-12 sm:py-16">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <img
                            src="https://ilsegypt.com/ils-server/public/uploads/7ee33f13-29ef-432e-ba89-011700295657.webp"
                            alt="Incoterms 2020"
                            className="h-auto w-full object-cover"
                        />
                    </div>
                </div>
            </section>

            {/* Sea & Inland Waterways */}
            <section className="bg-white py-20 sm:py-24">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                            4 Terms
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                            For Sea &amp; Inland Waterways Only
                        </h2>
                    </div>

                    <div className="mt-12 grid gap-5 md:grid-cols-2">
                        {seaTerms.map((term) => (
                            <TermCard key={term.code} {...term} />
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}
