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
  const path = normalizePath(existingUrl);
  const page = HERO_PAGES.find(item => item.titles.includes(heading))
    || HERO_PAGES.find(item => item.paths.includes(path));
  return page?.paths[0] || "";
}
