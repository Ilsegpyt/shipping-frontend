import { useState } from "react";
import RichTextEditor from "./RichTextEditor";
import SharedCmsPageHero from "./SharedCmsPageHero";
import SharedContentSection from "./SharedContentSection";
import SharedSectionHeading from "./SharedSectionHeading";
import { cleanHtmlImages } from "../../utils/mediaUrl";
import "./DynamicPageBuilder.css";

export const GRID_LAYOUTS = {
  1: [{ id: "single", label: "Full width" }],
  2: [{ id: "two-columns", label: "Side by side" }, { id: "two-rows", label: "Stacked" }],
  3: [
    { id: "three-columns", label: "Three columns" },
    { id: "three-rows", label: "Stacked" },
    { id: "one-left-two-right", label: "One left, two right" },
    { id: "one-right-two-left", label: "Two left, one right" },
    { id: "one-top-two-bottom", label: "One top, two below" },
    { id: "two-top-one-bottom", label: "Two top, one below" },
  ],
  4: [
    { id: "four-columns", label: "Four columns" },
    { id: "four-rows", label: "Four stacked" },
    { id: "one-top-three-bottom", label: "One top, three columns below" },
    { id: "three-top-one-bottom", label: "Three columns top, one bottom" },
    { id: "two-by-two", label: "Two by two" },
    { id: "three-left-one-right", label: "Three left, one right" },
    { id: "one-left-three-right", label: "One left, three right" },
  ],
};

// Keep existing TipTap image positioning metadata functional in v2 rendering.
function prepareRichHtml(html) {
  const cleaned = cleanHtmlImages(html || "");
  if (typeof DOMParser === "undefined") return cleaned;
  const doc = new DOMParser().parseFromString(cleaned, "text/html");
  doc.querySelectorAll("img").forEach((image) => {
    const width = Number.parseFloat(image.getAttribute("data-image-width"));
    const height = Number.parseFloat(image.getAttribute("data-image-height"));
    const fit = image.getAttribute("data-image-fit");
    const layout = image.getAttribute("data-image-layout");
    const align = image.getAttribute("data-image-align");
    image.style.maxWidth = "100%";
    image.style.width = Number.isFinite(width) && width > 0 ? `min(${width}px, 100%)` : "100%";
    image.style.height = Number.isFinite(height) && height > 0 ? `${height}px` : "auto";
    image.style.objectFit = ["cover", "contain", "fill"].includes(fit) ? fit : "contain";
    image.style.borderRadius = "0";
    if (layout === "wrap-left" || layout === "wrap-right") {
      // Float within the same rich-text flow, so ALL following paragraphs
      // continue alongside the image and then use the full width below it.
      const imageBlock = image.parentElement?.tagName === "P" &&
        image.parentElement.textContent.trim() === ""
        ? image.parentElement : image;
      imageBlock.classList.add("dynamic-image-float", `dynamic-image-float--${layout}`);
      image.style.width = Number.isFinite(width) && width > 0
        ? `min(${width}px, 100%)` : "100%";
      // Keep the image inside a proportional floated area on desktops.
    } else if (layout === "left" || layout === "right") {
      const imageBlock = image.parentElement?.tagName === "P" ? image.parentElement : image;
      const textBlock = imageBlock.nextElementSibling;
      if (textBlock && !textBlock.querySelector("img")) {
        const wrapper = doc.createElement("div");
        wrapper.className = `dynamic-image-pair dynamic-image-pair--${layout}`;
        imageBlock.parentNode.insertBefore(wrapper, imageBlock);
        wrapper.appendChild(imageBlock);
        wrapper.appendChild(textBlock);
      }
    } else {
      image.style.display = "block";
      image.style.marginLeft = align === "center" || align === "right" ? "auto" : "0";
      image.style.marginRight = align === "center" || align === "left" ? "auto" : "0";
    }
  });
  return doc.body.innerHTML;
}

// Image + Text blocks have their own positioning, independent of editor newlines.
function prepareImageTextHtml(html, block) {
  const cleaned = cleanHtmlImages(html || "");
  if (typeof DOMParser === "undefined") return cleaned;
  const doc = new DOMParser().parseFromString(cleaned, "text/html");
  const image = doc.querySelector("img");
  if (!image) return prepareRichHtml(cleaned);
  const width = Number.parseFloat(block.imageWidth);
  const height = Number.parseFloat(block.imageHeight);
  const position = block.imagePosition || "left";
  const flow = block.imageFlow || "side";
  const imageNode = image.cloneNode(true);
  imageNode.removeAttribute("style");
  imageNode.style.width = "100%";
  imageNode.style.height = Number.isFinite(height) && height > 0 ? `${height}px` : "auto";
  imageNode.style.objectFit = block.imageFit || "contain";
  imageNode.style.maxWidth = "100%";
  // Remove the image only; preserve the rest of the rich-text document.
  image.remove();
  doc.querySelectorAll("p").forEach((p) => {
    if (!p.textContent.trim() && !p.querySelector("img,br")) p.remove();
  });
  const wrapper = doc.createElement("div");
  wrapper.className = `dynamic-image-text dynamic-image-text--${flow} dynamic-image-text--${position}`;
  wrapper.style.setProperty("--dynamic-image-width", `${Number.isFinite(width) && width > 0 ? Math.min(width, 80) : 40}%`);
  const media = doc.createElement("div");
  media.className = "dynamic-image-text__media";
  media.appendChild(imageNode);
  const content = doc.createElement("div");
  content.className = "dynamic-image-text__content";
  while (doc.body.firstChild) content.appendChild(doc.body.firstChild);
  wrapper.appendChild(media);
  wrapper.appendChild(content);
  doc.body.appendChild(wrapper);
  return doc.body.innerHTML;
}
function prepareBlockHtml(block) {
  return block.type === "richText" && block.contentMode === "imageText"
    ? prepareImageTextHtml(block.html, block)
    : prepareRichHtml(block.html);
}

const uid = (prefix) => `${prefix}-${crypto.randomUUID()}`;
const createBlock = (type = "richText") => ({ id: uid("block"), type, title: "", html: "", style: type === "highlight" ? "legacy" : undefined, linePosition: "top" });
const BLOCK_LABELS = { richText: "Content", highlight: "Highlight", closing: "Closing" };
const CONTENT_MODES = [
  ["richText", "Rich Text"],
  ["imageText", "Image + Text"],
  ["imageOnly", "Image Only — Full Cover"],
];
const createSectionBlock = (type) => createBlock(type);
const createContentBlock = (mode = "richText") => ({
  ...createBlock("richText"),
  contentMode: mode,
});
const createCard = () => ({ id: uid("card"), title: "", blocks: [createBlock()] });
// Keep the existing cards[] and blocks[] for backend v2 validation.
// contentOrder contains IDs of cards and section blocks in display order.
const sectionOrder = (section) => {
  const ids = [...(section.cards || []), ...(section.blocks || [])].map((item) => item.id);
  const saved = Array.isArray(section.contentOrder) ? section.contentOrder : [];
  return [...saved.filter((id) => ids.includes(id)), ...ids.filter((id) => !saved.includes(id))];
};
// A single ordered sequence for page sections and page-level blocks.
// Old pages without contentOrder keep their before/after block placement.
const pageOrder = (page) => {
  const sections = page.sections || [];
  const blocks = page.blocks || [];
  const ids = [...sections, ...blocks].map((item) => item.id);
  const saved = Array.isArray(page.contentOrder) ? page.contentOrder : [];
  if (saved.length) return [...saved.filter((id) => ids.includes(id)), ...ids.filter((id) => !saved.includes(id))];
  return [
    ...blocks.filter((b) => (b.position || "after") === "before").map((b) => b.id),
    ...sections.map((section) => section.id),
    ...blocks.filter((b) => (b.position || "after") !== "before").map((b) => b.id),
  ];
};
const movePageItem = (page, id, delta) => {
  const order = pageOrder(page);
  return { ...page, contentOrder: move(order, order.indexOf(id), delta) };
};
const moveSectionItem = (section, id, delta) => {
  const order = sectionOrder(section);
  return { ...section, contentOrder: move(order, order.indexOf(id), delta) };
};
const imagePositionOptions = ["center", "top", "bottom", "left", "right"];
const imageOnlyHtml = (html) => {
  const cleaned = cleanHtmlImages(html || "");
  if (typeof DOMParser === "undefined") return cleaned;
  const doc = new DOMParser().parseFromString(cleaned, "text/html");
  const img = doc.querySelector("img");
  if (!img) return "";
  // Use only the image source/alt; avoid TipTap inline dimensions overriding cover.
  const el = doc.createElement("img");
  el.setAttribute("src", img.getAttribute("src") || "");
  el.setAttribute("alt", img.getAttribute("alt") || "");
  return el.outerHTML;
};
const coverPosition = (value) => imagePositionOptions.includes(value) ? value : "center";
function ImageOnlyView({ html, position = "center", className = "", height }) {
  return <div className={`dynamic-cover-image ${className}`} style={{ "--dynamic-cover-position": coverPosition(position), ...(height ? { "--dynamic-cover-height": `${height}px` } : {}) }}
    dangerouslySetInnerHTML={{ __html: imageOnlyHtml(html) }} />;
}
export const createEmptyDynamicPage = () => ({ version: 2, introLabel: "", blocks: [], sections: [createSection()] });
function createSection() { return { id: uid("section"), label: "", title: "", subtitle: "", layout: "single", blocks: [], cards: [createCard()] }; }

export function parseDynamicPage(value) {
  try {
    const data = typeof value === "string" ? JSON.parse(value) : value;
    return data?.version === 2 && Array.isArray(data.sections) ? data : null;
  } catch { return null; }
}

function move(arr, index, delta) {
  const target = index + delta;
  if (target < 0 || target >= arr.length) return arr;
  const copy = [...arr];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

export function DynamicPageBuilder({ value, onChange }) {
  const [selected, setSelected] = useState(null);
  const sectionBlocks = (section) => Array.isArray(section.blocks) ? section.blocks : [];
  const updateSectionBlock = (si, bi, patch) => sectionChange(si, (section) => ({ ...section,
    blocks: sectionBlocks(section).map((block, index) => index === bi ? { ...block, ...patch } : block),
  }));
  const sections = value.sections || [];
  const pageBlocks = Array.isArray(value.blocks) ? value.blocks : [];
  const updatePageBlock = (bi, patch) => onChange({ ...value, blocks: pageBlocks.map((b,i) => i === bi ? { ...b, ...patch } : b) });
  const updateCardBlock = (si, ci, bi, patch) => modifyCard(si, ci, (card) => ({...card, blocks: card.blocks.map((block, i) => i === bi ? {...block, ...patch} : block) }));
  const renderBlockOptions = (block, onPatch, { isCard = false } = {}) => <>
    <label className="dynamic-field">Content Title (optional)<input value={block.title || ""} onChange={(e) => onPatch({ title: e.target.value })} placeholder="Optional title" /></label>
    {isCard && block.type === "richText" && <div className="dynamic-options">
      <label>Content Type
        <select value={CONTENT_MODES.some(([mode]) => mode === block.contentMode) ? block.contentMode : "richText"} onChange={(e) => onPatch({ contentMode: e.target.value })}>
          {CONTENT_MODES.map(([mode, label]) => <option key={mode} value={mode}>{label}</option>)}
        </select>
      </label>
      {block.contentMode === "imageText" && <div className="dynamic-image-settings">
        <label>Image Position
          <select value={block.imagePosition || "left"} onChange={(e) => onPatch({ imagePosition: e.target.value })}>
            <option value="left">Left</option><option value="right">Right</option>
            <option value="top">Top</option><option value="bottom">Bottom</option>
          </select>
        </label>
        <label>Text Behaviour
          <select value={block.imageFlow || "side"} onChange={(e) => onPatch({ imageFlow: e.target.value })}>
            <option value="side">Side by side (text stays in its column)</option>
            <option value="wrap">Wrap (text continues underneath image)</option>
          </select>
        </label>
        <label>Image Width (%)
          <input type="number" min="20" max="80" value={block.imageWidth || 40} onChange={(e) => onPatch({ imageWidth: Math.min(80, Math.max(20, Number(e.target.value) || 40)) })}/>
        </label>
        <label>Image Height (px, optional)
          <input type="number" min="0" max="1200" value={block.imageHeight || ""} placeholder="Auto" onChange={(e) => onPatch({ imageHeight: e.target.value })}/>
        </label>
        <label>Image Fit
          <select value={block.imageFit || "contain"} onChange={(e) => onPatch({ imageFit: e.target.value })}>
            <option value="contain">Contain (no cropping)</option><option value="cover">Cover (crop)</option>
          </select>
        </label>
      </div>}
      {block.contentMode === "imageOnly" && <label>Image Crop Position
        <select value={block.imagePosition || "center"} onChange={(e) => onPatch({ imagePosition: e.target.value })}>
          {imagePositionOptions.map((position) => <option key={position} value={position}>{position[0].toUpperCase() + position.slice(1)}</option>)}
        </select>
      </label>}
      <span className="dynamic-content-hint">
        {block.contentMode === "imageText" ? "Insert an image and your text using Edit content. The positioning settings above apply automatically; newlines do not change the chosen layout." :
         block.contentMode === "imageOnly" ? "Upload one image in Edit content. It will fill the entire card with Cover." :
         "Use the editor for formatted text."}
      </span>
    </div>}

  </>;
  const renderOrderedBlockEditor = (block, onPatch, controls, label, className = "") => (
    <div key={block.id} className={`dynamic-block dynamic-unified-content-block ${className}`}>
      <div className="dynamic-toolbar"><span>{label}</span>{controls}</div>
      {renderBlockOptions(block, onPatch)}
      <button className="dynamic-edit-button" type="button" onClick={() => setSelected(selected === block.id ? null : block.id)}>
        {selected === block.id ? "Close editor" : "Edit content"}
      </button>
      {selected === block.id
        ? <RichTextEditor value={block.html || ""} onChange={(html) => onPatch({ html })} />
        : <div className={`dynamic-preview dynamic-content-${block.type}`} dangerouslySetInnerHTML={{ __html: prepareBlockHtml(block) }} />}
    </div>
  );
  const updateSections = (next) => onChange({ ...value, sections: next });
  const changeSection = (i, next) => updateSections(sections.map((s, index) => index === i ? next : s));
  const sectionChange = (i, updater) => changeSection(i, updater(sections[i]));
  const modifyCard = (sectionIndex, cardIndex, updater) => sectionChange(sectionIndex, (section) => ({
    ...section,
    cards: section.cards.map((card, index) => index === cardIndex ? updater(card) : card),
  }));

  return <div className="dynamic-builder">
    <div className="dynamic-builder-heading"><strong>Page Layout Builder (v2)</strong><span>Original ILS styling with flexible grid layouts and TipTap rich text.</span></div>
    <div className="dynamic-section-editor dynamic-page-intro-editor">
      <strong>Page Intro</strong>
      <label className="dynamic-field">Intro Label
        <input value={value.introLabel || ""} onChange={(e) => onChange({...value, introLabel: e.target.value})} placeholder="Small text shown below the hero page title" />
      </label>
    </div>
    <div className="dynamic-toolbar dynamic-page-add">
      <strong>Page Content</strong>
      <button type="button" onClick={() => {
        const block = createBlock("highlight");
        onChange({ ...value, blocks: [...pageBlocks, block], contentOrder: [...pageOrder(value), block.id] });
      }}>+ Add Page Highlight</button>
      <button type="button" onClick={() => {
        const block = createBlock("closing");
        onChange({ ...value, blocks: [...pageBlocks, block], contentOrder: [...pageOrder(value), block.id] });
      }}>+ Add Page Closing</button>
      <button type="button" onClick={() => {
        const section = createSection();
        onChange({ ...value, sections: [...sections, section], contentOrder: [...pageOrder(value), section.id] });
      }}>+ Add Section</button>
    </div>
    {pageOrder(value).map((id, oi, order) => {
      const si = sections.findIndex((entry) => entry.id === id);
      const section = si >= 0 ? sections[si] : null;
      const bi = pageBlocks.findIndex((entry) => entry.id === id);
      const pageBlock = bi >= 0 ? pageBlocks[bi] : null;
      const controls = <div className="dynamic-order-controls">
        <button type="button" aria-label="Move up" disabled={oi === 0} onClick={() => onChange(movePageItem(value, id, -1))}>↑</button>
        <button type="button" aria-label="Move down" disabled={oi === order.length - 1} onClick={() => onChange(movePageItem(value, id, 1))}>↓</button>
        <button type="button" aria-label="Remove" disabled={Boolean(section && sections.length === 1)} onClick={() => {
          const contentOrder = order.filter((entry) => entry !== id);
          if (section) onChange({ ...value, sections: sections.filter((entry) => entry.id !== id), contentOrder });
          else onChange({ ...value, blocks: pageBlocks.filter((entry) => entry.id !== id), contentOrder });
        }}>×</button>
      </div>;
      if (pageBlock) return renderOrderedBlockEditor(
        pageBlock, (patch) => updatePageBlock(bi, patch), controls,
        `Page ${BLOCK_LABELS[pageBlock.type]}`, "dynamic-page-content-block"
      );
      if (!section) return null;
      const count = section.cards.length;
      const options = GRID_LAYOUTS[count] || [];
      return <div className="dynamic-section-editor" key={section.id}>
        <div className="dynamic-toolbar"><strong>Section {si + 1}</strong>{controls}</div>
        <div className="dynamic-field-grid">
          <label className="dynamic-field">Section Label<input value={section.label || ""} onChange={(e) => sectionChange(si,s=>({...s,label:e.target.value}))} placeholder="Optional small label" /></label>
          <label className="dynamic-field">Section Title<input value={section.title || ""} onChange={(e) => sectionChange(si,s=>({...s,title:e.target.value}))} placeholder="Optional section title" /></label>
          <label className="dynamic-field">Subtitle<input value={section.subtitle || ""} onChange={(e) => sectionChange(si,s=>({...s,subtitle:e.target.value}))} placeholder="Optional subtitle" /></label>
        </div>
        <div className="dynamic-options">
          <label>Section Display
            <select value={section.displayMode || "cards"} onChange={(e) => sectionChange(si, (s) => ({ ...s, displayMode: e.target.value }))}>
              <option value="cards">Cards + ordered highlights / closings</option>
              <option value="imageOnly">Image Only — Full Cover</option>
            </select>
          </label>
        </div>
        {section.displayMode === "imageOnly" && <div className="dynamic-block">
          <strong>Section Image Only</strong>
          <label className="dynamic-field">Image Position
            <select value={section.imagePosition || "center"} onChange={(e) => sectionChange(si, (s) => ({ ...s, imagePosition: e.target.value }))}>
              {imagePositionOptions.map((position) => <option key={position} value={position}>{position}</option>)}
            </select>
          </label>
          <label className="dynamic-field">Section Height (px)
            <input type="number" min="160" max="1600" value={section.imageHeight || 440} onChange={(e) => sectionChange(si, (s) => ({ ...s, imageHeight: Number(e.target.value) || 440 }))}/>
          </label>
          <RichTextEditor value={section.imageHtml || ""} onChange={(html) => sectionChange(si, (s) => ({ ...s, imageHtml: html }))}/>
          <ImageOnlyView html={section.imageHtml} position={section.imagePosition} className="dynamic-section-image-preview" />
          <p>Only the uploaded image is shown in this section. Cards are retained if you switch back.</p>
        </div>}
        {section.displayMode !== "imageOnly" && <div className="dynamic-options">
          <label>Cards <select value={count} onChange={(e) => {
            const nextCount = Number(e.target.value);
            sectionChange(si, (s) => ({ ...s, layout: GRID_LAYOUTS[nextCount][0].id,
              cards: Array.from({ length: nextCount }, (_, index) => s.cards[index] || createCard()) }));
          }}>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
          <label>Grid layout <select value={section.layout} onChange={(e) => sectionChange(si, (s) => ({ ...s, layout: e.target.value }))}>
            {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select></label>
        </div>}
        {section.displayMode !== "imageOnly" && <div className="dynamic-toolbar dynamic-section-block-actions">
          <span>Section content</span>
          <button type="button" onClick={() => sectionChange(si, (s) => ({ ...s, blocks: [...sectionBlocks(s), createSectionBlock("highlight")] }))}>+ Highlight</button>
          <button type="button" onClick={() => sectionChange(si, (s) => ({ ...s, blocks: [...sectionBlocks(s), createSectionBlock("closing")] }))}>+ Closing</button>
        </div>}
        {section.displayMode !== "imageOnly" && <div className={`dynamic-grid dynamic-grid--${section.layout}`}>
          {sectionOrder(section).map((itemId, orderIndex, orderedIds) => {
            const ci = section.cards.findIndex((card) => card.id === itemId);
            const bi = sectionBlocks(section).findIndex((block) => block.id === itemId);
            const block = bi >= 0 ? sectionBlocks(section)[bi] : null;
            const itemControls = <div className="dynamic-order-controls">
              <button type="button" aria-label="Move up" disabled={orderIndex === 0} onClick={() => sectionChange(si, (entry) => moveSectionItem(entry, itemId, -1))}>↑</button>
              <button type="button" aria-label="Move down" disabled={orderIndex === orderedIds.length - 1} onClick={() => sectionChange(si, (entry) => moveSectionItem(entry, itemId, 1))}>↓</button>
              {block && <button type="button" aria-label="Remove" onClick={() => sectionChange(si, (entry) => ({
                ...entry,
                blocks: sectionBlocks(entry).filter((item) => item.id !== itemId),
                contentOrder: sectionOrder(entry).filter((item) => item !== itemId),
              }))}>×</button>}
            </div>;
            if (block) return renderOrderedBlockEditor(
              block, (patch) => updateSectionBlock(si, bi, patch), itemControls,
              BLOCK_LABELS[block.type], "dynamic-ordered-block"
            );
            if (ci < 0) return null;
            const card = section.cards[ci];
            return <div className="dynamic-card" key={card.id}>
              <div className="dynamic-toolbar"><strong>Card {ci + 1}</strong>{itemControls}</div>
            <label className="dynamic-field">Card Title (optional)<input value={card.title || ""} onChange={(e) => modifyCard(si,ci,c=>({...c,title:e.target.value}))} placeholder="Optional card title" /></label>
            {card.blocks.map((block, bi) => <div className="dynamic-block" key={block.id}>
              <div className="dynamic-toolbar"><span>{block.type === "richText" ? (CONTENT_MODES.find(([mode]) => mode === (block.contentMode || "richText"))?.[1] || "Content") : BLOCK_LABELS[block.type]} {bi + 1}</span>
                <button type="button" disabled={bi === 0} onClick={() => modifyCard(si, ci, (c) => ({ ...c, blocks: move(c.blocks, bi, -1) }))}>↑</button>
                <button type="button" disabled={bi === card.blocks.length - 1} onClick={() => modifyCard(si, ci, (c) => ({ ...c, blocks: move(c.blocks, bi, 1) }))}>↓</button>
                <button type="button" disabled={card.blocks.length === 1} onClick={() => modifyCard(si, ci, (c) => ({ ...c, blocks: c.blocks.filter((_, i) => i !== bi) }))}>×</button>
              </div>
              {renderBlockOptions(block,(patch)=>updateCardBlock(si,ci,bi,patch), { isCard: true })}
              <button className="dynamic-edit-button" type="button" onClick={() => setSelected(selected === block.id ? null : block.id)}>{selected === block.id ? "Close editor" : "Edit content"}</button>
              {selected === block.id ? <RichTextEditor value={block.html} onChange={(html) => modifyCard(si, ci, (c) => ({ ...c, blocks: c.blocks.map((b, i) => i === bi ? { ...b, html } : b) }))} />
                : block.contentMode === "imageOnly" ? <ImageOnlyView html={block.html} position={block.imagePosition} className="dynamic-image-only-preview" />
                : <div className={`dynamic-preview dynamic-content-${block.type}`} dangerouslySetInnerHTML={{ __html: prepareBlockHtml(block) }} />}
            </div>)}
            <div className="dynamic-toolbar dynamic-card-add">
              {CONTENT_MODES.map(([mode, label]) => <button key={mode} type="button" onClick={() => modifyCard(si, ci, (c) => ({ ...c, blocks: [...c.blocks, createContentBlock(mode)] }))}>+ {label}</button>)}
              <button type="button" onClick={() => modifyCard(si, ci, (c) => ({ ...c, blocks: [...c.blocks, createBlock("highlight")] }))}>+ Highlight</button>
              <button type="button" onClick={() => modifyCard(si, ci, (c) => ({ ...c, blocks: [...c.blocks, createBlock("closing")] }))}>+ Closing</button>
            </div>
          </div>;
          })}
        </div>}
      </div>;
    })}
  </div>;
}

function RenderBlock({ block, isCard = false }) {
  if (!["richText", "highlight", "closing"].includes(block.type)) return null;
  if (isCard && block.type === "richText" && block.contentMode === "imageOnly")
    return <ImageOnlyView html={block.html} position={block.imagePosition} className="dynamic-card-cover" />;
  const variant = !isCard && block.type === "highlight" && block.style === "horizontal"
    ? `dynamic-content-highlight--horizontal dynamic-line--${block.linePosition === "bottom" ? "bottom" : "top"}` : "";
  return <div className={`dynamic-render-block ${block.type === "richText" ? "dynamic-plain-block" : `dynamic-content-${block.type}`} ${variant}`}>
    {block.title && <h3 className="dynamic-block-title">{block.title}</h3>}
    <div className="about-rich dynamic-rich" dangerouslySetInnerHTML={{ __html: prepareBlockHtml(block) }} />
  </div>;
}

// Do not render placeholder cards/blocks with no visible content.
function hasVisibleHtml(html) {
  if (!html || !html.trim()) return false;
  if (typeof DOMParser === "undefined")
    return /<img\b|<video\b|<iframe\b|<svg\b|<hr\b|[^<>\s]+/i.test(html.replace(/<[^>]*>/g, " "));
  const doc = new DOMParser().parseFromString(html, "text/html");
  return Boolean(doc.body.textContent?.replace(/\u00a0/g, " ").trim() || doc.body.querySelector("img, video, iframe, svg, hr"));
}
function hasVisibleBlock(block) {
  return Boolean(block.title?.trim()) || hasVisibleHtml(block.html);
}
function hasVisibleCard(card) {
  return Boolean(card.title?.trim()) || (card.blocks || []).some(hasVisibleBlock);
}

function OrderedSectionContent({ section }) {
  const cards = (section.cards || []).filter(hasVisibleCard);
  const blocks = (section.blocks || []).filter(hasVisibleBlock);
  const ordered = sectionOrder(section);
  const items = [];
  let run = [];
  const flush = () => {
    if (!run.length) return;
    // Full grid geometry when all cards are contiguous; split groups use a
    // natural responsive grid instead of applying a 4-card layout to 1 card.
    const layout = run.length === cards.length ? section.layout :
      run.length === 1 ? "single" : run.length === 2 ? "two-columns" :
      run.length === 3 ? "three-columns" : "four-columns";
    items.push(<div key={`cards-${run[0].id}`} className={`dynamic-grid dynamic-grid--${layout}`}>
      {run.map((card) => <article key={card.id} className={`dynamic-public-card ${!card.title?.trim() ? "dynamic-public-card--untitled" : ""} ${card.blocks?.length === 1 && card.blocks[0]?.contentMode === "imageOnly" && !card.title?.trim() ? "dynamic-public-card--image-only" : ""}`}>
        {card.title?.trim() && <h3 className="dynamic-card-title">{card.title}</h3>}
        {(card.blocks || []).filter(hasVisibleBlock).map((block) => <RenderBlock key={block.id} block={block} isCard />)}
      </article>)}
    </div>);
    run = [];
  };
  ordered.forEach((id) => {
    const card = cards.find((entry) => entry.id === id);
    if (card) { run.push(card); return; }
    flush();
    const block = blocks.find((entry) => entry.id === id);
    if (block) items.push(<RenderBlock key={block.id} block={block} />);
  });
  flush();
  return <>{items}</>;
}

export function DynamicPageRenderer({ page, parentTitle = "About ILS" }) {
  const data = parseDynamicPage(page?.pageContentOrder);
  if (!data) return null;
  const pageBlocks = Array.isArray(data.blocks) ? data.blocks : [];
  const renderPageItem = (id) => {
    const block = pageBlocks.find((entry) => entry.id === id);
    if (block) return <div key={id} className="dynamic-section-inner dynamic-page-block-inner"><RenderBlock block={block} /></div>;
    const section = (data.sections || []).find((entry) => entry.id === id);
    if (!section) return null;
    return <SharedContentSection key={id} className="dynamic-public-section">
      <div className="dynamic-section-inner">
        {section.displayMode !== "imageOnly" && <SharedSectionHeading label={section.label} title={section.title} subtitle={section.subtitle} />}
        {section.displayMode === "imageOnly" ?
          <ImageOnlyView html={section.imageHtml} position={section.imagePosition} className="dynamic-section-cover" height={section.imageHeight} /> :
          <OrderedSectionContent section={section} />}
      </div>
    </SharedContentSection>;
  };
  return <main className="dynamic-public-page ils-shared-content min-h-screen bg-brand-surface text-brand-text">
    <SharedCmsPageHero label={parentTitle} title={page.title || "ILS Egypt"} image={page.featuredImage || undefined}>
      {data.introLabel?.trim() && <p>{data.introLabel.trim()}</p>}
    </SharedCmsPageHero>
    <div className="dynamic-public-sections">
      {pageOrder(data).map(renderPageItem)}
    </div>
  </main>;
}
