/**
 * Presentation-only heading shared by the existing CMS renderers.
 * Values are displayed unchanged; no CMS parsing or editing logic here.
 */
export default function SharedSectionHeading({ label, title, subtitle }) {
  return (
    <>
      {label && (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3097BF] sm:text-sm">
          {label}
        </p>
      )}
      {title && (
        <h2 className={`${label ? "mt-2 " : ""}text-[1.65rem] font-semibold leading-tight tracking-tight text-[#1E3672] sm:text-2xl lg:text-3xl`}>
          {title}
        </h2>
      )}
      {subtitle && (
        <p className={`${label || title ? "mt-3 " : ""}text-base leading-7 text-[#53677c] sm:text-base sm:leading-8 lg:text-lg`}>
          {subtitle}
        </p>
      )}
    </>
  );
}
