import { useState } from 'react';

import ModalShell from './ModalShell';
import transportersService from '../../../../services/transportersService';
import { extractApiErrorMessage } from '../../../../utils/errorUtils';

const inputClass =
    'w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200';
const labelClass = 'mb-1.5 block text-xs font-medium text-slate-600';

export default function TransporterFormModal({ transporter, onClose, onSaved }) {
    const isEdit = Boolean(transporter);

    const [form, setForm] = useState({
        name: transporter?.name ?? '',
        contactPerson: transporter?.contactPerson ?? '',
        phone: transporter?.phone ?? '',
        email: transporter?.email ?? '',
        isActive: transporter?.isActive ?? true,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;
        setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');

        const payload = {
            name: form.name.trim(),
            contactPerson: form.contactPerson.trim() || null,
            phone: form.phone.trim() || null,
            email: form.email.trim() || null,
        };

        try {
            if (isEdit) {
                await transportersService.update(transporter.id, {
                    ...payload,
                    isActive: form.isActive,
                });
            } else {
                await transportersService.create(payload);
            }

            onSaved();
        } catch (err) {
            setError(extractApiErrorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <ModalShell
            title={isEdit ? 'Edit Transporter' : 'Add Transporter'}
            subtitle={isEdit ? 'Update transporter information.' : 'Add a new transporter.'}
            onClose={onClose}
        >
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                        <label className={labelClass}>Name</label>
                        <input
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            required
                            maxLength={200}
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Contact Person</label>
                        <input
                            name="contactPerson"
                            value={form.contactPerson}
                            onChange={handleChange}
                            maxLength={200}
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Phone</label>
                        <input
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            maxLength={30}
                            className={inputClass}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className={labelClass}>Email</label>
                        <input
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={handleChange}
                            maxLength={200}
                            className={inputClass}
                        />
                    </div>

                    {isEdit && (
                        <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
                            <input
                                name="isActive"
                                type="checkbox"
                                checked={form.isActive}
                                onChange={handleChange}
                                className="h-4 w-4 rounded border-slate-300"
                            />
                            Active
                        </label>
                    )}

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
                        {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Transporter'}
                    </button>
                </div>
            </form>
        </ModalShell>
    );
}
