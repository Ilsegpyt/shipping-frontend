import useCmsStaticHeroImage from "../../hooks/useCmsStaticHeroImage";
import { Link, useLocation } from "react-router-dom";
import { cleanImageUrl } from "../../utils/mediaUrl";
import seaFreightImage from "../../assets/website/solutions/seafreight.webp";

/** Presentation-only hero. CMS parsing, routing, and persistence remain unchanged. */
export default function SharedCmsPageHero({ label, title, children, image }) {
  const { pathname, search } = useLocation();
  const { image: cmsHeroImage, loading: heroLoading } = useCmsStaticHeroImage(pathname, title);
  const selectedImage = cmsHeroImage || image || seaFreightImage;
  const resolvedImage = cleanImageUrl(selectedImage, import.meta.env.VITE_API_BASE_URL || "");
  const normalizedPath = pathname.replace(/\/$/, "");
  const isNewsIndex = normalizedPath === "/news";
  const isNewsDetail = /^\/news\/[^/]+/.test(normalizedPath);
  const isSolutionsPage = pathname.replace(/\/$/, "") === "/solutions";
  const isSolutionDetail = /^\/solutions\/[^/]+/.test(pathname) || ["ils solutions", "solutions"].includes(String(label || "").trim().toLowerCase());
  const heading = String(title || "ILS Egypt");
  const section = typeof label === "string" ? label.trim() : "";
  const showSection = section && section.toLowerCase() !== heading.toLowerCase();
  const newsCategory = isNewsIndex
  ? new URLSearchParams(search).get("category")?.trim()
  : null;

  return (
    <header className="ils-cms-hero relative isolate min-h-[240px] overflow-hidden bg-brand-bg sm:min-h-[280px] lg:min-h-[300px]">
      <div aria-hidden="true" className="absolute inset-y-0 right-0 w-full sm:w-[60%] lg:w-[55%]">
        {!heroLoading && <img src={resolvedImage} alt="" loading="eager" fetchPriority="high" className="h-full w-full object-cover object-center" />}
      </div>
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-brand-bg/25 via-brand-bg/15 to-brand-bg/5" />
      {/* On mobile the image fills the hero, so darken it for inverse (white) text. */}
      <div aria-hidden="true" className="absolute inset-0 bg-brand-primary/15 sm:hidden" />
      <div
        aria-hidden="true"
        className="absolute inset-0 hidden bg-brand-bg sm:block"
        style={{ clipPath: "polygon(0 0, 65% 0, 45% 100%, 0 100%)" }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 hidden bg-brand-accent/35 sm:block"
        style={{ clipPath: "polygon(60% 0, 66% 0, 46% 100%, 40% 100%)" }}
      />
      <div className="relative mx-auto flex min-h-[240px] max-w-7xl items-center px-5 py-9 sm:min-h-[280px] sm:px-8 sm:py-10 lg:min-h-[300px] lg:px-12">
        <div className="w-full text-brand-inverse sm:text-brand-primary-hover md:max-w-[45%] lg:max-w-[45%]">
          <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold tracking-wide text-inherit sm:text-sm">
            <Link to="/" className="text-inherit transition-opacity hover:opacity-75">Home</Link>
            {isNewsIndex ? (
  <>
    <span aria-hidden="true">/</span>

    {newsCategory ? (
      <>
        <Link
          to="/news"
          className="text-inherit transition-opacity hover:opacity-75"
        >
          Media Room
        </Link>

        <span aria-hidden="true">/</span>

        <span aria-current="page" className="text-inherit">
          {newsCategory}
        </span>
      </>
    ) : (
      <span aria-current="page" className="text-inherit">
        Media Room
      </span>
    )}
  </>
) : isNewsDetail ? (
  <>
    <span aria-hidden="true">/</span>
    <Link to="/news" className="text-inherit transition-opacity hover:opacity-75">
      Media Room
    </Link>
    <span aria-hidden="true">/</span>
    <span aria-current="page" className="text-inherit">
      {heading}
    </span>
  </>
            ) : isSolutionsPage ? (
              <>
                <span aria-hidden="true">/</span>
                <span aria-current="page" className="text-inherit">Solutions</span>
              </>
            ) : isSolutionDetail ? (
              <>
                <span aria-hidden="true">/</span>
                <Link to="/solutions" className="text-inherit transition-opacity hover:opacity-75">Solutions</Link>
                <span aria-hidden="true">/</span>
                <span aria-current="page" className="text-inherit">{heading}</span>
              </>
            ) : (
              <>
                {showSection && <><span aria-hidden="true">/</span><span>{section}</span></>}
                <span aria-hidden="true">/</span>
                <span aria-current="page" className="text-inherit">{heading}</span>
              </>
            )}
          </nav>
          <div aria-hidden="true" className="mb-3 h-1 w-12 bg-brand-accent" />
          <h1 className="max-w-3xl ils-type-hero font-bold leading-[1.08] tracking-[-0.035em] text-inherit">
            {heading}
          </h1>
          {children && <div className="ils-cms-hero-description mt-3 max-w-2xl ils-type-body leading-8 text-inherit">{children}</div>}
        </div>
      </div>
    </header>
  );
}
