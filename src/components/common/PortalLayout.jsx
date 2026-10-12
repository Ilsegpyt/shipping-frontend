import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

import ilsLogo from '../../assets/branding/ils-logo-horizontal.png';
import UserMenu from '../navigation/UserMenu';

export default function PortalLayout({
    Sidebar,
    headerActions = null,
    mainClassName = '',
}) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const location = useLocation();

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
            <div className="flex h-20 shrink-0 items-center justify-center border-b border-slate-800 px-6">
                <Link
                    to="/"
                    className="block"
                    onClick={() => setMobileMenuOpen(false)}
                >
                    <img
                        src={ilsLogo}
                        alt="International Logistics System"
                        className="h-12 w-auto object-contain"
                    />
                </Link>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
                <Sidebar />
            </div>
        </>
    );

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            {/* Desktop Sidebar */}
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-800 bg-slate-900 md:flex">
                {sidebarContent}
            </aside>

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
            <div className="min-h-screen min-w-0 md:ml-64">
                <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:px-6 md:justify-end">
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
