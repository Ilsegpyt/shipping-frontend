import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    AlertCircle,
    ArrowLeft,
    Loader2,
    Package,
    Upload,
    FileText,
    Download,
    X,
} from 'lucide-react';

import {
    getShipmentById,
    getDeclarationFilesByShipmentId,
    downloadDeclarationFile,
    uploadDeclarationFile,
} from '../../services/shipmentsService';

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

export default function CustomerShipmentDetails() {
    const { id } = useParams();

    const [shipment, setShipment] = useState(null);
    const [declarationFiles, setDeclarationFiles] = useState([]);

    const [loading, setLoading] = useState(true);
    const [filesLoading, setFilesLoading] = useState(false);

    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    const [error, setError] = useState('');
    const [uploadError, setUploadError] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState('');

    useEffect(() => {
        loadShipment();
    }, [id]);

    const loadShipment = async () => {
        try {
            setLoading(true);
            setError('');

            const result = await getShipmentById(id);

            setShipment(result);

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
        const file = event.target.files?.[0] ?? null;

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
            setUploadError('Please select a file first.');
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

            const url = window.URL.createObjectURL(blob);

            const link = document.createElement('a');

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
                        <h1 className="text-2xl font-semibold text-gray-900">
                            Shipment Details
                        </h1>

                        <p className="mt-2 text-gray-500">
                            View information about your shipment.
                        </p>
                    </div>

                    <span
                        className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-medium ${getStatusClass(
                            shipment.status
                        )}`}
                    >
                        {shipment.status ?? '-'}
                    </span>
                </div>
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
                            {shipment.shipmentRef ??
                                shipment.id}
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
                        label="Mode"
                        value={shipment.mode}
                    />

                    <DetailItem
                        label="Carrier"
                        value={shipment.carrier}
                    />

                    <DetailItem
                        label="Quantity"
                        value={shipment.quantity}
                    />

                    <DetailItem
                        label="Created"
                        value={formatDate(
                            shipment.createdAtUtc
                        )}
                    />

                    <DetailItem
                        label="Schedule ID"
                        value={shipment.scheduleId}
                    />

                    <DetailItem
                        label="Customer ID"
                        value={shipment.customerId}
                    />

                    <DetailItem
                        label="Status"
                        value={shipment.status}
                    />
                </div>
            </div>

            {/* Upload Declaration File */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-5">
                    <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                        <Upload className="h-6 w-6" />
                    </div>

                    <div>
                        <h2 className="font-semibold text-gray-900">
                            Upload Declaration File
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                            Upload a declaration file for this shipment.
                        </p>
                    </div>
                </div>

                <div className="space-y-4 px-6 py-6">
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
                            onChange={handleFileChange}
                            disabled={uploading}
                            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                    </div>

                    {selectedFile && (
                        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                            <p className="min-w-0 text-sm text-gray-600">
                                Selected file:{' '}
                                <span className="font-medium">
                                    {selectedFile.name}
                                </span>
                            </p>

                            <button
                                type="button"
                                onClick={handleRemoveSelectedFile}
                                disabled={uploading}
                                title="Remove selected file"
                                aria-label="Remove selected file"
                                className="ml-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleUpload}
                        disabled={!selectedFile || uploading}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                            <span>{uploadError}</span>
                        </div>
                    )}

                    {uploadSuccess && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                            {uploadSuccess}
                        </div>
                    )}
                </div>
            </div>

            {/* Declaration Files */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-5">
                    <div className="rounded-xl bg-slate-100 p-3 text-slate-600">
                        <FileText className="h-6 w-6" />
                    </div>

                    <div>
                        <h2 className="font-semibold text-gray-900">
                            Declaration Files
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                            Files uploaded for this shipment.
                        </p>
                    </div>
                </div>

                <div className="px-6 py-6">
                    {filesLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        </div>
                    ) : declarationFiles.length === 0 ? (
                        <div className="py-8 text-center">
                            <FileText className="mx-auto h-10 w-10 text-gray-400" />

                            <p className="mt-3 text-sm text-gray-500">
                                No declaration files uploaded yet.
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
                                                key={file.id}
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