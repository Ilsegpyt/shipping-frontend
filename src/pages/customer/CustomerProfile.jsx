import { DashboardPage, DashboardPageHeader, DashboardButton } from "../../components/dashboard/DashboardUI";
import { ProfileSummary, PasswordField } from "../../components/dashboard/DashboardProfileUI";
import { sanitizePhoneInput } from "../../utils/phoneInput.js";
import ApiFieldError from '../../components/common/ApiFieldError';
import { extractApiErrorMessage, extractApiFieldErrors } from '../../utils/errorUtils.js';

import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import api from '../../services/api';
import { Pencil, X, Save, UserRound, ShieldCheck } from 'lucide-react';

export default function CustomerProfile() {
    const { user, impersonation } = useAuth();

    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(user?.name ?? '');
    const [phone, setPhone] = useState(user?.phone ?? '');
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [profileFieldErrors, setProfileFieldErrors] = useState({});

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

    useEffect(() => {
        setName(user?.name ?? '');
        setPhone(user?.phone ?? '');
    }, [user]);

    const handleCancel = () => {
        setName(user?.name ?? '');
        setPhone(user?.phone ?? '');
        setMessage('');
        setError('');
        setProfileFieldErrors({});
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
        setProfileFieldErrors({});
        setMessage('');

        try {
            await api.put('/api/customers/me/profile', {
                ownerName: name.trim(),
                ownerPhone: phone.trim(),
            });

            setMessage('Profile updated successfully.');
            setIsEditing(false);
        } catch (requestError) {
            setProfileFieldErrors(extractApiFieldErrors(requestError));
            setError(extractApiErrorMessage(requestError, 'Could not save your profile. Please try again.'));
        } finally {
            setIsSaving(false);
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

            setPasswordError(extractApiErrorMessage(error, 'Failed to change password. Please try again.'));
        } finally {
            setChangingPassword(false);
        }
    };

    return (
        <DashboardPage className="ils-profile">
            <DashboardPageHeader
                title={impersonation ? "Customer Profile" : "My Profile"}
                description={impersonation ? "View and manage customer account information." : "View and manage your account information."}
            />
            <ProfileSummary name={user?.name} email={user?.email} role="Customer" />

            <div className="ils-profile-panel">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-brand-border pb-5">
                    <h2 className="ils-profile-section-title"><UserRound size={20} aria-hidden="true" /> Personal Information</h2>

                    {!isEditing && (
                        <DashboardButton
                            type="button"
                            onClick={() => {
                                setMessage('');
                                setError('');
                                setProfileFieldErrors({});
                                setIsEditing(true);
                            }}
                            variant="secondary"
                        >
                            <Pencil size={16} />
                            Edit Profile
                        </DashboardButton>
                    )}
                </div>

                <div className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2">
                    <div>
                        <label
                            htmlFor="profile-name"
                            className="text-xs font-medium uppercase tracking-wide text-brand-muted"
                        >
                            Name
                        </label>
                        <input
                            id="profile-name"
                            type="text"
                            value={name}
                            onChange={(event) => { setName(event.target.value); setProfileFieldErrors(previous => ({ ...previous, ownername: undefined })); }}
                            disabled={!isEditing || isSaving}
                            className="mt-2 ils-dashboard-field"
                         autoComplete="name" />
<ApiFieldError errors={profileFieldErrors} field="ownerName" />
                    </div>

                    <div>
                        <label
                            htmlFor="profile-email"
                            className="text-xs font-medium uppercase tracking-wide text-brand-muted"
                        >
                            Email
                        </label>
                        <input
                            id="profile-email"
                            type="email"
                            value={user?.email ?? ''}
                            readOnly
                            className="mt-2 ils-dashboard-field"
                        />
                        <p className="mt-1 text-xs text-brand-muted">
                            Email cannot be changed here.
                        </p>
                    </div>

                    <div>
                        <label
                            htmlFor="profile-phone"
                            className="text-xs font-medium uppercase tracking-wide text-brand-muted"
                        >
                            Phone
                        </label>
                        <input
                                            onInput={sanitizePhoneInput}
                            id="profile-phone"
                            type="tel"
                            value={phone}
                            onChange={(event) => { setPhone(event.target.value); setProfileFieldErrors(previous => ({ ...previous, ownerphone: undefined })); }}
                            disabled={!isEditing || isSaving}
                            className="mt-2 ils-dashboard-field"
                         autoComplete="tel" />
<ApiFieldError errors={profileFieldErrors} field="ownerPhone" />
                    </div>

                    <div>
                        <label
                            htmlFor="profile-company"
                            className="text-xs font-medium uppercase tracking-wide text-brand-muted"
                        >
                            Company
                        </label>
                        <input
                            id="profile-company"
                            type="text"
                            value={user?.companyName ?? ''}
                            readOnly
                            className="mt-2 ils-dashboard-field"
                        />
                    </div>

                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-brand-muted">
                            Account Type
                        </p>
                        <p className="mt-2 text-sm font-medium capitalize text-brand-text">
                            {user?.tokenType || '-'}
                        </p>
                    </div>
                </div>

                {error && (
                    <p
                        role="alert"
                        className="mt-5 bg-brand-danger-soft px-4 py-3 text-sm text-brand-danger"
                    >
                        {error}
                    </p>
                )}

                {message && (
                    <p
                        role="status"
                        className="mt-5 bg-brand-success-soft px-4 py-3 text-sm text-brand-success"
                    >
                        {message}
                    </p>
                )}

                {isEditing && (
                    <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-brand-border pt-5">
                        <DashboardButton
                            type="button"
                            onClick={handleCancel}
                            disabled={isSaving}
                            variant="secondary"
                        >
                            <X size={16} />
                            Cancel
                        </DashboardButton>

                        <DashboardButton
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            variant="primary"
                        >
                            <Save size={16} />
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </DashboardButton>
                    </div>
                )}
            </div>

            {/* Change Password */}
            <div className="ils-profile-panel">
                <div className="border-b border-brand-border pb-5">
                    <h3 className="ils-profile-section-title"><ShieldCheck size={20} aria-hidden="true" /> Change Password</h3>

                    <p className="mt-1 text-sm text-brand-muted">
                        Update your account password.
                    </p>
                </div>

                {passwordError && (
                    <div className="mt-5 border border-brand-danger-border bg-brand-danger-soft px-4 py-3 text-sm text-brand-danger">
                        {passwordError}
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
                            <PasswordField id="new-password" label="New Password" value={newPassword}
    onChange={(event) => { setNewPassword(event.target.value); setPasswordFieldErrors(previous => ({ ...previous, newpassword: undefined })); }}
    visible={showNewPassword} onToggle={() => setShowNewPassword(!showNewPassword)}
    placeholder="Enter your new password" disabled={changingPassword} errors={passwordFieldErrors} field="newPassword" minLength={6} />
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
