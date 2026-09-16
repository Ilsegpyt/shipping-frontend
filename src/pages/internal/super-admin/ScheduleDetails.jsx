import { useEffect, useState } from "react";
import { ArrowLeft, Pencil, RefreshCw } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { getScheduleById } from "../../../services/schedulesService";

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

                    <div className="flex items-center gap-3">
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
                            <DetailItem label="Mode" value={getModeLabel(schedule.mode)} />
                            <DetailItem label="Route ID" value={schedule.routeId} />
                            <DetailItem label="Origin" value={schedule.origin} />
                            <DetailItem label="Destination" value={schedule.destination} />
                            <DetailItem label="Departure Port" value={schedule.departurePortCode} />
                            <DetailItem label="Departure Country" value={schedule.departureCountry} />
                            <DetailItem label="Arrival Port" value={schedule.arrivalPortCode} />
                            <DetailItem label="Arrival Country" value={schedule.arrivalCountry} />
                        </Section>

                        <Section title="Vessel & Carrier">
                            <DetailItem label="Vessel" value={schedule.vessel} />
                            <DetailItem label="Carrier" value={schedule.carrier} />
                            <DetailItem label="Carrier Code" value={schedule.carrierCode} />
                            <DetailItem label="Voyage Number" value={schedule.voyageNumber} />
                        </Section>

                        <Section title="Schedule Dates">
                            <DetailItem label="Departure Date" value={formatDate(schedule.departureDate)} />
                            <DetailItem label="Arrival Date" value={formatDate(schedule.arrival)} />
                            <DetailItem label="Transit Time" value={formatTransitTime(schedule.transitTime)} />
                            <DetailItem label="Cut-off Date" value={formatDate(schedule.cutoffDate)} />
                            <DetailItem label="Port Cut-off Date" value={formatDate(schedule.portCutoffDate)} />
                            <DetailItem label="Validity Date" value={formatDate(schedule.validityDate)} />
                        </Section>

                        <Section title="Rate & Container">
                            <DetailItem
                                label="Container Size"
                                value={getContainerSizeLabel(schedule.containerSize)}
                            />
                            <DetailItem
                                label="Rate Amount"
                                value={
                                    schedule.rateAmount !== null &&
                                        schedule.rateAmount !== undefined
                                        ? `${schedule.rateAmount} ${schedule.rateCurrency || ""}`.trim()
                                        : "-"
                                }
                            />
                            <DetailItem label="Currency" value={schedule.rateCurrency} />
                            <DetailItem label="Rate Remarks" value={schedule.rateRemarks} />
                        </Section>

                        <Section title="Free Time & Additional Information">
                            <DetailItem label="Free Time at POD" value={schedule.freeTimeAtPOD} />
                            <DetailItem label="Free Time at POL" value={schedule.freeTimeAtPOL} />
                            <DetailItem label="Transshipment Data" value={schedule.transshipmentData} />
                            <DetailItem label="Notes" value={schedule.notes} />
                        </Section>

                        <Section title="Audit Information">
                            <DetailItem label="Created At" value={formatDateTime(schedule.createdAtUtc)} />
                            <DetailItem label="Updated At" value={formatDateTime(schedule.updatedAtUtc)} />
                        </Section>
                    </div>
                )}
            </div>
        </div>
    );
}
