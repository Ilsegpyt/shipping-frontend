import { useEffect, useState } from "react";
import contentService from "../../../services/contentService";

const API_BASE_URL = "http://localhost:5250";

const CERTIFICATE_NAMES = [
    "IATA",
    "AFBN",
    "JCTRANS",
    "FIATA",
    "GLA",
    "CGLI",
    "EEFA",
    "ECAA7",
];

const decodeHtml = (value) => {
    if (!value) return "";

    let decoded = String(value);

    for (let i = 0; i < 5; i += 1) {
        const textarea = document.createElement("textarea");
        textarea.innerHTML = decoded;

        const next = textarea.value;

        if (next === decoded) {
            break;
        }

        decoded = next;
    }

    return decoded;
};

const getImageUrl = (src) => {
    if (!src) return "";

    let cleaned = decodeHtml(src)
        .replace(/```(?:json|html|text)?/gi, "")
        .replace(/```/g, "")
        .trim();

    if (!cleaned) return "";

    if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
        return cleaned;
    }

    if (cleaned.startsWith("//")) {
        return `http:${cleaned}`;
    }

    return `${API_BASE_URL}${cleaned.startsWith("/") ? "" : "/"}${cleaned}`;
};

const getContentTypeName = (type) => {
    if (typeof type === "string") {
        return type;
    }

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

const parseCertificatesBody = (body) => {
    const html = decodeHtml(body || "");

    if (!html) {
        return {
            description: "",
            certificates: [],
        };
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const textOf = (element) =>
        element?.textContent?.replace(/\s+/g, " ").trim() || "";

    // The first text block without an image is the page description.
    const description =
        Array.from(doc.body.children).find((element) => {
            return !element.querySelector("img") && textOf(element);
        })?.textContent?.replace(/\s+/g, " ").trim() || "";

    /*
     * IMPORTANT:
     * Do not require a name to exist next to the image.
     *
     * Tiptap can save an uploaded image as:
     *
     * <p><img src="/uploads/content/....webp"></p>
     *
     * with no alt text and no paragraph containing the certificate name.
     *
     * In that case we use the known certificate order:
     * IATA, AFBN, JCTRANS, FIATA, GLA, CGLI, EEFA, ECAA7.
     */

    const imageElements = Array.from(doc.querySelectorAll("img"));

    const certificates = imageElements
        .map((image, index) => {
            const src = image.getAttribute("src")?.trim();

            if (!src) {
                return null;
            }

            let name = image.getAttribute("alt")?.trim() || "";

            // Try to find a text block after the image.
            if (!name) {
                let current = image.parentElement;

                for (let level = 0; level < 3 && current; level += 1) {
                    let sibling = current.nextElementSibling;

                    while (sibling) {
                        const candidate = textOf(sibling);

                        if (candidate && !sibling.querySelector("img")) {
                            name = candidate;
                            break;
                        }

                        sibling = sibling.nextElementSibling;
                    }

                    if (name) {
                        break;
                    }

                    current = current.parentElement;
                }
            }

            // Finally use the known CMS certificate order.
            if (!name) {
                name =
                    CERTIFICATE_NAMES[index] ||
                    `Certificate ${index + 1}`;
            }

            return {
                id: `${name}-${index}`,
                name,
                image: getImageUrl(src),
            };
        })
        .filter(Boolean);

    return {
        description,
        certificates,
    };
};

export default function Certificates() {
    const [page, setPage] = useState(null);
    const [certificates, setCertificates] = useState([]);
    const [description, setDescription] = useState("");
    const [selectedCertificate, setSelectedCertificate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let isMounted = true;

        const loadCertificates = async () => {
            try {
                setLoading(true);
                setError("");

                // Get root content.
                const rootResponse = await contentService.getRootContent();

                const rootContent = Array.isArray(rootResponse.data)
                    ? rootResponse.data
                    : [];

                // Find About ILS.
                const aboutIls = rootContent.find(
                    (item) =>
                        getContentTypeName(item.type) === "Category" &&
                        item.title?.trim().toLowerCase() === "about ils"
                );

                if (!aboutIls?.id) {
                    throw new Error(
                        "About ILS category was not found in CMS."
                    );
                }

                // Get children of About ILS.
                const childrenResponse = await contentService.getChildren(
                    aboutIls.id
                );

                const children = Array.isArray(childrenResponse.data)
                    ? childrenResponse.data
                    : [];

                // Find Certificates page.
                const certificatesSummary = children.find(
                    (item) =>
                        getContentTypeName(item.type) === "Page" &&
                        item.title?.trim().toLowerCase() === "certificates"
                );

                if (!certificatesSummary?.id) {
                    throw new Error(
                        "Certificates page was not found under About ILS in CMS."
                    );
                }

                // Get the complete page, including Body.
                const pageResponse = await contentService.getById(
                    certificatesSummary.id
                );

                const fullPage = pageResponse?.data;

                if (!fullPage) {
                    throw new Error(
                        "Certificates page details could not be loaded from CMS."
                    );
                }

                const parsed = parseCertificatesBody(fullPage.body);

                console.log("Certificates CMS page:", fullPage);
                console.log("Certificates parsed:", parsed);

                if (isMounted) {
                    setPage(fullPage);
                    setDescription(parsed.description);
                    setCertificates(parsed.certificates);
                }
            } catch (err) {
                console.error(
                    "Failed to load Certificates from CMS:",
                    err
                );

                if (isMounted) {
                    setError(
                        err?.message ||
                        "Failed to load Certificates content from CMS."
                    );
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadCertificates();

        return () => {
            isMounted = false;
        };
    }, []);

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50">
                <p className="text-sm text-slate-500">
                    Loading certificates...
                </p>
            </main>
        );
    }

    if (error) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
                    {error}
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50">
            <section className="bg-slate-950 px-6 pb-20 pt-32 sm:px-8 lg:px-12">
                <div className="mx-auto max-w-7xl">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
                        About ILS
                    </p>

                    <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                        {page?.title || "Certificates"}
                    </h1>

                    {description && (
                        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                            {description}
                        </p>
                    )}
                </div>
            </section>

            <section className="px-6 py-16 sm:px-8 sm:py-20 lg:px-12">
                <div className="mx-auto max-w-7xl">
                    {certificates.length === 0 ? (
                        <div className="py-16 text-center text-sm text-slate-500">
                            No certificates found.
                        </div>
                    ) : (
                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {certificates.map((certificate) => (
                                <button
                                    key={certificate.id}
                                    type="button"
                                    onClick={() =>
                                        setSelectedCertificate(certificate)
                                    }
                                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:border-sky-300 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-sky-100"
                                >
                                    <div className="aspect-[4/3] overflow-hidden bg-white">
                                        <img
                                            src={certificate.image}
                                            alt={`${certificate.name} certificate`}
                                            className="h-full w-full object-contain p-3 transition duration-500 group-hover:scale-[1.02]"
                                            onError={(event) => {
                                                console.error(
                                                    "Certificate image failed to load:",
                                                    certificate.image
                                                );
                                                event.currentTarget.style.display =
                                                    "none";
                                            }}
                                        />
                                    </div>

                                    <div className="border-t border-slate-100 px-5 py-4">
                                        <p className="text-sm font-semibold text-slate-900">
                                            {certificate.name}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {selectedCertificate && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-5 backdrop-blur-sm"
                    onClick={() => setSelectedCertificate(null)}
                >
                    <div
                        className="relative max-h-[90vh] max-w-5xl overflow-hidden rounded-2xl bg-white p-3 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setSelectedCertificate(null)}
                            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-slate-950/80 text-xl text-white transition hover:bg-slate-950"
                            aria-label="Close certificate preview"
                        >
                            ×
                        </button>

                        <img
                            src={selectedCertificate.image}
                            alt={`${selectedCertificate.name} certificate enlarged`}
                            className="max-h-[84vh] max-w-full rounded-xl object-contain"
                        />
                    </div>
                </div>
            )}
        </main>
    );
}
