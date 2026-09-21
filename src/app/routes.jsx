import { Navigate, Route, Routes } from 'react-router-dom';

import ProtectedRoute from '../auth/ProtectedRoute';
import InternalLayout from '../layouts/InternalLayout';
import CustomerLayout from '../layouts/CustomerLayout';
import SubAccountLayout from '../layouts/SubAccountLayout';
import Login from '../pages/auth/Login';

// Internal pages
import Dashboard from '../pages/internal/shared/Dashboard';
import Profile from '../pages/internal/shared/Profile';
import Users from '../pages/internal/super-admin/Users';
import Customers from '../pages/internal/shared/Customers';
import Reports from '../pages/internal/shared/Reports';
import Schedules from '../pages/internal/super-admin/Schedules';
import ScheduleDetails from '../pages/internal/super-admin/ScheduleDetails';
import ScheduleEdit from '../pages/internal/super-admin/ScheduleEdit';
import ShipmentDetails from '../pages/internal/super-admin/ShipmentDetails';
import ShipmentEdit from '../pages/internal/shared/ShipmentEdit';
import Shipments from '../pages/internal/super-admin/Shipments';

// Customer pages
import CustomerDashboard from '../pages/customer/CustomerDashboard';
import CustomerScheduleSearch from '../pages/customer/CustomerScheduleSearch';
import CustomerScheduleDetails from '../pages/customer/CustomerScheduleDetails';
import CustomerShipments from '../pages/customer/CustomerShipments';
import CustomerShipmentDetails from '../pages/customer/CustomerShipmentDetails';
import CustomerTeamAccess from '../pages/customer/CustomerTeamAccess';
import CustomerReports from '../pages/customer/CustomerReports';
import CustomerNotifications from '../pages/customer/CustomerNotifications';
import CustomerVoice from '../pages/customer/CustomerVoice';

// Sub Account pages
import SubAccountDashboard from '../pages/sub-account/SubAccountDashboard';
import SubAccountReports from '../pages/sub-account/SubAccountReports';

export default function AppRoutes() {
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
                {/* Internal Portal */}
                <Route element={<InternalLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/profile" element={<Profile />} />

                    <Route
                        path="/users"
                        element={
                            <ProtectedRoute requiredPermission="identity.users.view" />
                        }
                    >
                        <Route index element={<Users />} />
                    </Route>

                    <Route
                        path="/customers"
                        element={
                            <ProtectedRoute requiredPermission="customers.view" />
                        }
                    >
                        <Route index element={<Customers />} />
                    </Route>

                    <Route
                        path="/reports"
                        element={
                            <ProtectedRoute requiredPermission="reports.view" />
                        }
                    >
                        <Route index element={<Reports />} />
                    </Route>

                    <Route
                        path="/schedules"
                        element={
                            <ProtectedRoute requiredPermission="schedules.view" />
                        }
                    >
                        <Route index element={<Schedules />} />
                        <Route path=":id" element={<ScheduleDetails />} />
                        <Route path=":id/edit" element={<ScheduleEdit />} />
                    </Route>

                    <Route
                        path="/shipments"
                        element={
                            <ProtectedRoute requiredPermission="shipments.view" />
                        }
                    >
                        <Route index element={<Shipments />} />
                        <Route path=":id" element={<ShipmentDetails />} />
                        <Route path=":id/edit" element={<ShipmentEdit />} />
                    </Route>
                </Route>

                {/* Customer Portal */}
                <Route element={<CustomerLayout />}>
                    <Route
                        path="/customer"
                        element={
                            <ProtectedRoute requiredPermission="shipments.view" />
                        }
                    >
                        <Route index element={<CustomerDashboard />} />
                    </Route>

                    <Route
                        path="/customer/schedule-search"
                        element={<CustomerScheduleSearch />}
                    />

                    <Route
                        path="/customer/schedules/:id"
                        element={<CustomerScheduleDetails />}
                    />

                    <Route
                        path="/customer/shipments"
                        element={
                            <ProtectedRoute requiredPermission="shipments.view" />
                        }
                    >
                        <Route index element={<CustomerShipments />} />

                        <Route
                            path=":id"
                            element={<CustomerShipmentDetails />}
                        />
                    </Route>

                    <Route
                        path="/customer/team-access"
                        element={<CustomerTeamAccess />}
                    />

                    <Route
                        path="/customer/reports"
                        element={
                            <ProtectedRoute requiredPermission="reports.view" />
                        }
                    >
                        <Route index element={<CustomerReports />} />
                    </Route>

                    <Route
                        path="/customer/notifications"
                        element={
                            <ProtectedRoute requiredPermission="notifications.view" />
                        }
                    >
                        <Route index element={<CustomerNotifications />} />
                    </Route>

                    <Route
                        path="/customer/voice"
                        element={<CustomerVoice />}
                    />
                </Route>

                {/* Sub Account Portal */}
                <Route element={<SubAccountLayout />}>
                    <Route
                        path="/subaccount"
                        element={<ProtectedRoute />}
                    >
                        <Route index element={<SubAccountDashboard />} />
                    </Route>

                    <Route
                        path="/subaccount/reports"
                        element={<ProtectedRoute />}
                    >
                        <Route index element={<SubAccountReports />} />
                    </Route>
                </Route>
            </Route>

            {/* Fallback */}
            <Route
                path="*"
                element={<Navigate to="/login" replace />}
            />
        </Routes>
    );
}