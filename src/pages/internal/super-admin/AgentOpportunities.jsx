import { useEffect, useMemo, useState } from 'react';

import {
    Search,
    RefreshCw,
    MoreHorizontal,
    Eye,
    X,
    MapPin,
    Users,
    BriefcaseBusiness,
    Mail,
    Phone,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

import api from '../../../services/api';

const PAGE_SIZE = 10;

export default function AgentOpportunities() {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [pageNumber, setPageNumber] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const [openActionsId, setOpenActionsId] = useState(null);

    const [selectedApplication, setSelectedApplication] =
        useState(null);

    const [detailsLoading, setDetailsLoading] = useState(false);

    const loadApplications = async (page = pageNumber) => {
        try {
            setLoading(true);
            setError('');
            setOpenActionsId(null);

            const response = await api.get(
                '/api/website/agent-applications',
                {
                    params: {
                        PageNumber: page,
                        PageSize: PAGE_SIZE,
                    },
                }
            );

            const data = response.data;

            setApplications(data?.items ?? []);
            setTotalCount(data?.totalCount ?? 0);
        } catch (err) {
            console.error(
                'Failed to load agent opportunities:',
                err
            );

            setError('Failed to load agent opportunities.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadApplications(pageNumber);
    }, [pageNumber]);

    const filteredApplications = useMemo(() => {
        const search = searchTerm.trim().toLowerCase();

        if (!search) {
            return applications;
        }

        return applications.filter((application) => {
            return [
                application.firstName,
                application.lastName,
                application.email,
                application.country,
                application.city,
                application.mainIndustry,
                application.phone,
                application.message,
            ]
                .filter(Boolean)
                .some((value) =>
                    String(value)
                        .toLowerCase()
                        .includes(search)
                );
        });
    }, [applications, searchTerm]);

    const totalPages = Math.max(
        1,
        Math.ceil(totalCount / PAGE_SIZE)
    );

    const openDetails = async (application) => {
        try {
            setOpenActionsId(null);
            setDetailsLoading(true);
            setSelectedApplication(null);

            const response = await api.get(
                `/api/website/agent-applications/${application.id}`
            );

            setSelectedApplication(response.data);
        } catch (err) {
            console.error(
                'Failed to load agent application:',
                err
            );

            setError('Failed to load application details.');
        } finally {
            setDetailsLoading(false);
        }
    };

    const closeDetails = () => {
        if (detailsLoading) {
            return;
        }

        setSelectedApplication(null);
    };

    const formatDate = (value) => {
        if (!value) {
            return '—';
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const formatPhone = (application) => {
        if (!application.phone) {
            return '—';
        }

        return `${application.countryCode ?? ''} ${application.phone
            }`.trim();
    };

    return (
        <div className="min-h-full">

            {/* Page Header */}
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-slate-900">
                        Agent Opportunities
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                        Manage and review agent opportunity
                        applications.
                    </p>
                </div>
            </div>

            {/* Statistics */}
            <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">

                <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
                            <Users className="h-5 w-5" />
                        </div>

                        <div>
                            <p className="text-xs text-slate-500">
                                Total Applications
                            </p>

                            <p className="mt-1 text-lg font-semibold text-slate-900">
                                {totalCount}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
                            <BriefcaseBusiness className="h-5 w-5" />
                        </div>

                        <div>
                            <p className="text-xs text-slate-500">
                                Current Page
                            </p>

                            <p className="mt-1 text-lg font-semibold text-slate-900">
                                {filteredApplications.length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
                            <MapPin className="h-5 w-5" />
                        </div>

                        <div>
                            <p className="text-xs text-slate-500">
                                Page
                            </p>

                            <p className="mt-1 text-lg font-semibold text-slate-900">
                                {pageNumber} / {totalPages}
                            </p>
                        </div>
                    </div>
                </div>

            </div>

            {/* Main Card */}
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">

                {/* Toolbar */}
                <div className="flex flex-col gap-3 border-b border-slate-200 p-3 md:flex-row md:items-center">

                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) =>
                                setSearchTerm(event.target.value)
                            }
                            placeholder="Search applicants, email, city, industry..."
                            className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-1 focus:ring-slate-200"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() => loadApplications(pageNumber)}
                        disabled={loading}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                        <RefreshCw
                            className={`h-4 w-4 ${loading ? 'animate-spin' : ''
                                }`}
                        />

                        Refresh
                    </button>

                </div>

                {/* Error */}
                {error && (
                    <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                        {error}
                    </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full">

                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/70">

                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    Applicant
                                </th>

                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    Location
                                </th>

                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    Contact
                                </th>

                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    Industry
                                </th>

                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    Submitted
                                </th>

                                <th className="w-14 px-4 py-3"></th>

                            </tr>
                        </thead>

                        <tbody>

                            {loading ? (

                                <tr>
                                    <td
                                        colSpan="6"
                                        className="px-4 py-12 text-center text-sm text-slate-500"
                                    >
                                        Loading agent opportunities...
                                    </td>
                                </tr>

                            ) : filteredApplications.length === 0 ? (

                                <tr>
                                    <td
                                        colSpan="6"
                                        className="px-4 py-12 text-center"
                                    >
                                        <div className="flex flex-col items-center">

                                            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                                                <BriefcaseBusiness className="h-5 w-5" />
                                            </div>

                                            <p className="text-sm font-medium text-slate-700">
                                                No applications found
                                            </p>

                                            <p className="mt-1 text-xs text-slate-400">
                                                No agent opportunity
                                                applications match your
                                                search.
                                            </p>

                                        </div>
                                    </td>
                                </tr>

                            ) : (

                                filteredApplications.map(
                                    (application) => (

                                        <tr
                                            key={application.id}
                                            className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50"
                                        >

                                            {/* Applicant */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">

                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-50 text-slate-500">
                                                        <Users className="h-4 w-4" />
                                                    </div>

                                                    <div>
                                                        <p className="text-sm font-medium text-slate-800">
                                                            {
                                                                application.firstName
                                                            }{' '}
                                                            {
                                                                application.lastName
                                                            }
                                                        </p>

                                                        <p className="mt-0.5 text-xs text-slate-400">
                                                            #{application.id}
                                                        </p>
                                                    </div>

                                                </div>
                                            </td>

                                            {/* Location */}
                                            <td className="px-4 py-3">
                                                <div>

                                                    <p className="text-sm text-slate-600">
                                                        {
                                                            application.city
                                                        }
                                                        ,{' '}
                                                        {
                                                            application.country
                                                        }
                                                    </p>

                                                    <p className="mt-0.5 max-w-xs truncate text-xs text-slate-400">
                                                        {
                                                            application.address
                                                        }
                                                    </p>

                                                </div>
                                            </td>

                                            {/* Contact */}
                                            <td className="px-4 py-3">
                                                <div className="space-y-0.5">

                                                    <p className="text-xs text-slate-600">
                                                        {
                                                            application.email
                                                        }
                                                    </p>

                                                    <p className="text-xs text-slate-400">
                                                        {formatPhone(
                                                            application
                                                        )}
                                                    </p>

                                                </div>
                                            </td>

                                            {/* Industry */}
                                            <td className="px-4 py-3">
                                                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                                                    {
                                                        application.mainIndustry
                                                    }
                                                </span>
                                            </td>

                                            {/* Submitted */}
                                            <td className="px-4 py-3">
                                                <p className="text-xs text-slate-600">
                                                    {formatDate(
                                                        application.createdAtUtc
                                                    )}
                                                </p>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3">
                                                <div className="relative flex justify-end">

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setOpenActionsId(
                                                                openActionsId ===
                                                                    application.id
                                                                    ? null
                                                                    : application.id
                                                            )
                                                        }
                                                        className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                                    >
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </button>

                                                    {openActionsId ===
                                                        application.id && (
                                                            <div className="absolute right-0 top-9 z-20 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        openDetails(
                                                                            application
                                                                        )
                                                                    }
                                                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                    View Details
                                                                </button>

                                                            </div>
                                                        )}

                                                </div>
                                            </td>

                                        </tr>

                                    )
                                )

                            )}

                        </tbody>

                    </table>
                </div>

                {/* Footer */}
                {!loading && (
                    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">

                        <p className="text-xs text-slate-400">
                            Showing{' '}
                            {totalCount === 0
                                ? 0
                                : (pageNumber - 1) *
                                PAGE_SIZE +
                                1}{' '}
                            -{' '}
                            {Math.min(
                                pageNumber * PAGE_SIZE,
                                totalCount
                            )}{' '}
                            of {totalCount} applications
                        </p>

                        <div className="flex items-center gap-1">

                            <button
                                type="button"
                                disabled={
                                    loading || pageNumber <= 1
                                }
                                onClick={() =>
                                    setPageNumber(
                                        (current) =>
                                            Math.max(
                                                1,
                                                current - 1
                                            )
                                    )
                                }
                                className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>

                            <span className="px-2 text-xs text-slate-500">
                                {pageNumber} / {totalPages}
                            </span>

                            <button
                                type="button"
                                disabled={
                                    loading ||
                                    pageNumber >= totalPages
                                }
                                onClick={() =>
                                    setPageNumber(
                                        (current) =>
                                            Math.min(
                                                totalPages,
                                                current + 1
                                            )
                                    )
                                }
                                className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>

                        </div>
                    </div>
                )}

            </div>

            {/* Details Modal */}
            {(selectedApplication || detailsLoading) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">

                    <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl">

                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">

                            <div>
                                <h2 className="text-base font-semibold text-slate-900">
                                    Agent Opportunity
                                </h2>

                                <p className="mt-0.5 text-xs text-slate-400">
                                    Application details
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeDetails}
                                disabled={detailsLoading}
                                className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                            >
                                <X className="h-5 w-5" />
                            </button>

                        </div>

                        {detailsLoading ? (

                            <div className="px-5 py-16 text-center text-sm text-slate-500">
                                Loading application details...
                            </div>

                        ) : selectedApplication ? (

                            <>
                                <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">

                                    <div className="rounded-lg border border-slate-200 p-4">

                                        <div className="mb-3 flex items-center gap-2">
                                            <Users className="h-4 w-4 text-slate-500" />

                                            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Applicant
                                            </h3>
                                        </div>

                                        <p className="text-sm font-medium text-slate-800">
                                            {
                                                selectedApplication.firstName
                                            }{' '}
                                            {
                                                selectedApplication.lastName
                                            }
                                        </p>

                                        <p className="mt-1 text-xs text-slate-400">
                                            Application #
                                            {selectedApplication.id}
                                        </p>

                                    </div>

                                    <div className="rounded-lg border border-slate-200 p-4">

                                        <div className="mb-3 flex items-center gap-2">
                                            <BriefcaseBusiness className="h-4 w-4 text-slate-500" />

                                            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Industry
                                            </h3>
                                        </div>

                                        <p className="text-sm text-slate-700">
                                            {
                                                selectedApplication.mainIndustry
                                            }
                                        </p>

                                    </div>

                                    <div className="rounded-lg border border-slate-200 p-4">

                                        <div className="mb-3 flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-slate-500" />

                                            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Email
                                            </h3>
                                        </div>

                                        <p className="break-all text-sm text-slate-700">
                                            {
                                                selectedApplication.email
                                            }
                                        </p>

                                    </div>

                                    <div className="rounded-lg border border-slate-200 p-4">

                                        <div className="mb-3 flex items-center gap-2">
                                            <Phone className="h-4 w-4 text-slate-500" />

                                            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Phone
                                            </h3>
                                        </div>

                                        <p className="text-sm text-slate-700">
                                            {formatPhone(
                                                selectedApplication
                                            )}
                                        </p>

                                    </div>

                                    <div className="rounded-lg border border-slate-200 p-4 md:col-span-2">

                                        <div className="mb-3 flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-slate-500" />

                                            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Location
                                            </h3>
                                        </div>

                                        <p className="text-sm text-slate-700">
                                            {
                                                selectedApplication.city
                                            }
                                            ,{' '}
                                            {
                                                selectedApplication.country
                                            }
                                        </p>

                                        <p className="mt-1 text-sm text-slate-500">
                                            {
                                                selectedApplication.address
                                            }
                                        </p>

                                    </div>

                                    <div className="rounded-lg border border-slate-200 p-4 md:col-span-2">

                                        <div className="mb-3 flex items-center gap-2">
                                            <CalendarDays className="h-4 w-4 text-slate-500" />

                                            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Submitted
                                            </h3>
                                        </div>

                                        <p className="text-sm text-slate-700">
                                            {formatDate(
                                                selectedApplication.createdAtUtc
                                            )}
                                        </p>

                                    </div>

                                    <div className="rounded-lg border border-slate-200 p-4 md:col-span-2">

                                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Message
                                        </h3>

                                        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                            {
                                                selectedApplication.message
                                            }
                                        </p>

                                    </div>

                                </div>

                                <div className="flex justify-end border-t border-slate-200 bg-slate-50/50 px-5 py-4">

                                    <button
                                        type="button"
                                        onClick={closeDetails}
                                        className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                                    >
                                        Close
                                    </button>

                                </div>
                            </>

                        ) : null}

                    </div>
                </div>
            )}

        </div>
    );
}