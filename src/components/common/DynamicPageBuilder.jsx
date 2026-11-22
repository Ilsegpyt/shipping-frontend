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
    { id: "one-left-two-right", label: "One left, two right" },
    { id: "one-right-two-left", label: "Two left, one right" },
    { id: "one-top-two-bottom", label: "One top, two below" },
    { id: "two-top-one-bottom", label: "Two top, one below" },
  ],
  4: [
    { id: "four-columns", label: "Four columns" },
    { id: "four-rows", label: "Four stacked" },
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

const uid = (prefix) => `${prefix}-${crypto.randomUUID()}`;
const createBlock = (type = "richText") => ({ id: uid("block"), type, title: "", html: "", style: type === "highlight" ? "legacy" : undefined, linePosition: "top" });
const BLOCK_LABELS = { richText: "Rich Text", highlight: "Highlight", closing: "Closing" };
const createSectionBlock = (type) => ({ ...createBlock(type), position: "after" });
const createCard = () => ({ id: uid("card"), title: "", blocks: [createBlock()] });
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
    {block.type === "highlight" && !isCard && <div className="dynamic-options">
      <label>Highlight Style <select value={block.style || "legacy"} onChange={(e) => onPatch({ style: e.target.value })}><option value="legacy">Original v1 style</option><option value="horizontal">Horizontal line</option></select></label>
      {block.style === "horizontal" && <label>Line Position <select value={block.linePosition || "top"} onChange={(e) => onPatch({ linePosition: e.target.value })}><option value="top">Top</option><option value="bottom">Bottom</option></select></label>}
    </div>}
  </>;
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
    <div className="dynamic-section-editor">
      <div className="dynamic-toolbar"><strong>Page Content</strong>
        <button type="button" onClick={() => onChange({...value, blocks: [...pageBlocks, createBlock("highlight")]})}>+ Add Page Highlight</button>
        <button type="button" onClick={() => onChange({...value, blocks: [...pageBlocks, createBlock("closing")]})}>+ Add Page Closing</button>
      </div>
      {pageBlocks.map((block, bi) => <div className="dynamic-block" key={block.id}>
        <div className="dynamic-toolbar"><strong>Page {BLOCK_LABELS[block.type]}</strong>
          <label>Position <select value={block.position || "after"} onChange={(e) => updatePageBlock(bi,{position:e.target.value})}><option value="before">Before sections</option><option value="after">After sections</option></select></label>
          <button type="button" disabled={bi===0} onClick={() => onChange({...value, blocks:move(pageBlocks,bi,-1)})}>↑</button>
          <button type="button" disabled={bi===pageBlocks.length-1} onClick={() => onChange({...value, blocks:move(pageBlocks,bi,1)})}>↓</button>
          <button type="button" onClick={() => onChange({...value, blocks:pageBlocks.filter((_,i)=>i!==bi)})}>Remove</button>
        </div>
        {renderBlockOptions(block,(patch)=>updatePageBlock(bi,patch))}
        <RichTextEditor value={block.html || ""} onChange={(html)=>updatePageBlock(bi,{html})}/>
      </div>)}
    </div>
    {sections.map((section, si) => {
      const count = section.cards.length;
      const options = GRID_LAYOUTS[count] || [];
      return <div className="dynamic-section-editor" key={section.id}>
        <div className="dynamic-toolbar">
          <strong>Section {si + 1}</strong>
          <button type="button" disabled={si === 0} onClick={() => updateSections(move(sections, si, -1))}>↑ Section</button>
          <button type="button" disabled={si === sections.length - 1} onClick={() => updateSections(move(sections, si, 1))}>↓ Section</button>
          <button type="button" disabled={sections.length === 1} onClick={() => updateSections(sections.filter((_, i) => i !== si))}>Remove</button>
        </div>
        <div className="dynamic-field-grid">
          <label className="dynamic-field">Section Label<input value={section.label || ""} onChange={(e) => sectionChange(si,s=>({...s,label:e.target.value}))} placeholder="Optional small label" /></label>
          <label className="dynamic-field">Section Title<input value={section.title || ""} onChange={(e) => sectionChange(si,s=>({...s,title:e.target.value}))} placeholder="Optional section title" /></label>
          <label className="dynamic-field">Subtitle<input value={section.subtitle || ""} onChange={(e) => sectionChange(si,s=>({...s,subtitle:e.target.value}))} placeholder="Optional subtitle" /></label>
        </div>
        <div className="dynamic-options">
          <label>Cards <select value={count} onChange={(e) => {
            const nextCount = Number(e.target.value);
            sectionChange(si, (s) => ({ ...s, layout: GRID_LAYOUTS[nextCount][0].id,
              cards: Array.from({ length: nextCount }, (_, index) => s.cards[index] || createCard()) }));
          }}>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
          <label>Grid layout <select value={section.layout} onChange={(e) => sectionChange(si, (s) => ({ ...s, layout: e.target.value }))}>
            {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select></label>
        </div>
        <div className="dynamic-toolbar dynamic-section-block-actions">
          <span>Section content</span>
          <button type="button" onClick={() => sectionChange(si, (s) => ({ ...s, blocks: [...sectionBlocks(s), createSectionBlock("highlight")] }))}>+ Highlight</button>
          <button type="button" onClick={() => sectionChange(si, (s) => ({ ...s, blocks: [...sectionBlocks(s), createSectionBlock("closing")] }))}>+ Closing</button>
        </div>
        {sectionBlocks(section).map((block, bi) => <div key={block.id} className={`dynamic-block dynamic-block--${block.type}`}>
          <div className="dynamic-toolbar"><strong>{BLOCK_LABELS[block.type]}</strong>
            <label>Position <select value={block.position || "after"} onChange={(e) => updateSectionBlock(si, bi, { position: e.target.value })}><option value="before">Before cards</option><option value="after">After cards</option></select></label>
            <button type="button" disabled={bi === 0} onClick={() => sectionChange(si, (s) => ({ ...s, blocks: move(sectionBlocks(s), bi, -1) }))}>↑</button>
            <button type="button" disabled={bi === sectionBlocks(section).length - 1} onClick={() => sectionChange(si, (s) => ({ ...s, blocks: move(sectionBlocks(s), bi, 1) }))}>↓</button>
            <button type="button" onClick={() => sectionChange(si, (s) => ({ ...s, blocks: sectionBlocks(s).filter((_, i) => i !== bi) }))}>Remove</button>
          </div>
          {renderBlockOptions(block, (patch) => updateSectionBlock(si, bi, patch))}
          <RichTextEditor value={block.html || ""} onChange={(html) => updateSectionBlock(si, bi, { html })} />
        </div>)}
        <div className={`dynamic-grid dynamic-grid--${section.layout}`}>
          {section.cards.map((card, ci) => <div className="dynamic-card" key={card.id}>
            <div className="dynamic-toolbar"><strong>Card {ci + 1}</strong>
              <button type="button" disabled={ci === 0} onClick={() => sectionChange(si, (s) => ({ ...s, cards: move(s.cards, ci, -1) }))}>←</button>
              <button type="button" disabled={ci === count - 1} onClick={() => sectionChange(si, (s) => ({ ...s, cards: move(s.cards, ci, 1) }))}>→</button>
            </div>
            <label className="dynamic-field">Card Title (optional)<input value={card.title || ""} onChange={(e) => modifyCard(si,ci,c=>({...c,title:e.target.value}))} placeholder="Optional card title" /></label>
            {card.blocks.map((block, bi) => <div className="dynamic-block" key={block.id}>
              <div className="dynamic-toolbar"><span>{BLOCK_LABELS[block.type]} {bi + 1}</span>
                <button type="button" disabled={bi === 0} onClick={() => modifyCard(si, ci, (c) => ({ ...c, blocks: move(c.blocks, bi, -1) }))}>↑</button>
                <button type="button" disabled={bi === card.blocks.length - 1} onClick={() => modifyCard(si, ci, (c) => ({ ...c, blocks: move(c.blocks, bi, 1) }))}>↓</button>
                <button type="button" disabled={card.blocks.length === 1} onClick={() => modifyCard(si, ci, (c) => ({ ...c, blocks: c.blocks.filter((_, i) => i !== bi) }))}>×</button>
              </div>
              {renderBlockOptions(block,(patch)=>updateCardBlock(si,ci,bi,patch), { isCard: true })}
              <button className="dynamic-edit-button" type="button" onClick={() => setSelected(selected === block.id ? null : block.id)}>{selected === block.id ? "Close editor" : "Edit content"}</button>
              {selected === block.id ? <RichTextEditor value={block.html} onChange={(html) => modifyCard(si, ci, (c) => ({ ...c, blocks: c.blocks.map((b, i) => i === bi ? { ...b, html } : b) }))} />
                : <div className={`dynamic-preview dynamic-content-${block.type}`} dangerouslySetInnerHTML={{ __html: prepareRichHtml(block.html) }} />}
            </div>)}
            <div className="dynamic-toolbar dynamic-card-add">
              {Object.entries(BLOCK_LABELS).map(([type, label]) => <button key={type} type="button" onClick={() => modifyCard(si, ci, (c) => ({ ...c, blocks: [...c.blocks, createBlock(type)] }))}>+ {label}</button>)}
            </div>
          </div>)}
        </div>
      </div>;
    })}
    <button className="dynamic-add" type="button" onClick={() => updateSections([...sections, createSection()])}>+ Add Section</button>
  </div>;
}

function RenderBlock({ block, isCard = false }) {
  if (!["richText", "highlight", "closing"].includes(block.type)) return null;
  const variant = !isCard && block.type === "highlight" && block.style === "horizontal"
    ? `dynamic-content-highlight--horizontal dynamic-line--${block.linePosition === "bottom" ? "bottom" : "top"}` : "";
  return <div className={`dynamic-render-block ${block.type === "richText" ? "dynamic-plain-block" : `dynamic-content-${block.type}`} ${variant}`}>
    {block.title && <h3 className="dynamic-block-title">{block.title}</h3>}
    <div className="about-rich dynamic-rich" dangerouslySetInnerHTML={{ __html: prepareRichHtml(block.html) }} />
  </div>;
}

export function DynamicPageRenderer({ page, parentTitle = "About ILS" }) {
  const data = parseDynamicPage(page?.pageContentOrder);
  if (!data) return null;
  const pageBlocks = Array.isArray(data.blocks) ? data.blocks : [];
  const renderPageBlocks = (position) => pageBlocks.filter((b) => (b.position || "after") === position)
    .map((b) => <RenderBlock key={b.id} block={b} />);
  return <main className="dynamic-public-page ils-shared-content min-h-screen bg-brand-surface text-brand-text">
    <SharedCmsPageHero label={parentTitle} title={page.title || "ILS Egypt"} image={page.featuredImage || undefined}>
      {data.introLabel?.trim() && <p>{data.introLabel.trim()}</p>}
    </SharedCmsPageHero>
    <div className="dynamic-public-sections">
      {renderPageBlocks("before")}
      {(data.sections || []).map((section) => <SharedContentSection key={section.id} className="dynamic-public-section">
        <div className="dynamic-section-inner">
          <SharedSectionHeading label={section.label} title={section.title} subtitle={section.subtitle} />
          {(section.blocks || []).filter((block) => (block.position || "after") === "before").map((block) => <RenderBlock key={block.id} block={block} />)}
          <div className={`dynamic-grid dynamic-grid--${section.layout}`}>
            {(section.cards || []).map((card) => <article key={card.id} className="dynamic-public-card">
              {card.title && <h3 className="dynamic-card-title">{card.title}</h3>}
              {(card.blocks || []).map((block) => <RenderBlock key={block.id} block={block} isCard />)}
            </article>)}
          </div>
          {(section.blocks || []).filter((block) => (block.position || "after") !== "before").map((block) => <RenderBlock key={block.id} block={block} />)}
        </div>
      </SharedContentSection>)}
      {renderPageBlocks("after")}
    </div>
  </main>;
}
