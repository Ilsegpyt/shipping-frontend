import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import contentService from "../../services/contentService";
import { StructuredAboutRenderer } from "../../components/common/StructuredAboutContent";

const getTypeName = (type) =>
  typeof type === "string"
    ? type
    : ({ 1: "Category", 2: "Page", 3: "Post", 4: "Link" }[type] || "");

export default function CmsPublicPage() {
  const { contentId } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPage() {
      try {
        setLoading(true);
        setError("");
        const response = await contentService.getById(contentId);
        const content = response?.data;

        if (!content || getTypeName(content.type) !== "Page") {
          throw new Error("This CMS page could not be found.");
        }

        if (active) setPage(content);
      } catch (err) {
        if (active) {
          setError(
            err?.response?.data?.message ||
              err?.response?.data?.error ||
              err?.message ||
              "Unable to load this page.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    if (contentId) loadPage();
    return () => { active = false; };
  }, [contentId]);

  if (loading) return <main className="min-h-[60vh] bg-slate-50" />;

  if (error || !page) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-6 pt-24">
        <p className="text-center text-red-600">{error || "Page not found."}</p>
      </main>
    );
  }

  return <StructuredAboutRenderer page={page} styleVariant="default" />;
}
