
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import LoadingScreen from '../components/common/LoadingScreen';

function getTokenType() {
    const token = localStorage.getItem('accessToken');

    if (!token) {
        return null;
    }

    try {
        const payload = token.split('.')[1];

        if (!payload) {
            return null;
        }

        const base64 = payload
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const padded = base64.padEnd(
            Math.ceil(base64.length / 4) * 4,
            '='
        );

        return JSON.parse(atob(padded)).token_type ?? null;
    } catch {
        return null;
    }
}

function getPortalHome(tokenType) {
    switch (tokenType) {
        case 'internal':
            return '/dashboard';

        case 'customer':
            return '/customer';

        case 'impersonation':
            return '/customer';

        case 'sub_account':
            return '/subaccount';

        default:
            return '/login';
    }
}

export default function ProtectedRoute({ requiredPermission }) {
    const {
        user,
        loading,
        authUnavailable,
    } = useAuth();

    const location = useLocation();

    const hasAccessToken = Boolean(
        localStorage.getItem('accessToken')
    );

    if (loading) {
        return <LoadingScreen />;
    }

    // Do not redirect to login when user verification fails temporarily.
    if (authUnavailable && hasAccessToken) {
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

    if (
        requiredPermission &&
        !user.permissions?.includes(requiredPermission)
    ) {
        const tokenType = getTokenType();
        const portalHome = getPortalHome(tokenType);

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
