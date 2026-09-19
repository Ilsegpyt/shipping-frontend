import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    Users,
    FileText,
    Bell,
    MessageSquare,
} from 'lucide-react';

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
    return (
        <nav className="space-y-2 p-4">
            {navigationItems.map((item) => {
                const Icon = item.icon;

                return (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/customer'}
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