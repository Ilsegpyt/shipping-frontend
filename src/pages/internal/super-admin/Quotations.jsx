import { DashboardPage, DashboardPageHeader, DashboardButton, DashboardToolbar, DashboardSearchField, DashboardTableSurface } from "../../../components/dashboard/DashboardUI";
import "../../../components/dashboard/management-quotations.css";
import { useEffect, useMemo, useState } from 'react';
import {
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
import { extractApiErrorMessage } from '../../../utils/errorUtils';

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
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const [selectedQuotation, setSelectedQuotation] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsError, setDetailsError] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch]);

    useEffect(() => {
        if (!error) return;
        const timer = setTimeout(() => setError(''), 5000);
        return () => clearTimeout(timer);
    }, [error]);

    useEffect(() => {
        if (!detailsError) return;
        const timer = setTimeout(() => setDetailsError(''), 5000);
        return () => clearTimeout(timer);
    }, [detailsError]);

    const totalPages = Math.max(
        1,
        Math.ceil(totalCount / PAGE_SIZE)
    );

    const loadQuotations = async (isRefresh = false, pageNum = page, searchTerm = debouncedSearch) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError('');

            const params = {
                PageNumber: pageNum,
                PageSize: PAGE_SIZE,
            };
            if (searchTerm && searchTerm.trim()) {
                params.Search = searchTerm.trim();
            }

            const response = await api.get(
                '/api/website/quote-requests',
                { params }
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

            setError(extractApiErrorMessage(err, 'Failed to load quotations.'));
            setQuotations([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadQuotations(false, page, debouncedSearch);
    }, [page, debouncedSearch]);

    const filteredQuotations = useMemo(() => {
        const value = search.trim().toLowerCase();
        if (!value) return quotations;

        return quotations.filter((quotation) => {
            const fullName = getFullName(quotation).toLowerCase();
            const company = formatValue(getValue(quotation, 'company', 'Company')).toLowerCase();
            const country = formatValue(getValue(quotation, 'country', 'Country')).toLowerCase();
            const email = formatValue(getValue(quotation, 'email', 'Email')).toLowerCase();
            const phone = formatValue(getValue(quotation, 'phone', 'Phone')).toLowerCase();
            const interestType = formatEnum(getValue(quotation, 'interestType', 'InterestType')).toLowerCase();

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

            setDetailsError(extractApiErrorMessage(err, 'Failed to load quotation details.'));
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
        <DashboardPage>
            <DashboardPageHeader title="Quotations" description="Manage and review quotation requests submitted through the ILS website." />

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4">
                <div className="ils-quotations-stat">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-brand-muted">
                                Total Requests
                            </p>

                            <p className="mt-2 text-2xl font-semibold text-brand-text">
                                {totalCount}
                            </p>
                        </div>

                        <div className="flex h-10 w-10 items-center justify-center rounded-none bg-brand-surface-muted">
                            <FileText className="h-5 w-5 text-brand-text" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Card */}
            <DashboardTableSurface>
                {/* Toolbar */}
                <DashboardToolbar actions={
                    <DashboardButton icon={RefreshCw} onClick={() => loadQuotations(true)} disabled={refreshing}>Refresh</DashboardButton>
                }>
                    <DashboardSearchField
                            type="search"
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                            placeholder="Search by name, company, country, email, phone, or service..." title="Search by name, company, country, email, phone, or service"
                        />
                </DashboardToolbar>

                {/* Error */}
                {error && (
                    <div className="flex items-center justify-between border-b border-brand-danger-border bg-brand-danger-soft px-4 py-3 text-sm text-brand-danger">
                        <span>{error}</span>
                        <button
                            type="button"
                            onClick={() => setError('')}
                            className="ml-3 text-brand-danger hover:text-brand-danger font-bold"
                            title="Close"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b border-brand-border bg-brand-surface-tint">
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-muted">
                                    Customer
                                </th>

                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-muted">
                                    Company
                                </th>

                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-muted">
                                    Country
                                </th>

                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-muted">
                                    Contact
                                </th>

                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-muted">
                                    Interest
                                </th>

                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-muted">
                                    Transport Modes
                                </th>

                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-muted">
                                    Submitted
                                </th>

                                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-brand-muted">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-brand-border">
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan="8"
                                        className="px-5 py-12 text-center"
                                    >
                                        <div className="flex items-center justify-center gap-2 text-sm text-brand-muted">
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
                                            <div className="flex h-12 w-12 items-center justify-center rounded-none bg-brand-surface-muted">
                                                <FileText className="h-5 w-5 text-brand-neutral" />
                                            </div>

                                            <p className="mt-3 text-sm font-medium text-brand-text">
                                                No quotation requests found
                                            </p>

                                            <p className="mt-1 text-sm text-brand-neutral">
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
                                                className="transition hover:bg-brand-surface-tint"
                                            >
                                                <td className="px-5 py-4">
                                                    <div className="font-medium text-brand-text">
                                                        {name}
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2 text-sm text-brand-text">
                                                        <Building2 className="h-4 w-4 text-brand-neutral" />
                                                        {company}
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2 text-sm text-brand-text">
                                                        <MapPin className="h-4 w-4 text-brand-neutral" />
                                                        {country}
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 text-xs text-brand-muted">
                                                            <Mail className="h-3.5 w-3.5 text-brand-neutral" />
                                                            <span className="max-w-[180px] truncate">
                                                                {email}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2 text-xs text-brand-muted">
                                                            <Phone className="h-3.5 w-3.5 text-brand-neutral" />
                                                            {phone}
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span className="inline-flex rounded-none bg-brand-surface-muted px-2.5 py-1 text-xs font-medium text-brand-text">
                                                        {interestType}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <span className="inline-flex rounded-none bg-brand-surface-blue px-2.5 py-1 text-xs font-medium text-brand-accent">
                                                        {transportModes}
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2 text-sm text-brand-muted">
                                                        <Calendar className="h-4 w-4 text-brand-neutral" />
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
                                                        className="ils-quotations-view-action"
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
                        <div className="flex items-center justify-between border-t border-brand-border px-5 py-4">
                            <p className="text-sm text-brand-muted">
                                Page{' '}
                                <span className="font-medium text-brand-text">
                                    {page}
                                </span>{' '}
                                of{' '}
                                <span className="font-medium text-brand-text">
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
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-none border border-brand-border bg-brand-surface text-brand-muted transition hover:bg-brand-surface-tint disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>

                                <button
                                    type="button"
                                    onClick={goToNextPage}
                                    disabled={
                                        page >= totalPages
                                    }
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-none border border-brand-border bg-brand-surface text-brand-muted transition hover:bg-brand-surface-tint disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
            </DashboardTableSurface>

            {/* Details Modal */}
            {(selectedQuotation ||
                detailsLoading ||
                detailsError) && (
                    <div
                        className="ils-dashboard-modal-overlay"
                        onMouseDown={(event) => {
                            if (
                                event.target ===
                                event.currentTarget
                            ) {
                                closeDetails();
                            }
                        }}
                    >
                        <div className="ils-dashboard-modal-panel ils-quotations-modal">
                            {/* Modal Header */}
                            <div className="ils-dashboard-modal-header flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-brand-text">
                                        Quotation Details
                                    </h2>

                                    <p className="mt-1 text-sm text-brand-muted">
                                        Review the submitted quotation
                                        request.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={closeDetails}
                                    className="ils-quotations-modal-close"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="ils-quotations-modal-content">
                                {detailsLoading ? (
                                    <div className="flex items-center justify-center py-16">
                                        <div className="flex items-center gap-2 text-sm text-brand-muted">
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                            Loading quotation details...
                                        </div>
                                    </div>
                                ) : detailsError ? (
                                    <div className="flex items-center justify-between rounded-none border border-brand-danger-border bg-brand-danger-soft p-4 text-sm text-brand-danger">
                                        <span>{detailsError}</span>
                                        <button
                                            type="button"
                                            onClick={() => setDetailsError('')}
                                            className="ml-3 text-brand-danger hover:text-brand-danger font-bold"
                                            title="Close"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ) : selectedQuotation ? (
                                    <div className="space-y-6">
                                        {/* Customer */}
                                        <div>
                                            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-muted">
                                                Customer Information
                                            </h3>

                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                <div className="rounded-none border border-brand-border bg-brand-surface-tint p-4">
                                                    <p className="text-xs text-brand-neutral">
                                                        Name
                                                    </p>

                                                    <p className="mt-1 font-medium text-brand-text">
                                                        {getFullName(
                                                            selectedQuotation
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="rounded-none border border-brand-border bg-brand-surface-tint p-4">
                                                    <p className="text-xs text-brand-neutral">
                                                        Company
                                                    </p>

                                                    <p className="mt-1 font-medium text-brand-text">
                                                        {formatValue(
                                                            getValue(
                                                                selectedQuotation,
                                                                'company',
                                                                'Company'
                                                            )
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="rounded-none border border-brand-border bg-brand-surface-tint p-4">
                                                    <p className="text-xs text-brand-neutral">
                                                        Country
                                                    </p>

                                                    <p className="mt-1 font-medium text-brand-text">
                                                        {formatValue(
                                                            getValue(
                                                                selectedQuotation,
                                                                'country',
                                                                'Country'
                                                            )
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="rounded-none border border-brand-border bg-brand-surface-tint p-4">
                                                    <p className="text-xs text-brand-neutral">
                                                        Phone
                                                    </p>

                                                    <p className="mt-1 font-medium text-brand-text">
                                                        {formatValue(
                                                            getValue(
                                                                selectedQuotation,
                                                                'phone',
                                                                'Phone'
                                                            )
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="rounded-none border border-brand-border bg-brand-surface-tint p-4 md:col-span-2">
                                                    <p className="text-xs text-brand-neutral">
                                                        Email
                                                    </p>

                                                    <p className="mt-1 font-medium text-brand-text">
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
                                            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-muted">
                                                Request Information
                                            </h3>

                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                                <div className="rounded-none border border-brand-border p-4">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="h-4 w-4 text-brand-neutral" />

                                                        <p className="text-xs text-brand-neutral">
                                                            Interest Type
                                                        </p>
                                                    </div>

                                                    <p className="mt-2 font-medium text-brand-text">
                                                        {formatEnum(
                                                            getValue(
                                                                selectedQuotation,
                                                                'interestType',
                                                                'InterestType'
                                                            )
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="rounded-none border border-brand-border p-4">
                                                    <div className="flex items-center gap-2">
                                                        <Ship className="h-4 w-4 text-brand-neutral" />

                                                        <p className="text-xs text-brand-neutral">
                                                            Transport Modes
                                                        </p>
                                                    </div>

                                                    <p className="mt-2 font-medium text-brand-text">
                                                        {formatTransportModes(
                                                            getValue(
                                                                selectedQuotation,
                                                                'transportModes',
                                                                'TransportModes'
                                                            )
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="rounded-none border border-brand-border p-4">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="h-4 w-4 text-brand-neutral" />

                                                        <p className="text-xs text-brand-neutral">
                                                            Annual Shipments
                                                        </p>
                                                    </div>

                                                    <p className="mt-2 font-medium text-brand-text">
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
                                                <MessageSquare className="h-4 w-4 text-brand-muted" />

                                                <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-muted">
                                                    Message
                                                </h3>
                                            </div>

                                            <div className="rounded-none border border-brand-border bg-brand-surface-tint p-4">
                                                <p className="whitespace-pre-wrap text-sm leading-6 text-brand-text">
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
                                        <div className="border-t border-brand-border pt-5">
                                            <div className="flex items-center gap-2 text-sm text-brand-muted">
                                                <Calendar className="h-4 w-4" />

                                                <span>
                                                    Submitted:{' '}
                                                    <span className="font-medium text-brand-text">
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
        </DashboardPage>
    );
}