import { customerTeamAccessLink, customerProfileLink } from '../../components/navigation/portalNavigation';
import { useAuth } from '../../auth/AuthContext';
import PortalDashboard from '../../components/dashboard/PortalDashboard';

const links = [customerTeamAccessLink, customerProfileLink];

export default function CustomerDashboard() {
    const { user, impersonation } = useAuth();
    const dashboardLinks = impersonation
        ? [customerTeamAccessLink, { ...customerProfileLink, label: 'Customer Profile', description: 'View and manage customer information.' }]
        : links;

    return (
        <PortalDashboard
            user={user}
            role="Customer"
            description="Your customer workspace at a glance."
            welcomeDescription="Manage your account from one place."
            links={dashboardLinks}
        />
    );
}
