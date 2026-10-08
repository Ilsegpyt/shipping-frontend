import { useEffect, useMemo, useState } from 'react';

import {

    AlertTriangle,

    Ellipsis,

    Plus,

    RefreshCw,

    Search,

    ShieldCheck,

    Trash2,

    X,

} from 'lucide-react';

import rolesService from '../../../services/rolesService';

const PERMISSION_GROUPS = [

    {

        name: 'Content',

        permissions: [

            'content.view',

            'content.create',

            'content.edit',

            'content.delete',

            'content.images.upload',

        ],

    },

    {

        name: 'Agent Applications',

        permissions: [

            'website.agentapplications.create',

            'website.agentapplications.view',

        ],

    },

    {

        name: 'Branches',

        permissions: [

            'website.branches.create',

            'website.branches.delete',

            'website.branches.view',

            'website.branches.restore',

            'website.branches.edit',

        ],

    },

    {

        name: 'Contact Inquiries',

        permissions: [

            'website.contactinquiries.create',

            'website.contactinquiries.view',

        ],

    },

    {

        name: 'Quote Requests',

        permissions: [

            'website.quoterequests.create',

            'website.quoterequests.view',

        ],

    },

    {

        name: 'Recruitment Applications',

        permissions: [

            'website.recruitmentapplications.create',

            'website.recruitmentapplications.view',

            'website.recruitmentapplications.cv.download',

        ],

    },

    {

        name: 'Account Manager',

        permissions: [

            'customers.accountmanager.assign',

        ],

    },

    {

        name: 'Identity',

        permissions: [

            'identity.users.create',

            'identity.users.edit',

            'identity.users.suspend',

            'identity.users.delete',

            'identity.roles.manage',

            'identity.users.view',

        ],

    },

    {

        name: 'Sub Accounts',

        permissions: [

            'identity.subaccounts.view',

            'identity.subaccounts.create',

            'identity.subaccounts.edit',

            'identity.subaccounts.delete',

            'identity.subaccounts.suspend',

        ],

    },

    {

        name: 'Customers',

        permissions: [

            'customers.view',

            'customers.create',

            'customers.edit',

            'customers.suspend',

            'customers.delete',

            'customers.impersonate',

            'customers.impersonation.view',

        ],

    },

    {

        name: 'Reports',

        permissions: [

            'reports.view',

            'reports.upload',

            'reports.download',

        ],

    },

    {

        name: 'Notifications',

        permissions: [

            'notifications.view',

        ],

    },

];

export default function Roles() {

    const [roles, setRoles] = useState([]);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState('');

    const [searchTerm, setSearchTerm] = useState('');

    const [openMenuId, setOpenMenuId] = useState(null);

    // Add Role

    const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);

    const [creatingRole, setCreatingRole] = useState(false);

    const [addRoleError, setAddRoleError] = useState('');

    const [createSuccess, setCreateSuccess] = useState(false);

    const [newRole, setNewRole] = useState({

        name: '',

        description: '',

    });

    // Permissions

    const [selectedRole, setSelectedRole] = useState(null);

    const [isPermissionsModalOpen, setIsPermissionsModalOpen] =

        useState(false);

    const [rolePermissions, setRolePermissions] = useState([]);

    const [permissionsLoading, setPermissionsLoading] = useState(false);

    const [permissionError, setPermissionError] = useState('');

    const [selectedPermission, setSelectedPermission] = useState('');

    const [grantingPermission, setGrantingPermission] = useState(false);

    const [revokingPermission, setRevokingPermission] = useState(null);

    const [permissionToRemove, setPermissionToRemove] = useState(null);

    // Deactivate Role

    const [roleToDeactivate, setRoleToDeactivate] = useState(null);

    const [deactivatingRole, setDeactivatingRole] = useState(false);

    const [roleToActivate, setRoleToActivate] = useState(null);

    const [activatingRole, setActivatingRole] = useState(false);

    async function loadRoles() {

        try {

            setLoading(true);

            setError('');

            const result = await rolesService.getAll();

            setRoles(result ?? []);

            setOpenMenuId(null);

        } catch (error) {

            console.error(error);

            const message =

                error.response?.data?.error ||

                error.response?.data?.message ||

                'Failed to load roles.';

            setError(message);

        } finally {

            setLoading(false);

        }

    }

    useEffect(() => {

        loadRoles();

    }, []);

    const filteredRoles = useMemo(() => {

        const term = searchTerm.trim().toLowerCase();

        if (!term) {

            return roles;

        }

        return roles.filter((role) =>

            [role.name]

                .filter(Boolean)

                .some((value) =>

                    String(value).toLowerCase().includes(term)

                )

        );

    }, [roles, searchTerm]);

    const availablePermissions = useMemo(() => {

        const currentPermissions = new Set(rolePermissions);

        return PERMISSION_GROUPS.map((group) => ({

            ...group,

            permissions: group.permissions.filter(

                (permission) => !currentPermissions.has(permission)

            ),

        })).filter((group) => group.permissions.length > 0);

    }, [rolePermissions]);

    // ---------------- Add Role ----------------

    function openAddRoleModal() {

        setNewRole({

            name: '',

            description: '',

        });

        setAddRoleError('');

        setCreateSuccess(false);

        setIsAddRoleModalOpen(true);

    }

    function closeAddRoleModal() {

        if (creatingRole) return;

        setIsAddRoleModalOpen(false);

        setAddRoleError('');

        setCreateSuccess(false);

    }

    function handleNewRoleChange(event) {

        const { name, value } = event.target;

        setNewRole((currentRole) => ({

            ...currentRole,

            [name]: value,

        }));

    }

    async function handleCreateRole() {

        const name = newRole.name.trim();

        const description = newRole.description.trim();

        if (!name) {

            setAddRoleError('Role name is required.');

            return;

        }

        try {

            setCreatingRole(true);

            setAddRoleError('');

            await rolesService.create({

                name,

                description,

            });

            setCreateSuccess(true);

            await loadRoles();

        } catch (error) {

            console.error(error);

            const message =

                error.response?.data?.error ||

                error.response?.data?.message ||

                'Failed to create role.';

            setAddRoleError(message);

        } finally {

            setCreatingRole(false);

        }

    }

    // ---------------- Permissions ----------------

    async function openPermissionsModal(role) {

        setOpenMenuId(null);

        setSelectedRole(role);

        setRolePermissions([]);

        setPermissionError('');

        setSelectedPermission('');

        setIsPermissionsModalOpen(true);

        try {

            setPermissionsLoading(true);

            const result = await rolesService.getPermissions(role.id);

            setRolePermissions(result ?? []);

        } catch (error) {

            console.error(error);

            const message =

                error.response?.data?.error ||

                error.response?.data?.message ||

                'Failed to load role permissions.';

            setPermissionError(message);

        } finally {

            setPermissionsLoading(false);

        }

    }

    function closePermissionsModal() {

        if (grantingPermission || revokingPermission) return;

        setIsPermissionsModalOpen(false);

        setSelectedRole(null);

        setRolePermissions([]);

        setPermissionError('');

        setSelectedPermission('');

        setPermissionToRemove(null);

    }

    function requestRevokePermission(permissionKey) {

        if (!selectedRole || revokingPermission !== null) return;

        setPermissionError('');

        setPermissionToRemove(permissionKey);

    }

    async function confirmRevokePermission() {

        if (!permissionToRemove || !selectedRole) return;

        const permissionKey = permissionToRemove;

        const success = await handleRevokePermission(permissionKey);

        if (success) {

            setPermissionToRemove(null);

        }

    }

    async function handleGrantPermission() {

        if (!selectedRole || !selectedPermission) {

            return;

        }

        try {

            setGrantingPermission(true);

            setPermissionError('');

            await rolesService.grantPermission(

                selectedRole.id,

                selectedPermission

            );

            const result = await rolesService.getPermissions(

                selectedRole.id

            );

            setRolePermissions(result ?? []);

            setSelectedPermission('');

        } catch (error) {

            console.error(error);

            const message =

                error.response?.data?.error ||

                error.response?.data?.message ||

                'Failed to grant permission.';

            setPermissionError(message);

        } finally {

            setGrantingPermission(false);

        }

    }

    async function handleRevokePermission(permissionKey) {

        if (!selectedRole) return;

        try {

            setRevokingPermission(permissionKey);

            setPermissionError('');

            await rolesService.revokePermission(

                selectedRole.id,

                permissionKey

            );

            setRolePermissions((currentPermissions) =>

                currentPermissions.filter(

                    (permission) => permission !== permissionKey

                )

            );

            return true;

        } catch (error) {

            console.error(error);

            const message =

                error.response?.data?.error ||

                error.response?.data?.message ||

                'Failed to revoke permission.';

            setPermissionError(message);

            return false;

        } finally {

            setRevokingPermission(null);

        }

    }

    function toggleMenu(roleId) {

        setOpenMenuId((currentId) =>

            currentId === roleId ? null : roleId

        );

    }

    function requestDeactivateRole(role) {

        setOpenMenuId(null);

        setRoleToDeactivate(role);

        setError('');

    }

    async function confirmDeactivateRole() {

        if (!roleToDeactivate || deactivatingRole) return;

        try {

            setDeactivatingRole(true);

            setError('');

            await rolesService.deactivate(roleToDeactivate.id);

            setRoleToDeactivate(null);

            await loadRoles();

        } catch (error) {

            console.error(error);

            const message =

                error.response?.data?.error ||

                error.response?.data?.message ||

                'Failed to deactivate role.';

            setError(message);

        } finally {

            setDeactivatingRole(false);

        }

    }

    function requestActivateRole(role) {

        setOpenMenuId(null);

        setRoleToActivate(role);

        setError('');

    }

    async function confirmActivateRole() {

        if (!roleToActivate || activatingRole) return;

        try {

            setActivatingRole(true);

            setError('');

            await rolesService.activate(roleToActivate.id);

            setRoleToActivate(null);

            await loadRoles();

        } catch (error) {

            console.error(error);

            const message =

                error.response?.data?.error ||

                error.response?.data?.message ||

                'Failed to activate role.';

            setError(message);

        } finally {

            setActivatingRole(false);

        }

    }

    return (

        <div className="space-y-6">

            {/* Page Header */}

            <div className="flex items-center justify-between">

                <div>

                    <h1 className="text-2xl font-semibold text-slate-900">

                        Roles

                    </h1>

                    <p className="mt-1 text-sm text-slate-500">

                        Manage roles and their permissions.

                    </p>

                </div>

                <button

                    type="button"

                    onClick={openAddRoleModal}

                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"

                >

                    <Plus className="h-4 w-4" />

                    Add Role

                </button>

            </div>

            {/* Toolbar */}

            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">

                <div className="relative w-full max-w-sm">

                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input

                        type="search"

                        placeholder="Search roles..."

                        value={searchTerm}

                        onChange={(event) =>

                            setSearchTerm(event.target.value)

                        }

                        className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"

                    />

                </div>

                <button

                    type="button"

                    onClick={loadRoles}

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

                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">

                                    Role

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

                                        colSpan="3"

                                        className="px-6 py-10 text-center text-sm text-slate-500"

                                    >

                                        Loading roles...

                                    </td>

                                </tr>

                            ) : filteredRoles.length === 0 ? (

                                <tr>

                                    <td

                                        colSpan="3"

                                        className="px-6 py-10 text-center text-sm text-slate-500"

                                    >

                                        No roles found.

                                    </td>

                                </tr>

                            ) : (

                                filteredRoles.map((role) => {

                                    const isMenuOpen =

                                        openMenuId === role.id;

                                    return (

                                        <tr

                                            key={role.id}

                                            className="transition hover:bg-slate-50"

                                        >

                                            <td className="whitespace-nowrap px-6 py-4">

                                                <div className="flex items-center gap-3">

                                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">

                                                        <ShieldCheck className="h-4 w-4 text-slate-600" />

                                                    </div>

                                                    <span className="text-sm font-medium text-slate-900">

                                                        {role.name}

                                                    </span>

                                                </div>

                                            </td>

                                            <td className="whitespace-nowrap px-6 py-4">

                                                {role.status === 0 || role.status === 'Active' ? (

                                                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">

                                                        Active

                                                    </span>

                                                ) : (

                                                    <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">

                                                        Inactive

                                                    </span>

                                                )}

                                            </td>

                                            <td className="relative whitespace-nowrap px-6 py-4 text-right">

                                                <button

                                                    type="button"

                                                    onClick={() =>

                                                        toggleMenu(

                                                            role.id

                                                        )

                                                    }

                                                    aria-label={`Actions for ${role.name}`}

                                                    aria-expanded={

                                                        isMenuOpen

                                                    }

                                                    className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"

                                                >

                                                    <Ellipsis className="h-5 w-5" />

                                                </button>

                                                {isMenuOpen && (

                                                    <div className="absolute right-6 top-14 z-50 w-48 rounded-xl border border-slate-200 bg-white p-1 text-left shadow-lg">

                                                        <button

                                                            type="button"

                                                            onClick={() =>

                                                                openPermissionsModal(

                                                                    role

                                                                )

                                                            }

                                                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"

                                                        >

                                                            <ShieldCheck className="h-4 w-4" />

                                                            Permissions

                                                        </button>

                                                        {role.status === 0 || role.status === 'Active' ? (

                                                            <button

                                                                type="button"

                                                                onClick={() =>

                                                                    requestDeactivateRole(role)

                                                                }

                                                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-600 transition hover:bg-red-50"

                                                            >

                                                                <Trash2 className="h-4 w-4" />

                                                                Deactivate

                                                            </button>

                                                        ) : (

                                                            <button

                                                                type="button"

                                                                onClick={() =>

                                                                    requestActivateRole(role)

                                                                }

                                                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-emerald-600 transition hover:bg-emerald-50"

                                                            >

                                                                <ShieldCheck className="h-4 w-4" />

                                                                Activate

                                                            </button>

                                                        )}

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

                {/* Footer */}

                <div className="border-t border-slate-200 px-6 py-4">

                    <p className="text-sm text-slate-500">

                        Showing{' '}

                        <span className="font-medium text-slate-700">

                            {filteredRoles.length}

                        </span>{' '}

                        {filteredRoles.length === 1

                            ? 'role'

                            : 'roles'}

                    </p>

                </div>

            </div>

            {/* Add Role Modal */}

            {isAddRoleModalOpen && (

                <div

                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"

                    onClick={closeAddRoleModal}

                >

                    <div

                        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"

                        onClick={(event) =>

                            event.stopPropagation()

                        }

                    >

                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

                            <div>

                                <h2 className="text-lg font-semibold text-slate-900">

                                    Add Role

                                </h2>

                                <p className="mt-1 text-sm text-slate-500">

                                    Create a new role.

                                </p>

                            </div>

                            <button

                                type="button"

                                onClick={closeAddRoleModal}

                                disabled={creatingRole}

                                aria-label="Close modal"

                                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"

                            >

                                <X className="h-5 w-5" />

                            </button>

                        </div>

                        <div className="space-y-5 px-6 py-6">

                            {addRoleError && (

                                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

                                    {addRoleError}

                                </div>

                            )}

                            {createSuccess && (

                                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">

                                    Role created successfully.

                                </div>

                            )}

                            <div>

                                <label

                                    htmlFor="new-role-name"

                                    className="mb-2 block text-sm font-medium text-slate-700"

                                >

                                    Role Name \*

                                </label>

                                <input

                                    id="new-role-name"

                                    name="name"

                                    type="text"

                                    value={newRole.name}

                                    onChange={handleNewRoleChange}

                                    disabled={

                                        creatingRole ||

                                        createSuccess

                                    }

                                    className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"

                                />

                            </div>

                            <div>

                                <label

                                    htmlFor="new-role-description"

                                    className="mb-2 block text-sm font-medium text-slate-700"

                                >

                                    Description

                                </label>

                                <textarea

                                    id="new-role-description"

                                    name="description"

                                    rows="4"

                                    value={newRole.description}

                                    onChange={handleNewRoleChange}

                                    disabled={

                                        creatingRole ||

                                        createSuccess

                                    }

                                    className="w-full rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"

                                />

                            </div>

                        </div>

                        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">

                            <button

                                type="button"

                                onClick={closeAddRoleModal}

                                disabled={creatingRole}

                                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"

                            >

                                {createSuccess ? 'Close' : 'Cancel'}

                            </button>

                            {!createSuccess && (

                                <button

                                    type="button"

                                    onClick={handleCreateRole}

                                    disabled={creatingRole}

                                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"

                                >

                                    {creatingRole && (

                                        <RefreshCw className="h-4 w-4 animate-spin" />

                                    )}

                                    {creatingRole

                                        ? 'Creating...'

                                        : 'Create Role'}

                                </button>

                            )}

                        </div>

                    </div>

                </div>

            )}

            {/* Permissions Modal */}

            {isPermissionsModalOpen && selectedRole && (

                <div

                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6"

                    onClick={closePermissionsModal}

                >

                    <div

                        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl"

                        onClick={(event) =>

                            event.stopPropagation()

                        }

                    >

                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

                            <div>

                                <h2 className="text-lg font-semibold text-slate-900">

                                    Role Permissions

                                </h2>

                                <p className="mt-1 text-sm text-slate-500">

                                    Manage permissions for{' '}

                                    <span className="font-medium text-slate-700">

                                        {selectedRole.name}

                                    </span>

                                </p>

                            </div>

                            <button

                                type="button"

                                onClick={closePermissionsModal}

                                disabled={

                                    grantingPermission ||

                                    revokingPermission !== null

                                }

                                aria-label="Close modal"

                                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"

                            >

                                <X className="h-5 w-5" />

                            </button>

                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-6">

                            {permissionError && (

                                <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

                                    {permissionError}

                                </div>

                            )}

                            {/* Add Permission */}

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                                <label

                                    htmlFor="permission-select"

                                    className="mb-2 block text-sm font-medium text-slate-700"

                                >

                                    Add Permission

                                </label>

                                <div className="flex gap-3">

                                    <select

                                        id="permission-select"

                                        value={selectedPermission}

                                        onChange={(event) =>

                                            setSelectedPermission(

                                                event.target.value

                                            )

                                        }

                                        disabled={

                                            permissionsLoading ||

                                            grantingPermission

                                        }

                                        className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"

                                    >

                                        <option value="">

                                            Select a permission

                                        </option>

                                        {availablePermissions.map(

                                            (group) => (

                                                <optgroup

                                                    key={group.name}

                                                    label={group.name}

                                                >

                                                    {group.permissions.map(

                                                        (

                                                            permission

                                                        ) => (

                                                            <option

                                                                key={

                                                                    permission

                                                                }

                                                                value={

                                                                    permission

                                                                }

                                                            >

                                                                {

                                                                    permission

                                                                }

                                                            </option>

                                                        )

                                                    )}

                                                </optgroup>

                                            )

                                        )}

                                    </select>

                                    <button

                                        type="button"

                                        onClick={

                                            handleGrantPermission

                                        }

                                        disabled={

                                            !selectedPermission ||

                                            grantingPermission ||

                                            permissionsLoading

                                        }

                                        className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"

                                    >

                                        {grantingPermission && (

                                            <RefreshCw className="h-4 w-4 animate-spin" />

                                        )}

                                        Add

                                    </button>

                                </div>

                            </div>

                            {/* Current Permissions */}

                            <div className="mt-6">

                                <div className="mb-3 flex items-center justify-between">

                                    <h3 className="text-sm font-semibold text-slate-900">

                                        Current Permissions

                                    </h3>

                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">

                                        {rolePermissions.length}

                                    </span>

                                </div>

                                {permissionsLoading ? (

                                    <div className="rounded-xl border border-slate-200 px-6 py-10 text-center text-sm text-slate-500">

                                        Loading permissions...

                                    </div>

                                ) : rolePermissions.length === 0 ? (

                                    <div className="rounded-xl border border-slate-200 px-6 py-10 text-center text-sm text-slate-500">

                                        This role has no permissions.

                                    </div>

                                ) : (

                                    <div className="space-y-2">

                                        {rolePermissions.map(

                                            (permission) => (

                                                <div

                                                    key={permission}

                                                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"

                                                >

                                                    <div className="flex min-w-0 items-center gap-3">

                                                        <ShieldCheck className="h-4 w-4 shrink-0 text-slate-500" />

                                                        <span className="truncate text-sm text-slate-700">

                                                            {

                                                                permission

                                                            }

                                                        </span>

                                                    </div>

                                                    <button

                                                        type="button"

                                                        onClick={() =>

                                                            requestRevokePermission(

                                                                permission

                                                            )

                                                        }

                                                        disabled={

                                                            revokingPermission !==

                                                            null ||

                                                            grantingPermission

                                                        }

                                                        className="ml-4 inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"

                                                    >

                                                        {revokingPermission ===

                                                            permission && (

                                                                <RefreshCw className="h-4 w-4 animate-spin" />

                                                            )}

                                                        <Trash2 className="h-4 w-4" />

                                                        Remove

                                                    </button>

                                                </div>

                                            )

                                        )}

                                    </div>

                                )}

                            </div>

                        </div>

                        <div className="flex justify-end border-t border-slate-200 px-6 py-4">

                            <button

                                type="button"

                                onClick={closePermissionsModal}

                                disabled={

                                    grantingPermission ||

                                    revokingPermission !== null

                                }

                                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"

                            >

                                Close

                            </button>

                        </div>

                    </div>

                </div>

            )}

            {roleToActivate && (

                <div

                    className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 px-4"

                    onClick={() => {

                        if (!activatingRole) {

                            setRoleToActivate(null);

                        }

                    }}

                >

                    <div

                        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"

                        onClick={(event) => event.stopPropagation()}

                    >

                        <div className="flex items-center gap-4 border-b border-emerald-100 px-6 py-5">

                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50">

                                <ShieldCheck className="h-5 w-5 text-emerald-600" />

                            </div>

                            <div>

                                <h2 className="text-lg font-semibold text-slate-900">

                                    Activate Role?

                                </h2>

                                <p className="mt-1 text-sm text-slate-500">

                                    This will activate the role and make it available again.

                                </p>

                            </div>

                        </div>

                        <div className="px-6 py-5">

                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">

                                <p className="text-sm text-emerald-700">

                                    Are you sure you want to activate

                                    <span className="mx-1 font-semibold">

                                        {roleToActivate.name}

                                    </span>

                                    ?

                                </p>

                            </div>

                        </div>

                        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">

                            <button

                                type="button"

                                onClick={() => setRoleToActivate(null)}

                                disabled={activatingRole}

                                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"

                            >

                                Cancel

                            </button>

                            <button

                                type="button"

                                onClick={confirmActivateRole}

                                disabled={activatingRole}

                                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"

                            >

                                {activatingRole && (

                                    <RefreshCw className="h-4 w-4 animate-spin" />

                                )}

                                Activate

                            </button>

                        </div>

                    </div>

                </div>

            )}

            {roleToDeactivate && (

                <div

                    className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 px-4"

                    onClick={() => {

                        if (!deactivatingRole) {

                            setRoleToDeactivate(null);

                        }

                    }}

                >

                    <div

                        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"

                        onClick={(event) => event.stopPropagation()}

                    >

                        <div className="flex items-center gap-4 border-b border-red-100 px-6 py-5">

                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50">

                                <AlertTriangle className="h-5 w-5 text-red-600" />

                            </div>

                            <div>

                                <h2 className="text-lg font-semibold text-slate-900">

                                    Deactivate Role?

                                </h2>

                                <p className="mt-1 text-sm text-slate-500">

                                    This will deactivate the role and remove it

                                    from the active roles list.

                                </p>

                            </div>

                        </div>

                        <div className="px-6 py-5">

                            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">

                                <p className="text-sm text-red-700">

                                    Are you sure you want to deactivate

                                    <span className="mx-1 font-semibold">

                                        {roleToDeactivate.name}

                                    </span>

                                    ?

                                </p>

                            </div>

                        </div>

                        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">

                            <button

                                type="button"

                                onClick={() => setRoleToDeactivate(null)}

                                disabled={deactivatingRole}

                                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"

                            >

                                Cancel

                            </button>

                            <button

                                type="button"

                                onClick={confirmDeactivateRole}

                                disabled={deactivatingRole}

                                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"

                            >

                                {deactivatingRole && (

                                    <RefreshCw className="h-4 w-4 animate-spin" />

                                )}

                                Deactivate

                            </button>

                        </div>

                    </div>

                </div>

            )}

            {permissionToRemove && selectedRole && (

                <div

                    className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 px-4"

                    onClick={() => {

                        if (revokingPermission === null) {

                            setPermissionToRemove(null);

                        }

                    }}

                >

                    <div

                        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"

                        onClick={(event) => event.stopPropagation()}

                    >

                        <div className="flex items-center gap-4 border-b border-red-100 px-6 py-5">

                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50">

                                <AlertTriangle className="h-5 w-5 text-red-600" />

                            </div>

                            <div>

                                <h2 className="text-lg font-semibold text-slate-900">

                                    Remove Permission?

                                </h2>

                                <p className="mt-1 text-sm text-slate-500">

                                    This action will remove the permission from this role.

                                </p>

                            </div>

                        </div>

                        <div className="px-6 py-5">

                            {permissionError && (

                                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

                                    {permissionError}

                                </div>

                            )}

                            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">

                                <p className="text-sm text-red-700">

                                    Are you sure you want to remove

                                    <span className="mx-1 font-semibold">

                                        {permissionToRemove}

                                    </span>

                                    from

                                    <span className="ml-1 font-semibold">

                                        {selectedRole.name}

                                    </span>

                                    ?

                                </p>

                            </div>

                        </div>

                        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">

                            <button

                                type="button"

                                onClick={() => setPermissionToRemove(null)}

                                disabled={revokingPermission !== null}

                                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"

                            >

                                Cancel

                            </button>

                            <button

                                type="button"

                                onClick={confirmRevokePermission}

                                disabled={revokingPermission !== null}

                                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"

                            >

                                {revokingPermission === permissionToRemove && (

                                    <RefreshCw className="h-4 w-4 animate-spin" />

                                )}

                                Remove

                            </button>

                        </div>

                    </div>

                </div>

            )}

        </div>

    );

}
