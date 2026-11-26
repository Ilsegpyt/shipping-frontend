import { useNavigate } from "react-router-dom";
import { LogOut, AlertTriangle } from "lucide-react";

import { DashboardButton } from "../components/dashboard/DashboardUI";
import PortalLayout from "../components/common/PortalLayout";
import CustomerSidebar from "../components/navigation/CustomerSidebar";
import { useAuth } from "../auth/AuthContext";

export default function CustomerLayout() {
  const { user, impersonation, endImpersonation } = useAuth();
  const navigate = useNavigate();

  const handleEndImpersonation = async () => {
    try {
      await endImpersonation();
      navigate("/dashboard");
    } catch (error) {
      console.error("Failed to end impersonation:", error);
    }
  };

  const portalNotice = impersonation ? (
    <section className="ils-impersonation-notice" aria-label="Impersonation mode">
      <div className="ils-impersonation-notice-copy">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold">Impersonation Mode</p>
          <p className="text-xs">You are viewing this portal as {user?.name || 'Customer'}.</p>
        </div>
      </div>
      <DashboardButton variant="danger" icon={LogOut} onClick={handleEndImpersonation} aria-label="End impersonation">
        End Impersonation
      </DashboardButton>
    </section>
  ) : null;

  return (
    <PortalLayout
      Sidebar={CustomerSidebar}
      portalClassName="ils-external-portal"
      profilePath="/customer/profile"
      onEndImpersonation={handleEndImpersonation}
      portalNotice={portalNotice}
    />
  );
}
