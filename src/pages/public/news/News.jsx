import { useEffect, useState } from 'react';



import { Link, useSearchParams } from 'react-router-dom';



import { ArrowLeft, ArrowUpRight } from 'lucide-react';







import contentService from '../../../services/contentService';







const API_BASE_URL = 'http://localhost:5250';







const getImageUrl = (image) => {



    if (!image) {



        return '';



    }







    if (image.startsWith('http://') || image.startsWith('https://')) {



        return image;



    }







    return `${API_BASE_URL}${image}`;



};







const stripHtml = (html) => {



    if (!html) {



        return '';



    }







    const temp = document.createElement('div');



    temp.innerHTML = html;







    return temp.textContent || temp.innerText || '';



};







const getExcerpt = (body, maxLength = 180) => {



    const text = stripHtml(body).replace(/\s+/g, ' ').trim();







    if (text.length <= maxLength) {



        return text;



    }







    return `${text.slice(0, maxLength).trim()}...`;



};







const getContentTypeName = (type) => {



    if (typeof type === 'string') {



        return type;



    }







    switch (type) {



        case 1:



            return 'Category';



        case 2:



            return 'Page';



        case 3:



            return 'Post';



        case 4:



            return 'Link';



        default:



            return '';



    }



};







const formatDate = (date) => {



    if (!date) {



        return '';



    }







    const parsedDate = new Date(date);







    if (Number.isNaN(parsedDate.getTime())) {



        return '';



    }







    return parsedDate



        .toLocaleDateString('en-GB', {



            day: '2-digit',



            month: 'short',



            year: 'numeric',



        })



        .replace(/ /g, '-');



};







export default function News() {



    const [searchParams] = useSearchParams();



    const selectedCategory = searchParams.get('category')?.trim() || '';



    const [newsItems, setNewsItems] = useState([]);



    const [loading, setLoading] = useState(true);



    const [error, setError] = useState('');







    useEffect(() => {



        window.scrollTo(0, 0);



    }, []);







    useEffect(() => {



        let isMounted = true;







        const loadNews = async () => {



            try {



                setLoading(true);



                setError('');







                const rootResponse = await contentService.getRootContent();



                if (!Array.isArray(rootResponse.data)) {



                    throw new Error(



                        'Invalid response from GET /api/content/root.'



                    );



                }







                const rootContent = rootResponse.data;







                if (rootContent.length === 0) {



                    throw new Error(



                        'GET /api/content/root returned no content.'



                    );



                }







                const visited = new Set();



                const allContent = [];







                const loadTree = async (items) => {



                    for (const item of items) {



                        if (!item?.id || visited.has(item.id)) {



                            continue;



                        }







                        visited.add(item.id);



                        allContent.push(item);







                        try {



                            const childrenResponse =



                                await contentService.getChildren(item.id);







                            const children = Array.isArray(childrenResponse.data)



                                ? childrenResponse.data



                                : [];







                            if (children.length > 0) {



                                await loadTree(children);



                            }



                        } catch (childError) {



                            console.error(



                                `Failed to load children for content ${item.id}:`,



                                childError



                            );







                            throw new Error(



                                `Failed to load children for "${item.title || item.id}". ` +



                                `Please check GET /api/content/${item.id}/children.`



                            );



                        }



                    }



                };







                await loadTree(rootContent);







                const posts = allContent



                    .filter((item) => getContentTypeName(item.type) === 'Post')



                    .filter((item) => {
                        if (!selectedCategory) {
                            return true;
                        }

                        const category = (item.category || '')
                            .trim()
                            .toLowerCase();

                        const selected = selectedCategory
                            .trim()
                            .toLowerCase();

                        return category === selected;
                    })

                    .sort((a, b) => {



                        if (!a.publishedAt && !b.publishedAt) return 0;



                        if (!a.publishedAt) return 1;



                        if (!b.publishedAt) return -1;







                        return (



                            new Date(b.publishedAt).getTime() -



                            new Date(a.publishedAt).getTime()



                        );



                    })



                    .map((item) => ({



                        id: item.id,



                        image: getImageUrl(item.featuredImage),



                        category: item.category || 'ILS News',



                        date: formatDate(item.publishedAt),



                        title: item.title,



                        excerpt: getExcerpt(item.body),



                        to: `/news/${item.id}`,



                    }));







                if (isMounted) {



                    setNewsItems(posts);



                }



            } catch (err) {



                console.error('Failed to load news:', err);







                if (isMounted) {



                    setError(



                        err?.message ||



                        'Failed to load news.'



                    );



                }



            } finally {



                if (isMounted) {



                    setLoading(false);



                }



            }



        };







        loadNews();







        return () => {



            isMounted = false;



        };



    }, [selectedCategory]);







    return (



        <main className="min-h-screen bg-white">



            {/**\\\*** ==================== Hero ==================== **\\\***/}



            <section className="relative overflow-hidden bg-slate-950">



                <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%\\\_35%,rgba(14,165,233,0.22),transparent_35%)]" />



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







            {/**\\\*** ==================== News ==================== **\\\***/}



            <section className="bg-white py-20 sm:py-24">



                <div className="mx-auto max-w-7xl px-6 lg:px-8">



                    {loading && (



                        <div className="py-16 text-center text-sm text-slate-500">



                            Loading news...



                        </div>



                    )}







                    {!loading && error && (



                        <div className="py-16 text-center text-sm text-red-500">



                            {error}



                        </div>



                    )}







                    {!loading && !error && newsItems.length === 0 && (



                        <div className="py-16 text-center text-sm text-slate-500">



                            No news available.



                        </div>



                    )}







                    {!loading && !error && newsItems.length > 0 && (



                        <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">



                            {newsItems.map((item) => (



                                <article



                                    key={item.id}



                                    className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl hover:shadow-slate-200/60"



                                >



                                    <Link



                                        to={item.to}



                                        className="relative block aspect-[16/10] overflow-hidden bg-slate-100"



                                    >



                                        {item.image ? (



                                            <img



                                                src={item.image}



                                                alt={item.title}



                                                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"



                                            />



                                        ) : (



                                            <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-400">



                                                No image



                                            </div>



                                        )}







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



                    )}



                </div>



            </section>



        </main>



    );



}
