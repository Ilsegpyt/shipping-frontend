import {
    LayoutDashboard,
    Users,
    Building2,
    UserRoundCog,
    CalendarDays,
    Ship,
    FileText,
    Bell,
    History,
} from "lucide-react";

import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { getInternalNavigation } from './internalNavigation';

import {
    getNotifications,
    markNotificationAsRead,
} from '../../services/notificationsService';

export default function InternalSidebar() {
    const { user } = useAuth();
    const internalNavigation = getInternalNavigation(user);

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
        <nav className="relative flex h-[calc(100vh-5rem)] flex-col overflow-hidden">
            {/* Navigation */}
            <div className="relative z-10 space-y-6 overflow-y-auto p-4">
                {internalNavigation.map((section) => {
                    const visibleItems = (section.items ?? []).filter(
                        (item) =>
                            !item.permission ||
                            user?.permissions?.includes(item.permission)
                    );

                    if (visibleItems.length === 0) return null;

                    return (
                        <div key={section.section}>
                            <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                {section.section}
                            </p>

                            <div className="space-y-1">
                                {visibleItems.map((item) => {
                                    const Icon = item.icon;

                                    return (
                                        <NavLink
                                            key={item.path}
                                            to={item.path}
                                            onClick={
                                                item.path === '/notifications'
                                                    ? handleNotificationsClick
                                                    : undefined
                                            }
                                            className={({ isActive }) =>
                                                `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                                                    isActive
                                                        ? 'bg-slate-800 text-white'
                                                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                                }`
                                            }
                                        >
                                            <Icon className="h-5 w-5 shrink-0" />
                                            <span>{item.label}</span>
                                        </NavLink>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* World Map */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 overflow-hidden">
                <div
                    className="absolute inset-0 bg-[url('/world-map.svg')] bg-bottom bg-no-repeat opacity-[0.08]"
                    style={{ backgroundSize: '130% auto' }}
                />

                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-900 to-transparent" />
            </div>
        </nav>
    );
}