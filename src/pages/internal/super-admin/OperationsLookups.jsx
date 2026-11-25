import ApiFieldError from "../../../components/common/ApiFieldError";
import { DashboardStatusBadge, DashboardPage, DashboardPageHeader, DashboardButton, DashboardTableSurface, DashboardActionMenu, DashboardActionItem } from "../../../components/dashboard/DashboardUI";
import ManagementHeaderTitle from "../../../components/dashboard/ManagementHeaderTitle";
import "../../../components/dashboard/management-heading.css";
import "../../../components/dashboard/management-operations-lookups.css";
import { useEffect, useState } from 'react';
import {
  Anchor,
  MapPin,
  User,
  Ship,
  Truck,
  Car,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  AlertCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Ellipsis
} from 'lucide-react';
import * as opsService from '../../../services/operationsService';
import { extractApiErrorMessage, extractApiFieldErrors } from '../../../utils/errorUtils';

const TABS = [
  { key: 'lines', label: 'Shipping Lines', icon: Ship },
  { key: 'destinations', label: 'Destinations', icon: MapPin },
  { key: 'drivers', label: 'Drivers', icon: User },
  { key: 'ports', label: 'Ports', icon: Anchor },
  { key: 'transporters', label: 'Transporters', icon: Truck },
  { key: 'vehicles', label: 'Vehicles', icon: Car }
];

export default function OperationsLookups() {
  const [activeTab, setActiveTab] = useState('lines');
  const [openActionId, setOpenActionId] = useState(null);
  const [data, setData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'inactive' | 'all'
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [error, setError] = useState('');
    const [lookupFields, setLookupFields] = useState({});
  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    abbreviation: '',
    driverNumber: '',
    mobileNumber: '',
    carNumber: '',
    isActive: true
  });

  // Debounce search term by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Auto-clear page error after 5 seconds so it doesn't get stuck permanently
  useEffect(() => {
    if (!error || addModalOpen || editModalOpen || deleteModalOpen) return;
    const timer = setTimeout(() => setError(''), 5000);
    return () => clearTimeout(timer);
  }, [error, addModalOpen, editModalOpen, deleteModalOpen]);

  const loadData = async (
    tab = activeTab,
    targetPage = page,
    targetPageSize = pageSize,
    targetSearch = debouncedSearch,
    targetStatus = statusFilter
  ) => {
    try {
      setLoading(true);
      setError(''); setLookupFields({});
      const params = {
        page: targetPage,
        pageSize: targetPageSize,
        search: targetSearch.trim() || undefined,
        status: targetStatus
      };

      let result;
      if (tab === 'lines') result = await opsService.getShippingLinesFull(params);
      else if (tab === 'ports') result = await opsService.getPortsFull(params);
      else if (tab === 'destinations') result = await opsService.getDestinationsFull(params);
      else if (tab === 'drivers') result = await opsService.getDriversFull(params);
      else if (tab === 'transporters') result = await opsService.getTransportersFull(params);
      else if (tab === 'vehicles') result = await opsService.getVehiclesFull(params);

      if (result && Array.isArray(result.items)) {
        setData(result.items);
        setTotalCount(result.totalCount ?? 0);
        setActiveCount(result.activeCount ?? 0);
        setInactiveCount(result.inactiveCount ?? 0);
        setTotalPages(result.totalPages || 1);
      } else if (Array.isArray(result)) {
        setData(result);
        setTotalCount(result.length);
        setActiveCount(result.filter((x) => x.isActive !== false && !x.isDeleted).length);
        setInactiveCount(result.filter((x) => x.isActive === false || x.isDeleted).length);
        setTotalPages(Math.max(1, Math.ceil(result.length / targetPageSize)));
      } else {
        setData([]);
        setTotalCount(0);
        setActiveCount(0);
        setInactiveCount(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error(err);
      setError(extractApiErrorMessage(err, 'Failed to load data for ' + tab));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(activeTab, page, pageSize, debouncedSearch, statusFilter);
  }, [activeTab, page, pageSize, debouncedSearch, statusFilter]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('active');
    setPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleStatusFilterChange = (newStatus) => {
    setStatusFilter(newStatus);
    setPage(1);
  };

  // Open Add
  const handleOpenAdd = () => {
    setFormData({
      name: '',
      code: '',
      abbreviation: '',
      driverNumber: '',
      mobileNumber: '',
      carNumber: '',
      isActive: true
    });
    setError(''); setLookupFields({});
    setAddModalOpen(true);
  };

  // Open Edit
  const handleOpenEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      name: item.name || '',
      code: item.code || '',
      abbreviation: item.abbreviation || '',
      driverNumber: item.driverNumber || '',
      mobileNumber: item.mobileNumber || '',
      carNumber: item.carNumber || '',
      isActive: item.isActive !== false
    });
    setError(''); setLookupFields({});
    setEditModalOpen(true);
  };

  // Open Delete / Deactivate
  const handleOpenDelete = (item) => {
    setSelectedItem(item);
    setError(''); setLookupFields({});
    setDeleteModalOpen(true);
  };

  // Submit Add
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(''); setLookupFields({});
      if (activeTab === 'ports') {
        await opsService.createPort({ name: formData.name, code: formData.code || null });
      } else if (activeTab === 'destinations') {
        await opsService.createDestinationItem({ name: formData.name });
      } else if (activeTab === 'drivers') {
        await opsService.createDriver({
          driverNumber: formData.driverNumber,
          name: formData.name,
          mobileNumber: formData.mobileNumber || null
        });
      } else if (activeTab === 'lines') {
        await opsService.createShippingLine({ name: formData.name, abbreviation: formData.abbreviation || null });
      } else if (activeTab === 'transporters') {
        await opsService.createTransporter({ name: formData.name });
      } else if (activeTab === 'vehicles') {
        await opsService.createVehicle({ carNumber: formData.carNumber });
      }

      setAddModalOpen(false);
      setSuccessMsg('Added successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
      await loadData(activeTab);
    } catch (err) {
      console.error(err);
      setLookupFields(extractApiFieldErrors(err));
            setError(extractApiErrorMessage(err, 'Error creating item'));
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Edit
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      setSubmitting(true);
      setError(''); setLookupFields({});
      if (activeTab === 'ports') {
        await opsService.updatePort(selectedItem.id, {
          name: formData.name,
          code: formData.code || null,
          isActive: formData.isActive
        });
      } else if (activeTab === 'destinations') {
        await opsService.updateDestination(selectedItem.id, {
          name: formData.name,
          isActive: formData.isActive
        });
      } else if (activeTab === 'drivers') {
        await opsService.updateDriver(selectedItem.id, {
          driverNumber: formData.driverNumber,
          name: formData.name,
          mobileNumber: formData.mobileNumber || null,
          isActive: formData.isActive
        });
      } else if (activeTab === 'lines') {
        await opsService.updateShippingLine(selectedItem.id, {
          name: formData.name,
          abbreviation: formData.abbreviation || null,
          isActive: formData.isActive
        });
      } else if (activeTab === 'transporters') {
        await opsService.updateTransporter(selectedItem.id, {
          name: formData.name,
          isActive: formData.isActive
        });
      } else if (activeTab === 'vehicles') {
        await opsService.updateVehicle(selectedItem.id, {
          carNumber: formData.carNumber,
          isActive: formData.isActive
        });
      }

      setEditModalOpen(false);
      setSuccessMsg('Updated successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
      await loadData(activeTab);
    } catch (err) {
      console.error(err);
      setLookupFields(extractApiFieldErrors(err));
            setError(extractApiErrorMessage(err, 'Error updating item'));
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Deactivate
  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      setSubmitting(true);
      setError(''); setLookupFields({});
      if (activeTab === 'ports') await opsService.deactivatePort(selectedItem.id);
      else if (activeTab === 'destinations') await opsService.deactivateDestination(selectedItem.id);
      else if (activeTab === 'drivers') await opsService.deactivateDriver(selectedItem.id);
      else if (activeTab === 'lines') await opsService.deactivateShippingLine(selectedItem.id);
      else if (activeTab === 'transporters') await opsService.deactivateTransporter(selectedItem.id);
      else if (activeTab === 'vehicles') await opsService.deactivateVehicle(selectedItem.id);

      setDeleteModalOpen(false);
      setSuccessMsg('Deactivated / Soft-deleted successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
      await loadData(activeTab);
    } catch (err) {
      console.error(err);
      setError(extractApiErrorMessage(err, 'Error deactivating item'));
    } finally {
      setSubmitting(false);
    }
  };

  // Direct Activate / Restore (One-click)
  const handleDirectActivate = async (item) => {
    try {
      setSubmitting(true);
      setError(''); setLookupFields({});
      if (activeTab === 'ports') {
        await opsService.updatePort(item.id, {
          name: item.name,
          code: item.code || null,
          isActive: true
        });
      } else if (activeTab === 'destinations') {
        await opsService.updateDestination(item.id, {
          name: item.name,
          isActive: true
        });
      } else if (activeTab === 'drivers') {
        await opsService.updateDriver(item.id, {
          driverNumber: item.driverNumber,
          name: item.name,
          mobileNumber: item.mobileNumber || null,
          isActive: true
        });
      } else if (activeTab === 'lines') {
        await opsService.updateShippingLine(item.id, {
          name: item.name,
          isActive: true
        });
      } else if (activeTab === 'transporters') {
        await opsService.updateTransporter(item.id, {
          name: item.name,
          isActive: true
        });
      } else if (activeTab === 'vehicles') {
        await opsService.updateVehicle(item.id, {
          carNumber: item.carNumber,
          isActive: true
        });
      }

      setSuccessMsg(`${currentTabObj?.label} activated successfully.`);
      setTimeout(() => setSuccessMsg(''), 3000);
      await loadData(activeTab);
    } catch (err) {
      console.error(err);
      setError(extractApiErrorMessage(err, 'Error activating item'));
    } finally {
      setSubmitting(false);
    }
  };

  const currentTabObj = TABS.find((t) => t.key === activeTab);

  return (
    <DashboardPage className="ils-ops-lookups">
      {/* Header */}
      <DashboardPageHeader
        title="Operations Master Data & Lookups"
        description="Manage Ports, Destinations, Drivers, Shipping Lines, Transporters, and Vehicles."
        actions={<DashboardButton variant="primary" icon={Plus} onClick={handleOpenAdd}>Add {currentTabObj?.label}</DashboardButton>}
      />

      {/* Tabs */}
      <div className="ils-ops-tabs flex border-b border-brand-border overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition whitespace-nowrap ${isActive
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-brand-muted hover:border-brand-border hover:text-brand-text'
                }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-brand-success-soft p-3 text-sm text-brand-success border border-brand-success-border">
          <CheckCircle2 size={16} className="text-brand-success shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-brand-danger-soft p-3 text-sm text-brand-danger border border-brand-danger-border shadow-xs transition">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-brand-danger shrink-0" />
            <span>{error}</span>
          </div>
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

      {/* Filters & Actions Bar */}
      <div className="ils-ops-toolbar flex flex-col gap-3 border bg-brand-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-neutral" />
          <input
            type="text"
            placeholder={`Search ${currentTabObj?.label}...`}
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full rounded-lg border border-brand-border pl-9 pr-4 py-2 text-sm text-brand-text placeholder-brand-neutral focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Buttons ("Active" / "Inactive" / "All") */}
          <div className="inline-flex rounded-lg border border-brand-border bg-brand-surface-tint p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleStatusFilterChange('active')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition ${statusFilter === 'active'
                ? 'bg-brand-surface text-brand-primary-hover shadow-2xs font-bold'
                : 'text-brand-muted hover:text-brand-text'
                }`}
            >
              <CheckCircle2 size={13} className="text-brand-success" />
              <span>Active</span>
              <span
                className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] ${statusFilter === 'active' ? 'bg-brand-surface-blue text-brand-primary-hover' : 'bg-brand-surface-muted/80 text-brand-muted'
                  }`}
              >
                {activeCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleStatusFilterChange('inactive')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition ${statusFilter === 'inactive'
                ? 'bg-brand-danger-soft text-brand-danger shadow-2xs font-bold border border-brand-danger-border'
                : 'text-brand-muted hover:text-brand-danger'
                }`}
              title="View Inactive items"
            >
              <XCircle size={13} className="text-brand-danger" />
              <span>Inactive</span>
              <span
                className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] ${statusFilter === 'inactive' ? 'bg-brand-danger-border text-brand-danger' : 'bg-brand-surface-muted/80 text-brand-muted'
                  }`}
              >
                {inactiveCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleStatusFilterChange('all')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition ${statusFilter === 'all'
                ? 'bg-brand-surface text-brand-text shadow-2xs font-bold'
                : 'text-brand-muted hover:text-brand-text'
                }`}
            >
              <span>All</span>
              <span
                className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] ${statusFilter === 'all' ? 'bg-brand-surface-muted text-brand-text' : 'bg-brand-surface-muted/80 text-brand-muted'
                  }`}
              >
                {activeCount + inactiveCount}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => loadData(activeTab, page, pageSize, debouncedSearch, statusFilter)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm font-medium text-brand-text shadow-2xs hover:bg-brand-surface-tint transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-brand-primary' : 'text-brand-muted'} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <DashboardTableSurface>
      <div className="ils-ops-table-wrapper">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-brand-muted">
            <thead className="border-b border-brand-border bg-brand-surface-tint text-xs font-semibold uppercase tracking-wider text-brand-muted">
              <tr>
                {activeTab === 'ports' && (
                  <>
                    <th className="px-6 py-3.5">Port Name</th>
                    <th className="px-6 py-3.5">Port Code</th>
                  </>
                )}
                {activeTab === 'destinations' && <th className="px-6 py-3.5">Destination Name</th>}
                {activeTab === 'drivers' && (
                  <>
                    <th className="px-6 py-3.5">Driver #</th>
                    <th className="px-6 py-3.5">Driver Name</th>
                    <th className="px-6 py-3.5">Mobile Number</th>
                  </>
                )}
                {activeTab === 'lines' && (<><th className="px-6 py-3.5">Abbreviation</th><th className="px-6 py-3.5">Shipping Line Name</th></>)}
                <>
                  {activeTab === 'transporters' && <th className="px-6 py-3.5">Transporter Name</th>}
                  {activeTab === 'vehicles' && <th className="px-6 py-3.5">Car Number / Plate</th>}
                </>

                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-brand-neutral">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-brand-primary mb-2" />
                    Loading {currentTabObj?.label}...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-brand-neutral">
                    No {statusFilter === 'active' ? 'active ' : statusFilter === 'inactive' ? 'inactive ' : ''}
                    {currentTabObj?.label} found.
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-brand-surface-tint/80 transition">
                    {activeTab === 'ports' && (
                      <>
                        <td className="px-6 py-3.5 font-medium text-brand-text">{item.name}</td>
                        <td className="px-6 py-3.5 font-mono text-xs text-brand-muted">{item.code || '-'}</td>
                      </>
                    )}
                    {activeTab === 'destinations' && (
                      <td className="px-6 py-3.5 font-medium text-brand-text">{item.name}</td>
                    )}
                    {activeTab === 'drivers' && (
                      <>
                        <td className="px-6 py-3.5 font-mono text-xs text-brand-text">{item.driverNumber}</td>
                        <td className="px-6 py-3.5 font-medium text-brand-text">{item.name}</td>
                        <td className="px-6 py-3.5 text-brand-muted">{item.mobileNumber || '-'}</td>
                      </>
                    )}
                    {activeTab === 'lines' && (
                      <>
                        <td className="px-6 py-3.5 font-mono text-xs font-bold text-brand-primary-hover">{item.abbreviation || '-'}</td>
                        <td className="px-6 py-3.5 font-medium text-brand-text">{item.name}</td>
                      </>
                    )}
                    {activeTab === 'transporters' && (
                      <td className="px-6 py-3.5 font-medium text-brand-text">{item.name}</td>
                    )}
                    {activeTab === 'vehicles' && (
                      <td className="px-6 py-3.5 font-bold text-brand-text tracking-wide">{item.carNumber}</td>
                    )}

                    <td className="px-6 py-3.5">
                      {(() => {
                        const isItemActive = item.isActive !== false && !item.isDeleted;
                        return (
                          <DashboardStatusBadge tone={isItemActive ? 'positive' : 'negative'}>
                            {isItemActive ? 'Active' : 'Inactive'}
                          </DashboardStatusBadge>
                        );
                      })()}
                    </td>

                    <td className="px-6 py-3.5 text-right">
                      {(() => {
                        const isItemActive = item.isActive !== false && !item.isDeleted;
                        return (
                          <div className="relative inline-flex justify-end">
                            <button
                              type="button"
                              id={`ops-actions-${activeTab}-${item.id}`}
                              className="ils-dashboard-action-trigger"
                              aria-label={`Actions for ${item.name || item.carNumber || item.driverNumber || 'item'}`}
                              aria-expanded={openActionId === item.id}
                              onClick={() => setOpenActionId((current) => current === item.id ? null : item.id)}
                            >
                              <Ellipsis size={19} />
                            </button>
                            {openActionId === item.id && (
                              <>
                                <button type="button" className="fixed inset-0 z-[999] cursor-default" aria-label="Close actions" onClick={() => setOpenActionId(null)} />
                                <DashboardActionMenu anchorId={`ops-actions-${activeTab}-${item.id}`}>
                                  <DashboardActionItem action="edit" onClick={() => { setOpenActionId(null); handleOpenEdit(item); }} />
                                  <div className="ils-dashboard-action-separator" />
                                  {isItemActive ? (
                                    <DashboardActionItem action="deactivate" onClick={() => { setOpenActionId(null); handleOpenDelete(item); }} />
                                  ) : (
                                    <DashboardActionItem action="activate" disabled={submitting} onClick={() => { setOpenActionId(null); handleDirectActivate(item); }} />
                                  )}
                                </DashboardActionMenu>
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      </DashboardTableSurface>

      {/* Pagination Controls */}
      {!loading && totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-brand-surface border border-brand-border rounded-xl shadow-2xs mt-3">
          <div className="text-xs text-brand-muted flex flex-wrap items-center gap-2">
            <span>
              Showing <span className="font-bold text-brand-text">{totalCount === 0 ? 0 : ((page - 1) * pageSize) + 1}</span> to{' '}
              <span className="font-bold text-brand-text">{Math.min(page * pageSize, totalCount)}</span> of{' '}
              <span className="font-bold text-brand-text">{totalCount.toLocaleString()}</span> entries
            </span>
            <span className="text-brand-neutral">|</span>
            <label className="flex items-center gap-1.5 text-brand-muted">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded border border-brand-border bg-brand-surface-tint px-2 py-1 text-xs font-semibold text-brand-text outline-none focus:border-brand-accent cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </label>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(1)}
              className="p-1.5 rounded-lg border border-brand-border text-brand-muted hover:bg-brand-surface-tint disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="First Page"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-brand-border text-brand-muted hover:bg-brand-surface-tint disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-1 px-2 text-xs font-medium text-brand-text">
              <span>Page</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={page}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 1 && val <= totalPages) {
                    setPage(val);
                  }
                }}
                className="w-14 rounded border border-brand-border bg-brand-surface px-1.5 py-1 text-center text-xs font-bold text-brand-text outline-none focus:border-brand-accent"
              />
              <span>of {totalPages.toLocaleString()}</span>
            </div>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-brand-border text-brand-muted hover:bg-brand-surface-tint disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(totalPages)}
              className="p-1.5 rounded-lg border border-brand-border text-brand-muted hover:bg-brand-surface-tint disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Last Page"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ----------------- ADD MODAL ----------------- */}
      {addModalOpen && (
        <div className="ils-dashboard-modal-overlay">
          <div className="ils-dashboard-modal-panel ils-ops-modal ils-ops-modal--form">
            <div className="ils-dashboard-modal-header flex items-center justify-between">
              <h3 className="text-lg font-bold text-brand-text">Add New {currentTabObj?.label}</h3>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="rounded-lg p-1 text-brand-neutral hover:bg-brand-surface-muted"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="ils-ops-modal-form space-y-4">
{error && <div role="alert" className="border border-brand-danger-border bg-brand-danger-soft p-3 text-sm text-brand-danger">{error}</div>}
              {activeTab === 'ports' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-brand-text mb-1">Port Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alexandria, Port Said, Dekheila"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
                    />
<ApiFieldError errors={lookupFields} field={"name"} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-brand-text mb-1">Port Code</label>
                    <input
                      type="text"
                      placeholder="e.g. EGALY, EGPSD"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm focus:border-brand-accent focus:outline-none uppercase"
                    />
<ApiFieldError errors={lookupFields} field={"code"} />
                  </div>
                </>
              )}

              {activeTab === 'destinations' && (
                <div>
                  <label className="block text-xs font-semibold text-brand-text mb-1">Destination Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10th of Ramadan, 6th of October"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
                  />
<ApiFieldError errors={lookupFields} field={"name"} />
                </div>
              )}

              {activeTab === 'drivers' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-brand-text mb-1">Driver Number / Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. DRV-01, 105"
                      value={formData.driverNumber}
                      onChange={(e) => setFormData({ ...formData, driverNumber: e.target.value })}
                      className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
                    />
<ApiFieldError errors={lookupFields} field={"driverNumber"} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-brand-text mb-1">Driver Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ahmed Mahmoud"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
                    />
<ApiFieldError errors={lookupFields} field={"name"} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-brand-text mb-1">Mobile Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 01012345678"
                      value={formData.mobileNumber}
                      onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                      className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
                    />
<ApiFieldError errors={lookupFields} field={"mobileNumber"} />
                  </div>
                </>
              )}

              {activeTab === 'lines' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-brand-text mb-1">Abbreviation / Code</label>
                    <input
                      type="text"
                      placeholder="e.g. MSC, MSK, CMA, HPL"
                      value={formData.abbreviation}
                      onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
                      className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm focus:border-brand-accent focus:outline-none mb-3"
                    />
<ApiFieldError errors={lookupFields} field={"abbreviation"} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-brand-text mb-1">Shipping Line Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mediterranean Shipping Company"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
                    />
<ApiFieldError errors={lookupFields} field={"name"} />
                  </div>
                </>
              )}

              {activeTab === 'transporters' && (
                <div>
                  <label className="block text-xs font-semibold text-brand-text mb-1">Transporter / Contractor Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Egyptian Transport Co."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
                  />
<ApiFieldError errors={lookupFields} field={"name"} />
                </div>
              )}

              {activeTab === 'vehicles' && (
                <div>
                  <label className="block text-xs font-semibold text-brand-text mb-1">Car Number / Plate *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ABC 123 / 1234 XYZ"
                    value={formData.carNumber}
                    onChange={(e) => setFormData({ ...formData, carNumber: e.target.value })}
                    className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
                  />
<ApiFieldError errors={lookupFields} field={"carNumber"} />
                </div>
              )}

              <div className="ils-dashboard-modal-footer">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="rounded-lg border border-brand-border px-4 py-2 text-sm font-medium text-brand-muted hover:bg-brand-surface-tint"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-brand-inverse hover:bg-brand-primary-hover disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- EDIT MODAL ----------------- */}
      {editModalOpen && selectedItem && (
        <div className="ils-dashboard-modal-overlay">
          <div className="ils-dashboard-modal-panel ils-ops-modal ils-ops-modal--form">
            <div className="ils-dashboard-modal-header flex items-center justify-between">
              <h3 className="text-lg font-bold text-brand-text">Edit {currentTabObj?.label}</h3>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="rounded-lg p-1 text-brand-neutral hover:bg-brand-surface-muted"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="ils-ops-modal-form space-y-4">
{error && <div role="alert" className="border border-brand-danger-border bg-brand-danger-soft p-3 text-sm text-brand-danger">{error}</div>}
              {activeTab === 'ports' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-brand-text mb-1">Port Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
                    />
<ApiFieldError errors={lookupFields} field={"name"} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-brand-text mb-1">Port Code</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm focus:border-brand-accent focus:outline-none uppercase"
                    />
<ApiFieldError errors={lookupFields} field={"code"} />
                  </div>
                </>
              )}

              {activeTab === 'destinations' && (
                <div>
                  <label className="block text-xs font-semibold text-brand-text mb-1">Destination Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
                  />
<ApiFieldError errors={lookupFields} field={"name"} />
                </div>
              )}

              {activeTab === 'drivers' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-brand-text mb-1">Driver Number / Code *</label>
                    <input
                      type="text"
                      required
                      value={formData.driverNumber}
                      onChange={(e) => setFormData({ ...formData, driverNumber: e.target.value })}
                      className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
                    />
<ApiFieldError errors={lookupFields} field={"driverNumber"} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-brand-text mb-1">Driver Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
                    />
<ApiFieldError errors={lookupFields} field={"name"} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-brand-text mb-1">Mobile Number</label>
                    <input
                      type="text"
                      value={formData.mobileNumber}
                      onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                      className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
                    />
<ApiFieldError errors={lookupFields} field={"mobileNumber"} />
                  </div>
                </>
              )}

              {activeTab === 'lines' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-brand-text mb-1">Abbreviation / Code</label>
                    <input
                      type="text"
                      placeholder="e.g. MSC, MSK, CMA"
                      value={formData.abbreviation}
                      onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
                      className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm focus:border-brand-accent focus:outline-none mb-3"
                    />
<ApiFieldError errors={lookupFields} field={"abbreviation"} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-brand-text mb-1">Shipping Line Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
                    />
<ApiFieldError errors={lookupFields} field={"name"} />
                  </div>
                </>
              )}

              {activeTab === 'transporters' && (
                <div>
                  <label className="block text-xs font-semibold text-brand-text mb-1">Transporter Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
                  />
<ApiFieldError errors={lookupFields} field={"name"} />
                </div>
              )}

              {activeTab === 'vehicles' && (
                <div>
                  <label className="block text-xs font-semibold text-brand-text mb-1">Car Number / Plate *</label>
                  <input
                    type="text"
                    required
                    value={formData.carNumber}
                    onChange={(e) => setFormData({ ...formData, carNumber: e.target.value })}
                    className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm focus:border-brand-accent focus:outline-none"
                  />
<ApiFieldError errors={lookupFields} field={"carNumber"} />
                </div>
              )}

              {/* Active Toggle */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-brand-border text-brand-primary focus:ring-brand-accent"
                />
                <label htmlFor="isActiveToggle" className="text-sm font-semibold text-brand-text cursor-pointer">
                  Is Active (Available in lists and operations)
                </label>
              </div>

              <div className="ils-dashboard-modal-footer">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="rounded-lg border border-brand-border px-4 py-2 text-sm font-medium text-brand-muted hover:bg-brand-surface-tint"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-brand-inverse hover:bg-brand-primary-hover disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- DELETE / DEACTIVATE MODAL ----------------- */}
      {deleteModalOpen && selectedItem && (
        <div className="ils-dashboard-modal-overlay">
          <div className="ils-dashboard-modal-panel ils-ops-modal ils-ops-modal--confirm">
            <div className="ils-dashboard-modal-header flex items-center gap-3 text-brand-danger">
              <div className="rounded-full bg-brand-danger-soft p-2">
                <AlertCircle size={22} />
              </div>
              <h3 className="text-lg font-bold text-brand-text">Deactivate {currentTabObj?.label}?</h3>
            </div>

            <p className="mt-3 text-sm text-brand-muted">
              Are you sure you want to deactivate and soft-delete{' '}
              <strong className="text-brand-text">
                {selectedItem.name || selectedItem.carNumber || selectedItem.driverNumber}
              </strong>
              ? It will be marked as inactive and archived with your audit stamp.
            </p>

            <div className="ils-dashboard-modal-footer">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="rounded-lg border border-brand-border px-4 py-2 text-sm font-medium text-brand-muted hover:bg-brand-surface-tint"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDelete}
                className="rounded-lg bg-brand-danger px-4 py-2 text-sm font-semibold text-brand-inverse hover:bg-brand-danger disabled:opacity-50"
              >
                {submitting ? 'Deactivating...' : 'Yes, Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardPage>
  );
}

