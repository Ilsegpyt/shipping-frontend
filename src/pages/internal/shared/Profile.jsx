import { useState } from 'react';
import { useAuth } from '../../../auth/AuthContext';
import { updateProfile, updateEmail } from '../../../auth/authService';

export default function Profile() {
    const { user, setUser } = useAuth();

    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(user?.name || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [email, setEmail] = useState(user?.email || '');

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

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

            <div className="max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
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

                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                    <div>
                        <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Name
                        </label>

                        {isEditing ? (
                            <input
                                type="text"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
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
                                onChange={(event) => setEmail(event.target.value)}
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
                                onChange={(event) => setPhone(event.target.value)}
                                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        ) : (
                            <p className="mt-1 text-sm font-medium text-gray-900">
                                {user?.phone || '-'}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Role
                        </label>

                        <p className="mt-1 text-sm font-medium text-gray-900">
                            {user?.roleName || '-'}
                        </p>
                    </div>

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
        </div>
    );
}