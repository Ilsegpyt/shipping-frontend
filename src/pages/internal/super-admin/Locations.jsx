import { useEffect, useMemo, useState } from 'react';

import {
    Plus,
    Search,
    RefreshCw,
    MoreHorizontal,
    Pencil,
    Ban,
    RotateCcw,
    MapPin,
    Building2,
    CheckCircle2,
    XCircle,
    X,
    AlertTriangle,
} from 'lucide-react';

import api from '../../../services/api';

const EMPTY_FORM = {
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    ceoName: '',
    ceoEmail: '',
    gmName: '',
    gmEmail: '',
    branchManagerName: '',
    branchManagerEmail: '',
    isActive: true,
};

const isLocationActive = (location) => {
    const value = location?.isActive;

    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'number') {
        return value === 1;
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();

        if (
            normalized === 'true' ||
            normalized === '1' ||
            normalized === 'active'
        ) {
            return true;
        }

        if (
            normalized === 'false' ||
            normalized === '0' ||
            normalized === 'inactive'
        ) {
            return false;
        }
    }

    return false;
};

export default function Locations() {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [showInactive, setShowInactive] = useState(false);

    const [openActionsId, setOpenActionsId] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);

    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    const [deactivateLocation, setDeactivateLocation] = useState(null);
    const [deactivating, setDeactivating] = useState(false);

    const loadLocations = async () => {
        try {
            setLoading(true);
            setError('');
            setOpenActionsId(null);

            const response = await api.get('/api/website/branches');

            const data = Array.isArray(response.data)
                ? response.data
                : response.data?.value ??
                response.data?.items ??
                response.data?.data ??
                [];

            setLocations(data);
        } catch (err) {
            console.error('Failed to load locations:', err);
            setError('Failed to load locations.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLocations();
    }, []);

    const activeLocations = useMemo(
        () => locations.filter((location) => isLocationActive(location)),
        [locations]
    );

    const inactiveLocations = useMemo(
        () => locations.filter((location) => !isLocationActive(location)),
        [locations]
    );

    const filteredLocations = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        return locations.filter((location) => {
            const active = isLocationActive(location);

            if (!showInactive && !active) {
                return false;
            }

            if (!normalizedSearch) {
                return true;
            }

            return [
                location.name,
                location.address,
                location.ceoName,
                location.gmName,
                location.branchManagerName,
                location.ceoEmail,
                location.gmEmail,
                location.branchManagerEmail,
            ]
                .filter(Boolean)
                .some((value) =>
                    String(value)
                        .toLowerCase()
                        .includes(normalizedSearch)
                );
        });
    }, [locations, searchTerm, showInactive]);

    const openCreateModal = () => {
        setEditingLocation(null);
        setForm(EMPTY_FORM);
        setFormError('');
        setIsModalOpen(true);
        setOpenActionsId(null);
    };

    const openEditModal = async (location) => {
        try {
            setFormError('');
            setOpenActionsId(null);

            const response = await api.get(
                `/api/website/branches/${location.id}`
            );

            const item = response.data;

            setEditingLocation(item);

            setForm({
                name: item.name ?? '',
                address: item.address ?? '',
                latitude: item.latitude ?? '',
                longitude: item.longitude ?? '',
                ceoName: item.ceoName ?? '',
                ceoEmail: item.ceoEmail ?? '',
                gmName: item.gmName ?? '',
                gmEmail: item.gmEmail ?? '',
                branchManagerName: item.branchManagerName ?? '',
                branchManagerEmail: item.branchManagerEmail ?? '',
                isActive: isLocationActive(item),
            });

            setIsModalOpen(true);
        } catch (err) {
            console.error('Failed to load location:', err);
            setError('Failed to load location details.');
        }
    };

    const closeModal = () => {
        if (saving) {
            return;
        }

        setIsModalOpen(false);
        setEditingLocation(null);
        setForm(EMPTY_FORM);
        setFormError('');
    };

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;

        setForm((current) => ({
            ...current,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            setSaving(true);
            setFormError('');

            const payload = {
                name: form.name.trim(),
                address: form.address.trim(),
                latitude: Number(form.latitude),
                longitude: Number(form.longitude),
                ceoName: form.ceoName.trim(),
                ceoEmail: form.ceoEmail.trim(),
                gmName: form.gmName.trim(),
                gmEmail: form.gmEmail.trim(),
                branchManagerName: form.branchManagerName.trim(),
                branchManagerEmail: form.branchManagerEmail.trim(),
                isActive: form.isActive,
            };

            if (editingLocation) {
                await api.put(
                    `/api/website/branches/${editingLocation.id}`,
                    payload
                );
            } else {
                await api.post('/api/website/branches', payload);
            }

            closeModal();
            await loadLocations();
        } catch (err) {
            console.error('Failed to save location:', err);

            const message =
                err.response?.data?.error ||
                err.response?.data?.message ||
                'Failed to save location.';

            setFormError(message);
        } finally {
            setSaving(false);
        }
    };

    const openDeactivateModal = (location) => {
        setOpenActionsId(null);
        setDeactivateLocation(location);
    };

    const closeDeactivateModal = () => {
        if (deactivating) {
            return;
        }

        setDeactivateLocation(null);
    };

    const handleDeactivate = async () => {
        if (!deactivateLocation) {
            return;
        }

        try {
            setDeactivating(true);
            setError('');

            await api.delete(
                `/api/website/branches/${deactivateLocation.id}`
            );

            setDeactivateLocation(null);

            await loadLocations();
        } catch (err) {
            console.error('Failed to deactivate location:', err);

            setError(
                err.response?.data?.error ||
                err.response?.data?.message ||
                'Failed to deactivate location.'
            );
        } finally {
            setDeactivating(false);
        }
    };

    const handleRestore = async (location) => {
        try {
            setOpenActionsId(null);
            setError('');

            await api.patch(
                `/api/website/branches/${location.id}/restore`
            );

            await loadLocations();

            setShowInactive(true);
        } catch (err) {
            console.error('Failed to restore location:', err);

            setError(
                err.response?.data?.error ||
                err.response?.data?.message ||
                'Failed to restore location.'
            );
        }
    };

    return (
        <div className="min-h-full">
            {/* Page Header */}
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-slate-900">
                        Locations
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                        Manage ILS branches and office locations.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                    <Plus className="h-4 w-4" />
                    Add Location
                </button>
            </div>

            {/* Statistics */}
            <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
                            <MapPin className="h-5 w-5" />
                        </div>

                        <div>
                            <p className="text-xs text-slate-500">
                                Total Locations
                            </p>

                            <p className="mt-1 text-lg font-semibold text-slate-900">
                                {locations.length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>

                        <div>
                            <p className="text-xs text-slate-500">
                                Active Locations
                            </p>

                            <p className="mt-1 text-lg font-semibold text-slate-900">
                                {activeLocations.length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
                            <XCircle className="h-5 w-5" />
                        </div>

                        <div>
                            <p className="text-xs text-slate-500">
                                Inactive Locations
                            </p>

                            <p className="mt-1 text-lg font-semibold text-slate-900">
                                {inactiveLocations.length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Card */}
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                {/* Toolbar */}
                <div className="flex flex-col gap-3 border-b border-slate-200 p-3 md:flex-row md:items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) =>
                                setSearchTerm(event.target.value)
                            }
                            placeholder="Search locations..."
                            className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-1 focus:ring-slate-200"
                        />
                    </div>

                    <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 text-sm text-slate-600">
                        <input
                            type="checkbox"
                            checked={showInactive}
                            onChange={(event) =>
                                setShowInactive(event.target.checked)
                            }
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                        />

                        Show inactive
                    </label>

                    <button
                        type="button"
                        onClick={loadLocations}
                        disabled={loading}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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
                    <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                        {error}
                    </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/70">
                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    Location
                                </th>

                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    Address
                                </th>

                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    Management
                                </th>

                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    Status
                                </th>

                                <th className="w-14 px-4 py-3"></th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan="5"
                                        className="px-4 py-12 text-center text-sm text-slate-500"
                                    >
                                        Loading locations...
                                    </td>
                                </tr>
                            ) : filteredLocations.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan="5"
                                        className="px-4 py-12 text-center"
                                    >
                                        <div className="flex flex-col items-center">
                                            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                                                <MapPin className="h-5 w-5" />
                                            </div>

                                            <p className="text-sm font-medium text-slate-700">
                                                No locations found
                                            </p>

                                            <p className="mt-1 text-xs text-slate-400">
                                                Try changing your search or add
                                                a new location.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredLocations.map((location) => {
                                    const active =
                                        isLocationActive(location);

                                    return (
                                        <tr
                                            key={location.id}
                                            className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50"
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-50 text-slate-500">
                                                        <Building2 className="h-4 w-4" />
                                                    </div>

                                                    <div>
                                                        <p className="text-sm font-medium text-slate-800">
                                                            {location.name}
                                                        </p>

                                                        <p className="mt-0.5 text-xs text-slate-400">
                                                            {
                                                                location.latitude
                                                            }
                                                            ,{' '}
                                                            {
                                                                location.longitude
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="max-w-md px-4 py-3">
                                                <p className="truncate text-sm text-slate-600">
                                                    {location.address || '—'}
                                                </p>
                                            </td>

                                            <td className="px-4 py-3">
                                                <div className="space-y-0.5">
                                                    <p className="text-xs text-slate-600">
                                                        {location.branchManagerName ||
                                                            'No branch manager'}
                                                    </p>

                                                    <p className="text-xs text-slate-400">
                                                        {location.branchManagerEmail ||
                                                            '—'}
                                                    </p>
                                                </div>
                                            </td>

                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${active
                                                            ? 'bg-slate-100 text-slate-700'
                                                            : 'bg-red-50 text-red-600'
                                                        }`}
                                                >
                                                    {active
                                                        ? 'Active'
                                                        : 'Inactive'}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3">
                                                <div className="relative flex justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setOpenActionsId(
                                                                openActionsId ===
                                                                    location.id
                                                                    ? null
                                                                    : location.id
                                                            )
                                                        }
                                                        className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                                    >
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </button>

                                                    {openActionsId ===
                                                        location.id && (
                                                            <div className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        openEditModal(
                                                                            location
                                                                        )
                                                                    }
                                                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                    Edit
                                                                </button>

                                                                {active ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            openDeactivateModal(
                                                                                location
                                                                            )
                                                                        }
                                                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                                                    >
                                                                        <Ban className="h-4 w-4" />
                                                                        Deactivate
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            handleRestore(
                                                                                location
                                                                            )
                                                                        }
                                                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
                                                                    >
                                                                        <RotateCcw className="h-4 w-4" />
                                                                        Restore
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                {!loading && (
                    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
                        <p className="text-xs text-slate-400">
                            Showing {filteredLocations.length} of{' '}
                            {showInactive
                                ? locations.length
                                : activeLocations.length}{' '}
                            locations
                        </p>
                    </div>
                )}
            </div>

            {/* Add / Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
                    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <div>
                                <h2 className="text-base font-semibold text-slate-900">
                                    {editingLocation
                                        ? 'Edit Location'
                                        : 'Add Location'}
                                </h2>

                                <p className="mt-0.5 text-xs text-slate-400">
                                    {editingLocation
                                        ? 'Update branch information.'
                                        : 'Add a new ILS branch or office.'}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeModal}
                                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                                <div className="md:col-span-2">
                                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                        Location Name
                                    </label>

                                    <input
                                        name="name"
                                        value={form.name}
                                        onChange={handleChange}
                                        required
                                        className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                        Address
                                    </label>

                                    <textarea
                                        name="address"
                                        value={form.address}
                                        onChange={handleChange}
                                        required
                                        rows={3}
                                        className="w-full resize-none rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                        Latitude
                                    </label>

                                    <input
                                        name="latitude"
                                        type="number"
                                        step="any"
                                        value={form.latitude}
                                        onChange={handleChange}
                                        required
                                        className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                        Longitude
                                    </label>

                                    <input
                                        name="longitude"
                                        type="number"
                                        step="any"
                                        value={form.longitude}
                                        onChange={handleChange}
                                        required
                                        className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200"
                                    />
                                </div>

                                <div className="border-t border-slate-100 pt-4 md:col-span-2">
                                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Management
                                    </p>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                        CEO Name
                                    </label>

                                    <input
                                        name="ceoName"
                                        value={form.ceoName}
                                        onChange={handleChange}
                                        className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                        CEO Email
                                    </label>

                                    <input
                                        name="ceoEmail"
                                        type="email"
                                        value={form.ceoEmail}
                                        onChange={handleChange}
                                        className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                        GM Name
                                    </label>

                                    <input
                                        name="gmName"
                                        value={form.gmName}
                                        onChange={handleChange}
                                        className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                        GM Email
                                    </label>

                                    <input
                                        name="gmEmail"
                                        type="email"
                                        value={form.gmEmail}
                                        onChange={handleChange}
                                        className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                        Branch Manager Name
                                    </label>

                                    <input
                                        name="branchManagerName"
                                        value={form.branchManagerName}
                                        onChange={handleChange}
                                        className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-slate-600">
                                        Branch Manager Email
                                    </label>

                                    <input
                                        name="branchManagerEmail"
                                        type="email"
                                        value={form.branchManagerEmail}
                                        onChange={handleChange}
                                        className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200"
                                    />
                                </div>

                                <label className="flex items-center gap-2 md:col-span-2">
                                    <input
                                        type="checkbox"
                                        name="isActive"
                                        checked={form.isActive}
                                        onChange={handleChange}
                                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                                    />

                                    <span className="text-sm text-slate-600">
                                        Active location
                                    </span>
                                </label>

                                {formError && (
                                    <div className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600 md:col-span-2">
                                        {formError}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50/50 px-5 py-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    disabled={saving}
                                    className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {saving
                                        ? 'Saving...'
                                        : editingLocation
                                            ? 'Save Changes'
                                            : 'Create Location'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Deactivate Confirmation Modal */}
            {deactivateLocation && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                                    <AlertTriangle className="h-5 w-5" />
                                </div>

                                <div className="flex-1">
                                    <h2 className="text-base font-semibold text-slate-900">
                                        Deactivate Location
                                    </h2>

                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        Are you sure you want to deactivate{' '}
                                        <span className="font-semibold text-slate-800">
                                            "{deactivateLocation.name}"
                                        </span>
                                        ?
                                    </p>

                                    <p className="mt-2 text-xs leading-5 text-red-600">
                                        This location will no longer appear
                                        among active locations.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={closeDeactivateModal}
                                    disabled={deactivating}
                                    className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50/50 px-6 py-4">
                            <button
                                type="button"
                                onClick={closeDeactivateModal}
                                disabled={deactivating}
                                className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleDeactivate}
                                disabled={deactivating}
                                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Ban className="h-4 w-4" />

                                {deactivating
                                    ? 'Deactivating...'
                                    : 'Deactivate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}