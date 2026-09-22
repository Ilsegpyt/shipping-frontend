import { Outlet } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';

import ilsLogo from '../assets/branding/ils-logo-horizontal.png';
import SubAccountSidebar from '../components/navigation/SubAccountSidebar';
import UserMenu from '../components/navigation/UserMenu';
import NotificationBell from '../components/navigation/NotificationBell';

export default function SubAccountLayout() {
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

                <SubAccountSidebar />
            </aside>

            <div className="ml-64 min-h-screen">
                <header className="flex h-20 items-center justify-end border-b border-gray-200 bg-white px-6">
                    <div className="flex items-center gap-2">
                        <NotificationBell />

                        <button
                            type="button"
                            aria-label="Help"
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
        </div>
    );
}