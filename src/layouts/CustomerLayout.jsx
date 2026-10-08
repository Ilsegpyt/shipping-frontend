import { Link, Outlet, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

import ilsLogo from '../assets/branding/ils-logo-horizontal.png';
import CustomerSidebar from '../components/navigation/CustomerSidebar';
import UserMenu from '../components/navigation/UserMenu';
import { useAuth } from '../auth/AuthContext';

export default function CustomerLayout() {

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
                    <Link to="/" className="block">
                        <img
                            src={ilsLogo}
                            alt="International Logistics System"
                            className="h-12 w-auto object-contain"
                        />
                    </Link>
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