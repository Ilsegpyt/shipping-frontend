import { useEffect, useState } from 'react';
import { MessageSquare, RefreshCw } from 'lucide-react';

import { getCustomerVoices } from '../../services/customerVoicesService';

const statusStyles = {
    Open: 'bg-blue-100 text-blue-700',
    InProgress: 'bg-yellow-100 text-yellow-700',
    Resolved: 'bg-green-100 text-green-700',
    Closed: 'bg-gray-100 text-gray-700',
};

export default function CustomerVoice() {
    const [voices, setVoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadCustomerVoices = async () => {
        try {
            setLoading(true);
            setError('');

            const result = await getCustomerVoices();

            setVoices(result ?? []);
        } catch (err) {
            console.error('Failed to load customer voices:', err);
            setError('Failed to load your Customer Voice requests.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCustomerVoices();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Customer Voice
                    </h1>

                    <p className="mt-1 text-gray-500">
                        View all your feedback and requests.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={loadCustomerVoices}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <RefreshCw
                        size={16}
                        className={loading ? 'animate-spin' : ''}
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
                        Loading your Customer Voice requests...
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
                        You have not created any Customer Voice requests yet.
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
                                            {voice.shipmentId}
                                        </td>

                                        <td className="whitespace-nowrap px-6 py-4">
                                            <span
                                                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusStyles[voice.status] ??
                                                    'bg-gray-100 text-gray-700'
                                                    }`}
                                            >
                                                {voice.status}
                                            </span>
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