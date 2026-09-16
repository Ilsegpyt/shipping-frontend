import { useEffect, useState } from "react";
import {
    Plus,
    Search,
    RefreshCw,
    MoreHorizontal,
    Eye,
    Pencil,
    Trash2,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../auth/AuthContext";

import {
    getSchedules,
    searchSchedules,
    deleteSchedules,
} from "../../../services/schedulesService";

const PAGE_SIZE = 10;

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

const getContainerSizeLabel = (value) => {
    const item = containerSizes.find(
        (container) => String(container.value) === String(value)
    );

    return item?.label || value || "-";
};

const formatDate = (value) => {
    if (!value) return "-";

    return new Date(value).toLocaleDateString("en-GB");
};

const formatTransitTime = (value) => {
    if (!value) return "-";

    if (typeof value === "string") {
        const parts = value.split(":");

        if (parts.length >= 2) {
            return `${parts[0]}h ${parts[1]}m`;
        }
    }

    return value;
};

export default function Schedules() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAccountManager = user?.roleName === "Account Manager";

    const [schedules, setSchedules] = useState([]);

    const [pageNumber, setPageNumber] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [searchFilters, setSearchFilters] = useState({
        origin: "",
        destination: "",
        departureDate: "",
        containerSize: "",
    });

    const [isSearching, setIsSearching] = useState(false);
    const [openActionsId, setOpenActionsId] = useState(null);
    const [selectedScheduleIds, setSelectedScheduleIds] = useState([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const loadSchedules = async (page = 1) => {
        try {
            setLoading(true);
            setError("");

            const result = await getSchedules(page, PAGE_SIZE);

            setSchedules(result.items ?? []);
            setPageNumber(result.pageNumber ?? page);
            setTotalPages(result.totalPages ?? 1);
            setTotalCount(result.totalCount ?? 0);
        } catch (err) {
            console.error("Failed to load schedules:", err);

            setError(
                err.response?.data?.error ||
                err.response?.data?.message ||
                "Failed to load schedules."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSchedules(1);
    }, []);

    const toggleScheduleSelection = (scheduleId) => {
        setSelectedScheduleIds((previous) =>
            previous.includes(scheduleId)
                ? previous.filter((id) => id !== scheduleId)
                : [...previous, scheduleId]
        );
    };

    const toggleSelectAll = () => {
        const visibleIds = schedules.map((schedule) => schedule.id);
        const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedScheduleIds.includes(id));

        setSelectedScheduleIds(allSelected ? [] : visibleIds);
    };

    const handleDeleteClick = (scheduleId = null) => {
        setOpenActionsId(null);
        setSelectedScheduleIds(scheduleId ? [scheduleId] : selectedScheduleIds);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (selectedScheduleIds.length === 0) return;

        try {
            setIsDeleting(true);
            setError("");

            await deleteSchedules(selectedScheduleIds);

            setIsDeleteModalOpen(false);
            setSelectedScheduleIds([]);

            if (isSearching) {
                await handleSearch({ preventDefault: () => { } });
            } else {
                await loadSchedules(pageNumber);
            }
        } catch (err) {
            console.error("Failed to delete schedules:", err);
            setError(
                err.response?.data?.error ||
                err.response?.data?.message ||
                "Failed to delete schedules."
            );
        } finally {
            setIsDeleting(false);
        }
    };

    const handleFilterChange = (event) => {
        const { name, value } = event.target;

        setSearchFilters((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const handleSearch = async (event) => {
        event.preventDefault();

        const {
            origin,
            destination,
            departureDate,
            containerSize,
        } = searchFilters;

        if (
            !origin.trim() ||
            !destination.trim() ||
            !departureDate ||
            !containerSize
        ) {
            setError(
                "Please fill in Origin, Destination, Departure Date and Container Size."
            );

            return;
        }

        try {
            setLoading(true);
            setError("");
            setIsSearching(true);
            setOpenActionsId(null);

            const result = await searchSchedules({
                origin: origin.trim(),
                destination: destination.trim(),
                departureDate,
                containerSize: Number(containerSize),
            });

            setSchedules(result ?? []);
            setPageNumber(1);
            setTotalPages(1);
            setTotalCount(result?.length ?? 0);
        } catch (err) {
            console.error("Failed to search schedules:", err);

            setError(
                err.response?.data?.error ||
                err.response?.data?.message ||
                "Failed to search schedules."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setSearchFilters({
            origin: "",
            destination: "",
            departureDate: "",
            containerSize: "",
        });

        setIsSearching(false);
        setOpenActionsId(null);
        setSelectedScheduleIds([]);
        setPageNumber(1);

        loadSchedules(1);
    };

    const handleRefresh = () => {
        setOpenActionsId(null);

        if (isSearching) {
            handleSearch({
                preventDefault: () => { },
            });

            return;
        }

        loadSchedules(pageNumber);
    };

    const handlePreviousPage = () => {
        setOpenActionsId(null);

        if (!isSearching && pageNumber > 1) {
            loadSchedules(pageNumber - 1);
        }
    };

    const handleNextPage = () => {
        setOpenActionsId(null);

        if (!isSearching && pageNumber < totalPages) {
            loadSchedules(pageNumber + 1);
        }
    };

    return (
        <div
            className="min-h-full bg-gray-50 p-4 sm:p-6"
            onClick={() => setOpenActionsId(null)}
        >
            <div className="mb-6 flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Schedules
                    </h1>

                    <p className="mt-1 text-sm text-blue-900/70">
                        Manage shipping schedules and route rates.
                    </p>
                </div>

                {!isAccountManager && (
                    <button
                        type="button"
                        onClick={() => navigate("/schedules/new")}
                        className="flex items-center gap-2 rounded-lg bg-[#111827] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f2937]"
                    >
                        <Plus size={18} />
                        Add Schedule
                    </button>
                )}
            </div>

            <form
                onSubmit={handleSearch}
                onClick={(event) => event.stopPropagation()}
                className="mb-6 rounded-xl border border-slate-200 bg-white p-4"
            >
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-900">
                        Search Schedules
                    </h2>

                    <button
                        type="button"
                        onClick={handleReset}
                        className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
                    >
                        Reset
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <input
                        type="text"
                        name="origin"
                        value={searchFilters.origin}
                        onChange={handleFilterChange}
                        placeholder="Origin"
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />

                    <input
                        type="text"
                        name="destination"
                        value={searchFilters.destination}
                        onChange={handleFilterChange}
                        placeholder="Destination"
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />

                    <input
                        type="date"
                        name="departureDate"
                        value={searchFilters.departureDate}
                        onChange={handleFilterChange}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />

                    <select
                        name="containerSize"
                        value={searchFilters.containerSize}
                        onChange={handleFilterChange}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    >
                        <option value="">Container Size</option>

                        {containerSizes.map((container) => (
                            <option key={container.value} value={container.value}>
                                {container.label}
                            </option>
                        ))}
                    </select>

                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center justify-center gap-2 rounded-lg bg-[#111827] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Search size={17} />
                        Search
                    </button>
                </div>
            </form>

            {!loading && error && (
                <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                    <span>{error}</span>

                    <button
                        type="button"
                        onClick={() => setError("")}
                        className="font-medium hover:underline"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {loading && (
                <div className="rounded-xl border border-slate-200 bg-white py-12 text-center text-sm text-slate-500">
                    Loading schedules...
                </div>
            )}

            {!loading && !error && (
                <>
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <div>
                                <h2 className="text-sm font-semibold text-slate-900">
                                    Schedules List
                                </h2>

                                <p className="mt-1 text-xs text-slate-500">
                                    {isSearching
                                        ? "Search results"
                                        : `Total schedules: ${totalCount}`}
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                {!isAccountManager && selectedScheduleIds.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            handleDeleteClick();
                                        }}
                                        className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                                    >
                                        <Trash2 size={17} />
                                        Delete ({selectedScheduleIds.length})
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        handleRefresh();
                                    }}
                                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                >
                                    <RefreshCw size={17} />
                                    Refresh
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-[2400px] w-full">
                                <thead className="border-b border-slate-200 bg-slate-50">
                                    <tr>
                                        <th className="w-12 px-4 py-4 text-left">
                                            {!isAccountManager && (
                                                <input
                                                    type="checkbox"
                                                    checked={schedules.length > 0 && schedules.every((schedule) => selectedScheduleIds.includes(schedule.id))}
                                                    onChange={toggleSelectAll}
                                                    onClick={(event) => event.stopPropagation()}
                                                    className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                                                />
                                            )}
                                        </th>
                                        {[
                                            "Mode",
                                            "Origin",
                                            "Departure Port",
                                            "Departure Country",
                                            "Destination",
                                            "Arrival Port",
                                            "Arrival Country",
                                            "Departure Date",
                                            "Arrival Date",
                                            "Vessel",
                                            "Carrier",
                                            "Carrier Code",
                                            "Voyage Number",
                                            "Transit Time",
                                            "Cut-off Date",
                                            "Port Cut-off Date",
                                            "Container Size",
                                            "Rate Amount",
                                            "Currency",
                                            "Rate Remarks",
                                            "Validity Date",
                                            "Free Time POD",
                                            "Free Time POL",
                                            "Transshipment",
                                            "Notes",
                                            "Created At",
                                            "Updated At",
                                            "Actions",
                                        ].map((header) => (
                                            <th
                                                key={header}
                                                className="whitespace-nowrap px-4 py-4 text-left text-xs font-medium uppercase tracking-wide text-slate-500"
                                            >
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>

                                <tbody>
                                    {schedules.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={29}
                                                className="px-6 py-12 text-center text-sm text-slate-500"
                                            >
                                                No schedules found.
                                            </td>
                                        </tr>
                                    ) : (
                                        schedules.map((schedule) => (
                                            <tr
                                                key={schedule.id}
                                                className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                                            >
                                                <td className="w-12 px-4 py-5">
                                                    {!isAccountManager && (
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedScheduleIds.includes(schedule.id)}
                                                            onChange={() => toggleScheduleSelection(schedule.id)}
                                                            onClick={(event) => event.stopPropagation()}
                                                            className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                                                        />
                                                    )}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-700">
                                                    {schedule.mode === 1 || schedule.mode === "Sea"
                                                        ? "Sea"
                                                        : schedule.mode === 2 ||
                                                            schedule.mode === "Air"
                                                            ? "Air"
                                                            : schedule.mode || "-"}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm font-semibold text-slate-900">
                                                    {schedule.origin || "-"}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-700">
                                                    {schedule.departurePortCode || "-"}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-700">
                                                    {schedule.departureCountry || "-"}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm font-semibold text-slate-900">
                                                    {schedule.destination || "-"}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-700">
                                                    {schedule.arrivalPortCode || "-"}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-700">
                                                    {schedule.arrivalCountry || "-"}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-700">
                                                    {formatDate(schedule.departureDate)}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-700">
                                                    {formatDate(schedule.arrival)}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-700">
                                                    {schedule.vessel || "-"}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-700">
                                                    {schedule.carrier || "-"}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-700">
                                                    {schedule.carrierCode || "-"}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-700">
                                                    {schedule.voyageNumber || "-"}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-700">
                                                    {formatTransitTime(schedule.transitTime)}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-700">
                                                    {formatDate(schedule.cutoffDate)}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-700">
                                                    {formatDate(schedule.portCutoffDate)}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-700">
                                                    {getContainerSizeLabel(schedule.containerSize)}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm font-semibold text-slate-900">
                                                    {schedule.rateAmount ?? "-"}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-700">
                                                    {schedule.rateCurrency || "-"}
                                                </td>

                                                <td className="max-w-[220px] px-4 py-5 text-sm text-slate-700">
                                                    <div
                                                        className="truncate"
                                                        title={schedule.rateRemarks || ""}
                                                    >
                                                        {schedule.rateRemarks || "-"}
                                                    </div>
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-700">
                                                    {formatDate(schedule.validityDate)}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-700">
                                                    {schedule.freeTimeAtPOD ?? "-"}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-700">
                                                    {schedule.freeTimeAtPOL ?? "-"}
                                                </td>

                                                <td className="max-w-[220px] px-4 py-5 text-sm text-slate-700">
                                                    <div
                                                        className="truncate"
                                                        title={schedule.transshipmentData || ""}
                                                    >
                                                        {schedule.transshipmentData || "-"}
                                                    </div>
                                                </td>

                                                <td className="max-w-[220px] px-4 py-5 text-sm text-slate-700">
                                                    <div
                                                        className="truncate"
                                                        title={schedule.notes || ""}
                                                    >
                                                        {schedule.notes || "-"}
                                                    </div>
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-700">
                                                    {schedule.createdAtUtc
                                                        ? new Date(
                                                            schedule.createdAtUtc
                                                        ).toLocaleString("en-GB")
                                                        : "-"}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-700">
                                                    {schedule.updatedAtUtc
                                                        ? new Date(
                                                            schedule.updatedAtUtc
                                                        ).toLocaleString("en-GB")
                                                        : "-"}
                                                </td>

                                                <td className="relative whitespace-nowrap px-6 py-5 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();

                                                            setOpenActionsId((previousId) =>
                                                                previousId === schedule.id
                                                                    ? null
                                                                    : schedule.id
                                                            );
                                                        }}
                                                        className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                                                    >
                                                        <MoreHorizontal size={20} />
                                                    </button>

                                                    {openActionsId === schedule.id && (
                                                        <div
                                                            className="absolute right-6 top-14 z-20 w-44 rounded-lg border border-slate-200 bg-white py-1 text-left shadow-lg"
                                                            onClick={(event) => event.stopPropagation()}
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    navigate(`/schedules/${schedule.id}`)
                                                                }
                                                                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                                                            >
                                                                <Eye size={16} />
                                                                View Details
                                                            </button>

                                                            {!isAccountManager && (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            navigate(
                                                                                `/schedules/${schedule.id}/edit`
                                                                            )
                                                                        }
                                                                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                                                                    >
                                                                        <Pencil size={16} />
                                                                        Edit Schedule
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDeleteClick(schedule.id)}
                                                                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                        Delete Schedule
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                        <span className="text-sm text-slate-500">
                            Total schedules: {totalCount}
                        </span>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handlePreviousPage}
                                disabled={isSearching || pageNumber === 1}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Previous
                            </button>

                            <span className="text-sm text-slate-600">
                                Page {pageNumber} of {totalPages}
                            </span>

                            <button
                                type="button"
                                onClick={handleNextPage}
                                disabled={isSearching || pageNumber >= totalPages}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </>
            )}

            {isDeleteModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
                    onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                            <Trash2 size={24} />
                        </div>

                        <h2 className="text-lg font-semibold text-slate-900">
                            Delete {selectedScheduleIds.length === 1 ? "Schedule" : "Schedules"}?
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Are you sure you want to delete {selectedScheduleIds.length === 1 ? "this schedule" : `these ${selectedScheduleIds.length} schedules`}? This action cannot be undone.
                        </p>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={handleDeleteConfirm}
                                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isDeleting ? "Deleting..." : "Yes, Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}