import { useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { getInternalNavigation } from './internalNavigation';
import PortalSidebar from './PortalSidebar';

const initialOpenGroups = { Trucking: true, FTL: true };

export default function InternalSidebar() {
    const { user } = useAuth();
    const internalNavigation = useMemo(() => getInternalNavigation(user), [user]);
    return <PortalSidebar title="Internal Portal" navigationSections={internalNavigation} user={user} initialOpenGroups={initialOpenGroups} />;
}
