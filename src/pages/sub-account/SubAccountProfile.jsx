import { useState } from 'react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import api from '../../services/api';

function PasswordField({
    id, label, value, onChange, visible, onToggle, placeholder, disabled,
}) {
    return (
        <div>
            <label htmlFor={id} className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {label}
            </label>
            <div className="relative mt-2">
                <input
                    id={id}
                    type={visible ? 'text' : 'password'}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    required
                    minLength={id === 'current-password' ? undefined : 6}
                    autoComplete={id === 'current-password' ? 'current-password' : 'new-password'}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-11 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <button
                    type="button"
                    onClick={onToggle}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
                    aria-label={visible ? 'Hide password' : 'Show password'}
                >
                    {visible ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
            </div>
        </div>
    );
}

export default function SubAccountProfile() {
    const { user } = useAuth();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    const handleChangePassword = async (event) => {
        event.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (!currentPassword) {
            setPasswordError('Current password is required.');
            return;
        }

        if (!newPassword) {
            setPasswordError('New password is required.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError('Passwords do not match.');
            return;
        }

        if (newPassword.length < 6) {
            setPasswordError('New password must be at least 6 characters.');
            return;
        }

        try {
            setChangingPassword(true);
            await api.post('/api/auth/change-password', {
                currentPassword,
                newPassword,
            });

            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowCurrentPassword(false);
            setShowNewPassword(false);
            setShowConfirmPassword(false);
            setPasswordSuccess('Password changed successfully.');
        } catch (requestError) {
            const responseData = requestError?.response?.data;
            const message = typeof responseData === 'string'
                ? responseData
                : responseData?.error || responseData?.message ||
                'Failed to change password. Please try again.';
            setPasswordError(message);
        } finally {
            setChangingPassword(false);
        }
    };



    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">Profile</h1>
                <p className="mt-1 text-sm text-gray-500">
                    View your account information and manage your password.
                </p>
            </div>

            <section className="w-full max-w-5xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="border-b border-gray-100 pb-5">
                    <h2 className="text-base font-semibold text-gray-900">Personal Information</h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Your account information is read-only. Contact your administrator if it needs to be changed.
                    </p>
                </div>

                <div className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Name</p>
                        <p className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                            {user?.name || '-'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Email</p>
                        <p className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                            {user?.email || '-'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Phone</p>
                        <p className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                            {user?.phone || '-'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Account Type</p>
                        <p className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm capitalize text-gray-700">
                            {user?.tokenType || 'subaccount'}
                        </p>
                    </div>
                </div>
            </section>

            <section className="w-full max-w-5xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-3 border-b border-gray-100 pb-5">
                    <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
                        <LockKeyhole size={20} />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-gray-900">Change Password</h2>
                        <p className="mt-1 text-sm text-gray-500">
                            You can change your password without editing your profile information.
                        </p>
                    </div>
                </div>

                {passwordError && (
                    <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {passwordError}
                    </div>
                )}
                {passwordSuccess && (
                    <div role="status" className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                        {passwordSuccess}
                    </div>
                )}

                <div className="mx-auto mt-6 w-full max-w-3xl rounded-xl border border-gray-200 bg-gray-50 p-6">
                    <form onSubmit={handleChangePassword}>
                        <PasswordField
                            id="current-password"
                            label="Current Password"
                            value={currentPassword}
                            onChange={(event) => setCurrentPassword(event.target.value)}
                            visible={showCurrentPassword}
                            onToggle={() => setShowCurrentPassword((value) => !value)}
                            placeholder="Enter your current password"
                            disabled={changingPassword}
                        />

                        <div className="mt-5 grid gap-5 sm:grid-cols-2">
                            <PasswordField
                                id="new-password"
                                label="New Password"
                                value={newPassword}
                                onChange={(event) => setNewPassword(event.target.value)}
                                visible={showNewPassword}
                                onToggle={() => setShowNewPassword((value) => !value)}
                                placeholder="Enter your new password"
                                disabled={changingPassword}
                            />
                            <PasswordField
                                id="confirm-password"
                                label="Confirm New Password"
                                value={confirmPassword}
                                onChange={(event) => setConfirmPassword(event.target.value)}
                                visible={showConfirmPassword}
                                onToggle={() => setShowConfirmPassword((value) => !value)}
                                placeholder="Confirm your new password"
                                disabled={changingPassword}
                            />
                        </div>

                        <div className="mt-6 flex justify-end border-t border-gray-200 pt-5">
                            <button
                                type="submit"
                                disabled={changingPassword}
                                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {changingPassword ? 'Changing Password...' : 'Change Password'}
                            </button>
                        </div>
                    </form>
                </div>
            </section>
        </div>
    );
}
