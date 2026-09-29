import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';

import newsBreakbulk from '../../../assets/website/news/6742896b-8bca-4ed9-9162-c46427b6b2f9.webp';
import newsRedSea from '../../../assets/website/news/06deaf3c-354a-4853-a3d6-9a2e79884141.jpg';
import newsEgyptChina from '../../../assets/website/news/651abe28-4f1d-4d6f-ac82-9bb6ae3016cf.webp';
import newsMidea from '../../../assets/website/news/8a010a5f-e4a8-4ece-aa41-c61df1014ef8.webp';
import newsGfs from '../../../assets/website/news/0d62ac1a-d0ef-425b-b04b-be6c2dc5a5a5.webp';
import newsWelcome from '../../../assets/website/news/db47e7e2-456e-4d07-9b6a-81028878a831.webp';
import newsSharedVision from '../../../assets/website/news/b881e899-f2aa-4dcd-a935-375bcf9066ab.webp';

const newsItems = [
    {
        image: newsBreakbulk,
        category: 'Case Study',
        date: '29-Dec-2025',
        title: 'Breakbulk Shipment of Industrial Machinery',
        excerpt:
            'We successfully shipped, cleared, and transported a 186-ton Breakbulk shipment with unmatched precision and seamless coordination.',
        to: '/news/breakbulk-shipment-of-industrial-machinery',
    },
    {
        image: newsRedSea,
        category: 'Industry News',
        date: '29-Dec-2025',
        title:
            'Red Sea Container Terminal No. 1 in Ain Sokhna Port Begins Trial Operations',
        excerpt:
            'Egypt has officially begun trial operations at the Red Sea Container Terminal No. 1 at Sokhna Port, marking a major step in its bid to become a leading logistics and transshipment hub connecting the Red Sea with the Mediterranean.',
        to: '/news/red-sea-container-terminal-no-1',
    },
    {
        image: newsEgyptChina,
        category: 'ILS News',
        date: '29-Dec-2025',
        title: 'From Egypt to China',
        excerpt:
            'Together, ILS Egypt and Millennium FBA are creating seamless logistics solutions that connect markets, strengthen trade, and drive global growth.',
        to: '/news/from-egypt-to-china',
    },
    {
        image: newsMidea,
        category: 'ILS News',
        date: '23-Nov-2025',
        title: 'ILSegypt cooperate #Midea for opening one of its factories at Sadat City',
        excerpt:
            'ILSegypt cooperate #Midea for opening one of its factories at Sadat City',
        to: '/news/midea-factory-sadat-city',
    },
    {
        image: newsGfs,
        category: 'ILS News',
        date: '23-Nov-2025',
        title: 'Exclusive Partnership and Deep Cooperation Announcement',
        excerpt:
            'ILS Egypt and Grand Freight Service China are thrilled to announce their strategic cooperation as exclusive inter- agency cooperation',
        to: '/news/exclusive-partnership-and-deep-cooperation',
    },
    {
        image: newsWelcome,
        category: 'ILS News',
        date: '21-Nov-2025',
        title: 'Welcome Aboard',
        excerpt:
            'We are thrilled to announce two new distinguished members joining our team at ILS Egypt.',
        to: '/news/welcome-aboard',
    },
    {
        image: newsSharedVision,
        category: 'ILS News',
        date: '06-Nov-2025',
        title: 'A shared vision, strong coordination, and trusted expertise',
        excerpt:
            'The collaboration between ILS Egypt and GMCC&Welling reflects our commitment to building reliable logistics partnerships that support global operations and long-term growth.',
        to: '/news/shared-vision-strong-coordination-and-trusted-expertise',
    },
];

export default function News() {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <main className="min-h-screen bg-white">
            {/* ==================== Hero ==================== */}
            <section className="relative overflow-hidden bg-slate-950">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(14,165,233,0.22),transparent_35%)]" />
                <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-sky-500/10 to-transparent" />

                <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-10 lg:px-8 lg:pb-24">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition hover:text-white"
                    >
                        <ArrowLeft size={17} />
                        Back to Home
                    </Link>

                    <div className="mt-16 max-w-3xl">
                        <div className="inline-flex items-center gap-3 rounded-full border border-sky-400/20 bg-sky-400/10 px-4 py-2">
                            <span className="h-2 w-2 rounded-full bg-sky-400" />
                            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
                                Media Room
                            </span>
                        </div>

                        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                            Latest from ILS
                        </h1>

                        <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                            Discover the latest news, industry insights and milestones from ILS Egypt.
                        </p>
                    </div>
                </div>
            </section>

            {/* ==================== News ==================== */}
            <section className="bg-white py-20 sm:py-24">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
                        {newsItems.map((item) => (
                            <article
                                key={item.title}
                                className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl hover:shadow-slate-200/60"
                            >
                                <Link
                                    to={item.to}
                                    className="relative block aspect-[16/10] overflow-hidden bg-slate-100"
                                >
                                    <img
                                        src={item.image}
                                        alt={item.title}
                                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                    />

                                    <div className="absolute left-5 top-5 rounded-full bg-slate-950/80 px-3 py-1.5 backdrop-blur-sm">
                                        <span className="text-xs font-semibold text-white">
                                            {item.category}
                                        </span>
                                    </div>
                                </Link>

                                <div className="flex flex-1 flex-col p-6 sm:p-7">
                                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                                        <span>{item.date}</span>
                                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                                        <span>{item.category}</span>
                                    </div>

                                    <h2 className="mt-4 text-xl font-semibold leading-7 text-slate-900">
                                        <Link
                                            to={item.to}
                                            className="transition hover:text-sky-600"
                                        >
                                            {item.title}
                                        </Link>
                                    </h2>

                                    <p className="mt-4 flex-1 text-sm leading-6 text-slate-600">
                                        {item.excerpt}
                                    </p>

                                    <Link
                                        to={item.to}
                                        className="mt-6 inline-flex w-fit items-center gap-2 text-sm font-semibold text-slate-900 transition hover:text-sky-600"
                                    >
                                        Read more
                                        <ArrowUpRight
                                            size={17}
                                            className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                                        />
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}
