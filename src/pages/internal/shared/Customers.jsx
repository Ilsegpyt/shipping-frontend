import { useEffect, useState } from 'react';

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
    const { user } = useAuth();

    const permissions = user?.permissions ?? [];

    const canCreate = permissions.includes('customers.create');
    const canEdit = permissions.includes('customers.edit');
    const canDelete = permissions.includes('customers.delete');
    const canSuspend = permissions.includes('customers.suspend');

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
            className="min-h-full bg-gray-50 p-4 sm:p-6"
            onClick={() => setOpenActionsId(null)}
        >
            <div className="mb-6 flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Customers
                    </h1>

                    <p className="mt-1 text-sm text-blue-900/70">
                        Manage your customers and their accounts.
                    </p>
                </div>

                {canCreate && (
                    <button
                        type="button"
                        onClick={openAddCustomerModal}
                        className="flex items-center gap-2 rounded-lg bg-[#111827] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f2937]"
                    >
                        <Plus size={18} />
                        Add Customer
                    </button>
                )}
            </div>

            <div className="mb-6 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                <div className="relative w-full max-w-sm">
                    <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(event) =>
                            setSearchTerm(event.target.value)
                        }
                        onClick={(event) => event.stopPropagation()}
                        placeholder="Search customers..."
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />
                </div>

                <div className="ml-4 flex items-center gap-3">
                    {!isAccountManager && (
                        <select
                            value={recordStatus}
                            onChange={(event) => {
                                event.stopPropagation();
                                handleRecordStatusChange(event);
                            }}
                            onClick={(event) => event.stopPropagation()}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
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

                    {canDelete && selectedCustomerIds.length > 0 && (
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                openDeleteConfirmation(
                                    selectedCustomerIds
                                );
                            }}
                            disabled={isDeleting}
                            className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Trash2 size={17} />

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
                        className="ml-4 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                        <RefreshCw size={17} />
                        Refresh
                    </button>
                </div>
            </div>

            {deleteError && !loading && (
                <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
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
                <div className="rounded-xl border border-slate-200 bg-white py-12 text-center text-sm text-slate-500">
                    Loading customers...
                </div>
            )}

            {!loading && error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
                    {error}
                </div>
            )}

            {!loading && !error && (
                <>
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="border-b border-slate-200 bg-slate-50">
                                    <tr>
                                        {!isAccountManager && (
                                            <th className="w-16 px-6 py-4 text-left">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-slate-300"
                                                    checked={
                                                        filteredCustomers.length > 0 &&
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
                                                        filteredCustomers.length === 0
                                                    }
                                                    onClick={(event) =>
                                                        event.stopPropagation()
                                                    }
                                                />
                                            </th>
                                        )}

                                        <th className="px-4 py-4 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                                            Owner Name
                                        </th>

                                        <th className="px-4 py-4 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                                            Company Name
                                        </th>

                                        <th className="px-4 py-4 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                                            Email
                                        </th>

                                        <th className="px-4 py-4 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                                            Phone
                                        </th>

                                        <th className="px-4 py-4 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                                            Industry
                                        </th>

                                        <th className="px-4 py-4 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                                            Status
                                        </th>

                                        <th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredCustomers.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={
                                                    isAccountManager ? 7 : 8
                                                }
                                                className="px-6 py-12 text-center text-sm text-slate-500"
                                            >
                                                No customers found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredCustomers.map((customer) => (
                                            <tr
                                                key={customer.id}
                                                className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                                            >
                                                {!isAccountManager && (
                                                    <td className="px-6 py-5">
                                                        <input
                                                            type="checkbox"
                                                            className="h-4 w-4 rounded border-slate-300"
                                                            checked={selectedCustomerIds.includes(
                                                                customer.id
                                                            )}
                                                            onChange={() =>
                                                                handleSelectCustomer(
                                                                    customer.id
                                                                )
                                                            }
                                                            disabled={isDeleting}
                                                            onClick={(event) =>
                                                                event.stopPropagation()
                                                            }
                                                        />
                                                    </td>
                                                )}

                                                <td className="px-4 py-5 text-sm font-semibold text-slate-900">
                                                    {customer.ownerName}
                                                </td>

                                                <td className="px-4 py-5 text-sm text-slate-700">
                                                    {customer.companyName}
                                                </td>

                                                <td className="px-4 py-5 text-sm text-slate-700">
                                                    {customer.ownerEmail}
                                                </td>

                                                <td className="px-4 py-5 text-sm text-slate-700">
                                                    {customer.ownerPhone}
                                                </td>

                                                <td className="px-4 py-5 text-sm text-slate-700">
                                                    {customer.industry || '-'}
                                                </td>

                                                <td className="px-4 py-5">
                                                    <span
                                                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${customer.status?.toLowerCase() ===
                                                            'active'
                                                            ? 'bg-emerald-50 text-emerald-600'
                                                            : 'bg-slate-100 text-slate-600'
                                                            }`}
                                                    >
                                                        {customer.status}
                                                    </span>
                                                </td>

                                                <td className="relative px-6 py-5 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            handleActionToggle(
                                                                customer.id
                                                            );
                                                        }}
                                                        className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                                                    >
                                                        <MoreHorizontal
                                                            size={20}
                                                        />
                                                    </button>

                                                    {openActionsId ===
                                                        customer.id && (
                                                            <div
                                                                className="absolute right-6 top-14 z-20 w-48 rounded-lg border border-slate-200 bg-white py-1 text-left shadow-lg"
                                                                onClick={(event) =>
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
                                                                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                                                                >
                                                                    <Eye size={16} />
                                                                    View Details
                                                                </button>

                                                                {canEdit && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            handleEditCustomer(
                                                                                customer.id
                                                                            )
                                                                        }
                                                                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                                                                    >
                                                                        <Pencil
                                                                            size={16}
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
                                                                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                                                                    >
                                                                        <Mail size={16} />
                                                                        Change Email
                                                                    </button>
                                                                )}

                                                                {canDelete && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            openDeleteConfirmation(
                                                                                [customer.id]
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            isDeleting
                                                                        }
                                                                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                                    >
                                                                        <Trash2
                                                                            size={16}
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
                                                                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50"
                                                                    >
                                                                        <Ban size={16} />
                                                                        Suspend /
                                                                        Activate
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                        <span className="text-sm text-slate-500">
                            Total customers: {totalCount}
                        </span>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handlePreviousPage}
                                disabled={pageNumber === 1}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Previous
                            </button>

                            <span className="text-sm text-slate-600">
                                Page {pageNumber} of {totalPages}
                            </span>

                            <button
                                type="button"
                                onClick={handleNextPage}
                                disabled={pageNumber >= totalPages}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </>
            )}

            {isDeleteModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
                    onClick={closeDeleteConfirmation}
                >
                    <div
                        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                            <h2 className="text-xl font-semibold text-slate-900">
                                Delete Selected Customers
                            </h2>

                            <button
                                type="button"
                                onClick={closeDeleteConfirmation}
                                disabled={isDeleting}
                                className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label="Close delete confirmation"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        <div className="px-6 py-7">
                            <p className="text-sm text-slate-600">
                                Are you sure you want to delete{' '}
                                {pendingDeleteIds.length} selected customer
                                {pendingDeleteIds.length === 1 ? '' : 's'}?
                            </p>

                            <p className="mt-3 text-sm font-medium text-red-600">
                                This action cannot be undone.
                            </p>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
                            <button
                                type="button"
                                onClick={closeDeleteConfirmation}
                                disabled={isDeleting}
                                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isDeleting
                                    ? 'Deleting...'
                                    : 'Delete Selected'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <div>
                                <h2 className="text-xl font-semibold text-slate-900">
                                    Add Customer
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Create a new customer account
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeAddCustomerModal}
                                disabled={creatingCustomer}
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form
                            onSubmit={handleCreateCustomer}
                            className="space-y-4 p-6"
                        >
                            {createError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                                    {createError}
                                </div>
                            )}

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Owner Name
                                </label>

                                <input
                                    type="text"
                                    name="ownerName"
                                    value={newCustomer.ownerName}
                                    onChange={handleNewCustomerChange}
                                    required
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                    placeholder="Enter owner name"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Company Name
                                </label>

                                <input
                                    type="text"
                                    name="companyName"
                                    value={newCustomer.companyName}
                                    onChange={handleNewCustomerChange}
                                    required
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                    placeholder="Enter company name"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Owner Phone
                                </label>

                                <input
                                    type="tel"
                                    name="ownerPhone"
                                    value={newCustomer.ownerPhone}
                                    onChange={handleNewCustomerChange}
                                    required
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                    placeholder="Enter phone number"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Owner Email
                                </label>

                                <input
                                    type="email"
                                    name="ownerEmail"
                                    value={newCustomer.ownerEmail}
                                    onChange={handleNewCustomerChange}
                                    required
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                    placeholder="Enter email address"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">
                                    Industry
                                </label>

                                <input
                                    type="text"
                                    name="industry"
                                    value={newCustomer.industry}
                                    onChange={handleNewCustomerChange}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                    placeholder="Enter industry"
                                />
                            </div>

                            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                                <button
                                    type="button"
                                    onClick={closeAddCustomerModal}
                                    disabled={creatingCustomer}
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={creatingCustomer}
                                    className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-50"
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

            {isDetailsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <div>
                                <h2 className="text-xl font-semibold text-slate-900">
                                    Customer Details
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    View customer information
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeDetailsModal}
                                disabled={loadingDetails}
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6">
                            {loadingDetails ? (
                                <div className="flex items-center justify-center py-12">
                                    <RefreshCw
                                        size={24}
                                        className="animate-spin text-slate-500"
                                    />
                                </div>
                            ) : selectedCustomer ? (
                                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                    <div>
                                        <p className="text-sm text-slate-500">
                                            Owner Name
                                        </p>

                                        <p className="mt-1 font-medium text-slate-900">
                                            {selectedCustomer.ownerName || '-'}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-sm text-slate-500">
                                            Company Name
                                        </p>

                                        <p className="mt-1 font-medium text-slate-900">
                                            {selectedCustomer.companyName || '-'}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-sm text-slate-500">
                                            Email
                                        </p>

                                        <p className="mt-1 break-all font-medium text-slate-900">
                                            {selectedCustomer.ownerEmail || '-'}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-sm text-slate-500">
                                            Phone
                                        </p>

                                        <p className="mt-1 font-medium text-slate-900">
                                            {selectedCustomer.ownerPhone || '-'}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-sm text-slate-500">
                                            Industry
                                        </p>

                                        <p className="mt-1 font-medium text-slate-900">
                                            {selectedCustomer.industry || '-'}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-sm text-slate-500">
                                            Status
                                        </p>

                                        <p className="mt-1 font-medium text-slate-900">
                                            {selectedCustomer.status || '-'}
                                        </p>
                                    </div>

                                    <div className="md:col-span-2">
                                        <p className="text-sm text-slate-500">
                                            Customer ID
                                        </p>

                                        <p className="mt-1 break-all font-medium text-slate-900">
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
                                className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <div>
                                <h2 className="text-xl font-semibold text-slate-900">
                                    Edit Customer
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Update customer information
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeEditModal}
                                disabled={updatingCustomer}
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form
                            onSubmit={handleUpdateCustomer}
                            className="space-y-4 p-6"
                        >
                            {updateError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                                    {updateError}
                                </div>
                            )}

                            {!editingCustomer && !updateError && (
                                <div className="flex items-center justify-center py-10">
                                    <RefreshCw
                                        size={24}
                                        className="animate-spin text-slate-500"
                                    />
                                </div>
                            )}

                            {editingCustomer && (
                                <>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">
                                            Owner Name
                                        </label>

                                        <input
                                            type="text"
                                            name="ownerName"
                                            value={editingCustomer.ownerName}
                                            onChange={handleEditCustomerChange}
                                            required
                                            disabled={updatingCustomer}
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                                            placeholder="Enter owner name"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">
                                            Company Name
                                        </label>

                                        <input
                                            type="text"
                                            name="companyName"
                                            value={editingCustomer.companyName}
                                            onChange={handleEditCustomerChange}
                                            required
                                            disabled={updatingCustomer}
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                                            placeholder="Enter company name"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">
                                            Owner Phone
                                        </label>

                                        <input
                                            type="tel"
                                            name="ownerPhone"
                                            value={editingCustomer.ownerPhone}
                                            onChange={handleEditCustomerChange}
                                            required
                                            disabled={updatingCustomer}
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                                            placeholder="Enter phone number"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">
                                            Industry
                                        </label>

                                        <input
                                            type="text"
                                            name="industry"
                                            value={editingCustomer.industry}
                                            onChange={handleEditCustomerChange}
                                            disabled={updatingCustomer}
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                                            placeholder="Enter industry"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                                        <button
                                            type="button"
                                            onClick={closeEditModal}
                                            disabled={updatingCustomer}
                                            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={updatingCustomer}
                                            className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {updatingCustomer
                                                ? 'Saving...'
                                                : 'Save Changes'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </form>
                    </div>
                </div>
            )}

            {isEmailModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <div>
                                <h2 className="text-xl font-semibold text-slate-900">
                                    Change Customer Email
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Update the email address associated with this customer
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeEmailModal}
                                disabled={updatingEmail}
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form
                            onSubmit={handleUpdateEmail}
                            className="space-y-4 p-6"
                        >
                            {emailError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                                    {emailError}
                                </div>
                            )}

                            {!emailCustomer && !emailError ? (
                                <div className="flex items-center justify-center py-10">
                                    <RefreshCw
                                        size={24}
                                        className="animate-spin text-slate-500"
                                    />
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">
                                            Customer
                                        </label>

                                        <input
                                            type="text"
                                            value={
                                                emailCustomer?.companyName ?? ''
                                            }
                                            disabled
                                            className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-slate-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-slate-700">
                                            New Email
                                        </label>

                                        <input
                                            type="email"
                                            value={newEmail}
                                            onChange={(event) =>
                                                setNewEmail(event.target.value)
                                            }
                                            required
                                            disabled={updatingEmail}
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                                            placeholder="Enter new email address"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                                        <button
                                            type="button"
                                            onClick={closeEmailModal}
                                            disabled={updatingEmail}
                                            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={updatingEmail}
                                            className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-50"
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
    );
}