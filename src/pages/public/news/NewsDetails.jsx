import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';

import contentService from '../../../services/contentService';

const API_BASE_URL = 'http://localhost:5250';

function createSlug(title = '') {
    return title
        .toLowerCase()
        .trim()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

function getImageUrl(image) {
    if (!image) {
        return '';
    }

    if (image.startsWith('http')) {
        return image;
    }

    return `${API_BASE_URL}${image}`;
}

function getContentTypeName(type) {
    if (typeof type === 'string') {
        return type;
    }

    const types = {
        1: 'Category',
        2: 'Page',
        3: 'Post',
        4: 'Link',
    };

    return types[type] ?? '';
}

function formatDate(value) {
    if (!value) {
        return '';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date
        .toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })
        .replace(/ /g, '-');
}

async function getAllContent() {
    const response = await contentService.getRootContent();
    const roots = Array.isArray(response.data) ? response.data : [];

    const allContent = [];

    async function collect(items) {
        for (const item of items) {
            allContent.push(item);

            try {
                const childrenResponse = await contentService.getChildren(item.id);
                const children = Array.isArray(childrenResponse.data)
                    ? childrenResponse.data
                    : [];

                if (children.length > 0) {
                    await collect(children);
                }
            } catch {
                // A content item may not have children.
            }
        }
    }

    await collect(roots);

    return allContent;
}

export default function NewsDetails() {
    const { slug } = useParams();

    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        window.scrollTo(0, 0);

        let cancelled = false;

        async function loadNews() {
            try {
                setLoading(true);
                setError('');

                const allContent = await getAllContent();

                const post = allContent.find((item) => {
                    const type = getContentTypeName(item.type);

                    if (type.toLowerCase() !== 'post') {
                        return false;
                    }

                    // Current news links use the Content ID.
                    if (String(item.id) === String(slug)) {
                        return true;
                    }

                    // Keep compatibility with old English slug URLs.
                    return createSlug(item.title) === slug;
                });

                if (!post) {
                    throw new Error('News article not found.');
                }

                if (!cancelled) {
                    setContent(post);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err?.message ||
                        'Failed to load the news article.'
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadNews();

        return () => {
            cancelled = true;
        };
    }, [slug]);

    if (loading) {
        return (
            <main className="min-h-screen bg-white">
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

                        <div className="mt-14">
                            <p className="text-sm text-slate-400">
                                Loading news article...
                            </p>
                        </div>
                    </div>
                </section>
            </main>
        );
    }

    if (error || !content) {
        return (
            <main className="min-h-screen bg-white">
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

                        <div className="mt-14 max-w-4xl">
                            <h1 className="text-4xl font-semibold text-white sm:text-5xl">
                                News article not found
                            </h1>

                            <p className="mt-5 text-slate-400">
                                {error || 'The requested article could not be found.'}
                            </p>
                        </div>
                    </div>
                </section>
            </main>
        );
    }

    const imageUrl = getImageUrl(content.featuredImage);
    const category = content.category || 'ILS News';
    const date = formatDate(content.publishedAt);

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

                    <div className="mt-14 max-w-4xl">
                        <div className="inline-flex items-center gap-3 rounded-full border border-sky-400/20 bg-sky-400/10 px-4 py-2">
                            <span className="h-2 w-2 rounded-full bg-sky-400" />
                            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
                                {category}
                            </span>
                        </div>

                        {date && (
                            <p className="mt-6 text-sm font-medium text-slate-400">
                                {date}
                            </p>
                        )}

                        <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                            {content.title}
                        </h1>
                    </div>
                </div>
            </section>

            {/* ==================== Article ==================== */}
            <section className="bg-white py-16 sm:py-20">
                <div className="mx-auto max-w-5xl px-6 lg:px-8">
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        {imageUrl && (
                            <div className="aspect-[16/9] overflow-hidden bg-slate-100">
                                <img
                                    src={imageUrl}
                                    alt={content.title}
                                    className="h-full w-full object-cover"
                                />
                            </div>
                        )}

                        <article className="px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
                            <div
                                className="prose prose-slate max-w-3xl prose-p:text-base prose-p:leading-8 prose-p:text-slate-600 sm:prose-p:text-lg"
                                dangerouslySetInnerHTML={{
                                    __html: content.body || '',
                                }}
                            />

                            <div className="mt-10">
                                <Link
                                    to="/news"
                                    className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-sky-400"
                                >
                                    Back to News
                                    <ArrowUpRight size={17} />
                                </Link>
                            </div>
                        </article>
                    </div>
                </div>
            </section>
        </main>
    );
}
