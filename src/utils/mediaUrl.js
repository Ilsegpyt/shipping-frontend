const LOCALHOST_REGEX = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i;
const LOCALHOST_GLOBAL_REGEX = /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/gi;

/**
 * Strips localhost / 127.0.0.1 and ensures proper relative path or prefixed URL.
 * @param {string} url - The URL or path to clean.
 * @param {string} [apiBase=""] - Optional base URL to prepend.
 * @returns {string} Cleaned URL.
 */
export function cleanImageUrl(url = "", apiBase = "") {
  if (!url || typeof url !== "string") return "";

  if (url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }

  // Strip localhost / 127.0.0.1 with any port
  let cleaned = url.replace(LOCALHOST_REGEX, "");

  // If still an absolute URL with protocol (e.g. https://cdn.example.com), leave untouched
  if (/^https?:\/\//i.test(cleaned)) {
    return cleaned;
  }

  // Ensure leading slash for relative paths
  if (!cleaned.startsWith("/")) {
    cleaned = `/${cleaned}`;
  }

  const base = (apiBase || "").replace(/\/$/, "");
  return base ? `${base}${cleaned}` : cleaned;
}

/**
 * Sanitizes rich text HTML content to ensure image src URLs do not point to localhost.
 * @param {string} html - HTML string to sanitize.
 * @param {string} [apiBase=""] - Optional base URL.
 * @returns {string} Sanitized HTML string.
 */
export function cleanHtmlImages(html = "", apiBase = "") {
  if (!html || typeof html !== "string") return "";

  const base = (apiBase || "").replace(/\/$/, "");

  // 1. Replace all localhost / 127.0.0.1 variations
  let result = html.replace(LOCALHOST_GLOBAL_REGEX, base);

  // 2. Fix src="uploads/..." missing leading slash
  result = result.replace(/(src=["'])uploads\//gi, "$1/uploads/");

  // 3. If apiBase is provided, prefix root-relative paths
  if (base) {
    result = result.replace(/(src=["'])(\/(?!\/)[^"']+)/gi, `$1${base}$2`);
  }

  return result;
}
