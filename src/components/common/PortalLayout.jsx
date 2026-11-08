import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';

import ilsLogo from '../../assets/branding/ils-logo-horizontal.png';
import UserMenu from '../navigation/UserMenu';

export default function PortalLayout({
    Sidebar,
    headerActions = null,
    mainClassName = '',
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
            <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-800 px-5">
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
                    className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    title="طي القائمة الجانبية لتوسيع الشاشة (Collapse)"
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
                <Sidebar />
            </div>
        </>
    );

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            {/* Desktop Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-800 bg-slate-900 transition-transform duration-300 ease-in-out md:flex ${
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
                    className="fixed left-0 top-24 z-40 hidden md:flex items-center justify-center w-6 h-12 bg-slate-900 text-slate-300 hover:text-white rounded-r-xl shadow-lg border-y border-r border-slate-700 hover:w-8 transition-all cursor-pointer group"
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
                        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                        onClick={() => setMobileMenuOpen(false)}
                    />

                    <aside
                        id="mobile-portal-sidebar"
                        className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-slate-800 bg-slate-900 shadow-2xl"
                    >
                        <div className="absolute right-3 top-5 z-10">
                            <button
                                type="button"
                                aria-label="Close navigation menu"
                                onClick={() => setMobileMenuOpen(false)}
                                className="rounded-lg p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-400"
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
                <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:px-6">
                    <div className="flex items-center gap-3">
                        {/* Mobile Menu Button */}
                        <button
                            type="button"
                            aria-label="Open navigation menu"
                            aria-controls="mobile-portal-sidebar"
                            aria-expanded={mobileMenuOpen}
                            onClick={() => setMobileMenuOpen(true)}
                            className="shrink-0 rounded-lg p-2 text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300 md:hidden"
                        >
                            <Menu className="h-5 w-5" />
                        </button>

                        {/* Desktop Expand Button when collapsed */}
                        {isDesktopCollapsed && (
                            <button
                                type="button"
                                onClick={toggleDesktopSidebar}
                                className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer shadow-2xs"
                                title="إظهار القائمة الجانبية (Expand)"
                            >
                                <ChevronRight className="h-4 w-4 text-slate-500" />
                                <span>القائمة الجانبية</span>
                            </button>
                        )}
                    </div>

                    <div className="flex min-w-0 items-center justify-end gap-2">
                        {headerActions}

                        <div className="hidden h-8 w-px bg-slate-200 sm:block" />

                        <UserMenu />
                    </div>
                </header>

                <main
                    className={`min-w-0 p-4 sm:p-6 lg:p-8 ${mainClassName}`}
                >
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
