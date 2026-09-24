import { useEffect, useState } from 'react';
import {
    AlertTriangle,
    Search,
    Users,
} from 'lucide-react';
import { useAuth } from '../../../auth/AuthContext';
import dashboardHero from '../../../assets/branding/dashboard-hero.png';
import {
    getCustomers,
    getShipmentExceptions,
    getClientSearchActivity,
    getAccountManagerWorkload,
} from '../../../services/customersService';

export default function Dashboard() {
    const { user } = useAuth();

    const [totalCustomers, setTotalCustomers] = useState(0);
    const [loadingCustomers, setLoadingCustomers] = useState(true);

    const [shipmentExceptions, setShipmentExceptions] = useState({
        total: 0,
        missingDocuments: 0,
        cancelled: 0,
    });

    const [loadingShipmentExceptions, setLoadingShipmentExceptions] =
        useState(true);

    const [clientSearchActivity, setClientSearchActivity] = useState({
        searchesToday: 0,
        activeClients: 0,
    });

    const [loadingClientSearchActivity, setLoadingClientSearchActivity] =
        useState(true);

    const [accountManagerWorkload, setAccountManagerWorkload] = useState([]);
    const [loadingAccountManagerWorkload, setLoadingAccountManagerWorkload] =
        useState(true);

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                setLoadingCustomers(true);
                setLoadingShipmentExceptions(true);
                setLoadingClientSearchActivity(true);
                setLoadingAccountManagerWorkload(true);

                const [
                    customersResult,
                    exceptionsResult,
                    searchActivityResult,
                    workloadResult,
                ] = await Promise.all([
                    getCustomers(1, 1, 'notDeleted'),
                    getShipmentExceptions(),
                    getClientSearchActivity(),
                    getAccountManagerWorkload(),
                ]);

                setTotalCustomers(customersResult.totalCount ?? 0);

                setShipmentExceptions({
                    total: exceptionsResult.total ?? 0,
                    missingDocuments: exceptionsResult.missingDocuments ?? 0,
                    cancelled: exceptionsResult.cancelled ?? 0,
                });

                setClientSearchActivity({
                    searchesToday: searchActivityResult.searchesToday ?? 0,
                    activeClients: searchActivityResult.activeClients ?? 0,
                });

                setAccountManagerWorkload(workloadResult.items ?? []);
            } catch (error) {
                console.error('Failed to load dashboard data:', error);

                setTotalCustomers(0);
                setShipmentExceptions({
                    total: 0,
                    missingDocuments: 0,
                    cancelled: 0,
                });

                setClientSearchActivity({
                    searchesToday: 0,
                    activeClients: 0,
                });

                setAccountManagerWorkload([]);
            } finally {
                setLoadingCustomers(false);
                setLoadingShipmentExceptions(false);
                setLoadingClientSearchActivity(false);
                setLoadingAccountManagerWorkload(false);
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
                            Logistics Operations Dashboard
                        </p>

                        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                            Welcome back, {user?.name || 'User'}
                        </h1>

                        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200">
                            Monitor your customers, shipments, and operational
                            activity from one place.
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

                <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-none">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-500">
                            Client Search Activity
                        </p>

                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                            <Search size={19} />
                        </div>
                    </div>

                    <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
                        {loadingClientSearchActivity
                            ? '...'
                            : clientSearchActivity.searchesToday}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                        Searches today
                    </p>
                </div>
            </section>

            {/* Main Operations */}
            <section className="grid items-start gap-4 xl:grid-cols-[0.95fr_1.45fr]">
                {/* Account Manager Workload */}
                <div className="self-start rounded-lg border border-slate-200 bg-white p-4 shadow-none">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                                <Users size={18} />
                            </div>

                            <h2 className="text-base font-semibold text-slate-900">
                                Account Manager Workload
                            </h2>
                        </div>

                        <p className="mt-1.5 text-sm text-slate-500">
                            Assigned customers and active shipments by account manager.
                        </p>
                    </div>

                    <div className="mt-4 max-h-52 overflow-y-auto rounded-md border border-slate-200 pr-1">
                        {loadingAccountManagerWorkload ? (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-400">
                                Loading workload...
                            </div>
                        ) : accountManagerWorkload.length === 0 ? (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-400">
                                No account manager workload data available.
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-200">
                                {accountManagerWorkload.map((manager) => (
                                    <div
                                        key={manager.accountManagerId}
                                        className="flex items-center justify-between gap-4 px-3 py-2.5"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-slate-900">
                                                {manager.accountManagerName}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-400">
                                                {manager.assignedCustomers} assigned customer
                                                {manager.assignedCustomers === 1 ? '' : 's'}
                                            </p>
                                        </div>

                                        <div className="shrink-0 text-right">
                                            <p className="text-sm font-semibold text-slate-900">
                                                {manager.activeShipments}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                active shipments
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Shipment Exceptions */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm self-start">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-50 text-amber-600">
                                    <AlertTriangle size={18} />
                                </div>

                                <h2 className="text-base font-semibold text-slate-900">
                                    Shipment Exceptions
                                </h2>
                            </div>

                            <p className="mt-1.5 text-sm text-slate-500">
                                Shipments that currently need operational
                                attention.
                            </p>
                        </div>

                    </div>

                    <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
                        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                Total
                            </p>

                            <p className="mt-2 text-2xl font-semibold text-slate-900">
                                {loadingShipmentExceptions
                                    ? '...'
                                    : shipmentExceptions.total}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                                Need attention
                            </p>
                        </div>

                        <div className="rounded-md border border-slate-200 bg-white px-3 py-3">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                    Missing Documents
                                </p>

                                <span className="h-2 w-2 rounded-full bg-amber-500" />
                            </div>

                            <p className="mt-2 text-2xl font-semibold text-slate-900">
                                {loadingShipmentExceptions
                                    ? '...'
                                    : shipmentExceptions.missingDocuments}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                                Documentation required
                            </p>
                        </div>

                        <div className="rounded-md border border-slate-200 bg-white px-3 py-3">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                    Cancelled
                                </p>

                                <span className="h-2 w-2 rounded-full bg-red-500" />
                            </div>

                            <p className="mt-2 text-2xl font-semibold text-slate-900">
                                {loadingShipmentExceptions
                                    ? '...'
                                    : shipmentExceptions.cancelled}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                                Shipment cancelled
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Client Search Activity */}
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-none">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                                <Search size={18} />
                            </div>

                            <h2 className="text-base font-semibold text-slate-900">
                                Client Search Activity
                            </h2>
                        </div>

                        <p className="mt-1.5 text-sm text-slate-500">
                            Recent customer schedule search activity.
                        </p>
                    </div>
                </div>

                <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            Searches Today
                        </p>

                        <p className="mt-2 text-2xl font-semibold text-slate-900">
                            {loadingClientSearchActivity
                                ? '...'
                                : clientSearchActivity.searchesToday}
                        </p>
                    </div>

                    <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            Active Clients
                        </p>

                        <p className="mt-2 text-2xl font-semibold text-slate-900">
                            {loadingClientSearchActivity
                                ? '...'
                                : clientSearchActivity.activeClients}
                        </p>
                    </div>
                </div>
            </section>

        </div>
    );
}
