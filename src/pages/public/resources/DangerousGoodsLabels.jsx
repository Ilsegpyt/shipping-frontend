const dangerousGoodsClasses = [
    {
        number: 'Class 1',
        title: 'Explosive substances and articles',
        description:
            'All goods with a risk of causing an explosion, whether it is a mass explosion, a light fire, a blast wave, etc. Identified by a black icon or number on an orange background.',
    },
    {
        number: 'Class 2',
        title: 'Gases',
        description:
            'Classified into three subdivisions according to whether they are flammable (flame icon on a red background), non-flammable non-toxic (cylinder icon on a green background) or toxic (skull icon on a white background).',
    },
    {
        number: 'Class 3',
        title: 'Flammable liquids',
        description:
            'Materials with a maximum flash point of 60º C.',
    },
    {
        number: 'Class 4',
        title: 'Flammable solids and other solid explosive substances',
        description:
            'Subdivided into solid flammable goods (4.1 white and red striped background), self-reactive substance (4.2 white/red background) and substances that release flammable gases in contact with water (4.3 blue background).',
    },
    {
        number: 'Class 5',
        title: 'Oxidising substances and organic peroxides',
        description:
            'Identified by the yellow background.',
    },
    {
        number: 'Class 6',
        title: 'Toxic substances or infectious substances',
        description:
            'Toxic substances (which can be harmful to health and even fatal) or infectious substances (which contain micro-organisms such as bacteria or viruses). The label has a white background.',
    },
    {
        number: 'Class 7',
        title: 'Radioactive substances',
        description:
            'The label has a white or yellow/white background depending on the level of radioactivity of the goods.',
    },
    {
        number: 'Class 8',
        title: 'Corrosive substances',
        description:
            'Icon with two pipettes on a black and white background with the word “Corrosive”.',
    },
    {
        number: 'Class 9',
        title: 'Miscellaneous dangerous substances',
        description:
            'The label has black and white stripes at the top, with a white background on the bottom.',
    },
];

function DangerousGoodsCard({ number, title, description }) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-lg hover:shadow-slate-200/60">
            <span className="inline-flex rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-bold tracking-[0.14em] text-sky-600 ring-1 ring-sky-100">
                {number}
            </span>

            <h2 className="mt-5 text-xl font-semibold leading-snug text-slate-900">
                {title}
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
                {description}
            </p>
        </article>
    );
}

export default function DangerousGoodsLabels() {
    return (
        <main className="min-h-screen bg-white">
            <section className="relative overflow-hidden bg-slate-950">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.18),_transparent_45%)]" />

                <div className="relative mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
                        Resources
                    </p>

                    <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                        Classification of Dangerous Goods Labels
                    </h1>

                    <p className="mt-6 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                        Dangerous goods labels must be used in transport to
                        identify the risks of the products being transported.
                    </p>
                </div>
            </section>

            <section className="bg-slate-50 py-20 sm:py-24">
                <div className="mx-auto max-w-4xl px-6 lg:px-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                        Dangerous Goods
                    </p>

                    <div className="mt-6 space-y-5 text-base leading-8 text-slate-600">
                        <p>
                            <strong className="font-semibold text-slate-900">
                                Dangerous goods
                            </strong>{' '}
                            are substances which because of their
                            characteristics and composition may endanger the
                            health and safety of persons and the environment.
                            Compliance with a series of strict requirements for
                            their storage, handling and transport is compulsory.
                        </p>

                        <p>
                            <strong className="font-semibold text-slate-900">
                                Dangerous goods labels
                            </strong>{' '}
                            must be used in transport to identify the risks of
                            the products being transported. Goods are classified
                            according to the international regulation{' '}
                            <a
                                href="https://www.boe.es/buscar/doc.php?id=BOE-A-2019-9661"
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-sky-600 underline decoration-sky-200 underline-offset-4 transition hover:text-sky-500"
                            >
                                ADR 2019 (European Agreement on the Transport of Dangerous Goods by Road)
                            </a>{' '}
                            based on their composition and degree of danger.
                        </p>
                    </div>
                </div>
            </section>

            <section className="bg-white py-20 sm:py-24">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                            Classification
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                            Dangerous goods classes
                        </h2>
                    </div>

                    <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {dangerousGoodsClasses.map((item) => (
                            <DangerousGoodsCard
                                key={item.number}
                                {...item}
                            />
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}
