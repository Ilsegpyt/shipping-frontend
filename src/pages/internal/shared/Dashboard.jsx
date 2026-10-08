import { useEffect, useState } from 'react';

import { Users } from 'lucide-react';

import { useAuth } from '../../../auth/AuthContext';
import dashboardHero from '../../../assets/branding/dashboard-hero.png';

import { getCustomers } from '../../../services/customersService';

export default function Dashboard() {
    const { user } = useAuth();

    const [totalCustomers, setTotalCustomers] = useState(0);
    const [loadingCustomers, setLoadingCustomers] = useState(true);

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                setLoadingCustomers(true);

                const customersResult = await getCustomers(
                    1,
                    1,
                    'notDeleted'
                );

                setTotalCustomers(customersResult.totalCount ?? 0);
            } catch (error) {
                console.error('Failed to load dashboard data:', error);

                setTotalCustomers(0);
            } finally {
                setLoadingCustomers(false);
            }
        };

        loadDashboardData();
    }, []);

    return (
        <div className="space-y-4">
            {/* Hero */}
            <section
                className="relative overflow-hidden rounded-2xl"
                style={{
                    backgroundImage: `url(${dashboardHero})`,
                    backgroundPosition: 'center',
                    backgroundSize: 'cover',
                }}
            >
                <div className="absolute inset-0 bg-slate-950/60" />

                <div className="relative flex min-h-48 items-center px-6 py-7 sm:px-8">
                    <div className="max-w-2xl text-white">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-200">
                            Operations Dashboard
                        </p>

                        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                            Welcome back, {user?.name || 'User'}
                        </h1>

                        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200">
                            Manage your customers and operational activity from
                            one place.
                        </p>
                    </div>
                </div>
            </section>

            {/* Quick Overview */}
            <section className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-none">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-500">
                            Total Customers
                        </p>

                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                            <Users size={19} />
                        </div>
                    </div>

                    <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
                        {loadingCustomers ? '...' : totalCustomers}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                        Active customer accounts
                    </p>
                </div>
            </section>
        </div>
    );
}