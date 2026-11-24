import { DashboardPage, DashboardPageHeader, DashboardButton, DashboardToolbar, DashboardSearchField, DashboardTableSurface, DashboardStatusBadge, DashboardActionMenu, DashboardActionItem } from "../../../components/dashboard/DashboardUI";
import "../../../components/dashboard/management-locations.css";
import ManagementHeaderTitle from "../../../components/dashboard/ManagementHeaderTitle";
import "../../../components/dashboard/management-heading.css";
import { useEffect, useMemo, useState } from 'react';

import {
    Plus,
    RefreshCw,
    MoreHorizontal,
    Ban,
    MapPin,
    Building2,
    CheckCircle2,
    XCircle,
    X,
    AlertTriangle,
} from 'lucide-react';

import api from '../../../services/api';
import { extractApiErrorMessage } from '../../../utils/errorUtils';

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

    useEffect(() => {
        if (!error) return;
        const timer = setTimeout(() => setError(''), 5000);
        return () => clearTimeout(timer);
    }, [error]);

    useEffect(() => {
        if (!formError) return;
        const timer = setTimeout(() => setFormError(''), 5000);
        return () => clearTimeout(timer);
    }, [formError]);

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
            setError(extractApiErrorMessage(err, 'Failed to load locations.'));
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
            setError(extractApiErrorMessage(err, 'Failed to load location details.'));
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
            setFormError(extractApiErrorMessage(err, 'Failed to save location.'));
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
            setError(extractApiErrorMessage(err, 'Failed to deactivate location.'));
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
            setError(extractApiErrorMessage(err, 'Failed to restore location.'));
        }
    };

    return (
        <DashboardPage className="ils-locations-page">
            <DashboardPageHeader title="Locations" description="Manage ILS branches and office locations." actions={
                <DashboardButton variant="primary" icon={Plus} onClick={openCreateModal}>Add Location</DashboardButton>
            } />

            {/* Statistics */}
            <div className="ils-locations-stats mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-brand-border bg-brand-surface p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-surface-tint text-brand-muted">
                            <MapPin className="h-5 w-5" />
                        </div>

                        <div>
                            <p className="text-xs text-brand-muted">
                                Total Locations
                            </p>

                            <p className="mt-1 text-lg font-semibold text-brand-text">
                                {locations.length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border border-brand-border bg-brand-surface p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-surface-tint text-brand-muted">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>

                        <div>
                            <p className="text-xs text-brand-muted">
                                Active Locations
                            </p>

                            <p className="mt-1 text-lg font-semibold text-brand-text">
                                {activeLocations.length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border border-brand-border bg-brand-surface p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-surface-tint text-brand-muted">
                            <XCircle className="h-5 w-5" />
                        </div>

                        <div>
                            <p className="text-xs text-brand-muted">
                                Inactive Locations
                            </p>

                            <p className="mt-1 text-lg font-semibold text-brand-text">
                                {inactiveLocations.length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Card */}
            <DashboardTableSurface>
                {/* Toolbar */}
                <div className="ils-locations-toolbar ils-dashboard-toolbar">
                    <div className="ils-locations-search">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(event) =>
                                setSearchTerm(event.target.value)
                            }
                            placeholder="Search locations..."
                            className="ils-locations-search-input"
                        />
                    </div>

                    <label className="ils-locations-filter">
                        <input
                            type="checkbox"
                            checked={showInactive}
                            onChange={(event) =>
                                setShowInactive(event.target.checked)
                            }
                            className="h-4 w-4 rounded border-brand-border text-brand-text focus:ring-brand-neutral"
                        />

                        Show inactive
                    </label>

                    <button
                        type="button"
                        onClick={loadLocations}
                        disabled={loading}
                        className="ils-locations-refresh"
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
                    <div className="flex items-center justify-between border-b border-brand-danger-soft bg-brand-danger-soft px-4 py-3 text-sm text-brand-danger">
                        <span>{error}</span>
                        <button
                            type="button"
                            onClick={() => setError('')}
                            className="ml-3 text-brand-danger hover:text-brand-danger font-bold"
                            title="Close"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full ils-locations-data-table">
                        <thead>
                            <tr className="border-b border-brand-border bg-brand-surface-tint/70">
                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-brand-muted">
                                    Location
                                </th>

                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-brand-muted">
                                    Address
                                </th>

                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-brand-muted">
                                    Management
                                </th>

                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-brand-muted">
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
                                        className="px-4 py-12 text-center text-sm text-brand-muted"
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
                                            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-surface-tint text-brand-neutral">
                                                <MapPin className="h-5 w-5" />
                                            </div>

                                            <p className="text-sm font-medium text-brand-text">
                                                No locations found
                                            </p>

                                            <p className="mt-1 text-xs text-brand-neutral">
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
                                            className="border-b border-brand-border last:border-b-0 hover:bg-brand-surface-tint/50"
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-surface-tint text-brand-muted">
                                                        <Building2 className="h-4 w-4" />
                                                    </div>

                                                    <div>
                                                        <p className="text-sm font-medium text-brand-text">
                                                            {location.name}
                                                        </p>

                                                        <p className="mt-0.5 text-xs text-brand-neutral">
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
                                                <p className="truncate text-sm text-brand-muted">
                                                    {location.address || '—'}
                                                </p>
                                            </td>

                                            <td className="px-4 py-3">
                                                <div className="space-y-0.5">
                                                    <p className="text-xs text-brand-muted">
                                                        {location.branchManagerName ||
                                                            'No branch manager'}
                                                    </p>

                                                    <p className="text-xs text-brand-neutral">
                                                        {location.branchManagerEmail ||
                                                            '—'}
                                                    </p>
                                                </div>
                                            </td>

                                            <td className="px-4 py-3">
                                                <DashboardStatusBadge tone={active ? 'positive' : 'negative'}>
                                                    {active ? 'Active' : 'Inactive'}
                                                </DashboardStatusBadge>
                                            </td>

                                            <td className="px-4 py-3">
                                                <div className="relative flex justify-end">
                                                    <button
                                                        id={`location-actions-${location.id}`}
                                                        aria-label={`Actions for ${location.name}`}
                                                        aria-expanded={openActionsId === location.id}
                                                        type="button"
                                                        onClick={() =>
                                                            setOpenActionsId(
                                                                openActionsId ===
                                                                    location.id
                                                                    ? null
                                                                    : location.id
                                                            )
                                                        }
                                                        className="ils-locations-actions-trigger"
                                                    >
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </button>

                                                    {openActionsId ===
                                                        location.id && (
                                                            <DashboardActionMenu anchorId={`location-actions-${location.id}`} width={224}>
                                                                <DashboardActionItem action="edit" onClick={() => openEditModal(location)} />
                                                                {active ? (
                                                                    <DashboardActionItem action="deactivate" onClick={() => openDeactivateModal(location)} />
                                                                ) : (
                                                                    <DashboardActionItem action="activate" onClick={() => handleRestore(location)} />
                                                                )}
                                                            </DashboardActionMenu>
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
                    <div className="flex items-center justify-between border-t border-brand-border px-4 py-3">
                        <p className="text-xs text-brand-neutral">
                            Showing {filteredLocations.length} of{' '}
                            {showInactive
                                ? locations.length
                                : activeLocations.length}{' '}
                            locations
                        </p>
                    </div>
                )}
            </DashboardTableSurface>

            {/* Add / Edit Modal — shared dashboard visual system */}
            {isModalOpen && (
                <div className="ils-dashboard-modal-overlay ils-locations-modal-overlay" role="presentation">
                    <div className="ils-dashboard-modal-panel ils-locations-form-modal" role="dialog" aria-modal="true" aria-labelledby="ils-location-dialog-title">
                        <div className="ils-dashboard-modal-header ils-locations-dialog-header">
                            <div className="ils-locations-dialog-heading">
                                <div className="ils-locations-dialog-icon"><MapPin size={19} aria-hidden="true" /></div>
                                <div>
                                    <h2 id="ils-location-dialog-title" className="ils-locations-dialog-title">
                                        {editingLocation ? 'Edit Location' : 'Add Location'}
                                    </h2>
                                    <p className="ils-locations-dialog-subtitle">
                                        {editingLocation ? 'Update branch information.' : 'Add a new ILS branch or office.'}
                                    </p>
                                </div>
                            </div>
                            <button type="button" onClick={closeModal} className="ils-locations-dialog-close" aria-label="Close location form">
                                <X size={19} aria-hidden="true" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="ils-locations-dialog-form">
                            <div className="ils-locations-dialog-scroll">
                                <div className="ils-locations-form-grid">
                                <div className="md:col-span-2">
                                    <label className="ils-locations-label">
                                        Location Name
                                    </label>

                                    <input
                                        name="name"
                                        value={form.name}
                                        onChange={handleChange}
                                        required
                                        className="ils-locations-field"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="ils-locations-label">
                                        Address
                                    </label>

                                    <textarea
                                        name="address"
                                        value={form.address}
                                        onChange={handleChange}
                                        required
                                        rows={3}
                                        className="ils-locations-field ils-locations-textarea"
                                    />
                                </div>

                                <div>
                                    <label className="ils-locations-label">
                                        Latitude
                                    </label>

                                    <input
                                        name="latitude"
                                        type="number"
                                        step="any"
                                        value={form.latitude}
                                        onChange={handleChange}
                                        required
                                        className="ils-locations-field"
                                    />
                                </div>

                                <div>
                                    <label className="ils-locations-label">
                                        Longitude
                                    </label>

                                    <input
                                        name="longitude"
                                        type="number"
                                        step="any"
                                        value={form.longitude}
                                        onChange={handleChange}
                                        required
                                        className="ils-locations-field"
                                    />
                                </div>

                                <div className="ils-locations-section-divider md:col-span-2">
                                    <p className="ils-locations-section-title">
                                        Management
                                    </p>
                                </div>

                                <div>
                                    <label className="ils-locations-label">
                                        CEO Name
                                    </label>

                                    <input
                                        name="ceoName"
                                        value={form.ceoName}
                                        onChange={handleChange}
                                        className="ils-locations-field"
                                    />
                                </div>

                                <div>
                                    <label className="ils-locations-label">
                                        CEO Email
                                    </label>

                                    <input
                                        name="ceoEmail"
                                        type="email"
                                        value={form.ceoEmail}
                                        onChange={handleChange}
                                        className="ils-locations-field"
                                    />
                                </div>

                                <div>
                                    <label className="ils-locations-label">
                                        GM Name
                                    </label>

                                    <input
                                        name="gmName"
                                        value={form.gmName}
                                        onChange={handleChange}
                                        className="ils-locations-field"
                                    />
                                </div>

                                <div>
                                    <label className="ils-locations-label">
                                        GM Email
                                    </label>

                                    <input
                                        name="gmEmail"
                                        type="email"
                                        value={form.gmEmail}
                                        onChange={handleChange}
                                        className="ils-locations-field"
                                    />
                                </div>

                                <div>
                                    <label className="ils-locations-label">
                                        Branch Manager Name
                                    </label>

                                    <input
                                        name="branchManagerName"
                                        value={form.branchManagerName}
                                        onChange={handleChange}
                                        className="ils-locations-field"
                                    />
                                </div>

                                <div>
                                    <label className="ils-locations-label">
                                        Branch Manager Email
                                    </label>

                                    <input
                                        name="branchManagerEmail"
                                        type="email"
                                        value={form.branchManagerEmail}
                                        onChange={handleChange}
                                        className="ils-locations-field"
                                    />
                                </div>

                                <label className="ils-locations-checkbox-row md:col-span-2">
                                    <input
                                        type="checkbox"
                                        name="isActive"
                                        checked={form.isActive}
                                        onChange={handleChange}
                                        className="ils-locations-checkbox"
                                    />

                                    <span className="ils-locations-checkbox-text">
                                        Active location
                                    </span>
                                </label>

                                {formError && (
                                    <div className="ils-locations-form-error md:col-span-2">
                                        <span>{formError}</span>
                                        <button
                                            type="button"
                                            onClick={() => setFormError('')}
                                            className="ml-3 text-brand-danger hover:text-brand-danger font-bold"
                                            title="Close"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}
                                </div>
                            </div>
                            <div className="ils-dashboard-modal-footer ils-locations-dialog-footer">
                                <button type="button" onClick={closeModal} disabled={saving} className="ils-locations-btn ils-locations-btn--secondary">Cancel</button>
                                <button type="submit" disabled={saving} className="ils-locations-btn ils-locations-btn--primary">
                                    {saving ? 'Saving...' : editingLocation ? 'Save Changes' : 'Create Location'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Deactivate Confirmation Modal */}
            {deactivateLocation && (
                <div className="ils-dashboard-modal-overlay ils-locations-modal-overlay ils-locations-confirm-overlay">
                    <div className="ils-dashboard-modal-panel ils-locations-confirm-modal">
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-danger-soft text-brand-danger">
                                    <AlertTriangle className="h-5 w-5" />
                                </div>

                                <div className="flex-1">
                                    <h2 className="text-base font-semibold text-brand-text">
                                        Deactivate Location
                                    </h2>

                                    <p className="mt-2 text-sm leading-6 text-brand-muted">
                                        Are you sure you want to deactivate{' '}
                                        <span className="font-semibold text-brand-text">
                                            "{deactivateLocation.name}"
                                        </span>
                                        ?
                                    </p>

                                    <p className="mt-2 text-xs leading-5 text-brand-danger">
                                        This location will no longer appear
                                        among active locations.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={closeDeactivateModal}
                                    disabled={deactivating}
                                    className="rounded-md p-1.5 text-brand-neutral transition hover:bg-brand-surface-muted hover:text-brand-text disabled:opacity-50"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="ils-dashboard-modal-footer">
                            <button
                                type="button"
                                onClick={closeDeactivateModal}
                                disabled={deactivating}
                                className="rounded-md border border-brand-border bg-brand-surface px-4 py-2 text-sm font-medium text-brand-muted transition hover:bg-brand-surface-tint disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleDeactivate}
                                disabled={deactivating}
                                className="inline-flex items-center gap-2 rounded-md bg-brand-danger px-4 py-2 text-sm font-medium text-brand-inverse transition hover:bg-brand-danger disabled:cursor-not-allowed disabled:opacity-50"
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
        </DashboardPage>
    );
}