import { useEffect, useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import {
    getShipmentById,
    updateShipment,
} from '../../../services/shipmentsService';

const shipmentStatuses = [
    { value: 'Received', label: 'Received' },
    { value: 'Processing', label: 'Processing' },
    { value: 'MissingDocs', label: 'Missing Documents' },
    { value: 'Confirmed', label: 'Confirmed' },
    { value: 'Delivered', label: 'Delivered' },
    { value: 'Cancelled', label: 'Cancelled' },
];

const initialForm = {
    status: '',
    mbl: '',
    hbl: '',
    mawb: '',
    bookingConfirmationNumber: '',
};

export default function ShipmentEdit() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [shipment, setShipment] = useState(null);
    const [form, setForm] = useState(initialForm);

    const [errors, setErrors] = useState({});
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadShipment = async () => {
            try {
                setLoading(true);
                setError('');

                const data = await getShipmentById(id);

                setShipment(data);

                setForm({
                    status: data.status ?? '',
                    mbl: data.mbl ?? '',
                    hbl: data.hbl ?? '',
                    mawb: data.mawb ?? '',
                    bookingConfirmationNumber:
                        data.bookingConfirmationNumber ?? '',
                });
            } catch (err) {
                console.error('Failed to load shipment:', err);

                const responseData = err.response?.data;

                setError(
                    responseData?.error ||
                    responseData?.message ||
                    responseData ||
                    'Failed to load shipment.'
                );
            } finally {
                setLoading(false);
            }
        };

        loadShipment();
    }, [id]);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));

        setErrors((previous) => ({
            ...previous,
            [name]: '',
        }));

        setError('');
        setSuccess('');
    };

    const validateForm = () => {
        const validationErrors = {};

        if (!form.status.trim()) {
            validationErrors.status = 'Status is required.';
        } else if (
            !shipmentStatuses.some(
                (status) => status.value === form.status
            )
        ) {
            validationErrors.status = 'Invalid shipment status.';
        }

        const mode = shipment?.mode;

        const hasMBL = form.mbl.trim() !== '';
        const hasMAWB = form.mawb.trim() !== '';

        if (mode?.toLowerCase() === 'sea' && hasMAWB) {
            validationErrors.mawb =
                'Sea shipment cannot have MAWB.';
        }

        if (mode?.toLowerCase() === 'air' && hasMBL) {
            validationErrors.mbl =
                'Air shipment cannot have MBL.';
        }

        if (hasMBL && hasMAWB) {
            validationErrors.mbl =
                'MBL and MAWB cannot both have values.';

            validationErrors.mawb =
                'MBL and MAWB cannot both have values.';
        }

        setErrors(validationErrors);

        return Object.keys(validationErrors).length === 0;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setSuccess('');
        setError('');

        if (!validateForm()) {
            setError('Please fix the validation errors.');
            return;
        }

        const shipmentData = {
            status: form.status,
            mbl: form.mbl.trim() || null,
            hbl: form.hbl.trim() || null,
            mawb: form.mawb.trim() || null,
            bookingConfirmationNumber:
                form.bookingConfirmationNumber.trim() || null,
        };

        try {
            setSaving(true);

            await updateShipment(id, shipmentData);

            setSuccess('Shipment updated successfully.');

            setTimeout(() => {
                navigate('/shipments');
            }, 800);
        } catch (err) {
            console.error('Failed to update shipment:', err);

            const responseData = err.response?.data;

            if (responseData?.errors) {
                const backendErrors = {};

                Object.entries(responseData.errors).forEach(
                    ([field, messages]) => {
                        const normalizedField =
                            field.charAt(0).toLowerCase() +
                            field.slice(1);

                        backendErrors[normalizedField] =
                            Array.isArray(messages)
                                ? messages.join(' ')
                                : String(messages);
                    }
                );

                setErrors(backendErrors);
            }

            setError(
                responseData?.error ||
                responseData?.message ||
                responseData ||
                'Failed to update shipment.'
            );
        } finally {
            setSaving(false);
        }
    };

    const inputClass = (field) =>
        `w-full rounded-lg border bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 ${errors[field]
            ? 'border-red-300'
            : 'border-slate-200'
        }`;

    const renderError = (field) =>
        errors[field] ? (
            <p className="mt-1 text-xs text-red-500">
                {errors[field]}
            </p>
        ) : null;

    const SectionTitle = ({ children }) => (
        <div className="mb-4 border-b border-slate-200 pb-2">
            <h2 className="text-sm font-semibold text-slate-900">
                {children}
            </h2>
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-full bg-gray-50 p-4 sm:p-6">
                <div className="mx-auto max-w-7xl">
                    <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                        Loading shipment...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-gray-50 p-4 sm:p-6">
            <div className="mx-auto max-w-7xl">
                <div className="mb-6 flex items-start justify-between">
                    <div>
                        <button
                            type="button"
                            onClick={() => navigate('/shipments')}
                            className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
                        >
                            <ArrowLeft size={17} />
                            Back to Shipments
                        </button>

                        <h1 className="text-2xl font-semibold text-gray-900">
                            Edit Shipment
                        </h1>

                        <p className="mt-1 text-sm text-blue-900/70">
                            Update shipment status and shipping documents.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                        {typeof error === 'string'
                            ? error
                            : 'Failed to update shipment.'}
                    </div>
                )}

                {success && (
                    <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-600">
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="space-y-6">
                        <section className="rounded-xl border border-slate-200 bg-white p-5">
                            <SectionTitle>
                                Shipment Information
                            </SectionTitle>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Shipment Reference
                                    </label>

                                    <input
                                        type="text"
                                        value={shipment?.shipmentRef ?? ''}
                                        readOnly
                                        className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-500 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Mode
                                    </label>

                                    <input
                                        type="text"
                                        value={shipment?.mode ?? ''}
                                        readOnly
                                        className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-500 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Carrier
                                    </label>

                                    <input
                                        type="text"
                                        value={shipment?.carrier ?? ''}
                                        readOnly
                                        className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-500 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Container Type
                                    </label>

                                    <input
                                        type="text"
                                        value={shipment?.containerType ?? ''}
                                        readOnly
                                        className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-500 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Quantity
                                    </label>

                                    <input
                                        type="text"
                                        value={shipment?.quantity ?? ''}
                                        readOnly
                                        className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-500 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Rate
                                    </label>

                                    <input
                                        type="text"
                                        value={shipment?.rate ?? ''}
                                        readOnly
                                        className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-500 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Total
                                    </label>

                                    <input
                                        type="text"
                                        value={shipment?.total ?? ''}
                                        readOnly
                                        className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-500 outline-none"
                                    />
                                </div>
                            </div>
                        </section>

                        <section className="rounded-xl border border-slate-200 bg-white p-5">
                            <SectionTitle>
                                Status & Shipping Documents
                            </SectionTitle>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Status *
                                    </label>

                                    <select
                                        name="status"
                                        value={form.status}
                                        onChange={handleChange}
                                        className={inputClass('status')}
                                    >
                                        <option value="">
                                            Select status
                                        </option>

                                        {shipmentStatuses.map((status) => (
                                            <option
                                                key={status.value}
                                                value={status.value}
                                            >
                                                {status.label}
                                            </option>
                                        ))}
                                    </select>

                                    {renderError('status')}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        MBL
                                    </label>

                                    <input
                                        type="text"
                                        name="mbl"
                                        value={form.mbl}
                                        onChange={handleChange}
                                        placeholder="Master Bill of Lading"
                                        className={inputClass('mbl')}
                                    />

                                    {renderError('mbl')}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        HBL
                                    </label>

                                    <input
                                        type="text"
                                        name="hbl"
                                        value={form.hbl}
                                        onChange={handleChange}
                                        placeholder="House Bill of Lading"
                                        className={inputClass('hbl')}
                                    />

                                    {renderError('hbl')}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        MAWB
                                    </label>

                                    <input
                                        type="text"
                                        name="mawb"
                                        value={form.mawb}
                                        onChange={handleChange}
                                        placeholder="Master Air Waybill"
                                        className={inputClass('mawb')}
                                    />

                                    {renderError('mawb')}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Booking Confirmation Number
                                    </label>

                                    <input
                                        type="text"
                                        name="bookingConfirmationNumber"
                                        value={form.bookingConfirmationNumber}
                                        onChange={handleChange}
                                        placeholder="Booking confirmation number"
                                        className={inputClass(
                                            'bookingConfirmationNumber'
                                        )}
                                    />

                                    {renderError(
                                        'bookingConfirmationNumber'
                                    )}
                                </div>
                            </div>
                        </section>

                        <div className="flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => navigate('/shipments')}
                                disabled={saving}
                                className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 rounded-lg bg-[#111827] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Save size={17} />

                                {saving
                                    ? 'Saving...'
                                    : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}