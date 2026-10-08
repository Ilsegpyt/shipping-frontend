import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, getMe } from '../../auth/authService';
import { useAuth } from '../../auth/AuthContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const { setUser } = useAuth();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { accessToken, refreshToken, accessTokenExpiresAtUtc } =
                await login(email, password);

            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);
            localStorage.setItem(
                'accessTokenExpiresAtUtc',
                accessTokenExpiresAtUtc
            );

            const currentUser = await getMe();

            console.log('LOGIN USER:', currentUser);

            setUser(currentUser);

            if (currentUser.tokenType === 'subaccount') {
                navigate('/subaccount');
            } else if (currentUser.tokenType === 'customer') {
                navigate('/customer');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            console.error(err);

            setError(
                'Login failed. Please check your email or password.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="relative flex min-h-screen items-center justify-center bg-slate-950 bg-cover bg-center"
            style={{
                backgroundImage: `url(${new URL('../../assets/branding/dashboard-hero.png', import.meta.url).href})`,
            }}
        >
            <div className="absolute inset-0 bg-slate-950/65" />

            <div className="relative z-10 w-full max-w-md rounded-xl border border-white/20 bg-white p-8 shadow-2xl">
                <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">
                    Login
                </h2>

                {error && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin}>
                    <div className="mb-4">
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                            Email
                        </label>

                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 p-2.5 text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div className="mb-2">
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                            Password
                        </label>

                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 p-2.5 text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div className="mb-6 text-right">
                        <button
                            type="button"
                            onClick={() => navigate('/forgot-password')}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                            Forgot Password?
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-blue-600 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Signing in...' : 'Sign in'}
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="mt-4 w-full text-sm font-medium text-gray-500 transition hover:text-blue-600"
                    >
                        ← Back to Home
                    </button>
                </form>
            </div>
        </div>
    );
}