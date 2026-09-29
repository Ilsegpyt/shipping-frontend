import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';

import newsImage from '../../../assets/website/news/db47e7e2-456e-4d07-9b6a-81028878a831.webp';

export default function WelcomeAboard() {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <main className="min-h-screen bg-white">
            {/* ==================== Hero ==================== */}
            <section className="relative overflow-hidden bg-slate-950">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(14,165,233,0.22),transparent_35%)]" />
                <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-sky-500/10 to-transparent" />

                <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-10 lg:px-8 lg:pb-20">
                    <Link
                        to="/news"
                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition hover:text-white"
                    >
                        <ArrowLeft size={17} />
                        Back to News
                    </Link>

                    <div className="mt-14 max-w-5xl">
                        <div className="inline-flex items-center gap-3 rounded-full border border-sky-400/20 bg-sky-400/10 px-4 py-2">
                            <span className="h-2 w-2 rounded-full bg-sky-400" />
                            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
                                ILS News
                            </span>
                        </div>

                        <p className="mt-6 text-sm font-medium text-slate-400">
                            21-Nov-2025
                        </p>

                        <h1 className="mt-4 max-w-5xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                            Welcome Aboard
                        </h1>
                    </div>
                </div>
            </section>

            {/* ==================== Article ==================== */}
            <section className="bg-white py-16 sm:py-20">
                <div className="mx-auto max-w-5xl px-6 lg:px-8">
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="aspect-[16/9] overflow-hidden bg-slate-100">
                            <img
                                src={newsImage}
                                alt="Welcome Aboard"
                                className="h-full w-full object-cover"
                            />
                        </div>

                        <article className="px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
                            <div className="max-w-3xl">
                                <p className="text-xl font-semibold leading-8 text-slate-900 sm:text-2xl sm:leading-9">
                                    We are thrilled to announce two new distinguished members joining our team at ILS Egypt.
                                </p>

                                <p className="mt-7 text-base leading-8 text-slate-600 sm:text-lg">
                                    we are welcoming Mr. Mohamed Al Amrousy, who will be taking on the role of Commercial Manager, and Mr. Mohamed Al shabassy, who will be stepping into the position of Business Development Manager.
                                </p>

                                <p className="mt-7 text-base leading-8 text-slate-600 sm:text-lg">
                                    We are excited about the dynamic future ahead and look forward to the contributions both Mr. Mohamed Al Amrousy and Mr. Mohamed Al shabassy will bring to our company.
                                </p>

                                <div className="mt-10">
                                    <Link
                                        to="/news"
                                        className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-sky-400"
                                    >
                                        Back to News
                                        <ArrowUpRight size={17} />
                                    </Link>
                                </div>
                            </div>
                        </article>
                    </div>
                </div>
            </section>
        </main>
    );
}
