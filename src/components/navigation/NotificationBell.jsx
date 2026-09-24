import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
    getNotifications,
    markNotificationAsRead,
} from '../../services/notificationsService';

export default function NotificationBell() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [notifications, setNotifications] = useState([]);
    const [open, setOpen] = useState(false);

    const containerRef = useRef(null);

    const canViewNotifications =
        user?.permissions?.includes('notifications.view');

    const unreadNotifications = notifications
        .filter((notification) => !notification.isRead)
        .sort(
            (a, b) =>
                new Date(b.createdAtUtc) -
                new Date(a.createdAtUtc)
        );

    const recentNotifications = [...notifications]
        .sort(
            (a, b) =>
                new Date(b.createdAtUtc) -
                new Date(a.createdAtUtc)
        )
        .slice(0, 5);

    const notificationsToDisplay =
        unreadNotifications.length > 0
            ? unreadNotifications
            : recentNotifications;

    const unreadCount = unreadNotifications.length;

    const loadNotifications = async () => {
        try {
            const result = await getNotifications();

            setNotifications(
                Array.isArray(result) ? result : []
            );
        } catch (error) {
            console.error(
                'Failed to load notifications:',
                error
            );
        }
    };

    useEffect(() => {
        if (!canViewNotifications) {
            return;
        }

        loadNotifications();

        const interval = setInterval(
            loadNotifications,
            30000
        );

        return () => {
            clearInterval(interval);
        };
    }, [canViewNotifications]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target)
            ) {
                setOpen(false);
            }
        };

        document.addEventListener(
            'mousedown',
            handleClickOutside
        );

        return () => {
            document.removeEventListener(
                'mousedown',
                handleClickOutside
            );
        };
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

            setOpen(false);

            if (
                user?.tokenType === 'internal' &&
                notification.shipmentId
            ) {
                const params = new URLSearchParams();

                if (notification.customerVoiceId) {
                    params.set(
                        'customerVoiceId',
                        notification.customerVoiceId
                    );
                }

                const queryString = params.toString();

                const destination =
                    `/shipments/${notification.shipmentId}` +
                    (queryString
                        ? `?${queryString}`
                        : '');

                navigate(destination);

                return;
            }

            if (
                user?.tokenType !== 'internal' &&
                notification.shipmentId
            ) {
                const params = new URLSearchParams();

                if (notification.customerVoiceId) {
                    params.set(
                        'customerVoiceId',
                        notification.customerVoiceId
                    );
                }

                const queryString = params.toString();

                navigate(
                    `/customer/shipments/${notification.shipmentId}` +
                    (queryString
                        ? `?${queryString}`
                        : '') +
                    '#tracking'
                );
            }
        } catch (error) {
            console.error(
                'Failed to handle notification:',
                error
            );
        }
    };

    if (!canViewNotifications) {
        return null;
    }

    return (
        <div
            ref={containerRef}
            className="relative"
        >
            <button
                type="button"
                aria-label="Notifications"
                onClick={() => setOpen((value) => !value)}
                className="relative rounded-lg p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
            >
                <Bell className="h-5 w-5" />

                {unreadCount > 0 && (
                    <span
                        className="
                            absolute -right-0.5 -top-0.5
                            flex h-4 min-w-4 items-center justify-center
                            rounded-full bg-red-500 px-1
                            text-[10px] font-semibold leading-none text-white
                            ring-2 ring-white
                        "
                    >
                        {unreadCount > 99
                            ? '99+'
                            : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-full z-50 mt-2 w-96 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                    <div className="border-b border-gray-200 px-4 py-3">
                        <h3 className="text-sm font-semibold text-gray-900">
                            Notifications
                        </h3>

                        <p className="mt-1 text-xs text-gray-500">
                            {unreadCount > 0
                                ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
                                : 'No unread notifications'}
                        </p>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {notificationsToDisplay.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-gray-500">
                                No notifications.
                            </div>
                        ) : (
                            notificationsToDisplay.map(
                                (notification) => (
                                    <button
                                        key={notification.id}
                                        type="button"
                                        onClick={() =>
                                            handleNotificationClick(
                                                notification
                                            )
                                        }
                                        className={`w-full border-b border-gray-100 px-4 py-3 text-left transition hover:bg-gray-50 ${notification.isRead
                                            ? 'bg-white'
                                            : 'bg-blue-50/50'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <span
                                                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.isRead
                                                    ? 'bg-gray-300'
                                                    : 'bg-blue-600'
                                                    }`}
                                            />

                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {notification.title}
                                                </p>

                                                <p className="mt-1 text-xs leading-5 text-gray-600">
                                                    {notification.message}
                                                </p>

                                                <p className="mt-2 text-[11px] text-gray-400">
                                                    {new Date(
                                                        notification.createdAtUtc
                                                    ).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                )
                            )
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}