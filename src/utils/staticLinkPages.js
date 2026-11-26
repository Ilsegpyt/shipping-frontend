export const HERO_PAGES = [
  { paths: ["/join-ils/agent-opportunity", "/agent"], titles: ["agent opportunity"] },
  { paths: ["/join-ils/recruitment", "/recruitment", "/join-our-team"], titles: ["join our team", "recruitment"] },
  { paths: ["/contact-ils/locations", "/contact-ils/ils-branches", "/ils-locations", "/locations", "/branches"], titles: ["ils locations", "ils branches", "locations", "branches"] },
  { paths: ["/contact-ils/get-a-quote", "/get-a-quote", "/quotation", "/quote"], titles: ["quotation", "get a quote", "request a quote", "quote request"] },
  { paths: ["/resources/nafeza-platform", "/nafeza"], titles: ["nafeza", "nafeza platform"] },
  { paths: ["/resources/cbm-calculator", "/cbm-calculator"], titles: ["cbm calculator"] },
  { paths: ["/resources/customs-duties-calculator", "/customs-duties-calculator"], titles: ["customs duties calculator"] },
];

export const normalizeTitle = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
export const normalizePath = (value) => {
  if (!value) return "";
  try {
    return new URL(String(value), window.location.origin).pathname.toLowerCase().replace(/\/+$/, "") || "/";
  } catch {
    return "";
  }
};
export function resolveStaticLinkUrl(title, existingUrl = "") {
  const heading = normalizeTitle(title);
  const destination = getSafeCmsLink(existingUrl);
  const path = destination?.to ? normalizePath(destination.to) : "";
  const page = HERO_PAGES.find(item => item.titles.includes(heading))
    || HERO_PAGES.find(item => item.paths.includes(path));
  return page?.paths[0] || "";
}

// CMS links may target a root-relative route or an absolute HTTP(S) URL.
export function getSafeCmsLink(value) {
  const url = String(value || "").trim();
  if (
  !url ||
  url.includes("\\") ||
  [...url].some((char) => char.charCodeAt(0) <= 32) ||
  url.startsWith("//")
) {
  return null;
}
  if (!url.startsWith("/") && !/^https?:\/\//i.test(url)) return null;
  try {
    const parsed = new URL(url, window.location.origin);
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) return null;
    if (parsed.origin === window.location.origin) {
      return { to: `${parsed.pathname}${parsed.search}${parsed.hash}` };
    }
    return { href: parsed.href };
  } catch {
    return null;
  }
}

export function resolveCmsLinkDestination(item) {
  const automaticUrl = resolveStaticLinkUrl(item?.title, item?.linkUrl);
  return getSafeCmsLink(automaticUrl || item?.linkUrl);
}
