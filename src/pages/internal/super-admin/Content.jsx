import { useEffect, useState } from "react";

import contentService from "../../../services/contentService";

import RichTextEditor from "../../../components/common/RichTextEditor";

import RepeatableSection from "../../../components/common/RepeatableSection";
import ContentBlockEditor from "../../../components/common/ContentBlockEditor";
import { createEmptyAboutPage, parseAboutPage, serializeAboutPage, StructuredAboutEditor } from "../../../components/common/StructuredAboutContent";
import { cleanImageUrl } from "../../../utils/mediaUrl";

const PHILOSOPHY_SCHEMA = "ils-philosophy-v2";
const PHILOSOPHY_MARKER = "<!--ILS_PHILOSOPHY_V1-->";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

const createEmptyCard = (id = `card-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`) => ({
  id,
  title: "",
  text: "",
  highlights: [],
  closings: [],
});

function createEmptyPhilosophyContent() {
  return {
    schema: PHILOSOPHY_SCHEMA,
    introLabel: "",
    introTitle: "",
    introText: "",
    cards: [],
    pageOrder: [],
    // Page-level highlight and closing content remains independent from cards.
    globalHighlights: [],
    globalClosings: [],
    highlight: "",
    closing: "",
    legacyHtml: "",
  };
}

function normalizeCard(card, index) {
  let blocks = Array.isArray(card?.contentBlocks) ? card.contentBlocks : null;
  if (!blocks) {
    blocks = [];
    if (card?.text) blocks.push({ id: `card-text-${index + 1}`, type: "text", text: card.text });
    const highlights = Array.isArray(card?.highlights) ? card.highlights : (card?.highlight ? [card.highlight] : []);
    highlights.forEach((item, itemIndex) => blocks.push({
      id: item?.id || `highlight-${index + 1}-${itemIndex + 1}`,
      type: "highlight",
      text: typeof item === "string" ? item : (item?.text || ""),
    }));
    const closings = Array.isArray(card?.closings) ? card.closings : (card?.closing ? [card.closing] : []);
    closings.forEach((item, itemIndex) => blocks.push({
      id: item?.id || `closing-${index + 1}-${itemIndex + 1}`,
      type: "closing",
      text: typeof item === "string" ? item : (item?.text || ""),
    }));
  }
  if (!blocks.some((block) => block?.type === "text")) {
    blocks = [{ id: `card-text-${index + 1}`, type: "text", text: card?.text || "" }, ...blocks];
  }
  return {
    id: card?.id || `card-${index + 1}`,
    title: card?.title || "",
    contentBlocks: blocks.map((block, blockIndex) => ({
      id: block?.id || `block-${index + 1}-${blockIndex + 1}`,
      type: ["text", "highlight", "closing"].includes(block?.type) ? block.type : "text",
      text: block?.text || "",
    })),
    // Derived compatibility fields for old consumers/data.
    text: blocks.find((block) => block?.type === "text")?.text || "",
    highlights: blocks.filter((block) => block?.type === "highlight").map((block) => ({ id: block.id, text: block.text || "" })),
    closings: blocks.filter((block) => block?.type === "closing").map((block) => ({ id: block.id, text: block.text || "" })),
  };
}

function normalizeGlobalItems(items, fallback, prefix) {
  if (Array.isArray(items)) return items.map((item, index) => typeof item === "string"
    ? { id: `${prefix}-${index + 1}`, text: item }
    : { id: item?.id || `${prefix}-${index + 1}`, text: item?.text || "" });
  return fallback ? [{ id: `${prefix}-legacy`, text: fallback }] : [];
}

function parsePhilosophyBody(body = "") {
  if (typeof body !== "string") body = "";

  if (body.startsWith(PHILOSOPHY_MARKER)) {
    try {
      const parsed = JSON.parse(body.slice(PHILOSOPHY_MARKER.length));
      if (["ils-philosophy-v1", "ils-philosophy-v2"].includes(parsed.schema)) {
        let cards = Array.isArray(parsed.cards)
          ? parsed.cards.map(normalizeCard)
          : [];
        const globalHighlights = normalizeGlobalItems(parsed.globalHighlights, parsed.highlight, "global-highlight");
        const globalClosings = normalizeGlobalItems(parsed.globalClosings, parsed.closing, "global-closing");
        const validOrder = Array.isArray(parsed.pageOrder) ? parsed.pageOrder.filter((item) => {
          if (item?.type === "card") return cards.some((card) => card.id === item.id);
          if (item?.type === "globalHighlight") return globalHighlights.some((entry) => entry.id === item.id);
          if (item?.type === "globalClosing") return globalClosings.some((entry) => entry.id === item.id);
          return false;
        }) : [];
        const pageOrder = validOrder.length ? validOrder : [
          ...cards.map((card) => ({ type: "card", id: card.id })),
          ...globalHighlights.map((item) => ({ type: "globalHighlight", id: item.id })),
          ...globalClosings.map((item) => ({ type: "globalClosing", id: item.id })),
        ];

        return {
          ...createEmptyPhilosophyContent(),
          ...parsed,
          schema: PHILOSOPHY_SCHEMA,
          cards,
          pageOrder,
          globalHighlights,
          globalClosings,
          highlight: parsed.highlight || "",
          closing: parsed.closing || "",
          legacyHtml: parsed.legacyHtml || "",
        };
      }
    } catch (error) {
      console.error("Failed to parse Philosophy content:", error);
    }
  }

  // Preserve legacy HTML and make its existing content editable where possible.
  const document = new DOMParser().parseFromString(body, "text/html");
  const elements = Array.from(document.body.children);
  const paragraphs = elements.filter((element) => element.tagName.toLowerCase() === "p");
  const listElement = elements.find((element) => ["ul", "ol"].includes(element.tagName.toLowerCase()));
  const strongParagraph = paragraphs.find((paragraph) => paragraph.querySelector("strong"));
  const closingParagraphs = paragraphs.filter((paragraph) =>
    paragraph !== paragraphs[0] && paragraph !== paragraphs[1] && paragraph !== paragraphs[2] && paragraph !== strongParagraph
  );
  const cardItems = listElement
    ? Array.from(listElement.querySelectorAll(":scope > li")).map((item, index) => normalizeCard({
      id: `legacy-card-${index + 1}`,
      title: "",
      text: item.innerHTML.trim(),
    }, index))
    : [];

  if (strongParagraph || closingParagraphs.length) {
    if (!cardItems.length) cardItems.push(createEmptyCard("legacy-content-card"));
    if (strongParagraph) cardItems[cardItems.length - 1].highlights.push({ id: "legacy-highlight", text: strongParagraph.innerHTML.trim() });
    const finalClosing = closingParagraphs[closingParagraphs.length - 1];
    if (finalClosing) cardItems[cardItems.length - 1].closings.push({ id: "legacy-closing", text: finalClosing.innerHTML.trim() });
  }

  return {
    ...createEmptyPhilosophyContent(),
    introLabel: paragraphs[0]?.textContent?.trim() || "",
    introTitle: paragraphs[1]?.textContent?.trim() || "",
    introText: paragraphs[2]?.innerHTML?.trim() || "",
    cards: cardItems,
    pageOrder: cardItems.map((card) => ({ type: "card", id: card.id })),
    legacyHtml: body,
  };
}

function philosophyToAboutPage(content) {
  const cards = (content.cards || []).map((card) => {
    const normalized = normalizeCard(card, 0);

    return {
      id: normalized.id,
      label: "",
      title: normalized.title,
      subtitle: "",
      contentBlocks: normalized.contentBlocks,
    };
  });

  const highlights = normalizeGlobalItems(
    content.globalHighlights,
    content.highlight,
    "global-highlight",
  );

  const closings = normalizeGlobalItems(
    content.globalClosings,
    content.closing,
    "global-closing",
  );

  return {
    schema: "ils-about-page-v1",
    introLabel: content.introLabel || "",
    introTitle: content.introTitle || "",
    introText: content.introText || "",
    sections: cards,
    highlights,
    closings,
    pageOrder: (content.pageOrder || []).map((item) => ({
      type:
        item.type === "card"
          ? "section"
          : item.type === "globalHighlight"
            ? "highlight"
            : item.type === "globalClosing"
              ? "closing"
              : item.type,
      id: item.id,
    })),
    legacyHtml: content.legacyHtml || "",
  };
}

function aboutPageToPhilosophy(data, previous = {}) {
  const cards = (data.sections || []).map((section) => {
    const blocks = (section.contentBlocks || []).map((block) => ({
      id: block.id,
      type: block.type,
      text: block.text || "",
    }));

    return normalizeCard(
      {
        id: section.id,
        title: section.title || "",
        contentBlocks: blocks,
      },
      0,
    );
  });

  return {
    ...createEmptyPhilosophyContent(),
    ...previous,
    schema: PHILOSOPHY_SCHEMA,
    introLabel: data.introLabel || "",
    introTitle: data.introTitle || "",
    introText: data.introText || "",
    cards,
    globalHighlights: data.highlights || [],
    globalClosings: data.closings || [],
    pageOrder: (data.pageOrder || []).map((item) => ({
      type:
        item.type === "section"
          ? "card"
          : item.type === "highlight"
            ? "globalHighlight"
            : item.type === "closing"
              ? "globalClosing"
              : item.type,
      id: item.id,
    })),
    legacyHtml: previous.legacyHtml || data.legacyHtml || "",
  };
}

function serializePhilosophyContent(content) {
  return PHILOSOPHY_MARKER + JSON.stringify({
    ...content,
    schema: PHILOSOPHY_SCHEMA,
    globalHighlights: normalizeGlobalItems(content.globalHighlights, content.highlight, "global-highlight"),
    globalClosings: normalizeGlobalItems(content.globalClosings, content.closing, "global-closing"),
    pageOrder: Array.isArray(content.pageOrder) ? content.pageOrder : [],
    highlight: "",
    closing: "",
    cards: (content.cards || []).map((card, index) => normalizeCard(card, index)),
  });
}

function pageContentOrderToAboutPage(pageContentOrder, pageIntroText = "") {
  let parsed;

  try {
    parsed = typeof pageContentOrder === "string"
      ? JSON.parse(pageContentOrder)
      : pageContentOrder;
  } catch {
    return null;
  }

  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.items)) {
    return null;
  }

  const sections = [];
  const highlights = [];
  const closings = [];
  const pageOrder = [];

  for (const item of parsed.items) {
    if (!item || !Array.isArray(item.items)) continue;

    if (item.type === "Section") {
      const section = {
        id: item.id || `section-${sections.length + 1}`,
        label: typeof item.label === "string" ? item.label : "",
        title: typeof item.title === "string" ? item.title : "",
        subtitle: typeof item.subtitle === "string" ? item.subtitle : "",
        contentBlocks: item.items.map((child, index) => ({
          id: child.id || `block-${sections.length + 1}-${index + 1}`,
          type: child.type === "HighlightText"
            ? "highlight"
            : child.type === "ClosingText"
              ? "closing"
              : "text",
          text: child.text || "",
        })),
      };

      sections.push(section);
      pageOrder.push({ type: "section", id: section.id });
    } else if (item.type === "PageHighlights") {
      for (const child of item.items) {
        const entry = { id: child.id || `highlight-${highlights.length + 1}`, text: child.text || "" };
        highlights.push(entry);
        pageOrder.push({ type: "highlight", id: entry.id });
      }
    } else if (item.type === "PageClosings") {
      for (const child of item.items) {
        const entry = { id: child.id || `closing-${closings.length + 1}`, text: child.text || "" };
        closings.push(entry);
        pageOrder.push({ type: "closing", id: entry.id });
      }
    }
  }

  return {
    ...createEmptyAboutPage(),
    introText: pageIntroText || "",
    sections,
    highlights,
    closings,
    pageOrder,
  };
}

function aboutPageToPageContentOrder(data) {
  const sections = Array.isArray(data.sections) ? data.sections : [];
  const highlights = Array.isArray(data.highlights) ? data.highlights : [];
  const closings = Array.isArray(data.closings) ? data.closings : [];
  const items = [];
  const usedSections = new Set();
  const usedHighlights = new Set();
  const usedClosings = new Set();

  const addSection = (section) => {
    if (!section || usedSections.has(section.id)) return;
    usedSections.add(section.id);

    const sectionItems = (section.contentBlocks || []).map((block, index) => ({
      id: block.id || `text-${section.id}-${index + 1}`,
      type: block.type === "highlight"
        ? "HighlightText"
        : block.type === "closing"
          ? "ClosingText"
          : "CardText",
      text: block.text || "",
    }));

    if (!sectionItems.length) {
      sectionItems.push({ id: `text-${section.id}`, type: "CardText", text: "" });
    }

    items.push({
      id: section.id || `section-${items.length + 1}`,
      type: "Section",
      label: section.label || "",
      title: section.title || "",
      subtitle: section.subtitle || "",
      items: sectionItems,
    });
  };

  const addHighlight = (entry) => {
    if (!entry || usedHighlights.has(entry.id)) return;
    usedHighlights.add(entry.id);
    items.push({
      id: `page-highlights-${entry.id}`,
      type: "PageHighlights",
      items: [{ id: entry.id || `highlight-${items.length + 1}`, type: "HighlightText", text: entry.text || "" }],
    });
  };

  const addClosing = (entry) => {
    if (!entry || usedClosings.has(entry.id)) return;
    usedClosings.add(entry.id);
    items.push({
      id: `page-closings-${entry.id}`,
      type: "PageClosings",
      items: [{ id: entry.id || `closing-${items.length + 1}`, type: "ClosingText", text: entry.text || "" }],
    });
  };

  const order = Array.isArray(data.pageOrder) ? data.pageOrder : [];
  for (const orderedItem of order) {
    if (orderedItem.type === "section") addSection(sections.find((item) => item.id === orderedItem.id));
    if (orderedItem.type === "highlight") addHighlight(highlights.find((item) => item.id === orderedItem.id));
    if (orderedItem.type === "closing") addClosing(closings.find((item) => item.id === orderedItem.id));
  }

  sections.forEach(addSection);
  highlights.forEach(addHighlight);
  closings.forEach(addClosing);

  if (!items.some((item) => item.type === "Section")) {
    items.unshift({
      id: `section-${Date.now()}`,
      type: "Section",
      items: [{ id: `text-${Date.now()}`, type: "CardText", text: "" }],
    });
  }

  return JSON.stringify({ version: 1, items });
}

function legacyPageBodyToAboutPage(body = "") {
  if (typeof body !== "string" || !body.trim()) {
    return createEmptyAboutPage();
  }

  if (body.startsWith(PHILOSOPHY_MARKER)) {
    return philosophyToAboutPage(parsePhilosophyBody(body));
  }

  if (body.startsWith("<!--ILS_ABOUT_PAGE_V1-->")) {
    return parseAboutPage(body);
  }

  const sectionId = `legacy-section-${Date.now()}`;
  return {
    ...createEmptyAboutPage(),
    sections: [{
      id: sectionId,
      label: "",
      title: "",
      subtitle: "",
      contentBlocks: [{ id: `legacy-text-${Date.now()}`, type: "text", text: body }],
    }],
    pageOrder: [{ type: "section", id: sectionId }],
    legacyHtml: body,
  };
}

export default function Content() {

  const [contents, setContents] = useState([]);

  const [children, setChildren] = useState({});

  const [expandedId, setExpandedId] = useState(null);

  const [loading, setLoading] = useState(true);

  const [loadingChildren, setLoadingChildren] = useState(null);

  const [error, setError] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);

  const [uploadingImage, setUploadingImage] = useState(false);

  const [savingContent, setSavingContent] = useState(false);

  const [saveError, setSaveError] = useState("");

  const [deleteError, setDeleteError] = useState("");

  const [deleteConfirm, setDeleteConfirm] = useState({

    open: false,

    contentId: null,

    parentId: null,

    title: "",

  });

  const [editingContentId, setEditingContentId] = useState(null);

  const [form, setForm] = useState({

    parentId: "",

    title: "",

    type: "Page",

    body: "",

    featuredImage: "",

    linkUrl: "",

    category: "",

    publishedAt: "",

  });

  const [philosophyForm, setPhilosophyForm] = useState(

    createEmptyPhilosophyContent()

  );

  const [isPhilosophyPage, setIsPhilosophyPage] = useState(false);
  const [isStructuredAboutPage, setIsStructuredAboutPage] = useState(false);
  const [aboutPageForm, setAboutPageForm] = useState(createEmptyAboutPage());

  useEffect(() => {

    const loadRootContent = async () => {

      try {

        setLoading(true);

        setError("");

        const response = await contentService.getRootContent();

        setContents(response.data);

      } catch (err) {

        console.error("Failed to load content:", err);

        setError("Failed to load content.");

      } finally {

        setLoading(false);

      }

    };

    loadRootContent();

  }, []);

  const handleExpand = async (contentId) => {

    if (expandedId === contentId) {

      setExpandedId(null);

      return;

    }

    if (children[contentId]) {

      setExpandedId(contentId);

      return;

    }

    try {

      setLoadingChildren(contentId);

      const response = await contentService.getChildren(contentId);

      setChildren((prev) => ({

        ...prev,

        [contentId]: response.data,

      }));

      setExpandedId(contentId);

    } catch (err) {

      console.error("Failed to load children:", err);

    } finally {

      setLoadingChildren(null);

    }

  };

  const handleFormChange = (e) => {

    const { name, value } = e.target;

    setForm((prev) => ({

      ...prev,

      [name]: value,

    }));

  };

  const handleAboutPageChange = (value) => setAboutPageForm(value);

  const handlePhilosophyChange = (field, value) => {

    setPhilosophyForm((prev) => ({

      ...prev,

      [field]: value,

    }));

  };

  const handleTypeChange = (e) => {

    const type = e.target.value;

    setForm((prev) => ({
      ...prev,
      type,
      body: "",
      featuredImage: "",
      linkUrl: "",
    }));

    setIsPhilosophyPage(false);
    setIsStructuredAboutPage(type === "Page");
    setAboutPageForm(createEmptyAboutPage());
    setPhilosophyForm(createEmptyPhilosophyContent());
    setSaveError("");

  };

  const handleFeaturedImageChange = async (e) => {

    const file = e.target.files?.[0];

    if (!file) {

      return;

    }

    try {

      setUploadingImage(true);

      setSaveError("");

      const response = await contentService.uploadImage(file);

      setForm((prev) => ({

        ...prev,

        featuredImage: cleanImageUrl(response.data.url),
      }));

    } catch (err) {

      console.error("Failed to upload image:", err);

      setSaveError(err.response?.data?.message || "Failed to upload image.");

    } finally {

      setUploadingImage(false);

    }

  };

  const handleSaveContent = async () => {

    setSaveError("");

    if (!form.title.trim()) {

      setSaveError("Title is required.");

      return;

    }

    if (form.type === "Page") {
      const sections = Array.isArray(aboutPageForm.sections)
        ? aboutPageForm.sections
        : [];

      if (sections.length === 0) {
        setSaveError("Add at least one Section to the page.");
        return;
      }

      const sectionWithoutTitle = sections.findIndex(
        (section) => !String(section?.title || "").trim(),
      );

      if (sectionWithoutTitle !== -1) {
        setSaveError(
          `Section Title is required for Section ${sectionWithoutTitle + 1}.`,
        );
        return;
      }
    }

    if (form.type === "Post" && !(form.body || "").trim()) {
      setSaveError("Body is required for Post content.");
      return;
    }

    if (form.type === "Post" && !form.featuredImage) {

      setSaveError("Featured image is required for Post content.");

      return;

    }

    if (form.type === "Post" && !form.category.trim()) {

      setSaveError("Category is required for Post content.");

      return;

    }

    if (form.type === "Post" && !form.publishedAt) {

      setSaveError("Published date is required for Post content.");

      return;

    }

    if (form.type === "Link" && !form.linkUrl.trim()) {

      setSaveError("Link URL is required.");

      return;

    }

    const pageContentOrder =
      form.type === "Page" ? aboutPageToPageContentOrder(aboutPageForm) : null;

    const payload = {
      parentId: form.parentId || null,
      title: form.title,
      type: form.type,

      body:
        form.type === "Post"
          ? form.body || null
          : form.type === "Page"
            ? aboutPageForm.introText?.trim() || pageContentOrder
            : null,

      pageIntroText:
        form.type === "Page" ? aboutPageForm.introText || null : null,

      pageContentOrder,

      featuredImage: form.type === "Post" ? form.featuredImage || null : null,

      linkUrl: form.type === "Link" ? form.linkUrl || null : null,

      category: form.type === "Post" ? form.category.trim() || null : null,

      publishedAt: form.type === "Post" ? form.publishedAt || null : null,
    };

    try {
      setSavingContent(true);

      const response = editingContentId
        ? await contentService.update(editingContentId, payload)
        : await contentService.create(payload);

      setShowAddForm(false);

      setEditingContentId(null);

      setIsPhilosophyPage(false);
      setIsStructuredAboutPage(false);
      setAboutPageForm(createEmptyAboutPage());

      setPhilosophyForm(createEmptyPhilosophyContent());

      setForm({
        parentId: "",

        title: "",

        type: "Page",

        body: "",

        featuredImage: "",

        linkUrl: "",

        category: "",

        publishedAt: "",
      });

      const rootResponse = await contentService.getRootContent();

      setContents(rootResponse.data);

      setChildren({});

      setExpandedId(null);
    } catch (err) {
      console.error(
        "Failed to save content:",

        err,
      );

      setSaveError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to save content.",
      );
    } finally {
      setSavingContent(false);
    }

  };

  const getTypeName = (type) => {

    if (typeof type === "string") {

      return type;

    }

    return (

      {

        1: "Category",

        2: "Page",

        3: "Post",

        4: "Link",

      }[type] || "Page"

    );

  };

  const findContentInLoadedTree = (contentId) => {

    const search = (items) => {

      for (const item of items || []) {

        if (String(item.id) === String(contentId)) {

          return item;

        }

        const found = search(children[item.id]);

        if (found) {

          return found;

        }

      }

      return null;

    };

    return search(contents);

  };

  const handleEditContent = async (contentId) => {

    try {

      setSaveError("");

      let content = findContentInLoadedTree(contentId);

      if (!content) {

        const rootResponse = await contentService.getRootContent();

        const roots = rootResponse.data || [];

        const searchRemoteTree = async (items) => {

          for (const item of items) {

            if (String(item.id) === String(contentId)) {

              return item;

            }

            const childResponse = await contentService.getChildren(item.id);

            const found = await searchRemoteTree(childResponse.data || []);

            if (found) {

              return found;

            }

          }

          return null;

        };

        content = await searchRemoteTree(roots);

      }

      if (!content) {

        const response = await contentService.getById(contentId);

        content = response.data;

      }

      const type = getTypeName(content.type);

      const parsedOrder = type === "Page"
        ? pageContentOrderToAboutPage(content.pageContentOrder, content.pageIntroText || "")
        : null;

      const parsedLegacy = type === "Page"
        ? legacyPageBodyToAboutPage(content.body || "")
        : createEmptyAboutPage();

      const pageData = parsedOrder || parsedLegacy;

      setForm({
        parentId: content.parentId || "",
        title: content.title || "",
        type,
        // Body is only used by Posts. Pages use PageIntroText + PageContentOrder.
        body: type === "Post" ? content.body || "" : "",
        featuredImage: content.featuredImage || "",
        linkUrl: content.linkUrl || "",
        category: content.category ?? "",
        publishedAt: content.publishedAt ? String(content.publishedAt).slice(0, 10) : "",
      });

      setIsPhilosophyPage(false);
      setIsStructuredAboutPage(type === "Page");
      setAboutPageForm(pageData);
      setPhilosophyForm(createEmptyPhilosophyContent());

      setEditingContentId(contentId);

      setShowAddForm(true);

    } catch (err) {

      console.error("Failed to load content:", err);

      setSaveError(

        err.response?.data?.message ||

        err.response?.data?.error ||

        "Failed to load content.",

      );

    }

  };

  const handleDeleteContent = (contentId, parentId = null, title = "") => {

    setDeleteError("");

    setDeleteConfirm({

      open: true,

      contentId,

      parentId,

      title,

    });

  };

  const confirmDeleteContent = async () => {

    const { contentId, parentId } = deleteConfirm;

    if (!contentId) {

      return;

    }

    try {

      setDeleteError("");

      await contentService.delete(contentId);

      if (parentId) {

        setChildren((prev) => ({

          ...prev,

          [parentId]: (prev[parentId] || []).filter(

            (child) => child.id !== contentId,

          ),

        }));

      } else {

        setContents((prev) =>

          prev.filter((content) => content.id !== contentId),

        );

        setChildren((prev) => {

          const updated = { ...prev };

          delete updated[contentId];

          return updated;

        });

        if (expandedId === contentId) {

          setExpandedId(null);

        }

      }

      setDeleteConfirm({

        open: false,

        contentId: null,

        parentId: null,

        title: "",

      });

    } catch (error) {

      console.error("Failed to delete content:", error);

      console.error("Status:", error.response?.status);

      console.error("Response:", error.response?.data);

      const message =

        error.response?.data?.message ||

        error.response?.data?.error ||

        "Failed to delete content.";

      setDeleteError(message);

      setDeleteConfirm((prev) => ({ ...prev, open: false }));

    }

  };

  return (
    <div className="space-y-6">
      {/* Header */}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Content Management
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage website content and pages.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingContentId(null);

            setForm({
              parentId: "",

              title: "",

              type: "Page",

              body: "",

              featuredImage: "",

              linkUrl: "",

              category: "",

              publishedAt: "",
            });

            setShowAddForm(true);

            setSaveError("");
          }}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          + Add Content
        </button>
      </div>

      {/* Add Content Form */}

      {showAddForm && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Form Header */}

          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {editingContentId ? "Edit Content" : "Add Content"}
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {editingContentId
                  ? "Edit website content."
                  : "Create a new website content item."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);

                setEditingContentId(null);

                setSaveError("");
              }}
              className="text-sm text-slate-400 hover:text-slate-700"
            >
              ✕
            </button>
          </div>

          {/* Form Fields */}

          <div className="grid gap-5 p-5 md:grid-cols-2">
            {/* Title */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Title
              </label>

              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleFormChange}
                placeholder="Enter title"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </div>

            {/* Type */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Type
              </label>

              <select
                name="type"
                value={form.type}
                onChange={handleTypeChange}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              >
                <option value="Category">Category</option>

                <option value="Page">Page</option>

                <option value="Post">Post</option>

                <option value="Link">Link</option>
              </select>
            </div>

            {/* Parent Content */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Parent Content
              </label>

              <select
                name="parentId"
                value={form.parentId}
                onChange={handleFormChange}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              >
                <option value="">No Parent (Root Content)</option>

                {contents.map((content) => (
                  <option key={content.id} value={content.id}>
                    {content.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Page / Post Body */}

            {(form.type === "Page" || form.type === "Post") && (
              <div className="md:col-span-2 space-y-5">
                {form.type === "Page" ? (
                  <StructuredAboutEditor
                    value={aboutPageForm}
                    onChange={handleAboutPageChange}
                    pageTitle={form.title || "Page"}
                  />
                ) : (
                  <>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Body
                    </label>
                    <RichTextEditor
                      value={form.body}
                      onChange={(value) =>
                        setForm((prev) => ({ ...prev, body: value }))
                      }
                    />
                  </>
                )}
              </div>
            )}

            {/* Post Metadata */}

            {form.type === "Post" && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Category
                  </label>

                  <input
                    type="text"
                    name="category"
                    value={form.category}
                    onChange={handleFormChange}
                    placeholder="e.g. Company News"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Published Date
                  </label>

                  <input
                    type="date"
                    name="publishedAt"
                    value={form.publishedAt}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                </div>
              </>
            )}

            {/* Post Featured Image */}

            {form.type === "Post" && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Featured Image
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFeaturedImageChange}
                  disabled={uploadingImage}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />

                {uploadingImage && (
                  <p className="mt-2 text-xs text-slate-500">
                    Uploading image...
                  </p>
                )}

                {form.featuredImage && (
                  <div className="relative mt-3 w-fit">
                    <img
                      src={cleanImageUrl(form.featuredImage, API_BASE_URL)}
                      alt="Featured preview"
                      className="h-32 w-48 rounded-lg border border-slate-200 object-cover"
                    />


                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,

                          featuredImage: "",
                        }))
                      }
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Link URL */}

            {form.type === "Link" && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Link URL
                </label>

                <input
                  type="url"
                  name="linkUrl"
                  value={form.linkUrl}
                  onChange={handleFormChange}
                  placeholder="https\\://example.com"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </div>
            )}
          </div>

          {/* Save Error */}

          {saveError && (
            <div className="mx-5 mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {saveError}
            </div>
          )}

          {/* Form Actions */}

          <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);

                setEditingContentId(null);

                setSaveError("");
              }}
              disabled={savingContent}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveContent}
              disabled={savingContent}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingContent
                ? "Saving..."
                : editingContentId
                  ? "Update Content"
                  : "Save Content"}
            </button>
          </div>
        </div>
      )}

      {deleteConfirm.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-red-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <span className="text-lg font-bold">!</span>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Delete Content
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <p className="text-sm leading-6 text-slate-600">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-slate-900">
                  {deleteConfirm.title || "this content"}
                </span>
                ?
              </p>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() =>
                  setDeleteConfirm({
                    open: false,

                    contentId: null,

                    parentId: null,

                    title: "",
                  })
                }
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDeleteContent}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Error */}

      {deleteError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {deleteError}
        </div>
      )}

      {/* Content List */}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Website Content
          </h2>
        </div>

        {loading && (
          <div className="px-5 py-8 text-center text-sm text-slate-500">
            Loading content...
          </div>
        )}

        {!loading && error && (
          <div className="px-5 py-8 text-center text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && contents.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-slate-500">
            No content found.
          </div>
        )}

        {!loading && !error && contents.length > 0 && (
          <div className="divide-y divide-slate-100">
            {contents.map((content) => {
              const isExpanded = expandedId === content.id;

              const contentChildren = children[content.id] || [];

              return (
                <div key={content.id}>
                  <div className="flex items-center justify-between px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleExpand(content.id)}
                      className="flex items-center gap-3 text-left"
                    >
                      <span className="text-slate-400">
                        {isExpanded ? "▼" : "▶"}
                      </span>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">
                            {content.title}
                          </span>

                          <span className="rounded-full bg-sky-50 px-2 py-1 text-xs font-medium text-sky-600">
                            {content.type}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-slate-400">
                          Root Content
                        </p>
                      </div>
                    </button>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditContent(content.id)}
                        className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteContent(content.id)}
                        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                      {loadingChildren === content.id && (
                        <div className="py-3 text-sm text-slate-500">
                          Loading children...
                        </div>
                      )}

                      {loadingChildren !== content.id &&
                        contentChildren.length === 0 && (
                          <div className="py-3 text-sm text-slate-500">
                            No children found.
                          </div>
                        )}

                      {loadingChildren !== content.id &&
                        contentChildren.length > 0 && (
                          <div className="ml-8 space-y-2 border-l border-slate-200 pl-4">
                            {contentChildren.map((child) => (
                              <div
                                key={child.id}
                                className="flex items-center justify-between rounded-lg bg-white px-4 py-3"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-slate-700">
                                    {child.title}
                                  </span>

                                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">
                                    {child.type}
                                  </span>
                                </div>

                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleEditContent(child.id)}
                                    className="text-xs font-medium text-sky-600 hover:text-sky-700"
                                  >
                                    Edit
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteContent(
                                        child.id,

                                        content.id,
                                      )
                                    }
                                    className="text-xs font-medium text-red-500 hover:text-red-600"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

}
