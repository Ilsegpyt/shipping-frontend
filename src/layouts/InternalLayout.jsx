import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { HelpCircle, X } from 'lucide-react';

import ilsLogo from '../assets/branding/ils-logo-horizontal.png';
import InternalSidebar from '../components/navigation/InternalSidebar';
import UserMenu from '../components/navigation/UserMenu';
import NotificationBell from '../components/navigation/NotificationBell';

export default function InternalLayout() {
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [selectedHelp, setSelectedHelp] = useState(null);

    const closeHelp = () => {
        setIsHelpOpen(false);
        setSelectedHelp(null);
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

                <InternalSidebar />
            </aside>

            <div className="ml-64 min-h-screen">
                <header className="flex h-20 items-center justify-end border-b border-gray-200 bg-white px-6">
                    <div className="flex items-center gap-2">
                        <NotificationBell />

                        <button
                            type="button"
                            aria-label="Help"
                            onClick={() => setIsHelpOpen(true)}
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
                    onClick={closeHelp}
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
                                onClick={closeHelp}
                                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Help Options */}
                        <div className="space-y-3 p-6">
                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedHelp('customers')
                                }
                                className="w-full rounded-xl border border-gray-200 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50"
                            >
                                <p className="text-sm font-semibold text-gray-900">
                                    Customers
                                </p>

                                <p className="mt-1 text-xs text-gray-500">
                                    Learn how to manage customers and their
                                    accounts.
                                </p>
                            </button>

                            <button
                                type="button"
                                className="w-full rounded-xl border border-gray-200 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50"
                            >
                                <p className="text-sm font-semibold text-gray-900">
                                    Schedules
                                </p>

                                <p className="mt-1 text-xs text-gray-500">
                                    Learn how to search, create, and manage
                                    shipping schedules.
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
                                    Learn how to view and manage shipments.
                                </p>
                            </button>

                            <button
                                type="button"
                                className="w-full rounded-xl border border-gray-200 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50"
                            >
                                <p className="text-sm font-semibold text-gray-900">
                                    Reports
                                </p>

                                <p className="mt-1 text-xs text-gray-500">
                                    Learn how to access and use system reports.
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

                        {/* Customers Help */}
                        {selectedHelp === 'customers' && (
                            <div className="border-t border-gray-200 px-6 py-5">
                                <h3 className="text-base font-semibold text-gray-900">
                                    Customers
                                </h3>

                                <p className="mt-2 text-sm leading-6 text-gray-500">
                                    Manage customer accounts, view customer
                                    information, and access customer-related
                                    operations from the Customers section.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}