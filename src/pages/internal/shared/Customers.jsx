import { useEffect, useState } from 'react';
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

const PAGE_SIZE = 10;

function getApiErrorMessage(error, fallbackMessage) {
    const data = error?.response?.data;

    if (typeof data === 'string' && data.trim()) {
        return data;
    }

    if (data?.message) return data.message;
    if (data?.detail) return data.detail;
    if (data?.title) return data.title;
    if (data?.error) return data.error;

    if (data?.errors && typeof data.errors === 'object') {
        const messages = Object.values(data.errors).flat();

        if (messages.length > 0) {
            return messages.join(' ');
        }
    }

    return fallbackMessage;
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

    console.log('Role name:', user?.roleName);
    console.log('Is Account Manager:', isAccountManager);

    const [customers, setCustomers] = useState([]);
    const [pageNumber, setPageNumber] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
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

    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [updatingCustomer, setUpdatingCustomer] = useState(false);
    const [updateError, setUpdateError] = useState('');

    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailCustomer, setEmailCustomer] = useState(null);
    const [newEmail, setNewEmail] = useState('');
    const [updatingEmail, setUpdatingEmail] = useState(false);
    const [emailError, setEmailError] = useState('');

    const [newCustomer, setNewCustomer] = useState({
        ownerName: '',
        companyName: '',
        ownerPhone: '',
        ownerEmail: '',
        industry: '',
    });

    const loadCustomers = async (page = pageNumber) => {
        try {
            console.log('loadCustomers started');

            setLoading(true);
            setError('');

            console.log('Before getCustomers');

            const result = await getCustomers(
                page,
                PAGE_SIZE,
                recordStatus
            );

            console.log('After getCustomers');
            console.log('Customers result:', result);

            setCustomers(result.items ?? []);
            setSelectedCustomerIds([]);
            setPageNumber(result.pageNumber ?? page);
            setTotalPages(result.totalPages ?? 1);
            setTotalCount(result.totalCount ?? 0);
        } catch (err) {
            console.error('loadCustomers error:', err);
            setError('Failed to load customers.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        console.log('Customers mounted');
        console.log('Current user:', user);
        console.log('Before loadCustomers');

        loadCustomers(1);
    }, [recordStatus]);

    const handleRecordStatusChange = (event) => {
        setRecordStatus(event.target.value);
        setPageNumber(1);
    };

    const handleRefresh = () => {
        setOpenActionsId(null);
        loadCustomers(pageNumber);
    };

    const handlePreviousPage = () => {
        setOpenActionsId(null);

        if (pageNumber > 1) {
            loadCustomers(pageNumber - 1);
        }
    };

    const handleNextPage = () => {
        setOpenActionsId(null);

        if (pageNumber < totalPages) {
            loadCustomers(pageNumber + 1);
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

        setCreateError('');
        setIsAddModalOpen(true);
    };

    const closeAddCustomerModal = () => {
        if (creatingCustomer) return;

        setIsAddModalOpen(false);
        setCreateError('');
    };

    const handleCreateCustomer = async (event) => {
        event.preventDefault();

        try {
            setCreatingCustomer(true);
            setCreateError('');

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
            setUpdateError('');
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
        setUpdateError('');
    };

    const handleUpdateCustomer = async (event) => {
        event.preventDefault();

        if (!editingCustomer) return;

        try {
            setUpdatingCustomer(true);
            setUpdateError('');

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
            setEmailError('');
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
        setEmailError('');
    };

    const handleUpdateEmail = async (event) => {
        event.preventDefault();

        if (!emailCustomer) return;

        try {
            setUpdatingEmail(true);
            setEmailError('');

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

            setError(
                err.response?.data?.error ||
                err.response?.data?.message ||
                'Failed to update customer status.'
            );
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

    const filteredCustomers = customers.filter((customer) => {
        const searchValue = searchTerm.toLowerCase();

        return (
            customer.ownerName
                ?.toLowerCase()
                .includes(searchValue) ||
            customer.companyName
                ?.toLowerCase()
                .includes(searchValue) ||
            customer.ownerEmail
                ?.toLowerCase()
                .includes(searchValue) ||
            customer.ownerPhone
                ?.toLowerCase()
                .includes(searchValue)
        );
    });

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
            className="min-h-full bg-slate-50 p-4 sm:p-6"
            onClick={() => setOpenActionsId(null)}
        >
            <div className="mx-auto max-w-[1600px] space-y-5">
                {/* Page Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                                <span className="text-sm font-semibold">C</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                                    Customers
                                </h1>
                                <p className="mt-0.5 text-sm text-slate-500">
                                    Manage customer accounts, access, and contact information.
                                </p>
                            </div>
                        </div>
                    </div>

                    {canCreate && (
                        <button
                            type="button"
                            onClick={openAddCustomerModal}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                        >
                            <Plus size={17} />
                            Add Customer
                        </button>
                    )}
                </div>

                {/* Toolbar */}
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="relative w-full lg:max-w-md">
                            <Search
                                size={17}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(event) =>
                                    setSearchTerm(event.target.value)
                                }
                                onClick={(event) => event.stopPropagation()}
                                placeholder="Search by name, company, email or phone..."
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {!isAccountManager && (
                                <select
                                    value={recordStatus}
                                    onChange={(event) => {
                                        event.stopPropagation();
                                        handleRecordStatusChange(event);
                                    }}
                                    onClick={(event) =>
                                        event.stopPropagation()
                                    }
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
                                >
                                    <option value="notDeleted">
                                        Not Deleted
                                    </option>
                                    <option value="deleted">
                                        Deleted
                                    </option>
                                    <option value="all">
                                        All Records
                                    </option>
                                </select>
                            )}

                            {canDelete &&
                                selectedCustomerIds.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            openDeleteConfirmation(
                                                selectedCustomerIds
                                            );
                                        }}
                                        disabled={isDeleting}
                                        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <Trash2 size={16} />
                                        {isDeleting
                                            ? 'Deleting...'
                                            : `Delete Selected (${selectedCustomerIds.length})`}
                                    </button>
                                )}

                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    handleRefresh();
                                }}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                                <RefreshCw size={16} />
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {deleteError && !loading && (
                    <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
                    <div className="rounded-xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-500 shadow-sm">
                        <RefreshCw
                            size={20}
                            className="mx-auto mb-3 animate-spin text-slate-400"
                        />
                        Loading customers...
                    </div>
                )}

                {!loading && error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {!loading && !error && (
                    <>
                        {/* Customers Table */}
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex flex-col gap-1 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-sm font-semibold text-slate-900">
                                        Customer Accounts
                                    </h2>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        {totalCount} customer
                                        {totalCount === 1 ? '' : 's'} in this view
                                    </p>
                                </div>

                                {selectedCustomerIds.length > 0 && (
                                    <span className="text-xs font-medium text-slate-500">
                                        {selectedCustomerIds.length} selected
                                    </span>
                                )}
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-[900px] w-full">
                                    <thead className="border-b border-slate-200 bg-slate-50/80">
                                        <tr>
                                            {!isAccountManager && (
                                                <th className="w-12 px-4 py-3.5 text-left">
                                                    <input
                                                        type="checkbox"
                                                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-200"
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

                                            <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                                Customer
                                            </th>
                                            <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                                Contact
                                            </th>
                                            <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                                Industry
                                            </th>
                                            <th className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                                Status
                                            </th>
                                            <th className="w-20 px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
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
                                                        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100">
                                                            <Search
                                                                size={19}
                                                                className="text-slate-400"
                                                            />
                                                        </div>
                                                        <p className="mt-3 text-sm font-medium text-slate-700">
                                                            No customers found
                                                        </p>
                                                        <p className="mt-1 text-xs text-slate-500">
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
                                                        className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60"
                                                    >
                                                        {!isAccountManager && (
                                                            <td className="px-4 py-4 align-middle">
                                                                <input
                                                                    type="checkbox"
                                                                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-200"
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
                                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
                                                                    {(
                                                                        customer.companyName ||
                                                                        customer.ownerName ||
                                                                        'C'
                                                                    )
                                                                        .charAt(0)
                                                                        .toUpperCase()}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="truncate text-sm font-semibold text-slate-900">
                                                                        {customer.companyName ||
                                                                            '-'}
                                                                    </p>
                                                                    <p className="mt-0.5 truncate text-xs text-slate-500">
                                                                        {customer.ownerName ||
                                                                            'No owner name'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm text-slate-700">
                                                                    {customer.ownerEmail ||
                                                                        '-'}
                                                                </p>
                                                                <p className="mt-1 text-xs text-slate-500">
                                                                    {customer.ownerPhone ||
                                                                        '-'}
                                                                </p>
                                                            </div>
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            <span className="inline-flex max-w-[180px] truncate rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                                                {customer.industry ||
                                                                    '—'}
                                                            </span>
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            <span
                                                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${customer.status?.toLowerCase() ===
                                                                        'active'
                                                                        ? 'bg-emerald-50 text-emerald-700'
                                                                        : 'bg-slate-100 text-slate-600'
                                                                    }`}
                                                            >
                                                                <span
                                                                    className={`h-1.5 w-1.5 rounded-full ${customer.status?.toLowerCase() ===
                                                                            'active'
                                                                            ? 'bg-emerald-500'
                                                                            : 'bg-slate-400'
                                                                        }`}
                                                                />
                                                                {customer.status ||
                                                                    'Unknown'}
                                                            </span>
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
                                                                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                                                aria-label="Customer actions"
                                                            >
                                                                <MoreHorizontal
                                                                    size={18}
                                                                />
                                                            </button>

                                                            {openActionsId ===
                                                                customer.id && (
                                                                    <div
                                                                        className="absolute right-4 top-12 z-30 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 text-left shadow-xl"
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
                                                                            className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
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
                                                                                className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
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
                                                                                className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                                                                            >
                                                                                <Pencil
                                                                                    size={
                                                                                        16
                                                                                    }
                                                                                />
                                                                                Edit Customer
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
                                                                                className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                                                                            >
                                                                                <Mail
                                                                                    size={
                                                                                        16
                                                                                    }
                                                                                />
                                                                                Change Email
                                                                            </button>
                                                                        )}

                                                                        {canDelete && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    openDeleteConfirmation(
                                                                                        [
                                                                                            customer.id,
                                                                                        ]
                                                                                    )
                                                                                }
                                                                                disabled={
                                                                                    isDeleting
                                                                                }
                                                                                className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                                                            >
                                                                                <Trash2
                                                                                    size={
                                                                                        16
                                                                                    }
                                                                                />
                                                                                Delete Customer
                                                                            </button>
                                                                        )}

                                                                        {canSuspend && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    handleSuspendCustomer(
                                                                                        customer.id
                                                                                    )
                                                                                }
                                                                                className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm text-red-600 transition hover:bg-red-50"
                                                                            >
                                                                                <Ban
                                                                                    size={
                                                                                        16
                                                                                    }
                                                                                />
                                                                                Suspend / Activate
                                                                            </button>
                                                                        )}
                                                                    </div>
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
                            <p className="text-xs text-slate-500">
                                Showing page {pageNumber} of {totalPages} ·{' '}
                                {totalCount} total customer
                                {totalCount === 1 ? '' : 's'}
                            </p>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handlePreviousPage}
                                    disabled={pageNumber === 1}
                                    className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Previous
                                </button>

                                <span className="min-w-20 text-center text-sm font-medium text-slate-600">
                                    {pageNumber} / {totalPages}
                                </span>

                                <button
                                    type="button"
                                    onClick={handleNextPage}
                                    disabled={pageNumber >= totalPages}
                                    className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
                        onClick={closeDeleteConfirmation}
                    >
                        <div
                            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">
                                        Delete Selected Customers
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        This will remove the selected customer
                                        accounts.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeDeleteConfirmation}
                                    disabled={isDeleting}
                                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                                    aria-label="Close"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="px-6 py-6">
                                {deleteError && (
                                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                        {deleteError}
                                    </div>
                                )}

                                <p className="text-sm text-slate-600">
                                    Are you sure you want to delete{' '}
                                    <span className="font-semibold text-slate-900">
                                        {pendingDeleteIds.length}
                                    </span>{' '}
                                    selected customer
                                    {pendingDeleteIds.length === 1
                                        ? ''
                                        : 's'}
                                    ?
                                </p>
                                <p className="mt-2 text-sm font-medium text-red-600">
                                    This action cannot be undone.
                                </p>
                            </div>

                            <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
                                <button
                                    type="button"
                                    onClick={closeDeleteConfirmation}
                                    disabled={isDeleting}
                                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmDelete}
                                    disabled={isDeleting}
                                    className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]">
                        <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
                            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">
                                        Add Customer
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Create a new customer account.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeAddCustomerModal}
                                    disabled={creatingCustomer}
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form
                                onSubmit={handleCreateCustomer}
                                className="space-y-4 p-6"
                            >
                                {createError && (
                                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
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
                                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                                {label}
                                            </label>
                                            <input
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
                                                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
                                                placeholder={placeholder}
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                                    <button
                                        type="button"
                                        onClick={closeAddCustomerModal}
                                        disabled={creatingCustomer}
                                        className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creatingCustomer}
                                        className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]">
                        <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">
                                        Customer Details
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        View customer account information.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeDetailsModal}
                                    disabled={loadingDetails}
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6">
                                {loadingDetails ? (
                                    <div className="flex items-center justify-center py-12">
                                        <RefreshCw
                                            size={24}
                                            className="animate-spin text-slate-400"
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
                                            ['Status', selectedCustomer.status],
                                        ].map(([label, value]) => (
                                            <div
                                                key={label}
                                                className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                                            >
                                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                                    {label}
                                                </p>
                                                <p className="mt-1.5 break-all text-sm font-semibold text-slate-900">
                                                    {value || '-'}
                                                </p>
                                            </div>
                                        ))}

                                        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:col-span-2">
                                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                                Customer ID
                                            </p>
                                            <p className="mt-1.5 break-all text-sm font-semibold text-slate-900">
                                                {selectedCustomer.id || '-'}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-10 text-center text-sm text-slate-500">
                                        No customer details found.
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end border-t border-slate-200 px-6 py-4">
                                <button
                                    type="button"
                                    onClick={closeDetailsModal}
                                    disabled={loadingDetails}
                                    className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Customer Modal */}
                {isEditModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]">
                        <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
                            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">
                                        Edit Customer
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Update customer information.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeEditModal}
                                    disabled={updatingCustomer}
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form
                                onSubmit={handleUpdateCustomer}
                                className="space-y-4 p-6"
                            >
                                {updateError && (
                                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                        {updateError}
                                    </div>
                                )}

                                {!editingCustomer && !updateError ? (
                                    <div className="flex items-center justify-center py-10">
                                        <RefreshCw
                                            size={24}
                                            className="animate-spin text-slate-400"
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
                                                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                                                {label}
                                                            </label>
                                                            <input
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
                                                                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
                                                                placeholder={
                                                                    placeholder
                                                                }
                                                            />
                                                        </div>
                                                    )
                                                )}
                                            </div>

                                            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                                                <button
                                                    type="button"
                                                    onClick={closeEditModal}
                                                    disabled={
                                                        updatingCustomer
                                                    }
                                                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={
                                                        updatingCustomer
                                                    }
                                                    className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]">
                        <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
                            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">
                                        Change Customer Email
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Update the email address associated with
                                        this customer.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeEmailModal}
                                    disabled={updatingEmail}
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form
                                onSubmit={handleUpdateEmail}
                                className="space-y-4 p-6"
                            >
                                {emailError && (
                                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                        {emailError}
                                    </div>
                                )}

                                {!emailCustomer && !emailError ? (
                                    <div className="flex items-center justify-center py-10">
                                        <RefreshCw
                                            size={24}
                                            className="animate-spin text-slate-400"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                                                Customer
                                            </label>
                                            <input
                                                type="text"
                                                value={
                                                    emailCustomer?.companyName ??
                                                    ''
                                                }
                                                disabled
                                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500 outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1.5 block text-sm font-medium text-slate-700">
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
                                                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
                                                placeholder="Enter new email address"
                                            />
                                        </div>

                                        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                                            <button
                                                type="button"
                                                onClick={closeEmailModal}
                                                disabled={updatingEmail}
                                                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={updatingEmail}
                                                className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
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
