/**
 * Presentation-only heading shared by the existing CMS renderers.
 * Values are displayed unchanged; no CMS parsing or editing logic here.
 */
export default function SharedSectionHeading({ label, title, subtitle }) {
  return (
    <>
      {label && (
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent sm:text-base">
          {label}
        </p>
      )}
      {title && (
        <h2 className={`${label ? "mt-2 " : ""}text-[1.75rem] font-semibold leading-tight tracking-tight text-brand-primary sm:text-3xl lg:text-5xl`}>
          {title}
        </h2>
      )}
      {subtitle && (
        <p className={`${label || title ? "mt-3 " : ""}text-base leading-7 text-brand-muted sm:text-lg sm:leading-8 lg:text-xl`}>
          {subtitle}
        </p>
      )}
    </>
  );
}
