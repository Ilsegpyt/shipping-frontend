import { ArrowUpRight, Container } from 'lucide-react';

const containerTypes = [
    'General Purpose Container (Dry Container)',
    'Flat Rack Container',
    'Open Top Container',
    'Double Door Container',
    'High Cube Container',
    'Open Side Container',
    'ISO Reefer Container',
    'Insulated Container',
    'Half-Height Container',
    'ISO Tank Container',
    'Swap Body Container',
];

export default function ContainerTypes() {
    return (
        <main className="bg-white">
            {/* ==================== Hero ==================== */}
            <section className="relative overflow-hidden bg-slate-950 py-28 sm:py-32">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.18),transparent_35%)]" />

                <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
                            Resources
                        </p>

                        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                            Container Types
                        </h1>

                        <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                            The most common types of shipping containers used in
                            international logistics.
                        </p>
                    </div>
                </div>
            </section>

            {/* ==================== Container Types ==================== */}
            <section className="bg-slate-50 py-24 sm:py-28">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {containerTypes.map((type, index) => (
                            <article
                                key={type}
                                className="group rounded-3xl border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl hover:shadow-slate-200/60"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                                        <Container size={24} strokeWidth={1.8} />
                                    </div>

                                    <span className="text-sm font-semibold text-slate-300">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                </div>

                                <h2 className="mt-7 text-xl font-semibold leading-snug text-slate-900">
                                    {type}
                                </h2>

                                <div className="mt-5 flex items-center gap-2 text-sm font-medium text-slate-400 transition group-hover:text-sky-600">
                                    Container type
                                    <ArrowUpRight
                                        size={16}
                                        className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                                    />
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}
