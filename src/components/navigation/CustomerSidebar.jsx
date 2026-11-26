import PortalSidebar from './PortalSidebar';
import { customerNavigation } from './portalNavigation';

export default function CustomerSidebar() {
    return <PortalSidebar title="Customer Portal" navigationSections={customerNavigation} />;
}
