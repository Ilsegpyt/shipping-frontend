import { subaccountProfileLink } from '../../components/navigation/portalNavigation';
import { useAuth } from '../../auth/AuthContext';
import PortalDashboard from '../../components/dashboard/PortalDashboard';

const links = [subaccountProfileLink];

export default function SubAccountDashboard() {
    const { user } = useAuth();

    return (
        <PortalDashboard
            user={user}
            role="Subaccount"
            description="Your account workspace at a glance."
            welcomeDescription="Manage your account and available services."
            links={links}
        />
    );
}
