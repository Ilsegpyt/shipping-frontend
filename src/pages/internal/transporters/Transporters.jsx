import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, Pencil, Plus, RefreshCw, Search, Truck } from 'lucide-react';

import { useAuth } from '../../../auth/AuthContext';
import transportersService, {
    TRANSPORTER_PERMISSIONS,
    hasPermission,
} from '../../../services/transportersService';
import { extractApiErrorMessage } from '../../../utils/errorUtils';
import TransporterFormModal from './components/TransporterFormModal';

const PAGE_SIZE = 20;

export default function Transporters() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const canCreate = hasPermission(user, TRANSPORTER_PERMISSIONS.create);
    const canEdit = hasPermission(user, TRANSPORTER_PERMISSIONS.edit);

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [pageNumber, setPageNumber] = useState(1);
    const [reloadToken, setReloadToken] = useState(0);

    const requestKey = `${pageNumber}|${search}|${reloadToken}`;
    const [loaded, setLoaded] = useState({ key: null, data: null, error: '' });
    const loading = loaded.key !== requestKey;

    // null = closed, {} = create, transporter = edit
    const [modalTransporter, setModalTransporter] = useState(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchInput);
            setPageNumber(1);
        }, 350);

        return () => clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        let cancelled = false;

        transportersService
            .getAll({ pageNumber, pageSize: PAGE_SIZE, search })
            .then((data) => {
                if (!cancelled) setLoaded({ key: requestKey, data, error: '' });
            })
            .catch((err) => {
                if (!cancelled) {
                    setLoaded({ key: requestKey, data: null, error: extractApiErrorMessage(err) });
                }
            });

        return () => {
            cancelled = true;
        };
    }, [pageNumber, search, requestKey]);

    const reload = () => setReloadToken((t) => t + 1);

    const items = loaded.data?.items ?? [];
    const totalCount = loaded.data?.totalCount ?? 0;
    const totalPages = loaded.data?.totalPages ?? 1;
    const from = totalCount === 0 ? 0 : (pageNumber - 1) * PAGE_SIZE + 1;
    const to = Math.min(pageNumber * PAGE_SIZE, totalCount);

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
                        <Truck className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold text-slate-900">Transporters</h1>
                        <p className="text-xs text-slate-500">
                            Manage transporters, port conditions, lane rates and client exceptions.
                        </p>
                    </div>
                </div>

                {canCreate && (
                    <button
                        type="button"
                        onClick={() => setModalTransporter({})}
                        className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    >
                        <Plus className="h-4 w-4" />
                        Add Transporter
                    </button>
                )}
            </div>

            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search name / contact / phone / email..."
                        className="w-full rounded-md border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200"
                    />
                </div>
                <button
                    type="button"
                    onClick={reload}
                    className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {loaded.error && !loading && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {loaded.error}
                </div>
            )}

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                {['Name', 'Contact Person', 'Phone', 'Email', 'Status', 'Actions'].map((h) => (
                                    <th
                                        key={h}
                                        className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && items.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                                        Loading...
                                    </td>
                                </tr>
                            )}

                            {!loading && items.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                                        No transporters found.
                                    </td>
                                </tr>
                            )}

                            {items.map((t) => (
                                <tr key={t.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 text-sm font-medium">
                                        <Link
                                            to={`/transporters/${t.id}`}
                                            className="text-blue-600 hover:text-blue-800 hover:underline"
                                        >
                                            {t.name}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{t.contactPerson || '—'}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{t.phone || '—'}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{t.email || '—'}</td>
                                    <td className="px-4 py-3 text-sm">
                                        <span
                                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                t.isActive
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : 'bg-slate-100 text-slate-500'
                                            }`}
                                        >
                                            <span
                                                className={`h-1.5 w-1.5 rounded-full ${
                                                    t.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                                                }`}
                                            />
                                            {t.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/transporters/${t.id}`)}
                                                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                                View
                                            </button>
                                            {canEdit && (
                                                <button
                                                    type="button"
                                                    onClick={() => setModalTransporter(t)}
                                                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                    Edit
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
                    <span>
                        Showing {from}–{to} of {totalCount}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            disabled={pageNumber <= 1 || loading}
                            onClick={() => setPageNumber((p) => p - 1)}
                            className="rounded-md border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
                        >
                            ‹ Prev
                        </button>
                        <span>
                            Page {pageNumber} of {Math.max(totalPages, 1)}
                        </span>
                        <button
                            type="button"
                            disabled={pageNumber >= totalPages || loading}
                            onClick={() => setPageNumber((p) => p + 1)}
                            className="rounded-md border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
                        >
                            Next ›
                        </button>
                    </div>
                </div>
            </div>

            {modalTransporter && (
                <TransporterFormModal
                    transporter={modalTransporter.id ? modalTransporter : null}
                    onClose={() => setModalTransporter(null)}
                    onSaved={() => {
                        setModalTransporter(null);
                        reload();
                    }}
                />
            )}
        </div>
    );
}
