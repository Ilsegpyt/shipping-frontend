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
} from "lucide-react";

import { getAccountManagerAssignments } from "../../../services/accountManagerAssignmentsService";

export default function AccountManagerAssignments() {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [expandedManagers, setExpandedManagers] = useState({});

    async function loadAssignments() {
        try {
            setLoading(true);
            setError("");

            const result = await getAccountManagerAssignments();

            setAssignments(Array.isArray(result) ? result : []);
        } catch (error) {
            console.error(error);
            setError("Failed to load account manager assignments.");
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

    const assignedCustomersCount = useMemo(() => {
        return assignments.reduce(
            (total, manager) =>
                total + (manager.customers?.length ?? 0),
            0
        );
    }, [assignments]);

    const toggleManager = (managerId) => {
        setExpandedManagers((current) => ({
            ...current,
            [managerId]: !current[managerId],
        }));
    };

    return (
        <div className="space-y-6">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold text-slate-900">
                    Account Managers
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                    View account managers and the customers assigned to each manager.
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
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

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
                    </div>

                    {/* Search */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                            <input
                                type="text"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search account manager or customer..."
                                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                            />
                        </div>
                    </div>

                    {/* Managers */}
                    <div className="space-y-4">
                        {filteredAssignments.length === 0 ? (
                            <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
                                <Users className="mx-auto h-8 w-8 text-slate-300" />

                                <p className="mt-3 text-sm font-medium text-slate-700">
                                    No account managers found
                                </p>

                                <p className="mt-1 text-sm text-slate-500">
                                    Try changing your search.
                                </p>
                            </div>
                        ) : (
                            filteredAssignments.map((manager) => {
                                const isExpanded =
                                    expandedManagers[
                                    manager.accountManagerId
                                    ];

                                return (
                                    <div
                                        key={manager.accountManagerId}
                                        className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                                    >
                                        {/* Manager Header */}
                                        <button
                                            type="button"
                                            onClick={() =>
                                                toggleManager(
                                                    manager.accountManagerId
                                                )
                                            }
                                            className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50"
                                        >
                                            <div className="flex min-w-0 items-center gap-4">
                                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-white">
                                                    {manager.accountManagerName
                                                        ?.charAt(0)
                                                        ?.toUpperCase()}
                                                </div>

                                                <div className="min-w-0">
                                                    <h2 className="truncate text-sm font-semibold text-slate-900">
                                                        {manager.accountManagerName}
                                                    </h2>

                                                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                                                        <Mail className="h-3.5 w-3.5" />

                                                        <span className="truncate">
                                                            {manager.accountManagerEmail}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="ml-4 flex shrink-0 items-center gap-4">
                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                                                    {manager.customers?.length ?? 0}{" "}
                                                    {manager.customers?.length === 1
                                                        ? "Customer"
                                                        : "Customers"}
                                                </span>

                                                {isExpanded ? (
                                                    <ChevronDown className="h-5 w-5 text-slate-400" />
                                                ) : (
                                                    <ChevronRight className="h-5 w-5 text-slate-400" />
                                                )}
                                            </div>
                                        </button>

                                        {/* Customers */}
                                        {isExpanded && (
                                            <div className="border-t border-slate-200">
                                                {manager.customers?.length === 0 ? (
                                                    <div className="px-5 py-8 text-center">
                                                        <p className="text-sm text-slate-500">
                                                            No customers assigned.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full min-w-[650px]">
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
                                                                </tr>
                                                            </thead>

                                                            <tbody>
                                                                {manager.customers.map(
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
                                                                        </tr>
                                                                    )
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </>
            )}
        </div>
    );
}