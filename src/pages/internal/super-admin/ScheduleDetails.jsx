import { useEffect, useState } from "react";
import {
    ArrowLeft,
    Pencil,
    RefreshCw,
    X,
    Upload,
    FileText,
    CheckCircle2,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { getScheduleById } from "../../../services/schedulesService";
import api from "../../../services/api";

const containerSizes = [
    { value: 1, label: "Dry 20 Standard" },
    { value: 2, label: "Dry 40 Standard" },
    { value: 3, label: "Dry 40 High" },
    { value: 4, label: "Dry 45 High" },
    { value: 5, label: "Reefer 20 Standard" },
    { value: 6, label: "Reefer 40 High" },
    { value: 7, label: "Open Top 20" },
    { value: 8, label: "Open Top 40" },
    { value: 9, label: "Open Top 40 High" },
    { value: 10, label: "Flat 40 Standard" },
    { value: 11, label: "Flat 40 High" },
    { value: 12, label: "Flat 20" },
    { value: 13, label: "Tank 20" },
    { value: 14, label: "Tank 40" },
];

const formatDate = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("en-GB");
};

const formatDateTime = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleString("en-GB");
};

const formatTransitTime = (value) => {
    if (!value) return "-";

    if (typeof value === "string") {
        const days = value.split(".")[0];

        if (!Number.isNaN(Number(days))) {
            return `${Number(days)} days`;
        }
    }

    return value;
};

const getContainerSizeLabel = (value) => {
    const item = containerSizes.find(
        (container) => String(container.value) === String(value)
    );

    return item?.label || value || "-";
};

const getModeLabel = (value) => {
    if (value === 1 || value === "1" || value === "Sea") return "Sea";
    if (value === 2 || value === "2" || value === "Air") return "Air";

    return value || "-";
};

function DetailItem({ label, value }) {
    return (
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                {label}
            </p>

            <p className="break-words text-sm font-medium text-slate-800">
                {value ?? "-"}
            </p>
        </div>
    );
}

function Section({ title, children }) {
    return (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 border-b border-slate-200 pb-3 text-sm font-semibold text-slate-900">
                {title}
            </h2>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                {children}
            </div>
        </section>
    );
}

export default function ScheduleDetails() {
    const navigate = useNavigate();
    const { id } = useParams();

    const [schedule, setSchedule] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [isBookingOpen, setIsBookingOpen] = useState(false);
    const [quantity, setQuantity] = useState("");
    const [declarationFiles, setDeclarationFiles] = useState([]);

    const [bookingLoading, setBookingLoading] = useState(false);
    const [bookingError, setBookingError] = useState("");
    const [bookingSuccess, setBookingSuccess] = useState(null);

    const loadSchedule = async () => {
        try {
            setLoading(true);
            setError("");

            const data = await getScheduleById(id);
            setSchedule(data);
        } catch (err) {
            console.error("Failed to load schedule details:", err);

            setError(
                err.response?.data?.error ||
                err.response?.data?.message ||
                "Failed to load schedule details."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSchedule();
    }, [id]);

    const openBookingModal = () => {
        setBookingError("");
        setBookingSuccess(null);
        setQuantity("");
        setDeclarationFiles([]);
        setIsBookingOpen(true);
    };

    const closeBookingModal = () => {
        if (bookingLoading) return;

        setIsBookingOpen(false);
        setBookingError("");
        setBookingSuccess(null);
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
        } catch (err) {
            console.error("Failed to book shipment:", err);

            setBookingError(
                err.response?.data?.error ||
                err.response?.data?.message ||
                "Failed to book shipment. Please try again."
            );
        } finally {
            setBookingLoading(false);
        }
    };

    return (
        <div className="min-h-full bg-gray-50 p-4 sm:p-6">
            <div className="mx-auto max-w-7xl">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <button
                            type="button"
                            onClick={() => navigate("/schedules")}
                            className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
                        >
                            <ArrowLeft size={17} />
                            Back to Schedules
                        </button>

                        <h1 className="text-2xl font-semibold text-gray-900">
                            Schedule Details
                        </h1>

                        <p className="mt-1 text-sm text-blue-900/70">
                            View shipping schedule and route rate details.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={loadSchedule}
                            disabled={loading}
                            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <RefreshCw size={17} />
                            Refresh
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate(`/schedules/${id}/edit`)}
                            disabled={loading || !schedule}
                            className="flex items-center gap-2 rounded-lg bg-[#111827] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Pencil size={17} />
                            Edit Schedule
                        </button>

                        <button
                            type="button"
                            onClick={openBookingModal}
                            disabled={loading || !schedule}
                            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Book Shipment
                        </button>
                    </div>
                </div>

                {loading && (
                    <div className="rounded-xl border border-slate-200 bg-white py-12 text-center text-sm text-slate-500">
                        Loading schedule details...
                    </div>
                )}

                {!loading && error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                        {error}
                    </div>
                )}

                {!loading && !error && schedule && (
                    <div className="space-y-6">
                        <Section title="Route & Mode">
                            <DetailItem
                                label="Mode"
                                value={getModeLabel(schedule.mode)}
                            />

                            <DetailItem
                                label="Route ID"
                                value={schedule.routeId}
                            />

                            <DetailItem
                                label="Origin"
                                value={schedule.origin}
                            />

                            <DetailItem
                                label="Destination"
                                value={schedule.destination}
                            />

                            <DetailItem
                                label="Departure Port"
                                value={schedule.departurePortCode}
                            />

                            <DetailItem
                                label="Departure Country"
                                value={schedule.departureCountry}
                            />

                            <DetailItem
                                label="Arrival Port"
                                value={schedule.arrivalPortCode}
                            />

                            <DetailItem
                                label="Arrival Country"
                                value={schedule.arrivalCountry}
                            />
                        </Section>

                        <Section title="Vessel & Carrier">
                            <DetailItem
                                label="Vessel"
                                value={schedule.vessel}
                            />

                            <DetailItem
                                label="Carrier"
                                value={schedule.carrier}
                            />

                            <DetailItem
                                label="Carrier Code"
                                value={schedule.carrierCode}
                            />

                            <DetailItem
                                label="Voyage Number"
                                value={schedule.voyageNumber}
                            />
                        </Section>

                        <Section title="Schedule Dates">
                            <DetailItem
                                label="Departure Date"
                                value={formatDate(schedule.departureDate)}
                            />

                            <DetailItem
                                label="Arrival Date"
                                value={formatDate(schedule.arrival)}
                            />

                            <DetailItem
                                label="Transit Time"
                                value={formatTransitTime(schedule.transitTime)}
                            />

                            <DetailItem
                                label="Cut-off Date"
                                value={formatDate(schedule.cutoffDate)}
                            />

                            <DetailItem
                                label="Port Cut-off Date"
                                value={formatDate(schedule.portCutoffDate)}
                            />

                            <DetailItem
                                label="Validity Date"
                                value={formatDate(schedule.validityDate)}
                            />
                        </Section>

                        <Section title="Rate & Container">
                            <DetailItem
                                label="Container Size"
                                value={getContainerSizeLabel(
                                    schedule.containerSize
                                )}
                            />

                            <DetailItem
                                label="Rate Amount"
                                value={
                                    schedule.rateAmount !== null &&
                                        schedule.rateAmount !== undefined
                                        ? `${schedule.rateAmount} ${schedule.rateCurrency || ""
                                            }`.trim()
                                        : "-"
                                }
                            />

                            <DetailItem
                                label="Currency"
                                value={schedule.rateCurrency}
                            />

                            <DetailItem
                                label="Rate Remarks"
                                value={schedule.rateRemarks}
                            />
                        </Section>

                        <Section title="Free Time & Additional Information">
                            <DetailItem
                                label="Free Time at POD"
                                value={schedule.freeTimeAtPOD}
                            />

                            <DetailItem
                                label="Free Time at POL"
                                value={schedule.freeTimeAtPOL}
                            />

                            <DetailItem
                                label="Transshipment Data"
                                value={schedule.transshipmentData}
                            />

                            <DetailItem
                                label="Notes"
                                value={schedule.notes}
                            />
                        </Section>

                        <Section title="Audit Information">
                            <DetailItem
                                label="Created At"
                                value={formatDateTime(
                                    schedule.createdAtUtc
                                )}
                            />

                            <DetailItem
                                label="Updated At"
                                value={formatDateTime(
                                    schedule.updatedAtUtc
                                )}
                            />
                        </Section>
                    </div>
                )}
            </div>

            {isBookingOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
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
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form
                            onSubmit={handleBookingSubmit}
                            className="space-y-5 p-6"
                        >
                            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                                <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                                    Selected Schedule
                                </p>

                                <p className="mt-1 text-sm font-semibold text-blue-950">
                                    {schedule.origin} →{" "}
                                    {schedule.destination}
                                </p>

                                <p className="mt-1 text-sm text-blue-900/70">
                                    {schedule.carrier || "-"} ·{" "}
                                    {getContainerSizeLabel(
                                        schedule.containerSize
                                    )}
                                </p>
                            </div>

                            <div>
                                <label
                                    htmlFor="quantity"
                                    className="mb-1.5 block text-sm font-medium text-slate-700"
                                >
                                    Quantity
                                </label>

                                <input
                                    id="quantity"
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={quantity}
                                    onChange={(event) =>
                                        setQuantity(event.target.value)
                                    }
                                    placeholder="Enter quantity"
                                    disabled={bookingLoading}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                    Declaration Files
                                </label>

                                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 px-4 py-8 text-center transition hover:border-blue-400 hover:bg-blue-50/50">
                                    <Upload
                                        size={25}
                                        className="mb-2 text-slate-400"
                                    />

                                    <span className="text-sm font-medium text-slate-700">
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
                                                            removeFile(index)
                                                        }
                                                        disabled={
                                                            bookingLoading
                                                        }
                                                        className="ml-3 shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>

                            {bookingError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                                    {bookingError}
                                </div>
                            )}

                            {bookingSuccess && (
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2
                                            size={19}
                                            className="mt-0.5 shrink-0 text-emerald-600"
                                        />

                                        <div>
                                            <p className="text-sm font-semibold text-emerald-800">
                                                Shipment booked successfully.
                                            </p>

                                            <p className="mt-1 text-sm text-emerald-700">
                                                Reference:{" "}
                                                {bookingSuccess.shipmentRef ||
                                                    "-"}
                                            </p>

                                            <p className="text-sm text-emerald-700">
                                                Total:{" "}
                                                {bookingSuccess.total ?? "-"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                                <button
                                    type="button"
                                    onClick={closeBookingModal}
                                    disabled={bookingLoading}
                                    className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={bookingLoading}
                                    className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {bookingLoading
                                        ? "Booking..."
                                        : "Confirm Booking"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}