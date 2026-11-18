import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';

import newsImage from '../../../assets/website/news/0d62ac1a-d0ef-425b-b04b-be6c2dc5a5a5.webp';

export default function GFSPartnership() {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <main className="min-h-screen bg-brand-surface">
            {/* ==================== Hero ==================== */}
            <section className="relative overflow-hidden bg-brand-surface-tint">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(14,165,233,0.22),transparent_35%)]" />
                <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-brand-accent/10 to-transparent" />

                <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-10 lg:px-8 lg:pb-20">
                    <Link
                        to="/news"
                        className="inline-flex items-center gap-2 text-sm font-medium text-brand-border transition hover:text-brand-surface"
                    >
                        <ArrowLeft size={17} />
                        Back to News
                    </Link>

                    <div className="mt-14 max-w-5xl">
                        <div className="inline-flex items-center gap-3 rounded-full border border-brand-accent/20 bg-brand-accent/10 px-4 py-2">
                            <span className="h-2 w-2 rounded-full bg-brand-accent" />
                            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">
                                ILS News
                            </span>
                        </div>

                        <p className="mt-6 text-sm font-medium text-brand-muted">
                            23-Nov-2025
                        </p>

                        <h1 className="mt-4 max-w-5xl text-2xl font-semibold leading-tight tracking-tight text-brand-surface sm:text-3xl lg:text-4xl">
                            Exclusive Partnership and Deep Cooperation Announcement
                        </h1>
                    </div>
                </div>
            </section>

            {/* ==================== Article ==================== */}
            <section className="bg-brand-surface py-16 sm:py-20">
                <div className="mx-auto max-w-5xl px-6 lg:px-8">
                    <div className="overflow-hidden rounded-3xl border border-brand-border bg-brand-surface shadow-sm">
                        <div className="aspect-[16/9] overflow-hidden bg-brand-surface">
                            <img
                                src={newsImage}
                                alt="Exclusive Partnership and Deep Cooperation Announcement"
                                className="h-full w-full object-cover"
                            />
                        </div>

                        <article className="px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
                            <div className="max-w-3xl space-y-7 text-sm leading-8 text-brand-muted sm:text-base">
                                <p className="text-base font-semibold leading-8 text-brand-text sm:text-lg sm:leading-9">
                                    Exclusive Partnership and Deep Cooperation Announcement
                                </p>

                                <p>
                                    ILS Egypt and Grand Freight Service China are thrilled to announce their strategic cooperation as exclusive inter- agency cooperation
                                </p>

                                <p>
                                    The exclusive collaboration between ILS Egypt and Grand Freight Service China will create seamless connections between Egypt and China, facilitating efficient trade and cargo movement, both companies will leverage their collective knowledge and experience to optimize supply chains, reduce costs, and enhance overall efficiency.
                                </p>

                                <p>
                                    So, our customers can expect a comprehensive range of logistics services, including air freight, ocean freight, road transportation, and customs brokerage.
                                </p>

                                <p>
                                    We look forward to a successful collaboration and the opportunity to serve our clients with enhanced capabilities and superior service.
                                </p>

                                <p className="font-semibold text-brand-text">
                                    Deep Cooperation——GFS&amp;ILS
                                </p>

                                <div className="border-t border-brand-border pt-7">
                                    <p>
                                        为促进埃及业务的发展
                                    </p>
                                    <p>
                                        GFS深圳鹏远在与埃及ILS协商后
                                    </p>
                                    <p>
                                        决定与其深度合作
                                    </p>
                                    <p>
                                        共同推进中国到埃及的进出口业务
                                    </p>
                                    <p>
                                        进一步提升我们的服务质量
                                    </p>
                                    <p>
                                        欢迎咨询合作
                                    </p>
                                </div>

                                <div className="pt-3">
                                    <Link
                                        to="/news"
                                        className="inline-flex items-center gap-2 rounded-xl bg-brand-accent px-6 py-3.5 text-sm font-semibold text-brand-surface transition hover:bg-brand-accent"
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
