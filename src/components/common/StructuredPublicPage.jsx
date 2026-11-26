import LoadingScreen from "./LoadingScreen";
import { useEffect, useState } from "react";
import contentService from "../../services/publicContentService";
import { StructuredAboutRenderer } from "./StructuredAboutContent";

const getTypeName = (type) =>
  typeof type === "string"
    ? type
    : ({ 1: "Category", 2: "Page", 3: "Post", 4: "Link" }[type] || "");

const normalize = (value) =>
  String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();

export default function StructuredPublicPage({
  pageTitle,
  parentCategoryTitle = "About ILS",
  styleVariant = "default",
}) {
  const [page, setPage] = useState(null);
  const [parentTitle, setParentTitle] = useState(parentCategoryTitle);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const rootsResponse = await contentService.getRootContent();
        const roots = Array.isArray(rootsResponse.data) ? rootsResponse.data : [];
        const parent = roots.find(
          (item) =>
            getTypeName(item.type) === "Category" &&
            normalize(item.title) === normalize(parentCategoryTitle),
        );

        if (!parent?.id) {
          throw new Error(`${parentCategoryTitle} category was not found in CMS.`);
        }

        const childrenResponse = await contentService.getChildren(parent.id);
        const children = Array.isArray(childrenResponse.data) ? childrenResponse.data : [];
        const summary = children.find(
          (item) =>
            getTypeName(item.type) === "Page" &&
            normalize(item.title) === normalize(pageTitle),
        );

        if (!summary?.id) {
          throw new Error(`${pageTitle} page was not found under ${parentCategoryTitle} in CMS.`);
        }

        // Children already returns the full ContentDto.
        const fullResponse = summary;
        if (!fullResponse) {
          throw new Error(`${pageTitle} page details could not be loaded from CMS.`);
        }

        if (active) {
          setPage(fullResponse);
          setParentTitle(parent.title || parentCategoryTitle);
        }
      } catch (e) {
        if (active) setError(e?.message || `Unable to load ${pageTitle}.`);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, [pageTitle, parentCategoryTitle]);

  return loading ? (
    <LoadingScreen compact label="Loading page..." />
  ) : error ? (
    <main className="flex min-h-[60vh] items-center justify-center px-6">
      <p className="text-red-600">{error}</p>
    </main>
  ) : (
    <StructuredAboutRenderer
      page={page}
      parentTitle={parentTitle}
      styleVariant={styleVariant}
    />
  );
}
