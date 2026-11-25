import { sanitizePhoneInput } from "../../utils/phoneInput.js";
import ApiFieldError from "../../components/common/ApiFieldError";
import { extractApiFieldErrors, extractApiErrorMessage } from '../../utils/errorUtils.js';
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import contentService from "../../services/contentService";
import useSolutionHeroImages from "../../hooks/useSolutionHeroImages";
import contactInquiriesService from "../../services/contactInquiriesService";
import { cleanImageUrl } from "../../utils/mediaUrl";

import {
  HeartPulse,
  CarFront,
  Wind,
  ShoppingBag,
  Factory,
  Cpu,
  ArrowUpRight,
} from "lucide-react";

import heroVideo from "../../assets/website/hero/ilsvideo.mp4";

import seaFreight from "../../assets/website/solutions/seafreight.webp";

import airFreight from "../../assets/website/solutions/airfreight.webp";

import roadTransportation from "../../assets/website/solutions/roadtransportation.webp";

import customsClearance from "../../assets/website/solutions/customclearence.webp";

import consolidations from "../../assets/website/solutions/consolidations.webp";

import projectTransportation from "../../assets/website/solutions/projectstransport.webp";

import warehousing from "../../assets/website/solutions/warehousing.webp";

import cargo from "../../assets/website/solutions/cargo.webp";

const partnerImages = import.meta.glob(
  "../../assets/website/partners/*-small.webp",

  {
    eager: true,

    import: "default",
  },
);

const partners = Object.entries(partnerImages)

  .sort(([a], [b]) => {
    const numberA = Number(a.match(/(\d+)-small\.webp$/)?.[1] ?? 0);

    const numberB = Number(b.match(/(\d+)-small\.webp$/)?.[1] ?? 0);

    return numberA - numberB;
  })

  .map(([, image]) => image);

const getClientPortalPath = () => {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    return "/login";
  }

  try {
    const payload = token.split(".")[1];

    if (!payload) {
      return "/login";
    }

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
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5250";

const getImageUrl = (image) => cleanImageUrl(image, API_BASE_URL);


const getContentTypeName = (type) => {
  if (typeof type === "string") return type;

  switch (type) {
    case 1:
      return "Category";

    case 2:
      return "Page";

    case 3:
      return "Post";

    case 4:
      return "Link";

    default:
      return "";
  }
};

const formatDate = (date) => {
  if (!date) return "";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate

    .toLocaleDateString("en-GB", {
      day: "2-digit",

      month: "short",

      year: "numeric",
    })

    .replace(/ /g, "-");
};

const stripHtml = (html) => {
  if (!html) return "";

  const temp = document.createElement("div");

  temp.innerHTML = html;

  return temp.textContent || temp.innerText || "";
};

const getExcerpt = (body, maxLength = 180) => {
  const text = stripHtml(body).replace(/\s+/g, " ").trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}...`;
};

// Share the CMS request between Home news and Solutions, including remounts.
let allContentPromise = null;

async function getAllContent() {
  if (allContentPromise) return allContentPromise;

  allContentPromise = (async () => {
    const response = await contentService.getRootContent();
    const roots = Array.isArray(response.data) ? response.data : [];
    const allContent = [];
    const visited = new Set();

    async function collect(items) {
      await Promise.all(items.map(async (item) => {
        if (!item?.id || visited.has(item.id)) return;
        visited.add(item.id);
        allContent.push(item);

        try {
          const childrenResponse = await contentService.getChildren(item.id);
          const children = Array.isArray(childrenResponse.data)
            ? childrenResponse.data
            : [];
          if (children.length > 0) await collect(children);
        } catch (childError) {
          console.error(`Failed to load children for content ${item.id}:`, childError);
        }
      }));
    }

    await collect(roots);
    return allContent;
  })().catch((error) => {
    allContentPromise = null;
    throw error;
  });

  return allContentPromise;
}

function Home() {
  const solutionImage = useSolutionHeroImages();
  const { hash } = useLocation();
  const [newsItems, setNewsItems] = useState([]);

  const [airFreightContent, setAirFreightContent] = useState(null);
  const [seaFreightContent, setSeaFreightContent] = useState(null);
  const [roadTransportationContent, setRoadTransportationContent] =
    useState(null);
  const [customsClearanceContent, setCustomsClearanceContent] = useState(null);
  const [consolidationsContent, setConsolidationsContent] = useState(null);
  const [cargoInsuranceContent, setCargoInsuranceContent] = useState(null);
  const [projectTransportContent, setProjectTransportContent] = useState(null);
  const [warehousingDistributionContent, setWarehousingDistributionContent] =
    useState(null);
  const [automotiveLogisticsContent, setAutomotiveLogisticsContent] =
    useState(null);
  const [energyContent, setEnergyContent] = useState(null);
  const [healthcareLogisticsContent, setHealthcareLogisticsContent] =
    useState(null);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactError, setContactError] = useState("");
  const [contactFields, setContactFields] = useState({});

  useEffect(() => {
    if (!hash) return;

    const sectionId = decodeURIComponent(hash.slice(1));
    let attempts = 0;
    let frameId;

    const scrollToSection = () => {
      const section = document.getElementById(sectionId);

      if (section) {
        section.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        return;
      }

      if (attempts < 10) {
        attempts += 1;
        frameId = requestAnimationFrame(scrollToSection);
      }
    };

    frameId = requestAnimationFrame(scrollToSection);

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [hash]);

  useEffect(() => {
    let isMounted = true;

    const loadNews = async () => {
      try {
        const allContent = await getAllContent();

        const posts = allContent

          .filter((item) => getContentTypeName(item.type) === "Post")

          .sort((a, b) => {
            if (!a.publishedAt && !b.publishedAt) return 0;

            if (!a.publishedAt) return 1;

            if (!b.publishedAt) return -1;

            return (
              new Date(b.publishedAt).getTime() -
              new Date(a.publishedAt).getTime()
            );
          })

          .slice(0, 3)

          .map((item) => ({
            id: item.id,

            image: getImageUrl(item.featuredImage),

            category: item.category || "ILS News",

            date: formatDate(item.publishedAt),

            title: item.title,

            excerpt: getExcerpt(item.body),

            to: `/news/${item.id}`,
          }));

        if (isMounted) {
          setNewsItems(posts);
        }
      } catch (error) {
        console.error("Failed to load home news:", error);

        if (isMounted) {
          setNewsItems([]);
        }
      }
    };

    const loadSolutionsContent = async () => {
      try {
        const allContent = await getAllContent();

        const airFreight = allContent.find(
          (item) => item?.title?.trim().toLowerCase() === "air freight",
        );

        const seaFreight = allContent.find(
          (item) => item?.title?.trim().toLowerCase() === "sea freight",
        );

        const roadTransportation = allContent.find(
          (item) => item?.title?.trim().toLowerCase() === "road transportation",
        );

        const customsClearance = allContent.find(
          (item) => item?.title?.trim().toLowerCase() === "customs clearance",
        );

        const consolidations = allContent.find(
          (item) => item?.title?.trim().toLowerCase() === "consolidations",
        );

        const cargoInsurance = allContent.find(
          (item) => item?.title?.trim().toLowerCase() === "cargo insurance",
        );

        const projectTransport = allContent.find((item) => {
          const title = item?.title?.trim().toLowerCase() || "";
          return (
            title === "project transport" ||
            title === "ils projects transport" ||
            title.startsWith("project transport -") ||
            title.startsWith("ils projects transport -")
          );
        });

        const warehousingDistribution = allContent.find((item) => {
          const title = item?.title?.trim().toLowerCase() || "";
          return (
            title === "warehousing and distribution" ||
            title === "warehousing & distribution" ||
            title.startsWith("warehousing and distribution -") ||
            title.startsWith("warehousing & distribution -")
          );
        });

        const automotiveLogistics = allContent.find((item) => {
          const title = item?.title?.trim().toLowerCase() || "";
          return title === "automotive logistics" || title === "automotive";
        });

        const energy = allContent.find((item) => {
          const title = item?.title?.trim().toLowerCase() || "";
          return (
            title === "energy" ||
            title === "energy logistics" ||
            title.startsWith("energy -") ||
            title.startsWith("energy logistics -")
          );
        });

        const healthcareLogistics = allContent.find((item) => {
          const title = item?.title?.trim().toLowerCase() || "";
          return (
            title === "healthcare logistics" ||
            title === "healthcare" ||
            title.startsWith("healthcare logistics -") ||
            title.startsWith("healthcare -")
          );
        });

        if (isMounted) {
          setAirFreightContent(airFreight || null);
          setSeaFreightContent(seaFreight || null);
          setRoadTransportationContent(roadTransportation || null);
          setCustomsClearanceContent(customsClearance || null);
          setConsolidationsContent(consolidations || null);
          setCargoInsuranceContent(cargoInsurance || null);
          setProjectTransportContent(projectTransport || null);
          setWarehousingDistributionContent(warehousingDistribution || null);
          setAutomotiveLogisticsContent(automotiveLogistics || null);
          setEnergyContent(energy || null);
          setHealthcareLogisticsContent(healthcareLogistics || null);
        }
      } catch (error) {
        console.error("Failed to load Solutions content:", error);

        if (isMounted) {
          setAirFreightContent(null);
          setSeaFreightContent(null);
          setRoadTransportationContent(null);
          setCustomsClearanceContent(null);
          setCargoInsuranceContent(null);
          setConsolidationsContent(null);
          setProjectTransportContent(null);
          setWarehousingDistributionContent(null);
          setAutomotiveLogisticsContent(null);
          setEnergyContent(null);
          setHealthcareLogisticsContent(null);
        }
      }
    };

    loadNews();
    loadSolutionsContent();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleContactSubmit = async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    setContactSubmitted(false);
    setContactError("");
    setContactFields({});

    const data = {
      fullName: formData.get("fullName"),
      company: formData.get("company"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      service: formData.get("service"),
      message: formData.get("message"),
    };

    try {
      await contactInquiriesService.create(data);
      setContactSubmitted(true);
      form.reset();
    } catch (error) {
      console.error("Failed to submit contact inquiry:", error);
      console.error("Backend error:", error.response?.data);
      setContactSubmitted(false);
      setContactFields(extractApiFieldErrors(error));
      setContactError(extractApiErrorMessage(error, 'Failed to send your inquiry.'));
    }
  };

  return (
    <main className="ils-website bg-white">
      {/* ==================== Hero ==================== */}
      <section className="relative isolate min-h-screen overflow-hidden bg-white">
        <video
          className="absolute inset-0 h-full w-full object-cover object-center"
          src={heroVideo}
          autoPlay
          muted
          loop
          playsInline
        />

        {/* Light gradient keeps the headline readable while showing the video. */}
        <div className="pointer-events-none absolute inset-0 " />

        {/* Hero Content */}
        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-162.5 ">
            <h1 className="max-w-162.5 text-[clamp(2.15rem,4vw,3.65rem)] font-bold leading-[1.12] tracking-[-0.035em] text-brand-surface">
              You grow your business. <span className="block">We'll take care of the logistics.</span>

            </h1>

            <p className="mt-5 max-w-140 text-sm leading-7 text-brand-surface sm:text-base">
              As the world of commerce is changing, it's time to change your
              business with it. Move your logistics service from offline to
              online. With ILS, shipment, tracking and managing your shipments
              is easy
            </p>

            <div className="mt-7 flex flex-wrap gap-3 sm:gap-4">
              <a
                href="#solutions"
                className="inline-flex min-h-11 items-center justify-center  bg-brand-primary px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-primary-hover"
              >
                Explore Solutions
              </a>

              <a
                href="#contact"
                className="inline-flex min-h-11 items-center justify-center  border border-brand-primary bg-white/85 px-6 py-3 text-center text-sm font-semibold text-brand-primary transition-colors hover:bg-white"
              >
                Talk to ILS
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== Industries ==================== */}

      <section id="industries" className="bg-brand-surface py-10 sm:py-20 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent">
              Industries
            </p>

            <h2 className="mt-3 text-xl font-semibold tracking-tight text-brand-primary sm:mt-4 sm:text-2xl lg:text-3xl">
              Logistics expertise built around your industry.
            </h2>

            <p className="mt-4 text-sm leading-6 text-slate-600 sm:mt-5 sm:text-base sm:leading-7 lg:text-sm">
              Industry-focused logistics solutions designed to support your
              operations, supply chain and business goals.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 border-l border-t border-brand-border sm:grid-cols-2 lg:mt-14 lg:grid-cols-3">
            <IndustryCard
              icon={<HeartPulse size={24} strokeWidth={1.8} />}
              title={
                healthcareLogisticsContent?.title || "Healthcare Logistics"
              }
              description={
                healthcareLogisticsContent?.body
                  ? getExcerpt(healthcareLogisticsContent.body, 140)
                  : "Tailor-made logistics solutions covering transport, storage and cold chain services."
              }
              to="/industries/healthcare"
            />

            <IndustryCard
              icon={<CarFront size={24} strokeWidth={1.8} />}
              title={
                automotiveLogisticsContent?.title || "Automotive Logistics"
              }
              description={
                automotiveLogisticsContent?.body
                  ? getExcerpt(automotiveLogisticsContent.body, 140)
                  : "Specialized logistics expertise supporting efficient manufacturing and vehicle supply chains."
              }
              to="/industries/automotive"
            />

            <IndustryCard
              icon={<Wind size={24} strokeWidth={1.8} />}
              title={energyContent?.title || "Energy"}
              description={
                energyContent?.body
                  ? getExcerpt(energyContent.body, 140)
                  : "Safe and economic transport solutions for wind and solar energy industries."
              }
              to="/industries/energy"
            />

            <IndustryCard
              icon={<ShoppingBag size={24} strokeWidth={1.8} />}
              title="Retail Logistics"
              description="Agile supply chain solutions tailored to business and customer requirements."
              to="/industries/retail"
            />

            <IndustryCard
              icon={<Factory size={24} strokeWidth={1.8} />}
              title="Industrial Logistics"
              description="Industry-specific solutions for materials, machinery, chemicals, construction and manufacturing."
              to="/industries/industrial"
            />

            <IndustryCard
              icon={<Cpu size={24} strokeWidth={1.8} />}
              title="Technology"
              description="Innovative and flexible supply chain solutions covering the entire technology lifecycle."
              to="/industries/technology"
            />
          </div>
        </div>
      </section>

      {/* ==================== Solutions ==================== */}

      <section id="solutions" className="bg-white py-10 sm:py-20 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-5 sm:gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent">
                ILS Solutions
              </p>

              <h2 className="mt-3 text-xl font-semibold tracking-tight text-brand-primary sm:mt-4 sm:text-2xl lg:text-3xl">
                End-to-end logistics solutions.
              </h2>

              <p className="mt-4 text-sm leading-6 text-slate-600 sm:mt-5 sm:text-base sm:leading-7 lg:text-sm">
                Flexible logistics solutions designed to move your cargo
                efficiently across every stage of the supply chain.
              </p>
            </div>

            <a href="/solutions"              
              className="inline-flex min-h-12 w-fit max-w-full items-center justify-center gap-2  border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-brand-primary transition hover:border-sky-200 hover:text-brand-accent sm:px-5"
            >
              Explore Solutions
              <ArrowUpRight size={17} />
            </a>
          </div>

          <div className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-5 lg:mt-14">
            <SolutionCard
              image={solutionImage("Sea Freight", seaFreight)}
              title={seaFreightContent?.title || "Sea Freight"}
              to="/solutions/sea-freight"
            />

            <SolutionCard
              image={solutionImage("Air Freight", airFreight)}
              title={airFreightContent?.title || "Air Freight"}
              to="/solutions/air-freight"
            />

            <SolutionCard
              image={solutionImage("Road Transportation", roadTransportation)}
              title={roadTransportationContent?.title || "Road Transportation"}
              to="/solutions/road-transportation"
            />

            <SolutionCard
              image={solutionImage("Customs Clearance", customsClearance)}
              title={customsClearanceContent?.title || "Customs Clearance"}
              to="/solutions/customs-clearance"
            />

            <SolutionCard
              image={solutionImage("Consolidations", consolidations)}
              title={consolidationsContent?.title || "Consolidations"}
              to="/solutions/consolidations"
            />

            <SolutionCard
              image={solutionImage("Project Transport", projectTransportation)}
              title={projectTransportContent?.title || "Project Transport"}
              to="/solutions/project-transport"
            />

            <SolutionCard
              image={solutionImage("Warehousing and Distribution", warehousing)}
              title={
                warehousingDistributionContent?.title ||
                "Warehousing and Distribution"
              }
              to="/solutions/warehousing-distribution"
            />

            <SolutionCard
              image={solutionImage("Cargo Insurance", cargo)}
              title={cargoInsuranceContent?.title || "Cargo Insurance"}
              to="/solutions/cargo-insurance"
            />
          </div>
        </div>
      </section>

      {/* ==================== Partners ====================

      <section className="overflow-hidden bg-slate-50 py-10 sm:py-20 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent">
              ILS Partners
            </p>

            <h2 className="mt-3 text-xl font-semibold tracking-tight text-brand-primary sm:mt-4 sm:text-2xl lg:text-3xl">
              Connected to a global network.
            </h2>

            <p className="mt-4 text-sm leading-6 text-slate-600 sm:mt-5 sm:text-base sm:leading-7 lg:text-sm">
              Strong partnerships help us deliver reliable logistics solutions
              across global markets.
            </p>
          </div>

          <div className="relative mt-10 overflow-hidden sm:mt-12 lg:mt-16">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-linear-to-r from-slate-50 to-transparent sm:w-40" />

            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-linear-to-l from-slate-50 to-transparent sm:w-40" />

            <div className="partners-track flex w-max animate-[partners-scroll_45s_linear_infinite]">
              <div className="flex items-center gap-6 px-3">
                {partners.map((partner, index) => (
                  <div
                    key={`partner-${index}`}
                    className="flex h-20 w-32 shrink-0 items-center justify-center  border border-slate-200/80 bg-white px-4 shadow-sm transition-shadow duration-300 hover:shadow-md sm:h-24 sm:w-40  sm:px-6"
                  >
                    <img
                      src={partner}
                      alt={`ILS Partner ${index + 1}`}
                      className="max-h-10 max-w-full object-contain sm:max-h-12"
                    />
                  </div>
                ))}
              </div>

              <div aria-hidden="true" className="flex items-center gap-6 px-3">
                {partners.map((partner, index) => (
                  <div
                    key={`partner-copy-${index}`}
                    className="flex h-20 w-32 shrink-0 items-center justify-center  border border-slate-200/80 bg-white px-4 shadow-sm transition-shadow duration-300 hover:shadow-md sm:h-24 sm:w-40  sm:px-6"
                  >
                    <img
                      src={partner}
                      alt=""
                      className="max-h-10 max-w-full object-contain sm:max-h-12"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <style>
          {`
    @keyframes partners-scroll {
      from {
        transform: translateX(0);
      }

      to {
        transform: translateX(-50%);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .partners-track {
        animation: none !important;
        transform: none !important;
      }
    }
  `}
        </style>
      </section> */}

      {/* ==================== News ==================== */}

      <section id="news" className="bg-white py-10 sm:py-20 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent">
                Media Room
              </p>

              <h2 className="mt-3 text-xl font-semibold tracking-tight text-brand-primary sm:mt-4 sm:text-2xl lg:text-3xl">
                Latest from ILS.
              </h2>

              <p className="mt-4 text-sm leading-6 text-slate-600 sm:mt-5 sm:text-base sm:leading-7 lg:text-sm">
                Discover the latest news, industry insights and milestones from
                ILS Egypt.
              </p>
            </div>

            <a
              href="/news"
              className="inline-flex min-h-12 w-fit max-w-full items-center justify-center gap-2  border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-brand-primary transition hover:border-sky-200 hover:text-brand-accent sm:px-5"
            >
              View All News
              <ArrowUpRight size={17} />
            </a>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:mt-14 lg:grid-cols-3">
            {newsItems.map((news) => (
              <Link
                key={news.id}
                to={news.to}
                className="group flex h-full flex-col overflow-hidden  border border-slate-200/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl hover:shadow-slate-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 "
              >
                <div className="relative aspect-16/10 overflow-hidden bg-slate-100">
                  <img
                    src={news.image}
                    alt={news.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />

                  <div className="absolute inset-0 bg-linear-to-t from-slate-950/40 via-transparent to-transparent" />

                  <div className="absolute left-5 top-5">
                    <span className="bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm backdrop-blur-sm">
                      {news.category}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-4 sm:p-5 lg:p-6">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                    <span>{news.date}</span>
                  </div>

                  <h3 className="mt-3 text-base font-semibold leading-snug text-brand-primary transition group-hover:text-brand-accent">
                    {news.title}
                  </h3>

                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
                    {news.excerpt}
                  </p>

                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-primary transition group-hover:text-brand-accent">
                    Read more
                    <ArrowUpRight
                      size={16}
                      className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== Why ILS ==================== */}

      <section id="about" className="bg-brand-bg py-10 sm:py-20 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.6fr_4fr] lg:items-center lg:gap-8">
            {/* Left */}

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent">
                Why ILS
              </p>

              <h2 className="mt-3 max-w-xl text-xl font-semibold leading-tight tracking-tight text-brand-primary sm:mt-4 sm:text-xl lg:text-xl">
                Why ILS should be your transport and logistics company of choice
              </h2>

             
            </div>

            {/* Right */}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-3">
              <WhyCard
                number="01"
                title="Global Network"
                description="Connected to trusted partners and logistics networks across global markets."
              />

              <WhyCard
                number="02"
                title="Local Expertise"
                description="Deep knowledge of the Egyptian market, ports and logistics environment."
              />

              <WhyCard
                number="03"
                title="Integrated Solutions"
                description="Multiple logistics services working together to simplify your supply chain."
              />

              <WhyCard
                number="04"
                title="Reliable Partnership"
                description="A customer-focused approach built around communication and dependable execution."
              />
            </div>
          </div>
        </div>
      </section>

      {/* ==================== Contact ==================== */}

      <section id="contact" className="bg-white py-10 sm:py-20 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-start gap-8 sm:gap-10 lg:grid-cols-2 lg:gap-16 xl:gap-20">
            {/* Left */}

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent">
                Contact ILS
              </p>

              <h2 className="mt-3 max-w-xl text-xl font-semibold leading-tight tracking-tight text-brand-primary sm:mt-4 sm:text-2xl lg:text-3xl">
                Let’s move your business forward.
              </h2>

              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600 sm:mt-6 sm:text-base sm:leading-8 lg:text-sm">
                Tell us what you need and our team will get back to you to
                discuss the right logistics solution for your business.
              </p>

              <div className="mt-10 space-y-6">
                <ContactInfo label="Email" value="info@ilsegypt.com" />

                <ContactInfo label="Phone" value="0222683311 - 0222683312" />

                <ContactInfo
                  label="Location"
                  value="ILS | (Egypt) Ltd. | Plot No. 5, Square 1258W, Behind Sun City Mall – Al Nozha – Sheraton - Heliopolis - Cairo, Egypt"
                />
              </div>
            </div>

            {/* Right */}

            <div className="min-w-0  border border-slate-200/80 bg-white p-4 shadow-sm  sm:p-6 lg:p-8 xl:p-9">
              <form onChange={(event) => {
                const field = event.target.name?.toLowerCase();
                if (field) setContactFields(previous => {
                  const next = { ...previous };
                  delete next[field];
                  return next;
                });
              }} onSubmit={handleContactSubmit} className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Full Name
                    </label>

                    <input
                      type="text"
                      name="fullName"
                      aria-invalid={Boolean(contactFields.fullname?.length)}
                      autoComplete="name"
                      placeholder="Your name"
                      required
                      className="mt-2 min-h-12 w-full  border border-slate-200 bg-white px-4 py-3 text-sm text-brand-primary outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    />
                    <ApiFieldError errors={contactFields} field="fullName" />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Company
                    </label>

                    <input
                      type="text"
                      name="company"
                      aria-invalid={Boolean(contactFields.company?.length)}
                      autoComplete="organization"
                      placeholder="Company name"
                      required
                      className="mt-2 min-h-12 w-full  border border-slate-200 bg-white px-4 py-3 text-sm text-brand-primary outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    />
                    <ApiFieldError errors={contactFields} field="company" />
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Email
                    </label>

                    <input
                      type="email"
                      name="email"
                      aria-invalid={Boolean(contactFields.email?.length)}
                      autoComplete="email"
                      placeholder="you@company.com"
                      required
                      className="mt-2 min-h-12 w-full  border border-slate-200 bg-white px-4 py-3 text-sm text-brand-primary outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    />
                    <ApiFieldError errors={contactFields} field="email" />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Phone
                    </label>

                    <input
                                            onInput={sanitizePhoneInput}
                      type="tel"
                      name="phone"
                      aria-invalid={Boolean(contactFields.phone?.length)}
                      autoComplete="tel"
                      placeholder="+20"
                      required
                      className="mt-2 min-h-12 w-full  border border-slate-200 bg-white px-4 py-3 text-sm text-brand-primary outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    />
                    <ApiFieldError errors={contactFields} field="phone" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Service
                  </label>

                  <select
                    name="service"
                      aria-invalid={Boolean(contactFields.service?.length)}
                    required
                    className="mt-2 min-h-12 w-full  border border-slate-200 bg-white px-4 py-3 text-sm text-brand-primary outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select a service
                    </option>

                    <option>Sea Freight</option>

                    <option>Air Freight</option>

                    <option>Road Transportation</option>

                    <option>Customs Clearance</option>

                    <option>Consolidations</option>

                    <option>Project Transportation</option>

                    <option>Warehousing</option>

                    <option>Cargo</option>
                  </select>
                    <ApiFieldError errors={contactFields} field="service" />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Message
                  </label>

                  <textarea
                    name="message"
                      aria-invalid={Boolean(contactFields.message?.length)}
                    rows={5}
                    required
                    placeholder="Tell us about your requirements..."
                    className="mt-2 w-full resize-none  border border-slate-200 bg-white px-4 py-3 text-sm text-brand-primary outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  />
                    <ApiFieldError errors={contactFields} field="message" />
                </div>

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2  bg-brand-primary px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-primary-hover"
                >
                  Send Inquiry
                  <ArrowUpRight size={17} />
                </button>

                {contactSubmitted && (
                  <div className="border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                    Your inquiry has been sent successfully.
                  </div>
                )}

                {contactError && (
                  <div role="alert" className="border border-brand-danger-border bg-brand-danger-soft px-4 py-3 text-sm font-medium text-brand-danger">
                    {contactError}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== Footer ==================== */}
    </main>
  );
}

function IndustryCard({ icon, title, description, to }) {
  return (
    <Link
      to={to}
      className="group flex min-h-56 flex-col  border-brand-border bg-brand-bg m-1 px-6 py-8 transition-colors hover:bg-brand-border focus-visible:outline-2 focus-visible:outline-brand-accent sm:px-8"
    >
      <div className="mb-6  text-brand-primary transition-colors group-hover:text-brand-accent">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-brand-primary sm:text-base">{title}</h3>
      <p className="mt-3 flex-1 text-sm leading-7 text-brand-muted">{description}</p>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-primary">
        Explore industry <ArrowUpRight size={16} aria-hidden="true" />
      </span>
    </Link>
  );
}

function SolutionCard({ image, title, to }) {
  return (
    <Link
      to={to}
      className="group relative block aspect-4/5 w-[78vw] max-w-80 shrink-0 snap-start overflow-hidden bg-brand-primary focus-visible:outline-2 focus-visible:outline-brand-accent sm:w-[42vw] lg:w-[24%] lg:max-w-none"
    >
      <img
        src={image}
        alt={title}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-linear-to-t from-[#141625]/90 via-transparent to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
        <h3 className="text-sm font-semibold text-white sm:text-base">{title}</h3>
        <ArrowUpRight size={20} className="shrink-0 text-white" aria-hidden="true" />
      </div>
    </Link>
  );
}

function WhyCard({ number, title, description }) {
  return (
    <article className="flex h-full min-w-0 flex-col border-l border-brand-primary/20 px-4 py-2">
      <span className="text-lg font-semibold text-brand-accent">
        {number}
      </span>

      <h3 className="mt-3 text-base font-semibold leading-snug text-brand-primary">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-brand-muted">
        {description}
      </p>
    </article>
  );
}

function ContactInfo({ label, value }) {
  return (
    <div className="group flex min-w-0 items-start gap-3 sm:gap-4">
      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center  bg-sky-50 transition-colors duration-300 group-hover:bg-sky-100">
        <span className="h-2 w-2  bg-brand-primary" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
          {label}
        </p>

        <p className="mt-1 wrap-break-word text-sm font-medium leading-6 text-brand-primary sm:text-base sm:leading-7">
          {value}
        </p>
      </div>
    </div>
  );
}

export default Home;
