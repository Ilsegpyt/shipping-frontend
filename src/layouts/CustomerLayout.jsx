import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

import PortalLayout from "../components/common/PortalLayout";
import CustomerSidebar from "../components/navigation/CustomerSidebar";
import { useAuth } from "../auth/AuthContext";

export default function CustomerLayout() {
  const { impersonation, endImpersonation } = useAuth();
  const navigate = useNavigate();

  const handleEndImpersonation = async () => {
    try {
      await endImpersonation();
      navigate("/dashboard");
    } catch (error) {
      console.error("Failed to end impersonation:", error);
    }
  };

  const headerActions = impersonation ? (
    <button
      type="button"
      onClick={handleEndImpersonation}
      aria-label="End impersonation"
      title="End Impersonation"
      className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
    >
      <LogOut className="h-4 w-4 shrink-0" />
      <span>End Impersonation</span>
    </button>
  ) : null;

  return (
    <PortalLayout Sidebar={CustomerSidebar} headerActions={headerActions} />
  );
}
