import RichTextEditor from "./RichTextEditor";
import ContentBlockEditor from "./ContentBlockEditor";
import { useEffect, useState } from "react";

export const ABOUT_PAGE_MARKER = "<!--ILS_ABOUT_PAGE_V1-->";
export const ABOUT_PAGE_SCHEMA = "ils-about-page-v1";
const makeId = (prefix = "item") => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createEmptyAboutPage = () => ({
  schema: ABOUT_PAGE_SCHEMA,
  introLabel: "",
  introTitle: "",
  introText: "",
  sections: [],
  pageOrder: [],
  highlights: [],
  closings: [],
  legacyHtml: "",
});

const normalizeBlocks = (blocks, fallback = "") => {
  const result = Array.isArray(blocks) ? blocks.map((block, i) => ({
    id: block?.id || makeId(`block-${i}`),
    type: ["text", "highlight", "closing"].includes(block?.type) ? block.type : "text",
    text: block?.text || "",
  })) : [];
  if (!result.some((block) => block.type === "text")) result.unshift({ id: makeId("text"), type: "text", text: fallback });
  return result;
};

const validOrder = (data) => {
  const available = new Set([
    ...(data.sections || []).map((item) => `section:${item.id}`),
    ...(data.highlights || []).map((item) => `highlight:${item.id}`),
    ...(data.closings || []).map((item) => `closing:${item.id}`),
  ]);
  const order = Array.isArray(data.pageOrder) ? data.pageOrder.filter((item) => available.has(`${item.type}:${item.id}`)) : [];
  return order.length ? order : [
    ...(data.sections || []).map((item) => ({ type: "section", id: item.id })),
    ...(data.highlights || []).map((item) => ({ type: "highlight", id: item.id })),
    ...(data.closings || []).map((item) => ({ type: "closing", id: item.id })),
  ];
};

export function parseAboutPage(body = "") {
  if (typeof body !== "string" || !body.trim()) return createEmptyAboutPage();
  if (body.startsWith(ABOUT_PAGE_MARKER)) {
    try {
      const parsed = JSON.parse(body.slice(ABOUT_PAGE_MARKER.length));
      if (parsed?.schema === ABOUT_PAGE_SCHEMA) {
        const base = { ...createEmptyAboutPage(), ...parsed };
        base.sections = (Array.isArray(parsed.sections) ? parsed.sections : []).map((section, index) => ({
          id: section?.id || makeId(`section-${index}`),
          title: section?.title || "",
          label: section?.label || "",
          subtitle: section?.subtitle || "",
          contentBlocks: normalizeBlocks(section?.contentBlocks, section?.content || ""),
        }));
        base.highlights = (Array.isArray(parsed.highlights) ? parsed.highlights : []).map((item) => ({ id: item?.id || makeId("highlight"), text: item?.text || "" }));
        base.closings = (Array.isArray(parsed.closings) ? parsed.closings : []).map((item) => ({ id: item?.id || makeId("closing"), text: item?.text || "" }));
        base.pageOrder = validOrder(base);
        return base;
      }
    } catch (error) { console.error("Could not parse structured About ILS content", error); }
  }

  // Legacy HTML migration: preserve all existing markup in editable blocks.
  const doc = new DOMParser().parseFromString(body, "text/html");
  const nodes = Array.from(doc.body.children);
  const headingTags = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);
  const firstHeading = nodes.findIndex((node) => headingTags.has(node.tagName.toLowerCase()));
  const introNodes = firstHeading > 0 ? nodes.slice(0, firstHeading) : [];
  const contentNodes = firstHeading >= 0 ? nodes.slice(firstHeading) : nodes;
  const sections = [];
  let current = null;
  for (const node of contentNodes) {
    const tag = node.tagName.toLowerCase();
    if (headingTags.has(tag)) {
      current = { id: makeId("section"), title: node.textContent?.trim() || "", label: "", subtitle: "", contentBlocks: [{ id: makeId("text"), type: "text", text: "" }] };
      sections.push(current);
    } else {
      if (!current) {
        current = { id: makeId("section"), title: "", label: "", subtitle: "", contentBlocks: [{ id: makeId("text"), type: "text", text: "" }] };
        sections.push(current);
      }
      const previous = current.contentBlocks[0];
      previous.text += node.outerHTML || "";
    }
  }
  if (!sections.length && body.trim()) sections.push({ id: makeId("section"), title: "", label: "", subtitle: "", contentBlocks: [{ id: makeId("text"), type: "text", text: body }] });
  const introText = introNodes.map((node) => node.outerHTML).join("");
  const data = { ...createEmptyAboutPage(), introText, sections, legacyHtml: body };
  data.pageOrder = sections.map((item) => ({ type: "section", id: item.id }));
  return data;
}

export function serializeAboutPage(data) {
  const sections = (data.sections || []).map((section) => ({
    id: section.id || makeId("section"), title: section.title || "", label: section.label || "", subtitle: section.subtitle || "",
    contentBlocks: normalizeBlocks(section.contentBlocks, section.content || ""),
  }));
  const clean = { ...createEmptyAboutPage(), ...data, schema: ABOUT_PAGE_SCHEMA, sections,
    highlights: (data.highlights || []).map((item) => ({ id: item.id || makeId("highlight"), text: item.text || "" })),
    closings: (data.closings || []).map((item) => ({ id: item.id || makeId("closing"), text: item.text || "" })),
  };
  clean.pageOrder = validOrder(clean);
  return ABOUT_PAGE_MARKER + JSON.stringify(clean);
}

export function StructuredAboutEditor({ value, onChange, pageTitle = "About ILS Page" }) {
  const data = value || createEmptyAboutPage();
  const update = (patch) => onChange({ ...data, ...patch });
  const updateSection = (id, patch) => update({ sections: data.sections.map((item) => item.id === id ? { ...item, ...patch } : item) });
  const add = (type) => {
    const id = makeId(type);
    if (type === "section") update({ sections: [...data.sections, { id, title: "", label: "", subtitle: "", contentBlocks: [{ id: makeId("text"), type: "text", text: "" }] }], pageOrder: [...data.pageOrder, { type, id }] });
    else if (type === "highlight") update({ highlights: [...data.highlights, { id, text: "" }], pageOrder: [...data.pageOrder, { type, id }] });
    else update({ closings: [...data.closings, { id, text: "" }], pageOrder: [...data.pageOrder, { type, id }] });
  };
  const move = (index, direction) => {
    const next = [...data.pageOrder]; const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]]; update({ pageOrder: next });
  };
  const remove = (item) => {
    update({
      pageOrder: data.pageOrder.filter((entry) => !(entry.type === item.type && entry.id === item.id)),
      sections: item.type === "section" ? data.sections.filter((entry) => entry.id !== item.id) : data.sections,
      highlights: item.type === "highlight" ? data.highlights.filter((entry) => entry.id !== item.id) : data.highlights,
      closings: item.type === "closing" ? data.closings.filter((entry) => entry.id !== item.id) : data.closings,
    });
  };
  const field = "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100";
  return <div className="space-y-6 rounded-2xl border border-sky-200 bg-sky-50/30 p-4 sm:p-5">
    <header><h3 className="text-lg font-semibold text-slate-900">{pageTitle} — Structured Content</h3><p className="mt-1 text-sm text-slate-600">Edit the page using the same ordered rich-content model as Philosophy. Add, remove, and reorder any section.</p></header>
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="font-semibold text-slate-900">Page Intro</h4>
      <label className="block text-sm font-medium text-slate-700">Intro Label<input className={field} value={data.introLabel || ""} onChange={(e) => update({ introLabel: e.target.value })} /></label>
      <label className="block text-sm font-medium text-slate-700">Intro Title<input className={field} value={data.introTitle || ""} onChange={(e) => update({ introTitle: e.target.value })} /></label>
      <div><label className="mb-2 block text-sm font-medium text-slate-700">Intro Text</label><RichTextEditor value={data.introText || ""} onChange={(introText) => update({ introText })} /></div>
    </section>
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="font-semibold text-slate-900">Page Content Order</h4><p className="mt-1 text-sm text-slate-500">The public page follows this exact order.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => add("section")} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">+ Add Section</button><button type="button" onClick={() => add("highlight")} className="rounded-lg border border-sky-300 bg-white px-3 py-2 text-xs font-semibold text-sky-800">+ Page Highlight</button><button type="button" onClick={() => add("closing")} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700">+ Page Closing</button></div></div>
      {!data.pageOrder.length && <p className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">No content yet. Add a section, highlight, or closing.</p>}
      {data.pageOrder.map((item, index) => {
        const section = item.type === "section" ? data.sections.find((entry) => entry.id === item.id) : null;
        const global = item.type === "highlight" ? data.highlights.find((entry) => entry.id === item.id) : item.type === "closing" ? data.closings.find((entry) => entry.id === item.id) : null;
        if (item.type === "section" && !section || item.type !== "section" && !global) return null;
        const blocks = section?.contentBlocks || [];
        return <article key={`${item.type}-${item.id}`} className={`space-y-3 rounded-xl border p-4 ${item.type === "highlight" ? "border-sky-200 bg-white" : item.type === "closing" ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50/70"}`}>
          <div className="flex flex-wrap items-center justify-between gap-2"><div><span className="text-xs uppercase tracking-wide text-slate-500">Section {index + 1}</span><h5 className="font-semibold text-slate-900">{item.type === "section" ? section.title || `Section ${index + 1}` : item.type === "highlight" ? "Page Highlight" : "Page Closing"}</h5></div><div className="flex gap-1"><button type="button" disabled={index === 0} onClick={() => move(index, -1)} className="rounded border bg-white px-2 py-1 text-xs disabled:opacity-30">↑ Up</button><button type="button" disabled={index === data.pageOrder.length - 1} onClick={() => move(index, 1)} className="rounded border bg-white px-2 py-1 text-xs disabled:opacity-30">↓ Down</button><button type="button" onClick={() => remove(item)} className="rounded px-2 py-1 text-xs font-medium text-red-600">Remove</button></div></div>
          {section ? <div className="space-y-3"><div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-medium text-slate-700">Section Label<input className={field} value={section.label || ""} onChange={(e) => updateSection(item.id, { label: e.target.value })} /></label><label className="block text-sm font-medium text-slate-700">Section Title<input className={field} value={section.title || ""} onChange={(e) => updateSection(item.id, { title: e.target.value })} /></label></div><label className="block text-sm font-medium text-slate-700">Subtitle<input className={field} value={section.subtitle || ""} onChange={(e) => updateSection(item.id, { subtitle: e.target.value })} /></label><ContentBlockEditor blocks={blocks.length ? blocks : [{ id: `${section.id}-text`, type: "text", text: "" }]} onChange={(contentBlocks) => updateSection(item.id, { contentBlocks })} /></div> : <RichTextEditor value={global.text || ""} onChange={(text) => update({ [item.type === "highlight" ? "highlights" : "closings"]: (item.type === "highlight" ? data.highlights : data.closings).map((entry) => entry.id === item.id ? { ...entry, text } : entry) })} />}
        </article>;
      })}
    </section>
  </div>;
}

export function StructuredAboutRenderer({ page, parentTitle = "About ILS", styleVariant = "about" }) {
  const data = parseAboutPage(page?.body || "");
  const apiBase = "http://localhost:5250";
  const isCertificatesPage = (page?.title || "").trim().toLowerCase() === "certificates";

const [certificateViewer, setCertificateViewer] = useState(null);

useEffect(() => {
  if (!certificateViewer) return;

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      setCertificateViewer(null);
    }

    if (event.key === "ArrowRight") {
      setCertificateViewer((current) =>
        current
          ? {
              ...current,
              index: (current.index + 1) % current.images.length,
            }
          : null
      );
    }

    if (event.key === "ArrowLeft") {
      setCertificateViewer((current) =>
        current
          ? {
              ...current,
              index:
                (current.index - 1 + current.images.length) %
                current.images.length,
            }
          : null
      );
    }
  };

  document.addEventListener("keydown", handleKeyDown);

  return () => {
    document.removeEventListener("keydown", handleKeyDown);
  };
}, [certificateViewer]);


  const resolveImages = (html = "") => html.replace(/(src=["'])(\/(?!\/)[^"']+)/gi, `$1${apiBase}$2`);
  const prepareCertificateHtml = (html = "") => {
    if (!isCertificatesPage || !html || typeof DOMParser === "undefined") return html;

    const doc = new DOMParser().parseFromString(html, "text/html");
    const images = Array.from(doc.body.querySelectorAll("img"));
    if (!images.length) return html;

    // Each image becomes its own certificate card. A following text block ending
    // in ** is treated as that image's caption and the marker is not displayed.
    const entries = images.map((image) => {
      const imageContainer = image.closest("p, figure")?.querySelectorAll("img").length === 1
        ? image.closest("p, figure")
        : image;
      let captionElement = imageContainer.nextElementSibling;
      while (captionElement && !captionElement.textContent.trim() && !captionElement.querySelector("img")) {
        captionElement = captionElement.nextElementSibling;
      }

      const rawCaption = captionElement && !captionElement.querySelector("img")
        ? captionElement.textContent.replace(/\s+/g, " ").trim()
        : "";
      const hasCaptionMarker = /\*\*\s*$/.test(rawCaption);
      const caption = hasCaptionMarker ? rawCaption.replace(/\*\*\s*$/, "").trim() : "";

      return {
        image,
        imageContainer,
        captionElement: hasCaptionMarker ? captionElement : null,
        caption,
      };
    });

    const firstEntry = entries[0];
    const gallery = doc.createElement("div");
    gallery.className = "about-certificate-gallery";

    entries.forEach(({ image, caption }) => {
      const card = doc.createElement("figure");
      card.className = "about-certificate-card";
      const imageCopy = image.cloneNode(true);
      imageCopy.removeAttribute("width");
      imageCopy.removeAttribute("height");
      imageCopy.setAttribute("loading", "lazy");
      imageCopy.setAttribute("class", "about-certificate-image");
      card.appendChild(imageCopy);

      if (caption) {
        const figcaption = doc.createElement("figcaption");
        figcaption.className = "about-certificate-caption";
        figcaption.textContent = caption;
        card.appendChild(figcaption);
      }
      gallery.appendChild(card);
    });

    firstEntry.imageContainer.parentNode?.insertBefore(gallery, firstEntry.imageContainer);

    // Remove only image wrappers and captions explicitly marked with **.
    // All other rich-text content remains in its original order.
    const removed = new Set();
    entries.forEach(({ imageContainer, captionElement }) => {
      removed.add(imageContainer);
      if (captionElement) removed.add(captionElement);
    });
    removed.forEach((node) => {
      if (node !== gallery && node.parentNode) node.remove();
    });

    return doc.body.innerHTML;
  };
  const renderRich = (html, className = "") => {
    if (!html) return null;
    const preparedHtml = prepareCertificateHtml(html);
    return(
  <div
    className={`about-rich ${className}`}
    onDoubleClick={(event) => {
      if (!isCertificatesPage) return;

      const image = event.target.closest(
        "img.about-certificate-image"
      );

      if (!image) return;

      const gallery = image.closest(".about-certificate-gallery");
      if (!gallery) return;

      const images = Array.from(
        gallery.querySelectorAll("img.about-certificate-image")
      ).map((img) => ({
        src: img.src,
        alt: img.alt || "Certificate",
        caption:
          img.closest("figure")?.querySelector("figcaption")
            ?.textContent || "",
      }));

      const index = images.findIndex((item) => item.src === image.src);

      if (images.length) {
        setCertificateViewer({
          images,
          index: Math.max(index, 0),
        });
      }
    }}
    dangerouslySetInnerHTML={{
      __html: resolveImages(preparedHtml),
    }}
  />
);
  };
  const isSolutions = styleVariant === "solutions";
  return <main className="min-h-screen bg-white text-slate-900">
    <section className={`relative overflow-hidden ${isSolutions ? "bg-slate-950" : "bg-slate-950"} px-6 pb-16 pt-32 sm:px-8 lg:px-12`}><div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(14,165,233,0.22),transparent_35%)]" /><div className="relative mx-auto max-w-7xl">{isSolutions && <a href="/solutions" className="mb-10 inline-flex items-center gap-2 text-sm font-medium text-white/70 transition hover:text-white">← Back to Solutions</a>}<p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">{data.introLabel || parentTitle}</p><h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">{data.introTitle || page?.title || "About ILS"}</h1>{renderRich(data.introText, "mt-5 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg")}</div></section>
    <section className="px-6 py-12 sm:px-8 sm:py-16 lg:px-12"><div className="mx-auto max-w-7xl space-y-6">{data.pageOrder.map((item, index) => {
      const section = item.type === "section" ? data.sections.find((entry) => entry.id === item.id) : null;
      const global = item.type === "highlight" ? data.highlights.find((entry) => entry.id === item.id) : item.type === "closing" ? data.closings.find((entry) => entry.id === item.id) : null;
      if (item.type === "section" && !section || item.type !== "section" && !global) return null;
      if (item.type === "highlight") return <section key={item.id} className="rounded-2xl border-y border-slate-200 bg-slate-950 px-8 py-8 sm:px-10 lg:px-12"><div className="max-w-6xl border-l-4 border-sky-400 pl-6 text-base leading-8 text-slate-200 sm:text-lg [&_ul]:my-3 [&_ul]:ml-6 [&_ul]:list-disc [&_ol]:my-3 [&_ol]:ml-6 [&_ol]:list-decimal [&_li]:mb-1 [&_p]:mb-2">{renderRich(global.text, "")}</div></section>;
      if (item.type === "closing") return <section key={item.id} className="rounded-2xl px-6 py-6 sm:px-8 text-base leading-8 text-slate-600 sm:text-lg [&_ul]:my-3 [&_ul]:ml-6 [&_ul]:list-disc [&_ol]:my-3 [&_ol]:ml-6 [&_ol]:list-decimal [&_li]:mb-1 [&_p]:mb-2">{renderRich(global.text, "")}</section>;
      return <article key={section.id} className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10 ${isSolutions ? "transition-shadow hover:shadow-md" : ""}`}>{section.label && <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">{section.label}</p>}{section.title && <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{section.title}</h2>}{section.subtitle && <p className="mt-3 text-lg leading-7 text-slate-600">{section.subtitle}</p>}{(section.contentBlocks || []).map((block) => <div key={block.id} className={block.type === "highlight" ? "my-4 rounded-xl border-l-4 border-sky-400 bg-white p-4 text-sm leading-7 text-slate-700 [&_ul]:my-3 [&_ul]:ml-6 [&_ul]:list-disc [&_ol]:my-3 [&_ol]:ml-6 [&_ol]:list-decimal [&_li]:mb-1 [&_p]:mb-2" : block.type === "closing" ? "my-4 text-sm leading-7 text-slate-600 [&_ul]:my-3 [&_ul]:ml-6 [&_ul]:list-disc [&_ol]:my-3 [&_ol]:ml-6 [&_ol]:list-decimal [&_li]:mb-1 [&_p]:mb-2" : "text-slate-600"}>{renderRich(block.text, "text-base leading-8")}</div>)}</article>;
    })}{!data.pageOrder.length && <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">No content is available for this page in the CMS.</p>}</div></section>
    <style>{`.about-rich p{margin:.8rem 0}.about-rich ul,.about-rich ol{margin:1rem 0;padding-left:1.5rem}.about-rich ul{list-style:disc}.about-rich ol{list-style:decimal}.about-rich li{margin:.45rem 0}.about-rich img{max-width:100%;height:auto;border-radius:1rem;margin:1rem 0}.about-rich .about-certificate-gallery{display:grid;grid-template-columns:repeat(1,minmax(0,1fr));gap:1.25rem;margin:1.5rem 0}.about-rich .about-certificate-card{display:flex;min-width:0;flex-direction:column;overflow:hidden;border:1px solid #e2e8f0;border-radius:1rem;background:#fff;padding:.75rem;box-shadow:0 8px 24px rgb(15 23 42 / .07);transition:transform .2s ease,box-shadow .2s ease}.about-rich .about-certificate-card:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgb(15 23 42 / .12)}.about-rich img.about-certificate-image{display:block;width:100%;height:230px;object-fit:contain;background:#f8fafc;border-radius:.65rem;margin:0;padding:.5rem}.about-rich .about-certificate-caption{padding:.75rem .25rem .25rem;text-align:center;font-size:.875rem;font-weight:600;color:#334155}@media(min-width:640px){.about-rich .about-certificate-gallery{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(min-width:1024px){.about-rich .about-certificate-gallery{grid-template-columns:repeat(3,minmax(0,1fr))}}.about-rich strong{font-weight:600}.about-rich a{color:#0284c7;text-decoration:underline}`}</style>
    
{certificateViewer && (
  <div
    className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/95 p-3 backdrop-blur-sm sm:p-6"
    onClick={() => setCertificateViewer(null)}
    role="dialog"
    aria-modal="true"
    aria-label="Certificate image viewer"
  >
    <button
      type="button"
      onClick={() => setCertificateViewer(null)}
      className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-3xl text-white hover:bg-white/20"
      aria-label="Close image viewer"
    >
      ×
    </button>

    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        setCertificateViewer((current) => ({
          ...current,
          index:
            (current.index - 1 + current.images.length) %
            current.images.length,
        }));
      }}
      className="absolute left-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-3xl text-white hover:bg-white/20 sm:left-6 sm:h-14 sm:w-14"
      aria-label="Previous certificate"
    >
      ‹
    </button>

    <div
      className="flex max-h-[90vh] w-full max-w-6xl flex-col items-center"
      onClick={(event) => event.stopPropagation()}
    >
      <img
        src={certificateViewer.images[certificateViewer.index].src}
        alt={certificateViewer.images[certificateViewer.index].alt}
        className="max-h-[78vh] max-w-full rounded-lg object-contain"
      />

      {certificateViewer.images[certificateViewer.index].caption && (
        <p className="mt-4 text-center text-sm font-medium text-white sm:text-base">
          {certificateViewer.images[certificateViewer.index].caption}
        </p>
      )}

      <p className="mt-2 text-sm text-slate-300">
        {certificateViewer.index + 1} / {certificateViewer.images.length}
      </p>
    </div>

    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        setCertificateViewer((current) => ({
          ...current,
          index: (current.index + 1) % current.images.length,
        }));
      }}
      className="absolute right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-3xl text-white hover:bg-white/20 sm:right-6 sm:h-14 sm:w-14"
      aria-label="Next certificate"
    >
      ›
    </button>
  </div>
)}

  </main>;
}
