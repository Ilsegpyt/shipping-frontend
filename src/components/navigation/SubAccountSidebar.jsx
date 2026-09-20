import { NavLink } from 'react-router-dom';
import { FileText } from 'lucide-react';

const navigationItems = [
    {
        label: 'Reports',
        path: '/subaccount/reports',
        icon: FileText,
    },
];

export default function SubAccountSidebar() {
    return (
        <nav className="space-y-2 p-4">
            {navigationItems.map((item) => {
                const Icon = item.icon;

                return (
                    <NavLink
                        key={item.path}
                        to={item.path}
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