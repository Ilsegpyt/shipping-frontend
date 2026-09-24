import { useEffect, useState } from "react";
import { useAuth } from "../../../auth/AuthContext";

import {
    RefreshCw,
    MoreHorizontal,
    Eye,
    FileText,
    Download,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import {
    getShipments,
    getDeclarationFilesByShipmentId,
    downloadDeclarationFile,
} from "../../../services/shipmentsService";

const PAGE_SIZE = 10;

const formatDate = (value) => {
    if (!value) return "-";

    return new Date(value).toLocaleDateString("en-GB");
};

const formatMoney = (value) => {
    if (value === null || value === undefined) return "-";

    return Number(value).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const formatStatus = (value) => {
    if (value === null || value === undefined) return "-";

    const statusMap = {
        1: "Received",
        2: "Processing",
        3: "Missing Docs",
        4: "Confirmed",
        5: "Delivered",
        6: "Cancelled",
    };

    if (typeof value === "string") {
        return value
            .replace(/([a-z])([A-Z])/g, "$1 $2")
            .replace("MissingDocs", "Missing Docs");
    }

    return statusMap[value] || String(value);
};

const getStatusClassName = (value) => {
    const status = formatStatus(value).toLowerCase();

    if (status.includes("delivered")) {
        return "bg-emerald-100 text-emerald-700";
    }

    if (status.includes("confirmed")) {
        return "bg-blue-100 text-blue-700";
    }

    if (status.includes("processing")) {
        return "bg-amber-100 text-amber-700";
    }

    if (status.includes("missing")) {
        return "bg-orange-100 text-orange-700";
    }

    if (status.includes("cancel")) {
        return "bg-red-100 text-red-700";
    }

    return "bg-slate-100 text-slate-700";
};

export default function Shipments() {
    const navigate = useNavigate();

    const { user } = useAuth();

    const isAccountManager =
        user?.roleName === "Account Manager";

    const [shipments, setShipments] = useState([]);
    const [pageNumber, setPageNumber] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [openActionsId, setOpenActionsId] = useState(null);

    const [openDeclarationFilesId, setOpenDeclarationFilesId] =
        useState(null);

    const [declarationFiles, setDeclarationFiles] = useState([]);
    const [declarationFilesLoading, setDeclarationFilesLoading] =
        useState(false);
    const [declarationFilesError, setDeclarationFilesError] = useState("");

    const [downloadingFileId, setDownloadingFileId] = useState(null);

    const loadShipments = async (page = 1) => {
        try {
            setLoading(true);
            setError("");
            setOpenActionsId(null);

            const result = await getShipments(page, PAGE_SIZE);

            setShipments(result.items ?? []);
            setPageNumber(result.pageNumber ?? page);
            setTotalPages(result.totalPages ?? 1);
            setTotalCount(result.totalCount ?? 0);
        } catch (err) {
            console.error("Failed to load shipments:", err);

            setError(
                err.response?.data?.error ||
                err.response?.data?.message ||
                "Failed to load shipments."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadShipments(1);
    }, []);

    const handlePreviousPage = () => {
        if (pageNumber > 1) {
            loadShipments(pageNumber - 1);
        }
    };

    const handleNextPage = () => {
        if (pageNumber < totalPages) {
            loadShipments(pageNumber + 1);
        }
    };

    const handleOpenDeclarationFiles = async (shipmentId) => {
        try {
            setOpenDeclarationFilesId(shipmentId);
            setOpenActionsId(null);

            setDeclarationFiles([]);
            setDeclarationFilesError("");
            setDeclarationFilesLoading(true);

            const result =
                await getDeclarationFilesByShipmentId(shipmentId);

            setDeclarationFiles(result ?? []);
        } catch (err) {
            console.error("Failed to load declaration files:", err);

            setDeclarationFilesError(
                err.response?.data?.error ||
                err.response?.data?.message ||
                "Failed to load declaration files."
            );
        } finally {
            setDeclarationFilesLoading(false);
        }
    };

    const handleCloseDeclarationFiles = () => {
        setOpenDeclarationFilesId(null);
        setDeclarationFiles([]);
        setDeclarationFilesError("");
        setDownloadingFileId(null);
    };

    const handleDownloadDeclarationFile = async (file) => {
        try {
            setDownloadingFileId(file.id);
            setDeclarationFilesError("");

            await downloadDeclarationFile(
                openDeclarationFilesId,
                file.id
            );
        } catch (err) {
            console.error("Failed to download declaration file:", err);

            setDeclarationFilesError(
                err.response?.data?.error ||
                err.response?.data?.message ||
                "Failed to download declaration file."
            );
        } finally {
            setDownloadingFileId(null);
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
                        Shipments
                    </h1>

                    <p className="mt-1 text-sm text-blue-900/70">
                        Manage shipments and shipment information.
                    </p>
                </div>
            </div>

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
                    Loading shipments...
                </div>
            )}

            {!loading && !error && (
                <>
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <div>
                                <h2 className="text-sm font-semibold text-slate-900">
                                    Shipments List
                                </h2>

                                <p className="mt-1 text-xs text-slate-500">
                                    Total shipments: {totalCount}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    loadShipments(pageNumber);
                                }}
                                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                                <RefreshCw size={17} />
                                Refresh
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-[1500px] w-full">
                                <thead className="border-b border-slate-200 bg-slate-50">
                                    <tr>
                                        {[
                                            "Shipment Ref",
                                            "Customer",
                                            "Schedule ID",
                                            "Mode",
                                            "Carrier",
                                            "Container Type",
                                            "Quantity",
                                            "Rate",
                                            "Total",
                                            "Status",
                                            "MBL",
                                            "HBL",
                                            "MAWB",
                                            "Booking Confirmation",
                                            "Created At",
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
                                    {shipments.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={16}
                                                className="px-6 py-12 text-center text-sm text-slate-500"
                                            >
                                                No shipments found.
                                            </td>
                                        </tr>
                                    ) : (
                                        shipments.map((shipment) => (
                                            <tr
                                                key={shipment.id}
                                                className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                                            >
                                                <td className="whitespace-nowrap px-4 py-5 text-sm font-semibold text-slate-900">
                                                    {shipment.shipmentRef ||
                                                        "-"}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-700">
                                                    {shipment.customerName || "-"}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-700">
                                                    {shipment.scheduleId || "-"}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-700">
                                                    {shipment.mode || "-"}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-700">
                                                    {shipment.carrier || "-"}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-700">
                                                    {shipment.containerType ||
                                                        "-"}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-700">
                                                    {shipment.quantity ?? "-"}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-700">
                                                    {formatMoney(
                                                        shipment.rate
                                                    )}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm font-semibold text-slate-900">
                                                    {formatMoney(
                                                        shipment.total
                                                    )}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm">
                                                    <span
                                                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClassName(
                                                            shipment.status
                                                        )}`}
                                                    >
                                                        {formatStatus(
                                                            shipment.status
                                                        )}
                                                    </span>
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-700">
                                                    {shipment.mbl || "-"}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-700">
                                                    {shipment.hbl || "-"}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-700">
                                                    {shipment.mawb || "-"}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-700">
                                                    {shipment.bookingConfirmationNumber ||
                                                        "-"}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-700">
                                                    {formatDate(
                                                        shipment.createdAtUtc
                                                    )}
                                                </td>

                                                <td className="relative whitespace-nowrap px-6 py-5 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();

                                                            setOpenActionsId(
                                                                (previousId) =>
                                                                    previousId ===
                                                                        shipment.id
                                                                        ? null
                                                                        : shipment.id
                                                            );
                                                        }}
                                                        className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                                                    >
                                                        <MoreHorizontal
                                                            size={20}
                                                        />
                                                    </button>

                                                    {openActionsId ===
                                                        shipment.id && (
                                                            <div
                                                                className="absolute right-6 top-14 z-20 w-48 rounded-lg border border-slate-200 bg-white py-1 text-left shadow-lg"
                                                                onClick={(event) =>
                                                                    event.stopPropagation()
                                                                }
                                                            >
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        navigate(
                                                                            `/shipments/${shipment.id}`
                                                                        )
                                                                    }
                                                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                                                                >
                                                                    <Eye size={16} />
                                                                    View Details
                                                                </button>



                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleOpenDeclarationFiles(
                                                                            shipment.id
                                                                        )
                                                                    }
                                                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                                                                >
                                                                    <FileText
                                                                        size={16}
                                                                    />
                                                                    Declaration
                                                                    Files
                                                                </button>
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
                            Total shipments: {totalCount}
                        </span>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handlePreviousPage}
                                disabled={pageNumber === 1}
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
                                disabled={pageNumber >= totalPages}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </>
            )}

            {openDeclarationFilesId && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
                    onClick={handleCloseDeclarationFiles}
                >
                    <div
                        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mb-5 flex items-start justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">
                                    Declaration Files
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Files uploaded for this shipment.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleCloseDeclarationFiles}
                                className="rounded-lg px-2 py-1 text-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                                ×
                            </button>
                        </div>

                        {declarationFilesLoading && (
                            <div className="py-8 text-center text-sm text-slate-500">
                                Loading declaration files...
                            </div>
                        )}

                        {!declarationFilesLoading &&
                            declarationFilesError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                                    {declarationFilesError}
                                </div>
                            )}

                        {!declarationFilesLoading &&
                            !declarationFilesError &&
                            declarationFiles.length === 0 && (
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                                    No declaration files found.
                                </div>
                            )}

                        {!declarationFilesLoading &&
                            !declarationFilesError &&
                            declarationFiles.length > 0 && (
                                <div className="space-y-3">
                                    {declarationFiles.map((file) => (
                                        <div
                                            key={file.id}
                                            className="flex items-center gap-3 rounded-lg border border-slate-200 p-3"
                                        >
                                            <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
                                                <FileText size={18} />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-slate-800">
                                                    {file.fileName}
                                                </p>

                                                <p className="mt-1 text-xs text-slate-500">
                                                    Uploaded:{" "}
                                                    {formatDate(
                                                        file.uploadedAtUtc
                                                    )}
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleDownloadDeclarationFile(
                                                        file
                                                    )
                                                }
                                                disabled={
                                                    downloadingFileId ===
                                                    file.id
                                                }
                                                className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                title="Download file"
                                            >
                                                <Download size={16} />

                                                {downloadingFileId ===
                                                    file.id
                                                    ? "Downloading..."
                                                    : "Download"}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                onClick={handleCloseDeclarationFiles}
                                className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1f2937]"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}