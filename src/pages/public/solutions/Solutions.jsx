import { Link } from 'react-router-dom';

import airfreight from '../../../assets/website/solutions/airfreight.webp';
import seafreight from '../../../assets/website/solutions/seafreight.webp';
import roadtransportation from '../../../assets/website/solutions/roadtransportation.webp';
import customclearance from '../../../assets/website/solutions/customclearence.webp';
import projectstransport from '../../../assets/website/solutions/projectstransport.webp';
import warehousing from '../../../assets/website/solutions/warehousing.webp';
import consolidations from '../../../assets/website/solutions/consolidations.webp';
import cargo from '../../../assets/website/solutions/cargo.webp';

const solutions = [
    {
        title: 'Air Freight',
        image: airfreight,
        path: '/solutions/air-freight',
    },
    {
        title: 'Sea Freight',
        image: seafreight,
        path: '/solutions/sea-freight',
    },
    {
        title: 'Road Transportation',
        image: roadtransportation,
        path: '/solutions/road-transportation',
    },
    {
        title: 'Customs Clearance',
        image: customclearance,
        path: '/solutions/customs-clearance',
    },
    {
        title: 'Project Transport',
        image: projectstransport,
        path: '/solutions/project-transport',
    },
    {
        title: 'Warehousing and Distribution',
        image: warehousing,
        path: '/solutions/warehousing-distribution',
    },
    {
        title: 'Consolidations',
        image: consolidations,
        path: '/solutions/consolidations',
    },
    {
        title: 'Cargo Insurance',
        image: cargo,
        path: '/solutions/cargo-insurance',
    },
];

function Solutions() {
    return (
        <main className="min-h-screen bg-white text-slate-900">
            {/* Hero */}
            <section className="relative overflow-hidden bg-slate-950">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(14,165,233,0.22),transparent_35%)]" />

                <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-sky-500/10 to-transparent" />

                <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-32 lg:px-8 lg:pb-32">
                    <div className="max-w-4xl">
                        <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-md">
                            <span className="h-2 w-2 rounded-full bg-sky-400" />

                            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/85">
                                ILS Solutions
                            </span>
                        </div>

                        <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
                            End-to-end logistics solutions.
                        </h1>

                        <p className="mt-7 max-w-3xl text-lg leading-8 text-white/70 sm:text-xl">
                            Flexible logistics solutions designed to move your
                            cargo efficiently across every stage of the supply
                            chain
                        </p>
                    </div>
                </div>
            </section>

            {/* Solutions */}
            <section className="py-24 sm:py-32">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                            Our solutions
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                            Logistics solutions for every need
                        </h2>
                    </div>

                    <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {solutions.map((solution) => (
                            <Link
                                key={solution.title}
                                to={solution.path}
                                className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                            >
                                <div className="relative aspect-[4/3] overflow-hidden">
                                    <img
                                        src={solution.image}
                                        alt={solution.title}
                                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                    />

                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />

                                    <div className="absolute bottom-0 left-0 right-0 p-6">
                                        <h3 className="text-2xl font-semibold text-white">
                                            {solution.title}
                                        </h3>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between px-6 py-5">
                                    <span className="text-sm font-medium text-slate-500">
                                        Explore solution
                                    </span>

                                    <span className="text-sm font-semibold text-sky-600 transition group-hover:translate-x-1">
                                        View details →
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}

export default Solutions;