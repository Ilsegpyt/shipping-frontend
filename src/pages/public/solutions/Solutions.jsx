import { Link } from 'react-router-dom';
import SharedCmsPageHero from '../../../components/common/SharedCmsPageHero';
import useSolutionHeroImages from '../../../hooks/useSolutionHeroImages';

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
    const solutionImage = useSolutionHeroImages();
    return (
        <main className="min-h-screen bg-brand-surface text-brand-text">
            {/* Shared public-site hero: same height and visual identity as CMS pages */}
            <SharedCmsPageHero label="ILS Solutions" title="End-to-end logistics solutions.">
                <p>Flexible logistics solutions designed to move your cargo efficiently across every stage of the supply chain.</p>
            </SharedCmsPageHero>

            {/* Solutions */}
            <section className="bg-brand-bg py-14 sm:py-20 lg:py-24">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
                            Our solutions
                        </p>

                        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-brand-primary lg:text-3xl">
                            Logistics solutions for every need
                        </h2>
                    </div>

                    <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:mt-12 lg:grid-cols-3">
                        {solutions.map((solution) => (
                            <Link
                                key={solution.title}
                                to={solution.path}
                                className="group overflow-hidden border border-brand-primary-hover bg-brand-surface transition duration-300 hover:border-brand-accent hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3097BF]"
                            >
                                <div className="relative aspect-[16/10] overflow-hidden">
                                    <img
                                        src={solutionImage(solution.title, solution.image)}
                                        alt={solution.title}
                                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                                    />

                                    <div className="absolute inset-0 bg-gradient-to-t from-brand-primary/80 via-[#1E3672]/10 to-transparent" />

                                    <div className="absolute bottom-0 left-0 right-0 p-5">
                                        <h3 className="text-base font-semibold text-brand-surface sm:text-lg">
                                            {solution.title}
                                        </h3>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-3 px-5 py-4">
                                    <span className="text-sm font-medium text-brand-primary-hover">
                                        Explore solution
                                    </span>

                                    <span className="text-sm font-semibold text-brand-primary-hover transition group-hover:translate-x-1">
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