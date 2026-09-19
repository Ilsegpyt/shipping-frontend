import { useEffect, useMemo, useState } from 'react';
import {
    Bell,
    Check,
    CheckCheck,
    Clock,
    Loader2,
    Mail,
} from 'lucide-react';

import {
    getNotifications,
    markNotificationAsRead,
} from '../../services/notificationsService';

function formatNotificationDate(value) {
    if (!value) return '-';

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

function getRelativeTime(value) {
    if (!value) return '-';

    const date = new Date(value);
    const now = new Date();

    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(
        diffMs / (1000 * 60)
    );

    if (diffMinutes < 1) {
        return 'Just now';
    }

    if (diffMinutes < 60) {
        return `${diffMinutes} min ago`;
    }

    const diffHours = Math.floor(
        diffMinutes / 60
    );

    if (diffHours < 24) {
        return `${diffHours} hr${
            diffHours > 1 ? 's' : ''
        } ago`;
    }

    const diffDays = Math.floor(
        diffHours / 24
    );

    if (diffDays < 7) {
        return `${diffDays} day${
            diffDays > 1 ? 's' : ''
        } ago`;
    }

    return formatNotificationDate(value);
}

export default function CustomerNotifications() {
    const [notifications, setNotifications] =
        useState([]);

    const [selectedNotificationId, setSelectedNotificationId] =
        useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [markingAsRead, setMarkingAsRead] =
        useState(false);

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        try {
            setLoading(true);
            setError('');

            const result =
                await getNotifications();

            setNotifications(result ?? []);

            if (
                result?.length > 0 &&
                !selectedNotificationId
            ) {
                setSelectedNotificationId(
                    result[0].id
                );
            }
        } catch (err) {
            console.error(
                'Failed to load notifications:',
                err
            );

            setError(
                err?.response?.data?.message ??
                    err?.response?.data?.detail ??
                    'Unable to load notifications.'
            );
        } finally {
            setLoading(false);
        }
    };

    const unreadCount = useMemo(() => {
        return notifications.filter(
            (notification) =>
                !notification.isRead
        ).length;
    }, [notifications]);

    const selectedNotification = useMemo(() => {
        return notifications.find(
            (notification) =>
                notification.id ===
                selectedNotificationId
        );
    }, [
        notifications,
        selectedNotificationId,
    ]);

    const handleSelectNotification = async (
        notification
    ) => {
        setSelectedNotificationId(
            notification.id
        );

        if (
            notification.isRead ||
            markingAsRead
        ) {
            return;
        }

        try {
            setMarkingAsRead(true);

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
        } catch (err) {
            console.error(
                'Failed to mark notification as read:',
                err
            );
        } finally {
            setMarkingAsRead(false);
        }
    };

    const handleMarkSelectedAsRead = async () => {
        if (
            !selectedNotification ||
            selectedNotification.isRead
        ) {
            return;
        }

        try {
            setMarkingAsRead(true);

            await markNotificationAsRead(
                selectedNotification.id
            );

            setNotifications((current) =>
                current.map((item) =>
                    item.id ===
                    selectedNotification.id
                        ? {
                              ...item,
                              isRead: true,
                          }
                        : item
                )
            );
        } catch (err) {
            console.error(
                'Failed to mark notification as read:',
                err
            );
        } finally {
            setMarkingAsRead(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <section className="space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Notifications
                    </h1>

                    <p className="mt-2 text-gray-500">
                        Stay up to date with your
                        shipment and account activity.
                    </p>
                </div>

                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            </section>
        );
    }

    return (
        <section className="space-y-6">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                            <Bell className="h-6 w-6" />
                        </div>

                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900">
                                Notifications
                            </h1>

                            <p className="mt-1 text-sm text-gray-500">
                                Stay up to date with your
                                shipment and account
                                activity.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                        Unread
                    </p>

                    <p className="mt-1 text-xl font-semibold text-gray-900">
                        {unreadCount}
                    </p>
                </div>
            </div>

            {/* Empty State */}
            {notifications.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                        <Bell className="h-7 w-7" />
                    </div>

                    <h2 className="mt-4 text-lg font-semibold text-gray-900">
                        No notifications
                    </h2>

                    <p className="mt-2 text-sm text-gray-500">
                        You are all caught up.
                    </p>
                </div>
            ) : (
                /* Master / Detail */
                <div className="grid min-h-[560px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:grid-cols-[360px_1fr]">
                    {/* Notification List */}
                    <div className="border-b border-gray-200 lg:border-b-0 lg:border-r">
                        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                            <div>
                                <h2 className="font-semibold text-gray-900">
                                    All Notifications
                                </h2>

                                <p className="mt-1 text-xs text-gray-500">
                                    {notifications.length}{' '}
                                    notification
                                    {notifications.length !==
                                    1
                                        ? 's'
                                        : ''}
                                </p>
                            </div>

                            <Mail className="h-5 w-5 text-gray-400" />
                        </div>

                        <div className="max-h-[600px] overflow-y-auto">
                            {notifications.map(
                                (notification) => {
                                    const isSelected =
                                        notification.id ===
                                        selectedNotificationId;

                                    return (
                                        <button
                                            key={
                                                notification.id
                                            }
                                            type="button"
                                            onClick={() =>
                                                handleSelectNotification(
                                                    notification
                                                )
                                            }
                                            className={`w-full border-b border-gray-100 px-5 py-4 text-left transition ${
                                                isSelected
                                                    ? 'bg-blue-50'
                                                    : 'hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className="flex gap-3">
                                                <div
                                                    className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                                                        notification.isRead
                                                            ? 'bg-slate-100 text-slate-400'
                                                            : 'bg-blue-100 text-blue-600'
                                                    }`}
                                                >
                                                    {notification.isRead ? (
                                                        <Check className="h-4 w-4" />
                                                    ) : (
                                                        <Bell className="h-4 w-4" />
                                                    )}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p
                                                            className={`line-clamp-2 text-sm ${
                                                                notification.isRead
                                                                    ? 'font-medium text-gray-700'
                                                                    : 'font-semibold text-gray-900'
                                                            }`}
                                                        >
                                                            {
                                                                notification.title
                                                            }
                                                        </p>

                                                        {!notification.isRead && (
                                                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                                                        )}
                                                    </div>

                                                    <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                                                        {
                                                            notification.message
                                                        }
                                                    </p>

                                                    <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                                                        <Clock className="h-3 w-3" />

                                                        {getRelativeTime(
                                                            notification.createdAtUtc
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                }
                            )}
                        </div>
                    </div>

                    {/* Notification Details */}
                    <div className="flex flex-col">
                        {selectedNotification ? (
                            <>
                                <div className="border-b border-gray-200 px-6 py-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3">
                                            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                                                <Bell className="h-5 w-5" />
                                            </div>

                                            <div>
                                                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                                    Notification
                                                </p>

                                                <h2 className="mt-1 text-lg font-semibold text-gray-900">
                                                    {
                                                        selectedNotification.title
                                                    }
                                                </h2>

                                                <div className="mt-2 flex items-center gap-1 text-sm text-gray-500">
                                                    <Clock className="h-4 w-4" />

                                                    {formatNotificationDate(
                                                        selectedNotification.createdAtUtc
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {!selectedNotification.isRead && (
                                            <button
                                                type="button"
                                                onClick={
                                                    handleMarkSelectedAsRead
                                                }
                                                disabled={
                                                    markingAsRead
                                                }
                                                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {markingAsRead ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <CheckCheck className="h-4 w-4" />
                                                )}

                                                Mark as Read
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 px-6 py-8">
                                    <div className="max-w-3xl">
                                        <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">
                                            {
                                                selectedNotification.message
                                            }
                                        </p>
                                    </div>
                                </div>

                                <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span>
                                            Status
                                        </span>

                                        <span
                                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ${
                                                selectedNotification.isRead
                                                    ? 'bg-slate-100 text-slate-600'
                                                    : 'bg-blue-100 text-blue-700'
                                            }`}
                                        >
                                            <span className="h-1.5 w-1.5 rounded-full bg-current" />

                                            {selectedNotification.isRead
                                                ? 'Read'
                                                : 'Unread'}
                                        </span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-1 items-center justify-center px-6 text-center">
                                <div>
                                    <Bell className="mx-auto h-10 w-10 text-gray-300" />

                                    <p className="mt-3 text-sm text-gray-500">
                                        Select a notification
                                        to view its details.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}