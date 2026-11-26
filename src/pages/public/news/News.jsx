import { useEffect, useMemo, useState } from "react";

import { Link, useSearchParams } from "react-router-dom";

import { ArrowUpRight } from "lucide-react";
import SharedCmsPageHero from "../../../components/common/SharedCmsPageHero";
import newsHeroImage from "../../../assets/website/news/06deaf3c-354a-4853-a3d6-9a2e79884141.jpg";

import contentService from "../../../services/publicContentService";
import { cleanImageUrl } from "../../../utils/mediaUrl";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5250";

const getImageUrl = (image) => cleanImageUrl(image, API_BASE_URL);

const stripHtml = (html) => {
  if (!html) {
    return "";
  }

  const temp = document.createElement("div");

  temp.innerHTML = html;

  return temp.textContent || temp.innerText || "";
};

const getExcerpt = (body, maxLength = 180) => {
  const text = stripHtml(body).replace(/\s+/g, " ").trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}...`;
};

const getContentTypeName = (type) => {
  if (typeof type === "string") {
    return type;
  }

  switch (type) {
    case 1:
      return "Category";

    case 2:
      return "Page";

    case 3:
      return "Post";

    case 4:
      return "Link";

    default:
      return "";
  }
};

const formatDate = (date) => {
  if (!date) {
    return "";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate

    .toLocaleDateString("en-GB", {
      day: "2-digit",

      month: "short",

      year: "numeric",
    })

    .replace(/ /g, "-");
};

export default function News() {
  const [searchParams] = useSearchParams();

  const selectedCategory = searchParams.get("category")?.trim() || "";

  const [allPosts, setAllPosts] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadNews = async () => {
      try {
        setLoading(true);

        setError("");

        const rootResponse = await contentService.getRootContent();

        if (!Array.isArray(rootResponse.data)) {
          throw new Error("Invalid response from GET /api/content/root.");
        }

        const rootContent = rootResponse.data;

        if (rootContent.length === 0) {
          throw new Error("GET /api/content/root returned no content.");
        }

        const visited = new Set();

        const allContent = [];

        const loadTree = async (items) => {
          await Promise.all(
            items.map(async (item) => {
              if (!item?.id || visited.has(item.id)) {
                return;
              }

              visited.add(item.id);

              allContent.push(item);

              if (!["Category", "Page"].includes(getContentTypeName(item.type))) return;

              try {
                const childrenResponse = await contentService.getChildren(
                  item.id,
                );

                const children = Array.isArray(childrenResponse.data)
                  ? childrenResponse.data
                  : [];

                if (children.length > 0) {
                  await loadTree(children);
                }
              } catch (childError) {
                console.error(
                  `Failed to load children for content ${item.id}:`,
                  childError,
                );
              }
            }),
          );
        };

        await loadTree(rootContent);

        const posts = allContent

          .filter((item) => getContentTypeName(item.type) === "Post")

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

            category: item.category || "ILS News",

            rawCategory: (item.category || "").trim().toLowerCase(),

            date: formatDate(item.publishedAt),

            title: item.title,

            excerpt: getExcerpt(item.body),

            to: `/news/${item.id}`,
          }));


        if (isMounted) {
          setAllPosts(posts);
        }
      } catch (err) {
        console.error("Failed to load news:", err);

        if (isMounted) {
          setError(err?.message || "Failed to load news.");
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
  }, []);

  const newsItems = useMemo(() => {
    if (!selectedCategory) {
      return allPosts;
    }

    const selected = selectedCategory.trim().toLowerCase();

    return allPosts.filter((item) => item.rawCategory === selected);
  }, [allPosts, selectedCategory]);

  return (
    <main className="min-h-screen bg-brand-surface">
      <SharedCmsPageHero label="Media Room" title="Latest from ILS" image={newsHeroImage}>
        Discover the latest news, industry insights and milestones from ILS Egypt.
      </SharedCmsPageHero>

      <section className="bg-brand-surface py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          {loading && (
            <div className="py-16 text-center text-sm text-brand-muted">
              Loading news...
            </div>
          )}

          {!loading && error && (
            <div className="py-16 text-center text-sm text-red-500">
              {error}
            </div>
          )}

          {!loading && !error && newsItems.length === 0 && (
            <div className="py-16 text-center text-sm text-brand-muted">
              No news available.
            </div>
          )}

          {!loading && !error && newsItems.length > 0 && (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {newsItems.map((item) => (
                <article
                  key={item.id}
                  className="group flex h-full flex-col overflow-hidden border border-brand-primary-hover bg-brand-surface transition duration-300 hover:border-brand-accent hover:shadow-lg"
                >
                  <Link
                    to={item.to}
                    className="relative block aspect-[16/10] overflow-hidden bg-brand-surface"
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-brand-surface text-sm text-brand-muted">
                        No image
                      </div>
                    )}

                    <div className="absolute left-4 top-4 bg-brand-primary/90 px-3 py-1.5">
                      <span className="text-xs font-semibold text-brand-surface">
                        {item.category}
                      </span>
                    </div>
                  </Link>

                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <div className="flex items-center gap-2 text-xs font-medium text-brand-muted">
                      <span>{item.date}</span>

                      <span className="h-1 w-1 rounded-full bg-brand-border" />

                      <span>{item.category}</span>
                    </div>

                    <h2 className="mt-4 text-base font-semibold leading-7 text-brand-primary">
                      <Link
                        to={item.to}
                        className="transition hover:text-brand-accent"
                      >
                        {item.title}
                      </Link>
                    </h2>

                    <p className="mt-4 flex-1 text-sm leading-6 text-brand-muted">
                      {item.excerpt}
                    </p>

                    <Link
                      to={item.to}
                      className="mt-6 inline-flex w-fit items-center gap-2 text-sm font-semibold text-brand-primary transition hover:text-brand-accent"
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
