import DashboardFilterDropdown from "../../../components/dashboard/DashboardFilterDropdown";
import { sanitizePhoneInput } from "../../../utils/phoneInput.js";
import ApiFieldError from "../../../components/common/ApiFieldError";
import { DashboardActionItem } from "../../../components/dashboard/DashboardUI";
import "../../../components/dashboard/management-customers.css";
import { DashboardActionMenu, DashboardButton, DashboardPageHeader, DashboardToolbar, DashboardSearchField } from "../../../components/dashboard/DashboardUI";
import ManagementSearchInput from "../../../components/dashboard/ManagementSearchInput";
import "../../../components/dashboard/management-search.css";
import { DashboardStatusBadge } from "../../../components/dashboard/DashboardUI";
import ManagementHeaderTitle from "../../../components/dashboard/ManagementHeaderTitle";
import "../../../components/dashboard/management-heading.css";
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../../auth/AuthContext';

import {
    Plus,
    X,
    Search,
    RefreshCw,
    MoreHorizontal,
    Eye,
    Pencil,
    Ban,
    CheckCircle2,
    Mail,
    Trash2,
    LogIn,
} from 'lucide-react';

import {
    getCustomers,
    registerCustomer,
    getCustomerById,
    updateCustomerProfile,
    updateCustomerEmail,
    deleteCustomers,
    activateCustomer,
    suspendCustomer,
    getCustomerOwner,
    impersonateCustomer,
} from '../../../services/customersService';
import { extractApiErrorMessage, extractApiFieldErrors } from '../../../utils/errorUtils';

const PAGE_SIZE = 10;

function getApiErrorMessage(error, fallbackMessage) {
    return extractApiErrorMessage(error, fallbackMessage);
}

export default function Customers() {
    const { user, startImpersonation } = useAuth();
    const navigate = useNavigate();

    const permissions = user?.permissions ?? [];

    const canCreate = permissions.includes('customers.create');
    const canEdit = permissions.includes('customers.edit');
    const canDelete = permissions.includes('customers.delete');
    const canSuspend = permissions.includes('customers.suspend');

    const canImpersonate =
        user?.tokenType === 'internal' &&
        permissions.includes('customers.impersonate');

    const isAccountManager = user?.roleName === 'Account Manager';


    const [customers, setCustomers] = useState([]);
    const [pageNumber, setPageNumber] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [recordStatus, setRecordStatus] = useState('notDeleted');
    const [openActionsId, setOpenActionsId] = useState(null);
    const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [pendingDeleteIds, setPendingDeleteIds] = useState([]);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [creatingCustomer, setCreatingCustomer] = useState(false);
    const [createError, setCreateError] = useState('');
    const [createFields, setCreateFields] = useState({});

    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [updatingCustomer, setUpdatingCustomer] = useState(false);
    const [updateError, setUpdateError] = useState('');
    const [updateFields, setUpdateFields] = useState({});

    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailCustomer, setEmailCustomer] = useState(null);
    const [newEmail, setNewEmail] = useState('');
    const [updatingEmail, setUpdatingEmail] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [emailFields, setEmailFields] = useState({});

    const [newCustomer, setNewCustomer] = useState({
        ownerName: '',
        companyName: '',
        ownerPhone: '',
        ownerEmail: '',
        industry: '',
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        setPageNumber(1);
    }, [debouncedSearch]);

    const loadCustomers = async (page = pageNumber, search = debouncedSearch) => {
        try {
            setLoading(true);
            setError("");

            const result = await getCustomers(page, PAGE_SIZE, recordStatus, search);

            setCustomers(result.items ?? []);
            setSelectedCustomerIds([]);
            setPageNumber(result.pageNumber ?? page);
            setTotalPages(result.totalPages ?? 1);
            setTotalCount(result.totalCount ?? 0);
        } catch (err) {
            console.error("loadCustomers error:", err);
            setError(getApiErrorMessage(err, "Failed to load customers."));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCustomers(pageNumber, debouncedSearch);
    }, [pageNumber, debouncedSearch, recordStatus]);


    const handleRecordStatusChange = (event) => {
        setRecordStatus(event.target.value);
        setPageNumber(1);
    };

    const handleRefresh = () => {
        setOpenActionsId(null);
        loadCustomers(pageNumber, debouncedSearch);
    };

    const handlePreviousPage = () => {
        setOpenActionsId(null);
        if (pageNumber > 1) {
            setPageNumber((prev) => prev - 1);
        }
    };

    const handleNextPage = () => {
        setOpenActionsId(null);
        if (pageNumber < totalPages) {
            setPageNumber((prev) => prev + 1);
        }
    };

    const handleNewCustomerChange = (event) => {
        const { name, value } = event.target;

        setNewCustomer((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const openAddCustomerModal = () => {
        setNewCustomer({
            ownerName: '',
            companyName: '',
            ownerPhone: '',
            ownerEmail: '',
            industry: '',
        });

        setCreateError(''); setCreateFields({});
        setIsAddModalOpen(true);
    };

    const closeAddCustomerModal = () => {
        if (creatingCustomer) return;

        setIsAddModalOpen(false);
        setCreateError(''); setCreateFields({});
    };

    const handleCreateCustomer = async (event) => {
        event.preventDefault();

        try {
            setCreatingCustomer(true);
            setCreateError(''); setCreateFields({});

            await registerCustomer({
                ownerName: newCustomer.ownerName.trim(),
                companyName: newCustomer.companyName.trim(),
                ownerPhone: newCustomer.ownerPhone.trim(),
                ownerEmail: newCustomer.ownerEmail.trim(),
                industry: newCustomer.industry.trim() || null,
            });

            setIsAddModalOpen(false);

            await loadCustomers(1);
        } catch (err) {
            console.error(err);

            setCreateFields(extractApiFieldErrors(err));
            setCreateError(
                getApiErrorMessage(err, 'Failed to create customer.')
            );
        } finally {
            setCreatingCustomer(false);
        }
    };

    const handleActionToggle = (customerId) => {
        setOpenActionsId((previousId) =>
            previousId === customerId ? null : customerId
        );
    };

    const handleViewCustomer = async (customerId) => {
        try {
            setOpenActionsId(null);
            setSelectedCustomer(null);
            setLoadingDetails(true);
            setIsDetailsModalOpen(true);

            const customer = await getCustomerById(customerId);

            setSelectedCustomer(customer);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleImpersonateCustomer = async (customerId) => {
        try {
            setOpenActionsId(null);

            const owner = await getCustomerOwner(customerId);

            if (!owner?.ownerUserId) {
                setError('Customer owner user was not found.');
                return;
            }

            const response = await impersonateCustomer(
                owner.ownerUserId,
                'Customer support access'
            );

            await startImpersonation(response);
            navigate('/customer');
        } catch (err) {
            console.error('Failed to impersonate customer:', err);

            setError(
                getApiErrorMessage(
                    err,
                    'Failed to impersonate customer.'
                )
            );
        }
    };

    const closeDetailsModal = () => {
        if (loadingDetails) return;

        setIsDetailsModalOpen(false);
        setSelectedCustomer(null);
    };

    const handleEditCustomer = async (customerId) => {
        try {
            setOpenActionsId(null);
            setUpdateError(''); setUpdateFields({});
            setEditingCustomer(null);
            setIsEditModalOpen(true);

            const customer = await getCustomerById(customerId);

            setEditingCustomer({
                id: customer.id,
                ownerName: customer.ownerName ?? '',
                companyName: customer.companyName ?? '',
                ownerPhone: customer.ownerPhone ?? '',
                industry: customer.industry ?? '',
            });
        } catch (err) {
            console.error(err);

            setUpdateError(
                getApiErrorMessage(
                    err,
                    'Failed to load customer details.'
                )
            );
        }
    };

    const handleEditCustomerChange = (event) => {
        const { name, value } = event.target;

        setEditingCustomer((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const closeEditModal = () => {
        if (updatingCustomer) return;

        setIsEditModalOpen(false);
        setEditingCustomer(null);
        setUpdateError(''); setUpdateFields({});
    };

    const handleUpdateCustomer = async (event) => {
        event.preventDefault();

        if (!editingCustomer) return;

        try {
            setUpdatingCustomer(true);
            setUpdateError(''); setUpdateFields({});

            await updateCustomerProfile(editingCustomer.id, {
                ownerName: editingCustomer.ownerName.trim(),
                companyName: editingCustomer.companyName.trim(),
                ownerPhone: editingCustomer.ownerPhone.trim(),
                industry: editingCustomer.industry.trim() || null,
            });

            setIsEditModalOpen(false);
            setEditingCustomer(null);

            await loadCustomers(pageNumber);
        } catch (err) {
            console.error(err);

            setUpdateFields(extractApiFieldErrors(err));
            setUpdateError(
                getApiErrorMessage(err, 'Failed to update customer.')
            );
        } finally {
            setUpdatingCustomer(false);
        }
    };

    const handleChangeEmail = async (customerId) => {
        try {
            setOpenActionsId(null);
            setEmailError(''); setEmailFields({});
            setEmailCustomer(null);
            setNewEmail('');
            setIsEmailModalOpen(true);

            const customer = await getCustomerById(customerId);

            setEmailCustomer(customer);
            setNewEmail(customer.ownerEmail ?? '');
        } catch (err) {
            console.error(err);

            setEmailError(
                getApiErrorMessage(
                    err,
                    'Failed to load customer email.'
                )
            );
        }
    };

    const closeEmailModal = () => {
        if (updatingEmail) return;

        setIsEmailModalOpen(false);
        setEmailCustomer(null);
        setNewEmail('');
        setEmailError(''); setEmailFields({});
    };

    const handleUpdateEmail = async (event) => {
        event.preventDefault();

        if (!emailCustomer) return;

        try {
            setUpdatingEmail(true);
            setEmailError(''); setEmailFields({});

            await updateCustomerEmail(
                emailCustomer.id,
                newEmail.trim()
            );

            setIsEmailModalOpen(false);
            setEmailCustomer(null);
            setNewEmail('');

            await loadCustomers(pageNumber);
        } catch (err) {
            console.error(err);

            setEmailFields(extractApiFieldErrors(err));
            setEmailError(
                getApiErrorMessage(
                    err,
                    'Failed to update customer email.'
                )
            );
        } finally {
            setUpdatingEmail(false);
        }
    };

    const handleSuspendCustomer = async (customerId) => {
        setOpenActionsId(null);

        const customer = customers.find(
            (item) => item.id === customerId
        );

        const isActive =
            customer?.status?.toLowerCase() === 'active';

        try {
            setLoading(true);
            setError('');

            if (isActive) {
                await suspendCustomer(customerId);
            } else {
                await activateCustomer(customerId);
            }

            await loadCustomers(pageNumber);
        } catch (err) {
            console.error('Failed to update customer status:', err);

            setError(extractApiErrorMessage(err, 'Failed to update customer status.'));
        } finally {
            setLoading(false);
        }
    };

    const handleSelectCustomer = (customerId) => {
        setSelectedCustomerIds((previousIds) =>
            previousIds.includes(customerId)
                ? previousIds.filter((id) => id !== customerId)
                : [...previousIds, customerId]
        );
    };

    const filteredCustomers = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return customers;

        return customers.filter((customer) => {
            return (
                customer.companyName?.toLowerCase().includes(term) ||
                customer.ownerName?.toLowerCase().includes(term) ||
                customer.ownerEmail?.toLowerCase().includes(term) ||
                customer.ownerPhone?.toLowerCase().includes(term) ||
                customer.customerCode?.toLowerCase().includes(term)
            );
        });
    }, [customers, searchTerm]);

    const handleSelectAllCustomers = () => {
        const visibleCustomerIds = filteredCustomers.map(
            (customer) => customer.id
        );

        setSelectedCustomerIds((previousIds) => {
            const areAllVisibleSelected =
                visibleCustomerIds.length > 0 &&
                visibleCustomerIds.every((id) =>
                    previousIds.includes(id)
                );

            if (areAllVisibleSelected) {
                return previousIds.filter(
                    (id) => !visibleCustomerIds.includes(id)
                );
            }

            return [
                ...new Set([
                    ...previousIds,
                    ...visibleCustomerIds,
                ]),
            ];
        });
    };

    const openDeleteConfirmation = (customerIds) => {
        if (!customerIds.length || isDeleting) return;

        setOpenActionsId(null);
        setDeleteError('');
        setPendingDeleteIds(customerIds);
        setIsDeleteModalOpen(true);
    };

    const closeDeleteConfirmation = () => {
        if (isDeleting) return;

        setIsDeleteModalOpen(false);
        setPendingDeleteIds([]);
    };

    const handleConfirmDelete = async () => {
        if (!pendingDeleteIds.length || isDeleting) return;

        try {
            setIsDeleting(true);
            setDeleteError('');

            await deleteCustomers(pendingDeleteIds);

            setSelectedCustomerIds([]);
            setIsDeleteModalOpen(false);
            setPendingDeleteIds([]);

            await loadCustomers(pageNumber);
        } catch (err) {
            console.error('Delete customers failed:', err);

            setDeleteError(
                getApiErrorMessage(
                    err,
                    'Failed to delete customer(s).'
                )
            );
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div
            className="min-h-full ils-management-customers"
            onClick={() => setOpenActionsId(null)}
        >
            <div className="w-full space-y-5">
                {/* Shared management header and toolbar — same components as Users / Roles. */}
                <DashboardPageHeader
                    title="Customers"
                    description="Manage customer accounts, access, and contact information."
                    actions={canCreate ? (
                        <DashboardButton variant="primary" icon={Plus} onClick={openAddCustomerModal}>
                            Add Customer
                        </DashboardButton>
                    ) : null}
                />

                <DashboardToolbar actions={
                    <>
                        {!isAccountManager && (
                            <DashboardFilterDropdown
                                label="Record status"
                                value={recordStatus}
                                onChange={(value) => handleRecordStatusChange({ target: { value } })}
                                options={[
                                    { value: "notDeleted", label: "Not Deleted" },
                                    { value: "deleted", label: "Deleted" },
                                    { value: "all", label: "All Records" },
                                ]}
                            />
                        )}
                        {canDelete && selectedCustomerIds.length > 0 && (
                            <DashboardButton
                                variant="danger"
                                icon={Trash2}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    openDeleteConfirmation(selectedCustomerIds);
                                }}
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Deleting...' : `Delete Selected (${selectedCustomerIds.length})`}
                            </DashboardButton>
                        )}
                        <DashboardButton
                            variant="secondary"
                            icon={RefreshCw}
                            onClick={(event) => {
                                event.stopPropagation();
                                handleRefresh();
                            }}
                        >
                            Refresh
                        </DashboardButton>
                    </>
                }>
                    <DashboardSearchField
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        placeholder="Search by company, owner, email, phone, or code..."
                        title="Search by company, owner, email, phone, or code"
                    />
                </DashboardToolbar>

                {deleteError && !loading && (
                    <div className="flex items-center justify-between rounded-none border border-brand-danger-border bg-brand-danger-soft px-4 py-3 text-sm text-brand-danger">
                        <span>{deleteError}</span>
                        <button
                            type="button"
                            onClick={() => setDeleteError('')}
                            className="font-medium hover:underline"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {loading && (
                    <div className="rounded-none border border-brand-border bg-brand-surface py-16 text-center text-sm text-brand-muted shadow-sm">
                        <RefreshCw
                            size={20}
                            className="mx-auto mb-3 animate-spin text-brand-neutral"
                        />
                        Loading customers...
                    </div>
                )}

                {!loading && error && (
                    <div className="flex items-center justify-between rounded-none border border-brand-danger-border bg-brand-danger-soft p-4 text-sm text-brand-danger shadow-xs transition">
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

                {!loading && !error && (
                    <>
                        {/* Customers Table */}
                        <div className="ils-dashboard-table-surface">
                            <div className="flex flex-col gap-1 border-b border-brand-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-sm font-semibold text-brand-text">
                                        Customer Accounts
                                    </h2>
                                    <p className="mt-0.5 text-xs text-brand-muted">
                                        {totalCount} customer
                                        {totalCount === 1 ? '' : 's'} in this view
                                    </p>
                                </div>

                                {selectedCustomerIds.length > 0 && (
                                    <span className="text-xs font-medium text-brand-muted">
                                        {selectedCustomerIds.length} selected
                                    </span>
                                )}
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-[900px] w-full">
                                    <thead className="border-b border-brand-border bg-brand-surface-tint/80">
                                        <tr>
                                            {!isAccountManager && (
                                                <th className="w-12 px-4 py-3.5 text-left">
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded border-brand-border text-brand-text focus:ring-brand-border"
                                                        checked={
                                                            filteredCustomers.length >
                                                            0 &&
                                                            filteredCustomers.every(
                                                                (customer) =>
                                                                    selectedCustomerIds.includes(
                                                                        customer.id
                                                                    )
                                                            )
                                                        }
                                                        onChange={
                                                            handleSelectAllCustomers
                                                        }
                                                        disabled={
                                                            isDeleting ||
                                                            filteredCustomers.length ===
                                                            0
                                                        }
                                                        onClick={(event) =>
                                                            event.stopPropagation()
                                                        }
                                                    />
                                                </th>
                                            )}

                                            <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
                                                Customer
                                            </th>
                                            <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
                                                Contact
                                            </th>
                                            <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
                                                Industry
                                            </th>
                                            <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
                                                Status
                                            </th>
                                            <th className="w-20 px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-brand-muted">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {filteredCustomers.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={
                                                        isAccountManager ? 5 : 6
                                                    }
                                                    className="px-6 py-16 text-center"
                                                >
                                                    <div className="mx-auto max-w-sm">
                                                        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-none bg-brand-surface-muted">
                                                            <Search
                                                                size={19}
                                                                className="text-brand-neutral"
                                                            />
                                                        </div>
                                                        <p className="mt-3 text-sm font-medium text-brand-text">
                                                            No customers found
                                                        </p>
                                                        <p className="mt-1 text-xs text-brand-muted">
                                                            Try changing your search
                                                            or record filter.
                                                        </p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredCustomers.map(
                                                (customer) => (
                                                    <tr
                                                        key={customer.id}
                                                        className="border-b border-brand-border last:border-b-0 hover:bg-brand-surface-tint/60"
                                                    >
                                                        {!isAccountManager && (
                                                            <td className="px-4 py-4 align-middle">
                                                                <input
                                                                    type="checkbox"
                                                                    className="h-4 w-4 rounded border-brand-border text-brand-text focus:ring-brand-border"
                                                                    checked={selectedCustomerIds.includes(
                                                                        customer.id
                                                                    )}
                                                                    onChange={() =>
                                                                        handleSelectCustomer(
                                                                            customer.id
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        isDeleting
                                                                    }
                                                                    onClick={(
                                                                        event
                                                                    ) =>
                                                                        event.stopPropagation()
                                                                    }
                                                                />
                                                            </td>
                                                        )}

                                                        <td className="px-4 py-4">
                                                            <div className="flex min-w-0 items-center gap-3">
                                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-brand-surface-muted text-xs font-semibold text-brand-muted">
                                                                    {(
                                                                        customer.companyName ||
                                                                        customer.ownerName ||
                                                                        'C'
                                                                    )
                                                                        .charAt(0)
                                                                        .toUpperCase()}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="truncate text-sm font-semibold text-brand-text">
                                                                        {customer.companyName ||
                                                                            '-'}
                                                                    </p>
                                                                    <p className="mt-0.5 truncate text-xs text-brand-muted">
                                                                        {customer.ownerName ||
                                                                            'No owner name'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm text-brand-text">
                                                                    {customer.ownerEmail ||
                                                                        '-'}
                                                                </p>
                                                                <p className="mt-1 text-xs text-brand-muted">
                                                                    {customer.ownerPhone ||
                                                                        '-'}
                                                                </p>
                                                            </div>
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            <span className="text-sm text-brand-text">
                                                                {customer.industry || '—'}
                                                            </span>
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            <DashboardStatusBadge tone={!customer.status ? 'neutral' : customer.status.toLowerCase() === 'active' ? 'positive' : 'negative'}>
                                                                {customer.status ? (customer.status.toLowerCase() === 'active' ? 'Active' : 'Inactive') : 'Unknown'}
                                                            </DashboardStatusBadge>
                                                        </td>

                                                        <td className="relative px-4 py-4 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={(
                                                                    event
                                                                ) => {
                                                                    event.stopPropagation();
                                                                    handleActionToggle(
                                                                        customer.id
                                                                    );
                                                                }}
                                                                className="rounded-none p-2 text-brand-neutral transition hover:bg-brand-surface-muted hover:text-brand-text"
                                                                id={`customer-actions-${customer.id}`}
                                                                aria-label="Customer actions"
                                                                aria-expanded={openActionsId === customer.id}
                                                                aria-haspopup="menu"
                                                            >
                                                                <MoreHorizontal
                                                                    size={18}
                                                                />
                                                            </button>

                                                            {openActionsId ===
                                                                customer.id && (
                                                                    <DashboardActionMenu
                                                                        anchorId={`customer-actions-${customer.id}`}
                                                                        onClick={(
                                                                            event
                                                                        ) =>
                                                                            event.stopPropagation()
                                                                        }
                                                                    >
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                handleViewCustomer(
                                                                                    customer.id
                                                                                )
                                                                            }
                                                                            className="ils-dashboard-action-item ils-dashboard-action-item--neutral"
                                                                        >
                                                                            <Eye
                                                                                size={
                                                                                    16
                                                                                }
                                                                            />
                                                                            View Details
                                                                        </button>

                                                                        {canImpersonate && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    handleImpersonateCustomer(
                                                                                        customer.id
                                                                                    )
                                                                                }
                                                                                className="ils-dashboard-action-item ils-dashboard-action-item--neutral"
                                                                            >
                                                                                <LogIn
                                                                                    size={
                                                                                        16
                                                                                    }
                                                                                />
                                                                                Impersonate Customer
                                                                            </button>
                                                                        )}

                                                                        {canEdit && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    handleEditCustomer(
                                                                                        customer.id
                                                                                    )
                                                                                }
                                                                                className="ils-dashboard-action-item ils-dashboard-action-item--neutral"
                                                                            >
                                                                                <Pencil
                                                                                    size={
                                                                                        16
                                                                                    }
                                                                                />
                                                                                Edit
                                                                            </button>
                                                                        )}

                                                                        {canEdit && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    handleChangeEmail(
                                                                                        customer.id
                                                                                    )
                                                                                }
                                                                                className="ils-dashboard-action-item ils-dashboard-action-item--neutral"
                                                                            >
                                                                                <Mail
                                                                                    size={
                                                                                        16
                                                                                    }
                                                                                />
                                                                                Change Email
                                                                            </button>
                                                                        )}

                                                                        {canSuspend && (
                                                                            <DashboardActionItem
                                                                                action={customer.status?.toLowerCase() === 'active' ? 'deactivate' : 'activate'}
                                                                                onClick={() => handleSuspendCustomer(customer.id)}
                                                                            />
                                                                        )}

                                                                        {canDelete && (
                                                                            <>
                                                                                <div className="my-1 border-t border-brand-surface-muted" role="separator" />
                                                                            <DashboardActionItem
                                                                                action="delete"
                                                                                onClick={() => openDeleteConfirmation([customer.id])}
                                                                                disabled={isDeleting}
                                                                            />
                                                                            </>
                                                                        )}
                                                                    </DashboardActionMenu>
                                                                )}
                                                        </td>
                                                    </tr>
                                                )
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Pagination */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs text-brand-muted">
                                Showing page {pageNumber} of {totalPages} ·{' '}
                                {totalCount} total customer
                                {totalCount === 1 ? '' : 's'}
                            </p>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handlePreviousPage}
                                    disabled={pageNumber === 1}
                                    className="rounded-none border border-brand-border bg-brand-surface px-3.5 py-2 text-sm font-medium text-brand-text shadow-sm transition hover:bg-brand-surface-tint disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Previous
                                </button>

                                <span className="min-w-20 text-center text-sm font-medium text-brand-muted">
                                    {pageNumber} / {totalPages}
                                </span>

                                <button
                                    type="button"
                                    onClick={handleNextPage}
                                    disabled={pageNumber >= totalPages}
                                    className="rounded-none border border-brand-border bg-brand-surface px-3.5 py-2 text-sm font-medium text-brand-text shadow-sm transition hover:bg-brand-surface-tint disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* Delete Confirmation Modal */}
                {isDeleteModalOpen && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-brand-text/50 p-4 backdrop-blur-[2px]"
                        onClick={closeDeleteConfirmation}
                    >
                        <div
                            className="ils-dashboard-dialog-panel w-full max-w-md overflow-hidden rounded-none bg-brand-surface shadow-2xl"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="flex items-start justify-between border-b border-brand-border px-6 py-5">
                                <div>
                                    <h2 className="text-lg font-semibold text-brand-text">
                                        Delete Selected Customers
                                    </h2>
                                    <p className="mt-1 text-sm text-brand-muted">
                                        This will remove the selected customer
                                        accounts.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeDeleteConfirmation}
                                    disabled={isDeleting}
                                    className="rounded-none p-1.5 text-brand-neutral transition hover:bg-brand-surface-muted hover:text-brand-muted disabled:opacity-50"
                                    aria-label="Close"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="px-6 py-6">
                                {deleteError && (
                                    <div className="mb-4 rounded-none border border-brand-danger-border bg-brand-danger-soft p-3 text-sm text-brand-danger">
                                        {deleteError}
                                    </div>
                                )}

                                <p className="text-sm text-brand-muted">
                                    Are you sure you want to delete{' '}
                                    <span className="font-semibold text-brand-text">
                                        {pendingDeleteIds.length}
                                    </span>{' '}
                                    selected customer
                                    {pendingDeleteIds.length === 1
                                        ? ''
                                        : 's'}
                                    ?
                                </p>
                                <p className="mt-2 text-sm font-medium text-brand-danger">
                                    This action cannot be undone.
                                </p>
                            </div>

                            <div className="flex justify-end gap-2 border-t border-brand-border px-6 py-4">
                                <button
                                    type="button"
                                    onClick={closeDeleteConfirmation}
                                    disabled={isDeleting}
                                    className="rounded-none border border-brand-border px-4 py-2.5 text-sm font-medium text-brand-text hover:bg-brand-surface-tint disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmDelete}
                                    disabled={isDeleting}
                                    className="rounded-none bg-brand-danger px-4 py-2.5 text-sm font-semibold text-brand-inverse hover:bg-brand-danger disabled:opacity-50"
                                >
                                    {isDeleting
                                        ? 'Deleting...'
                                        : 'Delete Selected'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Add Customer Modal */}
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-text/50 p-4 backdrop-blur-[2px]">
                        <div className="ils-dashboard-dialog-panel w-full max-w-lg overflow-hidden rounded-none bg-brand-surface shadow-2xl">
                            <div className="flex items-start justify-between border-b border-brand-border px-6 py-5">
                                <div>
                                    <h2 className="text-lg font-semibold text-brand-text">
                                        Add Customer
                                    </h2>
                                    <p className="mt-1 text-sm text-brand-muted">
                                        Create a new customer account.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeAddCustomerModal}
                                    disabled={creatingCustomer}
                                    className="rounded-none p-1.5 text-brand-neutral hover:bg-brand-surface-muted disabled:opacity-50"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form
                                onSubmit={handleCreateCustomer}
                                className="space-y-4 p-6"
                            >
                                {createError && (
                                    <div className="rounded-none border border-brand-danger-border bg-brand-danger-soft p-3 text-sm text-brand-danger">
                                        {createError}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    {[
                                        ['ownerName', 'Owner Name', 'Enter owner name'],
                                        ['companyName', 'Company Name', 'Enter company name'],
                                        ['ownerPhone', 'Owner Phone', 'Enter phone number'],
                                        ['ownerEmail', 'Owner Email', 'Enter email address'],
                                        ['industry', 'Industry', 'Enter industry'],
                                    ].map(([name, label, placeholder]) => (
                                        <div
                                            key={name}
                                            className={
                                                name === 'industry'
                                                    ? 'sm:col-span-2'
                                                    : ''
                                            }
                                        >
                                            <label className="mb-1.5 block text-sm font-medium text-brand-text">
                                                {label}
                                            </label>
                                            <input
                                                onInput={name === 'ownerPhone' ? sanitizePhoneInput : undefined}
                                                type={
                                                    name === 'ownerEmail'
                                                        ? 'email'
                                                        : name === 'ownerPhone'
                                                            ? 'tel'
                                                            : 'text'
                                                }
                                                name={name}
                                                value={newCustomer[name]}
                                                onChange={
                                                    handleNewCustomerChange
                                                }
                                                required={name !== 'industry'}
                                                disabled={creatingCustomer}
                                                className="w-full rounded-none border border-brand-border px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-border focus:ring-2 focus:ring-brand-border disabled:bg-brand-surface-tint"
                                                placeholder={placeholder}
                                            />
<ApiFieldError errors={createFields} field={name} />
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end gap-2 border-t border-brand-border pt-4">
                                    <button
                                        type="button"
                                        onClick={closeAddCustomerModal}
                                        disabled={creatingCustomer}
                                        className="rounded-none border border-brand-border px-4 py-2.5 text-sm font-medium text-brand-text hover:bg-brand-surface-tint disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creatingCustomer}
                                        className="rounded-none bg-brand-primary px-4 py-2.5 text-sm font-semibold text-brand-inverse hover:bg-brand-primary-hover disabled:opacity-50"
                                    >
                                        {creatingCustomer
                                            ? 'Creating...'
                                            : 'Create Customer'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Customer Details Modal */}
                {isDetailsModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-text/50 p-4 backdrop-blur-[2px]">
                        <div className="ils-dashboard-dialog-panel w-full max-w-2xl overflow-hidden rounded-none bg-brand-surface shadow-2xl">
                            <div className="flex items-start justify-between border-b border-brand-border px-6 py-5">
                                <div>
                                    <h2 className="text-lg font-semibold text-brand-text">
                                        Customer Details
                                    </h2>
                                    <p className="mt-1 text-sm text-brand-muted">
                                        View customer account information.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeDetailsModal}
                                    disabled={loadingDetails}
                                    className="rounded-none p-1.5 text-brand-neutral hover:bg-brand-surface-muted disabled:opacity-50"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6">
                                {loadingDetails ? (
                                    <div className="flex items-center justify-center py-12">
                                        <RefreshCw
                                            size={24}
                                            className="animate-spin text-brand-neutral"
                                        />
                                    </div>
                                ) : selectedCustomer ? (
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        {[
                                            ['Owner Name', selectedCustomer.ownerName],
                                            ['Company Name', selectedCustomer.companyName],
                                            ['Email', selectedCustomer.ownerEmail],
                                            ['Phone', selectedCustomer.ownerPhone],
                                            ['Industry', selectedCustomer.industry],
                                            ['Status', selectedCustomer.status ? (selectedCustomer.status.toLowerCase() === 'active' ? 'Active' : 'Inactive') : 'Unknown'],
                                        ].map(([label, value]) => (
                                            <div
                                                key={label}
                                                className="rounded-none border border-brand-border bg-brand-surface-tint/70 p-4"
                                            >
                                                <p className="text-xs font-medium uppercase tracking-wide text-brand-muted">
                                                    {label}
                                                </p>
                                                <p className="mt-1.5 break-all text-sm font-semibold text-brand-text">
                                                    {value || '-'}
                                                </p>
                                            </div>
                                        ))}

                                    </div>
                                ) : (
                                    <div className="py-10 text-center text-sm text-brand-muted">
                                        No customer details found.
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end border-t border-brand-border px-6 py-4">
                                <button
                                    type="button"
                                    onClick={closeDetailsModal}
                                    disabled={loadingDetails}
                                    className="rounded-none bg-brand-primary px-4 py-2.5 text-sm font-semibold text-brand-inverse hover:bg-brand-primary-hover disabled:opacity-50"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Customer Modal */}
                {isEditModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-text/50 p-4 backdrop-blur-[2px]">
                        <div className="ils-dashboard-dialog-panel w-full max-w-lg overflow-hidden rounded-none bg-brand-surface shadow-2xl">
                            <div className="flex items-start justify-between border-b border-brand-border px-6 py-5">
                                <div>
                                    <h2 className="text-lg font-semibold text-brand-text">
                                        Edit Customer
                                    </h2>
                                    <p className="mt-1 text-sm text-brand-muted">
                                        Update customer information.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeEditModal}
                                    disabled={updatingCustomer}
                                    className="rounded-none p-1.5 text-brand-neutral hover:bg-brand-surface-muted disabled:opacity-50"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form
                                onSubmit={handleUpdateCustomer}
                                className="space-y-4 p-6"
                            >
                                {updateError && (
                                    <div className="rounded-none border border-brand-danger-border bg-brand-danger-soft p-3 text-sm text-brand-danger">
                                        {updateError}
                                    </div>
                                )}

                                {!editingCustomer && !updateError ? (
                                    <div className="flex items-center justify-center py-10">
                                        <RefreshCw
                                            size={24}
                                            className="animate-spin text-brand-neutral"
                                        />
                                    </div>
                                ) : (
                                    editingCustomer && (
                                        <>
                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                {[
                                                    ['ownerName', 'Owner Name', 'Enter owner name'],
                                                    ['companyName', 'Company Name', 'Enter company name'],
                                                    ['ownerPhone', 'Owner Phone', 'Enter phone number'],
                                                    ['industry', 'Industry', 'Enter industry'],
                                                ].map(
                                                    ([
                                                        name,
                                                        label,
                                                        placeholder,
                                                    ]) => (
                                                        <div key={name}>
                                                            <label className="mb-1.5 block text-sm font-medium text-brand-text">
                                                                {label}
                                                            </label>
                                                            <input
                                                onInput={name === 'ownerPhone' ? sanitizePhoneInput : undefined}
                                                                type={
                                                                    name ===
                                                                        'ownerPhone'
                                                                        ? 'tel'
                                                                        : 'text'
                                                                }
                                                                name={name}
                                                                value={
                                                                    editingCustomer[
                                                                    name
                                                                    ]
                                                                }
                                                                onChange={
                                                                    handleEditCustomerChange
                                                                }
                                                                required={
                                                                    name !==
                                                                    'industry'
                                                                }
                                                                disabled={
                                                                    updatingCustomer
                                                                }
                                                                className="w-full rounded-none border border-brand-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-border focus:ring-2 focus:ring-brand-border disabled:bg-brand-surface-tint"
                                                                placeholder={
                                                                    placeholder
                                                                }
                                                            />
<ApiFieldError errors={updateFields} field={name} />
                                                        </div>
                                                    )
                                                )}
                                            </div>

                                            <div className="flex justify-end gap-2 border-t border-brand-border pt-4">
                                                <button
                                                    type="button"
                                                    onClick={closeEditModal}
                                                    disabled={
                                                        updatingCustomer
                                                    }
                                                    className="rounded-none border border-brand-border px-4 py-2.5 text-sm font-medium text-brand-text hover:bg-brand-surface-tint disabled:opacity-50"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={
                                                        updatingCustomer
                                                    }
                                                    className="rounded-none bg-brand-primary px-4 py-2.5 text-sm font-semibold text-brand-inverse hover:bg-brand-primary-hover disabled:opacity-50"
                                                >
                                                    {updatingCustomer
                                                        ? 'Saving...'
                                                        : 'Save Changes'}
                                                </button>
                                            </div>
                                        </>
                                    )
                                )}
                            </form>
                        </div>
                    </div>
                )}

                {/* Change Email Modal */}
                {isEmailModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-text/50 p-4 backdrop-blur-[2px]">
                        <div className="ils-dashboard-dialog-panel w-full max-w-lg overflow-hidden rounded-none bg-brand-surface shadow-2xl">
                            <div className="flex items-start justify-between border-b border-brand-border px-6 py-5">
                                <div>
                                    <h2 className="text-lg font-semibold text-brand-text">
                                        Change Customer Email
                                    </h2>
                                    <p className="mt-1 text-sm text-brand-muted">
                                        Update the email address associated with
                                        this customer.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeEmailModal}
                                    disabled={updatingEmail}
                                    className="rounded-none p-1.5 text-brand-neutral hover:bg-brand-surface-muted disabled:opacity-50"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form
                                onSubmit={handleUpdateEmail}
                                className="space-y-4 p-6"
                            >
                                {emailError && (
                                    <div className="rounded-none border border-brand-danger-border bg-brand-danger-soft p-3 text-sm text-brand-danger">
                                        {emailError}
                                    </div>
                                )}

                                {!emailCustomer && !emailError ? (
                                    <div className="flex items-center justify-center py-10">
                                        <RefreshCw
                                            size={24}
                                            className="animate-spin text-brand-neutral"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <label className="mb-1.5 block text-sm font-medium text-brand-text">
                                                Customer
                                            </label>
                                            <input
                                                type="text"
                                                value={
                                                    emailCustomer?.companyName ??
                                                    ''
                                                }
                                                disabled
                                                className="w-full rounded-none border border-brand-border bg-brand-surface-tint px-3.5 py-2.5 text-sm text-brand-muted outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1.5 block text-sm font-medium text-brand-text">
                                                New Email
                                            </label>
                                            <input
                                                type="email"
                                                value={newEmail}
                                                onChange={(event) =>
                                                    setNewEmail(
                                                        event.target.value
                                                    )
                                                }
                                                required
                                                disabled={updatingEmail}
                                                className="w-full rounded-none border border-brand-border px-3.5 py-2.5 text-sm outline-none focus:border-brand-border focus:ring-2 focus:ring-brand-border disabled:bg-brand-surface-tint"
                                                placeholder="Enter new email address"
                                            />
<ApiFieldError errors={emailFields} field="email" />
<ApiFieldError errors={emailFields} field="ownerEmail" />
                                        </div>

                                        <div className="flex justify-end gap-2 border-t border-brand-border pt-4">
                                            <button
                                                type="button"
                                                onClick={closeEmailModal}
                                                disabled={updatingEmail}
                                                className="rounded-none border border-brand-border px-4 py-2.5 text-sm font-medium text-brand-text hover:bg-brand-surface-tint disabled:opacity-50"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={updatingEmail}
                                                className="rounded-none bg-brand-primary px-4 py-2.5 text-sm font-semibold text-brand-inverse hover:bg-brand-primary-hover disabled:opacity-50"
                                            >
                                                {updatingEmail
                                                    ? 'Saving...'
                                                    : 'Save Email'}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
