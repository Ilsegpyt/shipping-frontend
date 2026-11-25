import { sanitizePhoneInput } from "../../../utils/phoneInput.js";
import ApiFieldError from '../../../components/common/ApiFieldError';
import { useState, useEffect } from 'react';
import { UserRound, ShieldCheck } from 'lucide-react';
import { DashboardPage, DashboardPageHeader, DashboardButton } from '../../../components/dashboard/DashboardUI';
import './profile-dashboard.css';
import { useAuth } from '../../../auth/AuthContext';
import { updateProfile, updateEmail } from '../../../auth/authService';
import api from '../../../services/api';
import { extractApiErrorMessage, extractApiFieldErrors } from '../../../utils/errorUtils';

export default function Profile() {
    const { user, setUser } = useAuth();

    const roleValues = [
        user?.roleName,
        user?.role,
        ...(Array.isArray(user?.roles)
            ? user.roles.map((role) =>
                typeof role === 'string' ? role : role?.name
            )
            : []),
    ];

    const normalizedRoles = roleValues
        .filter(Boolean)
        .map((role) =>
            String(role)
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, ' ')
                .trim()
        );

    const isSuperAdmin = normalizedRoles.some((role) =>
        role.includes('super admin')
    );

    const isAccountManager =
        !isSuperAdmin &&
        normalizedRoles.some((role) => role.includes('account manager'));

    const canEditProfile = !isAccountManager;

    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(user?.name || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [email, setEmail] = useState(user?.email || '');

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [profileFieldErrors, setProfileFieldErrors] = useState({});
    const [success, setSuccess] = useState('');

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [changingPassword, setChangingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordFieldErrors, setPasswordFieldErrors] = useState({});
    const [passwordSuccess, setPasswordSuccess] = useState('');

    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);



    const handleEdit = () => {
        setName(user?.name || '');
        setPhone(user?.phone || '');
        setEmail(user?.email || '');
        setError('');
        setProfileFieldErrors({});
        setSuccess('');
        setIsEditing(true);
    };

    const handleCancel = () => {
        setName(user?.name || '');
        setPhone(user?.phone || '');
        setEmail(user?.email || '');
        setError('');
        setProfileFieldErrors({});
        setIsEditing(false);
    };

    const handleSave = async () => {
        setError('');
        setProfileFieldErrors({});
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
            setProfileFieldErrors(extractApiFieldErrors(error));
            setError(
                extractApiErrorMessage(
                    error,
                    'Failed to update profile. Please try again.'
                )
            );
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();

        setPasswordError('');

        setPasswordFieldErrors({});
        setPasswordSuccess('');

        if (!currentPassword) {
            setPasswordError('Current password is required.');
            return;
        }

        if (!newPassword) {
            setPasswordError('New password is required.');
            return;
        }

        if (newPassword.length < 8) {
            setPasswordError('Password must be at least 8 characters long.');
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
            setPasswordFieldErrors(extractApiFieldErrors(error));
            setPasswordError(
                extractApiErrorMessage(
                    error,
                    'Failed to change password. Please try again.'
                )
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
        <DashboardPage className="ils-profile">
            <DashboardPageHeader title="Profile" description="View and manage your account information." />
            <div className="ils-profile-summary">
                <span className="ils-profile-avatar"><UserRound size={30} aria-hidden="true" /></span>
                <div className="min-w-0 break-words">
                    <h2>{user?.name || 'User'}</h2>
                    <p>{user?.email || '—'}</p>
                </div>
                {user?.roleName && <span className="ils-profile-role">{user.roleName}</span>}
            </div>
            {/* Personal Information */}
            <div className="ils-profile-panel">
                <div className="flex flex-wrap gap-4 items-start justify-between border-b border-brand-border pb-5">
                    <div>
                        <h3 className="ils-profile-section-title">
                            <UserRound size={20} aria-hidden="true" /> Personal Information
                        </h3>

                        <p className="mt-1 text-sm text-brand-muted">
                            Manage your personal information.
                        </p>
                    </div>

                    {!isEditing && canEditProfile && (
                        <DashboardButton
                            type="button"
                            onClick={handleEdit}
                            variant="secondary"
                        >
                            Edit Profile
                        </DashboardButton>
                    )}
                </div>

                {error && (
                    <div className="mt-5 flex items-center justify-between rounded-none border border-brand-danger-border bg-brand-danger-soft px-4 py-3 text-sm text-brand-danger">
                        <span>{error}</span>
                        <button
                            type="button"
                            onClick={() => setError('')}
                            className="ml-3 text-brand-danger hover:text-brand-danger font-bold"
                            title="Close"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {success && (
                    <div className="mt-5 rounded-none border border-brand-success-border bg-brand-success-soft px-4 py-3 text-sm text-brand-success">
                        {success}
                    </div>
                )}

                <div className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2">
                    <div>
                        <label className="text-xs font-medium uppercase tracking-wide text-brand-muted">
                            Name
                        </label>

                        {isEditing && canEditProfile ? (
                            <> <input
                                type="text"
                                value={name}
                                onChange={(event) => { setName(event.target.value); setProfileFieldErrors(previous => ({ ...previous, name: undefined })); }}
                                className="mt-2 w-full rounded-none border border-brand-border px-3 py-2 text-sm outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-surface-blue"
                             autoComplete="name" /><ApiFieldError errors={profileFieldErrors} field="name" /></>
                        ) : isAccountManager ? (
                            <input
                                type="text"
                                value={user?.name || ''}
                                readOnly
                                disabled
                                className="mt-2 w-full cursor-not-allowed rounded-none border border-brand-border bg-brand-surface-tint px-3 py-2 text-sm text-brand-muted"
                            />
                        ) : (
                            <p className="mt-1 text-sm font-medium text-brand-text">
                                {user?.name || '-'}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="text-xs font-medium uppercase tracking-wide text-brand-muted">
                            Email
                        </label>

                        {isEditing && canEditProfile ? (
                            <> <input
                                type="email"
                                value={email}
                                onChange={(event) => { setEmail(event.target.value); setProfileFieldErrors(previous => ({ ...previous, email: undefined })); }}
                                className="mt-2 w-full rounded-none border border-brand-border px-3 py-2 text-sm outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-surface-blue"
                             autoComplete="email" /><ApiFieldError errors={profileFieldErrors} field="email" /></>
                        ) : isAccountManager ? (
                            <input
                                type="email"
                                value={user?.email || ''}
                                readOnly
                                disabled
                                className="mt-2 w-full cursor-not-allowed rounded-none border border-brand-border bg-brand-surface-tint px-3 py-2 text-sm text-brand-muted"
                            />
                        ) : (
                            <p className="mt-1 text-sm font-medium text-brand-text">
                                {user?.email || '-'}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="text-xs font-medium uppercase tracking-wide text-brand-muted">
                            Phone
                        </label>

                        {isEditing && canEditProfile ? (
                            <> <input
                                            onInput={sanitizePhoneInput}
                                type="tel"
                                value={phone}
                                onChange={(event) => { setPhone(event.target.value); setProfileFieldErrors(previous => ({ ...previous, phone: undefined })); }}
                                className="mt-2 w-full rounded-none border border-brand-border px-3 py-2 text-sm outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-surface-blue"
                             autoComplete="tel" /><ApiFieldError errors={profileFieldErrors} field="phone" /></>
                        ) : isAccountManager ? (
                            <input
                                type="text"
                                value={user?.phone || ''}
                                readOnly
                                disabled
                                className="mt-2 w-full cursor-not-allowed rounded-none border border-brand-border bg-brand-surface-tint px-3 py-2 text-sm text-brand-muted"
                            />
                        ) : (
                            <p className="mt-1 text-sm font-medium text-brand-text">
                                {user?.phone || '-'}
                            </p>
                        )}
                    </div>

                    {user?.tokenType === 'internal' && (
                        <div>
                            <label className="text-xs font-medium uppercase tracking-wide text-brand-muted">
                                Role
                            </label>

                            <p className="mt-1 text-sm font-medium text-brand-text">
                                {user?.roleName || '-'}
                            </p>
                        </div>
                    )}

                    {user?.companyName && (
                        <div>
                            <label className="text-xs font-medium uppercase tracking-wide text-brand-muted">
                                Company
                            </label>

                            <p className="mt-1 text-sm font-medium text-brand-text">
                                {user.companyName}
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-medium uppercase tracking-wide text-brand-muted">
                            Account Type
                        </label>

                        <p className="mt-1 text-sm font-medium capitalize text-brand-text">
                            {user?.tokenType || '-'}
                        </p>
                    </div>
                </div>

                {isEditing && canEditProfile && (
                    <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-brand-border pt-5">
                        <DashboardButton
                            type="button"
                            onClick={handleCancel}
                            disabled={saving}
                            variant="secondary"
                        >
                            Cancel
                        </DashboardButton>

                        <DashboardButton
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            variant="primary"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </DashboardButton>
                    </div>
                )}
            </div>

            {/* Change Password */}
            <div className="ils-profile-panel">
                <div className="border-b border-brand-border pb-5">
                    <h3 className="ils-profile-section-title">
                        <ShieldCheck size={20} aria-hidden="true" /> Change Password
                    </h3>

                    <p className="mt-1 text-sm text-brand-muted">
                        Update your account password.
                    </p>
                </div>

                {passwordError && (
                    <div className="mt-5 flex items-center justify-between rounded-none border border-brand-danger-border bg-brand-danger-soft px-4 py-3 text-sm text-brand-danger">
                        <span>{passwordError}</span>
                        <button
                            type="button"
                            onClick={() => setPasswordError('')}
                            className="ml-3 text-brand-danger hover:text-brand-danger font-bold"
                            title="Close"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {passwordSuccess && (
                    <div className="mt-5 rounded-none border border-brand-success-border bg-brand-success-soft px-4 py-3 text-sm text-brand-success">
                        {passwordSuccess}
                    </div>
                )}

                <div className="mt-6 w-full border border-brand-border bg-brand-surface-tint p-4 sm:p-6">
                    <form onSubmit={handleChangePassword}>
                        {/* Current Password */}
                        <div>
                            <label className="text-xs font-medium uppercase tracking-wide text-brand-muted">
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
                                    onChange={(event) => { setCurrentPassword(event.target.value); setPasswordFieldErrors(previous => ({ ...previous, currentpassword: undefined })); }}
                                    className="w-full rounded-none border border-brand-border bg-brand-surface px-3 py-2.5 pr-11 text-sm outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-surface-blue"
                                    autoComplete="current-password"
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
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted transition hover:text-brand-primary"
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
<ApiFieldError errors={passwordFieldErrors} field="currentPassword" />
                        </div>

                        {/* New Password + Confirm Password */}
                        <div className="mt-5 grid gap-5 sm:grid-cols-2">
                            <div>
                                <label className="text-xs font-medium uppercase tracking-wide text-brand-muted">
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
                                        onChange={(event) => { setNewPassword(event.target.value); setPasswordFieldErrors(previous => ({ ...previous, newpassword: undefined })); }}
                                        className="w-full rounded-none border border-brand-border bg-brand-surface px-3 py-2.5 pr-11 text-sm outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-surface-blue"
                                        autoComplete="new-password"
                                    placeholder="Enter your new password"
                                        minLength={8}
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
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted transition hover:text-brand-primary"
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
<ApiFieldError errors={passwordFieldErrors} field="newPassword" />

                                <p className="mt-1.5 text-xs text-brand-muted">
                                    Must be at least 8 characters with uppercase, lowercase, number, and special character (e.g. <span className="font-mono text-brand-text bg-brand-border px-1 py-0.5 rounded-none font-semibold">Pass@1234</span>).
                                </p>
                            </div>

                            <div>
                                <label className="text-xs font-medium uppercase tracking-wide text-brand-muted">
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
                                        onChange={(event) => { setConfirmPassword(event.target.value); setPasswordFieldErrors(previous => ({ ...previous, confirmpassword: undefined })); }}
                                        className="w-full rounded-none border border-brand-border bg-brand-surface px-3 py-2.5 pr-11 text-sm outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-surface-blue"
                                        autoComplete="new-password"
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
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted transition hover:text-brand-primary"
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
<ApiFieldError errors={passwordFieldErrors} field="confirmPassword" />
                            </div>
                        </div>

                        {/* Action */}
                        <div className="mt-6 flex justify-end border-t border-brand-border pt-5">
                            <DashboardButton
                                type="submit"
                                disabled={changingPassword}
                                variant="primary"
                            >
                                {changingPassword
                                    ? 'Changing Password...'
                                    : 'Change Password'}
                            </DashboardButton>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardPage>
    );
}