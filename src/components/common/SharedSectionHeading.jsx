/**
 * Presentation-only heading shared by the existing CMS renderers.
 * Values are displayed unchanged; no CMS parsing or editing logic here.
 */
export default function SharedSectionHeading({ label, title, subtitle }) {
  return (
    <>
      {label && (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent sm:text-sm">
          {label}
        </p>
      )}
      {title && (
        <h2 className={`${label ? "mt-2 " : ""}ils-type-section-title font-semibold leading-tight tracking-tight text-brand-primary`}>
          {title}
        </h2>
      )}
      {subtitle && (
        <p className={`${label || title ? "mt-3 " : ""}text-base leading-7 text-brand-primary-hover sm:text-base sm:leading-8 lg:text-lg`}>
          {subtitle}
        </p>
      )}
    </>
  );
}
