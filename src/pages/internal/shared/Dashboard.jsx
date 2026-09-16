import { useAuth } from '../../../auth/AuthContext';
import dashboardHero from '../../../assets/branding/dashboard-hero.png';

export default function Dashboard() {
    const { user } = useAuth();

    const stats = [
        {
            label: 'Total Shipments',
            value: '0',
            description: 'All shipments',
        },
        {
            label: 'In Transit',
            value: '0',
            description: 'Currently moving',
        },
        {
            label: 'Delivered',
            value: '0',
            description: 'Successfully delivered',
        },
        {
            label: 'Pending',
            value: '0',
            description: 'Awaiting action',
        },
    ];

    return (
        <div className="space-y-8">
            {/* Hero */}
            <section
                className="relative h-64 overflow-hidden rounded-2xl"
                style={{
                    backgroundImage: `url(${dashboardHero})`,
                    backgroundPosition: 'center',
                    backgroundSize: 'cover',
                }}
            >
                <div className="absolute inset-0 bg-slate-950/50" />

                <div className="relative flex h-full items-center px-8">
                    <div className="max-w-xl text-white">
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-200">
                            Global Shipping Solutions
                        </p>

                        <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                            Welcome back, {user?.name || 'User'}
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-200">
                            Here’s what’s happening with your logistics
                            operations today.
                        </p>
                    </div>
                </div>
            </section>

            {/* KPI Cards */}
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                    >
                        <p className="text-sm font-medium text-gray-500">
                            {stat.label}
                        </p>

                        <div className="mt-3 flex items-end justify-between">
                            <p className="text-3xl font-semibold tracking-tight text-gray-900">
                                {stat.value}
                            </p>

                            <span className="text-xs font-medium text-gray-400">
                                Today
                            </span>
                        </div>

                        <p className="mt-2 text-xs text-gray-400">
                            {stat.description}
                        </p>
                    </div>
                ))}
            </div>

            {/* Dashboard Content */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Shipment Overview */}
                <div className="min-h-80 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-gray-900">
                                Shipment Overview
                            </h3>

                            <p className="mt-1 text-sm text-gray-500">
                                Track shipment activity and routes.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
                        >
                            View all
                        </button>
                    </div>

                    <div className="mt-6 flex min-h-52 items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
                        <div className="text-center">
                            <p className="text-sm font-medium text-gray-600">
                                Shipment data
                            </p>

                            <p className="mt-1 text-xs text-gray-400">
                                Shipment activity and routes will appear here.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="min-h-80 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-gray-900">
                                Recent Activity
                            </h3>

                            <p className="mt-1 text-sm text-gray-500">
                                Latest system activity.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
                        >
                            View all
                        </button>
                    </div>

                    <div className="mt-6 flex min-h-52 items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
                        <div className="text-center">
                            <p className="text-sm font-medium text-gray-600">
                                No recent activity
                            </p>

                            <p className="mt-1 text-xs text-gray-400">
                                New system activity will appear here.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}