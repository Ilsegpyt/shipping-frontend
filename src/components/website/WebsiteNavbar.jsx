import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ilsLogo from "../../assets/branding/ils-logo-horizontal.png";
import contentService from "../../services/contentService";

const navGroups = [
  {
    label: "About ILS",
    links: [
      { label: "Philosophy", to: "/about-ils/philosophy" },
      { label: "Purpose and Strategy", to: "/about-ils/purpose-and-strategy" },
      { label: "Values", to: "/about-ils/values" },
      { label: "Certificates", to: "/about-ils/certificates" },
    ],
  },
  {
    label: "ILS Solutions",
    links: [
      { label: "Sea Freight", to: "/solutions/sea-freight" },
      { label: "Air Freight", to: "/solutions/air-freight" },
      { label: "Consolidations", to: "/solutions/consolidations" },
      { label: "Customs Clearance", to: "/solutions/customs-clearance" },
      { label: "Road Transportation", to: "/solutions/road-transportation" },
      { label: "ILS Projects Transport", to: "/solutions/project-transport" },
      {
        label: "Warehousing and Distribution",
        to: "/solutions/warehousing-distribution",
      },
      { label: "Cargo Insurance", to: "/solutions/cargo-insurance" },
    ],
  },
  {
    label: "ILS Industries",
    links: [
      { label: "Automotive Logistics", to: "/industries/automotive" },
      { label: "Technology", to: "/industries/technology" },
      { label: "Healthcare Logistics", to: "/industries/healthcare" },
      { label: "Energy", to: "/industries/energy" },
      { label: "Industrial Logistics", to: "/industries/industrial" },
      { label: "Retail Logistics", to: "/industries/retail" },
    ],
  },
  {
    label: "Media Room",
    links: [
      { label: "ILS News", to: "/news?category=ILS%20News" },
      { label: "Industry News", to: "/news?category=Industry%20News" },
      { label: "Case Study", to: "/news?category=Case%20Study" },
    ],
  },
  {
    label: "Resources",
    links: [
      { label: "Incoterms", to: "/resources/incoterms" },
      {
        label: "Dangerous Goods Labels",
        to: "/resources/dangerous-goods-labels",
      },
      { label: "Container Types", to: "/resources/container-types" },
      { label: "Nafeza Platform", to: "/resources/nafeza-platform" },
      { label: "CBM Calculator", to: "/resources/cbm-calculator" },
      {
        label: "Customs Duties Calculator",
        to: "/resources/customs-duties-calculator",
      },
    ],
  },
  {
    label: "Join ILS",
    links: [
      { label: "Agent Opportunity", to: "/join-ils/agent-opportunity" },
      { label: "Join Our Team", to: "/join-ils/recruitment" },
    ],
  },
  {
    label: "Contact ILS",
    links: [
      { label: "Contact Us", href: "/#contact" },
      { label: "ILS Locations", to: "/contact-ils/locations" },
      { label: "Quotation", to: "/contact-ils/get-a-quote" },
    ],
  },
];

const getContentTypeName = (type) =>
  typeof type === "string"
    ? type
    : ({ 1: "Category", 2: "Page", 3: "Post", 4: "Link" }[type] || "");

const normalizeNavTitle = (value = "") =>
  value.trim().toLowerCase().replace(/^ils\s+/, "").replace(/&/g, "and").replace(/\s+/g, " ");

const getNavGroupLabel = (categoryTitle) => {
  const normalized = normalizeNavTitle(categoryTitle);
  const aliases = {
    "solutions": "ILS Solutions",
    "industries": "ILS Industries",
    "media room": "Media Room",
    "about ils": "About ILS",
    "resources": "Resources",
    "join ils": "Join ILS",
    "contact ils": "Contact ILS",
  };
  return aliases[normalized] || categoryTitle;
};

async function getDynamicPageLinks(rootCategory) {
  const links = [];
  const visited = new Set();

  async function walk(category, categoryTrail = []) {
    if (!category?.id || visited.has(String(category.id))) return;
    visited.add(String(category.id));

    let response;
    try {
      response = await contentService.getChildren(category.id);
    } catch (error) {
      console.error("Failed to load navigation children:", error);
      return;
    }

    const children = Array.isArray(response?.data) ? response.data : [];
    for (const child of children) {
      const type = getContentTypeName(child.type);
      if (type === "Category") {
        await walk(child, [...categoryTrail, child.title].filter(Boolean));
      } else if (type === "Page" && child.id && child.title) {
        const prefix = categoryTrail.length
          ? `${categoryTrail.join(" / ")} / `
          : "";
        links.push({
          label: `${prefix}${child.title}`,
          to: `/cms/${child.id}`,
        });
      }
    }
  }

  await walk(rootCategory);
  return links;
}

function getClientPortalPath() {
  const token = localStorage.getItem("accessToken");

  if (!token) return "/login";

  try {
    const payload = token.split(".")[1];
    if (!payload) return "/login";

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const tokenType = JSON.parse(atob(padded)).token_type;

    if (tokenType === "internal") return "/dashboard";
    if (tokenType === "customer") return "/customer";
    if (tokenType === "sub_account") return "/subaccount";

    return "/login";
  } catch {
    return "/login";
  }
}

function NavLink({ to, href, children, onClick }) {
  const className =
    "block rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white";

  if (to) {
    return (
      <Link to={to} className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  );
}


function NavDropdown({ label, links }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-white/85 transition hover:bg-white/10 hover:text-white"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {label}
        <span
          className={`text-[10px] text-white/60 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
            }`}
        >
          ⌄
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-1/2 top-full z-50 w-64 -translate-x-1/2 rounded-xl border border-white/10 bg-slate-950/95 p-2 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
          <div className="space-y-0.5">
            {links.map((link) => (
              <NavLink
                key={link.label}
                to={link.to}
                href={link.href}
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


export default function WebsiteNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedMobileGroup, setExpandedMobileGroup] = useState(null);
  const [displayNavGroups, setDisplayNavGroups] = useState(navGroups);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadCmsNavigation() {
      try {
        const response = await contentService.getRootContent();
        const roots = Array.isArray(response?.data) ? response.data : [];
        const categoryRoots = roots.filter(
          (item) => getContentTypeName(item.type) === "Category" && item.id,
        );

        const nextGroups = navGroups.map((group) => ({ ...group, links: [...group.links] }));

        for (const root of categoryRoots) {
          const links = await getDynamicPageLinks(root);
          if (!links.length) continue;

          const groupLabel = getNavGroupLabel(root.title || "");
          let group = nextGroups.find(
            (item) => normalizeNavTitle(item.label) === normalizeNavTitle(groupLabel),
          );

          if (!group) {
            group = { label: groupLabel, links: [] };
            nextGroups.push(group);
          }

          // CMS pages must take precedence over legacy hard-coded links:
          // the static links can point to old routes instead of /cms/{id}.
          const dynamicByLabel = new Map();
          for (const link of links) {
            const key = normalizeNavTitle(link.label);
            if (key && !dynamicByLabel.has(key)) {
              dynamicByLabel.set(key, link);
            }
          }

          const dynamicLabels = new Set(dynamicByLabel.keys());
          group.links = group.links.filter(
            (link) => !dynamicLabels.has(normalizeNavTitle(link.label)),
          );

          const existingLabels = new Set(
            group.links.map((link) => normalizeNavTitle(link.label)),
          );

          for (const [key, link] of dynamicByLabel) {
            if (!existingLabels.has(key)) {
              group.links.push(link);
              existingLabels.add(key);
            }
          }
        }

        if (active) setDisplayNavGroups(nextGroups);
      } catch (error) {
        console.error("Failed to load CMS navigation:", error);
        if (active) setDisplayNavGroups(navGroups);
      }
    }

    loadCmsNavigation();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setExpandedMobileGroup(null);
  }, [location.pathname, location.search]);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setExpandedMobileGroup(null);
  };

  const toggleMobileGroup = (label) => {
    setExpandedMobileGroup((current) => (current === label ? null : label));
  };

  const portalPath = getClientPortalPath();

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <div
          className={`mt-3 flex min-h-16 items-center justify-between gap-3 rounded-2xl border px-3 shadow-lg backdrop-blur-xl transition-all duration-300 sm:px-5 ${isScrolled
            ? "border-white/10 bg-slate-950/95 shadow-slate-950/20"
            : "border-white/15 bg-slate-950/70"
            }`}
        >
          <Link
            to="/"
            className="shrink-0"
            aria-label="ILS Egypt home"
            onClick={closeMobileMenu}
          >
            <img src={ilsLogo} alt="ILS Egypt" className="h-8 w-auto sm:h-10" />
          </Link>

          {/* Desktop navigation */}
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-1 lg:flex"
          >
            {displayNavGroups.map((group) => (
              <NavDropdown
                key={group.label}
                label={group.label}
                links={group.links}
              />
            ))}
          </nav>

          {/* Desktop portal button */}
          <Link
            to={portalPath}
            className="hidden shrink-0 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 lg:inline-flex"
          >
            Client Portal
          </Link>

          {/* Mobile controls */}
          <div className="flex shrink-0 items-center gap-2 lg:hidden">
            <Link
              to={portalPath}
              className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-slate-100 sm:px-4 sm:text-sm"
            >
              Portal
            </Link>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 text-white transition hover:bg-white/10"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              {isMobileMenuOpen ? (
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile navigation panel */}
        {isMobileMenuOpen && (
          <nav
            id="mobile-navigation"
            aria-label="Mobile navigation"
            className="mt-2 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-xl lg:hidden"
          >
            <Link
              to="/"
              onClick={closeMobileMenu}
              className="mb-2 block rounded-lg px-3 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Home
            </Link>

            {displayNavGroups.map((group) => {
              const isExpanded = expandedMobileGroup === group.label;
              const panelId = `mobile-group-${group.label
                .toLowerCase()
                .replace(/\s+/g, "-")}`;

              return (
                <div key={group.label} className="border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => toggleMobileGroup(group.label)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-white"
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                  >
                    <span>{group.label}</span>
                    <span
                      className={`text-xs transition-transform ${isExpanded ? "rotate-180" : ""
                        }`}
                      aria-hidden="true"
                    >
                      ⌄
                    </span>
                  </button>

                  {isExpanded && (
                    <div id={panelId} className="space-y-1 pb-2 pl-3">
                      {group.links.map((link) => (
                        <NavLink
                          key={link.label}
                          to={link.to}
                          href={link.href}
                          onClick={closeMobileMenu}
                        >
                          {link.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}
