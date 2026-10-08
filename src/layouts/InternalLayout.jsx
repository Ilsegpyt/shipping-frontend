import { Link, Outlet } from 'react-router-dom';

import ilsLogo from '../assets/branding/ils-logo-horizontal.png';
import InternalSidebar from '../components/navigation/InternalSidebar';
import UserMenu from '../components/navigation/UserMenu';

export default function InternalLayout() {
    return (
        <div className="min-h-screen bg-gray-50">
            <aside className="fixed inset-y-0 left-0 w-64 bg-slate-900">
                {/* Logo Area */}
                <div className="flex h-20 items-center justify-center border-b border-slate-800 px-6">
                    <Link to="/" className="block">
                        <img
                            src={ilsLogo}
                            alt="International Logistics System"
                            className="h-12 w-auto object-contain"
                        />
                    </Link>
                </div>

                <InternalSidebar />
            </aside>

            <div className="ml-64 min-h-screen">
                <header className="flex h-20 items-center justify-end border-b border-gray-200 bg-white px-6">
                    <div className="flex items-center gap-2">
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