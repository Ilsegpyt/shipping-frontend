import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { collectCmsPages, resolveCmsRecordLink } from "../../utils/cmsPageRoutes";
import contentService from "../../services/publicContentService";
import { StructuredAboutRenderer } from "../../components/common/StructuredAboutContent";

const getTypeName = (type) =>
  typeof type === "string"
    ? type
    : ({ 1: "Category", 2: "Page", 3: "Post", 4: "Link" }[type] || "");

// Keep the Certificates CMS data intact, but do not publish its page.
// Remove this guard when Certificates should become publicly visible again.
const isHiddenCertificatesPage = (content) => {
  const normalize = (value) =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  return [content?.title, content?.slug].some(
    (value) => normalize(value) === "certificates",
  );
};

export default function CmsPublicPage() {
  const { contentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPage() {
      try {
        setLoading(true);
        setPage(null);
        setError("");
        const allPages = await collectCmsPages(contentService, true);
        const requestedPath = decodeURI(location.pathname).replace(/\/$/, "").toLowerCase();
        const matched = contentId
          ? allPages.find((item) => String(item.id) === String(contentId))
          : allPages.find((item) => item.publicPath.toLowerCase() === requestedPath);
        if (!matched) throw new Error("This CMS page could not be found.");
        const content = matched; // collectCmsPages retains the complete ContentDto.

        if (getTypeName(content.type) === "Link") {
          if (isHiddenCertificatesPage(content)) {
            if (active) navigate("/", { replace: true });
            return;
          }
          const destination = resolveCmsRecordLink(content, allPages);
          if (!destination) throw new Error("This CMS link has an invalid or circular destination.");
          if (active) {
            if (destination.href) window.location.replace(destination.href);
            else navigate(destination.to, { replace: true });
          }
          return;
        }

        if (!content || getTypeName(content.type) !== "Page") {
          throw new Error("This CMS page could not be found.");
        }

        if (active) {
          setPage(content);
          if (contentId && matched.publicPath.startsWith("/pages/")) {
            navigate(matched.publicPath, { replace: true });
          }
        }
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

    loadPage();
    return () => { active = false; };
  }, [contentId, location.pathname, navigate]);

  if (loading) return <main className="min-h-[60vh] bg-brand-surface" />;

  if (error || !page) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-6 pt-24">
        <p className="text-center text-red-600">{error || "Page not found."}</p>
      </main>
    );
  }

  if (isHiddenCertificatesPage(page)) {
    return <Navigate to="/" replace />;
  }

  return <StructuredAboutRenderer page={page} styleVariant="default" />;
}
