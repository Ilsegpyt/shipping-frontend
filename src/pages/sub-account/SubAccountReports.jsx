import { useEffect, useMemo, useState } from 'react';
import {
    Download,
    Eye,
    FileText,
    Filter,
    Search,
    X,
} from 'lucide-react';
import api from '../../services/api';

const categoriesOptions = [
    'Sea',
    'Air',
    'Domestic',
    'Financial',
];

const domesticServices = [
    'Customs Clearance',
    'CustomsClearance',
    'Transportation',
    'Both',
];

const shipmentTypesOptions = [
    'All Shipments',
    'Import',
    'Export',
];

export default function SubAccountReports() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [serviceFilter, setServiceFilter] = useState('All');
    const [shipmentTypeFilter, setShipmentTypeFilter] = useState('All');

    const [previewUrl, setPreviewUrl] = useState(null);
    const [previewName, setPreviewName] = useState('');
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState('');

    const [downloadingId, setDownloadingId] = useState(null);

    useEffect(() => {
        const loadReports = async () => {
            try {
                setLoading(true);
                setError('');

                const response = await api.get('/api/reports');

                console.log('REPORTS FROM API:', response.data);

                setReports(response.data);
            } catch (err) {
                console.error('Failed to load reports:', err);

                setError(
                    'Failed to load reports. Please try again later.'
                );
            } finally {
                setLoading(false);
            }
        };

        loadReports();
    }, []);

    const formatDate = (date) => {
        if (!date) return '-';

        return new Date(date).toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    };

    const handleCategoryChange = (event) => {
        const category = event.target.value;

        setCategoryFilter(category);

        if (category === 'Sea' || category === 'Air') {
            setServiceFilter('Freight');
            setShipmentTypeFilter('All Shipments');
            return;
        }

        if (category === 'Domestic') {
            setServiceFilter('All');
            setShipmentTypeFilter('All Shipments');
            return;
        }

        if (category === 'Financial') {
            setServiceFilter('None');
            setShipmentTypeFilter('None');
            return;
        }

        setServiceFilter('All');
        setShipmentTypeFilter('All');
    };

    const filteredReports = useMemo(() => {
        const searchValue = search.trim().toLowerCase();

        return reports.filter((report) => {
            const matchesSearch =
                !searchValue ||
                report.shipmentRef?.toLowerCase().includes(searchValue) ||
                report.fileName?.toLowerCase().includes(searchValue);

            const matchesCategory =
                categoryFilter === 'All' ||
                report.category === categoryFilter;

            const matchesService =
                serviceFilter === 'All' ||
                (serviceFilter === 'Both'
                    ? report.service === 'CustomsClearance' ||
                    report.service === 'Customs Clearance' ||
                    report.service === 'Transportation' ||
                    report.service === 'Both'
                    : report.service === serviceFilter);

            const matchesShipmentType =
                shipmentTypeFilter === 'All' ||
                (shipmentTypeFilter === 'All Shipments'
                    ? report.shipmentType === 'Import' ||
                    report.shipmentType === 'Export' ||
                    report.shipmentType === 'All'
                    : report.shipmentType === shipmentTypeFilter);

            return (
                matchesSearch &&
                matchesCategory &&
                matchesService &&
                matchesShipmentType
            );
        });
    }, [
        reports,
        search,
        categoryFilter,
        serviceFilter,
        shipmentTypeFilter,
    ]);

    const getServiceOptions = () => {
        if (categoryFilter === 'Sea' || categoryFilter === 'Air') {
            return ['Freight'];
        }

        if (categoryFilter === 'Domestic') {
            return domesticServices;
        }

        if (categoryFilter === 'Financial') {
            return ['None'];
        }

        return [];
    };

    const getShipmentTypeOptions = () => {
        if (categoryFilter === 'Financial') {
            return ['None'];
        }

        return shipmentTypesOptions;
    };

    const serviceOptions = getServiceOptions();
    const shipmentTypeOptions = getShipmentTypeOptions();

    const categories = useMemo(() => {
        return categoriesOptions;
    }, []);

    const getBadgeClass = (value) => {
        switch (value) {
            case 'Air':
                return 'bg-blue-50 text-blue-700 ring-blue-600/10';

            case 'Sea':
                return 'bg-cyan-50 text-cyan-700 ring-cyan-600/10';

            case 'Import':
                return 'bg-emerald-50 text-emerald-700 ring-emerald-600/10';

            case 'Export':
                return 'bg-amber-50 text-amber-700 ring-amber-600/10';

            default:
                return 'bg-gray-50 text-gray-700 ring-gray-600/10';
        }
    };

    const downloadReport = async (report) => {
        try {
            setDownloadingId(report.id);

            const response = await api.get(
                `/api/reports/${report.id}/file`,
                {
                    responseType: 'blob',
                }
            );

            const blob = new Blob([response.data], {
                type:
                    response.headers['content-type'] ||
                    'application/octet-stream',
            });

            const url = window.URL.createObjectURL(blob);

            const link = document.createElement('a');

            link.href = url;
            link.download = report.fileName || 'report';

            document.body.appendChild(link);
            link.click();

            link.remove();

            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to download report:', err);
        } finally {
            setDownloadingId(null);
        }
    };

    const previewReport = async (report) => {
        try {
            setPreviewLoading(true);
            setPreviewError('');
            setPreviewName(report.fileName || 'Report');

            const response = await api.get(
                `/api/reports/${report.id}/file`,
                {
                    responseType: 'blob',
                }
            );

            const contentType =
                response.headers['content-type'] ||
                response.data?.type ||
                '';

            if (contentType !== 'application/pdf') {
                setPreviewError(
                    'Preview is currently available for PDF files only. Please download this file to open it.'
                );

                return;
            }

            const blob = new Blob([response.data], {
                type: 'application/pdf',
            });

            const url = window.URL.createObjectURL(blob);

            setPreviewUrl(url);
        } catch (err) {
            console.error('Failed to preview report:', err);

            setPreviewError(
                'Failed to open this report. Please try downloading the file instead.'
            );
        } finally {
            setPreviewLoading(false);
        }
    };

    const closePreview = () => {
        if (previewUrl) {
            window.URL.revokeObjectURL(previewUrl);
        }

        setPreviewUrl(null);
        setPreviewName('');
        setPreviewError('');
    };

    const clearFilters = () => {
        setSearch('');
        setCategoryFilter('All');
        setServiceFilter('All');
        setShipmentTypeFilter('All');
    };

    const hasFilters =
        search ||
        categoryFilter !== 'All' ||
        serviceFilter !== 'All' ||
        shipmentTypeFilter !== 'All';

    return (
        <>
            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <FileText className="h-5 w-5" />
                            </div>

                            <div>
                                <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                                    Reports
                                </h1>

                                <p className="mt-0.5 text-sm text-gray-500">
                                    View the reports available to your account.
                                </p>
                            </div>
                        </div>
                    </div>

                    {!loading && (
                        <div className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                Available Reports
                            </p>

                            <p className="mt-0.5 text-lg font-semibold text-gray-900">
                                {reports.length}
                            </p>
                        </div>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
                        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />

                        <p className="mt-4 text-sm text-gray-500">
                            Loading reports...
                        </p>
                    </div>
                )}

                {/* Content */}
                {!loading && !error && (
                    <>
                        {/* Filters */}
                        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                            <div className="mb-4 flex items-center gap-2">
                                <Filter className="h-4 w-4 text-gray-500" />

                                <h2 className="text-sm font-semibold text-gray-900">
                                    Filter Reports
                                </h2>

                                {hasFilters && (
                                    <button
                                        type="button"
                                        onClick={clearFilters}
                                        className="ml-auto text-xs font-medium text-blue-600 transition hover:text-blue-700"
                                    >
                                        Clear filters
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) =>
                                            setSearch(e.target.value)
                                        }
                                        placeholder="Search shipment or file..."
                                        className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                                    />
                                </div>

                                {/* Category */}
                                <select
                                    value={categoryFilter}
                                    onChange={handleCategoryChange}
                                    className="h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                                >
                                    <option value="All">
                                        All Categories
                                    </option>

                                    {categories.map((category) => (
                                        <option
                                            key={category}
                                            value={category}
                                        >
                                            {category}
                                        </option>
                                    ))}
                                </select>

                                {/* Service */}
                                <select
                                    value={serviceFilter}
                                    onChange={(e) =>
                                        setServiceFilter(e.target.value)
                                    }
                                    disabled={categoryFilter === 'All'}
                                    className="h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100 disabled:text-gray-400"
                                >
                                    <option value="All">
                                        All Services
                                    </option>

                                    {serviceOptions.map((service) => (
                                        <option
                                            key={service}
                                            value={service}
                                        >
                                            {service}
                                        </option>
                                    ))}
                                </select>

                                {/* Shipment Type */}
                                <select
                                    value={shipmentTypeFilter}
                                    onChange={(e) =>
                                        setShipmentTypeFilter(e.target.value)
                                    }
                                    disabled={categoryFilter === 'All'}
                                    className="h-11 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100 disabled:text-gray-400"
                                >
                                    <option value="All">
                                        All Shipment Types
                                    </option>

                                    {shipmentTypeOptions.map((type) => (
                                        <option
                                            key={type}
                                            value={type}
                                        >
                                            {type}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Empty State */}
                        {reports.length === 0 && (
                            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                    <FileText className="h-8 w-8" />
                                </div>

                                <h2 className="mt-5 text-lg font-semibold text-gray-900">
                                    No reports available
                                </h2>

                                <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
                                    There are currently no reports available
                                    for your account.
                                </p>
                            </div>
                        )}

                        {/* Filtered Empty State */}
                        {reports.length > 0 &&
                            filteredReports.length === 0 && (
                                <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
                                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                                        <Search className="h-6 w-6" />
                                    </div>

                                    <h2 className="mt-4 text-lg font-semibold text-gray-900">
                                        No matching reports
                                    </h2>

                                    <p className="mt-1 text-sm text-gray-500">
                                        Try changing your search or filters.
                                    </p>

                                    <button
                                        type="button"
                                        onClick={clearFilters}
                                        className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700"
                                    >
                                        Clear filters
                                    </button>
                                </div>
                            )}

                        {/* Reports Table */}
                        {filteredReports.length > 0 && (
                            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                                <div className="border-b border-gray-100 px-5 py-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-sm font-semibold text-gray-900">
                                                Report Files
                                            </h2>

                                            <p className="mt-0.5 text-xs text-gray-500">
                                                {filteredReports.length}{' '}
                                                {filteredReports.length === 1
                                                    ? 'report'
                                                    : 'reports'}{' '}
                                                shown
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead>
                                            <tr className="border-b border-gray-100 bg-gray-50/80">
                                                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                    Shipment
                                                </th>

                                                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                    Classification
                                                </th>

                                                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                    File
                                                </th>

                                                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                    Uploaded
                                                </th>

                                                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody className="divide-y divide-gray-100">
                                            {filteredReports.map((report) => (
                                                <tr
                                                    key={report.id}
                                                    className="transition hover:bg-gray-50/70"
                                                >
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                                                                <FileText className="h-5 w-5" />
                                                            </div>

                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-semibold text-gray-900">
                                                                    {report.shipmentRef ||
                                                                        'No shipment reference'}
                                                                </p>

                                                                <p className="mt-0.5 text-xs text-gray-400">
                                                                    Report
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-5 py-4">
                                                        <div className="flex flex-wrap gap-1.5">
                                                            <span
                                                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getBadgeClass(
                                                                    report.category
                                                                )}`}
                                                            >
                                                                {report.category}
                                                            </span>

                                                            <span className="inline-flex rounded-full bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-600/10">
                                                                {report.service}
                                                            </span>

                                                            <span
                                                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getBadgeClass(
                                                                    report.shipmentType
                                                                )}`}
                                                            >
                                                                {report.shipmentType}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    <td className="max-w-xs px-5 py-4">
                                                        <p
                                                            className="truncate text-sm font-medium text-gray-700"
                                                            title={report.fileName}
                                                        >
                                                            {report.fileName}
                                                        </p>
                                                    </td>

                                                    <td className="whitespace-nowrap px-5 py-4">
                                                        <p className="text-sm text-gray-700">
                                                            {formatDate(
                                                                report.uploadedAtUtc
                                                            )}
                                                        </p>
                                                    </td>

                                                    <td className="whitespace-nowrap px-5 py-4">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    previewReport(
                                                                        report
                                                                    )
                                                                }
                                                                disabled={
                                                                    previewLoading
                                                                }
                                                                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                                title="Preview report"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                                View
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    downloadReport(
                                                                        report
                                                                    )
                                                                }
                                                                disabled={
                                                                    downloadingId ===
                                                                    report.id
                                                                }
                                                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                                title="Download report"
                                                            >
                                                                <Download className="h-4 w-4" />

                                                                {downloadingId ===
                                                                    report.id
                                                                    ? 'Downloading...'
                                                                    : 'Download'}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Preview Modal */}
            {(previewUrl || previewLoading || previewError) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                            <div className="min-w-0">
                                <h2 className="truncate text-base font-semibold text-gray-900">
                                    {previewName || 'Report Preview'}
                                </h2>

                                <p className="mt-0.5 text-xs text-gray-500">
                                    Report preview
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closePreview}
                                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                                aria-label="Close preview"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="min-h-0 flex-1 bg-gray-100">
                            {previewLoading && (
                                <div className="flex h-full items-center justify-center">
                                    <div className="text-center">
                                        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />

                                        <p className="mt-4 text-sm text-gray-500">
                                            Opening report...
                                        </p>
                                    </div>
                                </div>
                            )}

                            {!previewLoading && previewError && (
                                <div className="flex h-full items-center justify-center p-6">
                                    <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                                            <FileText className="h-6 w-6" />
                                        </div>

                                        <h3 className="mt-4 text-base font-semibold text-gray-900">
                                            Preview unavailable
                                        </h3>

                                        <p className="mt-2 text-sm leading-6 text-gray-500">
                                            {previewError}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {!previewLoading &&
                                !previewError &&
                                previewUrl && (
                                    <iframe
                                        src={previewUrl}
                                        title={previewName}
                                        className="h-full w-full border-0"
                                    />
                                )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}