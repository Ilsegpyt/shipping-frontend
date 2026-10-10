
import { createContext, useContext, useEffect, useState } from 'react';
import { getMe } from './authService';
import api from '../services/api';

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
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authUnavailable, setAuthUnavailable] = useState(false);
    const [impersonation, setImpersonation] = useState(null);

    useEffect(() => {
        let active = true;

        async function loadUser() {
            const accessToken = localStorage.getItem('accessToken');

            if (!accessToken) {
                setLoading(false);
                return;
            }

            for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
                try {
                    const currentUser = await getMe();

                    if (!active) return;

                    setUser(currentUser);
                    setAuthUnavailable(false);

                    const auditLogId = localStorage.getItem(
                        'impersonationAuditLogId'
                    );

                    setImpersonation(
                        auditLogId ? { auditLogId } : null
                    );

                    setLoading(false);
                    return;
                } catch (error) {
                    if (!active) return;

                    console.error('Failed to load current user:', error);

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

                    if (error.response?.status === 401) {
                        clearSession();
                        setUser(null);
                        setImpersonation(null);
                        setAuthUnavailable(false);
                    }

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
        const currentAccessToken = localStorage.getItem('accessToken');
        const currentRefreshToken = localStorage.getItem('refreshToken');
        const currentAccessTokenExpiresAtUtc = localStorage.getItem(
            'accessTokenExpiresAtUtc'
        );

        localStorage.setItem('originalAccessToken', currentAccessToken ?? '');
        localStorage.setItem('originalRefreshToken', currentRefreshToken ?? '');
        localStorage.setItem(
            'originalAccessTokenExpiresAtUtc',
            currentAccessTokenExpiresAtUtc ?? ''
        );

        localStorage.setItem('accessToken', response.accessToken);
        localStorage.setItem('refreshToken', response.refreshToken);
        localStorage.setItem(
            'accessTokenExpiresAtUtc',
            response.accessTokenExpiresAtUtc
        );
        localStorage.setItem(
            'impersonationAuditLogId',
            response.auditLogId
        );

        const currentUser = await getMe();

        setUser(currentUser);
        setAuthUnavailable(false);
        setImpersonation({
            auditLogId: response.auditLogId,
        });
    };

    const endImpersonation = async () => {
        const auditLogId = localStorage.getItem('impersonationAuditLogId');

        if (!auditLogId) {
            return;
        }

        try {
            await api.post('/api/identity/impersonation/end', {
                auditLogId,
            });
        } finally {
            const originalAccessToken = localStorage.getItem(
                'originalAccessToken'
            );
            const originalRefreshToken = localStorage.getItem(
                'originalRefreshToken'
            );
            const originalAccessTokenExpiresAtUtc = localStorage.getItem(
                'originalAccessTokenExpiresAtUtc'
            );

            if (originalAccessToken) {
                localStorage.setItem('accessToken', originalAccessToken);
            }

            if (originalRefreshToken) {
                localStorage.setItem('refreshToken', originalRefreshToken);
            }

            if (originalAccessTokenExpiresAtUtc) {
                localStorage.setItem(
                    'accessTokenExpiresAtUtc',
                    originalAccessTokenExpiresAtUtc
                );
            }

            localStorage.removeItem('impersonationAuditLogId');
            localStorage.removeItem('originalAccessToken');
            localStorage.removeItem('originalRefreshToken');
            localStorage.removeItem('originalAccessTokenExpiresAtUtc');

            try {
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

    const logout = () => {
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
