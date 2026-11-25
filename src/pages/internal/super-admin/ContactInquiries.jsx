import { DashboardPage, DashboardPageHeader, DashboardButton, DashboardToolbar, DashboardSearchField, DashboardTableSurface, DashboardActionMenu, DashboardActionItem } from '../../../components/dashboard/DashboardUI';
import '../../../components/dashboard/management-contact.css';
import { useEffect, useMemo, useState } from 'react';
import {
    Ellipsis,
    Mail,
    Phone,
    RefreshCw,
    X,
} from 'lucide-react';

import contactInquiriesService from '../../../services/contactInquiriesService';
import { extractApiErrorMessage } from '../../../utils/errorUtils';

export default function ContactInquiries() {
    const [inquiries, setInquiries] = useState([]);
    const [selectedInquiry, setSelectedInquiry] = useState(null);
    const [openActionId, setOpenActionId] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch]);


    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    const loadInquiries = async () => {
        try {
            setLoading(true);
            setError('');

            const data =
                await contactInquiriesService.getAll(
                    page,
                    pageSize,
                    debouncedSearch
                );

            setInquiries(data?.items ?? []);
            setTotalCount(data?.totalCount ?? 0);
        } catch (error) {
            console.error(
                'Failed to load contact inquiries:',
                error
            );

            setError(extractApiErrorMessage(error, 'Failed to load contact inquiries.'));
            setInquiries([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInquiries();
    }, [page, debouncedSearch]);

    const filteredInquiries = useMemo(() => {
        const value = searchTerm.trim().toLowerCase();
        if (!value) return inquiries;

        return inquiries.filter((inquiry) =>
            [
                inquiry.fullName,
                inquiry.company,
                inquiry.email,
                inquiry.phone,
                inquiry.service,
                inquiry.message,
            ]
                .filter(Boolean)
                .some((field) =>
                    String(field).toLowerCase().includes(value)
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
        <DashboardPage className="ils-contact-page">
            <DashboardPageHeader title="Contact Us" description="Review and manage contact inquiries submitted through the website." />

            {/* Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="ils-contact-stat">
                    <p className="text-sm font-medium text-brand-muted">
                        Total Inquiries
                    </p>

                    <p className="mt-2 text-2xl font-semibold text-brand-text">
                        {totalCount}
                    </p>
                </div>

                <div className="ils-contact-stat">
                    <p className="text-sm font-medium text-brand-muted">
                        Current Page
                    </p>

                    <p className="mt-2 text-2xl font-semibold text-brand-text">
                        {filteredInquiries.length}
                    </p>
                </div>

                <div className="ils-contact-stat">
                    <p className="text-sm font-medium text-brand-muted">
                        Page
                    </p>

                    <p className="mt-2 text-2xl font-semibold text-brand-text">
                        {page} / {totalPages}
                    </p>
                </div>
            </div>

            {/* Toolbar */}
            <DashboardToolbar actions={
                <DashboardButton onClick={handleRefresh} disabled={loading} icon={RefreshCw}>
                    Refresh
                </DashboardButton>
            }>
                <DashboardSearchField
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search inquiries..."
                    title="Search by name, company, email, phone, or service"
                />
            </DashboardToolbar>

            {/* Error Banner */}
            {error && (
                <div className="flex items-center justify-between rounded-xl border border-brand-danger-border bg-brand-danger-soft px-4 py-3 text-sm text-brand-danger">
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
            <DashboardTableSurface>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-brand-border">
                        <thead className="bg-brand-surface-tint">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-muted">
                                    Contact
                                </th>

                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-muted">
                                    Company
                                </th>

                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-muted">
                                    Contact Info
                                </th>

                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-muted">
                                    Service
                                </th>

                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-muted">
                                    Submitted
                                </th>

                                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-brand-muted">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-brand-border">
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan="6"
                                        className="px-6 py-12 text-center text-sm text-brand-muted"
                                    >
                                        Loading inquiries...
                                    </td>
                                </tr>
                            ) : filteredInquiries.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan="6"
                                        className="px-6 py-12 text-center text-sm text-brand-muted"
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
                                            className="transition hover:bg-brand-surface-tint"
                                        >
                                            <td className="whitespace-nowrap px-6 py-4">
                                                <div className="font-medium text-brand-text">
                                                    {inquiry.fullName ||
                                                        '—'}
                                                </div>

                                                <div className="mt-1 text-xs text-brand-muted">
                                                    #{inquiry.id}
                                                </div>
                                            </td>

                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-brand-text">
                                                {inquiry.company ||
                                                    '—'}
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm text-brand-text">
                                                    <Mail
                                                        size={14}
                                                        className="shrink-0 text-brand-neutral"
                                                    />

                                                    <span>
                                                        {inquiry.email ||
                                                            '—'}
                                                    </span>
                                                </div>

                                                <div className="mt-1 flex items-center gap-2 text-xs text-brand-muted">
                                                    <Phone
                                                        size={13}
                                                        className="shrink-0 text-brand-neutral"
                                                    />

                                                    <span>
                                                        {inquiry.phone ||
                                                            '—'}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-brand-text">
                                                {inquiry.service ||
                                                    '—'}
                                            </td>

                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-brand-muted">
                                                {formatDate(
                                                    inquiry.createdAtUtc
                                                )}
                                            </td>

                                            <td className="whitespace-nowrap px-6 py-4 text-right">
                                                <button
                                                    id={`contact-action-${inquiry.id}`}
                                                    type="button"
                                                    aria-label={`Actions for ${inquiry.fullName || 'inquiry'}`}
                                                    aria-expanded={openActionId === inquiry.id}
                                                    onClick={() => setOpenActionId((current) => current === inquiry.id ? null : inquiry.id)}
                                                    className="ils-dashboard-action-trigger"
                                                >
                                                    <Ellipsis size={20} />
                                                </button>
                                                {openActionId === inquiry.id && (
                                                    <>
                                                        <button type="button" className="ils-contact-menu-backdrop" aria-label="Close actions" onClick={() => setOpenActionId(null)} />
                                                        <DashboardActionMenu anchorId={`contact-action-${inquiry.id}`}>
                                                            <DashboardActionItem action="view" onClick={() => { setOpenActionId(null); handleViewDetails(inquiry); }} />
                                                        </DashboardActionMenu>
                                                    </>
                                                )}
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
                    <div className="flex items-center justify-between border-t border-brand-border px-6 py-4">
                        <p className="text-sm text-brand-muted">
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
                                className="rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm font-medium text-brand-text transition hover:bg-brand-surface-tint disabled:cursor-not-allowed disabled:opacity-50"
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
                                className="rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm font-medium text-brand-text transition hover:bg-brand-surface-tint disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </DashboardTableSurface>

            {/* Details Modal */}
            {selectedInquiry && (
                <div className="ils-dashboard-modal-overlay">
                    <div className="ils-dashboard-modal-panel ils-contact-modal" role="dialog" aria-modal="true" aria-label="Contact Inquiry">
                        {/* Modal Header */}
                        <div className="ils-dashboard-modal-header flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-brand-text">
                                    Contact Inquiry
                                </h2>

                                <p className="mt-1 text-sm text-brand-muted">
                                    Inquiry #
                                    {selectedInquiry.id}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedInquiry(null)
                                }
                                className="rounded-lg p-2 text-brand-neutral transition hover:bg-brand-surface-muted hover:text-brand-text"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="ils-dashboard-modal-body ils-contact-modal-body">
                            {detailsLoading ? (
                                <div className="py-12 text-center text-sm text-brand-muted">
                                    Loading inquiry details...
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-brand-neutral">
                                                Full Name
                                            </p>

                                            <p className="mt-1 text-sm font-medium text-brand-text">
                                                {selectedInquiry.fullName ||
                                                    '—'}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-brand-neutral">
                                                Company
                                            </p>

                                            <p className="mt-1 text-sm font-medium text-brand-text">
                                                {selectedInquiry.company ||
                                                    '—'}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-brand-neutral">
                                                Email
                                            </p>

                                            <p className="mt-1 break-all text-sm font-medium text-brand-text">
                                                {selectedInquiry.email ||
                                                    '—'}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-brand-neutral">
                                                Phone
                                            </p>

                                            <p className="mt-1 text-sm font-medium text-brand-text">
                                                {selectedInquiry.phone ||
                                                    '—'}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-brand-neutral">
                                                Service
                                            </p>

                                            <p className="mt-1 text-sm font-medium text-brand-text">
                                                {selectedInquiry.service ||
                                                    '—'}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-brand-neutral">
                                                Submitted
                                            </p>

                                            <p className="mt-1 text-sm font-medium text-brand-text">
                                                {formatDate(
                                                    selectedInquiry.createdAtUtc
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-brand-neutral">
                                            Message
                                        </p>

                                        <div className="ils-contact-message">
                                            <p className="whitespace-pre-wrap text-sm leading-6 text-brand-text">
                                                {selectedInquiry.message ||
                                                    'No message provided.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="ils-dashboard-modal-footer">
                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedInquiry(null)
                                }
                                className="ils-dashboard-button ils-dashboard-button--primary"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardPage>
    );
}