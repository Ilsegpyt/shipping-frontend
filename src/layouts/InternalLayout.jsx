import PortalLayout from "../components/common/PortalLayout";
import InternalSidebar from "../components/navigation/InternalSidebar";

export default function InternalLayout() {
  return <PortalLayout Sidebar={InternalSidebar} />;
}
