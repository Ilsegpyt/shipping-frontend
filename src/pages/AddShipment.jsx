import { useEffect, useState } from 'react';
import { ArrowLeft, Upload, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import api from '../services/api';
import { createShipment } from '../services/shipmentsService';

const AddShipment = () => {
    const navigate = useNavigate();

    const [schedules, setSchedules] = useState([]);
    const [scheduleId, setScheduleId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [declarationFiles, setDeclarationFiles] = useState([]);

    const [loadingSchedules, setLoadingSchedules] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const loadSchedules = async () => {
            try {
                setLoadingSchedules(true);
                setError('');

                const response = await api.get('/api/schedules', {
                    params: {
                        pageNumber: 1,
                        pageSize: 100,
                    },
                });

                setSchedules(response.data.items ?? []);
            } catch (err) {
                setError(
                    err.response?.data?.error ||
                    'Failed to load schedules.'
                );
            } finally {
                setLoadingSchedules(false);
            }
        };

        loadSchedules();
    }, []);

    const selectedSchedule = schedules.find(
        (schedule) => schedule.id === scheduleId
    );

    const handleFilesChange = (event) => {
        const selectedFiles = Array.from(event.target.files || []);

        setDeclarationFiles((previousFiles) => [
            ...previousFiles,
            ...selectedFiles,
        ]);

        event.target.value = '';
    };

    const removeFile = (indexToRemove) => {
        setDeclarationFiles((previousFiles) =>
            previousFiles.filter(
                (_, index) => index !== indexToRemove
            )
        );
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError('');
        setSuccess('');

        if (!scheduleId) {
            setError('Please select a schedule.');
            return;
        }

        if (quantity <= 0) {
            setError('Quantity must be greater than zero.');
            return;
        }

        if (declarationFiles.length === 0) {
            setError('Please upload at least one declaration file.');
            return;
        }

        try {
            setSubmitting(true);

            await createShipment({
                scheduleId,
                quantity: Number(quantity),
                declarationFiles,
            });

            setSuccess('Shipment created successfully.');

            setTimeout(() => {
                navigate('/shipments');
            }, 800);
        } catch (err) {
            setError(
                err.response?.data?.error ||
                err.response?.data ||
                'Failed to create shipment.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-full bg-gray-50 p-4 sm:p-6">
            <div className="mx-auto max-w-5xl">
                <div className="mb-6 flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/shipments')}
                        className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-200 hover:text-slate-900"
                    >
                        <ArrowLeft size={20} />
                    </button>

                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">
                            Add Shipment
                        </h1>

                        <p className="mt-1 text-sm text-slate-500">
                            Create a new shipment booking.
                        </p>
                    </div>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                    <div className="border-b border-slate-200 px-6 py-5">
                        <h2 className="text-base font-semibold text-slate-900">
                            Shipment Information
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Select a schedule and provide the shipment details.
                        </p>
                    </div>

                    <div className="grid gap-6 px-6 py-6 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <label
                                htmlFor="scheduleId"
                                className="mb-2 block text-sm font-medium text-slate-700"
                            >
                                Schedule
                            </label>

                            <select
                                id="scheduleId"
                                value={scheduleId}
                                onChange={(event) =>
                                    setScheduleId(event.target.value)
                                }
                                disabled={loadingSchedules || submitting}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <option value="">
                                    {loadingSchedules
                                        ? 'Loading schedules...'
                                        : 'Select a schedule'}
                                </option>

                                {schedules.map((schedule) => (
                                    <option
                                        key={schedule.id}
                                        value={schedule.id}
                                    >
                                        {schedule.origin} →{' '}
                                        {schedule.destination} |{' '}
                                        {schedule.mode} |{' '}
                                        {schedule.carrier} |{' '}
                                        {schedule.containerSize}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedSchedule && (
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                                <h3 className="mb-3 text-sm font-semibold text-slate-900">
                                    Selected Schedule
                                </h3>

                                <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                                    <div>
                                        <p className="text-slate-500">
                                            Route
                                        </p>
                                        <p className="mt-1 font-medium text-slate-900">
                                            {selectedSchedule.origin} →{' '}
                                            {selectedSchedule.destination}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-slate-500">
                                            Mode
                                        </p>
                                        <p className="mt-1 font-medium text-slate-900">
                                            {selectedSchedule.mode}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-slate-500">
                                            Carrier
                                        </p>
                                        <p className="mt-1 font-medium text-slate-900">
                                            {selectedSchedule.carrier}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-slate-500">
                                            Rate
                                        </p>
                                        <p className="mt-1 font-medium text-slate-900">
                                            {selectedSchedule.rateAmount}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor="quantity"
                                className="mb-2 block text-sm font-medium text-slate-700"
                            >
                                Quantity
                            </label>

                            <input
                                id="quantity"
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(event) =>
                                    setQuantity(event.target.value)
                                }
                                disabled={submitting}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Declaration Files
                            </label>

                            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition hover:border-slate-400 hover:bg-slate-100">
                                <Upload
                                    size={28}
                                    className="mb-3 text-slate-500"
                                />

                                <span className="text-sm font-medium text-slate-700">
                                    Click to upload files
                                </span>

                                <span className="mt-1 text-xs text-slate-500">
                                    At least one file is required. Maximum 10 MB per file.
                                </span>

                                <input
                                    type="file"
                                    multiple
                                    onChange={handleFilesChange}
                                    disabled={submitting}
                                    className="hidden"
                                />
                            </label>

                            {declarationFiles.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    {declarationFiles.map((file, index) => (
                                        <div
                                            key={`${file.name}-${index}`}
                                            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-slate-800">
                                                    {file.name}
                                                </p>

                                                <p className="text-xs text-slate-500">
                                                    {(
                                                        file.size /
                                                        1024 /
                                                        1024
                                                    ).toFixed(2)}{' '}
                                                    MB
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeFile(index)
                                                }
                                                disabled={submitting}
                                                className="ml-3 rounded-md p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="mx-6 mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {typeof error === 'string'
                                ? error
                                : 'Something went wrong.'}
                        </div>
                    )}

                    {success && (
                        <div className="mx-6 mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                            {success}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
                        <button
                            type="button"
                            onClick={() => navigate('/shipments')}
                            disabled={submitting}
                            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={submitting || loadingSchedules}
                            className="rounded-lg bg-[#111827] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {submitting ? 'Creating...' : 'Create Shipment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddShipment;