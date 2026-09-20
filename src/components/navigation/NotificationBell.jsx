import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { getNotifications } from '../../services/notificationsService';

export default function NotificationBell() {
    const { user } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);

    const canViewNotifications =
        user?.permissions?.includes('notifications.view');

    useEffect(() => {
        if (!canViewNotifications) {
            return;
        }

        let mounted = true;

        const loadUnreadCount = async () => {
            try {
                const notifications = await getNotifications();

                if (!mounted) {
                    return;
                }

                const unread = Array.isArray(notifications)
                    ? notifications.filter(
                        (notification) => !notification.isRead
                    )
                    : [];

                setUnreadCount(unread.length);
            } catch (error) {
                console.error(
                    'Failed to load notification count:',
                    error
                );
            }
        };

        loadUnreadCount();

        const interval = setInterval(
            loadUnreadCount,
            30000
        );

        const handleNotificationsRead = () => {
            setUnreadCount(0);
        };

        const handleNotificationsUpdated = () => {
            loadUnreadCount();
        };

        window.addEventListener(
            'notifications:read',
            handleNotificationsRead
        );

        window.addEventListener(
            'notifications:updated',
            handleNotificationsUpdated
        );

        return () => {
            mounted = false;

            clearInterval(interval);

            window.removeEventListener(
                'notifications:read',
                handleNotificationsRead
            );

            window.removeEventListener(
                'notifications:updated',
                handleNotificationsUpdated
            );
        };
    }, [canViewNotifications]);

    if (!canViewNotifications) {
        return null;
    }

    return (
        <button
            type="button"
            aria-label="Notifications"
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
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            )}
        </button>
    );
}