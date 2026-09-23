import { useEffect, useState } from 'react';
import {
    MessageSquare,
    RefreshCw,
} from 'lucide-react';

import {
    getCustomerVoices,
    updateCustomerVoiceStatus,
} from '../../../services/customerVoicesService';

const STATUS_OPTIONS = [
    {
        value: 0,
        label: 'Open',
    },
    {
        value: 1,
        label: 'In Progress',
    },
    {
        value: 2,
        label: 'Resolved',
    },
    {
        value: 3,
        label: 'Closed',
    },
];

const STATUS_MAP = {
    open: 0,
    inprogress: 1,
    resolved: 2,
    closed: 3,
};

const normalizeStatus = (status) => {
    if (typeof status === 'number') {
        return status;
    }

    if (typeof status === 'string') {
        const trimmedStatus = status.trim();

        if (trimmedStatus === '') {
            return 0;
        }

        const numericStatus = Number(trimmedStatus);

        if (!Number.isNaN(numericStatus)) {
            return numericStatus;
        }

        const normalizedName = trimmedStatus
            .replace(/[_\s-]/g, '')
            .toLowerCase();

        return STATUS_MAP[normalizedName] ?? 0;
    }

    return 0;
};

const getStatusLabel = (status) => {
    const normalizedStatus = normalizeStatus(status);

    const option = STATUS_OPTIONS.find(
        (item) => item.value === normalizedStatus
    );

    return option?.label ?? 'Unknown';
};

export default function CustomerVoices() {
    const [voices, setVoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [updatingVoiceId, setUpdatingVoiceId] = useState(null);

    const loadCustomerVoices = async () => {
        try {
            setLoading(true);
            setError('');

            const result = await getCustomerVoices();

            setVoices(
                (result ?? []).map((voice) => ({
                    ...voice,
                    status: normalizeStatus(voice.status),
                }))
            );
        } catch (err) {
            console.error(
                'Failed to load customer voices:',
                err
            );

            setError(
                'Failed to load Customer Voice requests.'
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCustomerVoices();
    }, []);

    const handleStatusChange = async (voiceId, newStatus) => {
        const previousVoices = voices;

        try {
            setUpdatingVoiceId(voiceId);
            setError('');

            setVoices((current) =>
                current.map((voice) =>
                    voice.id === voiceId
                        ? {
                            ...voice,
                            status: Number(newStatus),
                        }
                        : voice
                )
            );

            await updateCustomerVoiceStatus(
                voiceId,
                Number(newStatus)
            );
        } catch (err) {
            console.error(
                'Failed to update customer voice status:',
                err
            );

            setVoices(previousVoices);

            setError(
                err?.response?.data?.message ??
                err?.response?.data?.detail ??
                'Failed to update Customer Voice status.'
            );
        } finally {
            setUpdatingVoiceId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Customer Voice
                    </h1>

                    <p className="mt-1 text-gray-500">
                        View customer feedback and requests.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={loadCustomerVoices}
                    disabled={loading || updatingVoiceId !== null}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <RefreshCw
                        size={16}
                        className={
                            loading
                                ? 'animate-spin'
                                : ''
                        }
                    />

                    Refresh
                </button>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
                    <p className="text-gray-500">
                        Loading Customer Voice requests...
                    </p>
                </div>
            ) : voices.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
                    <MessageSquare
                        size={40}
                        className="mx-auto text-gray-400"
                    />

                    <h2 className="mt-4 text-lg font-medium text-gray-900">
                        No requests yet
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                        No Customer Voice requests have been created yet.
                    </p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Subject
                                    </th>

                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Customer
                                    </th>

                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Shipment
                                    </th>

                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Status
                                    </th>

                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                                        Created
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-200 bg-white">
                                {voices.map((voice) => (
                                    <tr key={voice.id}>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">
                                                {voice.subject}
                                            </div>

                                            <div className="mt-1 max-w-md truncate text-sm text-gray-500">
                                                {voice.message}
                                            </div>
                                        </td>

                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                                            {voice.customerId}
                                        </td>

                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                                            {voice.shipmentId}
                                        </td>

                                        <td className="whitespace-nowrap px-6 py-4">
                                            <select
                                                value={normalizeStatus(voice.status)}
                                                onChange={(event) =>
                                                    handleStatusChange(
                                                        voice.id,
                                                        event.target.value
                                                    )
                                                }
                                                disabled={
                                                    updatingVoiceId ===
                                                    voice.id
                                                }
                                                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-70"
                                            >
                                                {STATUS_OPTIONS.map(
                                                    (option) => (
                                                        <option
                                                            key={
                                                                option.value
                                                            }
                                                            value={
                                                                option.value
                                                            }
                                                        >
                                                            {
                                                                option.label
                                                            }
                                                        </option>
                                                    )
                                                )}
                                            </select>

                                            {updatingVoiceId ===
                                                voice.id && (
                                                    <span className="ml-2 text-xs text-gray-500">
                                                        Saving...
                                                    </span>
                                                )}

                                            {updatingVoiceId !==
                                                voice.id &&
                                                !STATUS_OPTIONS.some(
                                                    (option) =>
                                                        option.value ===
                                                        normalizeStatus(
                                                            voice.status
                                                        )
                                                ) && (
                                                    <span className="ml-2 text-xs text-gray-500">
                                                        {
                                                            getStatusLabel(
                                                                voice.status
                                                            )
                                                        }
                                                    </span>
                                                )}
                                        </td>

                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                            {new Date(
                                                voice.createdAtUtc
                                            ).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
