
import { useEffect, useState } from "react";
import contentService from "../../../services/contentService";
import WebsiteNavbar from "../../../components/website/WebsiteNavbar";
import WebsiteFooter from "../../../components/website/WebsiteFooter";
import { StructuredAboutRenderer } from "../../../components/common/StructuredAboutContent";

const getTypeName = (type) =>
  typeof type === "string"
    ? type
    : ({ 1: "Category", 2: "Page", 3: "Post", 4: "Link" }[type] || "");

const normalizeTitle = (value = "") =>
  value.trim().toLowerCase().replace(/&/g, "and").replace(/\s+/g, " ");

const getItems = (response) => {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  return [];
};

async function findPageInCategory(category, pageTitle, visited = new Set()) {
  if (!category?.id || visited.has(String(category.id))) return null;

  visited.add(String(category.id));

  const response = await contentService.getChildren(category.id);
  const children = getItems(response);

  const page = children.find(
    (item) =>
      getTypeName(item.type) === "Page" &&
      normalizeTitle(item.title) === normalizeTitle(pageTitle)
  );

  if (page) return page;

  for (const child of children) {
    if (getTypeName(child.type) !== "Category") continue;

    const found = await findPageInCategory(child, pageTitle, visited);
    if (found) return found;
  }

  return null;
}

export default function StructuredAboutPage({
  pageTitle,
  parentCategoryTitle = "About ILS",
}) {
  const [page, setPage] = useState(null);
  const [parentTitle, setParentTitle] = useState(parentCategoryTitle);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        setPage(null);

        const rootsResponse = await contentService.getRootContent();
        const roots = getItems(rootsResponse);

        const category = roots.find(
          (item) =>
            getTypeName(item.type) === "Category" &&
            normalizeTitle(item.title) === normalizeTitle(parentCategoryTitle)
        );

        if (!category?.id) {
          throw new Error(
            `Category "${parentCategoryTitle}" was not found in CMS.`
          );
        }

        const summary = await findPageInCategory(category, pageTitle);

        if (!summary?.id) {
          throw new Error(
            `Page "${pageTitle}" was not found under "${parentCategoryTitle}".`
          );
        }

        const fullResponse = await contentService.getById(summary.id);

        if (!fullResponse?.data) {
          throw new Error(`Could not load "${pageTitle}" from CMS.`);
        }

        if (active) {
          setPage(fullResponse.data);
          setParentTitle(category.title || parentCategoryTitle);
        }
      } catch (err) {
        if (active) setError(err?.message || `Unable to load ${pageTitle}.`);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [pageTitle, parentCategoryTitle]);

  return (
    <>
      <WebsiteNavbar />
      {loading ? (
        <main className="min-h-screen bg-slate-50" />
      ) : error ? (
        <main className="flex min-h-[60vh] items-center justify-center px-6">
          <p className="text-center text-red-600">{error}</p>
        </main>
      ) : (
        <StructuredAboutRenderer page={page} parentTitle={parentTitle} />
      )}
      <WebsiteFooter />
    </>
  );
}
