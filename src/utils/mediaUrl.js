const LOCALHOST_REGEX = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i;


/**
 * Strips localhost / 127.0.0.1 and ensures proper relative path or prefixed URL.
 * @param {string} url - The URL or path to clean.
 * @param {string} [apiBase=""] - Optional base URL to prepend.
 * @returns {string} Cleaned URL.
 */
// Frontend assets belong to Vite, not the API server.
const isFrontendAsset = (path) =>
  /^(?:\/src\/assets\/|\/assets\/|\/public\/)/i.test(path);

export function cleanImageUrl(url = "", apiBase = "") {
  if (!url || typeof url !== "string") return "";
  if (/^(?:data:|blob:)/i.test(url)) return url;

  // Preserve remote/CDN URLs, except legacy localhost links.
  if (/^https?:\/\//i.test(url) && !LOCALHOST_REGEX.test(url)) return url;

  let cleaned = url.replace(LOCALHOST_REGEX, "");
  if (!cleaned.startsWith("/")) cleaned = `/${cleaned}`;

  // Never send frontend assets to the backend API.
  if (isFrontendAsset(cleaned)) return cleaned;

  const base = (apiBase || "").replace(/\/$/, "");
  return base ? `${base}${cleaned}` : cleaned;
}

/** Normalize image src attributes without modifying unrelated HTML. */
export function cleanHtmlImages(html = "", apiBase = "") {
  if (!html || typeof html !== "string") return "";
  return html.replace(/(\bsrc\s*=\s*)(["'])(.*?)\2/gi, (match, prefix, quote, url) =>
    `${prefix}${quote}${cleanImageUrl(url, apiBase)}${quote}`
  );
}
