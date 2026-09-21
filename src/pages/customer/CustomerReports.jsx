import { useEffect, useMemo, useState } from 'react';
import {
    getReports,
    downloadReport,
} from '../../services/reportsService';

const scopeCategories = [
    { value: 'Sea', label: 'Sea' },
    { value: 'Air', label: 'Air' },
    { value: 'Domestic', label: 'Domestic' },
    { value: 'Financial', label: 'Financial' },
];

const domesticServices = [
    { value: 'Customs Clearance', label: 'Customs Clearance' },
    { value: 'Transportation', label: 'Transportation' },
    { value: 'Both', label: 'Both' },
];

const shipmentTypes = [
    { value: 'All Shipments', label: 'All Shipments' },
    { value: 'Import', label: 'Import' },
    { value: 'Export', label: 'Export' },
];

export default function CustomerReports() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [searchTerm, setSearchTerm] = useState('');

    const [scopeForm, setScopeForm] = useState({
        category: '',
        service: '',
        type: '',
    });

    const loadReports = async () => {
        try {
            setLoading(true);
            setError('');

            const data = await getReports();

            setReports(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load reports:', err);

            setError(
                err?.response?.data?.message ??
                err?.response?.data?.detail ??
                err?.message ??
                'Unable to load reports.'
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReports();
    }, []);

    const handleCategoryChange = (event) => {
        const category = event.target.value;

        setScopeForm({
            category,
            service:
                category === 'Sea' || category === 'Air'
                    ? 'Freight'
                    : category === 'Financial'
                        ? 'None'
                        : '',
            type:
                category === 'Financial'
                    ? 'None'
                    : '',
        });
    };

    const handleServiceChange = (event) => {
        setScopeForm((previous) => ({
            ...previous,
            service: event.target.value,
        }));
    };

    const handleTypeChange = (event) => {
        setScopeForm((previous) => ({
            ...previous,
            type: event.target.value,
        }));
    };

    const clearFilters = () => {
        setSearchTerm('');

        setScopeForm({
            category: '',
            service: '',
            type: '',
        });
    };

    const filteredReports = useMemo(() => {
        const normalizedSearchTerm = searchTerm
            .trim()
            .toLowerCase();

        return reports.filter((report) => {
            const matchesSearch =
                !normalizedSearchTerm ||
                (report.fileName || '')
                    .toLowerCase()
                    .includes(normalizedSearchTerm);

            const matchesCategory =
                !scopeForm.category ||
                report.category === scopeForm.category;

            const matchesService =
                !scopeForm.service ||
                (scopeForm.service === 'Both'
                    ? report.service === 'CustomsClearance' ||
                    report.service === 'Customs Clearance' ||
                    report.service === 'Transportation' ||
                    report.service === 'Both'
                    : report.service === scopeForm.service);

            const matchesType =
                !scopeForm.type ||
                (scopeForm.type === 'All Shipments'
                    ? report.shipmentType === 'Import' ||
                    report.shipmentType === 'Export' ||
                    report.shipmentType === 'All'
                    : report.shipmentType === scopeForm.type);

            return (
                matchesSearch &&
                matchesCategory &&
                matchesService &&
                matchesType
            );
        });
    }, [
        reports,
        searchTerm,
        scopeForm.category,
        scopeForm.service,
        scopeForm.type,
    ]);

    const handleDownload = async (report) => {
        try {
            const response = await downloadReport(report.id);

            const blob = new Blob(
                [response.data],
                {
                    type:
                        response.headers['content-type'] ??
                        'application/octet-stream',
                }
            );

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

            alert('Unable to download the report.');
        }
    };

    const serviceOptions =
        scopeForm.category === 'Sea' ||
            scopeForm.category === 'Air'
            ? [{ value: 'Freight', label: 'Freight' }]
            : scopeForm.category === 'Domestic'
                ? domesticServices
                : [];

    const typeOptions =
        scopeForm.category === 'Financial'
            ? [{ value: 'None', label: 'None' }]
            : shipmentTypes;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                    Reports
                </h1>

                <p className="mt-2 text-gray-500">
                    View and download your reports.
                </p>
            </div>

            {loading && (
                <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-500">
                    Loading reports...
                </div>
            )}

            {!loading && error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
                    {error}
                </div>
            )}

            {!loading && !error && (
                <>
                    <div className="rounded-xl border border-gray-200 bg-white p-6">
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Filter Reports
                                </h2>

                                <p className="mt-1 text-sm text-gray-500">
                                    Search and filter your reports.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={clearFilters}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                            >
                                Clear Filters
                            </button>
                        </div>

                        <div className="mb-4">
                            <label
                                htmlFor="report-search"
                                className="mb-2 block text-xs font-medium text-gray-600"
                            >
                                Search by File Name
                            </label>

                            <input
                                id="report-search"
                                type="text"
                                value={searchTerm}
                                onChange={(event) =>
                                    setSearchTerm(event.target.value)
                                }
                                placeholder="Search by file name..."
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div>
                                <label
                                    htmlFor="scope-category"
                                    className="mb-2 block text-xs font-medium text-gray-600"
                                >
                                    Category
                                </label>

                                <select
                                    id="scope-category"
                                    value={scopeForm.category}
                                    onChange={handleCategoryChange}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200"
                                >
                                    <option value="">
                                        Select category
                                    </option>

                                    {scopeCategories.map((category) => (
                                        <option
                                            key={category.value}
                                            value={category.value}
                                        >
                                            {category.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label
                                    htmlFor="scope-service"
                                    className="mb-2 block text-xs font-medium text-gray-600"
                                >
                                    Service
                                </label>

                                <select
                                    id="scope-service"
                                    value={scopeForm.service}
                                    onChange={handleServiceChange}
                                    disabled={!scopeForm.category}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200 disabled:bg-gray-100"
                                >
                                    <option value="">
                                        Select service
                                    </option>

                                    {serviceOptions.map((service) => (
                                        <option
                                            key={service.value}
                                            value={service.value}
                                        >
                                            {service.label}
                                        </option>
                                    ))}

                                    {scopeForm.category === 'Financial' && (
                                        <option value="None">
                                            None
                                        </option>
                                    )}
                                </select>
                            </div>

                            <div>
                                <label
                                    htmlFor="scope-type"
                                    className="mb-2 block text-xs font-medium text-gray-600"
                                >
                                    Shipment Type
                                </label>

                                <select
                                    id="scope-type"
                                    value={scopeForm.type}
                                    onChange={handleTypeChange}
                                    disabled={!scopeForm.category}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-200 disabled:bg-gray-100"
                                >
                                    <option value="">
                                        Select shipment type
                                    </option>

                                    {typeOptions.map((type) => (
                                        <option
                                            key={type.value}
                                            value={type.value}
                                        >
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {reports.length === 0 ? (
                        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
                            No reports found.
                        </div>
                    ) : filteredReports.length === 0 ? (
                        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
                            No reports match the selected filters.
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                                Shipment Reference
                                            </th>

                                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                                Category
                                            </th>

                                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                                Service
                                            </th>

                                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                                Shipment Type
                                            </th>

                                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                                File Name
                                            </th>

                                            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                                Uploaded At
                                            </th>

                                            <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {filteredReports.map((report) => (
                                            <tr
                                                key={report.id}
                                                className="hover:bg-gray-50"
                                            >
                                                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                                                    {report.shipmentRef || '-'}
                                                </td>

                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                                                    {report.category || '-'}
                                                </td>

                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                                                    {report.service || '-'}
                                                </td>

                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                                                    {report.shipmentType || '-'}
                                                </td>

                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                                                    {report.fileName || '-'}
                                                </td>

                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                                                    {report.uploadedAtUtc
                                                        ? new Date(
                                                            report.uploadedAtUtc
                                                        ).toLocaleDateString()
                                                        : '-'}
                                                </td>

                                                <td className="whitespace-nowrap px-6 py-4 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleDownload(report)
                                                        }
                                                        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700"
                                                    >
                                                        Download
                                                    </button>
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
    );
}