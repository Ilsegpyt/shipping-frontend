import { useEffect, useMemo, useState } from "react";
import {
    Search,
    Users,
    Building2,
    Mail,
    ChevronDown,
    ChevronRight,
    CheckCircle2,
    XCircle,
    UserPlus,
    UserMinus,
} from "lucide-react";

import {
    getAccountManagerAssignments,
    getUnassignedCustomers,
    assignAccountManager,
    changeAccountManager,
    removeAccountManager,
} from "../../../services/accountManagerAssignmentsService";

const PAGE_SIZE = 10;

export default function AccountManagerAssignments() {
    const [assignments, setAssignments] = useState([]);
    const [unassignedCustomers, setUnassignedCustomers] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState("managers");

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
                "Failed to load account manager assignments."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadAssignments();
    }, []);

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
                error?.response?.data?.error ||
                "Failed to assign customer."
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
                error?.response?.data?.error ||
                "Failed to change account manager."
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
                error?.response?.data?.error ||
                "Failed to remove account manager."
            );
        } finally {
            setRemoving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold text-slate-900">
                    Account Managers
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                    Manage account managers and customer assignments.
                </p>
            </div>

            {/* Loading */}
            {loading && (
                <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
                    <p className="text-sm text-slate-500">
                        Loading account managers...
                    </p>
                </div>
            )}

            {/* Error */}
            {!loading && error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
                    <p className="text-sm text-red-700">
                        {error}
                    </p>
                </div>
            )}

            {!loading && !error && (
                <>
                    {/* Summary */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {/* Account Managers */}
                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                            <div className="flex items-center gap-4">
                                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100">
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
                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                            <div className="flex items-center gap-4">
                                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100">
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
                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                            <div className="flex items-center gap-4">
                                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100">
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
                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                            <div className="flex items-center gap-4">
                                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100">
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

                    {/* Search */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                            <input
                                type="text"
                                value={search}
                                onChange={(event) =>
                                    setSearch(
                                        event.target.value
                                    )
                                }
                                placeholder={
                                    activeTab === "managers"
                                        ? "Search account manager or customer..."
                                        : "Search customer or owner..."
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                            />
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="border-b border-slate-200">
                        <div className="flex gap-6">
                            <button
                                type="button"
                                onClick={() =>
                                    setActiveTab("managers")
                                }
                                className={`border-b-2 pb-3 text-sm font-medium transition ${activeTab === "managers"
                                        ? "border-slate-900 text-slate-900"
                                        : "border-transparent text-slate-500 hover:text-slate-700"
                                    }`}
                            >
                                Account Managers
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    setActiveTab("customers")
                                }
                                className={`border-b-2 pb-3 text-sm font-medium transition ${activeTab === "customers"
                                        ? "border-slate-900 text-slate-900"
                                        : "border-transparent text-slate-500 hover:text-slate-700"
                                    }`}
                            >
                                Unassigned Customers
                            </button>
                        </div>
                    </div>

                    {/* Account Managers Tab */}
                    {activeTab === "managers" && (
                        <div>
                            <div className="mb-3">
                                <h2 className="text-lg font-semibold text-slate-900">
                                    Account Managers
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Customers currently assigned to each account manager.
                                </p>
                            </div>

                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
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
                                        <table className="w-full min-w-[900px]">
                                            <thead>
                                                <tr className="border-b border-slate-200 bg-slate-50">
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
                                                        const isExpanded =
                                                            expandedManagers[
                                                            manager.accountManagerId
                                                            ];

                                                        return (
                                                            <tr
                                                                key={
                                                                    manager.accountManagerId
                                                                }
                                                                className="border-b border-slate-100 last:border-b-0"
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
                                                                                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
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
                                                                                <div className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
                                                                                    <Building2 className="mx-auto h-7 w-7 text-slate-300" />

                                                                                    <p className="mt-2 text-sm font-medium text-slate-700">
                                                                                        No customers assigned
                                                                                    </p>

                                                                                    <p className="mt-1 text-xs text-slate-500">
                                                                                        This account manager currently has no customers.
                                                                                    </p>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                                                                    <table className="w-full min-w-[850px]">
                                                                                        <thead>
                                                                                            <tr className="border-b border-slate-200 bg-slate-50">
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
                                                                                                        className="border-b border-slate-100 last:border-b-0"
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
                                                                                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                                                                                                                    <XCircle className="h-3.5 w-3.5" />
                                                                                                                    Deleted
                                                                                                                </span>
                                                                                                            ) : customer.isActive ? (
                                                                                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                                                                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                                                                                    Active
                                                                                                                </span>
                                                                                                            ) : (
                                                                                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                                                                                                                    <XCircle className="h-3.5 w-3.5" />
                                                                                                                    Suspended
                                                                                                                </span>
                                                                                                            )}
                                                                                                        </td>

                                                                                                        <td className="px-4 py-3">
                                                                                                            <div className="flex items-center justify-end gap-2">
                                                                                                                {!customer.isDeleted &&
                                                                                                                    customer.isActive && (
                                                                                                                        <>
                                                                                                                            <button
                                                                                                                                type="button"
                                                                                                                                onClick={() =>
                                                                                                                                    openChangeModal(
                                                                                                                                        customer,
                                                                                                                                        manager.accountManagerId
                                                                                                                                    )
                                                                                                                                }
                                                                                                                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                                                                                                                            >
                                                                                                                                <UserPlus className="h-3.5 w-3.5" />
                                                                                                                                Change Manager
                                                                                                                            </button>

                                                                                                                            <button
                                                                                                                                type="button"
                                                                                                                                onClick={() =>
                                                                                                                                    openRemoveModal(
                                                                                                                                        customer
                                                                                                                                    )
                                                                                                                                }
                                                                                                                                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                                                                                                                            >
                                                                                                                                <UserMinus className="h-3.5 w-3.5" />
                                                                                                                                Remove
                                                                                                                            </button>
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
                                <h2 className="text-lg font-semibold text-slate-900">
                                    Unassigned Customers
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Customers that are not currently assigned to any account manager.
                                </p>
                            </div>

                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
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
                                                <tr className="border-b border-slate-200 bg-slate-50">
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
                                                            className="border-b border-slate-100 last:border-b-0"
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
                                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                                                                        <XCircle className="h-3.5 w-3.5" />
                                                                        Deleted
                                                                    </span>
                                                                ) : customer.isActive ? (
                                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                                        Active
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                                                                        <XCircle className="h-3.5 w-3.5" />
                                                                        Suspended
                                                                    </span>
                                                                )}
                                                            </td>

                                                            <td className="px-5 py-4 text-right">
                                                                {!customer.isDeleted &&
                                                                    customer.isActive && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                openAssignModal(
                                                                                    customer
                                                                                )
                                                                            }
                                                                            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-800"
                                                                        >
                                                                            <UserPlus className="h-3.5 w-3.5" />
                                                                            Assign
                                                                        </button>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
                        <div className="border-b border-slate-200 px-6 py-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">
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
                                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <XCircle className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-5 px-6 py-5">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
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
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
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
                                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                                    <p className="text-sm text-red-700">
                                        {assignError}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
                            <button
                                type="button"
                                onClick={closeAssignModal}
                                disabled={assigning}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleAssign}
                                disabled={
                                    assigning ||
                                    !selectedAccountManagerId
                                }
                                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {assigning
                                    ? "Assigning..."
                                    : "Assign Customer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Account Manager Modal */}
            {changeModalCustomer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
                        <div className="border-b border-slate-200 px-6 py-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">
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
                                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <XCircle className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-5 px-6 py-5">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
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
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50"
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
                                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                                    <p className="text-sm text-red-700">
                                        {changeError}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
                            <button
                                type="button"
                                onClick={
                                    closeChangeModal
                                }
                                disabled={changing}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={
                                    handleChangeAccountManager
                                }
                                disabled={
                                    changing ||
                                    !selectedNewAccountManagerId
                                }
                                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {changing
                                    ? "Changing..."
                                    : "Change Manager"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Remove Account Manager Modal */}
            {removeModalCustomer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
                        <div className="border-b border-slate-200 px-6 py-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">
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
                                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <XCircle className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-5 px-6 py-5">
                            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-4">
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
                                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                                    <p className="text-sm text-red-700">
                                        {removeError}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
                            <button
                                type="button"
                                onClick={closeRemoveModal}
                                disabled={removing}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={
                                    handleRemoveAccountManager
                                }
                                disabled={removing}
                                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <UserMinus className="h-4 w-4" />

                                {removing
                                    ? "Removing..."
                                    : "Remove Manager"}
                            </button>
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
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
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
                        className={`h-8 min-w-8 rounded-lg px-2 text-xs font-medium transition ${pageNumber === page
                                ? "bg-slate-900 text-white"
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
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Next
                </button>
            </div>
        </div>
    );
}