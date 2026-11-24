import { DashboardPage, DashboardPageHeader, DashboardButton, DashboardSearchField, DashboardTableSurface } from "../../../components/dashboard/DashboardUI";
import "../../../components/dashboard/dashboard-ui.css";
import "../../../components/dashboard/management-recruitment.css";
import "../../../components/dashboard/management-heading.css";
import { useEffect, useMemo, useState } from 'react';
import {
    Search,
    RefreshCw,
    Eye,
    X,
    UserPlus,
    BriefcaseBusiness,
    FileText,
    Calendar,
    MessageSquare,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

import api from '../../../services/api';
import recruitmentApplicationsService from '../../../services/recruitmentApplicationsService';
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

export default function RecruitmentRequests() {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const [selectedApplication, setSelectedApplication] =
        useState(null);

    const [detailsLoading, setDetailsLoading] =
        useState(false);

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

    const loadApplications = async (isRefresh = false, pageNum = page, searchTerm = debouncedSearch) => {
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
                '/api/website/recruitment-applications',
                { params }
            );

            const result = normalizeResponse(response.data);

            setApplications(result.items);

            setTotalCount(
                Number(result.totalCount) ||
                result.items.length
            );
        } catch (err) {
            console.error(
                'Failed to load recruitment applications:',
                err
            );

            setError(extractApiErrorMessage(err, 'Failed to load recruitment applications.'));
            setApplications([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadApplications(false, page, debouncedSearch);
    }, [page, debouncedSearch]);

    const filteredApplications = useMemo(() => {
        const value = search.trim().toLowerCase();
        if (!value) return applications;

        return applications.filter((application) => {
            const department = formatValue(getValue(application, 'department', 'Department')).toLowerCase();
            const cvFileName = formatValue(getValue(application, 'cvFileName', 'CvFileName')).toLowerCase();
            const message = formatValue(getValue(application, 'message', 'Message')).toLowerCase();
            const applicantName = formatValue(getValue(application, 'fullName', 'FullName') || getValue(application, 'name', 'Name')).toLowerCase();
            const email = formatValue(getValue(application, 'email', 'Email')).toLowerCase();
            const phone = formatValue(getValue(application, 'phone', 'Phone')).toLowerCase();

            return (
                applicantName.includes(value) ||
                email.includes(value) ||
                phone.includes(value) ||
                department.includes(value) ||
                cvFileName.includes(value) ||
                message.includes(value)
            );
        });
    }, [applications, search]);

    const openDetails = async (application) => {
        const id = getValue(
            application,
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
                `/api/website/recruitment-applications/${id}`
            );

            setSelectedApplication(
                response.data?.data ??
                response.data?.Data ??
                response.data
            );
        } catch (err) {
            console.error(
                'Failed to load recruitment application details:',
                err
            );

            setDetailsError(extractApiErrorMessage(err, 'Failed to load recruitment application details.'));
        } finally {
            setDetailsLoading(false);
        }
    };

    const closeDetails = () => {
        setSelectedApplication(null);
        setDetailsError('');
    };

    const handleViewCv = async (application) => {
        const id = getValue(application, 'id', 'Id');

        if (!id) {
            return;
        }

        const pdfWindow = window.open('', '_blank');

        if (!pdfWindow) {
            setError('Please allow pop-ups to view the CV.');
            return;
        }

        try {
            const response =
                await recruitmentApplicationsService.downloadCv(id);

            const blob = new Blob([response.data], {
                type:
                    response.headers['content-type'] ||
                    'application/pdf',
            });

            const url = window.URL.createObjectURL(blob);

            pdfWindow.location.href = url;

            setTimeout(() => {
                window.URL.revokeObjectURL(url);
            }, 60_000);
        } catch (err) {
            console.error('Failed to load recruitment CV:', err);

            pdfWindow.close();

            setError(extractApiErrorMessage(err, 'Failed to load CV.'));
        }
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
        <DashboardPage className="ils-recruitment">
            <DashboardPageHeader title="Recruitments Requests" description="Manage and review recruitment requests submitted through the ILS website." />

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4">
                <div className="ils-recruitment-stat">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-brand-muted">
                                Total Requests
                            </p>

                            <p className="mt-2 text-2xl font-semibold text-brand-text">
                                {totalCount}
                            </p>
                        </div>

                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-surface-muted">
                            <UserPlus className="h-5 w-5 text-brand-text" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Card */}
            <DashboardTableSurface>
                {/* Toolbar */}
                <div className="flex flex-col gap-3 border-b border-brand-border p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="ils-dashboard-toolbar-search">
                        <Search className="ils-recruitment-search-icon" />

                        <input
                            type="text"
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                            placeholder="Search by applicant name, email, phone, department, or CV..." title="Search by applicant name, email, phone, department, or CV"
                            className="ils-recruitment-search-input"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            loadApplications(true)
                        }
                        disabled={refreshing}
                        className="ils-dashboard-button ils-dashboard-button--secondary"
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
                    <div className="flex items-center justify-between border-b border-brand-danger-border bg-brand-danger-soft px-4 py-3 text-sm text-brand-danger">
                        <span>{error}</span>
                        <button
                            type="button"
                            onClick={() => setError('')}
                            className="ml-3 font-bold text-brand-danger hover:text-brand-danger"
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
                                    Department
                                </th>

                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-muted">
                                    CV
                                </th>

                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-muted">
                                    Message
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
                                        colSpan="5"
                                        className="px-5 py-12 text-center"
                                    >
                                        <div className="flex items-center justify-center gap-2 text-sm text-brand-muted">
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                            Loading recruitment requests...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredApplications.length ===
                                0 ? (
                                <tr>
                                    <td
                                        colSpan="5"
                                        className="px-5 py-12 text-center"
                                    >
                                        <div className="flex flex-col items-center">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-surface-muted">
                                                <UserPlus className="h-5 w-5 text-brand-neutral" />
                                            </div>

                                            <p className="mt-3 text-sm font-medium text-brand-text">
                                                No recruitment requests found
                                            </p>

                                            <p className="mt-1 text-sm text-brand-neutral">
                                                Try changing your search
                                                criteria.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredApplications.map(
                                    (application) => {
                                        const id =
                                            getValue(
                                                application,
                                                'id',
                                                'Id'
                                            );

                                        const department =
                                            formatValue(
                                                getValue(
                                                    application,
                                                    'department',
                                                    'Department'
                                                )
                                            );

                                        const cvFileName =
                                            formatValue(
                                                getValue(
                                                    application,
                                                    'cvFileName',
                                                    'CvFileName'
                                                )
                                            );

                                        const message =
                                            formatValue(
                                                getValue(
                                                    application,
                                                    'message',
                                                    'Message'
                                                )
                                            );

                                        const createdAt =
                                            getValue(
                                                application,
                                                'createdAtUtc',
                                                'CreatedAtUtc'
                                            );

                                        return (
                                            <tr
                                                key={id}
                                                className="transition hover:bg-brand-surface-tint"
                                            >
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2 text-sm font-medium text-brand-text">
                                                        <BriefcaseBusiness className="h-4 w-4 text-brand-neutral" />

                                                        {department}
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="flex max-w-[300px] items-center gap-2">
                                                        <FileText className="h-4 w-4 shrink-0 text-brand-neutral" />

                                                        <span
                                                            className="min-w-0 flex-1 truncate text-sm text-brand-text"
                                                            title={
                                                                cvFileName
                                                            }
                                                        >
                                                            {
                                                                cvFileName
                                                            }
                                                        </span>

                                                        {cvFileName !== '—' && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleViewCv(
                                                                        application
                                                                    )
                                                                }
                                                                className="shrink-0 rounded-md border border-brand-border bg-brand-surface px-2.5 py-1.5 text-xs font-medium text-brand-text transition hover:bg-brand-surface-tint"
                                                            >
                                                                View CV
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <p
                                                        className="max-w-[350px] truncate text-sm text-brand-muted"
                                                        title={
                                                            message
                                                        }
                                                    >
                                                        {message}
                                                    </p>
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
                                                                application
                                                            )
                                                        }
                                                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-brand-border bg-brand-surface px-3 text-sm font-medium text-brand-text transition hover:bg-brand-surface-tint"
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
                    filteredApplications.length > 0 && (
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
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-brand-border bg-brand-surface text-brand-muted transition hover:bg-brand-surface-tint disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>

                                <button
                                    type="button"
                                    onClick={goToNextPage}
                                    disabled={
                                        page >= totalPages
                                    }
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-brand-border bg-brand-surface text-brand-muted transition hover:bg-brand-surface-tint disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
            </DashboardTableSurface>

            {/* Details Modal */}
            {(selectedApplication ||
                detailsLoading ||
                detailsError) && (
                    <div
                        className="ils-dashboard-modal-overlay ils-recruitment-modal-overlay"
                        onMouseDown={(event) => {
                            if (
                                event.target ===
                                event.currentTarget
                            ) {
                                closeDetails();
                            }
                        }}
                    >
                        <div className="ils-dashboard-modal-panel ils-recruitment-modal-panel">
                            {/* Modal Header */}
                            <div className="ils-dashboard-modal-header flex items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-semibold text-brand-text">
                                        Recruitment Request Details
                                    </h2>

                                    <p className="mt-1 text-sm text-brand-muted">
                                        Review the submitted recruitment
                                        request.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={closeDetails}
                                    className="flex h-9 w-9 items-center justify-center rounded-lg text-brand-neutral transition hover:bg-brand-surface-muted hover:text-brand-text"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="ils-recruitment-modal-body">
                                {detailsLoading ? (
                                    <div className="flex items-center justify-center py-16">
                                        <div className="flex items-center gap-2 text-sm text-brand-muted">
                                            <RefreshCw className="h-4 w-4 animate-spin" />

                                            Loading request details...
                                        </div>
                                    </div>
                                ) : detailsError ? (
                                    <div className="flex items-center justify-between rounded-xl border border-brand-danger-border bg-brand-danger-soft p-4 text-sm text-brand-danger">
                                        <span>{detailsError}</span>
                                        <button
                                            type="button"
                                            onClick={() => setDetailsError('')}
                                            className="ml-3 font-bold text-brand-danger hover:text-brand-danger"
                                            title="Close"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ) : selectedApplication ? (
                                    <div className="space-y-6">
                                        {/* Application Information */}
                                        <div>
                                            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-muted">
                                                Application Information
                                            </h3>

                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                <div className="rounded-xl border border-brand-border bg-brand-surface-tint p-4">
                                                    <div className="flex items-center gap-2">
                                                        <BriefcaseBusiness className="h-4 w-4 text-brand-neutral" />

                                                        <p className="text-xs text-brand-neutral">
                                                            Department
                                                        </p>
                                                    </div>

                                                    <p className="mt-2 font-medium text-brand-text">
                                                        {formatValue(
                                                            getValue(
                                                                selectedApplication,
                                                                'department',
                                                                'Department'
                                                            )
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="rounded-xl border border-brand-border bg-brand-surface-tint p-4">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="h-4 w-4 text-brand-neutral" />

                                                        <p className="text-xs text-brand-neutral">
                                                            CV File
                                                        </p>
                                                    </div>

                                                    <p className="mt-2 break-all font-medium text-brand-text">
                                                        {formatValue(
                                                            getValue(
                                                                selectedApplication,
                                                                'cvFileName',
                                                                'CvFileName'
                                                            )
                                                        )}
                                                    </p>

                                                    {getValue(
                                                        selectedApplication,
                                                        'cvFileName',
                                                        'CvFileName'
                                                    ) && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleViewCv(
                                                                        selectedApplication
                                                                    )
                                                                }
                                                                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm font-medium text-brand-text transition hover:bg-brand-surface-muted"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                                View CV
                                                            </button>
                                                        )}
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

                                            <div className="rounded-xl border border-brand-border bg-brand-surface-tint p-4">
                                                <p className="whitespace-pre-wrap text-sm leading-6 text-brand-text">
                                                    {formatValue(
                                                        getValue(
                                                            selectedApplication,
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
                                                                selectedApplication,
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