import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    FileText,
    Pencil,
    RefreshCw,
} from 'lucide-react';

import {
    getShipmentById,
    getDeclarationFilesByShipmentId,
} from '../../../services/shipmentsService';

function formatDate(value) {
    if (!value) return '—';

    return new Date(value).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatMoney(value) {
    if (value === null || value === undefined) {
        return '—';
    }

    return Number(value).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function formatValue(value) {
    return value === null || value === undefined || value === ''
        ? '—'
        : value;
}

function getStatusClass(status) {
    switch (String(status).toLowerCase()) {
        case 'received':
            return 'bg-blue-100 text-blue-700';

        case 'booked':
            return 'bg-purple-100 text-purple-700';

        case 'in transit':
            return 'bg-amber-100 text-amber-700';

        case 'delivered':
            return 'bg-emerald-100 text-emerald-700';

        case 'cancelled':
            return 'bg-red-100 text-red-700';

        default:
            return 'bg-slate-100 text-slate-700';
    }
}

function InfoItem({ label, value }) {
    return (
        <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                {label}
            </p>

            <p className="break-words text-sm font-medium text-slate-800">
                {formatValue(value)}
            </p>
        </div>
    );
}

function Section({ title, children }) {
    return (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-5 border-b border-slate-100 pb-3 text-base font-semibold text-slate-900">
                {title}
            </h2>

            {children}
        </section>
    );
}

export default function ShipmentDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [shipment, setShipment] = useState(null);
    const [declarationFiles, setDeclarationFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadShipment = async () => {
        try {
            setLoading(true);
            setError('');

            const [shipmentData, declarationFilesData] = await Promise.all([
                getShipmentById(id),
                getDeclarationFilesByShipmentId(id),
            ]);

            setShipment(shipmentData);
            setDeclarationFiles(declarationFilesData);
        } catch (err) {
            setError(
                err.response?.data?.error ||
                err.response?.data ||
                'Failed to load shipment details.'
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadShipment();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-full bg-gray-50 p-4 sm:p-6">
                <div className="flex min-h-[300px] items-center justify-center">
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        Loading shipment details...
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-full bg-gray-50 p-4 sm:p-6">
                <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                    <p className="text-sm font-medium text-red-700">
                        {error}
                    </p>

                    <button
                        type="button"
                        onClick={loadShipment}
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#111827] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1f2937]"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (!shipment) {
        return null;
    }

    return (
        <div className="min-h-full bg-gray-50 p-4 sm:p-6">
            <div className="mx-auto max-w-7xl space-y-6">
                {/* Header */}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <button
                            type="button"
                            onClick={() => navigate('/shipments')}
                            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Shipments
                        </button>

                        <h1 className="text-2xl font-semibold text-slate-900">
                            Shipment Details
                        </h1>

                        <p className="mt-1 text-sm text-slate-500">
                            View shipment information and identifiers.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={loadShipment}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate(`/shipments/${id}/edit`)}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#111827] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#1f2937]"
                        >
                            <Pencil className="h-4 w-4" />
                            Edit Shipment
                        </button>
                    </div>
                </div>

                {/* Summary */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                Shipment Reference
                            </p>

                            <h2 className="mt-1 text-xl font-semibold text-slate-900">
                                {shipment.shipmentRef}
                            </h2>
                        </div>

                        <span
                            className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-medium ${getStatusClass(
                                shipment.status
                            )}`}
                        >
                            {shipment.status || 'Unknown'}
                        </span>
                    </div>
                </div>

                {/* Shipment Information */}
                <Section title="Shipment Information">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        <InfoItem
                            label="Shipment Reference"
                            value={shipment.shipmentRef}
                        />

                        <InfoItem
                            label="Mode"
                            value={shipment.mode}
                        />

                        <InfoItem
                            label="Carrier"
                            value={shipment.carrier}
                        />

                        <InfoItem
                            label="Container Type"
                            value={shipment.containerType}
                        />

                        <InfoItem
                            label="Quantity"
                            value={shipment.quantity}
                        />

                        <InfoItem
                            label="Rate"
                            value={formatMoney(shipment.rate)}
                        />

                        <InfoItem
                            label="Total"
                            value={formatMoney(shipment.total)}
                        />

                        <InfoItem
                            label="Created At"
                            value={formatDate(shipment.createdAtUtc)}
                        />
                    </div>
                </Section>

                {/* References */}
                <Section title="References">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        <InfoItem
                            label="Customer ID"
                            value={shipment.customerId}
                        />

                        <InfoItem
                            label="Schedule ID"
                            value={shipment.scheduleId}
                        />

                        <InfoItem
                            label="MBL"
                            value={shipment.mbl}
                        />

                        <InfoItem
                            label="HBL"
                            value={shipment.hbl}
                        />

                        <InfoItem
                            label="MAWB"
                            value={shipment.mawb}
                        />

                        <InfoItem
                            label="Booking Confirmation Number"
                            value={shipment.bookingConfirmationNumber}
                        />
                    </div>
                </Section>

                {/* Declaration Files */}
                <Section title="Declaration Files">
                    {declarationFiles.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                            <FileText className="mx-auto mb-3 h-8 w-8 text-slate-400" />

                            <p className="text-sm font-medium text-slate-600">
                                No declaration files found.
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                                This shipment does not have any uploaded declaration files.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-lg border border-slate-200">
                            <div className="divide-y divide-slate-200">
                                {declarationFiles.map((file) => (
                                    <div
                                        key={file.id}
                                        className="flex flex-col justify-between gap-3 px-4 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center"
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                                                <FileText className="h-5 w-5 text-slate-600" />
                                            </div>

                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-slate-800">
                                                    {file.fileName}
                                                </p>

                                                <p className="mt-1 text-xs text-slate-500">
                                                    Uploaded {formatDate(file.uploadedAtUtc)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </Section>
            </div>
        </div>
    );
}