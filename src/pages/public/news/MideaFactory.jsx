import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';

import newsImage from '../../../assets/website/news/8a010a5f-e4a8-4ece-aa41-c61df1014ef8.webp';

export default function MideaFactory() {
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
                            ILSegypt cooperate #Midea for opening one of its factories at Sadat City
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
                                alt="ILSegypt cooperate #Midea for opening one of its factories at Sadat City"
                                className="h-full w-full object-cover"
                            />
                        </div>

                        <article className="px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
                            <div className="max-w-3xl">
                                <p className="text-base font-semibold leading-8 text-brand-text sm:text-lg sm:leading-9">
                                    ILSegypt cooperate #Midea for opening one of its factories at Sadat City
                                </p>

                                <p className="mt-7 whitespace-pre-line text-sm leading-8 text-brand-muted sm:text-base">
                                    وضع المهندس أحمد سمير، وزير التجارة والصناعة، اليوم، حجر الأساس لمصنع جديد لشركة ميديا إليكتريك مصر الصينية المتخصصة في إنتاج الأجهزة المنزلية بالمنطقة الصناعية بمدينة السادات،ووالذى يقام على مساحة 220 ألف متر مربع، وذلك بحضور السفير/ لياو ليتشيانج سفير الصين بالقاهرة والدكتور/ أحمد كُريم نائب رئيس الهيئة العامة للاستثمار لشئون ترويج الاستثمار، والسيد/عمرو سعيد الرئيس التنفيذي لشركة ميديا إليكتريك مصر.
                                </p>

                                <div className="mt-10">
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
