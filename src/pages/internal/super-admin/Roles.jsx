import ApiFieldError from '../../../components/common/ApiFieldError';
import { DashboardPage, DashboardPageHeader, DashboardButton, DashboardToolbar, DashboardSearchField, DashboardTableSurface, DashboardStatusBadge, DashboardActionMenu, DashboardActionItem } from '../../../components/dashboard/DashboardUI';
import { useEffect, useMemo, useState } from 'react';

import {

    AlertTriangle,

    Ellipsis,

    Plus,

    RefreshCw,


    ShieldCheck,

    Trash2,

    X,

} from 'lucide-react';

import rolesService from '../../../services/rolesService';
import { extractApiErrorMessage, extractApiFieldErrors } from '../../../utils/errorUtils';

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

        name: 'Operations',

        permissions: [

            'operations.view',

            'operations.create',

            'operations.edit',

            'operations.delete',

            'operations.deliver',

            'operations.reopen',

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
    const [addRoleErrorFields, setAddRoleErrorFields] = useState({});

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
            setError(extractApiErrorMessage(error, 'Failed to load roles.'));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadRoles();
    }, []);


    const ROLE_ARABIC_ALIASES = {
        'super admin': 'مدير النظام سوبر ادمن ادمنز',
        'operations': 'عمليات تشغيل نقل بحري',
        'operations specialist': 'مسؤول عمليات تشغيل بحري',
        'customs broker': 'مخلص جمركي تخليص جمارك',
        'account manager': 'مدير حسابات عملاء اكاونت مانجر',
        'sales': 'مبيعات سيلز',
    };

    const filteredRoles = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return roles;

        return roles.filter((role) => {
            const name = String(role.name || '').toLowerCase();
            const desc = String(role.description || '').toLowerCase();
            const alias = ROLE_ARABIC_ALIASES[name] || '';

            return name.includes(term) || desc.includes(term) || alias.includes(term);
        });
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

        setAddRoleErrorFields({});

        setCreateSuccess(false);

        setIsAddRoleModalOpen(true);

    }

    function closeAddRoleModal() {

        if (creatingRole) return;

        setIsAddRoleModalOpen(false);

        setAddRoleError('');

        setAddRoleErrorFields({});

        setCreateSuccess(false);

    }

    function handleNewRoleChange(event) {
        setAddRoleErrorFields(current => { const next = { ...current }; delete next[event.target.name.toLowerCase()]; return next; });

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

            setAddRoleErrorFields({});

            await rolesService.create({

                name,

                description,

            });

            setCreateSuccess(true);

            await loadRoles();

        } catch (error) {
            console.error(error);
            setAddRoleErrorFields(extractApiFieldErrors(error));
            setAddRoleError(extractApiErrorMessage(error, 'Failed to create role.'));
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
            setPermissionError(extractApiErrorMessage(error, 'Failed to load role permissions.'));
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
            setPermissionError(extractApiErrorMessage(error, 'Failed to grant permission.'));
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
            setPermissionError(extractApiErrorMessage(error, 'Failed to revoke permission.'));
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
            setError(extractApiErrorMessage(error, 'Failed to deactivate role.'));
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
            setError(extractApiErrorMessage(error, 'Failed to activate role.'));
        } finally {

            setActivatingRole(false);

        }

    }

    return (

        <DashboardPage>

            <DashboardPageHeader
                title="Roles"
                eyebrow="Management / Administration"
                description="Manage roles and their permissions."
                actions={
                    <DashboardButton variant="primary" icon={Plus} onClick={openAddRoleModal}>
                        Add Role
                    </DashboardButton>
                }
            />

            <DashboardToolbar actions={
                <DashboardButton onClick={loadRoles} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </DashboardButton>
            }>
                <DashboardSearchField
                    placeholder="Search by role name, description, or alias..."
                    title="Search by role name, description, or alias"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                />
            </DashboardToolbar>

            {/* Error */}
            {error && (
                <div className="flex items-center justify-between rounded-none border border-brand-danger-soft bg-brand-danger-soft px-4 py-3 text-sm text-brand-danger shadow-xs transition">
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

                                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-brand-muted">

                                    Role

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

                                        colSpan="3"

                                        className="px-6 py-10 text-center text-sm text-brand-muted"

                                    >

                                        Loading roles...

                                    </td>

                                </tr>

                            ) : filteredRoles.length === 0 ? (

                                <tr>

                                    <td

                                        colSpan="3"

                                        className="px-6 py-10 text-center text-sm text-brand-muted"

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

                                            className="transition"

                                        >

                                            <td className="whitespace-nowrap px-6 py-4">

                                                <div className="flex items-center gap-3">

                                                    <div className="flex h-9 w-9 items-center justify-center bg-brand-surface-muted">

                                                        <ShieldCheck className="h-4 w-4 text-brand-muted" />

                                                    </div>

                                                    <span className="text-sm font-medium text-brand-text">

                                                        {role.name}

                                                    </span>

                                                </div>

                                            </td>

                                            <td className="whitespace-nowrap px-6 py-4">

                                                {role.status === 0 || role.status === 'Active' ? (

                                                    <DashboardStatusBadge tone="positive">Active</DashboardStatusBadge>

                                                ) : (

                                                    <DashboardStatusBadge tone="negative">Inactive</DashboardStatusBadge>

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

                                                    id={`dashboard-role-actions-${role.id}`}
                                                    aria-label={`Actions for ${role.name}`}

                                                    aria-expanded={

                                                        isMenuOpen

                                                    }

                                                    className="ils-dashboard-action-trigger"

                                                >

                                                    <Ellipsis className="h-5 w-5" />

                                                </button>

                                                {isMenuOpen && (

                                                    <DashboardActionMenu anchorId={`dashboard-role-actions-${role.id}`} width={248}>
                                                        <DashboardActionItem
                                                            action="permissions"
                                                            onClick={() => openPermissionsModal(role)}
                                                        />
                                                        {role.status === 0 || role.status === 'Active' ? (
                                                            <DashboardActionItem
                                                                action="deactivate"
                                                                onClick={() => requestDeactivateRole(role)}
                                                            />
                                                        ) : (
                                                            <DashboardActionItem
                                                                action="activate"
                                                                onClick={() => requestActivateRole(role)}
                                                            />
                                                        )}
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

                {/* Footer */}

                <div className="border-t border-brand-border px-6 py-4">

                    <p className="text-sm text-brand-muted">

                        Showing{' '}

                        <span className="font-medium text-brand-text">

                            {filteredRoles.length}

                        </span>{' '}

                        {filteredRoles.length === 1

                            ? 'role'

                            : 'roles'}

                    </p>

                </div>

            </DashboardTableSurface>

            {/* Add Role Modal */}

            {isAddRoleModalOpen && (

                <div

                    className="ils-dashboard-modal-overlay"

                    onClick={closeAddRoleModal}

                >

                    <div

                        className="ils-dashboard-dialog ils-dashboard-modal-panel ils-dashboard-modal-panel--form"

                        onClick={(event) =>

                            event.stopPropagation()

                        }

                    >

                        <div className="ils-dashboard-modal-header flex items-center justify-between">

                            <div>

                                <h2 className="text-lg font-semibold text-brand-text">

                                    Add Role

                                </h2>

                                <p className="mt-1 text-sm text-brand-muted">

                                    Create a new role.

                                </p>

                            </div>

                            <button

                                type="button"

                                onClick={closeAddRoleModal}

                                disabled={creatingRole}

                                aria-label="Close modal"

                                className="rounded-none p-2 text-brand-neutral transition hover:bg-brand-surface-muted hover:text-brand-muted disabled:cursor-not-allowed disabled:opacity-50"

                            >

                                <X className="h-5 w-5" />

                            </button>

                        </div>

                        <div className="ils-dashboard-modal-body">

                            {addRoleError && (

                                <div className="rounded-none border border-brand-danger-soft bg-brand-danger-soft px-4 py-3 text-sm text-brand-danger">

                                    {addRoleError}

                                </div>

                            )}

                            {createSuccess && (

                                <div className="rounded-none border border-brand-success-soft bg-brand-success-soft px-4 py-3 text-sm text-brand-success">

                                    Role created successfully.

                                </div>

                            )}

                            <div>

                                <label

                                    htmlFor="new-role-name"

                                    className="mb-2 block text-sm font-medium text-brand-text"

                                >

                                    Role Name \*

                                </label>

                                <input

                                    id="new-role-name"

                                    aria-invalid={Boolean(addRoleErrorFields["name"]?.length)}
                                    name="name"

                                    type="text"

                                    value={newRole.name}

                                    onChange={handleNewRoleChange}

                                    disabled={

                                        creatingRole ||

                                        createSuccess

                                    }

                                    className="h-11 w-full rounded-none border border-brand-border px-3 text-sm text-brand-text outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-surface-blue disabled:cursor-not-allowed disabled:bg-brand-surface-tint"

                                />
                                <ApiFieldError errors={addRoleErrorFields} field="name" />

                            </div>

                            <div>

                                <label

                                    htmlFor="new-role-description"

                                    className="mb-2 block text-sm font-medium text-brand-text"

                                >

                                    Description

                                </label>

                                <textarea

                                    id="new-role-description"

                                    aria-invalid={Boolean(addRoleErrorFields["description"]?.length)}
                                    name="description"

                                    rows="4"

                                    value={newRole.description}

                                    onChange={handleNewRoleChange}

                                    disabled={

                                        creatingRole ||

                                        createSuccess

                                    }

                                    className="w-full rounded-none border border-brand-border px-3 py-3 text-sm text-brand-text outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-surface-blue disabled:cursor-not-allowed disabled:bg-brand-surface-tint"

                                />
                                <ApiFieldError errors={addRoleErrorFields} field="description" />

                            </div>

                        </div>

                        <div className="ils-dashboard-modal-footer">

                            <DashboardButton

                                type="button"

                                onClick={closeAddRoleModal}

                                disabled={creatingRole}

                                variant="secondary"

                            >

                                {createSuccess ? 'Close' : 'Cancel'}

                            </DashboardButton>

                            {!createSuccess && (

                                <DashboardButton

                                    type="button"

                                    onClick={handleCreateRole}

                                    disabled={creatingRole}

                                    variant="primary"

                                >

                                    {creatingRole && (

                                        <RefreshCw className="h-4 w-4 animate-spin" />

                                    )}

                                    {creatingRole

                                        ? 'Creating...'

                                        : 'Create Role'}

                                </DashboardButton>

                            )}

                        </div>

                    </div>

                </div>

            )}

            {/* Permissions Modal */}

            {isPermissionsModalOpen && selectedRole && (

                <div

                    className="ils-dashboard-modal-overlay"

                    onClick={closePermissionsModal}

                >

                    <div

                        className="ils-dashboard-dialog ils-dashboard-modal-panel ils-dashboard-modal-panel--permissions flex max-h-[90vh] flex-col overflow-hidden"

                        onClick={(event) =>

                            event.stopPropagation()

                        }

                    >

                        <div className="ils-dashboard-modal-header flex items-center justify-between">

                            <div>

                                <h2 className="text-lg font-semibold text-brand-text">

                                    Role Permissions

                                </h2>

                                <p className="mt-1 text-sm text-brand-muted">

                                    Manage permissions for{' '}

                                    <span className="font-medium text-brand-text">

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

                                className="rounded-none p-2 text-brand-neutral transition hover:bg-brand-surface-muted hover:text-brand-muted disabled:cursor-not-allowed disabled:opacity-50"

                            >

                                <X className="h-5 w-5" />

                            </button>

                        </div>

                        <div className="ils-dashboard-modal-body min-h-0 flex-1 overflow-y-auto">

                            {permissionError && (

                                <div className="mb-5 rounded-none border border-brand-danger-soft bg-brand-danger-soft px-4 py-3 text-sm text-brand-danger">

                                    {permissionError}

                                </div>

                            )}

                            {/* Add Permission */}

                            <div className="rounded-none border border-brand-border bg-brand-surface-tint p-4">

                                <label

                                    htmlFor="permission-select"

                                    className="mb-2 block text-sm font-medium text-brand-text"

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

                                        className="ils-dashboard-modal-select min-w-0 flex-1"

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

                                    <DashboardButton

                                        type="button"

                                        onClick={

                                            handleGrantPermission

                                        }

                                        disabled={

                                            !selectedPermission ||

                                            grantingPermission ||

                                            permissionsLoading

                                        }

                                        variant="primary"

                                    >

                                        {grantingPermission && (

                                            <RefreshCw className="h-4 w-4 animate-spin" />

                                        )}

                                        Add

                                    </DashboardButton>

                                </div>

                            </div>

                            {/* Current Permissions */}

                            <div className="mt-6">

                                <div className="mb-3 flex items-center justify-between">

                                    <h3 className="text-sm font-semibold text-brand-text">

                                        Current Permissions

                                    </h3>

                                    <span className="rounded-none bg-brand-surface-muted px-2.5 py-1 text-xs font-medium text-brand-muted">

                                        {rolePermissions.length}

                                    </span>

                                </div>

                                {permissionsLoading ? (

                                    <div className="rounded-none border border-brand-border px-6 py-10 text-center text-sm text-brand-muted">

                                        Loading permissions...

                                    </div>

                                ) : rolePermissions.length === 0 ? (

                                    <div className="rounded-none border border-brand-border px-6 py-10 text-center text-sm text-brand-muted">

                                        This role has no permissions.

                                    </div>

                                ) : (

                                    <div className="space-y-2">

                                        {rolePermissions.map(

                                            (permission) => (

                                                <div

                                                    key={permission}

                                                    className="flex items-center justify-between rounded-none border border-brand-border bg-brand-surface px-4 py-3"

                                                >

                                                    <div className="flex min-w-0 items-center gap-3">

                                                        <ShieldCheck className="h-4 w-4 shrink-0 text-brand-muted" />

                                                        <span className="truncate text-sm text-brand-text">

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

                                                        className="ils-dashboard-permission-remove ml-4"

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

                        <div className="ils-dashboard-modal-footer">

                            <DashboardButton

                                type="button"

                                onClick={closePermissionsModal}

                                disabled={

                                    grantingPermission ||

                                    revokingPermission !== null

                                }

                                variant="secondary"

                            >

                                Close

                            </DashboardButton>

                        </div>

                    </div>

                </div>

            )}

            {roleToActivate && (

                <div

                    className="ils-dashboard-modal-overlay z-[60]"

                    onClick={() => {

                        if (!activatingRole) {

                            setRoleToActivate(null);

                        }

                    }}

                >

                    <div

                        className="ils-dashboard-dialog ils-dashboard-modal-panel ils-dashboard-modal-panel--confirm"

                        onClick={(event) => event.stopPropagation()}

                    >

                        <div className="ils-dashboard-modal-header flex items-center gap-4">

                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-none bg-brand-success-soft">

                                <ShieldCheck className="h-5 w-5 text-brand-success" />

                            </div>

                            <div>

                                <h2 className="text-lg font-semibold text-brand-text">

                                    Activate Role?

                                </h2>

                                <p className="mt-1 text-sm text-brand-muted">

                                    This will activate the role and make it available again.

                                </p>

                            </div>

                        </div>

                        <div className="px-6 py-5">

                            <div className="rounded-none border border-brand-success-soft bg-brand-success-soft px-4 py-3">

                                <p className="text-sm text-brand-success">

                                    Are you sure you want to activate

                                    <span className="mx-1 font-semibold">

                                        {roleToActivate.name}

                                    </span>

                                    ?

                                </p>

                            </div>

                        </div>

                        <div className="ils-dashboard-modal-footer">

                            <button

                                type="button"

                                onClick={() => setRoleToActivate(null)}

                                disabled={activatingRole}

                                className="rounded-none border border-brand-border px-4 py-2.5 text-sm font-medium text-brand-muted transition hover:bg-brand-surface-tint disabled:cursor-not-allowed disabled:opacity-50"

                            >

                                Cancel

                            </button>

                            <DashboardButton

                                type="button"

                                onClick={confirmActivateRole}

                                disabled={activatingRole}

                                variant="success"

                            >

                                {activatingRole && (

                                    <RefreshCw className="h-4 w-4 animate-spin" />

                                )}

                                Activate

                            </DashboardButton>

                        </div>

                    </div>

                </div>

            )}

            {roleToDeactivate && (

                <div

                    className="ils-dashboard-modal-overlay z-[60]"

                    onClick={() => {

                        if (!deactivatingRole) {

                            setRoleToDeactivate(null);

                        }

                    }}

                >

                    <div

                        className="ils-dashboard-dialog ils-dashboard-modal-panel ils-dashboard-modal-panel--confirm"

                        onClick={(event) => event.stopPropagation()}

                    >

                        <div className="ils-dashboard-modal-header flex items-center gap-4">

                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-none bg-brand-danger-soft">

                                <AlertTriangle className="h-5 w-5 text-brand-danger" />

                            </div>

                            <div>

                                <h2 className="text-lg font-semibold text-brand-text">

                                    Deactivate Role?

                                </h2>

                                <p className="mt-1 text-sm text-brand-muted">

                                    This will deactivate the role and remove it

                                    from the active roles list.

                                </p>

                            </div>

                        </div>

                        <div className="px-6 py-5">

                            <div className="rounded-none border border-brand-danger-soft bg-brand-danger-soft px-4 py-3">

                                <p className="text-sm text-brand-danger">

                                    Are you sure you want to deactivate

                                    <span className="mx-1 font-semibold">

                                        {roleToDeactivate.name}

                                    </span>

                                    ?

                                </p>

                            </div>

                        </div>

                        <div className="ils-dashboard-modal-footer">

                            <button

                                type="button"

                                onClick={() => setRoleToDeactivate(null)}

                                disabled={deactivatingRole}

                                className="rounded-none border border-brand-border px-4 py-2.5 text-sm font-medium text-brand-muted transition hover:bg-brand-surface-tint disabled:cursor-not-allowed disabled:opacity-50"

                            >

                                Cancel

                            </button>

                            <DashboardButton

                                type="button"

                                onClick={confirmDeactivateRole}

                                disabled={deactivatingRole}

                                variant="danger"

                            >

                                {deactivatingRole && (

                                    <RefreshCw className="h-4 w-4 animate-spin" />

                                )}

                                Deactivate

                            </DashboardButton>

                        </div>

                    </div>

                </div>

            )}

            {permissionToRemove && selectedRole && (

                <div

                    className="ils-dashboard-modal-overlay z-[60]"

                    onClick={() => {

                        if (revokingPermission === null) {

                            setPermissionToRemove(null);

                        }

                    }}

                >

                    <div

                        className="ils-dashboard-dialog ils-dashboard-modal-panel ils-dashboard-modal-panel--confirm"

                        onClick={(event) => event.stopPropagation()}

                    >

                        <div className="ils-dashboard-modal-header flex items-center gap-4">

                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-none bg-brand-danger-soft">

                                <AlertTriangle className="h-5 w-5 text-brand-danger" />

                            </div>

                            <div>

                                <h2 className="text-lg font-semibold text-brand-text">

                                    Remove Permission?

                                </h2>

                                <p className="mt-1 text-sm text-brand-muted">

                                    This action will remove the permission from this role.

                                </p>

                            </div>

                        </div>

                        <div className="px-6 py-5">

                            {permissionError && (

                                <div className="mb-4 rounded-none border border-brand-danger-soft bg-brand-danger-soft px-4 py-3 text-sm text-brand-danger">

                                    {permissionError}

                                </div>

                            )}

                            <div className="rounded-none border border-brand-danger-soft bg-brand-danger-soft px-4 py-3">

                                <p className="text-sm text-brand-danger">

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

                        <div className="ils-dashboard-modal-footer">

                            <button

                                type="button"

                                onClick={() => setPermissionToRemove(null)}

                                disabled={revokingPermission !== null}

                                className="rounded-none border border-brand-border px-4 py-2.5 text-sm font-medium text-brand-muted transition hover:bg-brand-surface-tint disabled:cursor-not-allowed disabled:opacity-50"

                            >

                                Cancel

                            </button>

                            <DashboardButton

                                type="button"

                                onClick={confirmRevokePermission}

                                disabled={revokingPermission !== null}

                                variant="danger"

                            >

                                {revokingPermission === permissionToRemove && (

                                    <RefreshCw className="h-4 w-4 animate-spin" />

                                )}

                                Remove

                            </DashboardButton>

                        </div>

                    </div>

                </div>

            )}

        </DashboardPage>

    );

}
