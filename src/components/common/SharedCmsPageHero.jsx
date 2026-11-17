import { Link, useLocation } from "react-router-dom";
import seaFreightImage from "../../assets/website/solutions/seafreight.webp";

/** Presentation-only hero. CMS parsing, routing, and persistence remain unchanged. */
export default function SharedCmsPageHero({ label, title, children, image = seaFreightImage }) {
  const { pathname } = useLocation();
  const normalizedPath = pathname.replace(/\/$/, "");
  const isNewsIndex = normalizedPath === "/news";
  const isNewsDetail = /^\/news\/[^/]+/.test(normalizedPath);
  const isSolutionsPage = pathname.replace(/\/$/, "") === "/solutions";
  const isSolutionDetail = /^\/solutions\/[^/]+/.test(pathname) || ["ils solutions", "solutions"].includes(String(label || "").trim().toLowerCase());
  const heading = String(title || "ILS Egypt");
  const section = typeof label === "string" ? label.trim() : "";
  const showSection = section && section.toLowerCase() !== heading.toLowerCase();

  return (
    <header className="ils-cms-hero relative isolate min-h-[440px] overflow-hidden bg-[#e8f4fb] sm:min-h-[500px] lg:min-h-[560px]">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center lg:bg-[position:75%_42%]"
        style={{ backgroundImage: `url(${image})` }}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#e7f5fc]/95 via-[#e7f5fc]/70 to-[#e7f5fc]/10 lg:hidden" />
      <div
        aria-hidden="true"
        className="absolute inset-0 hidden bg-[#eaf6fc]/95 lg:block"
        style={{ clipPath: "polygon(0 0, 65% 0, 45% 100%, 0 100%)" }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 hidden bg-[#9fd6ed]/35 lg:block"
        style={{ clipPath: "polygon(60% 0, 66% 0, 46% 100%, 40% 100%)" }}
      />
      <div className="relative mx-auto flex min-h-[440px] max-w-7xl items-center px-5 py-24 sm:min-h-[500px] sm:px-8 lg:min-h-[560px] lg:px-12">
        <div className="w-full max-w-3xl lg:max-w-[58%]">
          <nav aria-label="Breadcrumb" className="mb-7 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold tracking-wide text-[#224980] sm:text-sm">
            <Link to="/" className="transition-colors hover:text-[#3097BF]">Home</Link>
            {isNewsIndex ? (
              <>
                <span aria-hidden="true">/</span>
                <span aria-current="page" className="text-[#1E3672]">Media Room</span>
              </>
            ) : isNewsDetail ? (
              <>
                <span aria-hidden="true">/</span>
                <Link to="/news" className="transition-colors hover:text-[#3097BF]">Media Room</Link>
                <span aria-hidden="true">/</span>
                <span aria-current="page" className="text-[#1E3672]">{heading}</span>
              </>
            ) : isSolutionsPage ? (
              <>
                <span aria-hidden="true">/</span>
                <span aria-current="page" className="text-[#1E3672]">Solutions</span>
              </>
            ) : isSolutionDetail ? (
              <>
                <span aria-hidden="true">/</span>
                <Link to="/solutions" className="transition-colors hover:text-[#3097BF]">Solutions</Link>
                <span aria-hidden="true">/</span>
                <span aria-current="page" className="text-[#1E3672]">{heading}</span>
              </>
            ) : (
              <>
                {showSection && <><span aria-hidden="true">/</span><span>{section}</span></>}
                <span aria-hidden="true">/</span>
                <span aria-current="page" className="text-[#1E3672]">{heading}</span>
              </>
            )}
          </nav>
          <div aria-hidden="true" className="mb-5 h-1 w-12 bg-[#3097BF]" />
          <h1 className="max-w-3xl text-[clamp(2.1rem,4vw,3.8rem)] font-bold leading-[1.08] tracking-[-0.035em] text-[#1E3672]">
            {heading}
          </h1>
          {children && <div className="ils-cms-hero-description mt-6 max-w-2xl text-base leading-8 text-[#224980] sm:text-sm">{children}</div>}
        </div>
      </div>
    </header>
  );
}
