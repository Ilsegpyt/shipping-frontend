import { useEffect, useState } from "react";
import contentService from "../services/publicContentService";

import { HERO_PAGES, normalizeTitle, normalizePath } from "../utils/staticLinkPages";

const isLink = (item) => ["link", "4"].includes(String(item?.type || "").toLowerCase());
const isContainer = (item) => ["category", "1", "page", "2"].includes(String(item?.type || "").toLowerCase());

async function findHeroLink(page) {
  const rootsResponse = await contentService.getRootContent();
  const roots = Array.isArray(rootsResponse?.data) ? rootsResponse.data : [];
  const seen = new Set();
  let titleMatch = null;

  async function walk(items) {
    const containers = [];
    for (const item of items) {
      if (!item?.id || seen.has(item.id)) continue;
      seen.add(item.id);
      if (isLink(item)) {
        const url = normalizePath(item.linkUrl);
        if (url && page.paths.includes(url)) return item;
        if (!titleMatch && page.titles.includes(normalizeTitle(item.title))) titleMatch = item;
      }
      if (isContainer(item)) containers.push(item);
    }
    // Check siblings before making additional requests for deeper levels.
    for (const item of containers) {
      const response = await contentService.getChildren(item.id);
      const found = await walk(Array.isArray(response?.data) ? response.data : []);
      if (found) return found;
    }
    return null;
  }
  const categoryNames = {
    "join-ils": ["join ils"],
    "contact-ils": ["contact ils"],
    resources: ["resources", "ils resources"],
  };
  const preferred = categoryNames[page.paths[0].split("/")[1]] || [];
  const preferredRoots = roots.filter((item) =>
    isContainer(item) && preferred.includes(normalizeTitle(item.title))
  );
  // Search the expected section first; preserve support for links moved elsewhere.
  return (await walk(preferredRoots)) || (await walk(roots)) || titleMatch;
}

export default function useCmsStaticHeroImage(pathname, title = "") {
  const path = normalizePath(pathname);
  const heading = normalizeTitle(title);
  const page = HERO_PAGES.find((candidate) => candidate.paths.includes(path))
    || HERO_PAGES.find((candidate) => candidate.titles.includes(heading));
  const pageKey = page?.paths[0] || "";
  const [state, setState] = useState({ key: pageKey, image: null, loading: Boolean(pageKey) });

  useEffect(() => {
    let active = true;
    if (!page) {
      setState({ key: "", image: null, loading: false });
      return () => { active = false; };
    }
    setState({ key: pageKey, image: null, loading: true });
    (async () => {
      try {
        const link = await findHeroLink(page);
        const image = link?.featuredImage; // Root/children already returns FeaturedImage.
        if (active) setState({ key: pageKey, image: typeof image === "string" && image.trim() ? image.trim() : null, loading: false });
      } catch {
        if (active) setState({ key: pageKey, image: null, loading: false });
      }
    })();
    return () => { active = false; };
  }, [pageKey]);

  return state.key === pageKey
    ? { image: state.image, loading: state.loading }
    : { image: null, loading: Boolean(pageKey) };
}
