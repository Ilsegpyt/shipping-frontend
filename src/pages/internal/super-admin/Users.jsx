import { sanitizePhoneInput } from "../../../utils/phoneInput.js";
import ApiFieldError from '../../../components/common/ApiFieldError';
import { DashboardPage, DashboardPageHeader, DashboardButton, DashboardToolbar, DashboardSearchField, DashboardTableSurface, DashboardStatusBadge, DashboardActionMenu, DashboardActionItem } from '../../../components/dashboard/DashboardUI';
import { useEffect, useMemo, useState } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Ellipsis,
    Plus,
    RefreshCw,
    Trash2,
    X,
} from 'lucide-react';

import {
    getInternalUsers,
    getRoles,
    createInternalUser,
    updateInternalUserProfile,
    updateInternalUserEmail,
    activateInternalUser,
    deactivateInternalUser,
    deleteInternalUsers,
} from "../../../services/internalUsersService";
import { extractApiErrorMessage, extractApiFieldErrors } from '../../../utils/errorUtils';

const PAGE_SIZE = 20;

export default function Users() {
    const [users, setUsers] = useState([]);
    const [pageNumber, setPageNumber] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [openMenuId, setOpenMenuId] = useState(null);

    const [selectedUser, setSelectedUser] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const [editForm, setEditForm] = useState({
        name: '',
        email: '',
        phone: '',
    });

    const [saving, setSaving] = useState(false);
    const [modalError, setModalError] = useState('');
    const [modalErrorFields, setModalErrorFields] = useState({});

    const [statusUser, setStatusUser] = useState(null);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [changingStatus, setChangingStatus] = useState(false);

    const [deleteUser, setDeleteUser] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] =
        useState(false);
    const [bulkDeleting, setBulkDeleting] = useState(false);

    // Add User
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [roles, setRoles] = useState([]);
    const [rolesLoading, setRolesLoading] = useState(false);
    const [creatingUser, setCreatingUser] = useState(false);
    const [addUserError, setAddUserError] = useState('');
    const [addUserErrorFields, setAddUserErrorFields] = useState({});
    const [createdPassword, setCreatedPassword] = useState('');
    const [createSuccess, setCreateSuccess] = useState(false);

    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        phone: '',
        roleId: '',
    });

    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        setPageNumber(1);
    }, [debouncedSearch]);

    async function loadUsers(page = pageNumber, search = debouncedSearch) {
        try {
            setLoading(true);
            setError('');

            const result = await getInternalUsers(page, PAGE_SIZE, search);

            setUsers(result.items ?? []);
            setPageNumber(result.pageNumber ?? page);
            setTotalPages(result.totalPages ?? 1);
            setTotalCount(result.totalCount ?? 0);

            setSelectedUserIds([]);
            setOpenMenuId(null);
        } catch (error) {
            console.error(error);
            setError(extractApiErrorMessage(error, 'Failed to load users.'));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadUsers(pageNumber, debouncedSearch);
    }, [pageNumber, debouncedSearch]);


    const filteredUsers = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return users;

        return users.filter((user) =>
            [
                user.name,
                user.email,
                user.roleName,
                user.phone,
            ]
                .filter(Boolean)
                .some((value) =>
                    String(value).toLowerCase().includes(term)
                )
        );
    }, [users, searchTerm]);

    const isAllSelected =
        filteredUsers.length > 0 &&
        filteredUsers.every((user) =>
            selectedUserIds.includes(user.id)
        );

    function getStatusLabel(status) {
        if (typeof status === 'string') {
            return status.toLowerCase() === 'active'
                ? 'Active'
                : 'Inactive';
        }

        return status === 1 ? 'Active' : 'Inactive';
    }

    function isActive(status) {
        if (typeof status === 'string') {
            return status.toLowerCase() === 'active';
        }

        return status === 1;
    }

    function handlePreviousPage() {
        if (pageNumber > 1) {
            setPageNumber((prev) => prev - 1);
        }
    }

    function handleNextPage() {
        if (pageNumber < totalPages) {
            setPageNumber((prev) => prev + 1);
        }
    }

    function toggleMenu(userId) {
        setOpenMenuId((currentId) =>
            currentId === userId ? null : userId
        );
    }

    function toggleUserSelection(userId) {
        setSelectedUserIds((currentIds) =>
            currentIds.includes(userId)
                ? currentIds.filter((id) => id !== userId)
                : [...currentIds, userId]
        );
    }

    function toggleSelectAll() {
        if (isAllSelected) {
            setSelectedUserIds((currentIds) =>
                currentIds.filter(
                    (id) =>
                        !filteredUsers.some((user) => user.id === id)
                )
            );

            return;
        }

        setSelectedUserIds((currentIds) => [
            ...new Set([
                ...currentIds,
                ...filteredUsers.map((user) => user.id),
            ]),
        ]);
    }

    // ---------------- Add User ----------------

    async function openAddUserModal() {
        setNewUser({
            name: '',
            email: '',
            phone: '',
            roleId: '',
        });

        setAddUserError('');

        setAddUserErrorFields({});
        setCreatedPassword('');
        setCreateSuccess(false);
        setIsAddUserModalOpen(true);

        try {
            setRolesLoading(true);

            const result = await getRoles();
            setRoles(result ?? []);
        } catch (error) {
            console.error(error);
            setAddUserError('Failed to load roles.');
        } finally {
            setRolesLoading(false);
        }
    }

    function closeAddUserModal() {
        if (creatingUser) return;

        setIsAddUserModalOpen(false);
        setAddUserError('');
        setAddUserErrorFields({});
        setCreatedPassword('');
        setCreateSuccess(false);
    }

    function handleNewUserChange(event) {
        setAddUserErrorFields(current => { const next = { ...current }; delete next[event.target.name.toLowerCase()]; return next; });
        const { name, value } = event.target;

        setNewUser((currentUser) => ({
            ...currentUser,
            [name]: value,
        }));
    }

    async function handleCreateUser() {
        const name = newUser.name.trim();
        const email = newUser.email.trim();
        const phone = newUser.phone.trim();
        const roleId = newUser.roleId;

        if (!name) {
            setAddUserError('Name is required.');
            return;
        }

        if (!email) {
            setAddUserError('Email is required.');
            return;
        }

        if (!roleId) {
            setAddUserError('Role is required.');
            return;
        }

        try {
            setCreatingUser(true);
            setAddUserError('');
            setAddUserErrorFields({});

            const result = await createInternalUser({
                name,
                email,
                phone,
                roleId,
            });

            setCreateSuccess(true);

            await loadUsers(pageNumber);
        } catch (error) {
            console.error(error);
            setAddUserErrorFields(extractApiFieldErrors(error));
            setAddUserError(extractApiErrorMessage(error, 'Failed to create user.'));
        } finally {
            setCreatingUser(false);
        }
    }

    // ---------------- Edit User ----------------

    function handleEdit(user) {
        setOpenMenuId(null);
        setSelectedUser(user);

        setEditForm({
            name: user.name ?? '',
            email: user.email ?? '',
            phone: user.phone ?? '',
        });

        setModalError('');

        setModalErrorFields({});
        setIsEditModalOpen(true);
    }

    function closeEditModal() {
        if (saving) return;

        setIsEditModalOpen(false);
        setSelectedUser(null);
        setModalError('');
        setModalErrorFields({});
    }

    function handleFormChange(event) {
        setModalErrorFields(current => { const next = { ...current }; delete next[event.target.name.toLowerCase()]; return next; });
        const { name, value } = event.target;

        setEditForm((currentForm) => ({
            ...currentForm,
            [name]: value,
        }));
    }

    async function handleSaveChanges() {
        if (!selectedUser) return;

        const name = editForm.name.trim();
        const email = editForm.email.trim();
        const phone = editForm.phone.trim();

        if (!name) {
            setModalError('Name is required.');
            return;
        }

        if (!email) {
            setModalError('Email is required.');
            return;
        }

        try {
            setSaving(true);
            setModalError('');
            setModalErrorFields({});

            await updateInternalUserProfile(
                selectedUser.id,
                name,
                phone
            );

            if (email !== selectedUser.email) {
                await updateInternalUserEmail(
                    selectedUser.id,
                    email
                );
            }

            setIsEditModalOpen(false);
            setSelectedUser(null);

            await loadUsers(pageNumber);
        } catch (error) {
            console.error(error);
            setModalErrorFields(extractApiFieldErrors(error));
            setModalError(extractApiErrorMessage(error, 'Failed to update user.'));
        } finally {
            setSaving(false);
        }
    }

    // ---------------- Status ----------------

    function handleStatusAction(user) {
        setOpenMenuId(null);
        setStatusUser(user);
        setIsStatusModalOpen(true);
    }

    function closeStatusModal() {
        if (changingStatus) return;

        setIsStatusModalOpen(false);
        setStatusUser(null);
    }

    async function handleConfirmStatusChange() {
        if (!statusUser) return;

        const active = isActive(statusUser.status);

        try {
            setChangingStatus(true);
            setError('');

            if (active) {
                await deactivateInternalUser(statusUser.id);
            } else {
                await activateInternalUser(statusUser.id);
            }

            setIsStatusModalOpen(false);
            setStatusUser(null);

            await loadUsers(pageNumber);
        } catch (error) {
            console.error(error);
            setError(extractApiErrorMessage(error, 'Failed to change user status.'));
        } finally {
            setChangingStatus(false);
        }
    }

    // ---------------- Delete ----------------

    function handleDeleteAction(user) {
        setOpenMenuId(null);
        setDeleteUser(user);
        setIsDeleteModalOpen(true);
    }

    function closeDeleteModal() {
        if (deleting) return;

        setIsDeleteModalOpen(false);
        setDeleteUser(null);
    }

    async function handleConfirmDelete() {
        if (!deleteUser) return;

        try {
            setDeleting(true);
            setError('');

            await deleteInternalUsers([deleteUser.id]);

            setIsDeleteModalOpen(false);
            setDeleteUser(null);

            await loadUsers(pageNumber);
        } catch (error) {
            console.error(error);
            setError(extractApiErrorMessage(error, 'Failed to delete user.'));
        } finally {
            setDeleting(false);
        }
    }

    function handleBulkDeleteAction() {
        if (selectedUserIds.length === 0) return;

        setIsBulkDeleteModalOpen(true);
    }

    function closeBulkDeleteModal() {
        if (bulkDeleting) return;

        setIsBulkDeleteModalOpen(false);
    }

    async function handleConfirmBulkDelete() {
        if (selectedUserIds.length === 0) return;

        try {
            setBulkDeleting(true);
            setError('');

            await deleteInternalUsers(selectedUserIds);

            setSelectedUserIds([]);
            setIsBulkDeleteModalOpen(false);

            await loadUsers(pageNumber);
        } catch (error) {
            console.error(error);
            setError(extractApiErrorMessage(error, 'Failed to delete selected users.'));
        } finally {
            setBulkDeleting(false);
        }
    }

    function handleAction(action, user) {
        if (action === 'Edit') {
            handleEdit(user);
            return;
        }

        if (action === 'Status') {
            handleStatusAction(user);
            return;
        }

        if (action === 'Delete') {
            handleDeleteAction(user);
        }
    }

    return (
        <DashboardPage>
            <DashboardPageHeader
                title="Users"
                eyebrow="Management / Administration"
                description="Manage internal users and their access."
                actions={
                    <DashboardButton variant="primary" icon={Plus} onClick={openAddUserModal}>
                        Add User
                    </DashboardButton>
                }
            />

            <DashboardToolbar actions={
                <>
                    {selectedUserIds.length > 0 && (
                        <DashboardButton variant="danger" icon={Trash2} onClick={handleBulkDeleteAction}>
                            Delete Selected <span className="bg-brand-surface/20 px-1.5 py-0.5 text-xs">{selectedUserIds.length}</span>
                        </DashboardButton>
                    )}
                    <DashboardButton onClick={() => loadUsers(pageNumber)} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </DashboardButton>
                </>
            }>
                <DashboardSearchField
                    placeholder="Search by name, email, role, or phone..."
                    title="Search by name, email, role, or phone"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                />
            </DashboardToolbar>

            {/* Error */}
            {error && (
                <div className="flex items-center justify-between rounded-lg border border-brand-danger-soft bg-brand-danger-soft px-4 py-3 text-sm text-brand-danger shadow-xs transition">
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={() => setError('')}
                        className="text-brand-danger hover:text-brand-danger font-bold px-2 py-0.5 rounded cursor-pointer"
                        title="إغلاق"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Table */}
            <DashboardTableSurface>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-brand-border">
                        <thead className="bg-brand-surface-tint">
                            <tr>
                                <th className="w-12 px-6 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        onChange={toggleSelectAll}
                                        disabled={
                                            loading ||
                                            filteredUsers.length === 0
                                        }
                                        aria-label="Select all users"
                                        className="h-4 w-4 rounded border-brand-secondary text-brand-primary focus:ring-brand-accent"
                                    />
                                </th>

                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-brand-muted">
                                    Name
                                </th>

                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-brand-muted">
                                    Email
                                </th>

                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-brand-muted">
                                    Role
                                </th>

                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-brand-muted">
                                    Phone
                                </th>

                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-brand-muted">
                                    Status
                                </th>

                                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-brand-muted">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-brand-surface-muted">
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan="7"
                                        className="px-6 py-10 text-center text-sm text-brand-muted"
                                    >
                                        Loading users...
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan="7"
                                        className="px-6 py-10 text-center text-sm text-brand-muted"
                                    >
                                        No users found.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => {
                                    const active = isActive(user.status);
                                    const isMenuOpen =
                                        openMenuId === user.id;
                                    const isSelected =
                                        selectedUserIds.includes(user.id);

                                    return (
                                        <tr
                                            key={user.id}
                                            className={`transition ${isSelected ? 'ils-dashboard-row-selected' : ''}`}
                                        >
                                            <td className="px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() =>
                                                        toggleUserSelection(
                                                            user.id
                                                        )
                                                    }
                                                    aria-label={`Select ${user.name}`}
                                                    className="h-4 w-4 rounded border-brand-secondary text-brand-primary focus:ring-brand-accent"
                                                />
                                            </td>

                                            <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-brand-text">
                                                {user.name}
                                            </td>

                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-brand-muted">
                                                {user.email}
                                            </td>

                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-brand-muted">
                                                {user.roleName ||
                                                    'Unknown Role'}
                                            </td>

                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-brand-muted">
                                                {user.phone || '—'}
                                            </td>

                                            <td className="whitespace-nowrap px-6 py-4">
                                                <DashboardStatusBadge tone={active ? 'positive' : 'negative'}>
                                                    {getStatusLabel(user.status)}
                                                </DashboardStatusBadge>
                                            </td>

                                            <td className="relative whitespace-nowrap px-6 py-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        toggleMenu(user.id)
                                                    }
                                                    id={`dashboard-user-actions-${user.id}`}
                                                    aria-label={`Actions for ${user.name}`}
                                                    aria-expanded={isMenuOpen}
                                                    className="rounded-lg p-2 text-brand-muted transition hover:bg-brand-surface-muted hover:text-brand-text"
                                                >
                                                    <Ellipsis className="h-5 w-5" />
                                                </button>

                                                {isMenuOpen && (
                                                    <DashboardActionMenu anchorId={`dashboard-user-actions-${user.id}`} width={176}>
                                                        <DashboardActionItem
                                                            action="edit"
                                                            onClick={() => handleAction('Edit', user)}
                                                        />
                                                        <DashboardActionItem
                                                            action={active ? 'deactivate' : 'activate'}
                                                            onClick={() => handleAction('Status', user)}
                                                        />
                                                        <div className="my-1 border-t border-brand-surface-muted" />
                                                        <DashboardActionItem
                                                            action="delete"
                                                            onClick={() => handleAction('Delete', user)}
                                                        />
                                                    </DashboardActionMenu>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t border-brand-border px-6 py-4">
                    <p className="text-sm text-brand-muted">
                        Showing page{' '}
                        <span className="font-medium text-brand-text">
                            {pageNumber}
                        </span>{' '}
                        of{' '}
                        <span className="font-medium text-brand-text">
                            {totalPages}
                        </span>{' '}
                        —{' '}
                        <span className="font-medium text-brand-text">
                            {totalCount}
                        </span>{' '}
                        users
                    </p>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handlePreviousPage}
                            disabled={loading || pageNumber <= 1}
                            className="inline-flex items-center gap-1 rounded-lg border border-brand-border px-3 py-2 text-sm font-medium text-brand-muted transition hover:bg-brand-surface-tint disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </button>

                        <button
                            type="button"
                            onClick={handleNextPage}
                            disabled={
                                loading || pageNumber >= totalPages
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-brand-border px-3 py-2 text-sm font-medium text-brand-muted transition hover:bg-brand-surface-tint disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </DashboardTableSurface>

            {/* Add User Modal */}
            {isAddUserModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-brand-text/40 px-4"
                    onClick={closeAddUserModal}
                >
                    <div
                        className="ils-dashboard-dialog w-full max-w-lg rounded-2xl bg-brand-surface shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-brand-border px-6 py-5">
                            <div>
                                <h2 className="text-lg font-semibold text-brand-text">
                                    Add User
                                </h2>

                                <p className="mt-1 text-sm text-brand-muted">
                                    Create a new internal user.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeAddUserModal}
                                disabled={creatingUser}
                                aria-label="Close modal"
                                className="rounded-lg p-2 text-brand-neutral transition hover:bg-brand-surface-muted hover:text-brand-muted disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-5 px-6 py-6">
                            {addUserError && (
                                <div className="rounded-lg border border-brand-danger-soft bg-brand-danger-soft px-4 py-3 text-sm text-brand-danger">
                                    {addUserError}
                                </div>
                            )}

                            {createSuccess && (
                                <div className="rounded-lg border border-brand-success-soft bg-brand-success-soft px-4 py-3 text-sm text-brand-success">
                                    <p className="font-semibold">
                                        Internal user created successfully.
                                    </p>

                                    <p className="mt-1">
                                        The user has been added successfully.
                                    </p>
                                </div>
                            )}

                            <div>
                                <label
                                    htmlFor="new-user-name"
                                    className="mb-2 block text-sm font-medium text-brand-text"
                                >
                                    Full Name *
                                </label>

                                <input
                                    id="new-user-name"
                                    aria-invalid={Boolean(addUserErrorFields["name"]?.length)}
                                    name="name"
                                    type="text"
                                    value={newUser.name}
                                    onChange={handleNewUserChange}
                                    disabled={creatingUser || createSuccess}
                                    className="h-11 w-full rounded-lg border border-brand-border px-3 text-sm text-brand-text outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-surface-blue disabled:cursor-not-allowed disabled:bg-brand-surface-tint"
                                />
                                <ApiFieldError errors={addUserErrorFields} field="name" />
                            </div>

                            <div>
                                <label
                                    htmlFor="new-user-email"
                                    className="mb-2 block text-sm font-medium text-brand-text"
                                >
                                    Email Address *
                                </label>

                                <input
                                    id="new-user-email"
                                    aria-invalid={Boolean(addUserErrorFields["email"]?.length)}
                                    name="email"
                                    type="email"
                                    value={newUser.email}
                                    onChange={handleNewUserChange}
                                    disabled={creatingUser || createSuccess}
                                    className="h-11 w-full rounded-lg border border-brand-border px-3 text-sm text-brand-text outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-surface-blue disabled:cursor-not-allowed disabled:bg-brand-surface-tint"
                                />
                                <ApiFieldError errors={addUserErrorFields} field="email" />
                            </div>

                            <div>
                                <label
                                    htmlFor="new-user-phone"
                                    className="mb-2 block text-sm font-medium text-brand-text"
                                >
                                    Phone Number
                                </label>

                                <input
                                            onInput={sanitizePhoneInput}
                                    id="new-user-phone"
                                    aria-invalid={Boolean(addUserErrorFields["phone"]?.length)}
                                    name="phone"
                                    type="tel"
                                    value={newUser.phone}
                                    onChange={handleNewUserChange}
                                    disabled={creatingUser || createSuccess}
                                    className="h-11 w-full rounded-lg border border-brand-border px-3 text-sm text-brand-text outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-surface-blue disabled:cursor-not-allowed disabled:bg-brand-surface-tint"
                                />
                                <ApiFieldError errors={addUserErrorFields} field="phone" />
                            </div>

                            <div>
                                <label
                                    htmlFor="new-user-role"
                                    className="mb-2 block text-sm font-medium text-brand-text"
                                >
                                    Role *
                                </label>

                                <select
                                    id="new-user-role"
                                    aria-invalid={Boolean(addUserErrorFields["roleid"]?.length)}
                                    name="roleId"
                                    value={newUser.roleId}
                                    onChange={handleNewUserChange}
                                    disabled={
                                        rolesLoading ||
                                        creatingUser ||
                                        createSuccess
                                    }
                                    className="h-11 w-full rounded-lg border border-brand-border bg-brand-surface px-3 text-sm text-brand-text outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-surface-blue disabled:cursor-not-allowed disabled:bg-brand-surface-tint"
                                >
                                    <option value="">
                                        {rolesLoading
                                            ? 'Loading roles...'
                                            : 'Select a role'}
                                    </option>

                                    {roles.map((role) => (
                                        <option
                                            key={role.id}
                                            value={role.id}
                                        >
                                            {role.name}
                                        </option>
                                    ))}
                                </select>
                                <ApiFieldError errors={addUserErrorFields} field="roleId" />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-brand-border px-6 py-4">
                            <button
                                type="button"
                                onClick={closeAddUserModal}
                                disabled={creatingUser}
                                className="rounded-lg border border-brand-border px-4 py-2.5 text-sm font-medium text-brand-muted transition hover:bg-brand-surface-tint disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {createSuccess ? 'Close' : 'Cancel'}
                            </button>

                            {!createSuccess && (
                                <button
                                    type="button"
                                    onClick={handleCreateUser}
                                    disabled={creatingUser || rolesLoading}
                                    className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-medium text-brand-inverse transition hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {creatingUser && (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                    )}

                                    {creatingUser
                                        ? 'Creating...'
                                        : 'Create User'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {isEditModalOpen && selectedUser && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-brand-text/40 px-4"
                    onClick={closeEditModal}
                >
                    <div
                        className="ils-dashboard-dialog w-full max-w-lg rounded-2xl bg-brand-surface shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-brand-border px-6 py-5">
                            <div>
                                <h2 className="text-lg font-semibold text-brand-text">
                                    Edit User
                                </h2>

                                <p className="mt-1 text-sm text-brand-muted">
                                    Update the user profile information.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeEditModal}
                                disabled={saving}
                                aria-label="Close modal"
                                className="rounded-lg p-2 text-brand-neutral transition hover:bg-brand-surface-muted hover:text-brand-muted disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-5 px-6 py-6">
                            {modalError && (
                                <div className="rounded-lg border border-brand-danger-soft bg-brand-danger-soft px-4 py-3 text-sm text-brand-danger">
                                    {modalError}
                                </div>
                            )}

                            <div>
                                <label
                                    htmlFor="edit-user-name"
                                    className="mb-2 block text-sm font-medium text-brand-text"
                                >
                                    Name
                                </label>

                                <input
                                    id="edit-user-name"
                                    aria-invalid={Boolean(modalErrorFields["name"]?.length)}
                                    name="name"
                                    type="text"
                                    value={editForm.name}
                                    onChange={handleFormChange}
                                    disabled={saving}
                                    className="h-11 w-full rounded-lg border border-brand-border px-3 text-sm text-brand-text outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-surface-blue disabled:cursor-not-allowed disabled:bg-brand-surface-tint"
                                />
                                <ApiFieldError errors={modalErrorFields} field="name" />
                            </div>

                            <div>
                                <label
                                    htmlFor="edit-user-email"
                                    className="mb-2 block text-sm font-medium text-brand-text"
                                >
                                    Email
                                </label>

                                <input
                                    id="edit-user-email"
                                    aria-invalid={Boolean(modalErrorFields["email"]?.length)}
                                    name="email"
                                    type="email"
                                    value={editForm.email}
                                    onChange={handleFormChange}
                                    disabled={saving}
                                    className="h-11 w-full rounded-lg border border-brand-border px-3 text-sm text-brand-text outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-surface-blue disabled:cursor-not-allowed disabled:bg-brand-surface-tint"
                                />
                                <ApiFieldError errors={modalErrorFields} field="email" />
                            </div>

                            <div>
                                <label
                                    htmlFor="edit-user-phone"
                                    className="mb-2 block text-sm font-medium text-brand-text"
                                >
                                    Phone
                                </label>

                                <input
                                            onInput={sanitizePhoneInput}
                                    id="edit-user-phone"
                                    aria-invalid={Boolean(modalErrorFields["phone"]?.length)}
                                    name="phone"
                                    type="tel"
                                    value={editForm.phone}
                                    onChange={handleFormChange}
                                    disabled={saving}
                                    className="h-11 w-full rounded-lg border border-brand-border px-3 text-sm text-brand-text outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-surface-blue disabled:cursor-not-allowed disabled:bg-brand-surface-tint"
                                />
                                <ApiFieldError errors={modalErrorFields} field="phone" />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-brand-border px-6 py-4">
                            <button
                                type="button"
                                onClick={closeEditModal}
                                disabled={saving}
                                className="rounded-lg border border-brand-border px-4 py-2.5 text-sm font-medium text-brand-muted transition hover:bg-brand-surface-tint disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleSaveChanges}
                                disabled={saving}
                                className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-medium text-brand-inverse transition hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {saving && (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                )}

                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Status Modal */}
            {isStatusModalOpen && statusUser && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-brand-text/40 px-4"
                    onClick={closeStatusModal}
                >
                    <div
                        className="ils-dashboard-dialog w-full max-w-md rounded-2xl bg-brand-surface shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-brand-border px-6 py-5">
                            <h2 className="text-lg font-semibold text-brand-text">
                                {isActive(statusUser.status)
                                    ? 'Deactivate User'
                                    : 'Activate User'}
                            </h2>

                            <button
                                type="button"
                                onClick={closeStatusModal}
                                disabled={changingStatus}
                                aria-label="Close modal"
                                className="rounded-lg p-2 text-brand-neutral transition hover:bg-brand-surface-muted hover:text-brand-muted disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="px-6 py-6">
                            <p className="text-sm leading-6 text-brand-muted">
                                Are you sure you want to{' '}
                                <span className="font-semibold text-brand-text">
                                    {isActive(statusUser.status)
                                        ? 'deactivate'
                                        : 'activate'}
                                </span>{' '}
                                user{' '}
                                <span className="font-semibold text-brand-text">
                                    {statusUser.name}
                                </span>
                                ?
                            </p>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-brand-border px-6 py-4">
                            <button
                                type="button"
                                onClick={closeStatusModal}
                                disabled={changingStatus}
                                className="rounded-lg border border-brand-border px-4 py-2.5 text-sm font-medium text-brand-muted transition hover:bg-brand-surface-tint disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleConfirmStatusChange}
                                disabled={changingStatus}
                                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-brand-inverse transition disabled:cursor-not-allowed disabled:opacity-50 ${isActive(statusUser.status)
                                    ? 'bg-brand-danger hover:bg-brand-danger'
                                    : 'bg-brand-success hover:bg-brand-success'
                                    }`}
                            >
                                {changingStatus && (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                )}

                                {changingStatus
                                    ? 'Processing...'
                                    : isActive(statusUser.status)
                                        ? 'Deactivate'
                                        : 'Activate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Single User Modal */}
            {isDeleteModalOpen && deleteUser && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-brand-text/40 px-4"
                    onClick={closeDeleteModal}
                >
                    <div
                        className="ils-dashboard-dialog w-full max-w-md rounded-2xl bg-brand-surface shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-brand-border px-6 py-5">
                            <h2 className="text-lg font-semibold text-brand-text">
                                Delete User
                            </h2>

                            <button
                                type="button"
                                onClick={closeDeleteModal}
                                disabled={deleting}
                                aria-label="Close modal"
                                className="rounded-lg p-2 text-brand-neutral transition hover:bg-brand-surface-muted hover:text-brand-muted disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="px-6 py-6">
                            <p className="text-sm leading-6 text-brand-muted">
                                Are you sure you want to delete user{' '}
                                <span className="font-semibold text-brand-text">
                                    {deleteUser.name}
                                </span>
                                ?
                            </p>

                            <p className="mt-2 text-sm text-brand-danger">
                                This action cannot be undone.
                            </p>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-brand-border px-6 py-4">
                            <button
                                type="button"
                                onClick={closeDeleteModal}
                                disabled={deleting}
                                className="rounded-lg border border-brand-border px-4 py-2.5 text-sm font-medium text-brand-muted transition hover:bg-brand-surface-tint disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                disabled={deleting}
                                className="inline-flex items-center gap-2 rounded-lg bg-brand-danger px-4 py-2.5 text-sm font-medium text-brand-inverse transition hover:bg-brand-danger disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {deleting && (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                )}

                                {deleting ? 'Deleting...' : 'Delete User'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Delete Modal */}
            {isBulkDeleteModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-brand-text/40 px-4"
                    onClick={closeBulkDeleteModal}
                >
                    <div
                        className="ils-dashboard-dialog w-full max-w-md rounded-2xl bg-brand-surface shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-brand-border px-6 py-5">
                            <h2 className="text-lg font-semibold text-brand-text">
                                Delete Selected Users
                            </h2>

                            <button
                                type="button"
                                onClick={closeBulkDeleteModal}
                                disabled={bulkDeleting}
                                aria-label="Close modal"
                                className="rounded-lg p-2 text-brand-neutral transition hover:bg-brand-surface-muted hover:text-brand-muted disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="px-6 py-6">
                            <p className="text-sm leading-6 text-brand-muted">
                                Are you sure you want to delete{' '}
                                <span className="font-semibold text-brand-text">
                                    {selectedUserIds.length}
                                </span>{' '}
                                selected users?
                            </p>

                            <p className="mt-2 text-sm text-brand-danger">
                                This action cannot be undone.
                            </p>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-brand-border px-6 py-4">
                            <button
                                type="button"
                                onClick={closeBulkDeleteModal}
                                disabled={bulkDeleting}
                                className="rounded-lg border border-brand-border px-4 py-2.5 text-sm font-medium text-brand-muted transition hover:bg-brand-surface-tint disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleConfirmBulkDelete}
                                disabled={bulkDeleting}
                                className="inline-flex items-center gap-2 rounded-lg bg-brand-danger px-4 py-2.5 text-sm font-medium text-brand-inverse transition hover:bg-brand-danger disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {bulkDeleting && (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                )}

                                {bulkDeleting
                                    ? 'Deleting...'
                                    : 'Delete Selected'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardPage>
    );
}