import { useAuth } from '../../auth/AuthContext';

export default function CustomerDashboard() {
    const { user } = useAuth();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                    Welcome back, {user?.name || 'User'}
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                    Welcome to your dashboard.
                </p>
            </div>
        </div>
    );
}