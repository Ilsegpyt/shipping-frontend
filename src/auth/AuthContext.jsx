import { createContext, useContext, useEffect, useState } from 'react';
import { getMe } from './authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

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
            } catch (error) {
                console.error(error);

                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('accessTokenExpiresAtUtc');

                setUser(null);
            } finally {
                setLoading(false);
            }
        }

        loadUser();
    }, []);

    const logout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('accessTokenExpiresAtUtc');

        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                setUser,
                loading,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}