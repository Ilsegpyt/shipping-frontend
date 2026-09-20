import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    AlertCircle,
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    Download,
    FileText,
    Loader2,
    MapPin,
    Package,
    Plane,
    Ship,
    Upload,
    X,
    Clock3,
} from 'lucide-react';

import {
    getShipmentById,
    getDeclarationFilesByShipmentId,
    downloadDeclarationFile,
    uploadDeclarationFile,
} from '../../services/shipmentsService';

import { getScheduleById } from '../../services/schedulesService';

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

function formatDateTime(value) {
    if (!value) return '-';

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

function formatTimeSpan(value) {
    if (!value) return '-';

    if (typeof value === 'string') {
        const parts = value.split(':');

        if (parts.length >= 2) {
            const hours = Number(parts[0]);
            const minutes = Number(parts[1]);

            if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
                if (hours > 0 && minutes > 0) {
                    return `${hours}h ${minutes}m`;
                }

                if (hours > 0) {
                    return `${hours}h`;
                }

                return `${minutes}m`;
            }
        }
    }

    return value;
}

function getStatusClass(status) {
    return (
        statusStyles[status] ??
        'bg-slate-100 text-slate-700'
    );
}

function DetailItem({ label, value }) {
    return (
        <div>
            <p className="text-sm text-gray-500">
                {label}
            </p>

            <p className="mt-1 break-words font-medium text-gray-900">
                {value ?? '-'}
            </p>
        </div>
    );
}

function TimelinePoint({
    title,
    date,
    icon,
    active = false,
}) {
    return (
        <div className="flex items-start gap-4">
            <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    active
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-500'
                }`}
            >
                {icon}
            </div>

            <div className="min-w-0">
                <p className="font-semibold text-gray-900">
                    {title}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                    {date}
                </p>
            </div>
        </div>
    );
}

export default function CustomerShipmentDetails() {
    const { id } = useParams();

    const [shipment, setShipment] = useState(null);
    const [schedule, setSchedule] = useState(null);

    const [declarationFiles, setDeclarationFiles] = useState([]);

    const [loading, setLoading] = useState(true);
    const [scheduleLoading, setScheduleLoading] =
        useState(false);
    const [filesLoading, setFilesLoading] = useState(false);

    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [showUpload, setShowUpload] = useState(false);

    const [error, setError] = useState('');
    const [scheduleError, setScheduleError] =
        useState('');
    const [uploadError, setUploadError] = useState('');
    const [uploadSuccess, setUploadSuccess] =
        useState('');

    useEffect(() => {
        loadShipment();
    }, [id]);

    const loadShipment = async () => {
        try {
            setLoading(true);
            setError('');
            setSchedule(null);
            setScheduleError('');

            const result = await getShipmentById(id);

            setShipment(result);

            if (result?.scheduleId) {
                await loadSchedule(result.scheduleId);
            }

            await loadDeclarationFiles();
        } catch (err) {
            console.error(
                'Failed to load shipment details:',
                err
            );

            setError(
                err?.response?.data?.message ??
                    err?.response?.data?.detail ??
                    'Unable to load shipment details.'
            );
        } finally {
            setLoading(false);
        }
    };

    const loadSchedule = async (scheduleId) => {
        try {
            setScheduleLoading(true);
            setScheduleError('');

            const result =
                await getScheduleById(scheduleId);

            setSchedule(result);
        } catch (err) {
            console.error(
                'Failed to load shipment schedule:',
                err
            );

            setScheduleError(
                err?.response?.data?.message ??
                    err?.response?.data?.detail ??
                    'Unable to load schedule details.'
            );
        } finally {
            setScheduleLoading(false);
        }
    };

    const loadDeclarationFiles = async () => {
        try {
            setFilesLoading(true);

            const result =
                await getDeclarationFilesByShipmentId(id);

            setDeclarationFiles(result ?? []);
        } catch (err) {
            console.error(
                'Failed to load declaration files:',
                err
            );

            setDeclarationFiles([]);
        } finally {
            setFilesLoading(false);
        }
    };

    const handleFileChange = (event) => {
        const file =
            event.target.files?.[0] ?? null;

        setSelectedFile(file);
        setUploadError('');
        setUploadSuccess('');
    };

    const handleRemoveSelectedFile = () => {
        setSelectedFile(null);

        const input = document.getElementById(
            'declaration-file-input'
        );

        if (input) {
            input.value = '';
        }

        setUploadError('');
        setUploadSuccess('');
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            setUploadError(
                'Please select a file first.'
            );

            return;
        }

        try {
            setUploading(true);
            setUploadError('');
            setUploadSuccess('');

            await uploadDeclarationFile(
                id,
                selectedFile
            );

            setUploadSuccess(
                'Declaration file uploaded successfully.'
            );

            setSelectedFile(null);

            const input = document.getElementById(
                'declaration-file-input'
            );

            if (input) {
                input.value = '';
            }

            await loadDeclarationFiles();
        } catch (err) {
            console.error(
                'Failed to upload declaration file:',
                err
            );

            setUploadError(
                err?.response?.data?.message ??
                    err?.response?.data?.detail ??
                    err?.response?.data?.title ??
                    'Failed to upload declaration file.'
            );
        } finally {
            setUploading(false);
        }
    };

    const handleDownload = async (file) => {
        try {
            const response =
                await downloadDeclarationFile(
                    id,
                    file.id
                );

            const blob = new Blob([response.data]);

            const url =
                window.URL.createObjectURL(blob);

            const link =
                document.createElement('a');

            link.href = url;

            link.download =
                file.fileName ??
                file.originalFileName ??
                'declaration-file';

            document.body.appendChild(link);

            link.click();

            link.remove();

            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error(
                'Failed to download declaration file:',
                err
            );

            alert('Failed to download file.');
        }
    };

    const timeline = useMemo(() => {
        if (!schedule) {
            return null;
        }

        const departureDate = schedule.departureDate;
        const arrivalDate = schedule.arrival;

        if (!departureDate || !arrivalDate) {
            return null;
        }

        const departure = new Date(departureDate);
        const arrival = new Date(arrivalDate);
        const today = new Date();

        const total = arrival.getTime() - departure.getTime();
        const elapsed = today.getTime() - departure.getTime();

        let progress = 0;

        if (today >= arrival) {
            progress = 100;
        } else if (today > departure && total > 0) {
            progress = Math.round(
                Math.min(100, Math.max(0, (elapsed / total) * 100))
            );
        }

        const totalDays = Math.max(0, Math.ceil(total / 86400000));
        const elapsedDays = Math.min(
            totalDays,
            Math.max(0, Math.floor(elapsed / 86400000))
        );
        const remainingDays = Math.max(0, totalDays - elapsedDays);

        let phase = 'Scheduled';
        if (today >= arrival) {
            phase = 'Completed';
        } else if (today > departure) {
            phase = 'In Transit';
        }

        return {
            departureDate,
            arrivalDate,
            progress,
            phase,
            elapsedLabel:
                phase === 'Scheduled'
                    ? 'Not departed'
                    : `${elapsedDays} day${elapsedDays === 1 ? '' : 's'} elapsed`,
            durationLabel:
                `${totalDays} day${totalDays === 1 ? '' : 's'} planned`,
            remainingLabel:
                phase === 'Completed'
                    ? 'Arrived'
                    : `${remainingDays} day${remainingDays === 1 ? '' : 's'} remaining`,
        };
    }, [schedule]);

    if (loading) {
        return (
            <div className="flex min-h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <section className="space-y-6">
                <Link
                    to="/customer/shipments"
                    className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to My Shipments
                </Link>

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
            </section>
        );
    }

    if (!shipment) {
        return (
            <section className="space-y-6">
                <Link
                    to="/customer/shipments"
                    className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to My Shipments
                </Link>

                <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                    <Package className="mx-auto h-10 w-10 text-gray-400" />

                    <p className="mt-3 text-gray-500">
                        Shipment not found.
                    </p>
                </div>
            </section>
        );
    }

    return (
        <section className="space-y-6">
            {/* Header */}
            <div>
                <Link
                    to="/customer/shipments"
                    className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to My Shipments
                </Link>

                <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <p className="text-sm font-medium text-blue-600">
                            {shipment.shipmentRef ??
                                shipment.id}
                        </p>

                        <h1 className="mt-1 text-2xl font-semibold text-gray-900">
                            Shipment Details
                        </h1>

                        <p className="mt-2 text-gray-500">
                            View shipment information,
                            route and schedule.
                        </p>
                    </div>

                    <span
                        className={`inline-flex w-fit rounded-full px-3 py-1.5 text-sm font-medium ${getStatusClass(
                            shipment.status
                        )}`}
                    >
                        {shipment.status ?? '-'}
                    </span>
                </div>
            </div>

            {/* Time-Based Tracking */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                {scheduleLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    </div>
                ) : !schedule || !timeline ? (
                    <div className="px-6 py-10 text-center text-sm text-gray-500">
                        No timeline information available.
                    </div>
                ) : (
                    <div className="px-6 py-8">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        Journey status
                                    </p>

                                    <p className="mt-1 text-lg font-semibold text-slate-900">
                                        {timeline.phase}
                                    </p>
                                </div>

                                <div className="text-left sm:text-right">
                                    <p className="text-2xl font-bold text-blue-600">
                                        {timeline.progress}%
                                    </p>

                                    <p className="text-xs text-slate-500">
                                        Planned journey progress
                                    </p>
                                </div>
                            </div>

                            <div className="mt-8">
                                <div className="relative mx-5 h-11 sm:mx-8">
                                    {/* One shared track: points, progress, and vehicle all use the same coordinate system. */}
                                    <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-slate-200" />

                                    <div
                                        className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-blue-600 transition-all duration-500"
                                        style={{ width: `${timeline.progress}%` }}
                                    />

                                    <div
                                        className={`absolute left-0 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white shadow-sm ${
                                            timeline.progress > 0
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-white text-slate-500 ring-1 ring-slate-200'
                                        }`}
                                    >
                                        <CalendarDays className="h-5 w-5" />
                                    </div>

                                    <div
                                        className="absolute top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-blue-600 text-white shadow-md transition-all duration-500"
                                        style={{ left: `${timeline.progress}%` }}
                                        title={`${timeline.progress}% of planned journey`}
                                    >
                                        {schedule.mode === 'Air' ? (
                                            <Plane className="h-5 w-5" />
                                        ) : (
                                            <Ship className="h-5 w-5" />
                                        )}
                                    </div>

                                    <div
                                        className={`absolute left-full top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white shadow-sm ${
                                            timeline.progress === 100
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-white text-slate-500 ring-1 ring-slate-200'
                                        }`}
                                    >
                                        <CheckCircle2 className="h-5 w-5" />
                                    </div>
                                </div>

                                <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Departure</p>
                                        <p className="mt-1 font-semibold text-slate-900">{schedule.origin ?? '-'}</p>
                                        <p className="mt-1 text-xs text-slate-500">{schedule.departurePortCode ?? '-'}</p>
                                        <p className="mt-1 text-xs text-slate-500">{formatDate(timeline.departureDate)}</p>
                                    </div>

                                    <div className="self-center">
                                        <p className="text-sm font-semibold text-blue-600">{timeline.phase}</p>
                                        <p className="mt-1 text-xs text-slate-500">{formatTimeSpan(schedule.transitTime)} planned transit</p>
                                    </div>

                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Arrival</p>
                                        <p className="mt-1 font-semibold text-slate-900">{schedule.destination ?? '-'}</p>
                                        <p className="mt-1 text-xs text-slate-500">{schedule.arrivalPortCode ?? '-'}</p>
                                        <p className="mt-1 text-xs text-slate-500">{formatDate(timeline.arrivalDate)}</p>
                                    </div>
                                </div>

                                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600">
                                    <span>{timeline.elapsedLabel}</span>
                                    <span className="text-blue-600">{timeline.progress}% complete</span>
                                    <span>{timeline.remainingLabel}</span>
                                </div>
                            </div>

                            <div className="mt-5 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
                                <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
                                <p>
                                    This is a schedule-based estimate calculated from the planned departure and arrival dates. It does not represent live shipment tracking.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Shipment Information */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-5">
                    <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                        <Package className="h-6 w-6" />
                    </div>

                    <div>
                        <h2 className="font-semibold text-gray-900">
                            Shipment Information
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                            Shipment details and
                            references.
                        </p>
                    </div>
                </div>

                <div className="grid gap-6 px-6 py-6 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailItem
                        label="Shipment Reference"
                        value={
                            shipment.shipmentRef ??
                            shipment.id
                        }
                    />

                    <DetailItem
                        label="Shipment ID"
                        value={shipment.id}
                    />

                    <DetailItem
                        label="Status"
                        value={shipment.status}
                    />

                    <DetailItem
                        label="Mode"
                        value={shipment.mode}
                    />

                    <DetailItem
                        label="Carrier"
                        value={shipment.carrier}
                    />

                    <DetailItem
                        label="Container Type"
                        value={
                            shipment.containerType
                        }
                    />

                    <DetailItem
                        label="Quantity"
                        value={shipment.quantity}
                    />

                    <DetailItem
                        label="Booking Confirmation"
                        value={
                            shipment.bookingConfirmationNumber
                        }
                    />

                    <DetailItem
                        label="MBL"
                        value={shipment.mbl}
                    />

                    <DetailItem
                        label="HBL"
                        value={shipment.hbl}
                    />

                    <DetailItem
                        label="MAWB"
                        value={shipment.mawb}
                    />

                    <DetailItem
                        label="Created"
                        value={formatDateTime(
                            shipment.createdAtUtc
                        )}
                    />
                </div>
            </div>

            
            {/* Schedule Details */}
            {schedule && (
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-5">
                        <div className="rounded-xl bg-slate-100 p-3 text-slate-600">
                            <CalendarDays className="h-6 w-6" />
                        </div>

                        <div>
                            <h2 className="font-semibold text-gray-900">
                                Schedule Details
                            </h2>

                            <p className="mt-1 text-sm text-gray-500">
                                Planned schedule information.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-6 px-6 py-6 sm:grid-cols-2 lg:grid-cols-3">
                        <DetailItem
                            label="Departure Date"
                            value={formatDate(
                                schedule.departureDate
                            )}
                        />

                        <DetailItem
                            label="Arrival Date"
                            value={formatDate(
                                schedule.arrival
                            )}
                        />

                        <DetailItem
                            label="Transit Time"
                            value={formatTimeSpan(
                                schedule.transitTime
                            )}
                        />

                        <DetailItem
                            label="Vessel"
                            value={schedule.vessel}
                        />

                        <DetailItem
                            label="Carrier"
                            value={schedule.carrier}
                        />

                        <DetailItem
                            label="Voyage Number"
                            value={
                                schedule.voyageNumber
                            }
                        />

                        <DetailItem
                            label="Departure Port"
                            value={
                                schedule.departurePortCode
                            }
                        />

                        <DetailItem
                            label="Arrival Port"
                            value={
                                schedule.arrivalPortCode
                            }
                        />

                        <DetailItem
                            label="Mode"
                            value={schedule.mode}
                        />

                        <DetailItem
                            label="Cutoff Date"
                            value={formatDate(
                                schedule.cutoffDate
                            )}
                        />

                        <DetailItem
                            label="Port Cutoff Date"
                            value={formatDate(
                                schedule.portCutoffDate
                            )}
                        />

                        <DetailItem
                            label="Transshipment"
                            value={
                                schedule.transshipmentData
                            }
                        />
                    </div>
                </div>
            )}

            {/* Declaration Files */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-slate-100 p-3 text-slate-600">
                            <FileText className="h-6 w-6" />
                        </div>

                        <div>
                            <h2 className="font-semibold text-gray-900">
                                Declaration Files
                            </h2>

                            <p className="mt-1 text-sm text-gray-500">
                                Files uploaded for this
                                shipment.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setShowUpload(
                                (current) => !current
                            );

                            setUploadError('');
                            setUploadSuccess('');
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                        {showUpload ? (
                            <>
                                <X className="h-4 w-4" />
                                Close Upload
                            </>
                        ) : (
                            <>
                                <Upload className="h-4 w-4" />
                                Upload File
                            </>
                        )}
                    </button>
                </div>

                {showUpload && (
                    <div className="border-b border-gray-200 bg-gray-50 px-6 py-5">
                        <div className="space-y-4">
                            <div>
                                <label
                                    htmlFor="declaration-file-input"
                                    className="mb-2 block text-sm font-medium text-gray-700"
                                >
                                    Select File
                                </label>

                                <input
                                    id="declaration-file-input"
                                    type="file"
                                    onChange={
                                        handleFileChange
                                    }
                                    disabled={uploading}
                                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                                />
                            </div>

                            {selectedFile && (
                                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
                                    <p className="min-w-0 text-sm text-gray-600">
                                        Selected file:{' '}
                                        <span className="font-medium">
                                            {
                                                selectedFile.name
                                            }
                                        </span>
                                    </p>

                                    <button
                                        type="button"
                                        onClick={
                                            handleRemoveSelectedFile
                                        }
                                        disabled={
                                            uploading
                                        }
                                        title="Remove selected file"
                                        aria-label="Remove selected file"
                                        className="ml-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleUpload}
                                disabled={
                                    !selectedFile ||
                                    uploading
                                }
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-4 w-4" />
                                        Upload File
                                    </>
                                )}
                            </button>

                            {uploadError && (
                                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

                                    <span>
                                        {uploadError}
                                    </span>
                                </div>
                            )}

                            {uploadSuccess && (
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                                    {uploadSuccess}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="px-6 py-6">
                    {filesLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        </div>
                    ) : declarationFiles.length ===
                      0 ? (
                        <div className="py-8 text-center">
                            <FileText className="mx-auto h-10 w-10 text-gray-400" />

                            <p className="mt-3 text-sm text-gray-500">
                                No declaration files
                                uploaded yet.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                                <thead className="border-b border-gray-200 text-gray-500">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">
                                            File Name
                                        </th>

                                        <th className="px-4 py-3 font-medium">
                                            Uploaded At
                                        </th>

                                        <th className="px-4 py-3 text-right font-medium">
                                            Action
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {declarationFiles.map(
                                        (file) => (
                                            <tr
                                                key={
                                                    file.id
                                                }
                                                className="border-b border-gray-100 last:border-0"
                                            >
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="h-4 w-4 text-gray-400" />

                                                        <span className="font-medium text-gray-900">
                                                            {file.fileName ??
                                                                file.originalFileName ??
                                                                '-'}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="px-4 py-4 text-gray-500">
                                                    {formatDateTime(
                                                        file.uploadedAtUtc ??
                                                            file.createdAtUtc ??
                                                            file.uploadedAt
                                                    )}
                                                </td>

                                                <td className="px-4 py-4 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleDownload(
                                                                file
                                                            )
                                                        }
                                                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                        Download
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}