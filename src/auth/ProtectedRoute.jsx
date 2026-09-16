

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import LoadingScreen from '../components/common/LoadingScreen';

export default function ProtectedRoute({ requiredPermission }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <LoadingScreen />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (
        requiredPermission &&
        !user.permissions?.includes(requiredPermission)
    ) {
        return <Navigate to="/dashboard" replace state={{ from: location }} />;
    }

    return <Outlet />;
}