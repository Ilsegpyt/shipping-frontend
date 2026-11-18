// Public CMS URLs are derived from the category hierarchy and page title.
export const cmsSlug = (value) => String(value || "").trim().toLowerCase()
  .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

export const cmsPagePath = (categoryTitles, page) => {
  const parts = [...categoryTitles, page?.slug || page?.title].map(cmsSlug).filter(Boolean);
  return parts.length ? `/pages/${parts.join("/")}` : `/cms/${page.id}`;
};

export const collectCmsPages = async (contentService) => {
  const rootsResponse = await contentService.getRootContent();
  const roots = Array.isArray(rootsResponse?.data) ? rootsResponse.data : [];
  const pages = [];
  const visited = new Set();
  const typeName = (type) => typeof type === "string" ? type : ({1:"Category",2:"Page",3:"Post",4:"Link"}[type] || "");
  async function walk(item, parents = []) {
    if (!item?.id || visited.has(String(item.id))) return;
    visited.add(String(item.id));
    const type = typeName(item.type);
    if (type === "Page") { pages.push({ ...item, publicPath: cmsPagePath(parents, item) }); return; }
    if (type !== "Category") return;
    const response = await contentService.getChildren(item.id);
    const children = Array.isArray(response?.data) ? response.data : [];
    for (const child of children) await walk(child, [...parents, item.title]);
  }
  for (const root of roots) await walk(root);
  return pages;
};
