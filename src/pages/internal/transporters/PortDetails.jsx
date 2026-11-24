import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, Anchor, ArrowLeft, CheckCircle2, Pencil, Plus } from 'lucide-react';

import { useAuth } from '../../../auth/AuthContext';
import { getCustomers } from '../../../services/customersService';
import transportersService, {
    TRANSPORTER_PERMISSIONS,
    formatDate,
    formatEgp,
    hasPermission,
} from '../../../services/transportersService';
import { extractApiErrorMessage } from '../../../utils/errorUtils';
import ClientExceptionFormModal from './components/ClientExceptionFormModal';
import ModalShell from './components/ModalShell';
import PortCoverageFormModal from './components/PortCoverageFormModal';
import { PortStatusBadge } from './components/PortStatusBadge';
import { buildRateMatrix } from './components/rateMatrix';

const CUSTOMERS_PAGE_SIZE = 100;
const CUSTOMERS_MAX_PAGES = 20;

const loadAllCustomers = async () => {
    const all = [];

    for (let page = 1; page <= CUSTOMERS_MAX_PAGES; page++) {
        const result = await getCustomers(page, CUSTOMERS_PAGE_SIZE);
        all.push(...(result.items ?? []));

        if (page >= (result.totalPages ?? 1)) break;
    }

    return all;
};

const getExceptionStatus = (ex, now) => {
    if (!ex.isActive) return 'Inactive';
    if (new Date(ex.validToUtc) < now) return 'Expired';
    if (new Date(ex.validFromUtc) > now) return 'Upcoming';
    return 'Active';
};

const EXCEPTION_STATUS_STYLES = {
    Active: 'bg-emerald-50 text-emerald-700',
    Upcoming: 'bg-sky-50 text-sky-700',
};

function Condition({ label, value }) {
    return (
        <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
            <div className="mt-0.5 text-sm font-medium text-slate-800">{value}</div>
        </div>
    );
}

const thClass =
    'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500';

export default function PortDetails() {
    const { id, portCoverageId } = useParams();
    const { user } = useAuth();

    const canEdit = hasPermission(user, TRANSPORTER_PERMISSIONS.edit);
    const canApprove = hasPermission(user, TRANSPORTER_PERMISSIONS.approveRates);
    const canViewCustomers = hasPermission(user, 'customers.view');

    const [reloadToken, setReloadToken] = useState(0);
    const requestKey = `${id}|${portCoverageId}|${reloadToken}`;
    const [loaded, setLoaded] = useState({ key: null, port: null, transporterName: '', error: '' });
    const loading = loaded.key !== requestKey;
    const port = loaded.port;

    const [customers, setCustomers] = useState({ items: [], error: '' });

    const [activeTab, setActiveTab] = useState('rates');
    const [editingPort, setEditingPort] = useState(false);
    const [exceptionModalOpen, setExceptionModalOpen] = useState(false);
    const [approveOpen, setApproveOpen] = useState(false);
    const [approving, setApproving] = useState(false);
    const [approveError, setApproveError] = useState('');

    useEffect(() => {
        let cancelled = false;

        Promise.all([
            transportersService.getPortById(id, portCoverageId),
            transportersService.getById(id),
        ])
            .then(([portData, transporter]) => {
                if (!cancelled) {
                    setLoaded({
                        key: requestKey,
                        port: portData,
                        transporterName: transporter?.name ?? '',
                        error: '',
                    });
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setLoaded({
                        key: requestKey,
                        port: null,
                        transporterName: '',
                        error: extractApiErrorMessage(err),
                    });
                }
            });

        return () => {
            cancelled = true;
        };
    }, [id, portCoverageId, requestKey]);

    useEffect(() => {
        if (!canViewCustomers) return undefined;

        let cancelled = false;

        loadAllCustomers()
            .then((items) => {
                if (!cancelled) setCustomers({ items, error: '' });
            })
            .catch((err) => {
                if (!cancelled) {
                    setCustomers({
                        items: [],
                        error: `Could not load customers: ${extractApiErrorMessage(err)}`,
                    });
                }
            });

        return () => {
            cancelled = true;
        };
    }, [canViewCustomers]);

    const reload = () => setReloadToken((t) => t + 1);

    const customerNames = useMemo(() => {
        const map = new Map();
        customers.items.forEach((c) => map.set(String(c.id).toLowerCase(), c.companyName));
        return map;
    }, [customers.items]);

    const customerOptions = useMemo(
        () => customers.items.map((c) => ({ value: c.id, label: c.companyName || c.id })),
        [customers.items]
    );

    const matrix = useMemo(() => buildRateMatrix(port?.laneRates ?? []), [port]);

    const customersError = canViewCustomers
        ? customers.error
        : 'You do not have permission to view customers, so the customer list is unavailable.';

    const getCustomerName = (customerId) =>
        customerNames.get(String(customerId).toLowerCase()) ??
        `${String(customerId).slice(0, 8)}…`;

    const confirmApprove = async () => {
        setApproving(true);
        setApproveError('');

        try {
            await transportersService.approvePortRates(port.id);
            setApproveOpen(false);
            reload();
        } catch (err) {
            setApproveError(extractApiErrorMessage(err));
        } finally {
            setApproving(false);
        }
    };

    const backLink = (
        <Link
            to={`/transporters/${id}`}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
        >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to {loaded.transporterName || 'transporter'}
        </Link>
    );

    if (loading && !port) {
        return <div className="py-16 text-center text-sm text-slate-400">Loading...</div>;
    }

    if (!port) {
        return (
            <div className="space-y-4">
                {backLink}
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {loaded.error || 'Port was not found.'}
                </div>
            </div>
        );
    }

    const exceptions = port.clientExceptions ?? [];
    const now = new Date();

    return (
        <div className="space-y-5">
            {/* Header + conditions */}
            <div className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="mb-3">{backLink}</div>

                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="rounded-md bg-slate-100 p-2 text-slate-500">
                            <Anchor className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-lg font-semibold text-slate-900">{port.portName}</h1>
                                <PortStatusBadge status={port.status} />
                            </div>
                            <div className="mt-0.5 text-xs text-slate-400">
                                {loaded.transporterName} · Updated {formatDate(port.updatedAtUtc)}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {canEdit && (
                            <button
                                type="button"
                                onClick={() => setEditingPort(true)}
                                className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                            >
                                <Pencil className="h-4 w-4" />
                                Edit Port
                            </button>
                        )}
                        {canApprove && port.status !== 'Approved' && (
                            <button
                                type="button"
                                onClick={() => {
                                    setApproveError('');
                                    setApproveOpen(true);
                                }}
                                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                Approve Rates
                            </button>
                        )}
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 md:grid-cols-3">
                    <Condition label="Free Hours" value={port.freeHours} />
                    <Condition label="Delay / Hour" value={formatEgp(port.delayRatePerHour)} />
                    <Condition
                        label="Official Receipt"
                        value={
                            port.officialReceiptNotes ? (
                                <span className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                                    لا تشمل إيصال رسمي (Excluded)
                                </span>
                            ) : (
                                <span className="text-xs text-slate-600">شاملة (Included)</span>
                            )
                        }
                    />
                    {port.generalNotes && (
                        <div className="col-span-2 md:col-span-3">
                            <div className="text-[11px] uppercase tracking-wide text-slate-400">Notes</div>
                            <p className="mt-0.5 whitespace-pre-line text-sm text-slate-700">
                                {port.generalNotes}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-slate-200">
                {[
                    { key: 'rates', label: `Rate Matrix (${matrix.rows.length})` },
                    { key: 'exceptions', label: `Client Exceptions (${exceptions.length})` },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium ${
                            activeTab === tab.key
                                ? 'border-slate-900 text-slate-900'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Rate matrix */}
            {activeTab === 'rates' && (
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className={thClass}>Destination</th>
                                    {matrix.columns.map((c) => (
                                        <th key={c} className={`${thClass} text-right`}>
                                            {c}
                                        </th>
                                    ))}
                                    <th className={thClass}>Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {matrix.rows.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={matrix.columns.length + 2}
                                            className="px-4 py-10 text-center text-sm text-slate-400"
                                        >
                                            No rates yet.
                                        </td>
                                    </tr>
                                )}
                                {matrix.rows.map((row) => (
                                    <tr key={row.destination} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 text-sm font-medium text-slate-900">
                                            {row.destination}
                                        </td>
                                        {matrix.columns.map((c) => (
                                            <td
                                                key={c}
                                                className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-800"
                                            >
                                                {row.prices[c] !== undefined ? (
                                                    formatEgp(row.prices[c])
                                                ) : (
                                                    <span className="text-slate-300">—</span>
                                                )}
                                            </td>
                                        ))}
                                        <td className="px-4 py-3 text-sm text-slate-500">{row.notes || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Client exceptions */}
            {activeTab === 'exceptions' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500">
                            Customer-specific agreed prices from {port.portName} that override the matrix.
                        </p>
                        {canEdit && (
                            <button
                                type="button"
                                onClick={() => setExceptionModalOpen(true)}
                                className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                            >
                                <Plus className="h-4 w-4" />
                                Add Exception
                            </button>
                        )}
                    </div>

                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-slate-50">
                                    <tr>
                                        {['Customer', 'Destination', 'Equipment', 'Price', 'Validity', 'Status', 'Reason'].map(
                                            (h) => (
                                                <th key={h} className={thClass}>
                                                    {h}
                                                </th>
                                            )
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {exceptions.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                                                No client exceptions for this port.
                                            </td>
                                        </tr>
                                    )}

                                    {exceptions.map((ex) => {
                                        const status = getExceptionStatus(ex, now);
                                        const dimmed = status === 'Expired' || status === 'Inactive';

                                        return (
                                            <tr key={ex.id} className={dimmed ? 'text-slate-400 opacity-70' : ''}>
                                                <td className="px-4 py-3 text-sm font-medium text-slate-900">
                                                    {getCustomerName(ex.customerId)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600">{ex.destination}</td>
                                                <td className="px-4 py-3 text-sm text-slate-600">{ex.equipmentType}</td>
                                                <td className="px-4 py-3 text-sm font-medium text-slate-900">
                                                    {formatEgp(ex.agreedPrice)}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                                                    {formatDate(ex.validFromUtc)} → {formatDate(ex.validToUtc)}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span
                                                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                            EXCEPTION_STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-500'
                                                        }`}
                                                    >
                                                        {status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-500">{ex.reason || '—'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            {editingPort && (
                <PortCoverageFormModal
                    transporterId={id}
                    portCoverage={port}
                    onClose={() => setEditingPort(false)}
                    onSaved={() => {
                        setEditingPort(false);
                        reload();
                    }}
                />
            )}

            {exceptionModalOpen && (
                <ClientExceptionFormModal
                    transporterId={id}
                    portCoverageId={port.id}
                    portName={port.portName}
                    destinations={matrix.rows.map((r) => r.destination)}
                    equipmentTypes={matrix.columns}
                    customerOptions={customerOptions}
                    customersError={customersError}
                    onClose={() => setExceptionModalOpen(false)}
                    onSaved={() => {
                        setExceptionModalOpen(false);
                        reload();
                    }}
                />
            )}

            {approveOpen && (
                <ModalShell title="Approve Rates" onClose={() => setApproveOpen(false)} maxWidth="max-w-md">
                    <div className="space-y-3 p-5">
                        <div className="flex gap-3">
                            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                            <p className="text-sm text-slate-700">
                                Approve the conditions and {(port.laneRates ?? []).length} rate(s) for{' '}
                                <span className="font-semibold">{port.portName}</span>? Editing the port later will
                                set it back to Draft.
                            </p>
                        </div>
                        {approveError && (
                            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {approveError}
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
                        <button
                            type="button"
                            onClick={() => setApproveOpen(false)}
                            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={approving}
                            onClick={confirmApprove}
                            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                            {approving ? 'Approving...' : 'Approve'}
                        </button>
                    </div>
                </ModalShell>
            )}
        </div>
    );
}
