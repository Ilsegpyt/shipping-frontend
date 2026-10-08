import { Navigate, Route, Routes } from 'react-router-dom';

import ProtectedRoute from '../auth/ProtectedRoute';

import InternalLayout from '../layouts/InternalLayout';
import CustomerLayout from '../layouts/CustomerLayout';
import SubAccountLayout from '../layouts/SubAccountLayout';

// Public pages
import Home from '../pages/public/Home';
import Philosophy from '../pages/public/About ILS/Philosophy';
import PurposeAndStrategy from '../pages/public/About ILS/PurposeAndStrategy';
import Values from '../pages/public/About ILS/Values';
import Certificates from '../pages/public/About ILS/certificates';
import News from '../pages/public/news/News';
import Incoterms from '../pages/public/resources/Incoterms';
import CbmCalculator from '../pages/public/resources/CbmCalculator';
import ContainerTypes from '../pages/public/resources/ContainerTypes';
import CustomsDutiesCalculator from '../pages/public/resources/CustomsDutiesCalculator';
import DangerousGoodsLabels from '../pages/public/resources/DangerousGoodsLabels';
import NafezaPlatform from '../pages/public/resources/NafezaPlatform';

import AgentOpportunity from '../pages/public/Join ILS/AgentOpportunity';
import Recruitment from '../pages/public/Join ILS/Recruitment';

import ILSBranches from '../pages/public/Contact ILS/ILSBranches';
import GetAQuote from '../pages/public/Contact ILS/GetAQuote';

import NewsDetails from '../pages/public/news/NewsDetails';

// Industry pages
import HealthcareLogistics from '../pages/public/industries/HealthcareLogistics';
import AutomotiveLogistics from '../pages/public/industries/AutomotiveLogistics';
import Energy from '../pages/public/industries/Energy';
import RetailLogistics from '../pages/public/industries/RetailLogistics';
import IndustrialLogistics from '../pages/public/industries/IndustrialLogistics';
import Technology from '../pages/public/industries/Technology';

// Solutions
import Solutions from '../pages/public/solutions/Solutions';
import AirFreight from '../pages/public/solutions/AirFreight';
import SeaFreight from '../pages/public/solutions/SeaFreight';
import RoadTransportation from '../pages/public/solutions/RoadTransportation';
import CustomsClearance from '../pages/public/solutions/CustomsClearance';
import ProjectTransport from '../pages/public/solutions/ProjectTransport';
import WarehousingDistribution from '../pages/public/solutions/WarehousingDistribution';
import Consolidations from '../pages/public/solutions/Consolidations';
import CargoInsurance from '../pages/public/solutions/CargoInsurance';

// Auth pages
import Login from '../pages/auth/Login';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ActivateAccount from '../pages/auth/ActivateAccount';
import ResetPassword from '../pages/auth/ResetPassword';

// Internal pages
import Dashboard from '../pages/internal/shared/Dashboard';
import Profile from '../pages/internal/shared/Profile';
import Users from '../pages/internal/super-admin/Users';
import AccountManagerAssignments from '../pages/internal/super-admin/AccountManagerAssignments';
import Customers from '../pages/internal/shared/Customers';
import Content from '../pages/internal/super-admin/Content';
import Locations from '../pages/internal/super-admin/Locations';
import AgentOpportunities from '../pages/internal/super-admin/AgentOpportunities';
import Quotations from '../pages/internal/super-admin/Quotations';
import RecruitmentRequests from '../pages/internal/super-admin/RecruitmentRequests';
import ContactInquiries from '../pages/internal/super-admin/ContactInquiries';

// Customer pages
import CustomerDashboard from '../pages/customer/CustomerDashboard';
import CustomerTeamAccess from '../pages/customer/CustomerTeamAccess';

// Sub Account pages
import SubAccountDashboard from '../pages/sub-account/SubAccountDashboard';

function PortalGuard({ allowedTokenType, children }) {
    const token = localStorage.getItem('accessToken');

    if (!token) {
        return <Navigate to="/login" replace />;
    }

    try {
        const payload = token.split('.')[1];

        if (!payload) {
            return <Navigate to="/login" replace />;
        }

        const base64 = payload
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const padded = base64.padEnd(
            Math.ceil(base64.length / 4) * 4,
            '='
        );

        const tokenType = JSON.parse(atob(padded)).token_type;

        if (tokenType === allowedTokenType) {
            return children;
        }

        if (tokenType === 'internal') {
            return <Navigate to="/dashboard" replace />;
        }

        if (tokenType === 'customer') {
            return <Navigate to="/customer" replace />;
        }

        if (tokenType === 'sub_account') {
            return <Navigate to="/subaccount" replace />;
        }

        return <Navigate to="/login" replace />;
    } catch {
        return <Navigate to="/login" replace />;
    }
}

export default function AppRoutes() {
    return (
        <Routes>
            {/* Public Routes */}

            <Route
                path="/"
                element={<Home />}
            />

            <Route
                path="/about-ils/philosophy"
                element={<Philosophy />}
            />

            <Route
                path="/about-ils/purpose-and-strategy"
                element={<PurposeAndStrategy />}
            />

            <Route
                path="/about-ils/values"
                element={<Values />}
            />

            <Route
                path="/about-ils/certificates"
                element={<Certificates />}
            />

            <Route
                path="/news"
                element={<News />}
            />

            <Route
                path="/resources/incoterms"
                element={<Incoterms />}
            />

            <Route
                path="/resources/dangerous-goods-labels"
                element={<DangerousGoodsLabels />}
            />

            <Route
                path="/resources/cbm-calculator"
                element={<CbmCalculator />}
            />

            <Route
                path="/resources/container-types"
                element={<ContainerTypes />}
            />

            <Route
                path="/resources/nafeza-platform"
                element={<NafezaPlatform />}
            />

            <Route
                path="/resources/customs-duties-calculator"
                element={<CustomsDutiesCalculator />}
            />

            <Route
                path="/join-ils/agent-opportunity"
                element={<AgentOpportunity />}
            />

            <Route
                path="/join-ils/recruitment"
                element={<Recruitment />}
            />

            <Route
                path="/contact-ils/locations"
                element={<ILSBranches />}
            />

            <Route
                path="/contact-ils/get-a-quote"
                element={<GetAQuote />}
            />

            <Route
                path="/news/:slug"
                element={<NewsDetails />}
            />

            {/* Industry Pages */}

            <Route
                path="/industries/healthcare"
                element={<HealthcareLogistics />}
            />

            <Route
                path="/industries/automotive"
                element={<AutomotiveLogistics />}
            />

            <Route
                path="/industries/energy"
                element={<Energy />}
            />

            <Route
                path="/industries/retail"
                element={<RetailLogistics />}
            />

            <Route
                path="/industries/industrial"
                element={<IndustrialLogistics />}
            />

            <Route
                path="/industries/technology"
                element={<Technology />}
            />

            {/* Solutions */}

            <Route
                path="/solutions"
                element={<Solutions />}
            />

            <Route
                path="/solutions/air-freight"
                element={<AirFreight />}
            />

            <Route
                path="/solutions/sea-freight"
                element={<SeaFreight />}
            />

            <Route
                path="/solutions/road-transportation"
                element={<RoadTransportation />}
            />

            <Route
                path="/solutions/customs-clearance"
                element={<CustomsClearance />}
            />

            <Route
                path="/solutions/project-transport"
                element={<ProjectTransport />}
            />

            <Route
                path="/solutions/warehousing-distribution"
                element={<WarehousingDistribution />}
            />

            <Route
                path="/solutions/consolidations"
                element={<Consolidations />}
            />

            <Route
                path="/solutions/cargo-insurance"
                element={<CargoInsurance />}
            />

            {/* Auth Routes */}

            <Route
                path="/login"
                element={<Login />}
            />

            <Route
                path="/forgot-password"
                element={<ForgotPassword />}
            />

            <Route
                path="/activate-account"
                element={<ActivateAccount />}
            />

            <Route
                path="/reset-password"
                element={<ResetPassword />}
            />

            {/* Protected Routes */}

            <Route element={<ProtectedRoute />}>

                {/* Internal Portal */}

                <Route
                    element={
                        <PortalGuard allowedTokenType="internal">
                            <InternalLayout />
                        </PortalGuard>
                    }
                >
                    <Route
                        path="/dashboard"
                        element={<Dashboard />}
                    />

                    <Route
                        path="/profile"
                        element={<Profile />}
                    />

                    <Route
                        path="/users"
                        element={
                            <ProtectedRoute
                                requiredPermission="identity.users.view"
                            />
                        }
                    >
                        <Route
                            index
                            element={<Users />}
                        />
                    </Route>

                    <Route
                        path="/account-manager-assignments"
                        element={
                            <ProtectedRoute
                                requiredPermission="identity.users.view"
                            />
                        }
                    >
                        <Route
                            index
                            element={<AccountManagerAssignments />}
                        />
                    </Route>

                    <Route
                        path="/customers"
                        element={
                            <ProtectedRoute
                                requiredPermission="customers.view"
                            />
                        }
                    >
                        <Route
                            index
                            element={<Customers />}
                        />
                    </Route>

                    <Route
                        path="/content"
                        element={<Content />}
                    />

                    <Route
                        path="/locations"
                        element={<Locations />}
                    />

                    <Route
                        path="/agent-opportunities"
                        element={<AgentOpportunities />}
                    />

                    <Route
                        path="/quotations"
                        element={<Quotations />}
                    />

                    <Route
                        path="/recruitments"
                        element={<RecruitmentRequests />}
                    />

                    <Route
                        path="/contact-inquiries"
                        element={<ContactInquiries />}
                    />
                </Route>

                {/* Customer Portal */}

                <Route
                    element={
                        <PortalGuard allowedTokenType="customer">
                            <CustomerLayout />
                        </PortalGuard>
                    }
                >
                    <Route
                        path="/customer"
                        element={
                            <ProtectedRoute
                                requiredPermission="shipments.view"
                            />
                        }
                    >
                        <Route
                            index
                            element={<CustomerDashboard />}
                        />
                    </Route>

                    <Route
                        path="/customer/team-access"
                        element={<ProtectedRoute />}
                    >
                        <Route
                            index
                            element={<CustomerTeamAccess />}
                        />
                    </Route>
                </Route>

                {/* Sub Account Portal */}

                <Route
                    element={
                        <PortalGuard allowedTokenType="sub_account">
                            <SubAccountLayout />
                        </PortalGuard>
                    }
                >
                    <Route
                        path="/subaccount"
                        element={<ProtectedRoute />}
                    >
                        <Route
                            index
                            element={<SubAccountDashboard />}
                        />
                    </Route>
                </Route>
            </Route>

            {/* Fallback */}

            <Route
                path="*"
                element={
                    <Navigate
                        to="/login"
                        replace
                    />
                }
            />
        </Routes>
    );
}