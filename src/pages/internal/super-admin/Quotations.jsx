import { useEffect, useMemo, useState } from 'react';
import {
    Search,
    RefreshCw,
    Eye,
    X,
    FileText,
    Building2,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Ship,
    MessageSquare,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

import api from '../../../services/api';

const PAGE_SIZE = 10;

function getValue(item, ...keys) {
    for (const key of keys) {
        if (
            item?.[key] !== undefined &&
            item?.[key] !== null
        ) {
            return item[key];
        }
    }

    return null;
}

function formatValue(value, fallback = '—') {
    if (
        value === undefined ||
        value === null ||
        value === ''
    ) {
        return fallback;
    }

    return String(value);
}

function formatDate(value) {
    if (!value) {
        return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function formatDateTime(value) {
    if (!value) {
        return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatEnum(value) {
    if (
        value === undefined ||
        value === null ||
        value === ''
    ) {
        return '—';
    }

    if (typeof value === 'object') {
        return Object.values(value)
            .map((item) => formatEnum(item))
            .join(', ');
    }

    if (typeof value === 'string') {
        return value
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/[_-]/g, ' ')
            .trim();
    }

    return String(value);
}

function formatTransportModes(value) {
    if (
        value === undefined ||
        value === null ||
        value === ''
    ) {
        return '—';
    }

    if (Array.isArray(value)) {
        return value
            .map((item) => formatEnum(item))
            .join(', ');
    }

    if (typeof value === 'string') {
        return value
            .split(',')
            .map((item) => formatEnum(item.trim()))
            .filter(Boolean)
            .join(', ');
    }

    return formatEnum(value);
}

function getFullName(item) {
    const firstName = formatValue(
        getValue(item, 'firstName', 'FirstName'),
        ''
    );

    const lastName = formatValue(
        getValue(item, 'lastName', 'LastName'),
        ''
    );

    return `${firstName} ${lastName}`.trim() || '—';
}

function normalizeResponse(data) {
    if (Array.isArray(data)) {
        return {
            items: data,
            totalCount: data.length,
        };
    }

    return {
        items:
            data?.items ??
            data?.Items ??
            data?.data ??
            data?.Data ??
            [],
        totalCount:
            data?.totalCount ??
            data?.TotalCount ??
            data?.total ??
            data?.Total ??
            0,
    };
}

export default function Quotations() {
    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const [selectedQuotation, setSelectedQuotation] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsError, setDetailsError] = useState('');

    const totalPages = Math.max(
        1,
        Math.ceil(totalCount / PAGE_SIZE)
    );

    const loadQuotations = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError('');

            const response = await api.get(
                '/api/website/quote-requests',
                {
                    params: {
                        PageNumber: page,
                        PageSize: PAGE_SIZE,
                    },
                }
            );

            const result = normalizeResponse(response.data);

            setQuotations(result.items);
            setTotalCount(
                Number(result.totalCount) || result.items.length
            );
        } catch (err) {
            console.error(
                'Failed to load quotations:',
                err
            );

            setError(
                err?.response?.data?.error ||
                err?.response?.data?.message ||
                'Failed to load quotations.'
            );

            setQuotations([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadQuotations();
    }, [page]);

    const filteredQuotations = useMemo(() => {
        const value = search.trim().toLowerCase();

        if (!value) {
            return quotations;
        }

        return quotations.filter((quotation) => {
            const fullName =
                getFullName(quotation).toLowerCase();

            const company = formatValue(
                getValue(
                    quotation,
                    'company',
                    'Company'
                )
            ).toLowerCase();

            const country = formatValue(
                getValue(
                    quotation,
                    'country',
                    'Country'
                )
            ).toLowerCase();

            const email = formatValue(
                getValue(
                    quotation,
                    'email',
                    'Email'
                )
            ).toLowerCase();

            const phone = formatValue(
                getValue(
                    quotation,
                    'phone',
                    'Phone'
                )
            ).toLowerCase();

            const interestType = formatEnum(
                getValue(
                    quotation,
                    'interestType',
                    'InterestType'
                )
            ).toLowerCase();

            return (
                fullName.includes(value) ||
                company.includes(value) ||
                country.includes(value) ||
                email.includes(value) ||
                phone.includes(value) ||
                interestType.includes(value)
            );
        });
    }, [quotations, search]);

    const openDetails = async (quotation) => {
        const id = getValue(
            quotation,
            'id',
            'Id'
        );

        if (!id) {
            return;
        }

        try {
            setDetailsLoading(true);
            setDetailsError('');

            const response = await api.get(
                `/api/website/quote-requests/${id}`
            );

            setSelectedQuotation(
                response.data?.data ??
                response.data?.Data ??
                response.data
            );
        } catch (err) {
            console.error(
                'Failed to load quotation details:',
                err
            );

            setDetailsError(
                err?.response?.data?.error ||
                err?.response?.data?.message ||
                'Failed to load quotation details.'
            );
        } finally {
            setDetailsLoading(false);
        }
    };

    const closeDetails = () => {
        setSelectedQuotation(null);
        setDetailsError('');
    };

    const goToPreviousPage = () => {
        setPage((current) =>
            Math.max(1, current - 1)
        );
    };

    const goToNextPage = () => {
        setPage((current) =>
            Math.min(totalPages, current + 1)
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900">
                        <FileText className="h-5 w-5 text-white" />
                    </div>

                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">
                            Quotations
                        </h1>

                        <p className="mt-1 text-sm text-slate-500">
                            Manage and review quotation requests
                            submitted through the ILS website.
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">
                                Total Requests
                            </p>

                            <p className="mt-2 text-2xl font-semibold text-slate-900">
                                {totalCount}
                            </p>
                        </div>

                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                            <FileText className="h-5 w-5 text-slate-700" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Card */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                {/* Toolbar */}
                <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative w-full sm:max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                            type="text"
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                            placeholder="Search quotations..."
                            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() => loadQuotations(true)}
                        disabled={refreshing}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <RefreshCw
                            className={`h-4 w-4 ${refreshing
                                ? 'animate-spin'
                                : ''
                                }`}
                        />

                        Refresh
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Customer
                                </th>

                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Company
                                </th>

                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Country
                                </th>

                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Contact
                                </th>

                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Interest
                                </th>

                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Transport Modes
                                </th>

                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Submitted
                                </th>

                                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan="8"
                                        className="px-5 py-12 text-center"
                                    >
                                        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                            Loading quotations...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredQuotations.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan="8"
                                        className="px-5 py-12 text-center"
                                    >
                                        <div className="flex flex-col items-center">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                                                <FileText className="h-5 w-5 text-slate-400" />
                                            </div>

                                            <p className="mt-3 text-sm font-medium text-slate-700">
                                                No quotation requests found
                                            </p>

                                            <p className="mt-1 text-sm text-slate-400">
                                                Try changing your search
                                                criteria.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredQuotations.map(
                                    (quotation) => {
                                        const id =
                                            getValue(
                                                quotation,
                                                'id',
                                                'Id'
                                            );

                                        const name =
                                            getFullName(
                                                quotation
                                            );

                                        const company =
                                            formatValue(
                                                getValue(
                                                    quotation,
                                                    'company',
                                                    'Company'
                                                )
                                            );

                                        const country =
                                            formatValue(
                                                getValue(
                                                    quotation,
                                                    'country',
                                                    'Country'
                                                )
                                            );

                                        const email =
                                            formatValue(
                                                getValue(
                                                    quotation,
                                                    'email',
                                                    'Email'
                                                )
                                            );

                                        const phone =
                                            formatValue(
                                                getValue(
                                                    quotation,
                                                    'phone',
                                                    'Phone'
                                                )
                                            );

                                        const interestType =
                                            formatEnum(
                                                getValue(
                                                    quotation,
                                                    'interestType',
                                                    'InterestType'
                                                )
                                            );

                                        const transportModes =
                                            formatTransportModes(
                                                getValue(
                                                    quotation,
                                                    'transportModes',
                                                    'TransportModes'
                                                )
                                            );

                                        const createdAt =
                                            getValue(
                                                quotation,
                                                'createdAtUtc',
                                                'CreatedAtUtc'
                                            );

                                        return (
                                            <tr
                                                key={id}
                                                className="transition hover:bg-slate-50"
                                            >
                                                <td className="px-5 py-4">
                                                    <div className="font-medium text-slate-900">
                                                        {name}
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2 text-sm text-slate-700">
                                                        <Building2 className="h-4 w-4 text-slate-400" />
                                                        {company}
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2 text-sm text-slate-700">
                                                        <MapPin className="h-4 w-4 text-slate-400" />
                                                        {country}
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 text-xs text-slate-600">
                                                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                                                            <span className="max-w-[180px] truncate">
                                                                {email}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                                                            {phone}
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                                        {interestType}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                                                        {transportModes}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                                        <Calendar className="h-4 w-4 text-slate-400" />
                                                        {formatDate(
                                                            createdAt
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            openDetails(
                                                                quotation
                                                            )
                                                        }
                                                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                        View
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    }
                                )
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading &&
                    filteredQuotations.length > 0 && (
                        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
                            <p className="text-sm text-slate-500">
                                Page{' '}
                                <span className="font-medium text-slate-700">
                                    {page}
                                </span>{' '}
                                of{' '}
                                <span className="font-medium text-slate-700">
                                    {totalPages}
                                </span>
                            </p>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={
                                        goToPreviousPage
                                    }
                                    disabled={page <= 1}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>

                                <button
                                    type="button"
                                    onClick={goToNextPage}
                                    disabled={
                                        page >= totalPages
                                    }
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
            </div>

            {/* Details Modal */}
            {(selectedQuotation ||
                detailsLoading ||
                detailsError) && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
                        onMouseDown={(event) => {
                            if (
                                event.target ===
                                event.currentTarget
                            ) {
                                closeDetails();
                            }
                        }}
                    >
                        <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">
                                        Quotation Details
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Review the submitted quotation
                                        request.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={closeDetails}
                                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="max-h-[calc(90vh-80px)] overflow-y-auto p-6">
                                {detailsLoading ? (
                                    <div className="flex items-center justify-center py-16">
                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                            Loading quotation details...
                                        </div>
                                    </div>
                                ) : detailsError ? (
                                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                        {detailsError}
                                    </div>
                                ) : selectedQuotation ? (
                                    <div className="space-y-6">
                                        {/* Customer */}
                                        <div>
                                            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                                                Customer Information
                                            </h3>

                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                                    <p className="text-xs text-slate-400">
                                                        Name
                                                    </p>

                                                    <p className="mt-1 font-medium text-slate-900">
                                                        {getFullName(
                                                            selectedQuotation
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                                    <p className="text-xs text-slate-400">
                                                        Company
                                                    </p>

                                                    <p className="mt-1 font-medium text-slate-900">
                                                        {formatValue(
                                                            getValue(
                                                                selectedQuotation,
                                                                'company',
                                                                'Company'
                                                            )
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                                    <p className="text-xs text-slate-400">
                                                        Country
                                                    </p>

                                                    <p className="mt-1 font-medium text-slate-900">
                                                        {formatValue(
                                                            getValue(
                                                                selectedQuotation,
                                                                'country',
                                                                'Country'
                                                            )
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                                    <p className="text-xs text-slate-400">
                                                        Phone
                                                    </p>

                                                    <p className="mt-1 font-medium text-slate-900">
                                                        {formatValue(
                                                            getValue(
                                                                selectedQuotation,
                                                                'phone',
                                                                'Phone'
                                                            )
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                                                    <p className="text-xs text-slate-400">
                                                        Email
                                                    </p>

                                                    <p className="mt-1 font-medium text-slate-900">
                                                        {formatValue(
                                                            getValue(
                                                                selectedQuotation,
                                                                'email',
                                                                'Email'
                                                            )
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Request */}
                                        <div>
                                            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                                                Request Information
                                            </h3>

                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                                <div className="rounded-xl border border-slate-200 p-4">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="h-4 w-4 text-slate-400" />

                                                        <p className="text-xs text-slate-400">
                                                            Interest Type
                                                        </p>
                                                    </div>

                                                    <p className="mt-2 font-medium text-slate-900">
                                                        {formatEnum(
                                                            getValue(
                                                                selectedQuotation,
                                                                'interestType',
                                                                'InterestType'
                                                            )
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="rounded-xl border border-slate-200 p-4">
                                                    <div className="flex items-center gap-2">
                                                        <Ship className="h-4 w-4 text-slate-400" />

                                                        <p className="text-xs text-slate-400">
                                                            Transport Modes
                                                        </p>
                                                    </div>

                                                    <p className="mt-2 font-medium text-slate-900">
                                                        {formatTransportModes(
                                                            getValue(
                                                                selectedQuotation,
                                                                'transportModes',
                                                                'TransportModes'
                                                            )
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="rounded-xl border border-slate-200 p-4">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="h-4 w-4 text-slate-400" />

                                                        <p className="text-xs text-slate-400">
                                                            Annual Shipments
                                                        </p>
                                                    </div>

                                                    <p className="mt-2 font-medium text-slate-900">
                                                        {formatEnum(
                                                            getValue(
                                                                selectedQuotation,
                                                                'annualShipments',
                                                                'AnnualShipments'
                                                            )
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Message */}
                                        <div>
                                            <div className="mb-3 flex items-center gap-2">
                                                <MessageSquare className="h-4 w-4 text-slate-500" />

                                                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                                                    Message
                                                </h3>
                                            </div>

                                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                                    {formatValue(
                                                        getValue(
                                                            selectedQuotation,
                                                            'message',
                                                            'Message'
                                                        )
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Meta */}
                                        <div className="border-t border-slate-200 pt-5">
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <Calendar className="h-4 w-4" />

                                                <span>
                                                    Submitted:{' '}
                                                    <span className="font-medium text-slate-700">
                                                        {formatDateTime(
                                                            getValue(
                                                                selectedQuotation,
                                                                'createdAtUtc',
                                                                'CreatedAtUtc'
                                                            )
                                                        )}
                                                    </span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                )}
        </div>
    );
}