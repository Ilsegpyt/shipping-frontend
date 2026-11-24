import "../../../components/dashboard/dashboard-ui.css";
import { DashboardStatusBadge, DashboardPageHeader, DashboardToolbar, DashboardSearchField, DashboardActionMenu, DashboardActionItem, DashboardButton } from "../../../components/dashboard/DashboardUI";
import { useEffect, useMemo, useState } from "react";
import {
    Users,
    Building2,
    Mail,
    ChevronDown,
    ChevronRight,
    CheckCircle2,
    XCircle,
    UserPlus,
    UserMinus,
    MoreHorizontal,
} from "lucide-react";

import {
    getAccountManagerAssignments,
    getUnassignedCustomers,
    assignAccountManager,
    changeAccountManager,
    removeAccountManager,
} from "../../../services/accountManagerAssignmentsService";
import { extractApiErrorMessage } from "../../../utils/errorUtils";

const PAGE_SIZE = 10;

export default function AccountManagerAssignments() {
    const [assignments, setAssignments] = useState([]);
    const [unassignedCustomers, setUnassignedCustomers] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState("managers");
    const [openActionsId, setOpenActionsId] = useState(null);
    useEffect(() => {
        if (openActionsId === null) return;
        const dismiss = (event) => {
            if (event.type === 'keydown') {
                if (event.key === 'Escape') setOpenActionsId(null);
                return;
            }
            if (!event.target.closest('.ils-dashboard-action-menu, .ils-dashboard-action-trigger')) {
                setOpenActionsId(null);
            }
        };
        document.addEventListener('pointerdown', dismiss);
        document.addEventListener('keydown', dismiss);
        return () => {
            document.removeEventListener('pointerdown', dismiss);
            document.removeEventListener('keydown', dismiss);
        };
    }, [openActionsId]);

    const [expandedManagers, setExpandedManagers] = useState({});

    const [managerPage, setManagerPage] = useState(1);
    const [customerPage, setCustomerPage] = useState(1);

    // Assign modal
    const [assignModalCustomer, setAssignModalCustomer] =
        useState(null);

    const [selectedAccountManagerId, setSelectedAccountManagerId] =
        useState("");

    const [assigning, setAssigning] = useState(false);
    const [assignError, setAssignError] = useState("");

    // Change manager modal
    const [changeModalCustomer, setChangeModalCustomer] =
        useState(null);

    const [changeModalCurrentManagerId, setChangeModalCurrentManagerId] =
        useState("");

    const [selectedNewAccountManagerId, setSelectedNewAccountManagerId] =
        useState("");

    const [changing, setChanging] = useState(false);
    const [changeError, setChangeError] = useState("");

    // Remove manager modal
    const [removeModalCustomer, setRemoveModalCustomer] =
        useState(null);

    const [removing, setRemoving] = useState(false);
    const [removeError, setRemoveError] = useState("");

    async function loadAssignments() {
        try {
            setLoading(true);
            setError("");

            const [
                assignmentsResult,
                unassignedCustomersResult,
            ] = await Promise.all([
                getAccountManagerAssignments(),
                getUnassignedCustomers(),
            ]);

            setAssignments(
                Array.isArray(assignmentsResult)
                    ? assignmentsResult
                    : []
            );

            setUnassignedCustomers(
                Array.isArray(unassignedCustomersResult)
                    ? unassignedCustomersResult
                    : []
            );
        } catch (error) {
            console.error(error);
            setError(
                extractApiErrorMessage(error, "Failed to load account manager assignments.")
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadAssignments();
    }, []);

    // Auto-clear page error after 5 seconds so it doesn't get stuck permanently
    useEffect(() => {
        if (!error) return;
        const timer = setTimeout(() => setError(""), 5000);
        return () => clearTimeout(timer);
    }, [error]);

    const filteredAssignments = useMemo(() => {
        const term = search.trim().toLowerCase();

        if (!term) {
            return assignments;
        }

        return assignments.filter((manager) => {
            const managerMatches =
                manager.accountManagerName
                    ?.toLowerCase()
                    .includes(term) ||
                manager.accountManagerEmail
                    ?.toLowerCase()
                    .includes(term);

            const customerMatches = manager.customers?.some(
                (customer) =>
                    customer.companyName
                        ?.toLowerCase()
                        .includes(term) ||
                    customer.ownerName
                        ?.toLowerCase()
                        .includes(term)
            );

            return managerMatches || customerMatches;
        });
    }, [assignments, search]);

    const filteredUnassignedCustomers = useMemo(() => {
        const term = search.trim().toLowerCase();

        if (!term) {
            return unassignedCustomers;
        }

        return unassignedCustomers.filter(
            (customer) =>
                customer.companyName
                    ?.toLowerCase()
                    .includes(term) ||
                customer.ownerName
                    ?.toLowerCase()
                    .includes(term)
        );
    }, [unassignedCustomers, search]);

    const assignedAccountManagersCount = useMemo(() => {
        return assignments.filter(
            (manager) =>
                (manager.customers?.length ?? 0) > 0
        ).length;
    }, [assignments]);

    const assignedCustomersCount = useMemo(() => {
        return assignments.reduce(
            (total, manager) =>
                total + (manager.customers?.length ?? 0),
            0
        );
    }, [assignments]);

    const managerTotalPages = Math.max(
        1,
        Math.ceil(
            filteredAssignments.length / PAGE_SIZE
        )
    );

    const customerTotalPages = Math.max(
        1,
        Math.ceil(
            filteredUnassignedCustomers.length / PAGE_SIZE
        )
    );

    const paginatedManagers = useMemo(() => {
        const startIndex =
            (managerPage - 1) * PAGE_SIZE;

        return filteredAssignments.slice(
            startIndex,
            startIndex + PAGE_SIZE
        );
    }, [filteredAssignments, managerPage]);

    const paginatedUnassignedCustomers = useMemo(() => {
        const startIndex =
            (customerPage - 1) * PAGE_SIZE;

        return filteredUnassignedCustomers.slice(
            startIndex,
            startIndex + PAGE_SIZE
        );
    }, [
        filteredUnassignedCustomers,
        customerPage,
    ]);

    useEffect(() => {
        setManagerPage(1);
        setCustomerPage(1);
    }, [search]);

    useEffect(() => {
        if (managerPage > managerTotalPages) {
            setManagerPage(managerTotalPages);
        }
    }, [managerPage, managerTotalPages]);

    useEffect(() => {
        if (customerPage > customerTotalPages) {
            setCustomerPage(customerTotalPages);
        }
    }, [customerPage, customerTotalPages]);

    const toggleManager = (managerId) => {
        setExpandedManagers((current) => ({
            ...current,
            [managerId]: !current[managerId],
        }));
    };

    // =========================
    // Assign
    // =========================

    const openAssignModal = (customer) => {
        setAssignModalCustomer(customer);
        setSelectedAccountManagerId("");
        setAssignError("");
    };

    const closeAssignModal = () => {
        if (assigning) {
            return;
        }

        setAssignModalCustomer(null);
        setSelectedAccountManagerId("");
        setAssignError("");
    };

    const handleAssign = async () => {
        if (
            !assignModalCustomer ||
            !selectedAccountManagerId
        ) {
            return;
        }

        try {
            setAssigning(true);
            setAssignError("");

            await assignAccountManager(
                selectedAccountManagerId,
                assignModalCustomer.customerId
            );

            closeAssignModal();

            await loadAssignments();
        } catch (error) {
            console.error(error);
            setAssignError(
                extractApiErrorMessage(error, "Failed to assign customer.")
            );
        } finally {
            setAssigning(false);
        }
    };

    // =========================
    // Change Manager
    // =========================

    const openChangeModal = (
        customer,
        currentManagerId
    ) => {
        setChangeModalCustomer(customer);
        setChangeModalCurrentManagerId(
            currentManagerId
        );
        setSelectedNewAccountManagerId("");
        setChangeError("");
    };

    const closeChangeModal = () => {
        if (changing) {
            return;
        }

        setChangeModalCustomer(null);
        setChangeModalCurrentManagerId("");
        setSelectedNewAccountManagerId("");
        setChangeError("");
    };

    const handleChangeAccountManager = async () => {
        if (
            !changeModalCustomer ||
            !selectedNewAccountManagerId
        ) {
            return;
        }

        try {
            setChanging(true);
            setChangeError("");

            await changeAccountManager(
                changeModalCustomer.customerId,
                selectedNewAccountManagerId
            );

            closeChangeModal();

            await loadAssignments();
        } catch (error) {
            console.error(error);
            setChangeError(
                extractApiErrorMessage(error, "Failed to change account manager.")
            );
        } finally {
            setChanging(false);
        }
    };

    // =========================
    // Remove Manager
    // =========================

    const openRemoveModal = (customer) => {
        setRemoveModalCustomer(customer);
        setRemoveError("");
    };

    const closeRemoveModal = () => {
        if (removing) {
            return;
        }

        setRemoveModalCustomer(null);
        setRemoveError("");
    };

    const handleRemoveAccountManager = async () => {
        if (!removeModalCustomer) {
            return;
        }

        try {
            setRemoving(true);
            setRemoveError("");

            await removeAccountManager(
                removeModalCustomer.customerId
            );

            closeRemoveModal();

            await loadAssignments();
        } catch (error) {
            console.error(error);
            setRemoveError(
                extractApiErrorMessage(error, "Failed to remove account manager.")
            );
        } finally {
            setRemoving(false);
        }
    };

    return (
        <div className="ils-dashboard-page space-y-6">
            {/* Shared management header: same component as Users and Roles */}
            <DashboardPageHeader
                title="Account Managers"
                description="Manage account managers and customer assignments."
            />

            {/* Loading */}
            {loading && (
                <div className="rounded-none border border-slate-200 bg-white px-6 py-12 text-center">
                    <p className="text-sm text-slate-500">
                        Loading account managers...
                    </p>
                </div>
            )}

            {/* Error */}
            {!loading && error && (
                <div className="flex items-center justify-between rounded-none border border-red-200 bg-red-50 px-5 py-4 shadow-xs transition">
                    <p className="text-sm text-red-700">
                        {error}
                    </p>
                    <button
                        type="button"
                        onClick={() => setError("")}
                        className="text-red-400 hover:text-red-700 font-bold px-2 py-0.5 rounded-none cursor-pointer"
                        title="إغلاق"
                    >
                        ✕
                    </button>
                </div>
            )}

            {!loading && !error && (
                <>
                    {/* Summary */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {/* Account Managers */}
                        <div className="rounded-none border border-slate-200 bg-white p-5">
                            <div className="flex items-center gap-4">
                                <div className="flex h-11 w-11 items-center justify-center rounded-none bg-slate-100">
                                    <Users className="h-5 w-5 text-slate-700" />
                                </div>

                                <div>
                                    <p className="text-sm text-slate-500">
                                        Account Managers
                                    </p>

                                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                                        {assignments.length}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Assigned Account Managers */}
                        <div className="rounded-none border border-slate-200 bg-white p-5">
                            <div className="flex items-center gap-4">
                                <div className="flex h-11 w-11 items-center justify-center rounded-none bg-slate-100">
                                    <Users className="h-5 w-5 text-slate-700" />
                                </div>

                                <div>
                                    <p className="text-sm text-slate-500">
                                        Assigned Account Managers
                                    </p>

                                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                                        {assignedAccountManagersCount}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Assigned Customers */}
                        <div className="rounded-none border border-slate-200 bg-white p-5">
                            <div className="flex items-center gap-4">
                                <div className="flex h-11 w-11 items-center justify-center rounded-none bg-slate-100">
                                    <Building2 className="h-5 w-5 text-slate-700" />
                                </div>

                                <div>
                                    <p className="text-sm text-slate-500">
                                        Assigned Customers
                                    </p>

                                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                                        {assignedCustomersCount}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Unassigned Customers */}
                        <div className="rounded-none border border-slate-200 bg-white p-5">
                            <div className="flex items-center gap-4">
                                <div className="flex h-11 w-11 items-center justify-center rounded-none bg-slate-100">
                                    <Building2 className="h-5 w-5 text-slate-700" />
                                </div>

                                <div>
                                    <p className="text-sm text-slate-500">
                                        Unassigned Customers
                                    </p>

                                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                                        {unassignedCustomers.length}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Shared toolbar and search: preserve page-owned filtering */}
                    <DashboardToolbar>
                        <DashboardSearchField
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder={activeTab === "managers"
                                ? "Search by manager name, email, customer company, or owner..."
                                : "Search by customer company, owner, or email..."}
                        />
                    </DashboardToolbar>

                    {/* Tabs */}
                    <div className="ils-dashboard-tabs" role="tablist" aria-label="Account manager views">
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    setActiveTab("managers")
                                }
                                className={`ils-dashboard-tab ${activeTab === "managers" ? "ils-dashboard-tab--active" : ""}`}
                                role="tab"
                                aria-selected={activeTab === "managers"}
                            >
                                Account Managers
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    setActiveTab("customers")
                                }
                                className={`ils-dashboard-tab ${activeTab === "customers" ? "ils-dashboard-tab--active" : ""}`}
                                role="tab"
                                aria-selected={activeTab === "customers"}
                            >
                                Unassigned Customers
                            </button>
                        </div>
                    </div>

                    {/* Account Managers Tab */}
                    {activeTab === "managers" && (
                        <div>
                            <div className="mb-3">
                                <h2 className="text-lg font-semibold text-brand-primary">
                                    Account Managers
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Customers currently assigned to each account manager.
                                </p>
                            </div>

                            <div className="ils-dashboard-table-surface">
                                {paginatedManagers.length === 0 ? (
                                    <div className="px-6 py-12 text-center">
                                        <Users className="mx-auto h-8 w-8 text-slate-300" />

                                        <p className="mt-3 text-sm font-medium text-slate-700">
                                            No account managers found
                                        </p>

                                        <p className="mt-1 text-sm text-slate-500">
                                            Try changing your search.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="ils-dashboard-table w-full min-w-[900px]">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="w-8 px-4 py-3"></th>

                                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                        Account Manager
                                                    </th>

                                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                        Email
                                                    </th>

                                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                        Customers
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {paginatedManagers.map(
                                                    (manager) => {
                                                        const isExpanded = search.trim()
                                                            ? true
                                                            : Boolean(expandedManagers[manager.accountManagerId]);

                                                        return (
                                                            <tr
                                                                key={
                                                                    manager.accountManagerId
                                                                }
                                                                className="border-b last:border-b-0"
                                                            >
                                                                <td
                                                                    colSpan={4}
                                                                    className="p-0"
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            toggleManager(
                                                                                manager.accountManagerId
                                                                            )
                                                                        }
                                                                        className="flex w-full items-center text-left transition hover:bg-slate-50"
                                                                    >
                                                                        <div className="flex w-8 shrink-0 justify-center">
                                                                            {isExpanded ? (
                                                                                <ChevronDown className="h-4 w-4 text-slate-400" />
                                                                            ) : (
                                                                                <ChevronRight className="h-4 w-4 text-slate-400" />
                                                                            )}
                                                                        </div>

                                                                        <div className="grid flex-1 grid-cols-[1.2fr_1.5fr_100px] items-center gap-4 px-5 py-4">
                                                                            <div>
                                                                                <div className="flex items-center gap-2">
                                                                                    <Users className="h-4 w-4 text-slate-400" />

                                                                                    <span className="text-sm font-medium text-slate-900">
                                                                                        {
                                                                                            manager.accountManagerName
                                                                                        }
                                                                                    </span>
                                                                                </div>
                                                                            </div>

                                                                            <div className="flex items-center gap-2">
                                                                                <Mail className="h-4 w-4 text-slate-400" />

                                                                                <span className="text-sm text-slate-600">
                                                                                    {
                                                                                        manager.accountManagerEmail
                                                                                    }
                                                                                </span>
                                                                            </div>

                                                                            <div>
                                                                                <span className="inline-flex rounded-none bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                                                                    {
                                                                                        manager
                                                                                            .customers
                                                                                            ?.length ??
                                                                                        0
                                                                                    }{" "}
                                                                                    {(
                                                                                        manager
                                                                                            .customers
                                                                                            ?.length ??
                                                                                        0
                                                                                    ) ===
                                                                                        1
                                                                                        ? "Customer"
                                                                                        : "Customers"}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </button>

                                                                    {isExpanded && (
                                                                        <div className="border-t border-slate-100 bg-slate-50 px-12 py-4">
                                                                            {(
                                                                                manager
                                                                                    .customers
                                                                                    ?.length ??
                                                                                0
                                                                            ) ===
                                                                                0 ? (
                                                                                <div className="rounded-none border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
                                                                                    <Building2 className="mx-auto h-7 w-7 text-slate-300" />

                                                                                    <p className="mt-2 text-sm font-medium text-slate-700">
                                                                                        No customers assigned
                                                                                    </p>

                                                                                    <p className="mt-1 text-xs text-slate-500">
                                                                                        This account manager currently has no customers.
                                                                                    </p>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="overflow-x-auto rounded-none border border-slate-200 bg-white">
                                                                                    <table className="w-full min-w-[850px]">
                                                                                        <thead>
                                                                                            <tr className="border-b">
                                                                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                                                                    Customer
                                                                                                </th>

                                                                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                                                                    Owner
                                                                                                </th>

                                                                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                                                                    Status
                                                                                                </th>

                                                                                                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                                                                    Action
                                                                                                </th>
                                                                                            </tr>
                                                                                        </thead>

                                                                                        <tbody>
                                                                                            {manager.customers.map(
                                                                                                (
                                                                                                    customer
                                                                                                ) => (
                                                                                                    <tr
                                                                                                        key={
                                                                                                            customer.customerId
                                                                                                        }
                                                                                                        className="border-b last:border-b-0"
                                                                                                    >
                                                                                                        <td className="px-4 py-3">
                                                                                                            <div className="flex items-center gap-2">
                                                                                                                <Building2 className="h-4 w-4 text-slate-400" />

                                                                                                                <span className="text-sm font-medium text-slate-900">
                                                                                                                    {
                                                                                                                        customer.companyName
                                                                                                                    }
                                                                                                                </span>
                                                                                                            </div>
                                                                                                        </td>

                                                                                                        <td className="px-4 py-3 text-sm text-slate-600">
                                                                                                            {
                                                                                                                customer.ownerName
                                                                                                            }
                                                                                                        </td>

                                                                                                        <td className="px-4 py-3">
                                                                                                            {customer.isDeleted ? (
                                                                                                                <DashboardStatusBadge tone="negative">Deleted</DashboardStatusBadge>
                                                                                                            ) : customer.isActive ? (
                                                                                                                <DashboardStatusBadge tone="positive">Active</DashboardStatusBadge>
                                                                                                            ) : (
                                                                                                                <DashboardStatusBadge tone="negative">Inactive</DashboardStatusBadge>
                                                                                                            )}
                                                                                                        </td>

                                                                                                        <td className="px-4 py-3">
                                                                                                            <div className="flex items-center justify-end gap-2">
                                                                                                                {!customer.isDeleted &&
                                                                                                                    customer.isActive && (
                                                                                                                        <>
                                                                                                                                                                                                                                                        <button
                                                                                                                                type="button"
                                                                                                                                id={`assignment-actions-${customer.customerId}`}
                                                                                                                                aria-label="Assignment actions"
                                                                                                                                aria-haspopup="menu"
                                                                                                                                aria-expanded={openActionsId === customer.customerId}
                                                                                                                                className="ils-dashboard-action-trigger"
                                                                                                                                onClick={() => setOpenActionsId(current => current === customer.customerId ? null : customer.customerId)}
                                                                                                                            >
                                                                                                                                <MoreHorizontal size={18} />
                                                                                                                            </button>
                                                                                                                            {openActionsId === customer.customerId && (
                                                                                                                                <DashboardActionMenu anchorId={`assignment-actions-${customer.customerId}`}>
                                                                                                                                    <DashboardActionItem action="change-manager" onClick={() => { setOpenActionsId(null); openChangeModal(customer, manager.accountManagerId); }} />
                                                                                                                                    <div className="ils-dashboard-action-separator" role="separator" />
                                                                                                                                    <DashboardActionItem action="remove" onClick={() => { setOpenActionsId(null); openRemoveModal(customer); }} />
                                                                                                                                </DashboardActionMenu>
                                                                                                                            )}

                                                                                                                        </>
                                                                                                                    )}
                                                                                                            </div>
                                                                                                        </td>
                                                                                                    </tr>
                                                                                                )
                                                                                            )}
                                                                                        </tbody>
                                                                                    </table>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    }
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Manager Pagination */}
                                {filteredAssignments.length >
                                    PAGE_SIZE && (
                                        <Pagination
                                            page={managerPage}
                                            totalPages={
                                                managerTotalPages
                                            }
                                            totalItems={
                                                filteredAssignments.length
                                            }
                                            pageSize={PAGE_SIZE}
                                            onPageChange={
                                                setManagerPage
                                            }
                                        />
                                    )}
                            </div>
                        </div>
                    )}

                    {/* Unassigned Customers Tab */}
                    {activeTab === "customers" && (
                        <div>
                            <div className="mb-3">
                                <h2 className="text-lg font-semibold text-brand-primary">
                                    Unassigned Customers
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Customers that are not currently assigned to any account manager.
                                </p>
                            </div>

                            <div className="ils-dashboard-table-surface">
                                {paginatedUnassignedCustomers.length ===
                                    0 ? (
                                    <div className="px-6 py-12 text-center">
                                        <Building2 className="mx-auto h-8 w-8 text-slate-300" />

                                        <p className="mt-3 text-sm font-medium text-slate-700">
                                            No unassigned customers found
                                        </p>

                                        <p className="mt-1 text-sm text-slate-500">
                                            All customers are currently assigned or no customer matches your search.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[800px]">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                        Customer
                                                    </th>

                                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                        Owner
                                                    </th>

                                                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                        Status
                                                    </th>

                                                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                        Action
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {paginatedUnassignedCustomers.map(
                                                    (customer) => (
                                                        <tr
                                                            key={
                                                                customer.customerId
                                                            }
                                                            className="border-b last:border-b-0"
                                                        >
                                                            <td className="px-5 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <Building2 className="h-4 w-4 text-slate-400" />

                                                                    <span className="text-sm font-medium text-slate-900">
                                                                        {
                                                                            customer.companyName
                                                                        }
                                                                    </span>
                                                                </div>
                                                            </td>

                                                            <td className="px-5 py-4 text-sm text-slate-600">
                                                                {
                                                                    customer.ownerName
                                                                }
                                                            </td>

                                                            <td className="px-5 py-4">
                                                                {customer.isDeleted ? (
                                                                    <DashboardStatusBadge tone="negative">Deleted</DashboardStatusBadge>
                                                                ) : customer.isActive ? (
                                                                    <DashboardStatusBadge tone="positive">Active</DashboardStatusBadge>
                                                                ) : (
                                                                    <DashboardStatusBadge tone="negative">Inactive</DashboardStatusBadge>
                                                                )}
                                                            </td>

                                                            <td className="px-5 py-4 text-right">
                                                                {!customer.isDeleted &&
                                                                    customer.isActive && (
                                                                        <DashboardButton variant="primary" icon={UserPlus} onClick={() => openAssignModal(customer)}>Assign</DashboardButton>
                                                                    )}
                                                            </td>
                                                        </tr>
                                                    )
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Customer Pagination */}
                                {filteredUnassignedCustomers.length >
                                    PAGE_SIZE && (
                                        <Pagination
                                            page={customerPage}
                                            totalPages={
                                                customerTotalPages
                                            }
                                            totalItems={
                                                filteredUnassignedCustomers.length
                                            }
                                            pageSize={PAGE_SIZE}
                                            onPageChange={
                                                setCustomerPage
                                            }
                                        />
                                    )}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Assign Modal */}
            {assignModalCustomer && (
                <div className="ils-dashboard-modal-overlay">
                    <div className="ils-dashboard-modal-panel">
                        <div className="ils-dashboard-modal-header">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-semibold text-brand-primary">
                                        Assign Customer
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Assign this customer to an Account Manager.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={closeAssignModal}
                                    disabled={assigning}
                                    className="rounded-none p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <XCircle className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="ils-dashboard-modal-body">
                            <div className="rounded-none border border-slate-200 bg-slate-50 px-4 py-3">
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Customer
                                </p>

                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                    {
                                        assignModalCustomer.companyName
                                    }
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                    {
                                        assignModalCustomer.ownerName
                                    }
                                </p>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    Account Manager
                                </label>

                                <select
                                    value={
                                        selectedAccountManagerId
                                    }
                                    onChange={(event) =>
                                        setSelectedAccountManagerId(
                                            event.target.value
                                        )
                                    }
                                    disabled={assigning}
                                    className="ils-dashboard-modal-select"
                                >
                                    <option value="">
                                        Select Account Manager
                                    </option>

                                    {assignments.map(
                                        (manager) => (
                                            <option
                                                key={
                                                    manager.accountManagerId
                                                }
                                                value={
                                                    manager.accountManagerId
                                                }
                                            >
                                                {
                                                    manager.accountManagerName
                                                }
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            {assignError && (
                                <div className="rounded-none border border-red-200 bg-red-50 px-4 py-3">
                                    <p className="text-sm text-red-700">
                                        {assignError}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="ils-dashboard-modal-footer">
                            <DashboardButton variant="secondary"
                                type="button"
                                onClick={closeAssignModal}
                                disabled={assigning}
                            >
                                Cancel
                            </DashboardButton>

                            <DashboardButton variant="primary"
                                type="button"
                                onClick={handleAssign}
                                disabled={
                                    assigning ||
                                    !selectedAccountManagerId
                                }
                            >
                                {assigning
                                    ? "Assigning..."
                                    : "Assign Customer"}
                            </DashboardButton>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Account Manager Modal */}
            {changeModalCustomer && (
                <div className="ils-dashboard-modal-overlay">
                    <div className="ils-dashboard-modal-panel">
                        <div className="ils-dashboard-modal-header">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-semibold text-brand-primary">
                                        Change Account Manager
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Move this customer to another Account Manager.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={
                                        closeChangeModal
                                    }
                                    disabled={changing}
                                    className="rounded-none p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <XCircle className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="ils-dashboard-modal-body">
                            <div className="rounded-none border border-slate-200 bg-slate-50 px-4 py-3">
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                    Customer
                                </p>

                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                    {
                                        changeModalCustomer.companyName
                                    }
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                    {
                                        changeModalCustomer.ownerName
                                    }
                                </p>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                    New Account Manager
                                </label>

                                <select
                                    value={
                                        selectedNewAccountManagerId
                                    }
                                    onChange={(event) =>
                                        setSelectedNewAccountManagerId(
                                            event.target.value
                                        )
                                    }
                                    disabled={changing}
                                    className="ils-dashboard-modal-select"
                                >
                                    <option value="">
                                        Select Account Manager
                                    </option>

                                    {assignments
                                        .filter(
                                            (manager) =>
                                                manager.accountManagerId !==
                                                changeModalCurrentManagerId
                                        )
                                        .map(
                                            (manager) => (
                                                <option
                                                    key={
                                                        manager.accountManagerId
                                                    }
                                                    value={
                                                        manager.accountManagerId
                                                    }
                                                >
                                                    {
                                                        manager.accountManagerName
                                                    }
                                                </option>
                                            )
                                        )}
                                </select>
                            </div>

                            {changeError && (
                                <div className="rounded-none border border-red-200 bg-red-50 px-4 py-3">
                                    <p className="text-sm text-red-700">
                                        {changeError}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="ils-dashboard-modal-footer">
                            <DashboardButton variant="secondary"
                                type="button"
                                onClick={
                                    closeChangeModal
                                }
                                disabled={changing}
                            >
                                Cancel
                            </DashboardButton>

                            <DashboardButton variant="primary"
                                type="button"
                                onClick={
                                    handleChangeAccountManager
                                }
                                disabled={
                                    changing ||
                                    !selectedNewAccountManagerId
                                }
                            >
                                {changing
                                    ? "Changing..."
                                    : "Change Manager"}
                            </DashboardButton>
                        </div>
                    </div>
                </div>
            )}

            {/* Remove Account Manager Modal */}
            {removeModalCustomer && (
                <div className="ils-dashboard-modal-overlay">
                    <div className="ils-dashboard-modal-panel">
                        <div className="ils-dashboard-modal-header">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-semibold text-brand-primary">
                                        Remove Account Manager
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Remove the current Account Manager assignment from this customer.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={closeRemoveModal}
                                    disabled={removing}
                                    className="rounded-none p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <XCircle className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="ils-dashboard-modal-body">
                            <div className="rounded-none border border-red-200 bg-red-50 px-4 py-4">
                                <div className="flex items-start gap-3">
                                    <UserMinus className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />

                                    <div>
                                        <p className="text-sm font-semibold text-red-800">
                                            Are you sure?
                                        </p>

                                        <p className="mt-1 text-sm text-red-700">
                                            This will remove the Account Manager assignment from:
                                        </p>

                                        <p className="mt-2 text-sm font-semibold text-red-900">
                                            {
                                                removeModalCustomer.companyName
                                            }
                                        </p>

                                        <p className="mt-1 text-xs text-red-700">
                                            {
                                                removeModalCustomer.ownerName
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {removeError && (
                                <div className="rounded-none border border-red-200 bg-red-50 px-4 py-3">
                                    <p className="text-sm text-red-700">
                                        {removeError}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="ils-dashboard-modal-footer">
                            <DashboardButton variant="secondary"
                                type="button"
                                onClick={closeRemoveModal}
                                disabled={removing}
                            >
                                Cancel
                            </DashboardButton>

                            <DashboardButton variant="danger"
                                type="button"
                                onClick={
                                    handleRemoveAccountManager
                                }
                                disabled={removing}
                            >
                                <UserMinus className="h-4 w-4" />

                                {removing
                                    ? "Removing..."
                                    : "Remove Manager"}
                            </DashboardButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Pagination({
    page,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
}) {
    const start =
        totalItems === 0
            ? 0
            : (page - 1) * pageSize + 1;

    const end = Math.min(
        page * pageSize,
        totalItems
    );

    return (
        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
                Showing {start}-{end} of {totalItems}
            </p>

            <div className="flex items-center gap-1">
                <button
                    type="button"
                    disabled={page === 1}
                    onClick={() =>
                        onPageChange(page - 1)
                    }
                    className="rounded-none border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Previous
                </button>

                {Array.from(
                    { length: totalPages },
                    (_, index) => index + 1
                ).map((pageNumber) => (
                    <button
                        key={pageNumber}
                        type="button"
                        onClick={() =>
                            onPageChange(pageNumber)
                        }
                        className={`h-8 min-w-8 rounded-none px-2 text-xs font-medium transition ${pageNumber === page
                                ? "bg-brand-primary text-white"
                                : "text-slate-600 hover:bg-slate-100"
                            }`}
                    >
                        {pageNumber}
                    </button>
                ))}

                <button
                    type="button"
                    disabled={
                        page === totalPages
                    }
                    onClick={() =>
                        onPageChange(page + 1)
                    }
                    className="rounded-none border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Next
                </button>
            </div>
        </div>
    );
}