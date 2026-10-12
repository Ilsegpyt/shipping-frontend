import { useEffect, useState } from "react";
import WebsiteNavbar from "../../components/website/WebsiteNavbar";
import WebsiteFooter from "../../components/website/WebsiteFooter";
import { Link, useLocation } from "react-router-dom";

import contentService from "../../services/contentService";
import contactInquiriesService from "../../services/contactInquiriesService";

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

const API_BASE_URL = "http://localhost:5250";

const getImageUrl = (image) => {
  if (!image) return "";

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  return `${API_BASE_URL}${image}`;
};

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

async function getAllContent() {
  const response = await contentService.getRootContent();

  const roots = Array.isArray(response.data) ? response.data : [];

  const allContent = [];

  const visited = new Set();

  async function collect(items) {
    for (const item of items) {
      if (!item?.id || visited.has(item.id)) {
        continue;
      }

      visited.add(item.id);

      allContent.push(item);

      try {
        const childrenResponse = await contentService.getChildren(item.id);

        const children = Array.isArray(childrenResponse.data)
          ? childrenResponse.data
          : [];

        if (children.length > 0) {
          await collect(children);
        }
      } catch (childError) {
        console.error(
          `Failed to load children for content ${item.id}:`,

          childError,
        );
      }
    }
  }

  await collect(roots);

  return allContent;
}

function Home() {
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
      setContactError(
        typeof error.response?.data === "string"
          ? error.response.data
          : error.response?.data?.message ||
              error.response?.data?.error ||
              "Failed to send your inquiry.",
      );
    }
  };

  return (
    <main className="bg-white">
      {/* ==================== Hero ==================== */}

      <section className="relative min-h-screen overflow-hidden">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={heroVideo}
          autoPlay
          muted
          loop
          playsInline
        />

        <div className="absolute inset-0 bg-slate-950/55" />

        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950/60 to-transparent" />

        {/* Navbar */}

        <WebsiteNavbar />

        {/* Hero Content */}

        <div className="relative z-10 flex min-h-screen w-full items-center px-6 pb-20 pt-32 lg:px-16">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-sky-400" />

              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/90">
                International Logistics Solutions
              </span>
            </div>

            <h1 className="max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
              You grow your business.
              <span className="block text-sky-400">
                We'll take care of the logistics.
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
              As the world of commerce is changing, it's time to change your
              business with it. Move your logistics service from offline to
              online. With ILS, shipment, tracking and managing your shipments
              is easy
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <a
                href="#solutions"
                className="rounded-xl bg-sky-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-950/20 transition hover:bg-sky-400"
              >
                Explore Solutions
              </a>

              <a
                href="#contact"
                className="rounded-xl border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/15"
              >
                Talk to ILS
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== Industries ==================== */}

      <section id="industries" className="bg-slate-50 py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
              Industries
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Logistics expertise built around your industry.
            </h2>

            <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">
              Industry-focused logistics solutions designed to support your
              operations, supply chain and business goals.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
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

      <section id="solutions" className="bg-white py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                ILS Solutions
              </p>

              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                End-to-end logistics solutions.
              </h2>

              <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">
                Flexible logistics solutions designed to move your cargo
                efficiently across every stage of the supply chain.
              </p>
            </div>

            <a
              href="#contact"
              onClick={(e) => {
                e.preventDefault();

                document.getElementById("contact")?.scrollIntoView({
                  behavior: "smooth",
                });
              }}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-sky-200 hover:text-sky-600"
            >
              Discuss your requirements
              <ArrowUpRight size={17} />
            </a>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <SolutionCard
              image={seaFreight}
              title={seaFreightContent?.title || "Sea Freight"}
              to="/solutions/sea-freight"
            />

            <SolutionCard
              image={airFreight}
              title={airFreightContent?.title || "Air Freight"}
              to="/solutions/air-freight"
            />

            <SolutionCard
              image={roadTransportation}
              title={roadTransportationContent?.title || "Road Transportation"}
              to="/solutions/road-transportation"
            />

            <SolutionCard
              image={customsClearance}
              title={customsClearanceContent?.title || "Customs Clearance"}
              to="/solutions/customs-clearance"
            />

            <SolutionCard
              image={consolidations}
              title={consolidationsContent?.title || "Consolidations"}
              to="/solutions/consolidations"
            />

            <SolutionCard
              image={projectTransportation}
              title={projectTransportContent?.title || "Project Transport"}
              to="/solutions/project-transport"
            />

            <SolutionCard
              image={warehousing}
              title={
                warehousingDistributionContent?.title ||
                "Warehousing and Distribution"
              }
              to="/solutions/warehousing-distribution"
            />

            <SolutionCard
              image={cargo}
              title={cargoInsuranceContent?.title || "Cargo Insurance"}
              to="/solutions/cargo-insurance"
            />
          </div>
        </div>
      </section>

      {/* ==================== Partners ==================== */}

      <section className="overflow-hidden bg-slate-50 py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
              ILS Partners
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Connected to a global network.
            </h2>

            <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">
              Strong partnerships help us deliver reliable logistics solutions
              across global markets.
            </p>
          </div>

          <div className="relative mt-16 overflow-hidden">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-slate-50 to-transparent sm:w-40" />

            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-slate-50 to-transparent sm:w-40" />

            <div className="flex w-max animate-[partners-scroll_45s_linear_infinite]">
              <div className="flex items-center gap-6 px-3">
                {partners.map((partner, index) => (
                  <div
                    key={`partner-${index}`}
                    className="flex h-24 w-40 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 shadow-sm"
                  >
                    <img
                      src={partner}
                      alt={`ILS Partner ${index + 1}`}
                      className="max-h-12 max-w-full object-contain"
                    />
                  </div>
                ))}
              </div>

              <div aria-hidden="true" className="flex items-center gap-6 px-3">
                {partners.map((partner, index) => (
                  <div
                    key={`partner-copy-${index}`}
                    className="flex h-24 w-40 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 shadow-sm"
                  >
                    <img
                      src={partner}
                      alt=""
                      className="max-h-12 max-w-full object-contain"
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



                    `}
        </style>
      </section>

      {/* ==================== News ==================== */}

      <section id="news" className="bg-white py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                Media Room
              </p>

              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                Latest from ILS.
              </h2>

              <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">
                Discover the latest news, industry insights and milestones from
                ILS Egypt.
              </p>
            </div>

            <a
              href="/news"
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-sky-200 hover:text-sky-600"
            >
              View All News
              <ArrowUpRight size={17} />
            </a>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {newsItems.map((news) => (
              <Link
                key={news.id}
                to={news.to}
                className="group overflow-hidden rounded-3xl border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl hover:shadow-slate-200/60"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                  <img
                    src={news.image}
                    alt={news.title}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />

                  <div className="absolute left-5 top-5">
                    <span className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm backdrop-blur-sm">
                      {news.category}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                    <span>{news.date}</span>
                  </div>

                  <h3 className="mt-3 text-xl font-semibold leading-snug text-slate-900 transition group-hover:text-sky-600">
                    {news.title}
                  </h3>

                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
                    {news.excerpt}
                  </p>

                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 transition group-hover:text-sky-600">
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

      <section id="about" className="bg-slate-950 py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            {/* Left */}

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
                Why ILS
              </p>

              <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
                WHY ILS SHOULD BE YOUR TRANSPORT AND LOGISTICS COMPANY OF CHOICE
              </h2>

              <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                As a global freight forwarder, ILS provides and manages supply
                chain solutions for thousands of companies every day. Whether
                you are a small family-run business or large global corporation
                ILS focus on keeping your supply chains flowing through
                operational excellence and sustainable growth. This is at the
                core of our purpose, vision and mission. Our skilled people with
                industry know-how, modern warehouses, strong carrier
                relationships and a global network across 80 countries position
                us to better serve your needs. ILS help you achieve your
                business objectives through a unique blend of optimized and
                flexible solutions, combined with visibility tools
              </p>
            </div>

            {/* Right */}

            <div className="grid gap-4 sm:grid-cols-2">
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

      <section id="contact" className="bg-slate-50 py-24 sm:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
            {/* Left */}

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                Contact ILS
              </p>

              <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                Let’s move your business forward.
              </h2>

              <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
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

            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
              <form onSubmit={handleContactSubmit} className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Full Name
                    </label>

                    <input
                      type="text"
                      name="fullName"
                      placeholder="Your name"
                      required
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Company
                    </label>

                    <input
                      type="text"
                      name="company"
                      placeholder="Company name"
                      required
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    />
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
                      placeholder="you@company.com"
                      required
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Phone
                    </label>

                    <input
                      type="tel"
                      name="phone"
                      placeholder="+20"
                      required
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Service
                  </label>

                  <select
                    name="service"
                    required
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
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
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Message
                  </label>

                  <textarea
                    name="message"
                    rows={5}
                    required
                    placeholder="Tell us about your requirements..."
                    className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-sky-400"
                >
                  Send Inquiry
                  <ArrowUpRight size={17} />
                </button>

                {contactSubmitted && (
                  <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                    Your inquiry has been sent successfully.
                  </div>
                )}

                {contactError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {contactError}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== Footer ==================== */}
      <WebsiteFooter />
    </main>
  );
}

function IndustryCard({
  icon,

  title,

  description,

  to,
}) {
  return (
    <Link
      to={to}
      className="group relative block overflow-hidden rounded-3xl border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl hover:shadow-slate-200/60"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
          {icon}
        </div>

        <ArrowUpRight
          size={20}
          className="text-slate-300 transition duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-sky-500"
        />
      </div>

      <h3 className="mt-7 text-xl font-semibold text-slate-900">{title}</h3>

      <p className="mt-4 text-sm leading-6 text-slate-600">{description}</p>
    </Link>
  );
}

function SolutionCard({
  image,

  title,

  to,
}) {
  return (
    <Link
      to={to}
      className="group relative block aspect-[4/5] overflow-hidden rounded-3xl bg-slate-900"
    >
      <img
        src={image}
        alt={title}
        className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/60">
              Solution
            </p>

            <h3 className="mt-2 text-xl font-semibold text-white">{title}</h3>
          </div>

          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition group-hover:bg-sky-500">
            <ArrowUpRight size={19} />
          </span>
        </div>
      </div>
    </Link>
  );
}

function WhyCard({
  number,

  title,

  description,
}) {
  return (
    <article className="group rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition duration-300 hover:border-sky-400/30 hover:bg-white/[0.07]">
      <span className="text-xs font-semibold tracking-[0.2em] text-sky-400">
        {number}
      </span>

      <h3 className="mt-6 text-xl font-semibold text-white">{title}</h3>

      <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
    </article>
  );
}

function ContactInfo({
  label,

  value,
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-sky-500" />

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
          {label}
        </p>

        <p className="mt-1 text-base font-medium text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export default Home;
