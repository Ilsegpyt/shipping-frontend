import { Bell } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

export default function NotificationBell() {
    const { user } = useAuth();

    const canViewNotifications =
        user?.permissions?.includes('notifications.view');

    if (!canViewNotifications) {
        return null;
    }

    return (
        <button
            type="button"
            aria-label="Notifications"
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
        >
            <Bell className="h-5 w-5" />
        </button>
    );
}