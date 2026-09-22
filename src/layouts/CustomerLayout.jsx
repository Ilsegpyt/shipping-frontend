import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { HelpCircle, X, LogOut } from 'lucide-react';

import ilsLogo from '../assets/branding/ils-logo-horizontal.png';
import CustomerSidebar from '../components/navigation/CustomerSidebar';
import UserMenu from '../components/navigation/UserMenu';
import NotificationBell from '../components/navigation/NotificationBell';
import { useAuth } from '../auth/AuthContext';

export default function CustomerLayout() {
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    const { impersonation, endImpersonation } = useAuth();
    const navigate = useNavigate();

    const handleEndImpersonation = async () => {
        try {
            await endImpersonation();
            navigate('/dashboard');
        } catch (error) {
            console.error('Failed to end impersonation:', error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <aside className="fixed inset-y-0 left-0 w-64 bg-slate-900">
                {/* Logo Area */}
                <div className="flex h-20 items-center justify-center border-b border-slate-800 px-6">
                    <img
                        src={ilsLogo}
                        alt="International Logistics System"
                        className="h-12 w-auto object-contain"
                    />
                </div>

                <CustomerSidebar />
            </aside>

            <div className="ml-64 min-h-screen">
                <header className="flex h-20 items-center justify-end border-b border-gray-200 bg-white px-6">
                    <div className="flex items-center gap-2">
                        {impersonation && (
                            <button
                                type="button"
                                onClick={handleEndImpersonation}
                                className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                            >
                                <LogOut className="h-4 w-4" />
                                End Impersonation
                            </button>
                        )}

                        <NotificationBell />

                        <button
                            type="button"
                            aria-label="Help"
                            onClick={() => {
                                setIsHelpOpen(true);
                            }}
                            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
                        >
                            <HelpCircle className="h-5 w-5" />
                        </button>

                        <div className="mx-2 h-8 w-px bg-gray-200" />

                        <UserMenu />
                    </div>
                </header>

                <main className="p-6">
                    <Outlet />
                </main>
            </div>

            {/* Help Center Modal */}
            {isHelpOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
                    onClick={() => setIsHelpOpen(false)}
                >
                    <div
                        className="w-full max-w-lg rounded-2xl bg-white shadow-xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Help Center
                                </h2>

                                <p className="mt-1 text-sm text-gray-500">
                                    Find help with the shipping portal.
                                </p>
                            </div>

                            <button
                                type="button"
                                aria-label="Close Help Center"
                                onClick={() => setIsHelpOpen(false)}
                                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Help Options */}
                        <div className="space-y-3 p-6">
                            <button
                                type="button"
                                className="w-full rounded-xl border border-gray-200 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50"
                            >
                                <p className="text-sm font-semibold text-gray-900">
                                    How to Search for Schedules
                                </p>

                                <p className="mt-1 text-xs text-gray-500">
                                    Learn how to search available shipping
                                    schedules.
                                </p>
                            </button>

                            <button
                                type="button"
                                className="w-full rounded-xl border border-gray-200 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50"
                            >
                                <p className="text-sm font-semibold text-gray-900">
                                    Shipments
                                </p>

                                <p className="mt-1 text-xs text-gray-500">
                                    Learn how to view and manage your shipments.
                                </p>
                            </button>

                            <button
                                type="button"
                                className="w-full rounded-xl border border-gray-200 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50"
                            >
                                <p className="text-sm font-semibold text-gray-900">
                                    Tracking
                                </p>

                                <p className="mt-1 text-xs text-gray-500">
                                    Learn how to track your shipments and routes.
                                </p>
                            </button>

                            <button
                                type="button"
                                className="w-full rounded-xl border border-gray-200 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50"
                            >
                                <p className="text-sm font-semibold text-gray-900">
                                    Notifications
                                </p>

                                <p className="mt-1 text-xs text-gray-500">
                                    Learn how to view and manage notifications.
                                </p>
                            </button>

                            <button
                                type="button"
                                className="w-full rounded-xl border border-gray-200 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50"
                            >
                                <p className="text-sm font-semibold text-gray-900">
                                    Contact Support
                                </p>

                                <p className="mt-1 text-xs text-gray-500">
                                    Need help? Contact the support team.
                                </p>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
