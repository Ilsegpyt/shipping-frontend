import { DashboardPage, DashboardPageHeader, DashboardButton, DashboardTableSurface, DashboardStatusBadge, DashboardActionMenu, DashboardActionItem } from '../../components/dashboard/DashboardUI';
import '../../components/dashboard/dashboard-home.css';
import ApiFieldError from '../../components/common/ApiFieldError';
import { extractApiErrorMessage, extractApiFieldErrors } from '../../utils/errorUtils.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Loader2,
    Users,
    UserCheck,
    UserX,
    MoreHorizontal,
    X,
    CheckCircle2,
    Trash2,
    UserPlus,
    ShieldCheck,
} from 'lucide-react';

import {
    getSubAccounts,
    createSubAccount,
    deleteSubAccount,
    activateSubAccount,
    deactivateSubAccount,
    updateSubAccountProfile,
    updateSubAccountEmail,
    addSubAccountScope,
    removeSubAccountScope,
    setSubAccountFullScope,
    setSubAccountCustomScope,
} from '../../services/subAccountsService';

const scopeCategories = [
    { value: 1, label: 'Sea' },
    { value: 2, label: 'Air' },
    { value: 3, label: 'Domestic' },
    { value: 4, label: 'Financial' },
];

const shipmentTypes = [
    { value: 1, label: 'All Shipments' },
    { value: 2, label: 'Import' },
    { value: 3, label: 'Export' },
];

const domesticServices = [
    { value: 2, label: 'Customs Clearance' },
    { value: 3, label: 'Transportation' },
    { value: 4, label: 'Both' },
];

export default function CustomerTeamAccess() {
    const [subAccounts, setSubAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [selectedIds, setSelectedIds] = useState([]);
    const [openMenuId, setOpenMenuId] = useState(null);

    const [memberToDelete, setMemberToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const [memberToEdit, setMemberToEdit] = useState(null);
    const [editing, setEditing] = useState(false);
    const [editError, setEditError] = useState('');
    const [editFieldErrors, setEditFieldErrors] = useState({});
    const [editForm, setEditForm] = useState({
        name: '',
        email: '',
    });

    const [memberToToggle, setMemberToToggle] = useState(null);
    const [toggling, setToggling] = useState(false);
    const [toggleError, setToggleError] = useState('');

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');
    const [createFieldErrors, setCreateFieldErrors] = useState({});
    const [createSuccess, setCreateSuccess] = useState(false);

    const [form, setForm] = useState({
        name: '',
        email: '',
        grantFullScope: true,
    });

    const [scopeForm, setScopeForm] = useState({
        category: '',
        service: '',
        type: '',
    });

    const [scopes, setScopes] = useState([]);

    // Scope management for an already-created team member.
    // The add form is independent from the current-scope list.
    const [memberForScopes, setMemberForScopes] = useState(null);
    const [scopeManagementForm, setScopeManagementForm] = useState({
        category: '1',
        service: '1',
        type: '1',
    });
    const [scopeManagementError, setScopeManagementError] = useState('');
    const [scopeManagementSuccess, setScopeManagementSuccess] = useState('');
    const [scopeManagementLoading, setScopeManagementLoading] = useState(false);
    const [showScopeAddForm, setShowScopeAddForm] = useState(false);
    const [scopeManagementMode, setScopeManagementMode] = useState('custom');
    const [pendingScopeAdds, setPendingScopeAdds] = useState([]);
    const [pendingScopeRemovals, setPendingScopeRemovals] = useState([]);

    const menuRef = useRef(null);

    useEffect(() => {
        loadSubAccounts();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target) &&
                !event.target.closest?.('[data-team-action-menu]')
            ) {
                setOpenMenuId(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener(
                'mousedown',
                handleClickOutside
            );
        };
    }, []);

    const loadSubAccounts = async () => {
        try {
            setLoading(true);
            setError('');

            const result = await getSubAccounts();

            const items = Array.isArray(result)
                ? result
                : result?.items ??
                result?.value ??
                result?.data ??
                [];

            setSubAccounts(items);
            setSelectedIds([]);
            return items;
        } catch (err) {
            console.error('Failed to load sub accounts:', err);

            setError(
                err?.response?.data?.message ??
                err?.response?.data?.detail ??
                err?.response?.data?.title ??
                'Unable to load team members.'
            );
        } finally {
            setLoading(false);
        }
    };

    const getMemberId = (member) => {
        return (
            member?.id ??
            member?.subAccountId ??
            member?.userId
        );
    };

    const getMemberName = (member) => {
        return (
            member?.name ??
            member?.fullName ??
            member?.userName ??
            '-'
        );
    };

    const getMemberEmail = (member) => {
        return member?.email ?? '-';
    };

    const getMemberStatus = (member) => {
        return String(
            member?.status ??
                member?.isActive === true
                ? 'Active'
                : member?.isActive === false
                    ? 'Inactive'
                    : 'Unknown'
        );
    };

    const isMemberActive = (member) => {
        const status = String(member?.status ?? '').toLowerCase();

        if (
            status === 'active' ||
            status === '1' ||
            status === 'true'
        ) {
            return true;
        }

        if (
            status === 'inactive' ||
            status === 'disabled' ||
            status === '0' ||
            status === 'false'
        ) {
            return false;
        }

        if (typeof member?.isActive === 'boolean') {
            return member.isActive;
        }

        return false;
    };

    const totalMembers = subAccounts.length;

    const activeMembers = useMemo(
        () =>
            subAccounts.filter((member) =>
                isMemberActive(member)
            ).length,
        [subAccounts]
    );

    const inactiveMembers = totalMembers - activeMembers;

    const allSelected =
        subAccounts.length > 0 &&
        selectedIds.length === subAccounts.length;

    const hasSelectedMembers = selectedIds.length > 0;

    const getInitials = (name) => {
        if (!name || name === '-') return '?';

        return name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join('');
    };

    const handleSelectAll = (event) => {
        if (event.target.checked) {
            setSelectedIds(
                subAccounts
                    .map((member) => getMemberId(member))
                    .filter(Boolean)
            );
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectMember = (memberId) => {
        setSelectedIds((previous) => {
            if (previous.includes(memberId)) {
                return previous.filter((id) => id !== memberId);
            }

            return [...previous, memberId];
        });
    };

    const resetCreateForm = () => {
        setForm({
            name: '',
            email: '',
            grantFullScope: true,
        });

        setScopeForm({
            category: '',
            service: '',
            type: '',
        });

        setScopes([]);
        setCreateError('');
        setCreateFieldErrors({});
        setCreateSuccess(false);
    };

    const openCreateModal = () => {
        resetCreateForm();
        setIsCreateModalOpen(true);
    };

    const closeCreateModal = () => {
        if (creating) return;

        setIsCreateModalOpen(false);
        resetCreateForm();
    };

    const handleFormChange = (event) => {
        const { name, value } = event.target;
        setCreateFieldErrors(previous => ({ ...previous, [name.toLowerCase()]: undefined }));

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const handleAccessTypeChange = (grantFullScope) => {
        setForm((previous) => ({
            ...previous,
            grantFullScope,
        }));

        if (grantFullScope) {
            setScopes([]);

            setScopeForm({
                category: '',
                service: '',
                type: '',
            });
        }
    };

    const handleCategoryChange = (event) => {
        const category = event.target.value;

        setScopeForm({
            category,
            service:
                category === '1' || category === '2'
                    ? '1'
                    : category === '4'
                        ? '0'
                        : '',
            type: category === '4' ? '0' : '',
        });
    };

    const addScope = () => {
        if (
            !scopeForm.category ||
            !scopeForm.service ||
            !scopeForm.type
        ) {
            setCreateError('Please complete the scope selection.');
            return;
        }

        const newScope = {
            category: Number(scopeForm.category),
            service: Number(scopeForm.service),
            type: Number(scopeForm.type),
        };

        const alreadyExists = scopes.some(
            (scope) =>
                scope.category === newScope.category &&
                scope.service === newScope.service &&
                scope.type === newScope.type
        );

        if (alreadyExists) {
            setCreateError('This scope has already been added.');
            return;
        }

        setScopes((previous) => [...previous, newScope]);

        setScopeForm({
            category: '',
            service: '',
            type: '',
        });

        setCreateError('');

        setCreateFieldErrors({});
    };

    const removeScope = (indexToRemove) => {
        setScopes((previous) =>
            previous.filter((_, index) => index !== indexToRemove)
        );
    };

    const getCategoryLabel = (category) => {
        return (
            scopeCategories.find(
                (item) => item.value === category
            )?.label ?? category
        );
    };

    const getServiceLabel = (service) => {
        if (service === 1) return 'Freight';
        if (service === 2) return 'Customs Clearance';
        if (service === 3) return 'Transportation';
        if (service === 4) return 'Both';

        return 'None';
    };

    const getShipmentTypeLabel = (type) => {
        if (type === 1) return 'All Shipments';
        if (type === 2) return 'Import';
        if (type === 3) return 'Export';

        return 'None';
    };

    const handleCreateMember = async (event) => {
        event.preventDefault();

        setCreateError('');

        setCreateFieldErrors({});

        if (!form.name.trim()) {
            setCreateError('Please enter the member name.');
            return;
        }

        if (!form.email.trim()) {
            setCreateError('Please enter the member email.');
            return;
        }

        if (!form.grantFullScope && scopes.length === 0) {
            setCreateError(
                'Please add at least one scope for Custom Access.'
            );
            return;
        }

        const payload = {
            name: form.name.trim(),
            email: form.email.trim(),
            grantFullScope: form.grantFullScope,
            scopes: form.grantFullScope ? [] : scopes,
        };

        try {
            setCreating(true);

            await createSubAccount(payload);

            setCreateSuccess(true);

            await loadSubAccounts();
        } catch (err) {
            console.error('Failed to create sub account:', err);

            setCreateFieldErrors(extractApiFieldErrors(err));

            setCreateError(extractApiErrorMessage(err, 'Unable to save team member.'));
        } finally {
            setCreating(false);
        }
    };

    const openScopeManagement = (member) => {
        setOpenMenuId(null);
        setMemberForScopes(member);
        setScopeManagementError('');
        setScopeManagementSuccess('');
        setScopeManagementForm({ category: '', service: '', type: '' });
        setShowScopeAddForm(false);
        setScopeManagementMode(isMemberFullScope(member) ? 'full' : 'custom');
        setPendingScopeAdds([]);
        setPendingScopeRemovals([]);
    };

    const closeScopeManagement = () => {
        if (scopeManagementLoading) return;
        setMemberForScopes(null);
        setScopeManagementError('');
        setScopeManagementSuccess('');
        setPendingScopeAdds([]);
        setPendingScopeRemovals([]);
        setShowScopeAddForm(false);
    };

    const getApiErrorMessage = (err, fallback) => extractApiErrorMessage(err, fallback);

    // Current API response has ScopeDescriptions (strings). Removal requires the
    // original numeric Category/Service/Type tuple, so use structured scopes when
    // the API supplies them and never guess values by parsing display text.
    const getStructuredMemberScopes = (member) => {
        if (Array.isArray(member?.scopes)) return member.scopes;
        if (Array.isArray(member?.Scopes)) return member.Scopes;
        if (Array.isArray(member?.scopeItems)) return member.scopeItems;
        if (Array.isArray(member?.scopeDetails)) return member.scopeDetails;
        return [];
    };

    // The API may serialize enums as numbers or names depending on JSON configuration.
    // Normalize both forms so the Remove action remains available for real custom scopes.
    const normalizeScopeEnum = (value, names) => {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed !== '' && Number.isFinite(Number(trimmed))) return Number(trimmed);
            const match = Object.entries(names).find(([, name]) => name.toLowerCase() === trimmed.toLowerCase());
            if (match) return Number(match[0]);
        }
        return Number.NaN;
    };

    const getScopeTuple = (scope) => ({
        category: normalizeScopeEnum(scope?.category ?? scope?.Category, {
            1: 'Sea', 2: 'Air', 3: 'Domestic', 4: 'Financial',
        }),
        service: normalizeScopeEnum(scope?.service ?? scope?.Service, {
            0: 'None', 1: 'Freight', 2: 'CustomsClearance', 3: 'Transportation', 4: 'Both',
        }),
        type: normalizeScopeEnum(scope?.type ?? scope?.Type, {
            0: 'None', 1: 'All', 2: 'Import', 3: 'Export',
        }),
    });

    const getScopeKey = (scope) => {
        const tuple = getScopeTuple(scope);
        if (!Number.isFinite(tuple.category) || !Number.isFinite(tuple.service) || !Number.isFinite(tuple.type)) return '';
        return `${tuple.category}:${tuple.service}:${tuple.type}`;
    };

    const isMemberFullScope = (member) => {
        const scopeType = member?.scopeType ?? member?.ScopeType;
        if (String(scopeType ?? '').toLowerCase() === 'full') return true;

        const descriptions = member?.scopeDescriptions ?? member?.ScopeDescriptions;
        return Array.isArray(descriptions) && descriptions.some((description) =>
            String(description).toLowerCase().includes('all categories - all services - all types')
        );
    };

    const getMemberScopeDescriptions = (member) => {
        if (Array.isArray(member?.scopeDescriptions)) return member.scopeDescriptions;
        if (Array.isArray(member?.ScopeDescriptions)) return member.ScopeDescriptions;

        const structuredScopes = getStructuredMemberScopes(member);
        return structuredScopes.map((scope) =>
            scope?.description ??
            scope?.Description ??
            `${getCategoryLabel(Number(scope?.category ?? scope?.Category))} · ${getServiceLabel(Number(scope?.service ?? scope?.Service))} · ${getShipmentTypeLabel(Number(scope?.type ?? scope?.Type))}`
        );
    };

    const handleScopeManagementCategoryChange = (event) => {
        const category = event.target.value;
        setScopeManagementForm({
            category,
            service: category === '1' || category === '2' ? '1' : category === '4' ? '0' : '',
            type: category === '4' ? '0' : '',
        });
    };

    const handleAddMemberScope = (event) => {
        event.preventDefault();
        const { category, service, type } = scopeManagementForm;
        if (category === '' || service === '' || type === '') {
            setScopeManagementError('Please complete the scope selection.');
            return;
        }

        const newScope = {
            category: Number(category),
            service: Number(service),
            type: Number(type),
        };
        const newKey = getScopeKey(newScope);
        const existingStructuredScopes = getStructuredMemberScopes(memberForScopes);
        const alreadyExists = existingStructuredScopes.some((scope) => {
            const key = getScopeKey(scope);
            return key === newKey && !pendingScopeRemovals.includes(key);
        }) || pendingScopeAdds.some((scope) => getScopeKey(scope) === newKey);

        if (alreadyExists) {
            setScopeManagementError('This scope already exists for this member.');
            return;
        }

        setPendingScopeAdds((previous) => [...previous, newScope]);
        setScopeManagementForm({ category: '', service: '', type: '' });
        setScopeManagementError('');
        setScopeManagementSuccess('Scope added to pending changes. Click Save to apply it.');
    };

    const handleRemoveMemberScope = (scope) => {
        const key = getScopeKey(scope);
        if (!key) {
            setScopeManagementError('The API must return Category, Service, and Type for each scope before it can be removed safely.');
            return;
        }

        if (pendingScopeAdds.some((item) => getScopeKey(item) === key)) {
            setPendingScopeAdds((previous) => previous.filter((item) => getScopeKey(item) !== key));
        } else {
            setPendingScopeRemovals((previous) => previous.includes(key) ? previous : [...previous, key]);
        }
        setScopeManagementError('');
        setScopeManagementSuccess('Scope change staged. Click Save to apply it.');
    };

    const handleSetMemberFullScope = () => {
        setScopeManagementMode('full');
        setShowScopeAddForm(false);
        setScopeManagementError('');
        setScopeManagementSuccess('Full Scope selected. Click Save to apply this change.');
    };

    const handleSetMemberCustomScope = () => {
        setScopeManagementMode('custom');
        setScopeManagementForm({ category: '', service: '', type: '' });
        setShowScopeAddForm(true);
        setScopeManagementError('');
        setScopeManagementSuccess('Custom Scope selected. Add or remove scopes as needed, then click Save.');
    };

    const handleSaveScopeManagement = async () => {
        const memberId = getMemberId(memberForScopes);
        if (!memberId) {
            setScopeManagementError('Unable to identify this team member.');
            return;
        }

        try {
            setScopeManagementLoading(true);
            setScopeManagementError('');
            setScopeManagementSuccess('');

            if (scopeManagementMode === 'full') {
                await setSubAccountFullScope(memberId);
            } else {
                await setSubAccountCustomScope(memberId);
                const existingScopesByKey = new Map(
                    getStructuredMemberScopes(memberForScopes).map((scope) => [getScopeKey(scope), scope])
                );
                for (const key of pendingScopeRemovals) {
                    if (existingScopesByKey.has(key)) {
                        const tuple = getScopeTuple(existingScopesByKey.get(key));
                        await removeSubAccountScope(memberId, tuple);
                    }
                }
                for (const scope of pendingScopeAdds) {
                    await addSubAccountScope(memberId, scope);
                }
            }

            const refreshedItems = await loadSubAccounts();
            const refreshedMember = Array.isArray(refreshedItems)
                ? refreshedItems.find((item) => String(getMemberId(item)) === String(memberId))
                : null;
            if (refreshedMember) setMemberForScopes(refreshedMember);
            setPendingScopeAdds([]);
            setPendingScopeRemovals([]);
            setShowScopeAddForm(false);
            setScopeManagementSuccess('Scope changes saved successfully.');
        } catch (err) {
            console.error('Failed to save subaccount scope changes:', err);
            setScopeManagementError(getApiErrorMessage(err, 'Unable to save scope changes. Some changes may have been applied; please refresh and review the current scopes.'));
        } finally {
            setScopeManagementLoading(false);
        }
    };

    const openDeleteModal = (member) => {
        setOpenMenuId(null);
        setMemberToDelete(member);
        setDeleteError('');
    };

    const openBulkDeleteModal = () => {
        if (!hasSelectedMembers) return;

        setMemberToDelete({
            isBulk: true,
            members: subAccounts.filter((member) =>
                selectedIds.includes(getMemberId(member))
            ),
        });

        setDeleteError('');
    };

    const closeDeleteModal = () => {
        if (deleting) return;

        setMemberToDelete(null);
        setDeleteError('');
    };

    const handleDeleteMember = async () => {
        const membersToDelete = memberToDelete?.isBulk
            ? memberToDelete.members
            : [memberToDelete];

        const memberIds = membersToDelete
            .map((member) => getMemberId(member))
            .filter(Boolean);

        if (memberIds.length === 0) {
            setDeleteError('Unable to identify the selected member.');
            return;
        }

        try {
            setDeleting(true);
            setDeleteError('');

            for (const memberId of memberIds) {
                await deleteSubAccount(memberId);
            }

            await loadSubAccounts();
            setMemberToDelete(null);
        } catch (err) {
            console.error('Failed to delete sub account:', err);

            setDeleteError(
                err?.response?.data?.message ??
                err?.response?.data?.detail ??
                err?.response?.data?.title ??
                'Unable to delete team member.'
            );
        } finally {
            setDeleting(false);
        }
    };

    const openEditModal = (member) => {
        setOpenMenuId(null);
        setMemberToEdit(member);
        setEditError('');
        setEditFieldErrors({});

        setEditForm({
            name: getMemberName(member) === '-' ? '' : getMemberName(member),
            email:
                getMemberEmail(member) === '-'
                    ? ''
                    : getMemberEmail(member),
        });
    };

    const closeEditModal = () => {
        if (editing) return;

        setMemberToEdit(null);
        setEditError('');
        setEditFieldErrors({});
    };

    const handleEditFormChange = (event) => {
        const { name, value } = event.target;
        setEditFieldErrors(previous => ({ ...previous, [name.toLowerCase()]: undefined }));

        setEditForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const handleUpdateMember = async (event) => {
        event.preventDefault();

        const memberId = getMemberId(memberToEdit);

        if (!memberId) {
            setEditError('Unable to identify this team member.');
            return;
        }

        const name = editForm.name.trim();
        const email = editForm.email.trim();

        if (!name) {
            setEditError('Please enter the member name.');
            return;
        }

        if (!email) {
            setEditError('Please enter the member email.');
            return;
        }

        try {
            setEditing(true);
            setEditError('');
            setEditFieldErrors({});

            await updateSubAccountProfile(memberId, name);

            const currentEmail = String(
                getMemberEmail(memberToEdit)
            ).trim();

            if (email.toLowerCase() !== currentEmail.toLowerCase()) {
                await updateSubAccountEmail(memberId, email);
            }

            await loadSubAccounts();
            closeEditModal();
        } catch (err) {
            console.error('Failed to update sub account:', err);

            setEditFieldErrors(extractApiFieldErrors(err));

            setEditError(extractApiErrorMessage(err, 'Unable to save team member.'));
        } finally {
            setEditing(false);
        }
    };

    const openToggleModal = (member) => {
        setOpenMenuId(null);
        setMemberToToggle(member);
        setToggleError('');
    };

    const closeToggleModal = () => {
        if (toggling) return;

        setMemberToToggle(null);
        setToggleError('');
    };

    const handleToggleMember = async () => {
        const memberId = getMemberId(memberToToggle);

        if (!memberId) {
            setToggleError('Unable to identify this team member.');
            return;
        }

        try {
            setToggling(true);
            setToggleError('');

            if (isMemberActive(memberToToggle)) {
                await deactivateSubAccount(memberId);
            } else {
                await activateSubAccount(memberId);
            }

            await loadSubAccounts();
            setMemberToToggle(null);
        } catch (err) {
            console.error('Failed to toggle sub account:', err);

            setToggleError(
                err?.response?.data?.message ??
                err?.response?.data?.detail ??
                err?.response?.data?.title ??
                'Unable to update member status.'
            );
        } finally {
            setToggling(false);
        }
    };

    return (
        <DashboardPage>
            <DashboardPageHeader title="Team Access" description="Manage the users who can access your company account."
                actions={<DashboardButton variant="primary" icon={UserPlus} onClick={openCreateModal}>Add Member</DashboardButton>} />

            <div className="ils-main-overview">
                {[
                    { label: 'Total Members', value: totalMembers, Icon: Users },
                    { label: 'Active Members', value: activeMembers, Icon: UserCheck },
                    { label: 'Inactive Members', value: inactiveMembers, Icon: UserX },
                ].map(({ label, value, Icon }) => (
                    <div className="ils-main-stat" key={label}>
                        <div className="ils-main-stat-heading">
                            <h3>{label}</h3>
                            <span className="ils-main-stat-icon"><Icon size={20} aria-hidden="true" /></span>
                        </div>
                        <p className="ils-main-stat-value">{loading ? '-' : value}</p>
                    </div>
                ))}
            </div>

            {/* Members Table */}
            <DashboardTableSurface>
                <div className="flex flex-col justify-between gap-4 border-b border-brand-border px-6 py-5 lg:flex-row lg:items-center">
                    <div>
                        <h2 className="text-base font-semibold text-brand-text">
                            Team Members
                        </h2>

                        <p className="mt-1 text-sm text-brand-muted">
                            View and manage the accounts connected to your
                            company.
                        </p>
                    </div>

                    {hasSelectedMembers && (
                        <DashboardButton
                            type="button"
                            onClick={openBulkDeleteModal}
                            variant="danger"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Selected ({selectedIds.length})
                        </DashboardButton>
                    )}
                </div>

                <div className="px-6 py-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-7 w-7 animate-spin text-brand-text" />
                        </div>
                    ) : error ? (
                        <div className="border border-brand-danger-border bg-brand-danger-soft p-4 text-sm text-brand-danger">
                            {error}
                        </div>
                    ) : subAccounts.length === 0 ? (
                        <div className="py-16 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center bg-brand-surface-muted text-brand-muted">
                                <Users className="h-7 w-7" />
                            </div>

                            <h3 className="mt-4 text-base font-semibold text-brand-text">
                                No team members yet
                            </h3>

                            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-brand-muted">
                                Add your first team member to give them access
                                to your company account.
                            </p>

                            <DashboardButton
                                type="button"
                                onClick={openCreateModal}
                                variant="primary" className="mt-5"
                            >
                                <UserPlus className="mr-2 h-4 w-4" />
                                Add Your First Member
                            </DashboardButton>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left">
                                <thead>
                                    <tr className="border-b border-brand-border">
                                        <th className="w-12 px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={allSelected}
                                                onChange={handleSelectAll}
                                                className="h-4 w-4 ils-dashboard-checkbox"
                                                aria-label="Select all members"
                                            />
                                        </th>

                                        <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-muted">
                                            Member
                                        </th>

                                        <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-muted">
                                            Email
                                        </th>

                                        <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-muted">
                                            Status
                                        </th>

                                        <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-brand-muted">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {subAccounts.map((member) => {
                                        const memberId = getMemberId(member);
                                        const memberName = getMemberName(member);
                                        const memberEmail = getMemberEmail(member);
                                        const memberStatus = isMemberActive(member)
                                            ? 'Active'
                                            : 'Inactive';

                                        return (
                                            <tr
                                                key={memberId ?? memberEmail}
                                                className={`border-b border-brand-border ${selectedIds.includes(memberId) ? 'ils-dashboard-row-selected' : ''}`}
                                            >
                                                <td className="px-4 py-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(
                                                            memberId
                                                        )}
                                                        onChange={() =>
                                                            handleSelectMember(
                                                                memberId
                                                            )
                                                        }
                                                        className="h-4 w-4 ils-dashboard-checkbox"
                                                        aria-label={`Select ${memberName}`}
                                                    />
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 items-center justify-center bg-brand-surface-muted text-sm font-semibold text-brand-text">
                                                            {getInitials(
                                                                memberName
                                                            )}
                                                        </div>

                                                        <div>
                                                            <p className="font-medium text-brand-text">
                                                                {memberName}
                                                            </p>

                                                            <p className="mt-0.5 text-xs text-brand-muted">
                                                                Team member
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-4 text-sm text-brand-muted">
                                                    {memberEmail}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-4">
                                                    <DashboardStatusBadge tone={isMemberActive(member) ? 'positive' : 'neutral'}>{memberStatus}</DashboardStatusBadge>
                                                </td>

                                                <td className="relative whitespace-nowrap px-4 py-4 text-right">
                                                    <div
                                                        className="relative inline-block"
                                                        ref={
                                                            openMenuId ===
                                                                memberId
                                                                ? menuRef
                                                                : null
                                                        }
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setOpenMenuId(
                                                                    openMenuId ===
                                                                        memberId
                                                                        ? null
                                                                        : memberId
                                                                )
                                                            }
                                                            id={`team-actions-${memberId ?? memberEmail}`} className="ils-dashboard-action-trigger" aria-expanded={openMenuId === memberId}
                                                            aria-label={`Actions for ${memberName}`}
                                                        >
                                                            <MoreHorizontal className="h-5 w-5" />
                                                        </button>

                                                        {openMenuId ===
                                                            memberId && (
                                                                <DashboardActionMenu anchorId={`team-actions-${memberId ?? memberEmail}`}>
                                                                    <div data-team-action-menu>
                                                                        <DashboardActionItem action={isMemberActive(member) ? 'deactivate' : 'activate'} onClick={() => openToggleModal(member)} />
                                                                        <button type="button" role="menuitem" className="ils-dashboard-action-item ils-dashboard-action-item--neutral" onClick={() => openScopeManagement(member)}>
                                                                            <ShieldCheck className="h-4 w-4" aria-hidden="true" /> <span>Manage Scopes</span>
                                                                        </button>
                                                                        <DashboardActionItem action="edit" onClick={() => openEditModal(member)} />
                                                                        <div className="ils-dashboard-action-separator" />
                                                                        <DashboardActionItem action="delete" onClick={() => openDeleteModal(member)} />
                                                                    </div>
                                                                </DashboardActionMenu>
                                                            )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </DashboardTableSurface>

            {/* Scope Management Modal - existing scopes, add, and remove are independent */}
            {memberForScopes && (
                <div className="ils-dashboard-modal-overlay">
                    <div className="ils-dashboard-modal-panel ils-dashboard-modal-panel--permissions">
                        <div className="ils-dashboard-modal-header flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-semibold text-brand-text">Manage Scopes</h2>
                                <p className="mt-1 text-sm text-brand-muted">
                                    Manage access for {getMemberName(memberForScopes)}.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeScopeManagement}
                                disabled={scopeManagementLoading}
                                className="ils-dashboard-action-trigger disabled:opacity-50"
                                aria-label="Close scope management"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-5 px-6 py-6">
                            <div className="border border-brand-border p-4">
                                <h3 className="text-sm font-semibold text-brand-text">Access mode</h3>
                                <p className="mt-1 text-xs text-brand-muted">
                                    Choose an access mode, make any scope changes, then press Save. Nothing is applied until you save.
                                </p>
                                <div className="mt-4 flex flex-wrap gap-3">
                                    <DashboardButton
                                        type="button"
                                        onClick={handleSetMemberFullScope}
                                        disabled={scopeManagementLoading}
                                        variant={scopeManagementMode === 'full' ? 'primary' : 'secondary'}
                                    >
                                        {scopeManagementLoading ? 'Saving...' : 'Set Full Scope'}
                                    </DashboardButton>
                                    <DashboardButton
                                        type="button"
                                        onClick={handleSetMemberCustomScope}
                                        disabled={scopeManagementLoading}
                                        variant={scopeManagementMode === 'custom' ? 'primary' : 'secondary'}
                                    >
                                        {scopeManagementLoading ? 'Saving...' : 'Set Custom Scope'}
                                    </DashboardButton>
                                </div>
                            </div>

                            <div className="space-y-3 border border-brand-border p-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-brand-text">Current scopes</h3>
                                    <p className="mt-1 text-xs text-brand-muted">
                                        These are the scopes returned by the API for this member.
                                    </p>
                                </div>

                                {(() => {
                                    const structuredScopes = getStructuredMemberScopes(memberForScopes);
                                    const descriptions = getMemberScopeDescriptions(memberForScopes);
                                    const existingRows = descriptions.map((description, index) => ({
                                        description,
                                        scope: structuredScopes[index],
                                        pending: false,
                                    }));
                                    const addedRows = pendingScopeAdds.map((scope) => ({
                                        description: `${getCategoryLabel(getScopeTuple(scope).category)} · ${getServiceLabel(getScopeTuple(scope).service)} · ${getShipmentTypeLabel(getScopeTuple(scope).type)}`,
                                        scope,
                                        pending: true,
                                    }));
                                    const rows = [...existingRows, ...addedRows];
                                    return rows.length === 0 ? (
                                        <div className="bg-brand-surface-tint px-4 py-6 text-center text-sm text-brand-muted">
                                            No custom scopes are currently configured.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {rows.map(({ description, scope: structuredScope, pending }, index) => {
                                                const tuple = structuredScope ? getScopeTuple(structuredScope) : null;
                                                const canRemove = Boolean(tuple) &&
                                                    Number.isFinite(tuple.category) &&
                                                    Number.isFinite(tuple.service) &&
                                                    Number.isFinite(tuple.type) &&
                                                    scopeManagementMode !== 'full';

                                                return (
                                                    <div
                                                        key={`${getScopeKey(structuredScope || {}) || String(description)}-${index}`}
                                                        className="flex flex-col gap-3 border border-brand-border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                                                    >
                                                        <span className={`text-sm ${pendingScopeRemovals.includes(getScopeKey(structuredScope || {})) ? 'text-brand-muted line-through' : 'text-brand-text'}`}>
                                                            {String(description)}
                                                            {pending && <span className="ml-2 text-xs font-medium text-brand-primary">(unsaved)</span>}
                                                            {pendingScopeRemovals.includes(getScopeKey(structuredScope || {})) && <span className="ml-2 text-xs font-medium text-brand-danger">(will be removed)</span>}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const key = getScopeKey(structuredScope || {});
                                                                if (pendingScopeRemovals.includes(key)) {
                                                                    setPendingScopeRemovals((previous) => previous.filter((item) => item !== key));
                                                                    setScopeManagementSuccess('Scope removal cancelled. Click Save to apply remaining changes.');
                                                                } else {
                                                                    handleRemoveMemberScope(structuredScope);
                                                                }
                                                            }}
                                                            disabled={scopeManagementLoading || !canRemove}
                                                            title={!canRemove ? 'The API must return Category, Service, and Type to remove this scope safely.' : 'Remove this scope'}
                                                            className="ils-dashboard-permission-remove"
                                                        >
                                                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                                            {pendingScopeRemovals.includes(getScopeKey(structuredScope || {})) ? 'Undo Remove' : pending ? 'Remove' : 'Remove'}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}


                            </div>

                            {showScopeAddForm && (
                                <form onSubmit={handleAddMemberScope} className="space-y-4 border border-brand-accent bg-brand-surface-blue p-4">
                                    <div>
                                        <h3 className="text-sm font-semibold text-brand-text">Add scope</h3>
                                        <p className="mt-1 text-xs text-brand-muted">
                                            Choose a new scope. This form is separate from the current scopes list.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                        <div>
                                            <label htmlFor="manage-scope-category" className="mb-2 block text-xs font-medium text-brand-muted">Category</label>
                                            <select
                                                id="manage-scope-category"
                                                value={scopeManagementForm.category}
                                                onChange={handleScopeManagementCategoryChange}
                                                disabled={scopeManagementLoading}
                                                className="ils-dashboard-field"
                                            >
                                                <option value="">Select category</option>
                                                {scopeCategories.map((item) => (
                                                    <option key={item.value} value={item.value}>{item.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="manage-scope-service" className="mb-2 block text-xs font-medium text-brand-muted">Service</label>
                                            <select
                                                id="manage-scope-service"
                                                value={scopeManagementForm.service}
                                                onChange={(event) => setScopeManagementForm((previous) => ({ ...previous, service: event.target.value }))}
                                                disabled={scopeManagementLoading || !scopeManagementForm.category || scopeManagementForm.category === '4'}
                                                className="ils-dashboard-field"
                                            >
                                                <option value="">Select service</option>
                                                {(scopeManagementForm.category === '1' || scopeManagementForm.category === '2') && <option value="1">Freight</option>}
                                                {scopeManagementForm.category === '3' && domesticServices.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                                                {scopeManagementForm.category === '4' && <option value="0">None</option>}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="manage-scope-type" className="mb-2 block text-xs font-medium text-brand-muted">Shipment type</label>
                                            <select
                                                id="manage-scope-type"
                                                value={scopeManagementForm.type}
                                                onChange={(event) => setScopeManagementForm((previous) => ({ ...previous, type: event.target.value }))}
                                                disabled={scopeManagementLoading || !scopeManagementForm.category || scopeManagementForm.category === '4'}
                                                className="ils-dashboard-field"
                                            >
                                                <option value="">Select shipment type</option>
                                                {shipmentTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                                                {scopeManagementForm.category === '4' && <option value="0">None</option>}
                                            </select>
                                        </div>
                                    </div>
                                    <DashboardButton
                                        type="submit"
                                        disabled={scopeManagementLoading}
                                        variant="primary"
                                    >
                                        {scopeManagementLoading ? 'Saving...' : 'Add Scope'}
                                    </DashboardButton>
                                </form>
                            )}

                            {scopeManagementError && (
                                <div role="alert" className="border border-brand-danger-border bg-brand-danger-soft p-3 text-sm text-brand-danger">
                                    {scopeManagementError}
                                </div>
                            )}
                            {scopeManagementSuccess && (
                                <div role="status" className="border border-brand-success-border bg-brand-success-soft p-3 text-sm text-brand-success">
                                    {scopeManagementSuccess}
                                </div>
                            )}
                            <div className="flex flex-wrap justify-end gap-3">
                                <DashboardButton
                                    type="button"
                                    onClick={handleSaveScopeManagement}
                                    disabled={
                                        scopeManagementLoading ||
                                        (
                                            scopeManagementMode === 'custom' &&
                                            pendingScopeAdds.length === 0 &&
                                            pendingScopeRemovals.length === 0
                                        )
                                    }
                                    variant="primary"
                                >
                                    {scopeManagementLoading ? 'Saving...' : 'Save'}
                                </DashboardButton>
                                <DashboardButton
                                    type="button"
                                    onClick={closeScopeManagement}
                                    disabled={scopeManagementLoading}
                                    variant="secondary"
                                >
                                    Close
                                </DashboardButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {memberToDelete && (
                <div className="ils-dashboard-modal-overlay">
                    <div className="ils-dashboard-modal-panel ils-dashboard-modal-panel--confirm">
                        <div className="ils-dashboard-modal-header">
                            <h2 className="text-xl font-semibold text-brand-text">
                                Delete Team Member
                            </h2>

                            <p className="mt-1 text-sm text-brand-muted">
                                This action cannot be undone.
                            </p>
                        </div>

                        <div className="px-6 py-6">
                            <p className="text-sm leading-6 text-brand-muted">
                                {memberToDelete.isBulk ? (
                                    <>
                                        Are you sure you want to delete{' '}
                                        <span className="font-semibold text-brand-text">
                                            {memberToDelete.members.length}{' '}
                                            selected members
                                        </span>
                                        ?
                                    </>
                                ) : (
                                    <>
                                        Are you sure you want to delete{' '}
                                        <span className="font-semibold text-brand-text">
                                            {getMemberName(memberToDelete)}
                                        </span>
                                        ?
                                    </>
                                )}
                            </p>

                            {deleteError && (
                                <div className="mt-4 border border-brand-danger-border bg-brand-danger-soft p-4 text-sm text-brand-danger">
                                    {deleteError}
                                </div>
                            )}

                            <div className="mt-6 flex flex-wrap justify-end gap-3">
                                <DashboardButton
                                    type="button"
                                    onClick={closeDeleteModal}
                                    disabled={deleting}
                                    variant="secondary"
                                >
                                    Cancel
                                </DashboardButton>

                                <DashboardButton
                                    type="button"
                                    onClick={handleDeleteMember}
                                    disabled={deleting}
                                    variant="danger"
                                >
                                    {deleting && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}

                                    {deleting
                                        ? 'Deleting...'
                                        : 'Delete Member'}
                                </DashboardButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Activate / Deactivate Modal */}
            {memberToToggle && (
                <div className="ils-dashboard-modal-overlay">
                    <div className="ils-dashboard-modal-panel ils-dashboard-modal-panel--confirm">
                        <div className="ils-dashboard-modal-header">
                            <h2 className="text-xl font-semibold text-brand-text">
                                {isMemberActive(memberToToggle)
                                    ? 'Deactivate Team Member'
                                    : 'Activate Team Member'}
                            </h2>

                            <p className="mt-1 text-sm text-brand-muted">
                                You can change this status later.
                            </p>
                        </div>

                        <div className="px-6 py-6">
                            <p className="text-sm leading-6 text-brand-muted">
                                Are you sure you want to{' '}
                                {isMemberActive(memberToToggle)
                                    ? 'deactivate'
                                    : 'activate'}{' '}
                                <span className="font-semibold text-brand-text">
                                    {getMemberName(memberToToggle)}
                                </span>
                                ?
                            </p>

                            {toggleError && (
                                <div className="mt-4 border border-brand-danger-border bg-brand-danger-soft p-4 text-sm text-brand-danger">
                                    {toggleError}
                                </div>
                            )}

                            <div className="mt-6 flex flex-wrap justify-end gap-3">
                                <DashboardButton
                                    type="button"
                                    onClick={closeToggleModal}
                                    disabled={toggling}
                                    variant="secondary"
                                >
                                    Cancel
                                </DashboardButton>

                                <DashboardButton
                                    type="button"
                                    onClick={handleToggleMember}
                                    disabled={toggling}
                                    variant="primary"
                                >
                                    {toggling && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}

                                    {toggling
                                        ? 'Saving...'
                                        : isMemberActive(memberToToggle)
                                            ? 'Deactivate'
                                            : 'Activate'}
                                </DashboardButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Member Modal */}
            {memberToEdit && (
                <div className="ils-dashboard-modal-overlay">
                    <div className="ils-dashboard-modal-panel ils-dashboard-modal-panel--form">
                        <div className="ils-dashboard-modal-header flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-semibold text-brand-text">
                                    Edit Team Member
                                </h2>

                                <p className="mt-1 text-sm text-brand-muted">
                                    Update the member profile information.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeEditModal}
                                disabled={editing}
                                className="ils-dashboard-action-trigger"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form
                            onSubmit={handleUpdateMember}
                            className="space-y-5 px-6 py-6"
                        >
                            {editError && (
                                <div className="border border-brand-danger-border bg-brand-danger-soft p-4 text-sm text-brand-danger">
                                    {editError}
                                </div>
                            )}

                            <div>
                                <label
                                    htmlFor="edit-name"
                                    className="mb-2 block text-sm font-medium text-brand-text"
                                >
                                    Full Name
                                </label>

                                <input
                                    id="edit-name"
                                    name="name"
                                    type="text"
                                    value={editForm.name}
                                    onChange={handleEditFormChange}
                                    disabled={editing}
                                    className="ils-dashboard-field"
                                 autoComplete="name" />
<ApiFieldError errors={editFieldErrors} field="name" />
                            </div>

                            <div>
                                <label
                                    htmlFor="edit-email"
                                    className="mb-2 block text-sm font-medium text-brand-text"
                                >
                                    Email Address
                                </label>

                                <input
                                    id="edit-email"
                                    name="email"
                                    type="email"
                                    value={editForm.email}
                                    onChange={handleEditFormChange}
                                    disabled={editing}
                                    className="ils-dashboard-field"
                                 autoComplete="email" />
<ApiFieldError errors={editFieldErrors} field="email" />
                            </div>

                            <div className="ils-dashboard-modal-footer">
                                <DashboardButton
                                    type="button"
                                    onClick={closeEditModal}
                                    disabled={editing}
                                    variant="secondary"
                                >
                                    Cancel
                                </DashboardButton>

                                <DashboardButton
                                    type="submit"
                                    disabled={editing}
                                    variant="primary"
                                >
                                    {editing && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}

                                    {editing ? 'Saving...' : 'Save Changes'}
                                </DashboardButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Member Modal */}
            {isCreateModalOpen && (
                <div className="ils-dashboard-modal-overlay">
                    <div className="ils-dashboard-modal-panel ils-dashboard-modal-panel--permissions">
                        <div className="ils-dashboard-modal-header flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-semibold text-brand-text">
                                    Add Team Member
                                </h2>

                                <p className="mt-1 text-sm text-brand-muted">
                                    Create a new account for your company.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeCreateModal}
                                disabled={creating}
                                className="ils-dashboard-action-trigger"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {createSuccess ? (
                            <div className="px-6 py-8">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center bg-brand-success-soft text-brand-success">
                                    <CheckCircle2 className="h-8 w-8" />
                                </div>

                                <h3 className="mt-4 text-center text-lg font-semibold text-brand-text">
                                    Member Created Successfully
                                </h3>

                                <p className="mt-2 text-center text-sm text-brand-muted">
                                    The account has been created successfully.
                                </p>

                                <DashboardButton
                                    type="button"
                                    onClick={closeCreateModal}
                                    variant="primary" className="mt-6 w-full"
                                >
                                    Done
                                </DashboardButton>
                            </div>
                        ) : (
                            <form
                                onSubmit={handleCreateMember}
                                className="space-y-6 px-6 py-6"
                            >
                                {createError && (
                                    <div className="border border-brand-danger-border bg-brand-danger-soft p-4 text-sm text-brand-danger">
                                        {createError}
                                    </div>
                                )}

                                <div>
                                    <label
                                        htmlFor="create-name"
                                        className="mb-2 block text-sm font-medium text-brand-text"
                                    >
                                        Full Name
                                    </label>

                                    <input
                                        id="create-name"
                                        name="name"
                                        type="text"
                                        value={form.name}
                                        onChange={handleFormChange}
                                        disabled={creating}
                                        placeholder="Enter full name"
                                        className="ils-dashboard-field"
                                     autoComplete="name" />
<ApiFieldError errors={createFieldErrors} field="name" />
                                </div>

                                <div>
                                    <label
                                        htmlFor="create-email"
                                        className="mb-2 block text-sm font-medium text-brand-text"
                                    >
                                        Email Address
                                    </label>

                                    <input
                                        id="create-email"
                                        name="email"
                                        type="email"
                                        value={form.email}
                                        onChange={handleFormChange}
                                        disabled={creating}
                                        placeholder="member@company.com"
                                        className="ils-dashboard-field"
                                     autoComplete="email" />
<ApiFieldError errors={createFieldErrors} field="email" />
                                </div>

                                <div>
                                    <label className="mb-3 block text-sm font-medium text-brand-text">
                                        Access Type
                                    </label>

                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleAccessTypeChange(true)
                                            }
                                            disabled={creating}
                                            className={`border p-4 text-left transition ${form.grantFullScope
                                                ? 'border-brand-accent bg-brand-surface-tint ring-1 ring-brand-accent'
                                                : 'border-brand-border hover:border-brand-accent'
                                                }`}
                                        >
                                            <p className="text-sm font-semibold text-brand-text">
                                                Full Access
                                            </p>

                                            <p className="mt-1 text-xs text-brand-muted">
                                                Access to all available scopes.
                                            </p>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleAccessTypeChange(false)
                                            }
                                            disabled={creating}
                                            className={`border p-4 text-left transition ${!form.grantFullScope
                                                ? 'border-brand-accent bg-brand-surface-tint ring-1 ring-brand-accent'
                                                : 'border-brand-border hover:border-brand-accent'
                                                }`}
                                        >
                                            <p className="text-sm font-semibold text-brand-text">
                                                Custom Access
                                            </p>

                                            <p className="mt-1 text-xs text-brand-muted">
                                                Select specific access scopes.
                                            </p>
                                        </button>
                                    </div>
                                </div>

                                {!form.grantFullScope && (
                                    <div className="space-y-4 border border-brand-border bg-brand-surface-tint p-4">
                                        <div>
                                            <h3 className="text-sm font-semibold text-brand-text">
                                                Custom Scopes
                                            </h3>

                                            <p className="mt-1 text-xs text-brand-muted">
                                                Add the services this member can
                                                access.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                            <div>
                                                <label
                                                    htmlFor="scope-category"
                                                    className="mb-2 block text-xs font-medium text-brand-muted"
                                                >
                                                    Category
                                                </label>

                                                <select
                                                    id="scope-category"
                                                    value={scopeForm.category}
                                                    onChange={
                                                        handleCategoryChange
                                                    }
                                                    disabled={creating}
                                                    className="ils-dashboard-field"
                                                >
                                                    <option value="">
                                                        Select category
                                                    </option>

                                                    {scopeCategories.map(
                                                        (category) => (
                                                            <option
                                                                key={
                                                                    category.value
                                                                }
                                                                value={
                                                                    category.value
                                                                }
                                                            >
                                                                {
                                                                    category.label
                                                                }
                                                            </option>
                                                        )
                                                    )}
                                                </select>
                                            </div>

                                            <div>
                                                <label
                                                    htmlFor="scope-service"
                                                    className="mb-2 block text-xs font-medium text-brand-muted"
                                                >
                                                    Service
                                                </label>

                                                <select
                                                    id="scope-service"
                                                    value={scopeForm.service}
                                                    onChange={(event) =>
                                                        setScopeForm(
                                                            (previous) => ({
                                                                ...previous,
                                                                service:
                                                                    event.target
                                                                        .value,
                                                            })
                                                        )
                                                    }
                                                    disabled={
                                                        creating ||
                                                        !scopeForm.category ||
                                                        scopeForm.category ===
                                                        '4'
                                                    }
                                                    className="ils-dashboard-field"
                                                >
                                                    <option value="">
                                                        Select service
                                                    </option>

                                                    {(scopeForm.category ===
                                                        '1' ||
                                                        scopeForm.category ===
                                                        '2') && (
                                                            <option value="1">
                                                                Freight
                                                            </option>
                                                        )}

                                                    {scopeForm.category ===
                                                        '3' &&
                                                        domesticServices.map(
                                                            (service) => (
                                                                <option
                                                                    key={
                                                                        service.value
                                                                    }
                                                                    value={
                                                                        service.value
                                                                    }
                                                                >
                                                                    {
                                                                        service.label
                                                                    }
                                                                </option>
                                                            )
                                                        )}

                                                    {scopeForm.category ===
                                                        '4' && (
                                                            <option value="0">
                                                                None
                                                            </option>
                                                        )}
                                                </select>
                                            </div>

                                            <div>
                                                <label
                                                    htmlFor="scope-type"
                                                    className="mb-2 block text-xs font-medium text-brand-muted"
                                                >
                                                    Shipment Type
                                                </label>

                                                <select
                                                    id="scope-type"
                                                    value={scopeForm.type}
                                                    onChange={(event) =>
                                                        setScopeForm(
                                                            (previous) => ({
                                                                ...previous,
                                                                type: event.target
                                                                    .value,
                                                            })
                                                        )
                                                    }
                                                    disabled={
                                                        creating ||
                                                        !scopeForm.category ||
                                                        scopeForm.category ===
                                                        '4'
                                                    }
                                                    className="ils-dashboard-field"
                                                >
                                                    <option value="">
                                                        Select shipment type
                                                    </option>

                                                    {shipmentTypes.map(
                                                        (type) => (
                                                            <option
                                                                key={type.value}
                                                                value={
                                                                    type.value
                                                                }
                                                            >
                                                                {type.label}
                                                            </option>
                                                        )
                                                    )}

                                                    {scopeForm.category ===
                                                        '4' && (
                                                            <option value="0">
                                                                None
                                                            </option>
                                                        )}
                                                </select>
                                            </div>
                                        </div>

                                        <DashboardButton
                                            type="button"
                                            onClick={addScope}
                                            disabled={creating}
                                            variant="secondary"
                                        >
                                            + Add Scope
                                        </DashboardButton>

                                        {scopes.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-xs font-medium text-brand-muted">
                                                    Added Scopes
                                                </p>

                                                {scopes.map((scope, index) => (
                                                    <div
                                                        key={`${scope.category}-${scope.service}-${scope.type}-${index}`}
                                                        className="flex items-center justify-between gap-3 border border-brand-border bg-brand-surface px-3 py-2.5"
                                                    >
                                                        <div className="text-xs text-brand-text">
                                                            <span className="font-medium">
                                                                {getCategoryLabel(
                                                                    scope.category
                                                                )}
                                                            </span>

                                                            <span className="mx-2 text-brand-muted">
                                                                /
                                                            </span>

                                                            <span>
                                                                {getServiceLabel(
                                                                    scope.service
                                                                )}
                                                            </span>

                                                            <span className="mx-2 text-brand-muted">
                                                                /
                                                            </span>

                                                            <span>
                                                                {getShipmentTypeLabel(
                                                                    scope.type
                                                                )}
                                                            </span>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                removeScope(
                                                                    index
                                                                )
                                                            }
                                                            disabled={creating}
                                                            className="ils-dashboard-permission-remove"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="ils-dashboard-modal-footer">
                                    <DashboardButton
                                        type="button"
                                        onClick={closeCreateModal}
                                        disabled={creating}
                                        variant="secondary"
                                    >
                                        Cancel
                                    </DashboardButton>

                                    <DashboardButton
                                        type="submit"
                                        disabled={creating}
                                        variant="primary"
                                    >
                                        {creating && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        )}

                                        {creating
                                            ? 'Creating...'
                                            : 'Create Member'}
                                    </DashboardButton>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </DashboardPage>
    );
}