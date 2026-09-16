import { useEffect, useState } from 'react';
import {
    RefreshCw,
    Trash2,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

import api from '../../../services/api';

export default function ClientsSearchHistory() {
    const [history, setHistory] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [pagination, setPagination] = useState({
        pageNumber: 1,
        pageSize: 20,
        totalCount: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
    });

    const fetchSearchHistory = async () => {
        try {
            setLoading(true);

            const response = await api.get(
                '/api/customers/search-history',
                {
                    params: {
                        pageNumber: pagination.pageNumber,
                        pageSize: pagination.pageSize,
                    },
                }
            );

            const data = response.data;

            setHistory(data.items ?? []);

            setPagination((previous) => ({
                ...previous,
                pageNumber: data.pageNumber,
                pageSize: data.pageSize,
                totalCount: data.totalCount,
                totalPages: data.totalPages,
                hasNextPage: data.hasNextPage,
                hasPreviousPage: data.hasPreviousPage,
            }));

            setSelectedIds([]);
        } catch (error) {
            console.error('Failed to load search history:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSearchHistory();
    }, [pagination.pageNumber]);

    const handleSelectAll = (event) => {
        if (event.target.checked) {
            setSelectedIds(history.map((item) => item.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (id) => {
        setSelectedIds((previous) =>
            previous.includes(id)
                ? previous.filter((itemId) => itemId !== id)
                : [...previous, id]
        );
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) {
            return;
        }

        try {
            setIsDeleting(true);

            await api.delete('/api/customers/search-history', {
                data: {
                    searchHistoryIds: selectedIds,
                },
            });

            setSelectedIds([]);
            setIsDeleteModalOpen(false);

            await fetchSearchHistory();
        } catch (error) {
            console.error('Failed to delete search history:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const formatDate = (dateValue) => {
        if (!dateValue) {
            return '-';
        }

        return new Date(dateValue).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const formatDateTime = (dateValue) => {
        if (!dateValue) {
            return '-';
        }

        return new Date(dateValue).toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const allSelected =
        history.length > 0 && selectedIds.length === history.length;

    return (
        <>
            <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">
                            Clients Search History
                        </h1>

                        <p className="mt-1 text-sm text-slate-500">
                            Review previous schedule searches made by clients.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={fetchSearchHistory}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <RefreshCw
                            size={16}
                            className={loading ? 'animate-spin' : ''}
                        />

                        Refresh
                    </button>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-medium text-slate-500">
                        Total Searches
                    </p>

                    <p className="mt-2 text-3xl font-semibold text-slate-900">
                        {pagination.totalCount.toLocaleString()}
                    </p>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
                        <div>
                            <h2 className="text-base font-semibold text-slate-900">
                                Search History
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Previous schedule search records
                            </p>
                        </div>

                        {selectedIds.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setIsDeleteModalOpen(true)}
                                disabled={loading}
                                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Trash2 size={16} />

                                Delete Selected
                            </button>
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-slate-50">
                                <tr className="border-b border-slate-200">
                                    <th className="w-12 px-5 py-3 text-left">
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            onChange={handleSelectAll}
                                            className="h-4 w-4 rounded border-slate-300"
                                        />
                                    </th>

                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Route
                                    </th>

                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Container Size
                                    </th>

                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Departure Date
                                    </th>

                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Routes Found
                                    </th>

                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Searched On
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {loading && history.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-5 py-12 text-center text-sm text-slate-500"
                                        >
                                            Loading search history...
                                        </td>
                                    </tr>
                                ) : history.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-5 py-12 text-center text-sm text-slate-500"
                                        >
                                            No search history found.
                                        </td>
                                    </tr>
                                ) : (
                                    history.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="transition hover:bg-slate-50"
                                        >
                                            <td className="px-5 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(
                                                        item.id
                                                    )}
                                                    onChange={() =>
                                                        handleSelectRow(item.id)
                                                    }
                                                    className="h-4 w-4 rounded border-slate-300"
                                                />
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                                                    <span>{item.origin}</span>

                                                    <span className="text-slate-400">
                                                        →
                                                    </span>

                                                    <span>
                                                        {item.destination}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="px-5 py-4 text-sm text-slate-600">
                                                {item.containerSize}
                                            </td>

                                            <td className="px-5 py-4 text-sm text-slate-600">
                                                {formatDate(item.departureDate)}
                                            </td>

                                            <td className="px-5 py-4">
                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${item.routesFound > 0
                                                        ? 'bg-emerald-50 text-emerald-700'
                                                        : 'bg-slate-100 text-slate-600'
                                                        }`}
                                                >
                                                    {item.routesFound > 0
                                                        ? `${item.routesFound} Routes Found`
                                                        : 'No Routes Found'}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4 text-sm text-slate-600">
                                                {formatDateTime(
                                                    item.searchedOnUtc
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-between gap-4 border-t border-slate-200 px-5 py-4">
                        <p className="text-sm text-slate-500">
                            Showing{' '}
                            {history.length === 0
                                ? 0
                                : (pagination.pageNumber - 1) *
                                pagination.pageSize +
                                1}{' '}
                            -{' '}
                            {(pagination.pageNumber - 1) *
                                pagination.pageSize +
                                history.length}{' '}
                            of {pagination.totalCount.toLocaleString()} searches
                        </p>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                disabled={
                                    !pagination.hasPreviousPage || loading
                                }
                                onClick={() =>
                                    setPagination((previous) => ({
                                        ...previous,
                                        pageNumber:
                                            previous.pageNumber - 1,
                                    }))
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <ChevronLeft size={16} />

                                Previous
                            </button>

                            <span className="px-2 text-sm text-slate-500">
                                Page {pagination.pageNumber} of{' '}
                                {pagination.totalPages || 1}
                            </span>

                            <button
                                type="button"
                                disabled={!pagination.hasNextPage || loading}
                                onClick={() =>
                                    setPagination((previous) => ({
                                        ...previous,
                                        pageNumber:
                                            previous.pageNumber + 1,
                                    }))
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Next

                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <h2 className="text-lg font-semibold text-slate-900">
                                Delete Selected Users
                            </h2>

                            <button
                                type="button"
                                onClick={() =>
                                    setIsDeleteModalOpen(false)
                                }
                                disabled={isDeleting}
                                className="text-2xl leading-none text-slate-400 transition hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label="Close"
                            >
                                ×
                            </button>
                        </div>

                        <div className="px-5 py-6">
                            <p className="text-sm text-slate-600">
                                Are you sure you want to delete{' '}
                                <span className="font-semibold text-slate-900">
                                    {selectedIds.length}
                                </span>{' '}
                                selected search history records?
                            </p>

                            <p className="mt-3 text-sm font-medium text-red-600">
                                This action cannot be undone.
                            </p>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
                            <button
                                type="button"
                                onClick={() =>
                                    setIsDeleteModalOpen(false)
                                }
                                disabled={isDeleting}
                                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleDeleteSelected}
                                disabled={isDeleting}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isDeleting
                                    ? 'Deleting...'
                                    : 'Delete Selected'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}