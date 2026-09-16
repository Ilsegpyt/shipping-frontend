import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, User } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

export default function UserMenu() {
    const { user, logout } = useAuth();
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    const handleProfileClick = () => {
        setOpen(false);
        navigate('/profile');
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-gray-50"
            >
                <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                        {user?.name}
                    </p>

                    <p className="text-xs text-gray-500">
                        {user?.roleName}
                    </p>
                </div>

                <ChevronDown
                    className={`h-4 w-4 text-gray-500 transition-transform ${
                        open ? 'rotate-180' : ''
                    }`}
                />
            </button>

            {open && (
                <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
                    <button
                        type="button"
                        onClick={handleProfileClick}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                        <User className="h-4 w-4" />
                        Profile
                    </button>

                    <button
                        type="button"
                        onClick={logout}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-600 hover:bg-red-50"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </button>
                </div>
            )}
        </div>
    );
}