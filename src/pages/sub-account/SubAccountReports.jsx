import { FileText } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

export default function SubAccountDashboard() {
    const { user } = useAuth();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                    Welcome back, {user?.name || 'User'}
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                    Manage and view the reports available to your account.
                </p>
            </div>

            {/* Reports Card */}
            <div className="max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <FileText className="h-6 w-6" />
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            Reports
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                            View the reports available to you based on your
                            account access.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}