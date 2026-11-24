import { createContext, useContext, useEffect, useState } from 'react';
import { getMe, logout as logoutService } from './authService';
import api, { getAccessToken, setAccessToken, refreshAccessToken } from '../services/api';

const AuthContext = createContext(null);

const MAX_AUTH_RETRIES = 3;
const DEFAULT_RETRY_AFTER_MS = 60_000;

const wait = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms));

function getRetryDelay(error, attempt) {
    const status = error.response?.status;

    if (status === 429) {
        const retryAfter = error.response?.headers?.['retry-after'];

        if (retryAfter) {
            const seconds = Number(retryAfter);

            if (Number.isFinite(seconds) && seconds >= 0) {
                return seconds * 1000;
            }

            const retryDate = Date.parse(retryAfter);

            if (!Number.isNaN(retryDate)) {
                return Math.max(0, retryDate - Date.now());
            }
        }

        return DEFAULT_RETRY_AFTER_MS;
    }

    return Math.min(3000 * 2 ** (attempt - 1), 8000);
}

function isTemporaryError(error) {
    const status = error.response?.status;

    return (
        status === 429 ||
        !error.response ||
        status >= 500
    );
}

function clearSession() {
    [
        'accessToken',
        'refreshToken',
        'accessTokenExpiresAtUtc',
        'impersonationAuditLogId',
        'originalAccessToken',
        'originalRefreshToken',
        'originalAccessTokenExpiresAtUtc',
    ].forEach((key) => localStorage.removeItem(key));
    sessionStorage.clear();
    setAccessToken(null);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authUnavailable, setAuthUnavailable] = useState(false);
    const [impersonation, setImpersonation] = useState(null);

    useEffect(() => {
        let active = true;

        async function loadUser() {
            // Clean up any legacy localStorage tokens
            [
                'accessToken',
                'refreshToken',
                'accessTokenExpiresAtUtc',
            ].forEach((key) => localStorage.removeItem(key));

            for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
                try {
                    if (!getAccessToken()) {
                        await refreshAccessToken();
                    }

                    const currentUser = await getMe();

                    if (!active) return;

                    setUser(currentUser);
                    setAuthUnavailable(false);

                    const auditLogId = sessionStorage.getItem(
                        'impersonationAuditLogId'
                    );

                    setImpersonation(
                        auditLogId ? { auditLogId } : null
                    );

                    setLoading(false);
                    return;
                } catch (error) {
                    if (!active) return;

                    if (isTemporaryError(error)) {
                        setAuthUnavailable(true);
                        setLoading(false);

                        if (attempt < MAX_AUTH_RETRIES) {
                            const delay = getRetryDelay(error, attempt + 1);

                            await wait(delay);

                            if (!active) return;

                            continue;
                        }

                        return;
                    }

                    // 401 or not logged in
                    clearSession();
                    setUser(null);
                    setImpersonation(null);
                    setAuthUnavailable(false);
                    setLoading(false);
                    return;
                }
            }
        }

        loadUser();

        return () => {
            active = false;
        };
    }, []);

    const startImpersonation = async (response) => {
        const currentAccessToken = getAccessToken();

        sessionStorage.setItem('originalAccessToken', currentAccessToken ?? '');
        sessionStorage.setItem('originalRefreshToken', response.originalRefreshToken ?? '');
        sessionStorage.setItem('impersonationAuditLogId', response.auditLogId);

        setAccessToken(response.accessToken);

        const currentUser = await getMe();

        setUser(currentUser);
        setAuthUnavailable(false);
        setImpersonation({
            auditLogId: response.auditLogId,
        });
    };

    const endImpersonation = async () => {
        const auditLogId = sessionStorage.getItem('impersonationAuditLogId');

        if (!auditLogId) {
            return;
        }

        try {
            await api.post('/api/identity/impersonation/end', {
                auditLogId,
            });
        } finally {
            const originalRefreshToken = sessionStorage.getItem(
                'originalRefreshToken'
            );

            sessionStorage.removeItem('impersonationAuditLogId');
            sessionStorage.removeItem('originalAccessToken');
            sessionStorage.removeItem('originalRefreshToken');

            try {
                if (originalRefreshToken) {
                    await refreshAccessToken(originalRefreshToken);
                } else {
                    await refreshAccessToken();
                }

                const currentUser = await getMe();

                setUser(currentUser);
                setAuthUnavailable(false);
            } catch (error) {
                console.error('Failed to reload user after impersonation:', error);

                if (isTemporaryError(error)) {
                    setAuthUnavailable(true);
                } else if (error.response?.status === 401) {
                    setUser(null);
                }
            }

            setImpersonation(null);
        }
    };

    const logout = async () => {
        try {
            await logoutService();
        } catch (e) {
            console.error('Logout error:', e);
        }

        clearSession();

        setUser(null);
        setImpersonation(null);
        setAuthUnavailable(false);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                setUser,
                loading,
                authUnavailable,
                logout,
                impersonation,
                startImpersonation,
                endImpersonation,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
