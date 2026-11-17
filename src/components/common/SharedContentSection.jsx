/**
 * Shared presentation-only wrapper for CMS content sections.
 * Keeps the same article DOM element; does not transform CMS data.
 */
export default function SharedContentSection({ children, className = "", ...props }) {
  return (
    <article
      {...props}
      className={`ils-cms-content-section overflow-hidden border border-[#dce9f2] bg-white ${className}`.trim()}
    >
      {children}
    </article>
  );
}
