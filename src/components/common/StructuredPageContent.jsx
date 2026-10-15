import RichTextEditor from "./RichTextEditor";

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

export function StructuredPageRenderer({ page, parentTitle = "About ILS" }) {
  const body = page?.body || "";
  let data;
  try { data = body.startsWith(STRUCTURED_PAGE_MARKER) ? JSON.parse(body.slice(STRUCTURED_PAGE_MARKER.length)) : parseStructuredPage(body); }
  catch { data = parseStructuredPage(body); }
  const hasIntro = Boolean(data.introLabel || data.introTitle || data.introText);
  return (
    <main className="min-h-screen bg-slate-50 text-sky-800">
      <section className="bg-slate-950 px-6 pb-14 pt-32 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
            {data.introLabel || parentTitle}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {data.introTitle || page?.title || "About ILS"}
          </h1>
          {data.introText && (
            <div
              className="structured-rich mt-6 max-w-3xl text-base leading-8 text-slate-100 sm:text-lg"
              dangerouslySetInnerHTML={{ __html: data.introText }}
            />
          )}
          {/* <a
            href="/"
            className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-sky-400 hover:text-sky-300"
          >
            ← Back to Home
          </a> */}
        </div>
      </section>
      <section className="px-6 py-12 sm:px-8 sm:py-16 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-6">
          {!hasIntro && !data.sections?.length && (
            <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sky-800">
              No content is available for this page in the CMS.
            </p>
          )}
          {(data.sections || []).map((section, index) => (
            <article
              key={section.id || index}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="p-6 sm:p-8 lg:p-10">
                {section.label && (
                  <p className="text-base font-semibold uppercase tracking-[0.2em] text-sky-600">
                    {section.label}
                  </p>
                )}
                {section.title && (
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight text-sky-800 sm:text-5xl">
                    {section.title}
                  </h2>
                )}
                {section.subtitle && (
                  <p className="mt-3 text-2xl leading-7 text-sky-800">
                    {section.subtitle}
                  </p>
                )}
                {section.content && (
                  <div
                    className="structured-rich mt-5 text-xl leading-8 text-sky-800"
                    dangerouslySetInnerHTML={{ __html: section.content }}
                  />
                )}
              </div>
            </article>
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
    max-width:100%;height:auto;border-radius:1rem;margin:1rem 0
    }
    
/* Image beside text — regular CMS images */
.structured-rich img[data-image-layout="left"] {
  float: left;
  display: block;
  margin: 0.25rem 1rem 0.75rem 0;
}

.structured-rich img[data-image-layout="right"] {
  float: right;
  display: block;
  margin: 0.25rem 0 0.75rem 1rem;
}

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
