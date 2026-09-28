import { useState } from 'react';
import { useAuth } from '../../../auth/AuthContext';
import { updateProfile, updateEmail } from '../../../auth/authService';
import api from '../../../services/api';

export default function Profile() {
    const { user, setUser } = useAuth();

    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(user?.name || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [email, setEmail] = useState(user?.email || '');

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [changingPassword, setChangingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleEdit = () => {
        setName(user?.name || '');
        setPhone(user?.phone || '');
        setEmail(user?.email || '');
        setError('');
        setSuccess('');
        setIsEditing(true);
    };

    const handleCancel = () => {
        setName(user?.name || '');
        setPhone(user?.phone || '');
        setEmail(user?.email || '');
        setError('');
        setIsEditing(false);
    };

    const handleSave = async () => {
        setError('');
        setSuccess('');

        if (!name.trim()) {
            setError('Name is required.');
            return;
        }

        if (!email.trim()) {
            setError('Email is required.');
            return;
        }

        try {
            setSaving(true);

            const profileChanged =
                name.trim() !== (user?.name || '') ||
                (phone.trim() || null) !== (user?.phone || null);

            const emailChanged =
                email.trim() !== (user?.email || '');

            if (profileChanged) {
                await updateProfile(
                    user.profileId,
                    name.trim(),
                    phone.trim() || null
                );
            }

            if (emailChanged) {
                await updateEmail(
                    user.profileId,
                    email.trim()
                );
            }

            setUser({
                ...user,
                name: name.trim(),
                phone: phone.trim() || null,
                email: email.trim(),
            });

            setSuccess('Profile updated successfully.');
            setIsEditing(false);
        } catch (error) {
            console.error(error);

            const message =
                error.response?.data ||
                'Failed to update profile. Please try again.';

            setError(
                typeof message === 'string'
                    ? message
                    : 'Failed to update profile. Please try again.'
            );
        } finally {
            setSaving(false);
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
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                    Profile
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                    View and manage your account information.
                </p>
            </div>

            {/* Personal Information */}
            <div className="w-full max-w-5xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between border-b border-gray-100 pb-5">
                    <div>
                        <h3 className="text-base font-semibold text-gray-900">
                            Personal Information
                        </h3>

                        <p className="mt-1 text-sm text-gray-500">
                            Manage your personal information.
                        </p>
                    </div>

                    {!isEditing && (
                        <button
                            type="button"
                            onClick={handleEdit}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                        >
                            Edit Profile
                        </button>
                    )}
                </div>

                {error && (
                    <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                        {success}
                    </div>
                )}

                <div className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2">
                    <div>
                        <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Name
                        </label>

                        {isEditing ? (
                            <input
                                type="text"
                                value={name}
                                onChange={(event) =>
                                    setName(event.target.value)
                                }
                                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        ) : (
                            <p className="mt-1 text-sm font-medium text-gray-900">
                                {user?.name || '-'}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Email
                        </label>

                        {isEditing ? (
                            <input
                                type="email"
                                value={email}
                                onChange={(event) =>
                                    setEmail(event.target.value)
                                }
                                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        ) : (
                            <p className="mt-1 text-sm font-medium text-gray-900">
                                {user?.email || '-'}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Phone
                        </label>

                        {isEditing ? (
                            <input
                                type="text"
                                value={phone}
                                onChange={(event) =>
                                    setPhone(event.target.value)
                                }
                                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        ) : (
                            <p className="mt-1 text-sm font-medium text-gray-900">
                                {user?.phone || '-'}
                            </p>
                        )}
                    </div>

                    {user?.tokenType === 'internal' && (
                        <div>
                            <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Role
                            </label>

                            <p className="mt-1 text-sm font-medium text-gray-900">
                                {user?.roleName || '-'}
                            </p>
                        </div>
                    )}

                    {user?.companyName && (
                        <div>
                            <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                Company
                            </label>

                            <p className="mt-1 text-sm font-medium text-gray-900">
                                {user.companyName}
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Account Type
                        </label>

                        <p className="mt-1 text-sm font-medium capitalize text-gray-900">
                            {user?.tokenType || '-'}
                        </p>
                    </div>
                </div>

                {isEditing && (
                    <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-5">
                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={saving}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
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