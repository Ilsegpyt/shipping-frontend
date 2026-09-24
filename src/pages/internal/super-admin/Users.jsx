import { useEffect, useMemo, useState } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Ellipsis,
    Edit,
    Plus,
    RefreshCw,
    Search,
    UserCheck,
    UserX,
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
} from "../../../services/internalUsersService"

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
    const [createdPassword, setCreatedPassword] = useState('');
    const [createSuccess, setCreateSuccess] = useState(false);

    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        phone: '',
        roleId: '',
    });

    async function loadUsers(page = pageNumber) {
        try {
            setLoading(true);
            setError('');

            const result = await getInternalUsers(page, PAGE_SIZE);

            setUsers(result.items ?? []);
            setPageNumber(result.pageNumber ?? page);
            setTotalPages(result.totalPages ?? 1);
            setTotalCount(result.totalCount ?? 0);

            setSelectedUserIds([]);
            setOpenMenuId(null);
        } catch (error) {
            console.error(error);
            setError('Failed to load users.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadUsers(1);
    }, []);

    const filteredUsers = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();

        if (!term) {
            return users;
        }

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
            loadUsers(pageNumber - 1);
        }
    }

    function handleNextPage() {
        if (pageNumber < totalPages) {
            loadUsers(pageNumber + 1);
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
        setCreatedPassword('');
        setCreateSuccess(false);
    }

    function handleNewUserChange(event) {
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

            const message =
                error.response?.data?.error ||
                error.response?.data?.message ||
                'Failed to create user.';

            setAddUserError(message);
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
        setIsEditModalOpen(true);
    }

    function closeEditModal() {
        if (saving) return;

        setIsEditModalOpen(false);
        setSelectedUser(null);
        setModalError('');
    }

    function handleFormChange(event) {
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

            const message =
                error.response?.data?.error ||
                error.response?.data?.message ||
                'Failed to update user.';

            setModalError(message);
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

            const message =
                error.response?.data?.error ||
                error.response?.data?.message ||
                'Failed to change user status.';

            setError(message);
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

            const message =
                error.response?.data?.error ||
                error.response?.data?.message ||
                'Failed to delete user.';

            setError(message);
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

            const message =
                error.response?.data?.error ||
                error.response?.data?.message ||
                'Failed to delete selected users.';

            setError(message);
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
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">
                        Users
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                        Manage internal users and their access.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={openAddUserModal}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                    <Plus className="h-4 w-4" />
                    Add User
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                        type="search"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(event) =>
                            setSearchTerm(event.target.value)
                        }
                        className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    />
                </div>

                <div className="flex items-center gap-3">
                    {selectedUserIds.length > 0 && (
                        <button
                            type="button"
                            onClick={handleBulkDeleteAction}
                            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete Selected
                            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
                                {selectedUserIds.length}
                            </span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => loadUsers(pageNumber)}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <RefreshCw
                            className={`h-4 w-4 ${loading ? 'animate-spin' : ''
                                }`}
                        />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
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
                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </th>

                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Name
                                </th>

                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Email
                                </th>

                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Role
                                </th>

                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Phone
                                </th>

                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Status
                                </th>

                                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan="7"
                                        className="px-6 py-10 text-center text-sm text-slate-500"
                                    >
                                        Loading users...
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan="7"
                                        className="px-6 py-10 text-center text-sm text-slate-500"
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
                                            className={`transition ${isSelected
                                                ? 'bg-blue-50/60'
                                                : 'hover:bg-slate-50'
                                                }`}
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
                                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />
                                            </td>

                                            <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">
                                                {user.name}
                                            </td>

                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                                                {user.email}
                                            </td>

                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                                                {user.roleName ||
                                                    'Unknown Role'}
                                            </td>

                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                                                {user.phone || '—'}
                                            </td>

                                            <td className="whitespace-nowrap px-6 py-4">
                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${active
                                                        ? 'bg-emerald-50 text-emerald-700'
                                                        : 'bg-red-50 text-red-700'
                                                        }`}
                                                >
                                                    {getStatusLabel(
                                                        user.status
                                                    )}
                                                </span>
                                            </td>

                                            <td className="relative whitespace-nowrap px-6 py-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        toggleMenu(user.id)
                                                    }
                                                    aria-label={`Actions for ${user.name}`}
                                                    aria-expanded={isMenuOpen}
                                                    className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                                                >
                                                    <Ellipsis className="h-5 w-5" />
                                                </button>

                                                {isMenuOpen && (
                                                    <div className="absolute right-6 top-14 z-50 w-44 rounded-xl border border-slate-200 bg-white p-1 text-left shadow-lg">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleAction(
                                                                    'Edit',
                                                                    user
                                                                )
                                                            }
                                                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                            Edit
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleAction(
                                                                    'Status',
                                                                    user
                                                                )
                                                            }
                                                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                                                        >
                                                            {active ? (
                                                                <UserX className="h-4 w-4" />
                                                            ) : (
                                                                <UserCheck className="h-4 w-4" />
                                                            )}

                                                            {active
                                                                ? 'Deactivate'
                                                                : 'Activate'}
                                                        </button>

                                                        <div className="my-1 border-t border-slate-100" />

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleAction(
                                                                    'Delete',
                                                                    user
                                                                )
                                                            }
                                                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-600 transition hover:bg-red-50"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                            Delete
                                                        </button>
                                                    </div>
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
                <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
                    <p className="text-sm text-slate-500">
                        Showing page{' '}
                        <span className="font-medium text-slate-700">
                            {pageNumber}
                        </span>{' '}
                        of{' '}
                        <span className="font-medium text-slate-700">
                            {totalPages}
                        </span>{' '}
                        —{' '}
                        <span className="font-medium text-slate-700">
                            {totalCount}
                        </span>{' '}
                        users
                    </p>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handlePreviousPage}
                            disabled={loading || pageNumber <= 1}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Add User Modal */}
            {isAddUserModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
                    onClick={closeAddUserModal}
                >
                    <div
                        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">
                                    Add User
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Create a new internal user.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeAddUserModal}
                                disabled={creatingUser}
                                aria-label="Close modal"
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-5 px-6 py-6">
                            {addUserError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    {addUserError}
                                </div>
                            )}

                            {createSuccess && (
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
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
                                    className="mb-2 block text-sm font-medium text-slate-700"
                                >
                                    Full Name *
                                </label>

                                <input
                                    id="new-user-name"
                                    name="name"
                                    type="text"
                                    value={newUser.name}
                                    onChange={handleNewUserChange}
                                    disabled={creatingUser || createSuccess}
                                    className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="new-user-email"
                                    className="mb-2 block text-sm font-medium text-slate-700"
                                >
                                    Email Address *
                                </label>

                                <input
                                    id="new-user-email"
                                    name="email"
                                    type="email"
                                    value={newUser.email}
                                    onChange={handleNewUserChange}
                                    disabled={creatingUser || createSuccess}
                                    className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="new-user-phone"
                                    className="mb-2 block text-sm font-medium text-slate-700"
                                >
                                    Phone Number
                                </label>

                                <input
                                    id="new-user-phone"
                                    name="phone"
                                    type="text"
                                    value={newUser.phone}
                                    onChange={handleNewUserChange}
                                    disabled={creatingUser || createSuccess}
                                    className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="new-user-role"
                                    className="mb-2 block text-sm font-medium text-slate-700"
                                >
                                    Role *
                                </label>

                                <select
                                    id="new-user-role"
                                    name="roleId"
                                    value={newUser.roleId}
                                    onChange={handleNewUserChange}
                                    disabled={
                                        rolesLoading ||
                                        creatingUser ||
                                        createSuccess
                                    }
                                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
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
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
                            <button
                                type="button"
                                onClick={closeAddUserModal}
                                disabled={creatingUser}
                                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {createSuccess ? 'Close' : 'Cancel'}
                            </button>

                            {!createSuccess && (
                                <button
                                    type="button"
                                    onClick={handleCreateUser}
                                    disabled={creatingUser || rolesLoading}
                                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
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
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
                    onClick={closeEditModal}
                >
                    <div
                        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">
                                    Edit User
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Update the user profile information.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeEditModal}
                                disabled={saving}
                                aria-label="Close modal"
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-5 px-6 py-6">
                            {modalError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    {modalError}
                                </div>
                            )}

                            <div>
                                <label
                                    htmlFor="edit-user-name"
                                    className="mb-2 block text-sm font-medium text-slate-700"
                                >
                                    Name
                                </label>

                                <input
                                    id="edit-user-name"
                                    name="name"
                                    type="text"
                                    value={editForm.name}
                                    onChange={handleFormChange}
                                    disabled={saving}
                                    className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="edit-user-email"
                                    className="mb-2 block text-sm font-medium text-slate-700"
                                >
                                    Email
                                </label>

                                <input
                                    id="edit-user-email"
                                    name="email"
                                    type="email"
                                    value={editForm.email}
                                    onChange={handleFormChange}
                                    disabled={saving}
                                    className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="edit-user-phone"
                                    className="mb-2 block text-sm font-medium text-slate-700"
                                >
                                    Phone
                                </label>

                                <input
                                    id="edit-user-phone"
                                    name="phone"
                                    type="text"
                                    value={editForm.phone}
                                    onChange={handleFormChange}
                                    disabled={saving}
                                    className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
                            <button
                                type="button"
                                onClick={closeEditModal}
                                disabled={saving}
                                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleSaveChanges}
                                disabled={saving}
                                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
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
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
                    onClick={closeStatusModal}
                >
                    <div
                        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                            <h2 className="text-lg font-semibold text-slate-900">
                                {isActive(statusUser.status)
                                    ? 'Deactivate User'
                                    : 'Activate User'}
                            </h2>

                            <button
                                type="button"
                                onClick={closeStatusModal}
                                disabled={changingStatus}
                                aria-label="Close modal"
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="px-6 py-6">
                            <p className="text-sm leading-6 text-slate-600">
                                Are you sure you want to{' '}
                                <span className="font-semibold text-slate-900">
                                    {isActive(statusUser.status)
                                        ? 'deactivate'
                                        : 'activate'}
                                </span>{' '}
                                user{' '}
                                <span className="font-semibold text-slate-900">
                                    {statusUser.name}
                                </span>
                                ?
                            </p>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
                            <button
                                type="button"
                                onClick={closeStatusModal}
                                disabled={changingStatus}
                                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleConfirmStatusChange}
                                disabled={changingStatus}
                                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${isActive(statusUser.status)
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : 'bg-emerald-600 hover:bg-emerald-700'
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
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
                    onClick={closeDeleteModal}
                >
                    <div
                        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                            <h2 className="text-lg font-semibold text-slate-900">
                                Delete User
                            </h2>

                            <button
                                type="button"
                                onClick={closeDeleteModal}
                                disabled={deleting}
                                aria-label="Close modal"
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="px-6 py-6">
                            <p className="text-sm leading-6 text-slate-600">
                                Are you sure you want to delete user{' '}
                                <span className="font-semibold text-slate-900">
                                    {deleteUser.name}
                                </span>
                                ?
                            </p>

                            <p className="mt-2 text-sm text-red-600">
                                This action cannot be undone.
                            </p>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
                            <button
                                type="button"
                                onClick={closeDeleteModal}
                                disabled={deleting}
                                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                disabled={deleting}
                                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
                    onClick={closeBulkDeleteModal}
                >
                    <div
                        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                            <h2 className="text-lg font-semibold text-slate-900">
                                Delete Selected Users
                            </h2>

                            <button
                                type="button"
                                onClick={closeBulkDeleteModal}
                                disabled={bulkDeleting}
                                aria-label="Close modal"
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="px-6 py-6">
                            <p className="text-sm leading-6 text-slate-600">
                                Are you sure you want to delete{' '}
                                <span className="font-semibold text-slate-900">
                                    {selectedUserIds.length}
                                </span>{' '}
                                selected users?
                            </p>

                            <p className="mt-2 text-sm text-red-600">
                                This action cannot be undone.
                            </p>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
                            <button
                                type="button"
                                onClick={closeBulkDeleteModal}
                                disabled={bulkDeleting}
                                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleConfirmBulkDelete}
                                disabled={bulkDeleting}
                                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
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
        </div>
    );
}