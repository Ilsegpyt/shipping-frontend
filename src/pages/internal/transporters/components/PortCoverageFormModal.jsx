import { useState } from 'react';
import { AlertTriangle, Plus, Trash2, X } from 'lucide-react';

import ModalShell from './ModalShell';
import { buildRateMatrix, flattenRateMatrix } from './rateMatrix';
import transportersService, {
    COMMON_PORTS,
    EQUIPMENT_TYPES,
} from '../../../../services/transportersService';
import { extractApiErrorMessage } from '../../../../utils/errorUtils';

const inputClass =
    'w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200';
const cellInputClass =
    'w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-400';
const labelClass = 'mb-1.5 block text-xs font-medium text-slate-600';
const thClass = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500';

let rowSeed = 0;
const newRow = (row = {}) => ({
    rowKey: ++rowSeed,
    destination: row.destination ?? '',
    prices: { ...(row.prices ?? {}) },
    notes: row.notes ?? '',
});

export default function PortCoverageFormModal({
    transporterId,
    portCoverage,
    existingPortNames = [],
    onClose,
    onSaved,
}) {
    const isEdit = Boolean(portCoverage);

    const [form, setForm] = useState({
        portName: portCoverage?.portName ?? '',
        freeHours: portCoverage?.freeHours ?? 24,
        delayRatePerHour: portCoverage?.delayRatePerHour ?? 0,
        excludeOfficialReceipt: Boolean(portCoverage?.officialReceiptNotes),
        generalNotes: portCoverage?.generalNotes ?? '',
    });

    const [matrix, setMatrix] = useState(() => {
        const { columns, rows } = buildRateMatrix(portCoverage?.laneRates ?? []);
        return {
            columns,
            rows: rows.length ? rows.map((r) => newRow(r)) : [newRow()],
        };
    });
    const [newColumn, setNewColumn] = useState('');

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const duplicatePort =
        !isEdit &&
        existingPortNames.some(
            (p) => p.trim().toLowerCase() === form.portName.trim().toLowerCase()
        );

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;
        setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const updateRow = (rowKey, changes) => {
        setMatrix((prev) => ({
            ...prev,
            rows: prev.rows.map((r) => (r.rowKey === rowKey ? { ...r, ...changes } : r)),
        }));
    };

    const updatePrice = (row, column, value) => {
        updateRow(row.rowKey, { prices: { ...row.prices, [column]: value } });
    };

    const addRow = () => {
        setMatrix((prev) => ({ ...prev, rows: [...prev.rows, newRow()] }));
    };

    const removeRow = (rowKey) => {
        setMatrix((prev) => ({ ...prev, rows: prev.rows.filter((r) => r.rowKey !== rowKey) }));
    };

    const addColumn = () => {
        const name = newColumn.trim();
        if (!name) return;

        if (matrix.columns.some((c) => c.toLowerCase() === name.toLowerCase())) {
            setError(`Equipment "${name}" is already a column.`);
            return;
        }

        setError('');
        setMatrix((prev) => ({ ...prev, columns: [...prev.columns, name] }));
        setNewColumn('');
    };

    const removeColumn = (column) => {
        setMatrix((prev) => ({
            columns: prev.columns.filter((c) => c !== column),
            rows: prev.rows.map((r) => {
                const prices = { ...r.prices };
                delete prices[column];
                return { ...r, prices };
            }),
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        const flattened = flattenRateMatrix(matrix.columns, matrix.rows);
        if (flattened.error) {
            setError(flattened.error);
            return;
        }

        setSaving(true);

        const payload = {
            portName: form.portName.trim(),
            freeHours: Number(form.freeHours) || 0,
            delayRatePerHour: Number(form.delayRatePerHour) || 0,
            officialReceiptNotes: form.excludeOfficialReceipt
                ? 'Prices do not include official receipts'
                : null,
            generalNotes: form.generalNotes.trim() || null,
            laneRates: flattened.laneRates,
        };

        try {
            await transportersService.addOrUpdatePort(transporterId, payload);
            onSaved();
        } catch (err) {
            setError(extractApiErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <ModalShell
            title={isEdit ? `Edit Port — ${portCoverage.portName}` : 'Add Port Coverage'}
            subtitle="Port conditions and rate matrix. Saving sets the rates back to Draft until approved."
            onClose={onClose}
            maxWidth="max-w-5xl"
        >
            <form onSubmit={handleSubmit}>
                <div className="space-y-6 p-5">
                    <section>
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Port Conditions
                        </h3>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="md:col-span-2">
                                <label className={labelClass}>Port Name</label>
                                <input
                                    name="portName"
                                    value={form.portName}
                                    onChange={handleChange}
                                    disabled={isEdit}
                                    required
                                    maxLength={200}
                                    list="transporter-port-options"
                                    className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-500`}
                                />
                                <datalist id="transporter-port-options">
                                    {COMMON_PORTS.map((p) => (
                                        <option key={p} value={p} />
                                    ))}
                                </datalist>
                                {duplicatePort && (
                                    <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-600">
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                        This port already exists — saving will replace its conditions and rates.
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className={labelClass}>Free Hours</label>
                                <input
                                    name="freeHours"
                                    type="number"
                                    min={0}
                                    value={form.freeHours}
                                    onChange={handleChange}
                                    required
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>Delay Rate / Hour (EGP)</label>
                                <input
                                    name="delayRatePerHour"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={form.delayRatePerHour}
                                    onChange={handleChange}
                                    required
                                    className={inputClass}
                                />
                            </div>

                            <div className="md:col-span-2 rounded-lg border border-slate-100 bg-slate-50 p-3.5">
                                <label className="flex cursor-pointer select-none items-start gap-2.5">
                                    <input
                                        type="checkbox"
                                        name="excludeOfficialReceipt"
                                        checked={form.excludeOfficialReceipt}
                                        onChange={handleChange}
                                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                                    />
                                    <div>
                                        <span className="text-sm font-medium text-slate-800">
                                            الأسعار لا تشمل إيصالات رسمية (Prices do not include official receipts)
                                        </span>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            علم على هذا الخيار إذا كانت أسعار المقاول صافية ولا تشمل فواتير أو إيصالات رسمية.
                                        </p>
                                    </div>
                                </label>
                            </div>

                            <div className="md:col-span-2">
                                <label className={labelClass}>General Notes</label>
                                <textarea
                                    name="generalNotes"
                                    value={form.generalNotes}
                                    onChange={handleChange}
                                    maxLength={2000}
                                    rows={3}
                                    className={`${inputClass} resize-none`}
                                />
                            </div>
                        </div>
                    </section>

                    <section>
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Rate Matrix (EGP)
                                </h3>
                                <p className="mt-0.5 text-xs text-slate-400">
                                    One row per destination. Leave a cell empty if the equipment is not offered.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    value={newColumn}
                                    onChange={(e) => setNewColumn(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addColumn();
                                        }
                                    }}
                                    maxLength={50}
                                    placeholder="e.g. 40 Reefer"
                                    className="w-36 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-slate-400"
                                />
                                <button
                                    type="button"
                                    onClick={addColumn}
                                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add Equipment
                                </button>
                                <button
                                    type="button"
                                    onClick={addRow}
                                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add Destination
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                            <table className="min-w-full">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className={thClass}>Destination</th>
                                        {matrix.columns.map((c) => (
                                            <th key={c} className={`${thClass} w-32`}>
                                                <span className="inline-flex items-center gap-1">
                                                    {c}
                                                    {!EQUIPMENT_TYPES.includes(c) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeColumn(c)}
                                                            className="rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                                            title={`Remove ${c}`}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </span>
                                            </th>
                                        ))}
                                        <th className={thClass}>Notes</th>
                                        <th className="w-10" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {matrix.rows.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={matrix.columns.length + 3}
                                                className="px-3 py-6 text-center text-sm text-slate-400"
                                            >
                                                No destinations. Click &quot;Add Destination&quot; to add one.
                                            </td>
                                        </tr>
                                    )}

                                    {matrix.rows.map((row) => (
                                        <tr key={row.rowKey}>
                                            <td className="min-w-44 px-3 py-2">
                                                <input
                                                    value={row.destination}
                                                    onChange={(e) => updateRow(row.rowKey, { destination: e.target.value })}
                                                    maxLength={200}
                                                    placeholder="Destination"
                                                    className={cellInputClass}
                                                />
                                            </td>
                                            {matrix.columns.map((c) => (
                                                <td key={c} className="px-3 py-2">
                                                    <input
                                                        type="number"
                                                        min={0.01}
                                                        step="0.01"
                                                        value={row.prices[c] ?? ''}
                                                        onChange={(e) => updatePrice(row, c, e.target.value)}
                                                        className={cellInputClass}
                                                    />
                                                </td>
                                            ))}
                                            <td className="min-w-40 px-3 py-2">
                                                <input
                                                    value={row.notes}
                                                    onChange={(e) => updateRow(row.rowKey, { notes: e.target.value })}
                                                    maxLength={1000}
                                                    className={cellInputClass}
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => removeRow(row.rowKey)}
                                                    className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                                    title="Remove destination"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {error && (
                        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            {error}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                        {saving ? 'Saving...' : 'Save Port'}
                    </button>
                </div>
            </form>
        </ModalShell>
    );
}
