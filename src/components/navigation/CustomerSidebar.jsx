import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    Users,
    FileText,
    Bell,
    MessageSquare,
} from 'lucide-react';

import {
    getNotifications,
    markNotificationAsRead,
} from '../../services/notificationsService';

const navigationItems = [
    {
        label: 'Dashboard',
        path: '/customer',
        icon: LayoutDashboard,
    },
    {
        label: 'My Shipments',
        path: '/customer/shipments',
        icon: Package,
    },
    {
        label: 'Team Access',
        path: '/customer/team-access',
        icon: Users,
    },
    {
        label: 'Reports',
        path: '/customer/reports',
        icon: FileText,
    },
    {
        label: 'Notifications',
        path: '/customer/notifications',
        icon: Bell,
    },
    {
        label: 'Customer Voice',
        path: '/customer/voice',
        icon: MessageSquare,
    },
];

export default function CustomerSidebar() {
    const handleNotificationsClick = async () => {
        try {
            const notifications = await getNotifications();

            if (!Array.isArray(notifications)) {
                return;
            }

            const unreadNotifications = notifications.filter(
                (notification) => !notification.isRead
            );

            await Promise.all(
                unreadNotifications.map((notification) =>
                    markNotificationAsRead(notification.id)
                )
            );

            window.dispatchEvent(
                new CustomEvent('notifications:read')
            );
        } catch (error) {
            console.error(
                'Failed to mark notifications as read:',
                error
            );
        }
    };

    return (
        <nav className="space-y-2 p-4">
            {navigationItems.map((item) => {
                const Icon = item.icon;

                const isNotifications =
                    item.path === '/customer/notifications';

                return (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/customer'}
                        onClick={
                            isNotifications
                                ? handleNotificationsClick
                                : undefined
                        }
                        className={({ isActive }) =>
                            [
                                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition',
                                isActive
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                            ].join(' ')
                        }
                    >
                        <Icon className="h-5 w-5" />
                        <span>{item.label}</span>
                    </NavLink>
                );
            })}
        </nav>
    );
}