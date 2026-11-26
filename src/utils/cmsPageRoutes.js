import { resolveCmsLinkDestination } from "./staticLinkPages.js";

// Public CMS URLs are derived from the category hierarchy and page title.
export const cmsSlug = (value) => String(value || "").trim().toLowerCase()
  .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

export const cmsPagePath = (categoryTitles, page) => {
  const parts = [...categoryTitles, page?.slug || page?.title].map(cmsSlug).filter(Boolean);
  return parts.length ? `/pages/${parts.join("/")}` : `/cms/${page.id}`;
};

export const collectCmsPages = async (contentService, includeLinks = false) => {
  const rootsResponse = await contentService.getRootContent();
  const roots = Array.isArray(rootsResponse?.data) ? rootsResponse.data : [];
  const pages = [];
  const visited = new Set();
  const typeName = (type) => typeof type === "string" ? type : ({1:"Category",2:"Page",3:"Post",4:"Link"}[type] || "");
  async function walk(item, parents = []) {
    if (!item?.id || visited.has(String(item.id))) return;
    visited.add(String(item.id));
    const type = typeName(item.type);
    if (type === "Page" || (includeLinks && type === "Link")) { pages.push({ ...item, publicPath: cmsPagePath(parents, item) }); return; }
    if (type !== "Category") return;
    const response = await contentService.getChildren(item.id);
    const children = Array.isArray(response?.data) ? response.data : [];
    for (const child of children) await walk(child, [...parents, item.title]);
  }
  for (const root of roots) await walk(root);
  return pages;
};

const comparablePath = (path) => path.replace(/\/$/, "").toLowerCase();

// Resolve old /cms/:id or /pages/... URLs for Link records, without redirect loops.
export function resolveCmsRecordLink(record, records) {
  const visited = new Set();
  let current = record;
  while (current) {
    if (visited.has(String(current.id))) return null;
    visited.add(String(current.id));
    const destination = resolveCmsLinkDestination(current);
    if (!destination || destination.href) return destination;
    const pathname = new URL(destination.to, window.location.origin).pathname;
    const path = comparablePath(pathname);
    const linked = records.find(item =>
      comparablePath(item.publicPath) === path || `/cms/${String(item.id).toLowerCase()}` === path
    );
    if (!linked || !["link", "4"].includes(String(linked.type).toLowerCase())) return destination;
    current = linked;
  }
  return null;
}
