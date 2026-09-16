import { useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { createSchedule } from '../../../services/schedulesService';

const containerSizes = [
    { value: 1, label: 'Dry 20 Standard' },
    { value: 2, label: 'Dry 40 Standard' },
    { value: 3, label: 'Dry 40 High' },
    { value: 4, label: 'Dry 45 High' },
    { value: 5, label: 'Reefer 20 Standard' },
    { value: 6, label: 'Reefer 40 High' },
    { value: 7, label: 'Open Top 20' },
    { value: 8, label: 'Open Top 40' },
    { value: 9, label: 'Open Top 40 High' },
    { value: 10, label: 'Flat 40 Standard' },
    { value: 11, label: 'Flat 40 High' },
    { value: 12, label: 'Flat 20' },
    { value: 13, label: 'Tank 20' },
    { value: 14, label: 'Tank 40' },
];

const initialForm = {
    routeId: '',
    mode: '1',

    departureDate: '',
    arrival: '',
    cutoffDate: '',
    validityDate: '',

    vessel: '',
    origin: '',
    departurePortCode: '',
    departureCountry: '',

    destination: '',
    arrivalPortCode: '',
    arrivalCountry: '',

    carrier: '',
    carrierCode: '',
    voyageNumber: '',

    transitDays: '',

    rateCurrency: 'USD',
    containerSize: '1',
    rateAmount: '',
    rateRemarks: '',

    freeTimeAtPOD: '0',
    freeTimeAtPOL: '0',

    transshipmentData: '',
    notes: '',
};

function calculateTransitDays(departureDate, arrivalDate) {
    if (!departureDate || !arrivalDate) {
        return '';
    }

    const departure = new Date(departureDate);
    const arrival = new Date(arrivalDate);

    if (Number.isNaN(departure.getTime()) || Number.isNaN(arrival.getTime())) {
        return '';
    }

    const differenceInDays =
        (arrival.getTime() - departure.getTime()) / (1000 * 60 * 60 * 24);

    return differenceInDays >= 0
        ? String(Math.round(differenceInDays))
        : '';
}

export default function AddSchedule() {
    const navigate = useNavigate();

    const [form, setForm] = useState(initialForm);
    const [errors, setErrors] = useState({});
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [saving, setSaving] = useState(false);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((previous) => {
            const updatedForm = {
                ...previous,
                [name]: value,
            };

            if (name === 'departureDate' || name === 'arrival') {
                updatedForm.transitDays = calculateTransitDays(
                    name === 'departureDate'
                        ? value
                        : previous.departureDate,
                    name === 'arrival'
                        ? value
                        : previous.arrival
                );
            }

            return updatedForm;
        });

        setErrors((previous) => ({
            ...previous,
            [name]: '',
        }));

        setError('');
    };

    const validateForm = () => {
        const validationErrors = {};

        const requiredFields = [
            ['departureDate', 'Departure date is required.'],
            ['arrival', 'Arrival date is required.'],
            ['cutoffDate', 'Cut-off date is required.'],
            ['validityDate', 'Validity date is required.'],
            ['vessel', 'Vessel is required.'],
            ['origin', 'Origin is required.'],
            ['departurePortCode', 'Departure port code is required.'],
            ['departureCountry', 'Departure country is required.'],
            ['destination', 'Destination is required.'],
            ['arrivalPortCode', 'Arrival port code is required.'],
            ['arrivalCountry', 'Arrival country is required.'],
            ['carrier', 'Carrier is required.'],
            ['carrierCode', 'Carrier code is required.'],
            ['voyageNumber', 'Voyage number is required.'],
            ['rateCurrency', 'Rate currency is required.'],
        ];

        requiredFields.forEach(([field, message]) => {
            if (!String(form[field] ?? '').trim()) {
                validationErrors[field] = message;
            }
        });

        if (
            form.departureDate &&
            form.arrival &&
            form.arrival < form.departureDate
        ) {
            validationErrors.arrival =
                'Arrival date cannot be before departure date.';
        }

        if (
            form.departureDate &&
            form.cutoffDate &&
            form.cutoffDate >= form.departureDate
        ) {
            validationErrors.cutoffDate =
                'Cut-off date must be before departure date.';
        }

        if (
            form.rateAmount === '' ||
            Number(form.rateAmount) < 0
        ) {
            validationErrors.rateAmount =
                'Rate amount must be zero or greater.';
        }

        if (
            form.freeTimeAtPOD === '' ||
            Number(form.freeTimeAtPOD) < 0
        ) {
            validationErrors.freeTimeAtPOD =
                'Free time at POD cannot be negative.';
        }

        if (
            form.freeTimeAtPOL === '' ||
            Number(form.freeTimeAtPOL) < 0
        ) {
            validationErrors.freeTimeAtPOL =
                'Free time at POL cannot be negative.';
        }

        if (form.vessel.length > 200) {
            validationErrors.vessel =
                'Vessel cannot exceed 200 characters.';
        }

        if (form.origin.length > 200) {
            validationErrors.origin =
                'Origin cannot exceed 200 characters.';
        }

        if (form.destination.length > 200) {
            validationErrors.destination =
                'Destination cannot exceed 200 characters.';
        }

        if (form.departurePortCode.length > 10) {
            validationErrors.departurePortCode =
                'Departure port code cannot exceed 10 characters.';
        }

        if (form.arrivalPortCode.length > 10) {
            validationErrors.arrivalPortCode =
                'Arrival port code cannot exceed 10 characters.';
        }

        if (form.departureCountry.length > 100) {
            validationErrors.departureCountry =
                'Departure country cannot exceed 100 characters.';
        }

        if (form.arrivalCountry.length > 100) {
            validationErrors.arrivalCountry =
                'Arrival country cannot exceed 100 characters.';
        }

        if (form.carrier.length > 200) {
            validationErrors.carrier =
                'Carrier cannot exceed 200 characters.';
        }

        if (form.carrierCode.length > 20) {
            validationErrors.carrierCode =
                'Carrier code cannot exceed 20 characters.';
        }

        if (form.voyageNumber.length > 50) {
            validationErrors.voyageNumber =
                'Voyage number cannot exceed 50 characters.';
        }

        if (form.rateCurrency.length > 10) {
            validationErrors.rateCurrency =
                'Rate currency cannot exceed 10 characters.';
        }

        if (form.rateRemarks.length > 500) {
            validationErrors.rateRemarks =
                'Rate remarks cannot exceed 500 characters.';
        }

        if (form.transshipmentData.length > 1000) {
            validationErrors.transshipmentData =
                'Transshipment data cannot exceed 1000 characters.';
        }

        if (form.notes.length > 2000) {
            validationErrors.notes =
                'Notes cannot exceed 2000 characters.';
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

        const scheduleData = {
            routeId: form.routeId.trim() || null,
            mode: Number(form.mode),

            departureDate: form.departureDate,
            vessel: form.vessel.trim(),

            origin: form.origin.trim(),
            departurePortCode: form.departurePortCode.trim(),
            departureCountry: form.departureCountry.trim(),

            destination: form.destination.trim(),
            arrivalPortCode: form.arrivalPortCode.trim(),
            arrivalCountry: form.arrivalCountry.trim(),

            carrier: form.carrier.trim(),
            carrierCode: form.carrierCode.trim(),
            voyageNumber: form.voyageNumber.trim(),

            arrival: form.arrival,

            transitTime: `${Number(
                calculateTransitDays(
                    form.departureDate,
                    form.arrival
                ) || 0
            )}.00:00:00`,

            cutoffDate: form.cutoffDate,

            rateCurrency: form.rateCurrency.trim().toUpperCase(),
            containerSize: Number(form.containerSize),
            rateAmount: Number(form.rateAmount),
            rateRemarks: form.rateRemarks.trim() || null,

            validityDate: form.validityDate,

            freeTimeAtPOD: Number(form.freeTimeAtPOD),
            freeTimeAtPOL: Number(form.freeTimeAtPOL),

            transshipmentData:
                form.transshipmentData.trim() || null,

            notes: form.notes.trim() || null,
        };

        try {
            setSaving(true);

            await createSchedule(scheduleData);

            setSuccess('Schedule created successfully.');

            setTimeout(() => {
                navigate('/schedules');
            }, 800);
        } catch (err) {
            console.error('Failed to create schedule:', err);

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
                'Failed to create schedule.'
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

    return (
        <div className="min-h-full bg-gray-50 p-4 sm:p-6">
            <div className="mx-auto max-w-7xl">
                <div className="mb-6 flex items-start justify-between">
                    <div>
                        <button
                            type="button"
                            onClick={() => navigate('/schedules')}
                            className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
                        >
                            <ArrowLeft size={17} />
                            Back to Schedules
                        </button>

                        <h1 className="text-2xl font-semibold text-gray-900">
                            Add Schedule
                        </h1>

                        <p className="mt-1 text-sm text-blue-900/70">
                            Create a new shipping schedule and route rate.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                        {error}
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
                                Route & Mode
                            </SectionTitle>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Mode
                                    </label>

                                    <select
                                        name="mode"
                                        value={form.mode}
                                        onChange={handleChange}
                                        className={inputClass('mode')}
                                    >
                                        <option value="1">
                                            Sea
                                        </option>
                                        <option value="2">
                                            Air
                                        </option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Route ID
                                    </label>

                                    <input
                                        type="text"
                                        name="routeId"
                                        value={form.routeId}
                                        onChange={handleChange}
                                        placeholder="Optional Route ID"
                                        className={inputClass('routeId')}
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Origin *
                                    </label>

                                    <input
                                        type="text"
                                        name="origin"
                                        value={form.origin}
                                        onChange={handleChange}
                                        placeholder="Origin"
                                        className={inputClass('origin')}
                                    />

                                    {renderError('origin')}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Departure Port Code *
                                    </label>

                                    <input
                                        type="text"
                                        name="departurePortCode"
                                        value={form.departurePortCode}
                                        onChange={handleChange}
                                        placeholder="e.g. EGALY"
                                        className={inputClass('departurePortCode')}
                                    />

                                    {renderError('departurePortCode')}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Departure Country *
                                    </label>

                                    <input
                                        type="text"
                                        name="departureCountry"
                                        value={form.departureCountry}
                                        onChange={handleChange}
                                        placeholder="Departure country"
                                        className={inputClass('departureCountry')}
                                    />

                                    {renderError('departureCountry')}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Destination *
                                    </label>

                                    <input
                                        type="text"
                                        name="destination"
                                        value={form.destination}
                                        onChange={handleChange}
                                        placeholder="Destination"
                                        className={inputClass('destination')}
                                    />

                                    {renderError('destination')}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Arrival Port Code *
                                    </label>

                                    <input
                                        type="text"
                                        name="arrivalPortCode"
                                        value={form.arrivalPortCode}
                                        onChange={handleChange}
                                        placeholder="e.g. NLRTM"
                                        className={inputClass('arrivalPortCode')}
                                    />

                                    {renderError('arrivalPortCode')}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Arrival Country *
                                    </label>

                                    <input
                                        type="text"
                                        name="arrivalCountry"
                                        value={form.arrivalCountry}
                                        onChange={handleChange}
                                        placeholder="Arrival country"
                                        className={inputClass('arrivalCountry')}
                                    />

                                    {renderError('arrivalCountry')}
                                </div>
                            </div>
                        </section>

                        <section className="rounded-xl border border-slate-200 bg-white p-5">
                            <SectionTitle>
                                Vessel & Carrier
                            </SectionTitle>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Vessel *
                                    </label>

                                    <input
                                        type="text"
                                        name="vessel"
                                        value={form.vessel}
                                        onChange={handleChange}
                                        placeholder="Vessel name"
                                        className={inputClass('vessel')}
                                    />

                                    {renderError('vessel')}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Carrier *
                                    </label>

                                    <input
                                        type="text"
                                        name="carrier"
                                        value={form.carrier}
                                        onChange={handleChange}
                                        placeholder="Carrier"
                                        className={inputClass('carrier')}
                                    />

                                    {renderError('carrier')}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Carrier Code *
                                    </label>

                                    <input
                                        type="text"
                                        name="carrierCode"
                                        value={form.carrierCode}
                                        onChange={handleChange}
                                        placeholder="Carrier code"
                                        className={inputClass('carrierCode')}
                                    />

                                    {renderError('carrierCode')}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Voyage Number *
                                    </label>

                                    <input
                                        type="text"
                                        name="voyageNumber"
                                        value={form.voyageNumber}
                                        onChange={handleChange}
                                        placeholder="Voyage number"
                                        className={inputClass('voyageNumber')}
                                    />

                                    {renderError('voyageNumber')}
                                </div>
                            </div>
                        </section>

                        <section className="rounded-xl border border-slate-200 bg-white p-5">
                            <SectionTitle>
                                Schedule Dates
                            </SectionTitle>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Departure Date *
                                    </label>

                                    <input
                                        type="date"
                                        name="departureDate"
                                        value={form.departureDate}
                                        onChange={handleChange}
                                        className={inputClass('departureDate')}
                                    />

                                    {renderError('departureDate')}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Arrival Date *
                                    </label>

                                    <input
                                        type="date"
                                        name="arrival"
                                        value={form.arrival}
                                        onChange={handleChange}
                                        className={inputClass('arrival')}
                                    />

                                    {renderError('arrival')}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Cut-off Date *
                                    </label>

                                    <input
                                        type="date"
                                        name="cutoffDate"
                                        value={form.cutoffDate}
                                        onChange={handleChange}
                                        className={inputClass('cutoffDate')}
                                    />

                                    {renderError('cutoffDate')}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Validity Date *
                                    </label>

                                    <input
                                        type="date"
                                        name="validityDate"
                                        value={form.validityDate}
                                        onChange={handleChange}
                                        className={inputClass('validityDate')}
                                    />

                                    {renderError('validityDate')}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Transit Time (Days)
                                    </label>

                                    <input
                                        type="number"
                                        name="transitDays"
                                        value={form.transitDays}
                                        readOnly
                                        placeholder="Calculated automatically"
                                        className={`${inputClass(
                                            'transitDays'
                                        )} cursor-not-allowed bg-gray-100`}
                                    />

                                    {renderError('transitDays')}
                                </div>
                            </div>
                        </section>

                        <section className="rounded-xl border border-slate-200 bg-white p-5">
                            <SectionTitle>
                                Rate & Container
                            </SectionTitle>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Container Size *
                                    </label>

                                    <select
                                        name="containerSize"
                                        value={form.containerSize}
                                        onChange={handleChange}
                                        className={inputClass('containerSize')}
                                    >
                                        {containerSizes.map((container) => (
                                            <option
                                                key={container.value}
                                                value={container.value}
                                            >
                                                {container.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Rate Amount *
                                    </label>

                                    <input
                                        type="number"
                                        name="rateAmount"
                                        value={form.rateAmount}
                                        onChange={handleChange}
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        className={inputClass('rateAmount')}
                                    />

                                    {renderError('rateAmount')}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Currency *
                                    </label>

                                    <input
                                        type="text"
                                        name="rateCurrency"
                                        value={form.rateCurrency}
                                        onChange={handleChange}
                                        placeholder="USD"
                                        className={inputClass('rateCurrency')}
                                    />

                                    {renderError('rateCurrency')}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Rate Remarks
                                    </label>

                                    <input
                                        type="text"
                                        name="rateRemarks"
                                        value={form.rateRemarks}
                                        onChange={handleChange}
                                        placeholder="Optional remarks"
                                        className={inputClass('rateRemarks')}
                                    />

                                    {renderError('rateRemarks')}
                                </div>
                            </div>
                        </section>

                        <section className="rounded-xl border border-slate-200 bg-white p-5">
                            <SectionTitle>
                                Free Time & Additional Information
                            </SectionTitle>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Free Time at POD
                                    </label>

                                    <input
                                        type="number"
                                        name="freeTimeAtPOD"
                                        value={form.freeTimeAtPOD}
                                        onChange={handleChange}
                                        min="0"
                                        step="1"
                                        className={inputClass('freeTimeAtPOD')}
                                    />

                                    {renderError('freeTimeAtPOD')}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Free Time at POL
                                    </label>

                                    <input
                                        type="number"
                                        name="freeTimeAtPOL"
                                        value={form.freeTimeAtPOL}
                                        onChange={handleChange}
                                        min="0"
                                        step="1"
                                        className={inputClass('freeTimeAtPOL')}
                                    />

                                    {renderError('freeTimeAtPOL')}
                                </div>

                                <div className="md:col-span-2">
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Transshipment Data
                                    </label>

                                    <input
                                        type="text"
                                        name="transshipmentData"
                                        value={form.transshipmentData}
                                        onChange={handleChange}
                                        placeholder="Optional transshipment information"
                                        className={inputClass('transshipmentData')}
                                    />

                                    {renderError('transshipmentData')}
                                </div>

                                <div className="md:col-span-2 lg:col-span-4">
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Notes
                                    </label>

                                    <textarea
                                        name="notes"
                                        value={form.notes}
                                        onChange={handleChange}
                                        rows={4}
                                        placeholder="Additional notes"
                                        className={inputClass('notes')}
                                    />

                                    {renderError('notes')}
                                </div>
                            </div>
                        </section>

                        <div className="flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => navigate('/schedules')}
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
                                    : 'Save Schedule'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}