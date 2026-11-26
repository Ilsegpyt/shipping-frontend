import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';

import ilsLogo from '../../assets/branding/ils-logo-horizontal.png';
import UserMenu from '../navigation/UserMenu';
import '../dashboard/internal-portal-theme.css';

export default function PortalLayout({
    Sidebar,
    headerActions = null,
    portalNotice = null,
    profilePath = undefined,
    onEndImpersonation = undefined,
    mainClassName = '',
    portalClassName = '',
}) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(() => {
        try {
            return localStorage.getItem('portal_desktop_sidebar_collapsed') === 'true';
        } catch {
            return false;
        }
    });
    const location = useLocation();

    const toggleDesktopSidebar = () => {
        setIsDesktopCollapsed((prev) => {
            const next = !prev;
            try {
                localStorage.setItem('portal_desktop_sidebar_collapsed', String(next));
            } catch {}
            return next;
        });
    };

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        if (!mobileMenuOpen) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setMobileMenuOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [mobileMenuOpen]);


    const sidebarContent = (
        <>
            <div className="ils-portal-sidebar-brand flex h-20 shrink-0 items-center justify-between border-b px-5">
                <Link
                    to="/"
                    className="block"
                    onClick={() => setMobileMenuOpen(false)}
                >
                    <img
                        src={ilsLogo}
                        alt="International Logistics System"
                        className="h-11 w-auto object-contain"
                    />
                </Link>

                {/* Desktop Collapse Button */}
                <button
                    type="button"
                    onClick={toggleDesktopSidebar}
                    className="ils-portal-sidebar-control hidden md:flex items-center justify-center w-8 h-8 transition cursor-pointer"
                    title="طي القائمة الجانبية لتوسيع الشاشة (Collapse)"
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <Sidebar />
            </div>
        </>
    );

    return (
        <div className={`ils-portal min-h-screen bg-brand-bg text-brand-text ${portalClassName}`}>
            {/* Desktop Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-30 hidden w-64 flex-col ils-portal-sidebar border-r transition-transform duration-300 ease-in-out md:flex ${
                    isDesktopCollapsed ? '-translate-x-full' : 'translate-x-0'
                }`}
            >
                {sidebarContent}
            </aside>

            {/* Desktop Floating Open Button (when sidebar is collapsed) */}
            {isDesktopCollapsed && (
                <button
                    type="button"
                    onClick={toggleDesktopSidebar}
                    className="fixed left-0 top-24 z-40 hidden md:flex items-center justify-center w-6 h-12 ils-portal-sidebar-control ils-portal-sidebar ils-portal-shadow border-y border-r hover:w-8 transition-all cursor-pointer group"
                    title="إظهار القائمة الجانبية (Expand Sidebar)"
                >
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
            )}

            {/* Mobile Sidebar */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <button
                        type="button"
                        aria-label="Close navigation menu"
                        className="absolute inset-0 ils-portal-backdrop backdrop-blur-sm"
                        onClick={() => setMobileMenuOpen(false)}
                    />

                    <aside
                        id="mobile-portal-sidebar"
                        className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col ils-portal-sidebar border-r ils-portal-shadow"
                    >
                        <div className="absolute right-3 top-5 z-10">
                            <button
                                type="button"
                                aria-label="Close navigation menu"
                                onClick={() => setMobileMenuOpen(false)}
                                className="ils-portal-sidebar-control p-2 transition"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {sidebarContent}
                    </aside>
                </div>
            )}

            {/* Main Content */}
            <div
                className={`min-h-screen min-w-0 transition-all duration-300 ease-in-out ${
                    isDesktopCollapsed ? 'md:ml-0' : 'md:ml-64'
                }`}
            >
                <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between gap-3 border-b border-brand-border bg-brand-surface px-4 py-3 ils-portal-header-shadow backdrop-blur sm:px-6">
                    <div className="flex items-center gap-3">
                        {/* Mobile Menu Button */}
                        <button
                            type="button"
                            aria-label="Open navigation menu"
                            aria-controls="mobile-portal-sidebar"
                            aria-expanded={mobileMenuOpen}
                            onClick={() => setMobileMenuOpen(true)}
                            className="ils-portal-header-control shrink-0 p-2 transition md:hidden"
                        >
                            <Menu className="h-5 w-5" />
                        </button>

                        {/* Desktop Expand Button when collapsed */}
                        {isDesktopCollapsed && (
                            <button
                                type="button"
                                onClick={toggleDesktopSidebar}
                                className="ils-portal-header-control hidden md:inline-flex items-center gap-1.5 border border-brand-border bg-brand-bg px-3 py-1.5 text-xs font-semibold transition cursor-pointer "
                                title="إظهار القائمة الجانبية (Expand)"
                            >
                                <ChevronRight className="h-4 w-4 text-brand-muted" />
                                <span>القائمة الجانبية</span>
                            </button>
                        )}
                    </div>

                    <div className="flex min-w-0 items-center justify-end gap-2">
                        {headerActions}

                        <div className="hidden h-8 w-px bg-brand-border sm:block" />

                        <UserMenu profilePath={profilePath} onEndImpersonation={onEndImpersonation} />
                    </div>
                </header>

                {portalNotice}

                <main
                    className={`min-w-0 p-4 sm:p-6 lg:p-8 ${mainClassName}`}
                >
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
