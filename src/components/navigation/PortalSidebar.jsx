import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

export default function PortalSidebar({ title, navigationSections, user, initialOpenGroups = {} }) {
    const location = useLocation();
    const [openSubGroups, setOpenSubGroups] = useState(() => initialOpenGroups);

    useEffect(() => {
        navigationSections.forEach((section) => {
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
    }, [location.pathname, navigationSections]);

    const toggleSubGroup = (label) => {
        setOpenSubGroups((prev) => ({
            ...prev,
            [label]: !prev[label],
        }));
    };

    return (
        <nav aria-label={title} className="ils-internal-nav relative flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* Navigation */}
            <div className="ils-branded-scrollbar relative z-10 min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
                {navigationSections.map((section) => {
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
                            <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider ils-portal-nav-label">
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
                                                    aria-expanded={isGroupOpen}
                                                    className={`ils-portal-nav-item ils-portal-nav-group ${hasActiveChild ? 'ils-portal-nav-active' : ''}`}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <Icon className="h-5 w-5 shrink-0 ils-portal-nav-icon" />
                                                        <span className="truncate">{item.label}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {item.badge && (
                                                            <span className="ils-portal-nav-badge px-1.5 py-0.5 text-[10px] font-medium border">
                                                                {item.badge}
                                                            </span>
                                                        )}
                                                        {visibleSubs.length > 0 && (
                                                            <ChevronDown
                                                                className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                                                                    isGroupOpen ? 'rotate-180' : ''
                                                                }`}
                                                            />
                                                        )}
                                                    </div>
                                                </button>

                                                {isGroupOpen && visibleSubs.length > 0 && (
                                                    <div className="ils-portal-nav-subgroup ml-5 space-y-1 border-l-2 pl-3 pt-1 transition-all">
                                                        {visibleSubs.map((subItem) => {
                                                            const SubIcon = subItem.icon;
                                                            return (
                                                                <NavLink
                                                                    key={subItem.path}
                                                                    to={subItem.path}
                                                                    className="ils-portal-nav-item ils-portal-nav-subitem"
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
                                                className="ils-portal-nav-item ils-portal-nav-disabled" aria-disabled="true"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <Icon className="h-5 w-5 shrink-0" />
                                                    <span className="truncate">{item.label}</span>
                                                </div>
                                                {item.badge && (
                                                    <span className="ils-portal-nav-badge px-1.5 py-0.5 text-[10px] font-medium border">
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
                                            end={item.end}
                                            className="ils-portal-nav-item"
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
        </nav>
    );
}
