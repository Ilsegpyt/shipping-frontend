import React from 'react';

const values = [
    {
        title: 'Customers first',
        points: [
            'We deliver great customer experiences and high quality services',
            'We are proactive in our customer dealings and work hard to retain customers',
            'We make it easy for our customers to do business with us',
        ],
    },
    {
        title: 'Best performance',
        points: [
            'We are transparent and driven by results',
            'We work together as ONE ILS across our entire global network',
            'We are driven by entrepreneurship and local empowerment',
        ],
    },
    {
        title: 'True collaboration',
        points: [
            'We take ownership and show initiative',
            'We collaborate and communicate in a respectful way',
            'We practice open dialogue',
        ],
    },
];

export default function Values() {
    return (
        <main className="min-h-screen bg-slate-50">
            {/* Hero */}
            <section className="bg-slate-950 px-6 py-20 sm:px-10 lg:px-16">
                <div className="mx-auto max-w-6xl">
                    <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
                        About ILS
                    </p>

                    <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
                        ILS Values
                    </h1>

                    <p className="mt-6 max-w-3xl text-xl font-medium leading-8 text-slate-300">
                        Our culture and our services are defined by our global values
                    </p>
                </div>
            </section>

            {/* Introduction */}
            <section className="px-6 py-14 sm:px-10 lg:px-16">
                <div className="mx-auto max-w-5xl">
                    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10 lg:p-12">
                        <p className="text-base leading-8 text-slate-600 sm:text-lg">
                            Wherever you meet us, we are driven by the same beliefs
                        </p>
                    </div>
                </div>
            </section>

            {/* Values */}
            <section className="px-6 pb-20 sm:px-10 lg:px-16">
                <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3">
                    {values.map((value) => (
                        <article
                            key={value.title}
                            className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-lg"
                        >
                            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                                {value.title}
                            </h2>

                            <div className="mt-6 h-1 w-12 rounded-full bg-sky-500" />

                            <ul className="mt-7 space-y-5">
                                {value.points.map((point) => (
                                    <li
                                        key={point}
                                        className="relative pl-7 text-base leading-7 text-slate-600"
                                    >
                                        <span className="absolute left-0 top-2 text-sky-500">
                                            •
                                        </span>

                                        {point}
                                    </li>
                                ))}
                            </ul>
                        </article>
                    ))}
                </div>
            </section>
        </main>
    );
}
