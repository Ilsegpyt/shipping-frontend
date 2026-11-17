import SharedContentSection from "./SharedContentSection";
import SharedSectionHeading from "./SharedSectionHeading";

// Shared presentation styles for page-level and section-level CMS blocks.
// Keep CMS content, ordering, and rich-text/image rendering unchanged.
const HIGHLIGHT_CONTAINER_CLASS =
  "rounded-none border border-brand-primary bg-brand-surface-dark px-5 py-5 sm:px-8 sm:py-8 lg:px-10";
const HIGHLIGHT_CONTENT_CLASS =
  "max-w-6xl border-l-4 border-brand-accent pl-4 text-base leading-7 text-brand-accent sm:pl-6 sm:text-lg sm:leading-8 lg:text-2xl [&_ul]:my-3 [&_ul]:ml-6 [&_ul]:list-disc [&_ol]:my-3 [&_ol]:ml-6 [&_ol]:list-decimal [&_li]:mb-1 [&_p]:mb-2";
const CLOSING_CLASS =
  "rounded-none border border-brand-border bg-brand-bg p-5 text-base leading-7 text-brand-muted sm:p-8 sm:text-lg sm:leading-8 lg:text-2xl [&_ul]:my-3 [&_ul]:ml-6 [&_ul]:list-disc [&_ol]:my-3 [&_ol]:ml-6 [&_ol]:list-decimal [&_li]:mb-1 [&_p]:mb-2";

/** Presentation only. Accepts normalized CMS data; never changes or saves it. */
export default function SharedDynamicSection({ item, data, renderRich }) {
  const section = item.type === "section"
    ? data.sections?.find((entry) => entry.id === item.id)
    : null;
  const global = item.type === "highlight"
    ? data.highlights?.find((entry) => entry.id === item.id)
    : item.type === "closing"
      ? data.closings?.find((entry) => entry.id === item.id)
      : null;

  if (item.type === "section" && !section) return null;
  if (item.type !== "section" && !global) return null;

  if (item.type === "highlight") {
    return (
      <section className={HIGHLIGHT_CONTAINER_CLASS}>
        <div className={HIGHLIGHT_CONTENT_CLASS}>
          {renderRich(global.text, "")}
        </div>
      </section>
    );
  }
  if (item.type === "closing") {
    return (
      <section className={CLOSING_CLASS}>
        {renderRich(global.text, "")}
      </section>
    );
  }

  return (
    <SharedContentSection className="p-5 sm:p-8 lg:p-10">
      <SharedSectionHeading label={section.label} title={section.title} subtitle={section.subtitle} />
      <div className="mt-5 space-y-4 sm:mt-6">
        {(section.contentBlocks || []).map((block) => (
          <div
            key={block.id}
            className={block.type === "highlight"
              ? HIGHLIGHT_CONTAINER_CLASS
              : block.type === "closing"
                ? CLOSING_CLASS
                : "text-brand-muted"}
          >
            {block.type === "highlight" ? (
              <div className={HIGHLIGHT_CONTENT_CLASS}>
                {renderRich(block.text, "")}
              </div>
            ) : renderRich(
              block.text,
              block.type === "closing" ? "" : "text-base leading-7 sm:text-lg sm:leading-8 lg:text-xl"
            )}
          </div>
        ))}
      </div>
    </SharedContentSection>
  );
}

