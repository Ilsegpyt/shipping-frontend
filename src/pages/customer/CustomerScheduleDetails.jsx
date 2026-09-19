import { useEffect, useState } from "react";
import {
    useNavigate,
    useParams,
    useSearchParams,
} from "react-router-dom";
import {
    CheckCircle2,
    ChevronDown,
    FileText,
    Upload,
    X,
} from "lucide-react";
import api from "../../services/api";

const formatDate = (value) => {
    if (!value) return "-";

    return new Date(value).toLocaleDateString("en-GB");
};

const formatRate = (currency, amount) => {
    if (amount === null || amount === undefined || amount === "") {
        return "-";
    }

    const numericAmount = Number(amount);

    const formattedAmount = Number.isNaN(numericAmount)
        ? amount
        : numericAmount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    return `${currency || ""} ${formattedAmount}`.trim();
};

const getModeLabel = (value) => {
    if (value === 1 || value === "1" || value === "Sea") {
        return "Sea";
    }

    if (value === 2 || value === "2" || value === "Air") {
        return "Air";
    }

    return value || "-";
};

const getContainerSizeLabel = (value) => {
    const sizes = {
        1: "Dry 20 Standard",
        2: "Dry 40 Standard",
        3: "Dry 40 High",
        4: "Dry 45 High",
        5: "Reefer 20 Standard",
        6: "Reefer 40 High",
        7: "Open Top 20",
        8: "Open Top 40",
        9: "Open Top 40 High",
        10: "Flat 40 Standard",
        11: "Flat 40 High",
        12: "Flat 20",
        13: "Tank 20",
        14: "Tank 40",
    };

    return sizes[value] || value || "-";
};

export default function CustomerScheduleDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [schedule, setSchedule] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [isBookingOpen, setIsBookingOpen] = useState(false);
    const [quantity, setQuantity] = useState("");
    const [declarationFiles, setDeclarationFiles] = useState([]);

    const [bookingLoading, setBookingLoading] = useState(false);
    const [bookingError, setBookingError] = useState("");
    const [bookingSuccess, setBookingSuccess] = useState(null);

    const [showTerms, setShowTerms] = useState(false);
    const [hasReadTerms, setHasReadTerms] = useState(false);

    useEffect(() => {
        const loadSchedule = async () => {
            try {
                setLoading(true);
                setError("");

                const response = await api.get(`/api/schedules/${id}`);

                setSchedule(response.data);

                if (searchParams.get("booking") === "true") {
                    setIsBookingOpen(true);
                }
            } catch (error) {
                console.error("Failed to load schedule:", error);

                setError(
                    error.response?.data?.error ||
                    error.response?.data?.message ||
                    "Failed to load schedule details."
                );
            } finally {
                setLoading(false);
            }
        };

        loadSchedule();
    }, [id, searchParams]);

    const openBookingModal = () => {
        setQuantity("");
        setDeclarationFiles([]);
        setBookingError("");
        setBookingSuccess(null);
        setShowTerms(false);
        setHasReadTerms(false);
        setIsBookingOpen(true);
    };

    const closeBookingModal = () => {
        if (bookingLoading) return;

        setIsBookingOpen(false);
        setSearchParams({});
        setBookingError("");
        setBookingSuccess(null);
        setShowTerms(false);
        setHasReadTerms(false);
    };

    const handleFilesChange = (event) => {
        const selectedFiles = Array.from(event.target.files || []);

        setDeclarationFiles((previousFiles) => [
            ...previousFiles,
            ...selectedFiles,
        ]);

        event.target.value = "";
    };

    const removeFile = (indexToRemove) => {
        setDeclarationFiles((previousFiles) =>
            previousFiles.filter((_, index) => index !== indexToRemove)
        );
    };

    const handleBookingSubmit = async (event) => {
        event.preventDefault();

        setBookingError("");
        setBookingSuccess(null);

        const parsedQuantity = Number(quantity);

        if (!parsedQuantity || parsedQuantity <= 0) {
            setBookingError("Please enter a valid quantity.");
            return;
        }

        if (declarationFiles.length === 0) {
            setBookingError("Please upload at least one declaration file.");
            return;
        }

        if (!hasReadTerms) {
            setBookingError(
                "Please confirm that you have read and agree to the booking terms and conditions."
            );
            return;
        }

        try {
            setBookingLoading(true);

            const formData = new FormData();

            formData.append("ScheduleId", id);
            formData.append("Quantity", parsedQuantity);

            declarationFiles.forEach((file) => {
                formData.append("DeclarationFiles", file);
            });

            const response = await api.post("/api/shipments", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            setBookingSuccess(response.data);

            setQuantity("");
            setDeclarationFiles([]);
        } catch (error) {
            console.error("Failed to book shipment:", error);

            setBookingError(
                error.response?.data?.error ||
                error.response?.data?.message ||
                "Failed to book shipment. Please try again."
            );
        } finally {
            setBookingLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-full bg-gray-50 p-4 sm:p-6">
                <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                    Loading schedule details...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-full bg-gray-50 p-4 sm:p-6">
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>

                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                    Back
                </button>
            </div>
        );
    }

    if (!schedule) {
        return null;
    }

    const rateAmount = Number(schedule.rateAmount) || 0;
    const containerQuantity = Number(quantity) || 0;
    const totalAmount = rateAmount * containerQuantity;

    return (
        <div className="min-h-full bg-gray-50 p-4 sm:p-6">
            {/* Page Header */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="mb-3 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                        Back
                    </button>

                    <h1 className="text-2xl font-semibold text-slate-900">
                        Schedule Details
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                        View complete schedule information
                    </p>
                </div>

                <button
                    type="button"
                    onClick={openBookingModal}
                    className="rounded-lg bg-[#111827] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f2937]"
                >
                    Book Shipment
                </button>
            </div>

            {/* Schedule Details */}
            <div className="space-y-6">
                {/* Route Information */}
                <section className="rounded-xl border border-slate-200 bg-white p-5">
                    <h2 className="mb-4 text-sm font-semibold text-slate-900">
                        Route Information
                    </h2>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <InfoItem label="Origin" value={schedule.origin} />

                        <InfoItem
                            label="Departure Port"
                            value={schedule.departurePortCode}
                        />

                        <InfoItem
                            label="Destination"
                            value={schedule.destination}
                        />

                        <InfoItem
                            label="Arrival Port"
                            value={schedule.arrivalPortCode}
                        />

                        <InfoItem
                            label="Departure Country"
                            value={schedule.departureCountry}
                        />

                        <InfoItem
                            label="Arrival Country"
                            value={schedule.arrivalCountry}
                        />

                        <InfoItem
                            label="Departure Date"
                            value={formatDate(schedule.departureDate)}
                        />

                        <InfoItem
                            label="Arrival Date"
                            value={formatDate(schedule.arrival)}
                        />
                    </div>
                </section>

                {/* Carrier Information */}
                <section className="rounded-xl border border-slate-200 bg-white p-5">
                    <h2 className="mb-4 text-sm font-semibold text-slate-900">
                        Carrier Information
                    </h2>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <InfoItem
                            label="Mode"
                            value={getModeLabel(schedule.mode)}
                        />

                        <InfoItem
                            label="Vessel"
                            value={schedule.vessel}
                        />

                        <InfoItem
                            label="Voyage Number"
                            value={schedule.voyageNumber}
                        />

                        <InfoItem
                            label="Carrier"
                            value={schedule.carrier}
                        />

                        <InfoItem
                            label="Carrier Code"
                            value={schedule.carrierCode}
                        />

                        <InfoItem
                            label="Route ID"
                            value={schedule.routeId}
                        />
                    </div>
                </section>

                {/* Rate Information */}
                <section className="rounded-xl border border-slate-200 bg-white p-5">
                    <h2 className="mb-4 text-sm font-semibold text-slate-900">
                        Rate Information
                    </h2>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <InfoItem
                            label="Container Size"
                            value={getContainerSizeLabel(
                                schedule.containerSize
                            )}
                        />

                        <InfoItem
                            label="Rate Amount"
                            value={formatRate(
                                schedule.rateCurrency,
                                schedule.rateAmount
                            )}
                        />

                        <InfoItem
                            label="Currency"
                            value={schedule.rateCurrency}
                        />

                        <InfoItem
                            label="Transit Time"
                            value={schedule.transitTime}
                        />
                    </div>
                </section>
            </div>

            {/* Booking Modal */}
            {isBookingOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
                    <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">
                                    Book Shipment
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Create a shipment using this schedule.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeBookingModal}
                                disabled={bookingLoading}
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {bookingSuccess ? (
                            /* Success State */
                            <div className="px-6 py-10 text-center">
                                <CheckCircle2
                                    size={56}
                                    className="mx-auto text-emerald-500"
                                />

                                <h3 className="mt-4 text-xl font-semibold text-slate-900">
                                    Shipment Booked Successfully
                                </h3>

                                <p className="mt-2 text-sm text-slate-500">
                                    Your shipment has been created
                                    successfully.
                                </p>

                                {bookingSuccess.shipmentRef && (
                                    <p className="mt-2 text-sm text-slate-600">
                                        Reference:{" "}
                                        <span className="font-semibold">
                                            {bookingSuccess.shipmentRef}
                                        </span>
                                    </p>
                                )}

                                <button
                                    type="button"
                                    onClick={closeBookingModal}
                                    className="mt-6 rounded-lg bg-[#111827] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f2937]"
                                >
                                    Close
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleBookingSubmit}>
                                <div className="space-y-5 p-6">
                                    {/* Selected Schedule */}
                                    <div>
                                        <h3 className="mb-3 text-sm font-semibold text-slate-900">
                                            Selected Schedule
                                        </h3>

                                        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                                            {/* Route */}
                                            <div>
                                                <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                                                    Route
                                                </p>

                                                <p className="mt-1 text-base font-semibold text-slate-900">
                                                    {schedule.origin || "-"}{" "}
                                                    <span className="mx-2 text-blue-500">
                                                        →
                                                    </span>
                                                    {schedule.destination ||
                                                        "-"}
                                                </p>
                                            </div>

                                            {/* Important Details */}
                                            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <SummaryItem
                                                    label="Transit Time"
                                                    value={
                                                        schedule.transitTime
                                                    }
                                                />

                                                <SummaryItem
                                                    label="Container"
                                                    value={getContainerSizeLabel(
                                                        schedule.containerSize
                                                    )}
                                                />

                                                <SummaryItem
                                                    label="Rate Amount"
                                                    value={formatRate(
                                                        schedule.rateCurrency,
                                                        schedule.rateAmount
                                                    )}
                                                />

                                                <SummaryItem
                                                    label="Voyage Number"
                                                    value={
                                                        schedule.voyageNumber
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quantity and Total */}
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label
                                                htmlFor="quantity"
                                                className="mb-2 block text-sm font-medium text-slate-700"
                                            >
                                                Number of Containers
                                            </label>

                                            <input
                                                id="quantity"
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={quantity}
                                                onChange={(event) =>
                                                    setQuantity(
                                                        event.target.value
                                                    )
                                                }
                                                placeholder="Enter quantity"
                                                disabled={bookingLoading}
                                                required
                                                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                                            />
                                        </div>

                                        <div>
                                            <p className="mb-2 text-sm font-medium text-slate-700">
                                                Total Amount
                                            </p>

                                            <div className="flex h-[42px] items-center rounded-lg border border-slate-200 bg-slate-50 px-3">
                                                <span className="text-base font-semibold text-slate-900">
                                                    {containerQuantity > 0
                                                        ? formatRate(
                                                            schedule.rateCurrency,
                                                            totalAmount
                                                        )
                                                        : "-"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Declaration Files */}
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-slate-700">
                                            Declaration Files
                                        </label>

                                        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 px-4 py-5 text-center transition hover:border-blue-400 hover:bg-blue-50/50">
                                            <Upload
                                                size={24}
                                                className="text-slate-400"
                                            />

                                            <span className="mt-2 text-sm font-medium text-slate-700">
                                                Click to upload files
                                            </span>

                                            <span className="mt-1 text-xs text-slate-500">
                                                You can select multiple files
                                            </span>

                                            <input
                                                type="file"
                                                multiple
                                                onChange={handleFilesChange}
                                                disabled={bookingLoading}
                                                className="hidden"
                                            />
                                        </label>

                                        {declarationFiles.length > 0 && (
                                            <div className="mt-3 space-y-2">
                                                {declarationFiles.map(
                                                    (file, index) => (
                                                        <div
                                                            key={`${file.name}-${index}`}
                                                            className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                                                        >
                                                            <div className="flex min-w-0 items-center gap-2">
                                                                <FileText
                                                                    size={17}
                                                                    className="shrink-0 text-slate-500"
                                                                />

                                                                <span className="truncate text-sm text-slate-700">
                                                                    {file.name}
                                                                </span>
                                                            </div>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    removeFile(
                                                                        index
                                                                    )
                                                                }
                                                                disabled={
                                                                    bookingLoading
                                                                }
                                                                className="ml-3 shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Booking Terms Accordion */}
                                    <div className="rounded-xl border border-slate-200">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowTerms(
                                                    (previous) => !previous
                                                )
                                            }
                                            className="flex w-full items-center justify-between px-4 py-3 text-left"
                                        >
                                            <span className="text-sm font-semibold text-slate-900">
                                                Booking Terms & Conditions
                                            </span>

                                            <ChevronDown
                                                size={18}
                                                className={`text-slate-500 transition-transform ${showTerms
                                                        ? "rotate-180"
                                                        : ""
                                                    }`}
                                            />
                                        </button>

                                        {showTerms && (
                                            <div className="border-t border-slate-200 px-4 py-4">
                                                <ol className="list-decimal space-y-3 pl-5 text-xs leading-5 text-slate-600">
                                                    <li>
                                                        Rates are subject to
                                                        commodity approval and
                                                        equipment and/or space
                                                        availability at the
                                                        time of loading.
                                                    </li>

                                                    <li>
                                                        Rollovers at the port
                                                        of loading and/or
                                                        transshipment port are
                                                        subject to space
                                                        availability.
                                                    </li>

                                                    <li>
                                                        Free storage is limited
                                                        to seven (7) days from
                                                        the gate-in date until
                                                        vessel departure,
                                                        inclusive of weekends
                                                        and holidays.
                                                    </li>

                                                    <li>
                                                        Rate validity is
                                                        subject to the sailing
                                                        date as stated in the
                                                        footer of the original
                                                        Bill of Lading.
                                                    </li>

                                                    <li>
                                                        The above rates exclude
                                                        container demurrage and
                                                        any applicable local
                                                        charges at the port of
                                                        loading and/or
                                                        discharge.
                                                    </li>

                                                    <li>
                                                        Late Bill of Lading
                                                        collection fees apply
                                                        and are calculated from
                                                        the vessel sailing date,
                                                        with the first ten (10)
                                                        calendar days free.
                                                    </li>

                                                    <li>
                                                        For trucking orders
                                                        involving two (2)
                                                        containers of 30 feet
                                                        on the same truck,
                                                        please contact us to
                                                        obtain the applicable
                                                        rate.
                                                    </li>
                                                </ol>
                                            </div>
                                        )}
                                    </div>

                                    {/* Terms Agreement */}
                                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 transition hover:bg-slate-100">
                                        <input
                                            type="checkbox"
                                            checked={hasReadTerms}
                                            onChange={(event) =>
                                                setHasReadTerms(
                                                    event.target.checked
                                                )
                                            }
                                            disabled={bookingLoading}
                                            className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />

                                        <span className="text-sm leading-5 text-slate-700">
                                            I have read and agree to the
                                            booking terms and conditions.
                                        </span>
                                    </label>

                                    {/* Booking Error */}
                                    {bookingError && (
                                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                                            {bookingError}
                                        </div>
                                    )}
                                </div>

                                {/* Modal Footer */}
                                <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
                                    <button
                                        type="button"
                                        onClick={closeBookingModal}
                                        disabled={bookingLoading}
                                        className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={
                                            bookingLoading || !hasReadTerms
                                        }
                                        className="rounded-lg bg-[#111827] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {bookingLoading
                                            ? "Booking..."
                                            : "Confirm Booking"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function InfoItem({ label, value }) {
    return (
        <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {label}
            </p>

            <p className="mt-1 text-sm font-medium text-slate-800">
                {value !== null && value !== undefined && value !== ""
                    ? value
                    : "-"}
            </p>
        </div>
    );
}

function SummaryItem({ label, value }) {
    return (
        <div className="rounded-lg bg-white/80 p-3">
            <p className="text-xs text-slate-500">{label}</p>

            <p className="mt-1 text-sm font-semibold text-slate-900">
                {value !== null && value !== undefined && value !== ""
                    ? value
                    : "-"}
            </p>
        </div>
    );
}