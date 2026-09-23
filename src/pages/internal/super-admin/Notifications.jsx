import { useEffect, useState } from 'react';
import { Bell, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import {
    getNotifications,
    markNotificationAsRead,
} from '../../../services/notificationsService';

export default function Notifications() {
    const navigate = useNavigate();

    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadNotifications = async () => {
        try {
            setLoading(true);
            setError('');

            const result = await getNotifications();

            const items = Array.isArray(result)
                ? [...result].sort(
                    (a, b) =>
                        new Date(b.createdAtUtc) -
                        new Date(a.createdAtUtc)
                )
                : [];

            setNotifications(items);
        } catch (err) {
            console.error(
                'Failed to load notifications:',
                err
            );

            setError('Failed to load notifications.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNotifications();
    }, []);

    const handleNotificationClick = async (notification) => {
        try {
            if (!notification.isRead) {
                await markNotificationAsRead(
                    notification.id
                );

                setNotifications((current) =>
                    current.map((item) =>
                        item.id === notification.id
                            ? {
                                ...item,
                                isRead: true,
                            }
                            : item
                    )
                );
            }

            if (notification.shipmentId) {
                const params = new URLSearchParams();

                if (notification.customerVoiceId) {
                    params.set(
                        'customerVoiceId',
                        notification.customerVoiceId
                    );
                }

                const queryString = params.toString();

                navigate(
                    `/shipments/${notification.shipmentId}` +
                    (queryString
                        ? `?${queryString}`
                        : '')
                );
            }
        } catch (err) {
            console.error(
                'Failed to handle notification:',
                err
            );
        }
    };

    const unreadCount = notifications.filter(
        (notification) => !notification.isRead
    ).length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Notifications
                    </h1>

                    <p className="mt-1 text-sm text-gray-500">
                        View all notifications and notification history.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={loadNotifications}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
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

            <div className="rounded-xl border border-gray-200 bg-white">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Bell
                            size={20}
                            className="text-gray-500"
                        />

                        <div>
                            <h2 className="text-sm font-semibold text-gray-900">
                                Notification History
                            </h2>

                            <p className="mt-1 text-xs text-gray-500">
                                {notifications.length}{' '}
                                notification
                                {notifications.length === 1
                                    ? ''
                                    : 's'}
                            </p>
                        </div>
                    </div>

                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                        {unreadCount} unread
                    </span>
                </div>

                {loading ? (
                    <div className="px-6 py-12 text-center text-sm text-gray-500">
                        Loading notifications...
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <Bell
                            size={40}
                            className="mx-auto text-gray-300"
                        />

                        <h3 className="mt-4 text-sm font-semibold text-gray-900">
                            No notifications
                        </h3>

                        <p className="mt-1 text-sm text-gray-500">
                            You don't have any notifications yet.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {notifications.map((notification) => (
                            <button
                                key={notification.id}
                                type="button"
                                onClick={() =>
                                    handleNotificationClick(
                                        notification
                                    )
                                }
                                className={`w-full px-6 py-4 text-left transition hover:bg-gray-50 ${notification.isRead
                                        ? 'bg-white'
                                        : 'bg-blue-50/40'
                                    }`}
                            >
                                <div className="flex items-start gap-4">
                                    <span
                                        className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${notification.isRead
                                                ? 'bg-gray-300'
                                                : 'bg-blue-600'
                                            }`}
                                    />

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-4">
                                            <h3 className="text-sm font-semibold text-gray-900">
                                                {notification.title}
                                            </h3>

                                            <span className="shrink-0 text-xs text-gray-400">
                                                {new Date(
                                                    notification.createdAtUtc
                                                ).toLocaleString()}
                                            </span>
                                        </div>

                                        <p className="mt-1 text-sm leading-6 text-gray-600">
                                            {notification.message}
                                        </p>

                                        {!notification.isRead && (
                                            <span className="mt-2 inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                                                Unread
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
