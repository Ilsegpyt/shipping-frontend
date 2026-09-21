import { useEffect, useMemo, useState } from "react";
import api from "../../../services/api";
import { getCustomers } from "../../../services/customersService";
import { useAuth } from "../../../auth/AuthContext";

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
    const { user } = useAuth();

    const isAccountManager = user?.roleName === "Account Manager";
    const canUpload = user?.permissions?.includes("reports.upload");

    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [serviceFilter, setServiceFilter] = useState("");
    const [shipmentTypeFilter, setShipmentTypeFilter] = useState("");

    const [customers, setCustomers] = useState([]);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");

    const [uploadForm, setUploadForm] = useState({
        customerId: "",
        shipmentRef: "",
        category: "",
        service: "",
        shipmentType: "",
        file: null,
    });

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

    const uploadServiceOptions =
        uploadForm.category
            ? serviceOptionsByCategory[uploadForm.category] || []
            : [];

    const uploadShipmentTypeOptions =
        uploadForm.category
            ? shipmentTypeOptionsByCategory[uploadForm.category] || []
            : [];

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

    async function loadCustomers() {
        if (!isAccountManager || !canUpload) {
            return;
        }

        try {
            const response = await getCustomers(1, 100);

            setCustomers(response?.items || []);
        } catch (err) {
            console.error("Failed to load customers:", err);
        }
    }

    useEffect(() => {
        loadReports();
        loadCustomers();
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

    function resetUploadForm() {
        setUploadForm({
            customerId: "",
            shipmentRef: "",
            category: "",
            service: "",
            shipmentType: "",
            file: null,
        });

        setUploadError("");
    }

    function openUploadModal() {
        resetUploadForm();
        setShowUploadModal(true);
    }

    function closeUploadModal() {
        if (uploading) {
            return;
        }

        setShowUploadModal(false);
        resetUploadForm();
    }

    function handleUploadFieldChange(event) {
        const { name, value } = event.target;

        if (name === "category") {
            const services =
                serviceOptionsByCategory[value] || [];

            const shipmentTypes =
                shipmentTypeOptionsByCategory[value] || [];

            setUploadForm((current) => ({
                ...current,
                category: value,
                service: services[0]?.value || "",
                shipmentType: shipmentTypes[0]?.value || "",
            }));

            return;
        }

        setUploadForm((current) => ({
            ...current,
            [name]: value,
        }));
    }

    function handleFileChange(event) {
        const file = event.target.files?.[0] || null;

        setUploadForm((current) => ({
            ...current,
            file,
        }));
    }

    async function handleUpload(event) {
        event.preventDefault();

        setUploadError("");

        if (!uploadForm.customerId) {
            setUploadError("Please select a customer.");
            return;
        }

        if (!uploadForm.category) {
            setUploadError("Please select a category.");
            return;
        }

        if (!uploadForm.service) {
            setUploadError("Please select a service.");
            return;
        }

        if (!uploadForm.shipmentType) {
            setUploadError("Please select a shipment type.");
            return;
        }

        if (!uploadForm.file) {
            setUploadError("Please select a file.");
            return;
        }

        try {
            setUploading(true);

            const formData = new FormData();

            formData.append(
                "customerId",
                uploadForm.customerId
            );

            if (uploadForm.shipmentRef.trim()) {
                formData.append(
                    "shipmentRef",
                    uploadForm.shipmentRef.trim()
                );
            }

            formData.append(
                "category",
                uploadForm.category
            );

            formData.append(
                "service",
                uploadForm.service
            );

            formData.append(
                "shipmentType",
                uploadForm.shipmentType
            );

            formData.append(
                "file",
                uploadForm.file
            );

            await api.post(
                "/api/reports",
                formData
            );

            setShowUploadModal(false);
            resetUploadForm();

            await loadReports();
        } catch (err) {
            console.error("Failed to upload report:", err);

            setUploadError(
                err.response?.data?.message ||
                err.response?.data ||
                "Failed to upload report."
            );
        } finally {
            setUploading(false);
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
                (
                    serviceFilter === "4"
                        ? reportService === "customsclearance" ||
                        reportService === "transportation" ||
                        reportService === "both"
                        : reportService ===
                        normalizeFilterValue(serviceFilter) ||
                        serviceLabel ===
                        normalizeFilterValue(
                            serviceNames[serviceFilter]
                        )
                );

            const matchesShipmentType =
                !shipmentTypeFilter ||
                (
                    shipmentTypeFilter === "1"
                        ? reportShipmentType === "import" ||
                        reportShipmentType === "export" ||
                        reportShipmentType === "all"
                        : reportShipmentType ===
                        normalizeFilterValue(
                            shipmentTypeFilter
                        ) ||
                        shipmentTypeLabel ===
                        normalizeFilterValue(
                            shipmentTypeNames[
                            shipmentTypeFilter
                            ]
                        )
                );

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

                {isAccountManager && canUpload && (
                    <button
                        type="button"
                        onClick={openUploadModal}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                    >
                        Upload Report
                    </button>
                )}
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
                            <option value="">
                                All Types
                            </option>

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
            {showUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div
                        className="w-full max-w-2xl rounded-xl bg-white shadow-xl"
                        dir="ltr"
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Upload Report
                                </h2>

                                <p className="mt-1 text-sm text-gray-500">
                                    Upload a report for one of your assigned customers.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeUploadModal}
                                disabled={uploading}
                                className="text-2xl leading-none text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
                            >
                                ×
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form
                            onSubmit={handleUpload}
                            className="space-y-5 px-6 py-6"
                        >
                            {uploadError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    {uploadError}
                                </div>
                            )}

                            {/* Customer */}
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Customer
                                </label>

                                <select
                                    name="customerId"
                                    value={uploadForm.customerId}
                                    onChange={handleUploadFieldChange}
                                    disabled={uploading}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                                >
                                    <option value="">
                                        Select Customer
                                    </option>

                                    {customers.map((customer) => (
                                        <option
                                            key={customer.id}
                                            value={customer.id}
                                        >
                                            {customer.companyName ||
                                                customer.ownerName ||
                                                customer.id}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Shipment Ref */}
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Shipment Ref
                                </label>

                                <input
                                    type="text"
                                    name="shipmentRef"
                                    value={uploadForm.shipmentRef}
                                    onChange={handleUploadFieldChange}
                                    disabled={uploading}
                                    placeholder="Optional"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Category
                                </label>

                                <select
                                    name="category"
                                    value={uploadForm.category}
                                    onChange={handleUploadFieldChange}
                                    disabled={uploading}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                                >
                                    <option value="">
                                        Select Category
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
                            </div>

                            {/* Service */}
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Service
                                </label>

                                <select
                                    name="service"
                                    value={uploadForm.service}
                                    onChange={handleUploadFieldChange}
                                    disabled={
                                        uploading ||
                                        !uploadForm.category
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                                >
                                    <option value="">
                                        Select Service
                                    </option>

                                    {uploadServiceOptions.map(
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
                            </div>

                            {/* Shipment Type */}
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Shipment Type
                                </label>

                                <select
                                    name="shipmentType"
                                    value={uploadForm.shipmentType}
                                    onChange={handleUploadFieldChange}
                                    disabled={
                                        uploading ||
                                        !uploadForm.category
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                                >
                                    <option value="">
                                        Select Shipment Type
                                    </option>

                                    {uploadShipmentTypeOptions.map(
                                        (option) => (
                                            <option
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label === "All"
                                                    ? "All Shipments"
                                                    : option.label}
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            {/* File */}
                            <div>
                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    File
                                </label>

                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    disabled={uploading}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium"
                                />

                                {uploadForm.file && (
                                    <p className="mt-2 text-xs text-gray-500">
                                        Selected: {uploadForm.file.name}
                                    </p>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
                                <button
                                    type="button"
                                    onClick={closeUploadModal}
                                    disabled={uploading}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {uploading
                                        ? "Uploading..."
                                        : "Upload Report"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}