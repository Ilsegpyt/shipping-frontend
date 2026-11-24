import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    Anchor,
    ArrowLeft,
    ChevronRight,
    Mail,
    Pencil,
    Phone,
    Plus,
    User,
} from 'lucide-react';

import { useAuth } from '../../../auth/AuthContext';
import transportersService, {
    TRANSPORTER_PERMISSIONS,
    formatDate,
    formatEgp,
    hasPermission,
} from '../../../services/transportersService';
import { extractApiErrorMessage } from '../../../utils/errorUtils';
import PortCoverageFormModal from './components/PortCoverageFormModal';
import { PortStatusBadge } from './components/PortStatusBadge';
import TransporterFormModal from './components/TransporterFormModal';

function Condition({ label, value }) {
    return (
        <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
            <div className="mt-0.5 text-sm font-medium text-slate-800">{value}</div>
        </div>
    );
}

export default function TransporterDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const canEdit = hasPermission(user, TRANSPORTER_PERMISSIONS.edit);

    const [reloadToken, setReloadToken] = useState(0);
    const requestKey = `${id}|${reloadToken}`;
    const [loaded, setLoaded] = useState({ key: null, data: null, error: '' });
    const loading = loaded.key !== requestKey;
    const transporter = loaded.data;

    const [editingTransporter, setEditingTransporter] = useState(false);
    const [addingPort, setAddingPort] = useState(false);

    useEffect(() => {
        let cancelled = false;

        transportersService
            .getById(id)
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
    }, [id, requestKey]);

    const reload = () => setReloadToken((t) => t + 1);

    if (loading && !transporter) {
        return <div className="py-16 text-center text-sm text-slate-400">Loading...</div>;
    }

    if (!transporter) {
        return (
            <div className="space-y-4">
                <button
                    type="button"
                    onClick={() => navigate('/transporters')}
                    className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to transporters
                </button>
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {loaded.error || 'Transporter was not found.'}
                </div>
            </div>
        );
    }

    const ports = transporter.portCoverages ?? [];
    const exceptions = transporter.clientExceptions ?? [];

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="rounded-lg border border-slate-200 bg-white p-5">
                <button
                    type="button"
                    onClick={() => navigate('/transporters')}
                    className="mb-3 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to transporters
                </button>

                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-lg font-semibold text-slate-900">{transporter.name}</h1>
                            <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                    transporter.isActive
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-slate-100 text-slate-500'
                                }`}
                            >
                                {transporter.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1">
                                <User className="h-3.5 w-3.5" />
                                {transporter.contactPerson || '—'}
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <Phone className="h-3.5 w-3.5" />
                                {transporter.phone || '—'}
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <Mail className="h-3.5 w-3.5" />
                                {transporter.email || '—'}
                            </span>
                        </div>
                    </div>

                    {canEdit && (
                        <button
                            type="button"
                            onClick={() => setEditingTransporter(true)}
                            className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                        >
                            <Pencil className="h-4 w-4" />
                            Edit
                        </button>
                    )}
                </div>
            </div>

            {/* Ports */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-slate-900">Ports ({ports.length})</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                        Open a port to see its rate matrix and client exceptions.
                    </p>
                </div>
                {canEdit && (
                    <button
                        type="button"
                        onClick={() => setAddingPort(true)}
                        className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    >
                        <Plus className="h-4 w-4" />
                        Add Port
                    </button>
                )}
            </div>

            {ports.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-200 bg-white py-10 text-center text-sm text-slate-400">
                    No ports yet.
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {ports.map((port) => {
                    const portPath = `/transporters/${transporter.id}/ports/${port.id}`;
                    const lanes = port.laneRates ?? [];
                    const destinations = new Set(lanes.map((l) => l.destination.trim().toLowerCase())).size;
                    const exceptionCount = exceptions.filter((e) => e.portCoverageId === port.id).length;

                    return (
                        <div
                            key={port.id}
                            className="flex flex-col rounded-lg border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-sm"
                        >
                            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="rounded-md bg-slate-100 p-2 text-slate-500">
                                        <Anchor className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <Link
                                            to={portPath}
                                            className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                        >
                                            {port.portName}
                                        </Link>
                                        <div className="text-[11px] text-slate-400">
                                            Updated {formatDate(port.updatedAtUtc)}
                                        </div>
                                    </div>
                                </div>
                                <PortStatusBadge status={port.status} />
                            </div>

                            <div className="grid flex-1 grid-cols-2 gap-4 px-5 py-4">
                                <Condition label="Free Hours" value={port.freeHours} />
                                <Condition label="Delay / Hour" value={formatEgp(port.delayRatePerHour)} />
                                <Condition
                                    label="Official Receipt"
                                    value={
                                        port.officialReceiptNotes ? (
                                            <span className="text-xs text-amber-700">Excluded</span>
                                        ) : (
                                            <span className="text-xs text-slate-600">Included</span>
                                        )
                                    }
                                />
                                <Condition
                                    label="Coverage"
                                    value={`${destinations} destination(s) · ${exceptionCount} exception(s)`}
                                />
                            </div>

                            <Link
                                to={portPath}
                                className="flex items-center justify-end gap-1 border-t border-slate-100 px-5 py-2.5 text-xs font-medium text-slate-500 hover:text-slate-800"
                            >
                                Open port
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    );
                })}
            </div>

            {/* Modals */}
            {editingTransporter && (
                <TransporterFormModal
                    transporter={transporter}
                    onClose={() => setEditingTransporter(false)}
                    onSaved={() => {
                        setEditingTransporter(false);
                        reload();
                    }}
                />
            )}

            {addingPort && (
                <PortCoverageFormModal
                    transporterId={transporter.id}
                    portCoverage={null}
                    existingPortNames={ports.map((p) => p.portName)}
                    onClose={() => setAddingPort(false)}
                    onSaved={() => {
                        setAddingPort(false);
                        reload();
                    }}
                />
            )}
        </div>
    );
}
