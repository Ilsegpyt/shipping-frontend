import { useState } from 'react';

import ModalShell from './ModalShell';
import SearchableSelect from '../../../../components/common/SearchableSelect';
import transportersService from '../../../../services/transportersService';
import { extractApiErrorMessage } from '../../../../utils/errorUtils';

const inputClass =
    'w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200';
const labelClass = 'mb-1.5 block text-xs font-medium text-slate-600';

export default function ClientExceptionFormModal({
    transporterId,
    portCoverageId,
    portName,
    destinations = [],
    equipmentTypes = [],
    customerOptions = [],
    customersError = '',
    onClose,
    onSaved,
}) {
    const [form, setForm] = useState({
        customerId: '',
        destination: '',
        equipmentType: '',
        agreedPrice: '',
        validFrom: '',
        validTo: '',
        reason: '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        if (!form.customerId) {
            setError('Please select a customer.');
            return;
        }

        if (form.validTo < form.validFrom) {
            setError('Valid To must be on or after Valid From.');
            return;
        }

        setSaving(true);

        try {
            await transportersService.addClientException(transporterId, portCoverageId, {
                customerId: form.customerId,
                destination: form.destination.trim(),
                equipmentType: form.equipmentType.trim(),
                agreedPrice: Number(form.agreedPrice),
                validFromUtc: `${form.validFrom}T00:00:00Z`,
                validToUtc: `${form.validTo}T23:59:59Z`,
                reason: form.reason.trim() || null,
            });

            onSaved();
        } catch (err) {
            setError(extractApiErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <ModalShell
            title="Add Client Exception"
            subtitle={`A customer-specific agreed price from ${portName} for one destination and equipment type.`}
            onClose={onClose}
        >
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                        <label className={labelClass}>Customer</label>
                        <SearchableSelect
                            value={form.customerId}
                            onChange={(value) => setForm((prev) => ({ ...prev, customerId: value }))}
                            options={customerOptions}
                            placeholder="-- Select customer --"
                            required
                        />
                        {customersError && (
                            <p className="mt-1.5 text-xs text-amber-600">{customersError}</p>
                        )}
                    </div>

                    <div>
                        <label className={labelClass}>Origin Port</label>
                        <input value={portName} disabled className={`${inputClass} bg-slate-50 text-slate-500`} />
                    </div>

                    <div>
                        <label className={labelClass}>Destination</label>
                        <input
                            name="destination"
                            value={form.destination}
                            onChange={handleChange}
                            required
                            maxLength={200}
                            list="client-exception-destination-options"
                            className={inputClass}
                        />
                        <datalist id="client-exception-destination-options">
                            {destinations.map((d) => (
                                <option key={d} value={d} />
                            ))}
                        </datalist>
                    </div>

                    <div>
                        <label className={labelClass}>Equipment Type</label>
                        <input
                            name="equipmentType"
                            value={form.equipmentType}
                            onChange={handleChange}
                            required
                            maxLength={50}
                            list="client-exception-equipment-options"
                            className={inputClass}
                        />
                        <datalist id="client-exception-equipment-options">
                            {equipmentTypes.map((e) => (
                                <option key={e} value={e} />
                            ))}
                        </datalist>
                    </div>

                    <div>
                        <label className={labelClass}>Agreed Price (EGP)</label>
                        <input
                            name="agreedPrice"
                            type="number"
                            min={0.01}
                            step="0.01"
                            value={form.agreedPrice}
                            onChange={handleChange}
                            required
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Valid From</label>
                        <input
                            name="validFrom"
                            type="date"
                            value={form.validFrom}
                            onChange={handleChange}
                            required
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Valid To</label>
                        <input
                            name="validTo"
                            type="date"
                            value={form.validTo}
                            onChange={handleChange}
                            required
                            min={form.validFrom || undefined}
                            className={inputClass}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className={labelClass}>Reason</label>
                        <textarea
                            name="reason"
                            value={form.reason}
                            onChange={handleChange}
                            maxLength={1000}
                            rows={2}
                            className={`${inputClass} resize-none`}
                        />
                    </div>

                    {error && (
                        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">
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
                        {saving ? 'Saving...' : 'Add Exception'}
                    </button>
                </div>
            </form>
        </ModalShell>
    );
}
