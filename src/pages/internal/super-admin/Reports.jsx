import { useEffect, useMemo, useState } from "react";
import api from "../../../services/api";

const categoryNames = {
    1: "Sea",
    2: "Air",
    3: "Domestic",
    4: "Financial",
};

const serviceNames = {
    0: "None",
    1: "Freight",
    2: "Customs Clearance",
    3: "Transportation",
    4: "Both",
};

const shipmentTypeNames = {
    0: "None",
    1: "All",
    2: "Import",
    3: "Export",
};

const categoryOptions = [
    { value: "1", label: "Sea" },
    { value: "2", label: "Air" },
    { value: "3", label: "Domestic" },
    { value: "4", label: "Financial" },
];

const serviceOptionsByCategory = {
    1: [
        { value: "1", label: "Freight" },
    ],

    2: [
        { value: "1", label: "Freight" },
    ],

    3: [
        { value: "2", label: "Customs Clearance" },
        { value: "3", label: "Transportation" },
        { value: "4", label: "Both" },
    ],

    4: [
        { value: "0", label: "None" },
    ],
};

const shipmentTypeOptionsByCategory = {
    1: [
        { value: "2", label: "Import" },
        { value: "3", label: "Export" },
    ],

    2: [
        { value: "2", label: "Import" },
        { value: "3", label: "Export" },
    ],

    3: [
        { value: "2", label: "Import" },
        { value: "3", label: "Export" },
    ],

    4: [
        { value: "0", label: "None" },
    ],
};


function formatDate(value) {
    if (!value) {
        return "-";
    }

    return new Date(value).toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

function getCategoryLabel(value) {
    return (
        categoryNames[value] ||
        categoryNames[Number(value)] ||
        value ||
        "-"
    );
}

function getServiceLabel(value) {
    return (
        serviceNames[value] ||
        serviceNames[Number(value)] ||
        value ||
        "-"
    );
}

function getShipmentTypeLabel(value) {
    return (
        shipmentTypeNames[value] ||
        shipmentTypeNames[Number(value)] ||
        value ||
        "-"
    );
}

function normalizeFilterValue(value) {
    return String(value ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

export default function Reports() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");


    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [serviceFilter, setServiceFilter] = useState("");
    const [shipmentTypeFilter, setShipmentTypeFilter] = useState("");

    const availableServiceOptions = categoryFilter
        ? serviceOptionsByCategory[categoryFilter] || []
        : [
            { value: "1", label: "Freight" },
            { value: "2", label: "Customs Clearance" },
            { value: "3", label: "Transportation" },
            { value: "4", label: "Both" },
        ];

    const availableShipmentTypeOptions = categoryFilter
        ? shipmentTypeOptionsByCategory[categoryFilter] || []
        : [
            { value: "1", label: "All" },
            { value: "2", label: "Import" },
            { value: "3", label: "Export" },
        ];

    async function loadReports() {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("/api/reports");

            setReports(response.data || []);
        } catch (err) {
            console.error("Failed to load reports:", err);

            setError(
                err.response?.data?.message ||
                "Failed to load reports."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadReports();
    }, []);


    async function handleDownload(report) {
        try {
            setError("");

            const response = await api.get(
                `/api/reports/${report.id}/file`,
                {
                    responseType: "blob",
                }
            );

            const fileUrl = window.URL.createObjectURL(
                new Blob([response.data])
            );

            const link = document.createElement("a");

            link.href = fileUrl;
            link.download = report.fileName || "report";

            document.body.appendChild(link);
            link.click();

            link.remove();
            window.URL.revokeObjectURL(fileUrl);
        } catch (err) {
            console.error("Failed to download report:", err);

            setError(
                err.response?.data?.message ||
                "Failed to download report."
            );
        }
    }

    function resetFilters() {
        setSearchTerm("");
        setCategoryFilter("");
        setServiceFilter("");
        setShipmentTypeFilter("");
    }

    const filteredReports = useMemo(() => {
        const normalizedSearchTerm = searchTerm
            .trim()
            .toLowerCase();

        return reports.filter((report) => {
            const fileName = String(report.fileName || "")
                .toLowerCase();

            const reportCategory = String(
                report.category ?? ""
            ).toLowerCase();

            const reportService = normalizeFilterValue(
                report.service
            );

            const reportShipmentType = normalizeFilterValue(
                report.shipmentType
            );

            const categoryLabel = normalizeFilterValue(
                getCategoryLabel(report.category)
            );

            const serviceLabel = normalizeFilterValue(
                getServiceLabel(report.service)
            );

            const shipmentTypeLabel = normalizeFilterValue(
                getShipmentTypeLabel(report.shipmentType)
            );

            const matchesSearch =
                !normalizedSearchTerm ||
                fileName.includes(normalizedSearchTerm);

            const matchesCategory =
                !categoryFilter ||
                reportCategory === normalizeFilterValue(categoryFilter) ||
                categoryLabel ===
                normalizeFilterValue(categoryNames[categoryFilter]);

            const matchesService =
                !serviceFilter ||
                reportService === normalizeFilterValue(serviceFilter) ||
                serviceLabel ===
                normalizeFilterValue(serviceNames[serviceFilter]);

            const matchesShipmentType =
                !shipmentTypeFilter ||
                reportShipmentType === normalizeFilterValue(shipmentTypeFilter) ||
                shipmentTypeLabel ===
                normalizeFilterValue(shipmentTypeNames[shipmentTypeFilter]);

            return (
                matchesSearch &&
                matchesCategory &&
                matchesService &&
                matchesShipmentType
            );
        });
    }, [
        reports,
        searchTerm,
        categoryFilter,
        serviceFilter,
        shipmentTypeFilter,
    ]);

    return (
        <div className="p-6">
            {/* Page Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Reports
                    </h1>

                    <p className="mt-1 text-sm text-gray-500">
                        View and download uploaded reports.
                    </p>
                </div>

            </div>

            {/* Reports Card */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                {/* Filters */}
                <div className="border-b border-gray-200 p-4">
                    {/* Search */}
                    <div className="mb-4" dir="ltr">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) =>
                                setSearchTerm(event.target.value)
                            }
                            placeholder="Search by file name..."
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    {/* Filters Order:
                        All Categories -> All Services -> All Types
                    */}
                    <div
                        dir="ltr"
                        className="grid grid-cols-1 gap-4 md:grid-cols-4"
                    >
                        {/* All Categories */}
                        <select
                            value={categoryFilter}
                            onChange={(event) => {
                                const value =
                                    event.target.value;

                                setCategoryFilter(value);
                                setServiceFilter("");
                                setShipmentTypeFilter("");
                            }}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">
                                All Categories
                            </option>

                            {categoryOptions.map((option) => (
                                <option
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </option>
                            ))}
                        </select>

                        {/* All Services */}
                        <select
                            value={serviceFilter}
                            onChange={(event) =>
                                setServiceFilter(
                                    event.target.value
                                )
                            }
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">
                                All Services
                            </option>

                            {availableServiceOptions.map(
                                (option) => (
                                    <option
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </option>
                                )
                            )}
                        </select>

                        {/* All Types */}
                        <select
                            value={shipmentTypeFilter}
                            onChange={(event) =>
                                setShipmentTypeFilter(
                                    event.target.value
                                )
                            }
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">All Types</option>

                            {availableShipmentTypeOptions.map(
                                (option) => (
                                    <option
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </option>
                                )
                            )}
                        </select>

                        <button
                            type="button"
                            onClick={resetFilters}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                        >
                            Reset Filters
                        </button>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="m-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {/* Reports Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-6 py-4 font-medium">
                                    File Name
                                </th>

                                <th className="px-6 py-4 font-medium">
                                    Customer ID
                                </th>

                                <th className="px-6 py-4 font-medium">
                                    Shipment Ref
                                </th>

                                <th className="px-6 py-4 font-medium">
                                    Category
                                </th>

                                <th className="px-6 py-4 font-medium">
                                    Service
                                </th>

                                <th className="px-6 py-4 font-medium">
                                    Shipment Type
                                </th>

                                <th className="px-6 py-4 font-medium">
                                    Uploaded At
                                </th>

                                <th className="px-6 py-4 font-medium">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan="8"
                                        className="px-6 py-12 text-center text-gray-500"
                                    >
                                        Loading reports...
                                    </td>
                                </tr>
                            ) : filteredReports.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan="8"
                                        className="px-6 py-12 text-center text-gray-500"
                                    >
                                        No reports found.
                                    </td>
                                </tr>
                            ) : (
                                filteredReports.map((report) => (
                                    <tr
                                        key={report.id}
                                        className="border-t border-gray-100 transition hover:bg-gray-50"
                                    >
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {report.fileName || "-"}
                                        </td>

                                        <td className="px-6 py-4 text-gray-600">
                                            {report.customerId || "-"}
                                        </td>

                                        <td className="px-6 py-4 text-gray-600">
                                            {report.shipmentRef || "-"}
                                        </td>

                                        <td className="px-6 py-4 text-gray-600">
                                            {getCategoryLabel(
                                                report.category
                                            )}
                                        </td>

                                        <td className="px-6 py-4 text-gray-600">
                                            {getServiceLabel(
                                                report.service
                                            )}
                                        </td>

                                        <td className="px-6 py-4 text-gray-600">
                                            {getShipmentTypeLabel(
                                                report.shipmentType
                                            )}
                                        </td>

                                        <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                                            {formatDate(
                                                report.uploadedAtUtc
                                            )}
                                        </td>

                                        <td className="px-6 py-4">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleDownload(
                                                        report
                                                    )
                                                }
                                                className="font-medium text-blue-600 hover:text-blue-800"
                                            >
                                                Download
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Upload Modal */}
        </div>
    );
}