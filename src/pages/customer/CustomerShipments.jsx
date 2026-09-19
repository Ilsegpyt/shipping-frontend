import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Download,
    FileText,
    Loader2,
    MoreVertical,
    Package,
    RefreshCw,
    X,
} from 'lucide-react';

import {
    getShipments,
    getDeclarationFilesByShipmentId,
    downloadDeclarationFile,
} from '../../services/shipmentsService';

const PAGE_SIZE = 10;

const statusStyles = {
    ReadyToShip: 'bg-amber-100 text-amber-700',
    Shipped: 'bg-blue-100 text-blue-700',
    Returned: 'bg-red-100 text-red-700',
    Delivered: 'bg-emerald-100 text-emerald-700',
};

function formatDate(value) {
    if (!value) return '-';

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(value));
}

function formatNumber(value) {
    if (value === null || value === undefined) return '-';

    return new Intl.NumberFormat('en-US').format(value);
}

function getStatusClass(status) {
    return (
        statusStyles[status] ??
        'bg-slate-100 text-slate-700'
    );
}

export default function CustomerShipments() {
    const navigate = useNavigate();

    const [shipments, setShipments] = useState([]);
    const [pageNumber, setPageNumber] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [openMenuId, setOpenMenuId] = useState(null);
    const [selectedShipment, setSelectedShipment] = useState(null);
    const [declarationFiles, setDeclarationFiles] = useState([]);
    const [filesLoading, setFilesLoading] = useState(false);
    const [filesError, setFilesError] = useState('');

    const loadShipments = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            setError('');

            const result = await getShipments(page, PAGE_SIZE);

            setShipments(result.items ?? []);
            setPageNumber(result.pageNumber ?? page);
            setTotalPages(result.totalPages ?? 1);
            setTotalCount(result.totalCount ?? 0);
        } catch (err) {
            console.error('Failed to load customer shipments:', err);

            setError(
                err?.response?.data?.message ??
                'Unable to load your shipments. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadShipments(1);
    }, [loadShipments]);

    const handleOpenDeclarationFiles = async (shipment) => {
        try {
            setSelectedShipment(shipment);
            setOpenMenuId(null);
            setFilesLoading(true);
            setFilesError('');
            setDeclarationFiles([]);

            const result = await getDeclarationFilesByShipmentId(
                shipment.id
            );

            setDeclarationFiles(result ?? []);
        } catch (err) {
            console.error('Failed to load declaration files:', err);

            setFilesError(
                err?.response?.data?.message ??
                'Unable to load declaration files.'
            );
        } finally {
            setFilesLoading(false);
        }
    };

    const handleDownloadDeclarationFile = async (file) => {
        try {
            const response = await downloadDeclarationFile(
                selectedShipment.id,
                file.id
            );

            const blob = new Blob([response.data], {
                type:
                    response.headers['content-type'] ??
                    file.contentType ??
                    'application/octet-stream',
            });

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = file.fileName ?? 'declaration-file';

            document.body.appendChild(link);
            link.click();
            link.remove();

            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to download declaration file:', err);
        }
    };

    const handleCloseDeclarationFiles = () => {
        setSelectedShipment(null);
        setDeclarationFiles([]);
        setFilesError('');
    };

    return (
        <>
            <section className="space-y-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">
                            My Shipments
                        </h1>

                        <p className="mt-2 text-gray-500">
                            View and track your shipments.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => loadShipments(pageNumber)}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <RefreshCw
                            className={`h-4 w-4 ${loading ? 'animate-spin' : ''
                                }`}
                        />

                        Refresh
                    </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">
                                    Total Shipments
                                </p>

                                <p className="mt-2 text-2xl font-semibold text-gray-900">
                                    {totalCount}
                                </p>
                            </div>

                            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                                <Package className="h-6 w-6" />
                            </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                        <div>
                            <p className="font-medium">
                                Something went wrong
                            </p>

                            <p className="mt-1">
                                {error}
                            </p>
                        </div>
                    </div>
                )}

                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 px-6 py-4">
                        <h2 className="font-semibold text-gray-900">
                            Shipment List
                        </h2>
                    </div>

                    {loading ? (
                        <div className="flex min-h-64 items-center justify-center">
                            <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                        </div>
                    ) : shipments.length === 0 ? (
                        <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
                            <div className="rounded-full bg-gray-100 p-4">
                                <Package className="h-8 w-8 text-gray-400" />
                            </div>

                            <h3 className="mt-4 font-medium text-gray-900">
                                No shipments found
                            </h3>

                            <p className="mt-1 text-sm text-gray-500">
                                Your shipments will appear here once they are
                                created.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                Shipment Reference
                                            </th>

                                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                Mode
                                            </th>

                                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                Carrier
                                            </th>

                                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                Quantity
                                            </th>

                                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                Status
                                            </th>

                                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                Created
                                            </th>

                                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {shipments.map((shipment) => (
                                            <tr
                                                key={shipment.id}
                                                className="transition hover:bg-gray-50"
                                            >
                                                <td className="whitespace-nowrap px-6 py-4">
                                                    <span className="font-medium text-gray-900">
                                                        {shipment.shipmentRef ??
                                                            shipment.id ??
                                                            '-'}
                                                    </span>
                                                </td>

                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                                                    {shipment.mode ?? '-'}
                                                </td>

                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                                                    {shipment.carrier ?? '-'}
                                                </td>

                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                                                    {formatNumber(
                                                        shipment.quantity
                                                    )}
                                                </td>

                                                <td className="whitespace-nowrap px-6 py-4">
                                                    <span
                                                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                                                            shipment.status
                                                        )}`}
                                                    >
                                                        {shipment.status ?? '-'}
                                                    </span>
                                                </td>

                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                                                    {formatDate(
                                                        shipment.createdAtUtc
                                                    )}
                                                </td>

                                                <td className="relative whitespace-nowrap px-6 py-4">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setOpenMenuId(
                                                                openMenuId ===
                                                                    shipment.id
                                                                    ? null
                                                                    : shipment.id
                                                            )
                                                        }
                                                        className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                                                        aria-label="Shipment actions"
                                                    >
                                                        <MoreVertical className="h-5 w-5" />
                                                    </button>

                                                    {openMenuId ===
                                                        shipment.id && (
                                                            <div className="absolute right-4 z-20 mt-2 w-52 rounded-xl border border-gray-200 bg-white py-1 text-sm shadow-lg">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setOpenMenuId(null);
                                                                        navigate(
                                                                            `/customer/shipments/${shipment.id}`
                                                                        );
                                                                    }}
                                                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-gray-700 transition hover:bg-gray-50"
                                                                >
                                                                    <Package className="h-4 w-4" />
                                                                    View Details
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleOpenDeclarationFiles(
                                                                            shipment
                                                                        )
                                                                    }
                                                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-gray-700 transition hover:bg-gray-50"
                                                                >
                                                                    <FileText className="h-4 w-4" />
                                                                    Declaration Files
                                                                </button>
                                                            </div>
                                                        )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex flex-col gap-3 border-t border-gray-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-gray-500">
                                    Page {pageNumber} of {totalPages}
                                </p>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            loadShipments(pageNumber - 1)
                                        }
                                        disabled={
                                            loading || pageNumber <= 1
                                        }
                                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Previous
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            loadShipments(pageNumber + 1)
                                        }
                                        disabled={
                                            loading ||
                                            pageNumber >= totalPages
                                        }
                                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </section>

            {selectedShipment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Declaration Files
                                </h2>

                                <p className="mt-1 text-sm text-gray-500">
                                    Shipment:{' '}
                                    {selectedShipment.shipmentRef ??
                                        selectedShipment.id}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleCloseDeclarationFiles}
                                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100"
                                aria-label="Close"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="max-h-96 overflow-y-auto px-6 py-5">
                            {filesLoading ? (
                                <div className="flex min-h-32 items-center justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                                </div>
                            ) : filesError ? (
                                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                    {filesError}
                                </div>
                            ) : declarationFiles.length === 0 ? (
                                <div className="flex min-h-32 flex-col items-center justify-center text-center">
                                    <FileText className="h-8 w-8 text-gray-400" />

                                    <p className="mt-3 text-sm text-gray-500">
                                        No declaration files available.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {declarationFiles.map((file) => (
                                        <div
                                            key={file.id}
                                            className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3"
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <FileText className="h-5 w-5 shrink-0 text-blue-600" />

                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium text-gray-900">
                                                        {file.fileName ??
                                                            file.originalFileName ??
                                                            'Declaration file'}
                                                    </p>

                                                    <p className="text-xs text-gray-500">
                                                        {file.contentType ??
                                                            'File'}
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleDownloadDeclarationFile(
                                                        file
                                                    )
                                                }
                                                className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50"
                                                title="Download file"
                                            >
                                                <Download className="h-5 w-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}