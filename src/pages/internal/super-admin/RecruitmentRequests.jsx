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
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const [selectedApplication, setSelectedApplication] =
        useState(null);

    const [detailsLoading, setDetailsLoading] =
        useState(false);

    const [detailsError, setDetailsError] = useState('');

    const totalPages = Math.max(
        1,
        Math.ceil(totalCount / PAGE_SIZE)
    );

    const loadApplications = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError('');

            const response = await api.get(
                '/api/website/recruitment-applications',
                {
                    params: {
                        PageNumber: page,
                        PageSize: PAGE_SIZE,
                    },
                }
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

            setError(
                err?.response?.data?.error ||
                err?.response?.data?.message ||
                'Failed to load recruitment applications.'
            );

            setApplications([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadApplications();
    }, [page]);

    const filteredApplications = useMemo(() => {
        const value = search.trim().toLowerCase();

        if (!value) {
            return applications;
        }

        return applications.filter((application) => {
            const department = formatValue(
                getValue(
                    application,
                    'department',
                    'Department'
                )
            ).toLowerCase();

            const cvFileName = formatValue(
                getValue(
                    application,
                    'cvFileName',
                    'CvFileName'
                )
            ).toLowerCase();

            const message = formatValue(
                getValue(
                    application,
                    'message',
                    'Message'
                )
            ).toLowerCase();

            return (
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

            setDetailsError(
                err?.response?.data?.error ||
                err?.response?.data?.message ||
                'Failed to load recruitment application details.'
            );
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

            setError(
                err?.response?.data?.error ||
                err?.response?.data?.message ||
                'Failed to load CV.'
            );
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
        <div className="space-y-6">
            {/* Header */}
            <div>
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900">
                        <UserPlus className="h-5 w-5 text-white" />
                    </div>

                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">
                            Recruitments Requests
                        </h1>

                        <p className="mt-1 text-sm text-slate-500">
                            Manage and review recruitment requests
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
                            <UserPlus className="h-5 w-5 text-slate-700" />
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
                            placeholder="Search recruitment requests..."
                            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            loadApplications(true)
                        }
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
                                    Department
                                </th>

                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    CV
                                </th>

                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Message
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
                                        colSpan="5"
                                        className="px-5 py-12 text-center"
                                    >
                                        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
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
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                                                <UserPlus className="h-5 w-5 text-slate-400" />
                                            </div>

                                            <p className="mt-3 text-sm font-medium text-slate-700">
                                                No recruitment requests found
                                            </p>

                                            <p className="mt-1 text-sm text-slate-400">
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
                                                className="transition hover:bg-slate-50"
                                            >
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                                                        <BriefcaseBusiness className="h-4 w-4 text-slate-400" />

                                                        {department}
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <div className="flex max-w-[300px] items-center gap-2">
                                                        <FileText className="h-4 w-4 shrink-0 text-slate-400" />

                                                        <span
                                                            className="min-w-0 flex-1 truncate text-sm text-slate-700"
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
                                                                className="shrink-0 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                                                            >
                                                                View CV
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <p
                                                        className="max-w-[350px] truncate text-sm text-slate-600"
                                                        title={
                                                            message
                                                        }
                                                    >
                                                        {message}
                                                    </p>
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
                                                                application
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
                    filteredApplications.length > 0 && (
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
            {(selectedApplication ||
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
                                        Recruitment Request Details
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Review the submitted recruitment
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

                                            Loading request details...
                                        </div>
                                    </div>
                                ) : detailsError ? (
                                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                        {detailsError}
                                    </div>
                                ) : selectedApplication ? (
                                    <div className="space-y-6">
                                        {/* Application Information */}
                                        <div>
                                            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                                                Application Information
                                            </h3>

                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                                    <div className="flex items-center gap-2">
                                                        <BriefcaseBusiness className="h-4 w-4 text-slate-400" />

                                                        <p className="text-xs text-slate-400">
                                                            Department
                                                        </p>
                                                    </div>

                                                    <p className="mt-2 font-medium text-slate-900">
                                                        {formatValue(
                                                            getValue(
                                                                selectedApplication,
                                                                'department',
                                                                'Department'
                                                            )
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="h-4 w-4 text-slate-400" />

                                                        <p className="text-xs text-slate-400">
                                                            CV File
                                                        </p>
                                                    </div>

                                                    <p className="mt-2 break-all font-medium text-slate-900">
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
                                                                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
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
                                                <MessageSquare className="h-4 w-4 text-slate-500" />

                                                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                                                    Message
                                                </h3>
                                            </div>

                                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
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
                                        <div className="border-t border-slate-200 pt-5">
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <Calendar className="h-4 w-4" />

                                                <span>
                                                    Submitted:{' '}
                                                    <span className="font-medium text-slate-700">
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
        </div>
    );
}