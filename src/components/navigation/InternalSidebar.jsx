import { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { getInternalNavigation } from './internalNavigation';

export default function InternalSidebar() {
    const { user } = useAuth();
    const location = useLocation();
    const internalNavigation = useMemo(() => getInternalNavigation(user), [user]);

    const [openSubGroups, setOpenSubGroups] = useState(() => ({
        Trucking: true,
    }));

    useEffect(() => {
        internalNavigation.forEach((section) => {
            (section.items ?? []).forEach((item) => {
                if (item.subItems) {
                    const hasActiveChild = item.subItems.some((sub) => sub.path === location.pathname);
                    if (hasActiveChild) {
                        setOpenSubGroups((prev) => {
                            if (prev[item.label]) return prev;
                            return { ...prev, [item.label]: true };
                        });
                    }
                }
            });
        });
    }, [location.pathname, internalNavigation]);

    const toggleSubGroup = (label) => {
        setOpenSubGroups((prev) => ({
            ...prev,
            [label]: !prev[label],
        }));
    };

    return (
        <nav className="relative flex h-[calc(100vh-5rem)] flex-col overflow-hidden">
            {/* Navigation */}
            <div className="relative z-10 space-y-6 overflow-y-auto p-4">
                {internalNavigation.map((section) => {
                    const visibleItems = (section.items ?? []).filter((item) => {
                        if (item.subItems) {
                            const visibleSubs = item.subItems.filter((sub) => {
                                if (typeof sub.isVisible === 'function') {
                                    return sub.isVisible(user);
                                }
                                return !sub.permission || user?.permissions?.includes(sub.permission);
                            });
                            return visibleSubs.length > 0 || !!item.badge;
                        }
                        if (typeof item.isVisible === 'function') {
                            return item.isVisible(user);
                        }
                        return (
                            !item.permission ||
                            user?.permissions?.includes(item.permission)
                        );
                    });

                    if (visibleItems.length === 0) return null;

                    return (
                        <div key={section.section}>
                            <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                {section.section}
                            </p>

                            <div className="space-y-1">
                                {visibleItems.map((item) => {
                                    const Icon = item.icon;

                                    // Render SubGroup (e.g. Trucking)
                                    if (Array.isArray(item.subItems) && item.subItems.length > 0) {
                                        const visibleSubs = item.subItems.filter((sub) => {
                                            if (typeof sub.isVisible === 'function') {
                                                return sub.isVisible(user);
                                            }
                                            return !sub.permission || user?.permissions?.includes(sub.permission);
                                        });

                                        const isGroupOpen = !!openSubGroups[item.label];
                                        const hasActiveChild = visibleSubs.some((sub) => sub.path === location.pathname);

                                        return (
                                            <div key={item.label} className="space-y-1">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleSubGroup(item.label)}
                                                    className={`flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium transition cursor-pointer ${
                                                        hasActiveChild
                                                            ? 'bg-slate-800 text-white font-semibold'
                                                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <Icon className={`h-5 w-5 shrink-0 ${hasActiveChild ? 'text-sky-400' : 'text-slate-400'}`} />
                                                        <span className="truncate">{item.label}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {item.badge && (
                                                            <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 border border-slate-700">
                                                                {item.badge}
                                                            </span>
                                                        )}
                                                        {visibleSubs.length > 0 && (
                                                            <ChevronDown
                                                                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                                                                    isGroupOpen ? 'rotate-180' : ''
                                                                }`}
                                                            />
                                                        )}
                                                    </div>
                                                </button>

                                                {isGroupOpen && visibleSubs.length > 0 && (
                                                    <div className="ml-5 space-y-1 border-l-2 border-sky-500/30 pl-3 pt-1 transition-all">
                                                        {visibleSubs.map((subItem) => {
                                                            const SubIcon = subItem.icon;
                                                            return (
                                                                <NavLink
                                                                    key={subItem.path}
                                                                    to={subItem.path}
                                                                    className={({ isActive }) =>
                                                                        `flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                                                                            isActive
                                                                                ? 'bg-sky-950/80 text-sky-300 font-bold border border-sky-800/60 shadow-2xs'
                                                                                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                                                        }`
                                                                    }
                                                                >
                                                                    <SubIcon className="h-4 w-4 shrink-0" />
                                                                    <span className="truncate">{subItem.label}</span>
                                                                </NavLink>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }

                                    // Standalone item without path (e.g. Coming Soon placeholder)
                                    if (!item.path) {
                                        return (
                                            <div
                                                key={item.label}
                                                className="flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium text-slate-500 cursor-not-allowed select-none opacity-80"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <Icon className="h-5 w-5 shrink-0 text-slate-500" />
                                                    <span className="truncate">{item.label}</span>
                                                </div>
                                                {item.badge && (
                                                    <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 border border-slate-700">
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    }

                                    // Standard Direct Item
                                    return (
                                        <NavLink
                                            key={item.path}
                                            to={item.path}
                                            className={({ isActive }) =>
                                                `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition ${isActive
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