import { Navigate, Route } from "react-router-dom";

import ProtectedRoute from "../auth/ProtectedRoute";

import Login from "../pages/auth/Login";
import Dashboard from "../pages/internal/shared/Dashboard";
import Profile from "../pages/internal/shared/Profile";
import Users from "../pages/internal/super-admin/Users";
import Customers from "../pages/internal/shared/Customers";
import ClientsSearchHistory from "../pages/internal/super-admin/ClientsSearchHistory";

import Schedules from "../pages/internal/super-admin/Schedules";
import AddSchedule from "../pages/internal/super-admin/AddSchedule";
import ScheduleEdit from "../pages/internal/super-admin/ScheduleEdit";
import ScheduleDetails from "../pages/internal/super-admin/ScheduleDetails";

import Shipments from "../pages/internal/super-admin/Shipments";
import ShipmentDetails from "../pages/internal/super-admin/ShipmentDetails";
import ShipmentEdit from "../pages/ShipmentEdit";
import AddShipment from "../pages/AddShipment";

import SubAccounts from "../pages/SubAccounts";
import Reports from "../pages/internal/super-admin/Reports";
import InternalLayout from "../layouts/InternalLayout";

function NotFound() {
    return (
        <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
                <h1 className="text-2xl font-semibold text-slate-900">
                    Page Not Found
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                    The page you are looking for does not exist.
                </p>
            </div>
        </div>
    );
}

export const appRoutes = (
    <>
        {/* Public Routes */}
        <Route
            path="/"
            element={<Login />}
        />

        <Route
            path="/login"
            element={<Login />}
        />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
            <Route element={<InternalLayout />}>

                <Route
                    path="/dashboard"
                    element={<Dashboard />}
                />

                <Route
                    path="/profile"
                    element={<Profile />}
                />

                {/* Users */}
                <Route
                    element={
                        <ProtectedRoute requiredPermission="identity.users.view" />
                    }
                >
                    <Route
                        path="/users"
                        element={<Users />}
                    />
                </Route>

                {/* Customers */}
                <Route
                    element={
                        <ProtectedRoute requiredPermission="customers.view" />
                    }
                >
                    <Route
                        path="/customers"
                        element={<Customers />}
                    />

                    <Route
                        path="/clients/search-history"
                        element={<ClientsSearchHistory />}
                    />
                </Route>

                {/* Sub Accounts */}
                <Route
                    element={
                        <ProtectedRoute requiredPermission="identity.subaccounts.view" />
                    }
                >
                    <Route
                        path="/sub-accounts"
                        element={<SubAccounts />}
                    />
                </Route>

                {/* Reports */}
                <Route
                    element={
                        <ProtectedRoute requiredPermission="reports.view" />
                    }
                >
                    <Route
                        path="/reports"
                        element={<Reports />}
                    />
                </Route>

                {/* Schedules */}
                <Route
                    element={
                        <ProtectedRoute requiredPermission="customers.view" />
                    }
                >
                    <Route
                        path="/schedules"
                        element={<Schedules />}
                    />

                    <Route
                        path="/schedules/new"
                        element={<AddSchedule />}
                    />

                    <Route
                        path="/schedules/:id"
                        element={<ScheduleDetails />}
                    />

                    <Route
                        path="/schedules/:id/edit"
                        element={<ScheduleEdit />}
                    />
                </Route>

                {/* Shipments - View Only */}
                <Route
                    element={
                        <ProtectedRoute requiredPermission="customers.view" />
                    }
                >
                    <Route
                        path="/shipments"
                        element={<Shipments />}
                    />

                    <Route
                        path="/shipments/:id"
                        element={<ShipmentDetails />}
                    />
                </Route>

                {/* Shipments - Create / Update */}
                <Route
                    element={
                        <ProtectedRoute requiredPermission="shipments.view" />
                    }
                >
                    <Route
                        path="/shipments/new"
                        element={<AddShipment />}
                    />

                    <Route
                        path="/shipments/:id/edit"
                        element={<ShipmentEdit />}
                    />
                </Route>

                {/* Not Found */}
                <Route
                    path="*"
                    element={<NotFound />}
                />

            </Route>
        </Route>

        {/* Public Fallback */}
        <Route
            path="*"
            element={
                <Navigate
                    to="/login"
                    replace
                />
            }
        />
    </>
);