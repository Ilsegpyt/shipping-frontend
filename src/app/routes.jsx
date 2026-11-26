import { lazy, Suspense } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "../auth/ProtectedRoute";
import LoadingScreen from "../components/common/LoadingScreen";
import Login from "../pages/auth/Login";

const WebsiteLayout = lazy(() => import("../layouts/WebsiteLayout"));
const InternalLayout = lazy(() => import("../layouts/InternalLayout"));
const CustomerLayout = lazy(() => import("../layouts/CustomerLayout"));
const SubAccountLayout = lazy(() => import("../layouts/SubAccountLayout"));

// Public pages
const Home = lazy(() => import("../pages/public/Home"));
const CmsPublicPage = lazy(() => import("../pages/public/CmsPublicPage"));
const Philosophy = lazy(() => import("../pages/public/About ILS/Philosophy"));
const PurposeAndStrategy = lazy(() => import("../pages/public/About ILS/PurposeAndStrategy"));
const Values = lazy(() => import("../pages/public/About ILS/Values"));
// Certificates page retained for future reactivation.
// import Certificates from "../pages/public/About ILS/certificates";
const News = lazy(() => import("../pages/public/news/News"));
const Incoterms = lazy(() => import("../pages/public/resources/Incoterms"));
const CbmCalculator = lazy(() => import("../pages/public/resources/CbmCalculator"));
const ContainerTypes = lazy(() => import("../pages/public/resources/ContainerTypes"));
const CustomsDutiesCalculator = lazy(() => import("../pages/public/resources/CustomsDutiesCalculator"));
const DangerousGoodsLabels = lazy(() => import("../pages/public/resources/DangerousGoodsLabels"));
const NafezaPlatform = lazy(() => import("../pages/public/resources/NafezaPlatform"));

const AgentOpportunity = lazy(() => import("../pages/public/Join ILS/AgentOpportunity"));
const Recruitment = lazy(() => import("../pages/public/Join ILS/Recruitment"));

const ILSBranches = lazy(() => import("../pages/public/Contact ILS/ILSBranches"));
const GetAQuote = lazy(() => import("../pages/public/Contact ILS/GetAQuote"));

const NewsDetails = lazy(() => import("../pages/public/news/NewsDetails"));

// Industry pages
const HealthcareLogistics = lazy(() => import("../pages/public/industries/HealthcareLogistics"));
const AutomotiveLogistics = lazy(() => import("../pages/public/industries/AutomotiveLogistics"));
const Energy = lazy(() => import("../pages/public/industries/Energy"));
const RetailLogistics = lazy(() => import("../pages/public/industries/RetailLogistics"));
const IndustrialLogistics = lazy(() => import("../pages/public/industries/IndustrialLogistics"));
const Technology = lazy(() => import("../pages/public/industries/Technology"));

// Solutions
const Solutions = lazy(() => import("../pages/public/solutions/Solutions"));
const AirFreight = lazy(() => import("../pages/public/solutions/AirFreight"));
const SeaFreight = lazy(() => import("../pages/public/solutions/SeaFreight"));
const RoadTransportation = lazy(() => import("../pages/public/solutions/RoadTransportation"));
const CustomsClearance = lazy(() => import("../pages/public/solutions/CustomsClearance"));
const ProjectTransport = lazy(() => import("../pages/public/solutions/ProjectTransport"));
const WarehousingDistribution = lazy(() => import("../pages/public/solutions/WarehousingDistribution"));
const Consolidations = lazy(() => import("../pages/public/solutions/Consolidations"));
const CargoInsurance = lazy(() => import("../pages/public/solutions/CargoInsurance"));

// Auth pages
const ForgotPassword = lazy(() => import("../pages/auth/ForgotPassword"));
const ActivateAccount = lazy(() => import("../pages/auth/ActivateAccount"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"));

// Internal pages
const Dashboard = lazy(() => import("../pages/internal/shared/Dashboard"));
const OceanTransportDashboard = lazy(() => import("../pages/internal/operations/OceanTransport/OceanTransportDashboard"));
const FtlAirportPage = lazy(() => import("../pages/internal/operations/FtlAirport/FtlAirportPage"));
const Profile = lazy(() => import("../pages/internal/shared/Profile"));
const Users = lazy(() => import("../pages/internal/super-admin/Users"));
const Roles = lazy(() => import("../pages/internal/super-admin/Roles"));
const AccountManagerAssignments = lazy(() => import("../pages/internal/super-admin/AccountManagerAssignments"));
const Customers = lazy(() => import("../pages/internal/shared/Customers"));
const Content = lazy(() => import("../pages/internal/super-admin/Content"));
const Locations = lazy(() => import("../pages/internal/super-admin/Locations"));
const AgentOpportunities = lazy(() => import("../pages/internal/super-admin/AgentOpportunities"));
const Quotations = lazy(() => import("../pages/internal/super-admin/Quotations"));
const RecruitmentRequests = lazy(() => import("../pages/internal/super-admin/RecruitmentRequests"));
const ContactInquiries = lazy(() => import("../pages/internal/super-admin/ContactInquiries"));
const OperationsLookups = lazy(() => import("../pages/internal/super-admin/OperationsLookups"));

// Customer pages
const CustomerDashboard = lazy(() => import("../pages/customer/CustomerDashboard"));
const CustomerTeamAccess = lazy(() => import("../pages/customer/CustomerTeamAccess"));
const CustomerProfile = lazy(() => import("../pages/customer/CustomerProfile"));

// Sub Account pages
const SubAccountDashboard = lazy(() => import("../pages/sub-account/SubAccountDashboard"));
const SubAccountProfile = lazy(() => import("../pages/sub-account/SubAccountProfile"));

function PortalGuard({ allowedTokenType, children }) {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  try {
    const payload = token.split(".")[1];

    if (!payload) {
      return <Navigate to="/login" replace />;
    }

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const tokenType = JSON.parse(atob(padded)).token_type;

    if (tokenType === allowedTokenType) {
      return children;
    }

    // Impersonation uses the Customer Portal.
    if (allowedTokenType === "customer" && tokenType === "impersonation") {
      return children;
    }

    if (tokenType === "internal") {
      return <Navigate to="/dashboard" replace />;
    }

    if (tokenType === "customer") {
      return <Navigate to="/customer" replace />;
    }

    if (tokenType === "subaccount") {
      return <Navigate to="/subaccount" replace />;
    }

    return <Navigate to="/login" replace />;
  } catch {
    return <Navigate to="/login" replace />;
  }
}

function PublicNotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold text-brand-primary">Page not found</h1>
      <p className="text-brand-text">The requested page does not exist.</p>
      <Link to="/" className="text-brand-primary underline">Back to Home</Link>
    </main>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
    <Routes>
      {/* Public Routes */}
      <Route element={<WebsiteLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/cms/:contentId" element={<CmsPublicPage />} />
        <Route path="/pages/*" element={<CmsPublicPage />} />
        <Route path="/about-ils/philosophy" element={<Philosophy />} />
        <Route
          path="/about-ils/purpose-and-strategy"
          element={<PurposeAndStrategy />}
        />
        <Route path="/about-ils/values" element={<Values />} />
        {/* Certificates temporarily hidden; keep original route for future reactivation. */}
        {/* <Route path="/about-ils/certificates" element={<Certificates />} /> */}
        <Route path="/about-ils/certificates" element={<Navigate to="/" replace />} />
        <Route path="/news" element={<News />} />
        <Route path="/resources/incoterms" element={<Incoterms />} />
        <Route
          path="/resources/dangerous-goods-labels"
          element={<DangerousGoodsLabels />}
        />
        <Route path="/resources/cbm-calculator" element={<CbmCalculator />} />
        <Route path="/resources/container-types" element={<ContainerTypes />} />
        <Route path="/resources/nafeza-platform" element={<NafezaPlatform />} />
        <Route
          path="/resources/customs-duties-calculator"
          element={<CustomsDutiesCalculator />}
        />
        <Route
          path="/join-ils/agent-opportunity"
          element={<AgentOpportunity />}
        />
        <Route path="/join-ils/recruitment" element={<Recruitment />} />
        <Route path="/contact-ils/locations" element={<ILSBranches />} />
        <Route path="/contact-ils/get-a-quote" element={<GetAQuote />} />
        <Route path="/news/:slug" element={<NewsDetails />} />

        {/* Industry Pages */}
        <Route path="/industries/healthcare" element={<HealthcareLogistics />} />
        <Route path="/industries/automotive" element={<AutomotiveLogistics />} />
        <Route path="/industries/energy" element={<Energy />} />
        <Route path="/industries/retail" element={<RetailLogistics />} />
        <Route path="/industries/industrial" element={<IndustrialLogistics />} />
        <Route path="/industries/technology" element={<Technology />} />

        {/* Solutions */}
        <Route path="/solutions" element={<Solutions />} />
        <Route path="/solutions/air-freight" element={<AirFreight />} />
        <Route path="/solutions/sea-freight" element={<SeaFreight />} />
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
        <Route path="/solutions/consolidations" element={<Consolidations />} />
        <Route path="/solutions/cargo-insurance" element={<CargoInsurance />} />
        <Route path="*" element={<PublicNotFound />} />
      </Route>

      {/* Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/activate-account" element={<ActivateAccount />} />
      <Route path="/reset-password" element={<ResetPassword />} />

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
            element={<ProtectedRoute requiredPermission="reports.view" />}
          >
            <Route index element={<Dashboard />} />
          </Route>
          <Route
            path="/transport/dashboard"
            element={
              <ProtectedRoute
                requiredPermission="operations.view"
                customCheck={(user) => Boolean(
                  user?.isSuperAdmin ||
                  user?.role === "SuperAdmin" ||
                  user?.roleName === "Super Admin"
                )}
              />
            }
          >
            <Route index element={<OceanTransportDashboard defaultView="dashboard" />} />
          </Route>
          <Route
            path="/transport/entry"
            element={<ProtectedRoute requiredPermission="operations.view" />}
          >
            <Route index element={<OceanTransportDashboard defaultView="entry" />} />
          </Route>
          <Route
            path="/ocean-transport"
            element={<ProtectedRoute requiredPermission="operations.view" />}
          >
            <Route index element={<OceanTransportDashboard />} />
          </Route>
          <Route
            path="/ftl/dashboard"
            element={<ProtectedRoute />}
          >
            <Route index element={<FtlAirportPage defaultView="dashboard" />} />
          </Route>
          <Route
            path="/ftl/entry"
            element={<ProtectedRoute />}
          >
            <Route index element={<FtlAirportPage defaultView="entry" />} />
          </Route>
          <Route
            path="/ftl"
            element={<ProtectedRoute />}
          >
            <Route index element={<FtlAirportPage defaultView="dashboard" />} />
          </Route>
          <Route path="/profile" element={<Profile />} />
          <Route
            path="/users"
            element={<ProtectedRoute requiredPermission="identity.users.view" />}
          >
            <Route index element={<Users />} />
          </Route>
          <Route
            path="/roles"
            element={<ProtectedRoute requiredPermission="identity.roles.manage" />}
          >
            <Route index element={<Roles />} />
          </Route>
          <Route
            path="/account-manager-assignments"
            element={<ProtectedRoute requiredPermission="identity.users.view" />}
          >
            <Route index element={<AccountManagerAssignments />} />
          </Route>
          <Route
            path="/customers"
            element={<ProtectedRoute requiredPermission="customers.view" />}
          >
            <Route index element={<Customers />} />
          </Route>
          <Route path="/operations-lookups" element={<OperationsLookups />} />
          <Route path="/content" element={<Content />} />
          <Route path="/locations" element={<Locations />} />
          <Route path="/agent-opportunities" element={<AgentOpportunities />} />
          <Route path="/quotations" element={<Quotations />} />
          <Route path="/recruitments" element={<RecruitmentRequests />} />
          <Route path="/contact-inquiries" element={<ContactInquiries />} />
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
            element={<ProtectedRoute requiredPermission="shipments.view" />}
          >
            <Route index element={<CustomerDashboard />} />
          </Route>
          <Route path="/customer/team-access" element={<ProtectedRoute />}>
            <Route index element={<CustomerTeamAccess />} />
          </Route>
          <Route path="/customer/profile" element={<CustomerProfile />} />
        </Route>

        {/* Sub Account Portal */}
        <Route
          element={
            <PortalGuard allowedTokenType="subaccount">
              <SubAccountLayout />
            </PortalGuard>
          }
        >
          <Route path="/subaccount" element={<ProtectedRoute />}>
            <Route index element={<SubAccountDashboard />} />
          </Route>
          <Route path="/subaccount/profile" element={<SubAccountProfile />} />
        </Route>
      </Route>

    </Routes>
    </Suspense>
  );
}
