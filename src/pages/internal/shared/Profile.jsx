import { ProfileSummary, PasswordField } from "../../../components/dashboard/DashboardProfileUI";
import { sanitizePhoneInput } from "../../../utils/phoneInput.js";
import ApiFieldError from '../../../components/common/ApiFieldError';
import { useState, useEffect } from 'react';
import { UserRound, ShieldCheck } from 'lucide-react';
import { DashboardPage, DashboardPageHeader, DashboardButton } from '../../../components/dashboard/DashboardUI';
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

    return (
        <DashboardPage className="ils-profile">
            <DashboardPageHeader title="Profile" description="View and manage your account information." />
            <ProfileSummary name={user?.name} email={user?.email} role={user?.roleName} />
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
                    <div className="mt-5 flex items-center justify-between border border-brand-danger-border bg-brand-danger-soft px-4 py-3 text-sm text-brand-danger">
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
                    <div className="mt-5 border border-brand-success-border bg-brand-success-soft px-4 py-3 text-sm text-brand-success">
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
                                className="mt-2 ils-dashboard-field"
                             autoComplete="name" /><ApiFieldError errors={profileFieldErrors} field="name" /></>
                        ) : isAccountManager ? (
                            <input
                                type="text"
                                value={user?.name || ''}
                                readOnly
                                disabled
                                className="mt-2 ils-dashboard-field"
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
                                className="mt-2 ils-dashboard-field"
                             autoComplete="email" /><ApiFieldError errors={profileFieldErrors} field="email" /></>
                        ) : isAccountManager ? (
                            <input
                                type="email"
                                value={user?.email || ''}
                                readOnly
                                disabled
                                className="mt-2 ils-dashboard-field"
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
                                className="mt-2 ils-dashboard-field"
                             autoComplete="tel" /><ApiFieldError errors={profileFieldErrors} field="phone" /></>
                        ) : isAccountManager ? (
                            <input
                                type="text"
                                value={user?.phone || ''}
                                readOnly
                                disabled
                                className="mt-2 ils-dashboard-field"
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
                    <div className="mt-5 flex items-center justify-between border border-brand-danger-border bg-brand-danger-soft px-4 py-3 text-sm text-brand-danger">
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
                    <div className="mt-5 border border-brand-success-border bg-brand-success-soft px-4 py-3 text-sm text-brand-success">
                        {passwordSuccess}
                    </div>
                )}

                <div className="mt-6 w-full border border-brand-border bg-brand-surface-tint p-4 sm:p-6">
                    <form onSubmit={handleChangePassword}>
                        <PasswordField id="current-password" label="Current Password" value={currentPassword}
    onChange={(event) => { setCurrentPassword(event.target.value); setPasswordFieldErrors(previous => ({ ...previous, currentpassword: undefined })); }}
    visible={showCurrentPassword} onToggle={() => setShowCurrentPassword(!showCurrentPassword)}
    placeholder="Enter your current password" disabled={changingPassword} errors={passwordFieldErrors} field="currentPassword" />
                        <div className="mt-5 grid gap-5 sm:grid-cols-2">
                            <div><PasswordField id="new-password" label="New Password" value={newPassword}
    onChange={(event) => { setNewPassword(event.target.value); setPasswordFieldErrors(previous => ({ ...previous, newpassword: undefined })); }}
    visible={showNewPassword} onToggle={() => setShowNewPassword(!showNewPassword)}
    placeholder="Enter your new password" disabled={changingPassword} errors={passwordFieldErrors} field="newPassword" minLength={8} /><p className="mt-1.5 text-xs text-brand-muted">Must be at least 8 characters with uppercase, lowercase, number, and special character (e.g. <span className="font-mono text-brand-text bg-brand-border px-1 py-0.5 font-semibold">Pass@1234</span>).</p></div>
                            <PasswordField id="confirm-password" label="Confirm New Password" value={confirmPassword}
    onChange={(event) => { setConfirmPassword(event.target.value); setPasswordFieldErrors(previous => ({ ...previous, confirmpassword: undefined })); }}
    visible={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
    placeholder="Confirm your new password" disabled={changingPassword} errors={passwordFieldErrors} field="confirmPassword" minLength={6} />
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