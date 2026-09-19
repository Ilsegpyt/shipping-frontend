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
    ReadyToShip: 'bg-amber-50 text-amber-700 ring-amber-200',
    Shipped: 'bg-blue-50 text-blue-700 ring-blue-200',
    Returned: 'bg-red-50 text-red-700 ring-red-200',
    Delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
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
        'bg-slate-50 text-slate-700 ring-slate-200'
    );
}

function formatStatus(status) {
    if (!status) return '-';

    return status
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/_/g, ' ');
}

function getStatusDotClass(status) {
    switch (status) {
        case 'Delivered':
            return 'bg-emerald-500';

        case 'Shipped':
            return 'bg-blue-500';

        case 'ReadyToShip':
            return 'bg-amber-500';

        case 'Returned':
            return 'bg-red-500';

        default:
            return 'bg-slate-400';
    }
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
                {/* Header */}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                                <Package className="h-5 w-5" />
                            </div>

                            <div>
                                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                                    My Shipments
                                </h1>

                                <p className="mt-1 text-sm text-slate-500">
                                    View and track your shipments.
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => loadShipments(pageNumber)}
                        disabled={loading}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <RefreshCw
                            className={`h-4 w-4 ${
                                loading ? 'animate-spin' : ''
                            }`}
                        />

                        Refresh
                    </button>
                </div>

                {/* Summary */}
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">
                                    Total Shipments
                                </p>

                                <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                                    {totalCount}
                                </p>
                            </div>

                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                <Package className="h-5 w-5" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
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

                {/* Shipment List */}
                <div>
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-semibold text-slate-900">
                                Your Shipments
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                {totalCount} shipment
                                {totalCount !== 1 ? 's' : ''} in your account
                            </p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
                            <Loader2 className="h-7 w-7 animate-spin text-slate-700" />
                        </div>
                    ) : shipments.length === 0 ? (
                        <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                                <Package className="h-7 w-7 text-slate-400" />
                            </div>

                            <h3 className="mt-4 font-medium text-slate-900">
                                No shipments found
                            </h3>

                            <p className="mt-1 max-w-sm text-sm text-slate-500">
                                Your shipments will appear here once they are
                                created.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {shipments.map((shipment) => (
                                <div
                                    key={shipment.id}
                                    className="group rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
                                >
                                    {/* Card Header */}
                                    <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                                                Shipment Reference
                                            </p>

                                            <div className="mt-1 flex items-center gap-3">
                                                <h3 className="truncate text-lg font-semibold text-slate-900">
                                                    {shipment.shipmentRef ??
                                                        shipment.id ??
                                                        '-'}
                                                </h3>

                                                <span
                                                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusClass(
                                                        shipment.status
                                                    )}`}
                                                >
                                                    <span
                                                        className={`h-1.5 w-1.5 rounded-full ${getStatusDotClass(
                                                            shipment.status
                                                        )}`}
                                                    />

                                                    {formatStatus(
                                                        shipment.status
                                                    )}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="relative shrink-0">
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
                                                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                                aria-label="Shipment actions"
                                            >
                                                <MoreVertical className="h-5 w-5" />
                                            </button>

                                            {openMenuId === shipment.id && (
                                                <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setOpenMenuId(null);

                                                            navigate(
                                                                `/customer/shipments/${shipment.id}`
                                                            );
                                                        }}
                                                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-slate-700 transition hover:bg-slate-50"
                                                    >
                                                        <Package className="h-4 w-4" />

                                                        View Tracking
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleOpenDeclarationFiles(
                                                                shipment
                                                            )
                                                        }
                                                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-slate-700 transition hover:bg-slate-50"
                                                    >
                                                        <FileText className="h-4 w-4" />

                                                        Declaration Files
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Main Information */}
                                    <div className="grid gap-0 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
                                        <div className="px-5 py-4">
                                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                                Mode
                                            </p>

                                            <p className="mt-1.5 text-sm font-semibold text-slate-800">
                                                {shipment.mode ?? '-'}
                                            </p>
                                        </div>

                                        <div className="px-5 py-4">
                                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                                Carrier
                                            </p>

                                            <p className="mt-1.5 text-sm font-semibold text-slate-800">
                                                {shipment.carrier ?? '-'}
                                            </p>
                                        </div>

                                        <div className="px-5 py-4">
                                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                                Container
                                            </p>

                                            <p className="mt-1.5 text-sm font-semibold text-slate-800">
                                                {shipment.containerType ??
                                                    '-'}
                                            </p>
                                        </div>

                                        <div className="px-5 py-4">
                                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                                Quantity
                                            </p>

                                            <p className="mt-1.5 text-sm font-semibold text-slate-800">
                                                {formatNumber(
                                                    shipment.quantity
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Reference Information */}
                                    <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-5">
                                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                            <div>
                                                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                                    Booking
                                                </p>

                                                <p className="mt-1 text-sm font-medium text-slate-700">
                                                    {shipment.bookingConfirmationNumber ??
                                                        '-'}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                                    MBL
                                                </p>

                                                <p className="mt-1 text-sm font-medium text-slate-700">
                                                    {shipment.MBL ?? '-'}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                                    HBL
                                                </p>

                                                <p className="mt-1 text-sm font-medium text-slate-700">
                                                    {shipment.HBL ?? '-'}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                                    Created
                                                </p>

                                                <p className="mt-1 text-sm font-medium text-slate-700">
                                                    {formatDate(
                                                        shipment.createdAtUtc
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Footer */}
                                    <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-xs text-slate-400">
                                                Shipment total
                                            </p>

                                            <p className="mt-0.5 text-sm font-semibold text-slate-900">
                                                {shipment.total ?? '-'}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                navigate(
                                                    `/customer/shipments/${shipment.id}`
                                                )
                                            }
                                            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                                        >
                                            View Tracking
                                            <ChevronRight className="ml-1.5 h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {!loading && shipments.length > 0 && (
                    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-slate-500">
                            Page{' '}
                            <span className="font-medium text-slate-700">
                                {pageNumber}
                            </span>{' '}
                            of{' '}
                            <span className="font-medium text-slate-700">
                                {totalPages}
                            </span>
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
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {/* Declaration Files Modal */}
            {selectedShipment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">
                                    Declaration Files
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Shipment:{' '}
                                    {selectedShipment.shipmentRef ??
                                        selectedShipment.id}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleCloseDeclarationFiles}
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                aria-label="Close"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="max-h-96 overflow-y-auto px-6 py-5">
                            {filesLoading ? (
                                <div className="flex min-h-32 items-center justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin text-slate-700" />
                                </div>
                            ) : filesError ? (
                                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                    {filesError}
                                </div>
                            ) : declarationFiles.length === 0 ? (
                                <div className="flex min-h-32 flex-col items-center justify-center text-center">
                                    <FileText className="h-8 w-8 text-slate-400" />

                                    <p className="mt-3 text-sm text-slate-500">
                                        No declaration files available.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {declarationFiles.map((file) => (
                                        <div
                                            key={file.id}
                                            className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                                                    <FileText className="h-5 w-5 text-slate-600" />
                                                </div>

                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium text-slate-900">
                                                        {file.fileName ??
                                                            file.originalFileName ??
                                                            'Declaration file'}
                                                    </p>

                                                    <p className="text-xs text-slate-500">
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
                                                className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
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