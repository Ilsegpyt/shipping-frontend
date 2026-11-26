import { DashboardPage, DashboardPageHeader, DashboardButton } from "../../components/dashboard/DashboardUI";
import { ProfileSummary, PasswordField } from "../../components/dashboard/DashboardProfileUI";
import ApiFieldError from '../../components/common/ApiFieldError';
import { extractApiErrorMessage, extractApiFieldErrors } from '../../utils/errorUtils';
import { useState } from 'react';
import { UserRound, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import api from '../../services/api';

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
    const [passwordFieldErrors, setPasswordFieldErrors] = useState({});
    const [passwordSuccess, setPasswordSuccess] = useState('');

    const handleChangePassword = async (event) => {
        event.preventDefault();
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

        if (newPassword.length < 8) {
            setPasswordError('New password must be at least 8 characters.');
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
            setPasswordFieldErrors(extractApiFieldErrors(requestError));
            setPasswordError(extractApiErrorMessage(requestError, 'Failed to change password. Please try again.'));
        } finally {
            setChangingPassword(false);
        }
    };



    return (
        <DashboardPage className="ils-profile">
            <DashboardPageHeader title="Profile" description="View your account information and manage your password." />
            <ProfileSummary name={user?.name} email={user?.email} role="Subaccount" />

            <section className="ils-profile-panel">
                <div className="border-b border-brand-border pb-5">
                    <h2 className="ils-profile-section-title"><UserRound size={20} aria-hidden="true" /> Personal Information</h2>
                    <p className="mt-1 text-sm text-brand-muted">
                        Your account information is read-only. Contact your administrator if it needs to be changed.
                    </p>
                </div>

                <div className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-brand-muted">Name</p>
                        <p className="mt-2 border border-brand-border bg-brand-surface-tint px-3 py-2.5 text-sm text-brand-text">
                            {user?.name || '-'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-brand-muted">Email</p>
                        <p className="mt-2 border border-brand-border bg-brand-surface-tint px-3 py-2.5 text-sm text-brand-text">
                            {user?.email || '-'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-brand-muted">Phone</p>
                        <p className="mt-2 border border-brand-border bg-brand-surface-tint px-3 py-2.5 text-sm text-brand-text">
                            {user?.phone || '-'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-brand-muted">Account Type</p>
                        <p className="mt-2 border border-brand-border bg-brand-surface-tint px-3 py-2.5 text-sm capitalize text-brand-text">
                            {user?.tokenType || 'subaccount'}
                        </p>
                    </div>
                </div>
            </section>

            <section className="ils-profile-panel">
                <div className="border-b border-brand-border pb-5">
                    <div>
                        <h2 className="ils-profile-section-title"><ShieldCheck size={20} aria-hidden="true" /> Change Password</h2>
                        <p className="mt-1 text-sm text-brand-muted">
                            You can change your password without editing your profile information.
                        </p>
                    </div>
                </div>

                {passwordError && (
                    <div role="alert" className="mt-5 border border-brand-danger-border bg-brand-danger-soft px-4 py-3 text-sm text-brand-danger">
                        {passwordError}
                    </div>
                )}
                {passwordSuccess && (
                    <div role="status" className="mt-5 border border-brand-success-border bg-brand-success-soft px-4 py-3 text-sm text-brand-success">
                        {passwordSuccess}
                    </div>
                )}

                <div className="mt-6 w-full border border-brand-border bg-brand-surface-tint p-4 sm:p-6">
                    <form onSubmit={handleChangePassword}>
                        <PasswordField
                            id="current-password"
                            label="Current Password"
                            value={currentPassword}
                            errors={passwordFieldErrors} field="currentPassword"
                            onChange={(event) => { setCurrentPassword(event.target.value); setPasswordFieldErrors(previous => ({ ...previous, currentpassword: undefined })); }}
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
                            errors={passwordFieldErrors} field="newPassword" minLength={8}
                                onChange={(event) => { setNewPassword(event.target.value); setPasswordFieldErrors(previous => ({ ...previous, newpassword: undefined })); }}
                                visible={showNewPassword}
                                onToggle={() => setShowNewPassword((value) => !value)}
                                placeholder="Enter your new password"
                                disabled={changingPassword}
                            />
                            <PasswordField
                                id="confirm-password"
                                label="Confirm New Password"
                                value={confirmPassword}
                            errors={passwordFieldErrors} field="confirmPassword" minLength={8}
                                onChange={(event) => { setConfirmPassword(event.target.value); setPasswordFieldErrors(previous => ({ ...previous, confirmpassword: undefined })); }}
                                visible={showConfirmPassword}
                                onToggle={() => setShowConfirmPassword((value) => !value)}
                                placeholder="Confirm your new password"
                                disabled={changingPassword}
                            />
                        </div>

                        <div className="mt-6 flex justify-end border-t border-brand-border pt-5">
                            <DashboardButton
                                type="submit"
                                disabled={changingPassword}
                                variant="primary"
                            >
                                {changingPassword ? 'Changing Password...' : 'Change Password'}
                            </DashboardButton>
                        </div>
                    </form>
                </div>
            </section>
        </DashboardPage>
    );
}
