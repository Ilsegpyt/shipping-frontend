import { useEffect, useMemo, useState } from 'react';
import {
    Eye,
    Mail,
    Phone,
    RefreshCw,
    Search,
    X,
} from 'lucide-react';

import contactInquiriesService from '../../../services/contactInquiriesService';

export default function ContactInquiries() {
    const [inquiries, setInquiries] = useState([]);
    const [selectedInquiry, setSelectedInquiry] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [detailsLoading, setDetailsLoading] = useState(false);

    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    const loadInquiries = async () => {
        try {
            setLoading(true);

            const data =
                await contactInquiriesService.getAll(
                    page,
                    pageSize
                );

            setInquiries(data?.items ?? []);
            setTotalCount(data?.totalCount ?? 0);
        } catch (error) {
            console.error(
                'Failed to load contact inquiries:',
                error
            );

            setInquiries([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInquiries();
    }, [page]);

    const filteredInquiries = useMemo(() => {
        const value = searchTerm
            .trim()
            .toLowerCase();

        if (!value) {
            return inquiries;
        }

        return inquiries.filter((inquiry) =>
            [
                inquiry.fullName,
                inquiry.company,
                inquiry.email,
                inquiry.phone,
                inquiry.service,
            ]
                .filter(Boolean)
                .some((field) =>
                    String(field)
                        .toLowerCase()
                        .includes(value)
                )
        );
    }, [inquiries, searchTerm]);

    const totalPages = Math.max(
        1,
        Math.ceil(totalCount / pageSize)
    );

    const handleRefresh = async () => {
        await loadInquiries();
    };

    const handleViewDetails = async (inquiry) => {
        try {
            setDetailsLoading(true);

            const data =
                await contactInquiriesService.getById(
                    inquiry.id
                );

            setSelectedInquiry(data);
        } catch (error) {
            console.error(
                'Failed to load contact inquiry:',
                error
            );

            setSelectedInquiry(inquiry);
        } finally {
            setDetailsLoading(false);
        }
    };

    const formatDate = (date) => {
        if (!date) {
            return '—';
        }

        const parsedDate = new Date(date);

        if (Number.isNaN(parsedDate.getTime())) {
            return '—';
        }

        return parsedDate.toLocaleDateString(
            'en-GB',
            {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            }
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold text-slate-900">
                    Contact Us
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                    Review and manage contact inquiries
                    submitted through the website.
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <p className="text-sm font-medium text-slate-500">
                        Total Inquiries
                    </p>

                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                        {totalCount}
                    </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <p className="text-sm font-medium text-slate-500">
                        Current Page
                    </p>

                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                        {filteredInquiries.length}
                    </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <p className="text-sm font-medium text-slate-500">
                        Page
                    </p>

                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                        {page} / {totalPages}
                    </p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="relative w-full md:max-w-md">
                        <Search
                            size={18}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) => {
                                setSearchTerm(
                                    event.target.value
                                );
                            }}
                            placeholder="Search inquiries..."
                            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <RefreshCw
                            size={16}
                            className={
                                loading
                                    ? 'animate-spin'
                                    : ''
                            }
                        />

                        Refresh
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Contact
                                </th>

                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Company
                                </th>

                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Contact Info
                                </th>

                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Service
                                </th>

                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Submitted
                                </th>

                                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan="6"
                                        className="px-6 py-12 text-center text-sm text-slate-500"
                                    >
                                        Loading inquiries...
                                    </td>
                                </tr>
                            ) : filteredInquiries.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan="6"
                                        className="px-6 py-12 text-center text-sm text-slate-500"
                                    >
                                        No contact inquiries
                                        found.
                                    </td>
                                </tr>
                            ) : (
                                filteredInquiries.map(
                                    (inquiry) => (
                                        <tr
                                            key={inquiry.id}
                                            className="transition hover:bg-slate-50"
                                        >
                                            <td className="whitespace-nowrap px-6 py-4">
                                                <div className="font-medium text-slate-900">
                                                    {inquiry.fullName ||
                                                        '—'}
                                                </div>

                                                <div className="mt-1 text-xs text-slate-500">
                                                    #{inquiry.id}
                                                </div>
                                            </td>

                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                                                {inquiry.company ||
                                                    '—'}
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm text-slate-700">
                                                    <Mail
                                                        size={14}
                                                        className="shrink-0 text-slate-400"
                                                    />

                                                    <span>
                                                        {inquiry.email ||
                                                            '—'}
                                                    </span>
                                                </div>

                                                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                                                    <Phone
                                                        size={13}
                                                        className="shrink-0 text-slate-400"
                                                    />

                                                    <span>
                                                        {inquiry.phone ||
                                                            '—'}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">
                                                {inquiry.service ||
                                                    '—'}
                                            </td>

                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                                                {formatDate(
                                                    inquiry.createdAtUtc
                                                )}
                                            </td>

                                            <td className="whitespace-nowrap px-6 py-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleViewDetails(
                                                            inquiry
                                                        )
                                                    }
                                                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                                >
                                                    <Eye
                                                        size={16}
                                                    />

                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                )
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalCount > 0 && (
                    <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
                        <p className="text-sm text-slate-500">
                            Page {page} of {totalPages}
                        </p>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    setPage((current) =>
                                        Math.max(
                                            1,
                                            current - 1
                                        )
                                    )
                                }
                                disabled={
                                    page === 1 ||
                                    loading
                                }
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Previous
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    setPage((current) =>
                                        Math.min(
                                            totalPages,
                                            current + 1
                                        )
                                    )
                                }
                                disabled={
                                    page === totalPages ||
                                    loading
                                }
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Details Modal */}
            {selectedInquiry && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">
                                    Contact Inquiry
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Inquiry #
                                    {selectedInquiry.id}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedInquiry(null)
                                }
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="max-h-[calc(90vh-150px)] overflow-y-auto px-6 py-6">
                            {detailsLoading ? (
                                <div className="py-12 text-center text-sm text-slate-500">
                                    Loading inquiry details...
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                Full Name
                                            </p>

                                            <p className="mt-1 text-sm font-medium text-slate-900">
                                                {selectedInquiry.fullName ||
                                                    '—'}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                Company
                                            </p>

                                            <p className="mt-1 text-sm font-medium text-slate-900">
                                                {selectedInquiry.company ||
                                                    '—'}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                Email
                                            </p>

                                            <p className="mt-1 break-all text-sm font-medium text-slate-900">
                                                {selectedInquiry.email ||
                                                    '—'}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                Phone
                                            </p>

                                            <p className="mt-1 text-sm font-medium text-slate-900">
                                                {selectedInquiry.phone ||
                                                    '—'}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                Service
                                            </p>

                                            <p className="mt-1 text-sm font-medium text-slate-900">
                                                {selectedInquiry.service ||
                                                    '—'}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                Submitted
                                            </p>

                                            <p className="mt-1 text-sm font-medium text-slate-900">
                                                {formatDate(
                                                    selectedInquiry.createdAtUtc
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            Message
                                        </p>

                                        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                                {selectedInquiry.message ||
                                                    'No message provided.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end border-t border-slate-200 px-6 py-4">
                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedInquiry(null)
                                }
                                className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}