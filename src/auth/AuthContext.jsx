import { createContext, useContext, useEffect, useState } from 'react';
import { getMe } from './authService';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [impersonation, setImpersonation] = useState(null);

    useEffect(() => {
        async function loadUser() {
            const accessToken = localStorage.getItem('accessToken');

            if (!accessToken) {
                setLoading(false);
                return;
            }

            try {
                const currentUser = await getMe();
                setUser(currentUser);

                const impersonationAuditLogId =
                    localStorage.getItem('impersonationAuditLogId');

                if (impersonationAuditLogId) {
                    setImpersonation({
                        auditLogId: impersonationAuditLogId,
                    });
                }
            } catch (error) {
                console.error(error);

                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('accessTokenExpiresAtUtc');
                localStorage.removeItem('impersonationAuditLogId');
                localStorage.removeItem('originalAccessToken');
                localStorage.removeItem('originalRefreshToken');
                localStorage.removeItem('originalAccessTokenExpiresAtUtc');

                setUser(null);
                setImpersonation(null);
            } finally {
                setLoading(false);
            }
        }

        loadUser();
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
            } catch (error) {
                console.error(error);
                setUser(null);
            }

            setImpersonation(null);
        }
    };

    const logout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('accessTokenExpiresAtUtc');
        localStorage.removeItem('impersonationAuditLogId');
        localStorage.removeItem('originalAccessToken');
        localStorage.removeItem('originalRefreshToken');
        localStorage.removeItem('originalAccessTokenExpiresAtUtc');

        setUser(null);
        setImpersonation(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                setUser,
                loading,
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
