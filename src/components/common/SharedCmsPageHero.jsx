/** Public CMS hero presentation only. Does not read or modify CMS data. */
export default function SharedCmsPageHero({ label, title, children }) {
  return (
    <header className="relative overflow-hidden bg-slate-950 px-4 pb-12 pt-28 sm:px-8 sm:pb-14 sm:pt-30 lg:px-12 lg:pb-16 lg:pt-32">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(14,165,233,0.22),transparent_35%)]" />
      <div className="relative mx-auto max-w-7xl">
        {label && (
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-sky-400 sm:text-sm">
            {label}
          </p>
        )}
        <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        {children}
      </div>
    </header>
  );
}
