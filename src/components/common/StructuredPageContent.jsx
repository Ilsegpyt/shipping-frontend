import "./SharedCmsContentLayout.css";
import "./SharedCmsImageStyles.css";
import SharedSectionHeading from "./SharedSectionHeading";
import SharedCmsPageHero from "./SharedCmsPageHero";
import SharedContentSection from "./SharedContentSection";
import RichTextEditor from "./RichTextEditor";
import { cleanHtmlImages } from "../../utils/mediaUrl";


export const STRUCTURED_PAGE_MARKER = "<!--ILS_STRUCTURED_PAGE_V1-->";
export const STRUCTURED_PAGE_SCHEMA = "ils-structured-page-v1";

const makeId = (prefix = "section") => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export function createEmptyStructuredPage() {
  return { schema: STRUCTURED_PAGE_SCHEMA, introLabel: "", introTitle: "", introText: "", sections: [], legacyHtml: "" };
}

export function parseStructuredPage(body = "") {
  if (typeof body !== "string" || !body.trim()) return createEmptyStructuredPage();
  if (body.startsWith(STRUCTURED_PAGE_MARKER)) {
    try {
      const data = JSON.parse(body.slice(STRUCTURED_PAGE_MARKER.length));
      if (data?.schema === STRUCTURED_PAGE_SCHEMA) return { ...createEmptyStructuredPage(), ...data, sections: Array.isArray(data.sections) ? data.sections : [] };
    } catch (error) { console.error("Could not parse structured CMS page", error); }
  }

  // One-time migration: preserve HTML while splitting the existing content by headings.
  const doc = new DOMParser().parseFromString(body, "text/html");
  const nodes = Array.from(doc.body.children);
  const headings = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);
  const firstHeading = nodes.findIndex((node) => headings.has(node.tagName.toLowerCase()));
  const introNodes = firstHeading < 0 ? [] : nodes.slice(0, firstHeading);
  const sectionNodes = firstHeading < 0 ? nodes : nodes.slice(firstHeading);
  const sections = [];
  let current = null;
  sectionNodes.forEach((node, index) => {
    const tag = node.tagName.toLowerCase();
    if (headings.has(tag)) {
      current = { id: makeId("section"), label: "", title: node.textContent?.trim() || "", subtitle: "", content: "" };
      sections.push(current);
    } else {
      if (!current) {
        current = { id: makeId("section"), label: "", title: "", subtitle: "", content: "" };
        sections.push(current);
      }
      current.content += node.outerHTML || "";
    }
  });
  const introText = introNodes.map((node) => node.outerHTML).join("");
  if (!sections.length && !introText) sections.push({ id: makeId("section"), label: "", title: "", subtitle: "", content: body });
  return { ...createEmptyStructuredPage(), introText, sections, legacyHtml: body };
}

export function serializeStructuredPage(data) {
  return STRUCTURED_PAGE_MARKER + JSON.stringify({ ...createEmptyStructuredPage(), ...data, schema: STRUCTURED_PAGE_SCHEMA, sections: (data.sections || []).map((section) => ({ id: section.id || makeId(), label: section.label || "", title: section.title || "", subtitle: section.subtitle || "", content: section.content || "" })) });
}

export function StructuredPageEditor({ value, onChange }) {
  const data = value || createEmptyStructuredPage();
  const update = (patch) => onChange({ ...data, ...patch });
  const updateSection = (index, patch) => update({ sections: data.sections.map((item, i) => i === index ? { ...item, ...patch } : item) });
  const addSection = () => update({ sections: [...data.sections, { id: makeId(), label: "", title: "", subtitle: "", content: "" }] });
  const moveSection = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= data.sections.length) return;
    const sections = [...data.sections]; [sections[index], sections[target]] = [sections[target], sections[index]]; update({ sections });
  };
  const inputClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100";
  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50/40 p-4">
        <div>
          <h3 className="font-semibold text-sky-800">Shared Page Intro</h3>
          <p className="mt-1 text-sm text-slate-500">
            This common editor is used by About ILS pages.
          </p>
        </div>
        <label className="block text-sm font-medium text-sky-800">
          Intro Label
          <input
            className={`${inputClass} mt-1`}
            value={data.introLabel}
            onChange={(e) => update({ introLabel: e.target.value })}
            placeholder="e.g. About ILS"
          />
        </label>
        <label className="block text-sm font-medium text-sky-800">
          Intro Title
          <input
            className={`${inputClass} mt-1`}
            value={data.introTitle}
            onChange={(e) => update({ introTitle: e.target.value })}
            placeholder="Optional page intro heading"
          />
        </label>
        <div>
          <label className="mb-2 block text-sm font-medium text-sky-800">
            Intro Content
          </label>
          <RichTextEditor
            value={data.introText || ""}
            onChange={(introText) => update({ introText })}
          />
        </div>
      </section>
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-sky-800">
              Ordered Page Sections
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Add, edit, remove, and reorder content. Changes are saved in the
              CMS body.
            </p>
          </div>
          <button
            type="button"
            onClick={addSection}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            + Add Section
          </button>
        </div>
        {!data.sections.length && (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            No sections yet. Add a section to begin.
          </p>
        )}
        {data.sections.map((section, index) => (
          <article
            key={section.id || index}
            className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-semibold text-slate-800">
                Section {index + 1}
              </h4>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveSection(index, -1)}
                  className="rounded border px-3 py-1.5 text-xs disabled:opacity-30"
                >
                  ↑ Up
                </button>
                <button
                  type="button"
                  disabled={index === data.sections.length - 1}
                  onClick={() => moveSection(index, 1)}
                  className="rounded border px-3 py-1.5 text-xs disabled:opacity-30"
                >
                  ↓ Down
                </button>
                <button
                  type="button"
                  onClick={() =>
                    update({
                      sections: data.sections.filter((_, i) => i !== index),
                    })
                  }
                  className="rounded px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-sky-800">
                Label
                <input
                  className={`${inputClass} mt-1`}
                  value={section.label || ""}
                  onChange={(e) =>
                    updateSection(index, { label: e.target.value })
                  }
                  placeholder="Optional small label"
                />
              </label>
              <label className="block text-sm font-medium text-sky-800">
                Section Title
                <input
                  className={`${inputClass} mt-1`}
                  value={section.title || ""}
                  onChange={(e) =>
                    updateSection(index, { title: e.target.value })
                  }
                  placeholder="Section title"
                />
              </label>
            </div>
            <label className="block text-sm font-medium text-sky-800">
              Subtitle
              <input
                className={`${inputClass} mt-1`}
                value={section.subtitle || ""}
                onChange={(e) =>
                  updateSection(index, { subtitle: e.target.value })
                }
                placeholder="Optional subtitle"
              />
            </label>
            <div>
              <label className="mb-2 block text-sm font-medium text-sky-800">
                Rich Content
              </label>
              <RichTextEditor
                value={section.content || ""}
                onChange={(content) => updateSection(index, { content })}
              />
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

// Public presentation only: preserve stored CMS HTML and image attributes.
// Match the image/text wrapper used by StructuredAboutRenderer.
function prepareStructuredRichHtml(html = "") {
  const cleaned = cleanHtmlImages(html);
  if (!cleaned || typeof DOMParser === "undefined") return cleaned;
  const doc = new DOMParser().parseFromString(cleaned, "text/html");

  doc.querySelectorAll('img[data-image-layout="left"], img[data-image-layout="right"]').forEach((image) => {
    const imageBlock = image.parentElement?.tagName === "P" ? image.parentElement : image;
    const textBlock = imageBlock.nextElementSibling;
    if (!imageBlock.parentNode || !textBlock || textBlock.querySelector("img")) return;

    const wrapper = doc.createElement("div");
    wrapper.className = "about-image-layout";
    wrapper.setAttribute("data-image-layout", image.getAttribute("data-image-layout") || "left");
    wrapper.setAttribute("data-image-align", image.getAttribute("data-image-align") || "center");
    const imageColumn = doc.createElement("div");
    imageColumn.className = "about-image-layout__image";
    const textColumn = doc.createElement("div");
    textColumn.className = "about-image-layout__text";
    imageBlock.parentNode.insertBefore(wrapper, imageBlock);
    wrapper.append(imageColumn, textColumn);
    imageColumn.appendChild(imageBlock);
    textColumn.appendChild(textBlock);
  });

  doc.querySelectorAll("img").forEach((image) => {
    const width = Number.parseFloat(image.getAttribute("data-image-width"));
    const height = Number.parseFloat(image.getAttribute("data-image-height"));
    const hasWidth = Number.isFinite(width) && width > 0;
    const hasHeight = Number.isFinite(height) && height > 0;
    if (hasWidth) image.style.width = `min(${width}px, 100%)`;
    image.style.maxWidth = "100%";
    const fit = image.getAttribute("data-image-fit");
    const hasFit = ["fill", "cover", "contain"].includes(fit);
    image.style.height = "auto";
    if (hasFit) {
      image.style.objectFit = fit;
      // A side-by-side Fill image must inherit its rendered column height.
      // Inline !important pixel heights prevent stretching on the Y-axis.
      const isSideFill = fit === "fill" &&
        ["left", "right"].includes(image.getAttribute("data-image-layout"));
      if (isSideFill) image.style.removeProperty("height");
      else if (fit === "fill" && !hasHeight) image.style.setProperty("height", "320px", "important");
      else if (hasHeight) image.style.setProperty("height", `${height}px`, "important");
    }
    if (hasWidth && hasHeight) image.style.aspectRatio = `${width} / ${height}`;
    image.style.borderRadius = "0";
    image.style.float = "none";
    const layout = image.getAttribute("data-image-layout") || "above";
    const align = image.getAttribute("data-image-align") || "left";
    if (layout === "left" || layout === "right") {
      image.style.margin = "0";
    } else {
      image.style.marginLeft = align === "center" || align === "right" ? "auto" : "0";
      image.style.marginRight = align === "center" || align === "left" ? "auto" : "0";
    }
  });
  return doc.body.innerHTML;
}

export function StructuredPageRenderer({ page, parentTitle = "About ILS" }) {
  const body = page?.body || "";
  let data;
  try { data = body.startsWith(STRUCTURED_PAGE_MARKER) ? JSON.parse(body.slice(STRUCTURED_PAGE_MARKER.length)) : parseStructuredPage(body); }
  catch { data = parseStructuredPage(body); }
  const hasIntro = Boolean(data.introLabel || data.introTitle || data.introText);
  return (
    <main className="ils-shared-content min-h-screen bg-slate-50 text-sky-800">
      <SharedCmsPageHero label={data.introLabel || parentTitle} title={data.introTitle || page?.title || "About ILS"} image={page?.featuredImage || undefined}>
        {data.introText && (
          <div
            className="structured-rich mt-5 max-w-3xl text-sm leading-7 text-slate-100 sm:text-base sm:leading-8"
            dangerouslySetInnerHTML={{ __html: prepareStructuredRichHtml(data.introText) }}
          />
        )}
      </SharedCmsPageHero>
      <section className="px-6 py-12 sm:px-8 sm:py-16 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-6">
          {!hasIntro && !data.sections?.length && (
            <p className="rounded-none border border-brand-border bg-white p-8 text-center text-brand-primary">
              No content is available for this page in the CMS.
            </p>
          )}
          {(data.sections || []).map((section, index) => (
            <SharedContentSection key={section.id || index}>
              <div className="p-6 sm:p-8 lg:p-10">
                <SharedSectionHeading label={section.label} title={section.title} subtitle={section.subtitle} />
                {section.content && (
                  <div
                    className="structured-rich mt-5 text-base leading-8 text-brand-primary"
                    dangerouslySetInnerHTML={{ __html: prepareStructuredRichHtml(section.content) }}
                  />
                )}
              </div>
            </SharedContentSection>
          ))}
        </div>
      </section>
      <style>{`.structured-rich h1 { font-size: 3rem; line-height: 1.2; }

.structured-rich p{margin:.8rem 0}
    .structured-rich ul,
    .structured-rich ol{
    margin:1rem 0;padding-left:1.5rem
    }
    .structured-rich ul{
    list-style:disc
    }
    .structured-rich ol{
    list-style:decimal
    }
    .structured-rich li{
    margin:.45rem 0
    }
    .structured-rich img{
    max-width:100%;height:auto;border-radius:0;margin:1rem 0
    }
    
/* Side-by-side CMS images use the shared .about-image-layout wrapper. */
.structured-rich img[data-image-layout="left"],
.structured-rich img[data-image-layout="right"] { float: none; display: block; }

/* Vertical layout */
.structured-rich img[data-image-layout="above"],
.structured-rich img[data-image-layout="below"] {
  float: none;
  display: block;
  margin: 1rem 0;
}

/* Responsive layout */
@media (max-width: 639px) {
  .structured-rich img[data-image-layout="left"],
  .structured-rich img[data-image-layout="right"] {
    float: none;
    display: block;
    max-width: 100%;
    margin: 1rem auto;
  }
}

    
.structured-rich strong {
  color: inherit;
  font-weight: 700;
}

.structured-rich a {
  color: #0284c7;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.structured-rich a:hover {
  color: #0369a1;
}
`}</style>
    </main>
  );
}
