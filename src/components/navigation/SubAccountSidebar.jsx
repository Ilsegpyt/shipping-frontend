import PortalSidebar from './PortalSidebar';
import { subaccountNavigation } from './portalNavigation';

export default function SubAccountSidebar() {
    return <PortalSidebar title="Subaccount Portal" navigationSections={subaccountNavigation} />;
}
