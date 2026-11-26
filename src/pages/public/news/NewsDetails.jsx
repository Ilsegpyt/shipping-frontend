import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import SharedCmsPageHero from '../../../components/common/SharedCmsPageHero';
import newsHeroImage from '../../../assets/website/news/06deaf3c-354a-4853-a3d6-9a2e79884141.jpg';

import contentService from '../../../services/publicContentService';
import { cleanImageUrl, cleanHtmlImages } from '../../../utils/mediaUrl';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5250";

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
    return cleanImageUrl(image, API_BASE_URL);
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

            if (!['Category', 'Page'].includes(getContentTypeName(item.type))) continue;

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

const cachedArticles = new Map();

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

                let post = cachedArticles.get(slug);

                if (!post) {
                    // News links normally contain a numeric or UUID content ID.
                    const isContentId = /^\d+$/.test(slug) ||
                        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

                    if (isContentId) {
                        const response = await contentService.getById(slug);
                        const candidate = response.data?.data ?? response.data;

                        if (candidate && getContentTypeName(candidate.type).toLowerCase() === 'post') {
                            post = candidate;
                        }
                    } else {
                        // Preserve old title-based links without changing routing.
                        const allContent = await getAllContent();
                        post = allContent.find((item) =>
                            getContentTypeName(item.type).toLowerCase() === 'post' &&
                            createSlug(item.title) === slug
                        );
                    }

                    if (post) cachedArticles.set(slug, post);
                }

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
        return <main className="min-h-screen bg-brand-surface">
            <SharedCmsPageHero label="Media Room" title="Loading news article..." image={newsHeroImage} />
        </main>;
    }

    if (error || !content) {
        return <main className="min-h-screen bg-brand-surface">
            <SharedCmsPageHero label="Media Room" title="News article not found" image={newsHeroImage}>
                {error || 'The requested article could not be found.'}
            </SharedCmsPageHero>
        </main>;
    }

    const imageUrl = getImageUrl(content.featuredImage);
    const category = content.category || 'ILS News';
    const date = formatDate(content.publishedAt);

    return (
        <main className="min-h-screen bg-brand-surface">
            <SharedCmsPageHero label="Media Room" title={content.title} image={newsHeroImage} />

            {/* ==================== Article ==================== */}
            <section className="bg-brand-surface py-16 sm:py-20">
                <div className="mx-auto max-w-5xl px-6 lg:px-8">
                    <div className="overflow-hidden border border-brand-primary-hover bg-brand-surface">
                        {imageUrl && (
                            <div className="aspect-[16/9] overflow-hidden bg-brand-surface">
                                <img
                                    src={imageUrl}
                                    alt={content.title}
                                    className="h-full w-full object-cover"
                                />
                            </div>
                        )}

                        <article className="px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
                            <div className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-medium text-brand-primary-hover">
                                <span className="font-semibold text-brand-primary">{category}</span>
                                {date && <><span aria-hidden="true">·</span><time dateTime={content.publishedAt}>{date}</time></>}
                            </div>
                            <div
                                className="prose prose-slate max-w-3xl prose-p:text-base prose-p:leading-8 prose-p:text-brand-muted sm:prose-p:text-sm"
                                dangerouslySetInnerHTML={{
                                    __html: cleanHtmlImages(content.body, API_BASE_URL),
                                }}
                            />

                            <div className="mt-10">
                                <Link
                                    to="/news"
                                    className="inline-flex items-center gap-2 bg-brand-primary px-6 py-3.5 text-sm font-semibold text-brand-surface transition hover:bg-brand-accent"
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
