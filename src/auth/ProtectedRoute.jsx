import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import LoadingScreen from '../components/common/LoadingScreen';

function getPortalHome(tokenType, user) {
    switch (tokenType) {
        case 'internal':
            if (
                user?.permissions?.includes('operations.ftl.view') &&
                !user?.permissions?.includes('reports.view') &&
                !user?.permissions?.includes('operations.view')
            ) {
                return '/ftl/dashboard';
            }
            if (
                user?.permissions?.includes('operations.view') &&
                !user?.permissions?.includes('reports.view')
            ) {
                return '/transport/entry';
            }
            return '/dashboard';

        case 'customer':
        case 'impersonation':
            return '/customer';

        case 'subaccount':
        case 'sub_account':
            return '/subaccount';

        default:
            return '/login';
    }
}

export default function ProtectedRoute({ requiredPermission, customCheck }) {
    const {
        user,
        loading,
        authUnavailable,
    } = useAuth();

    const location = useLocation();

    if (loading) {
        return <LoadingScreen />;
    }

    // Do not redirect to login when user verification fails temporarily.
    if (authUnavailable) {
        return (
            <div
                role="alert"
                style={{
                    padding: '24px',
                    textAlign: 'center',
                }}
            >
                <p>
                    Unable to verify your session right now.
                    Please try again in a moment.
                </p>

                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    style={{
                        padding: '10px 16px',
                        cursor: 'pointer',
                    }}
                >
                    Try again
                </button>
            </div>
        );
    }

    if (!user) {
        return (
            <Navigate
                to="/login"
                replace
                state={{ from: location }}
            />
        );
    }

    const tokenType = user?.tokenType?.toLowerCase();

    const isSuperAdmin = Boolean(
        user?.isSuperAdmin ||
        user?.role === 'SuperAdmin' ||
        user?.roleName === 'Super Admin'
    );

    if (customCheck && !customCheck(user)) {
        const portalHome = getPortalHome(tokenType, user);
        return <Navigate to={portalHome} replace state={{ from: location }} />;
    }

    if (
        requiredPermission &&
        !isSuperAdmin &&
        !user.permissions?.includes(requiredPermission)
    ) {
        const portalHome = getPortalHome(tokenType, user);

        if (location.pathname !== portalHome) {
            return (
                <Navigate
                    to={portalHome}
                    replace
                    state={{ from: location }}
                />
            );
        }

        return <Outlet />;
    }

    return <Outlet />;
}
