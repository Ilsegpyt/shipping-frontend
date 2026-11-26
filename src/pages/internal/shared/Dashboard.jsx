import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';

import { useAuth } from '../../../auth/AuthContext';
import DashboardHero from '../../../components/dashboard/DashboardHero';

import { DashboardPage, DashboardPageHeader } from '../../../components/dashboard/DashboardUI';

import { getCustomers } from '../../../services/customersService';

export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const isOperationsStaff = Boolean(
        user?.permissions?.includes('operations.view') &&
        !user?.permissions?.includes('reports.view')
    );

    // If operations employee lands here, immediately redirect to Data Entry
    useEffect(() => {
        if (isOperationsStaff) {
            navigate('/transport/entry', { replace: true });
        }
    }, [isOperationsStaff, navigate]);

    // Total Customers is only visible to Super Admin / Customer management roles, NOT operations roles
    const canViewCustomers = Boolean(
        (user?.isSuperAdmin || user?.roleName === 'Super Admin' || user?.permissions?.includes('customers.view')) &&
        !user?.roleName?.includes('Operations')
    );

    const [totalCustomers, setTotalCustomers] = useState(null);
    const [loadingCustomers, setLoadingCustomers] = useState(true);

    useEffect(() => {
        if (!canViewCustomers) {
            setLoadingCustomers(false);
            return;
        }

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

                setTotalCustomers(null);
            } finally {
                setLoadingCustomers(false);
            }
        };

        loadDashboardData();
    }, [canViewCustomers]);

    if (isOperationsStaff) {
        return null;
    }

    return (
        <DashboardPage className="ils-main-dashboard">
            <DashboardPageHeader title="Dashboard" description="Your internal workspace at a glance." />
            <DashboardHero
                user={user}
                workspace="Internal workspace"
                description="Manage your daily activity from one place."
            />
            {canViewCustomers && (
                <section aria-labelledby="dashboard-overview-title">
                    <h2 id="dashboard-overview-title" className="ils-main-section-title">Overview</h2>
                    <div className="ils-main-overview">
                        <article className="ils-main-stat">
                            <div className="ils-main-stat-heading">
                                <h3>Total Customers</h3>
                                <span className="ils-main-stat-icon"><Users size={22} aria-hidden="true" /></span>
                            </div>
                            <p className="ils-main-stat-value" aria-live="polite">
                                {loadingCustomers ? '…' : totalCustomers === null ? '—' : totalCustomers.toLocaleString('en-US')}
                            </p>
                            <p className="ils-main-stat-note">{loadingCustomers ? 'Loading customer data…' : totalCustomers === null ? 'Customer data unavailable' : 'Customer accounts (excluding deleted)'}</p>
                        </article>
                    </div>
                </section>
            )}
        </DashboardPage>
    );
}
