import { useEffect, useState } from "react";
import contentService from "../../services/contentService";

import { StructuredAboutRenderer } from "./StructuredAboutContent";

const getTypeName = (type) => typeof type === "string" ? type : ({ 1: "Category", 2: "Page", 3: "Post", 4: "Link" }[type] || "");

export default function StructuredAboutPage({ pageTitle, parentCategoryTitle = "About ILS", styleVariant = "default" }) {
  const [page, setPage] = useState(null);
  const [parentTitle, setParentTitle] = useState(parentCategoryTitle);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true); setError("");
        const rootsResponse = await contentService.getRootContent();
        const roots = Array.isArray(rootsResponse.data) ? rootsResponse.data : [];
        const parent = roots.find((item) => getTypeName(item.type) === "Category" && item.title?.trim().toLowerCase() === parentCategoryTitle.trim().toLowerCase());
        if (!parent?.id) throw new Error(`${parentCategoryTitle} category was not found in CMS.`);
        const childrenResponse = await contentService.getChildren(parent.id);
        const children = Array.isArray(childrenResponse.data) ? childrenResponse.data : [];
        const summary = children.find((item) => getTypeName(item.type) === "Page" && item.title?.trim().toLowerCase() === pageTitle.trim().toLowerCase());
        if (!summary?.id) throw new Error(`${pageTitle} page was not found under ${parentCategoryTitle} in CMS.`);
        const fullResponse = await contentService.getById(summary.id);
        if (!fullResponse?.data) throw new Error(`${pageTitle} page details could not be loaded from CMS.`);
        if (active) { setPage(fullResponse.data); setParentTitle(parent.title || "About ILS"); }
      } catch (e) { if (active) setError(e?.message || `Unable to load ${pageTitle}.`); }
      finally { if (active) setLoading(false); }
    };
    load(); return () => { active = false; };
  }, [pageTitle, parentCategoryTitle]);
return (
  <>
    {loading ? (
      <main className="min-h-screen bg-slate-50" />
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
    )}
  </>
);
}
