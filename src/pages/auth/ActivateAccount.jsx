import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { activateAccount } from '../../auth/authService';
import { extractApiErrorMessage } from '../../utils/errorUtils';

export default function ActivateAccount() {
    const [searchParams] = useSearchParams();

    const userId = searchParams.get('userId');
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!error) return;
        const timer = setTimeout(() => setError(''), 5000);
        return () => clearTimeout(timer);
    }, [error]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError('');

        if (!userId || !token) {
            setError(
                'This activation link is invalid or incomplete.'
            );
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);

        try {
            await activateAccount(
                userId,
                token,
                password
            );

            window.location.href = '/login';
        } catch (err) {
            console.error(err);

            setError(
                extractApiErrorMessage(
                    err,
                    'Account activation failed. The activation link may be invalid or expired.'
                )
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md rounded-xl border border-gray-100 bg-white p-8 shadow-md">
                <div className="mb-8 text-center">
                    <h2 className="mb-2 text-2xl font-bold text-gray-800">
                        Activate Your Account
                    </h2>

                    <p className="text-sm text-gray-500">
                        Set your password to activate your account.
                    </p>
                </div>

                {error && (
                    <div className="mb-5 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                        <span>{error}</span>
                        <button
                            type="button"
                            onClick={() => setError('')}
                            className="ml-3 font-bold text-red-500 hover:text-red-700"
                            title="Close"
                        >
                            ✕
                        </button>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                            New Password
                        </label>

                        <input
                            type="password"
                            value={password}
                            onChange={(e) =>
                                setPassword(e.target.value)
                            }
                            className="w-full rounded-lg border border-gray-300 p-2.5 text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Enter your password"
                            required
                            minLength={8}
                            disabled={loading}
                        />
                        <p className="mt-1.5 text-xs text-gray-500">
                            Must be at least 8 characters with uppercase, lowercase, number, and special character (e.g. <span className="font-mono text-gray-700 bg-gray-100 px-1 py-0.5 rounded font-semibold">Pass@1234</span>).
                        </p>
                    </div>

                    <div className="mb-6">
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                            Confirm Password
                        </label>

                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) =>
                                setConfirmPassword(e.target.value)
                            }
                            className="w-full rounded-lg border border-gray-300 p-2.5 text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Confirm your password"
                            required
                            minLength={8}
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-blue-600 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading
                            ? 'Activating...'
                            : 'Activate Account'}
                    </button>
                </form>
            </div>
        </div>
    );
}