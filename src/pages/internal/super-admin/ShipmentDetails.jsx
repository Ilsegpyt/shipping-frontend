import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../auth/AuthContext';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
    ArrowLeft,
    FileText,
    Pencil,
    RefreshCw,
    Upload,
    Download,
    MessageSquare,
    Loader2,
    AlertCircle,
} from 'lucide-react';

import api from '../../../services/api';

import {
    getShipmentById,
    getDeclarationFilesByShipmentId,
    downloadDeclarationFile,
} from '../../../services/shipmentsService';

import { getCustomerVoices } from '../../../services/customerVoicesService';

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

const categoryOptions = [
    { value: '1', label: 'Sea' },
    { value: '2', label: 'Air' },
    { value: '3', label: 'Domestic' },
    { value: '4', label: 'Financial' },
];

const serviceOptions = [
    { value: '1', label: 'Freight' },
    { value: '2', label: 'Customs Clearance' },
    { value: '3', label: 'Transportation' },
    { value: '4', label: 'Both' },
];

const shipmentTypeOptions = [
    { value: '1', label: 'All' },
    { value: '2', label: 'Import' },
    { value: '3', label: 'Export' },
];

export default function ShipmentDetails() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const customerVoiceId = searchParams.get('customerVoiceId');
    const { user } = useAuth();

    const [shipment, setShipment] = useState(null);
    const [declarationFiles, setDeclarationFiles] = useState([]);
    const [customerVoices, setCustomerVoices] = useState([]);
    const [customerVoicesLoading, setCustomerVoicesLoading] = useState(false);
    const [customerVoiceError, setCustomerVoiceError] = useState('');
    const customerVoiceRefs = useRef({});

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState('');

    const [selectedFile, setSelectedFile] = useState(null);

    const [uploadForm, setUploadForm] = useState({
        category: '',
        service: '',
        shipmentType: '',
    });

    const [downloadingFileId, setDownloadingFileId] = useState(null);

    const isAccountManager =
        user?.roleName === 'Account Manager';

    const canUploadReport =
        isAccountManager &&
        user?.permissions?.includes('reports.upload');

    const loadCustomerVoices = async () => {
        try {
            setCustomerVoicesLoading(true);
            setCustomerVoiceError('');

            const result = await getCustomerVoices();

            const shipmentVoices = (result ?? []).filter(
                (voice) =>
                    String(voice.shipmentId).toLowerCase() ===
                    String(id).toLowerCase()
            );

            setCustomerVoices(shipmentVoices);
        } catch (err) {
            console.error(
                'Failed to load customer voices:',
                err
            );

            setCustomerVoices([]);
            setCustomerVoiceError(
                err?.response?.data?.message ??
                err?.response?.data?.detail ??
                'Failed to load customer voice requests.'
            );
        } finally {
            setCustomerVoicesLoading(false);
        }
    };

    const loadShipment = async () => {
        try {
            setLoading(true);
            setError('');

            const [shipmentData, declarationFilesData] =
                await Promise.all([
                    getShipmentById(id),
                    getDeclarationFilesByShipmentId(id),
                ]);

            setShipment(shipmentData);
            setDeclarationFiles(declarationFilesData);

            await loadCustomerVoices();
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

    useEffect(() => {
        if (!customerVoiceId || customerVoices.length === 0) {
            return;
        }

        const targetVoice = customerVoices.find(
            (voice) =>
                String(voice.id).toLowerCase() ===
                String(customerVoiceId).toLowerCase()
        );

        if (!targetVoice) {
            console.log(
                'Customer Voice not found:',
                customerVoiceId
            );
            return;
        }

        const timeoutId = setTimeout(() => {
            const element =
                customerVoiceRefs.current[customerVoiceId];

            if (!element) {
                console.log(
                    'Customer Voice element not found:',
                    customerVoiceId
                );
                return;
            }

            element.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });

            element.classList.add(
                'ring-2',
                'ring-blue-500',
                'ring-offset-4'
            );

            setTimeout(() => {
                element.classList.remove(
                    'ring-2',
                    'ring-blue-500',
                    'ring-offset-4'
                );
            }, 4000);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [customerVoiceId, customerVoices]);

    const resetUploadForm = () => {
        setUploadForm({
            category: '',
            service: '',
            shipmentType: '',
        });

        setSelectedFile(null);
        setUploadError('');
        setUploadSuccess('');
    };

    const openUploadModal = () => {
        resetUploadForm();
        setUploadModalOpen(true);
    };

    const closeUploadModal = () => {
        if (uploading) return;

        setUploadModalOpen(false);
        resetUploadForm();
    };

    const handleUploadChange = (event) => {
        const { name, value } = event.target;

        setUploadForm((previous) => ({
            ...previous,
            [name]: value,
        }));

        setUploadError('');
    };

    const handleFileChange = (event) => {
        const file = event.target.files?.[0] ?? null;

        setSelectedFile(file);
        setUploadError('');
    };

    const handleUpload = async (event) => {
        event.preventDefault();

        setUploadError('');
        setUploadSuccess('');

        if (!shipment?.customerId) {
            setUploadError('Customer ID is missing.');
            return;
        }

        if (!shipment?.shipmentRef) {
            setUploadError('Shipment Reference is missing.');
            return;
        }

        if (!uploadForm.category) {
            setUploadError('Category is required.');
            return;
        }

        if (!uploadForm.service) {
            setUploadError('Service is required.');
            return;
        }

        if (!uploadForm.shipmentType) {
            setUploadError('Shipment Type is required.');
            return;
        }

        if (!selectedFile) {
            setUploadError('Please select a file.');
            return;
        }

        try {
            setUploading(true);

            const formData = new FormData();

            formData.append(
                'customerId',
                shipment.customerId
            );

            formData.append(
                'shipmentRef',
                shipment.shipmentRef
            );

            formData.append(
                'category',
                uploadForm.category
            );

            formData.append(
                'service',
                uploadForm.service
            );

            formData.append(
                'shipmentType',
                uploadForm.shipmentType
            );

            formData.append('file', selectedFile);

            await api.post('/api/reports', formData);

            setUploadSuccess(
                'Report uploaded successfully.'
            );

            setTimeout(() => {
                setUploadModalOpen(false);
                resetUploadForm();
            }, 800);
        } catch (err) {
            console.error('Failed to upload report:', err);

            setUploadError(
                err.response?.data?.error ||
                err.response?.data?.message ||
                err.response?.data ||
                'Failed to upload report.'
            );
        } finally {
            setUploading(false);
        }
    };

    const handleDownloadDeclarationFile = async (file) => {
        try {
            setDownloadingFileId(file.id);

            await downloadDeclarationFile(
                id,
                file.id
            );
        } catch (err) {
            console.error(
                'Failed to download declaration file:',
                err
            );

            setError(
                err.response?.data?.error ||
                err.response?.data?.message ||
                'Failed to download declaration file.'
            );
        } finally {
            setDownloadingFileId(null);
        }
    };

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
                            onClick={() =>
                                navigate(`/shipments/${id}/edit`)
                            }
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

                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleDownloadDeclarationFile(file)
                                            }
                                            disabled={
                                                downloadingFileId === file.id
                                            }
                                            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <Download className="h-4 w-4" />

                                            {downloadingFileId === file.id
                                                ? 'Downloading...'
                                                : 'Download'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </Section>

                {/* Reports */}
                <Section title="Reports">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-800">
                                Shipment Reports
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                                Upload reports related to this customer and shipment.
                            </p>
                        </div>

                        {canUploadReport && (
                            <button
                                type="button"
                                onClick={openUploadModal}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#111827] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#1f2937]"
                            >
                                <Upload className="h-4 w-4" />
                                Upload Report
                            </button>
                        )}
                    </div>
                </Section>


                {/* Customer Voice */}
                <Section title="Customer Voice">
                    <div id="customer-voice-section">
                        {customerVoicesLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                            </div>
                        ) : customerVoiceError && customerVoices.length === 0 ? (
                            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{customerVoiceError}</span>
                            </div>
                        ) : customerVoices.length === 0 ? (
                            <div className="py-8 text-center">
                                <MessageSquare className="mx-auto h-10 w-10 text-slate-400" />
                                <p className="mt-3 text-sm font-medium text-slate-700">
                                    No customer voice requests yet.
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                    No customer voice requests have been created for this shipment.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {customerVoices.map((voice) => {
                                    const isHighlighted =
                                        customerVoiceId &&
                                        String(voice.id).toLowerCase() ===
                                        String(customerVoiceId).toLowerCase();

                                    return (
                                        <div
                                            key={voice.id}
                                            ref={(element) => {
                                                customerVoiceRefs.current[voice.id] =
                                                    element;
                                            }}
                                            id={`customer-voice-${voice.id}`}
                                            className={`rounded-xl border p-4 transition-all duration-300 ${isHighlighted
                                                ? 'border-blue-500 bg-blue-50 shadow-md'
                                                : 'border-slate-200 bg-slate-50'
                                                }`}
                                        >
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <MessageSquare className="h-4 w-4 text-slate-500" />
                                                        <h3 className="text-sm font-semibold text-slate-900">
                                                            {voice.subject || 'Customer Voice'}
                                                        </h3>
                                                    </div>

                                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                                        {voice.message}
                                                    </p>
                                                </div>

                                                <span className="inline-flex w-fit shrink-0 rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
                                                    {voice.status || 'Open'}
                                                </span>
                                            </div>

                                            <div className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-500">
                                                Created {formatDate(voice.createdAtUtc)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </Section>

            </div>

            {/* Upload Report Modal */}
            {uploadModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="mb-5">
                            <h2 className="text-lg font-semibold text-slate-900">
                                Upload Report
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Upload a report for the current shipment.
                            </p>
                        </div>

                        <div className="mb-5 grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Customer ID
                                </p>

                                <p className="mt-1 break-all text-sm font-medium text-slate-800">
                                    {shipment.customerId}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Shipment Reference
                                </p>

                                <p className="mt-1 break-all text-sm font-medium text-slate-800">
                                    {shipment.shipmentRef}
                                </p>
                            </div>
                        </div>

                        {uploadError && (
                            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                                {typeof uploadError === 'string'
                                    ? uploadError
                                    : 'Failed to upload report.'}
                            </div>
                        )}

                        {uploadSuccess && (
                            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-600">
                                {uploadSuccess}
                            </div>
                        )}

                        <form onSubmit={handleUpload}>
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Category *
                                    </label>

                                    <select
                                        name="category"
                                        value={uploadForm.category}
                                        onChange={handleUploadChange}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                    >
                                        <option value="">
                                            Select category
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

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Service *
                                    </label>

                                    <select
                                        name="service"
                                        value={uploadForm.service}
                                        onChange={handleUploadChange}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                    >
                                        <option value="">
                                            Select service
                                        </option>

                                        {serviceOptions.map((option) => (
                                            <option
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Shipment Type *
                                    </label>

                                    <select
                                        name="shipmentType"
                                        value={uploadForm.shipmentType}
                                        onChange={handleUploadChange}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                    >
                                        <option value="">
                                            Select shipment type
                                        </option>

                                        {shipmentTypeOptions.map((option) => (
                                            <option
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Report File *
                                    </label>

                                    <input
                                        type="file"
                                        onChange={handleFileChange}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700"
                                    />

                                    {selectedFile && (
                                        <p className="mt-2 text-xs text-slate-500">
                                            Selected: {selectedFile.name}
                                        </p>
                                    )}
                                </div>

                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={closeUploadModal}
                                        disabled={uploading}
                                        className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={uploading}
                                        className="inline-flex items-center gap-2 rounded-lg bg-[#111827] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <Upload className="h-4 w-4" />

                                        {uploading
                                            ? 'Uploading...'
                                            : 'Upload Report'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}