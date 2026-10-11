
import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import api from '../../services/api';
import { Pencil, X, Save } from 'lucide-react';

export default function CustomerProfile() {
    const { user } = useAuth();

    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(user?.name ?? '');
    const [phone, setPhone] = useState(user?.phone ?? '');
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [changingPassword, setChangingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        setName(user?.name ?? '');
        setPhone(user?.phone ?? '');
    }, [user]);

    const handleCancel = () => {
        setName(user?.name ?? '');
        setPhone(user?.phone ?? '');
        setMessage('');
        setError('');
        setIsEditing(false);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            setError('Name is required.');
            setMessage('');
            return;
        }

        if (!phone.trim()) {
            setError('Phone is required.');
            setMessage('');
            return;
        }

        setIsSaving(true);
        setError('');
        setMessage('');

        try {
            await api.put('/api/customers/me/profile', {
                ownerName: name.trim(),
                ownerPhone: phone.trim(),
            });

            setMessage('Profile updated successfully.');
            setIsEditing(false);
        } catch (requestError) {
            setError(
                requestError?.response?.data?.error ||
                requestError?.response?.data?.message ||
                'Could not save your profile. Please try again.'
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();

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

            setPasswordSuccess(
                'Password changed successfully.'
            );
        } catch (error) {
            console.error(error);

            const message =
                error.response?.data ||
                'Failed to change password. Please try again.';

            setPasswordError(
                typeof message === 'string'
                    ? message
                    : 'Failed to change password. Please try again.'
            );
        } finally {
            setChangingPassword(false);
        }
    };

    const EyeIcon = ({ visible }) => {
        if (visible) {
            return (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-5 w-5"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.98 8.5C2.99 9.82 2.5 11 2.5 11s3.5 6 9.5 6c1.13 0 2.16-.2 3.08-.52M9.88 5.24C10.55 5.08 11.25 5 12 5c6 0 9.5 6 9.5 6s-.86 1.48-2.44 2.93M14.12 14.12a3 3 0 01-4.24-4.24"
                    />
                    <path
                        strokeLinecap="round"
                        d="M3 3l18 18"
                    />
                </svg>
            );
        }

        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"
                />

                <circle
                    cx="12"
                    cy="12"
                    r="3"
                />
            </svg>
        );
    };


    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                    My Profile
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    View and manage your account information.
                </p>
            </div>

            <div className="w-full max-w-4xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-4">
                    <h2 className="text-base font-semibold text-gray-900">
                        Personal Information
                    </h2>

                    {!isEditing && (
                        <button
                            type="button"
                            onClick={() => {
                                setMessage('');
                                setError('');
                                setIsEditing(true);
                            }}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            <Pencil size={16} />
                            Edit Profile
                        </button>
                    )}
                </div>

                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                    <div>
                        <label
                            htmlFor="profile-name"
                            className="text-xs font-medium uppercase tracking-wide text-gray-500"
                        >
                            Name
                        </label>
                        <input
                            id="profile-name"
                            type="text"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            disabled={!isEditing || isSaving}
                            className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-700"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="profile-email"
                            className="text-xs font-medium uppercase tracking-wide text-gray-500"
                        >
                            Email
                        </label>
                        <input
                            id="profile-email"
                            type="email"
                            value={user?.email ?? ''}
                            readOnly
                            className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-500"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Email cannot be changed here.
                        </p>
                    </div>

                    <div>
                        <label
                            htmlFor="profile-phone"
                            className="text-xs font-medium uppercase tracking-wide text-gray-500"
                        >
                            Phone
                        </label>
                        <input
                            id="profile-phone"
                            type="tel"
                            value={phone}
                            onChange={(event) => setPhone(event.target.value)}
                            disabled={!isEditing || isSaving}
                            className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-700"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="profile-company"
                            className="text-xs font-medium uppercase tracking-wide text-gray-500"
                        >
                            Company
                        </label>
                        <input
                            id="profile-company"
                            type="text"
                            value={user?.companyName ?? ''}
                            readOnly
                            className="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-500"
                        />
                    </div>

                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Account Type
                        </p>
                        <p className="mt-2 text-sm font-medium capitalize text-gray-900">
                            {user?.tokenType || '-'}
                        </p>
                    </div>
                </div>

                {error && (
                    <p
                        role="alert"
                        className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
                    >
                        {error}
                    </p>
                )}

                {message && (
                    <p
                        role="status"
                        className="mt-5 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700"
                    >
                        {message}
                    </p>
                )}

                {isEditing && (
                    <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-5">
                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                        >
                            <X size={16} />
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Save size={16} />
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                )}
            </div>

            {/* Change Password */}
            <div className="w-full max-w-5xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="border-b border-gray-100 pb-5">
                    <h3 className="text-base font-semibold text-gray-900">
                        Change Password
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                        Update your account password.
                    </p>
                </div>

                {passwordError && (
                    <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {passwordError}
                    </div>
                )}

                {passwordSuccess && (
                    <div className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                        {passwordSuccess}
                    </div>
                )}

                <div className="mx-auto mt-6 w-full max-w-3xl rounded-xl border border-gray-200 bg-gray-50 p-6">
                    <form onSubmit={handleChangePassword}>
                        {/* Current Password */}
                        <div>
                            <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Current Password
                            </label>

                            <div className="relative mt-2">
                                <input
                                    type={
                                        showCurrentPassword
                                            ? 'text'
                                            : 'password'
                                    }
                                    value={currentPassword}
                                    onChange={(event) =>
                                        setCurrentPassword(
                                            event.target.value
                                        )
                                    }
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-11 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    placeholder="Enter your current password"
                                    disabled={changingPassword}
                                    required
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowCurrentPassword(
                                            !showCurrentPassword
                                        )
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
                                    aria-label={
                                        showCurrentPassword
                                            ? 'Hide password'
                                            : 'Show password'
                                    }
                                >
                                    <EyeIcon
                                        visible={showCurrentPassword}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* New Password + Confirm Password */}
                        <div className="mt-5 grid gap-5 sm:grid-cols-2">
                            <div>
                                <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    New Password
                                </label>

                                <div className="relative mt-2">
                                    <input
                                        type={
                                            showNewPassword
                                                ? 'text'
                                                : 'password'
                                        }
                                        value={newPassword}
                                        onChange={(event) =>
                                            setNewPassword(
                                                event.target.value
                                            )
                                        }
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-11 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                        placeholder="Enter your new password"
                                        minLength={6}
                                        disabled={changingPassword}
                                        required
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowNewPassword(
                                                !showNewPassword
                                            )
                                        }
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
                                        aria-label={
                                            showNewPassword
                                                ? 'Hide password'
                                                : 'Show password'
                                        }
                                    >
                                        <EyeIcon
                                            visible={showNewPassword}
                                        />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Confirm New Password
                                </label>

                                <div className="relative mt-2">
                                    <input
                                        type={
                                            showConfirmPassword
                                                ? 'text'
                                                : 'password'
                                        }
                                        value={confirmPassword}
                                        onChange={(event) =>
                                            setConfirmPassword(
                                                event.target.value
                                            )
                                        }
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-11 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                        placeholder="Confirm your new password"
                                        minLength={6}
                                        disabled={changingPassword}
                                        required
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowConfirmPassword(
                                                !showConfirmPassword
                                            )
                                        }
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
                                        aria-label={
                                            showConfirmPassword
                                                ? 'Hide password'
                                                : 'Show password'
                                        }
                                    >
                                        <EyeIcon
                                            visible={showConfirmPassword}
                                        />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Action */}
                        <div className="mt-6 flex justify-end border-t border-gray-200 pt-5">
                            <button
                                type="submit"
                                disabled={changingPassword}
                                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {changingPassword
                                    ? 'Changing Password...'
                                    : 'Change Password'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
