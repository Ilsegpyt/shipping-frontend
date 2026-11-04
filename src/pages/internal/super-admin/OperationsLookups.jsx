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
  ChevronsRight
} from 'lucide-react';
import * as opsService from '../../../services/operationsService';

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

  const loadData = async (
    tab = activeTab,
    targetPage = page,
    targetPageSize = pageSize,
    targetSearch = debouncedSearch,
    targetStatus = statusFilter
  ) => {
    try {
      setLoading(true);
      setError('');
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
      setError('Failed to load data for ' + tab);
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
    setError('');
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
    setError('');
    setEditModalOpen(true);
  };

  // Open Delete / Deactivate
  const handleOpenDelete = (item) => {
    setSelectedItem(item);
    setError('');
    setDeleteModalOpen(true);
  };

  // Submit Add
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');
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
      setError(err?.response?.data?.error || err?.response?.data?.message || err.message || 'Error creating item');
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
      setError('');
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
      setError(err?.response?.data?.error || err?.response?.data?.message || err.message || 'Error updating item');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Deactivate
  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      setSubmitting(true);
      setError('');
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
      setError(err?.response?.data?.error || err?.response?.data?.message || err.message || 'Error deactivating item');
    } finally {
      setSubmitting(false);
    }
  };

  // Direct Activate / Restore (One-click)
  const handleDirectActivate = async (item) => {
    try {
      setSubmitting(true);
      setError('');
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
      setError(err?.response?.data?.error || err?.response?.data?.message || err.message || 'Error activating item');
    } finally {
      setSubmitting(false);
    }
  };

  const currentTabObj = TABS.find((t) => t.key === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Operations Master Data & Lookups
          </h1>
          <p className="text-sm text-slate-500">
            Manage Ports, Destinations, Drivers, Shipping Lines, Transporters, and Vehicles.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          <Plus size={16} />
          <span>Add {currentTabObj?.label}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition whitespace-nowrap ${isActive
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
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
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 border border-emerald-200">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-800 border border-rose-200">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters & Actions Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${currentTabObj?.label}...`}
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full rounded-lg border border-slate-200 pl-9 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Buttons ("Active" / "Inactive" / "All") */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleStatusFilterChange('active')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition ${statusFilter === 'active'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <CheckCircle2 size={13} className="text-emerald-500" />
              <span>Active</span>
              <span
                className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] ${statusFilter === 'active' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200/80 text-slate-600'
                  }`}
              >
                {activeCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleStatusFilterChange('inactive')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition ${statusFilter === 'inactive'
                ? 'bg-rose-50 text-rose-700 shadow-2xs font-bold border border-rose-200'
                : 'text-slate-600 hover:text-rose-600'
                }`}
              title="View Inactive items"
            >
              <XCircle size={13} className="text-rose-500" />
              <span>Inactive</span>
              <span
                className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] ${statusFilter === 'inactive' ? 'bg-rose-200 text-rose-800' : 'bg-slate-200/80 text-slate-600'
                  }`}
              >
                {inactiveCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleStatusFilterChange('all')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition ${statusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <span>All</span>
              <span
                className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] ${statusFilter === 'all' ? 'bg-slate-300 text-slate-900' : 'bg-slate-200/80 text-slate-600'
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-blue-600' : 'text-slate-500'} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
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
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-blue-600 mb-2" />
                    Loading {currentTabObj?.label}...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No {statusFilter === 'active' ? 'active ' : statusFilter === 'inactive' ? 'inactive ' : ''}
                    {currentTabObj?.label} found.
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    {activeTab === 'ports' && (
                      <>
                        <td className="px-6 py-3.5 font-medium text-slate-900">{item.name}</td>
                        <td className="px-6 py-3.5 font-mono text-xs text-slate-600">{item.code || '-'}</td>
                      </>
                    )}
                    {activeTab === 'destinations' && (
                      <td className="px-6 py-3.5 font-medium text-slate-900">{item.name}</td>
                    )}
                    {activeTab === 'drivers' && (
                      <>
                        <td className="px-6 py-3.5 font-mono text-xs text-slate-700">{item.driverNumber}</td>
                        <td className="px-6 py-3.5 font-medium text-slate-900">{item.name}</td>
                        <td className="px-6 py-3.5 text-slate-600">{item.mobileNumber || '-'}</td>
                      </>
                    )}
                    {activeTab === 'lines' && (
                      <>
                        <td className="px-6 py-3.5 font-mono text-xs font-bold text-blue-700">{item.abbreviation || '-'}</td>
                        <td className="px-6 py-3.5 font-medium text-slate-900">{item.name}</td>
                      </>
                    )}
                    {activeTab === 'transporters' && (
                      <td className="px-6 py-3.5 font-medium text-slate-900">{item.name}</td>
                    )}
                    {activeTab === 'vehicles' && (
                      <td className="px-6 py-3.5 font-bold text-slate-800 tracking-wide">{item.carNumber}</td>
                    )}

                    <td className="px-6 py-3.5">
                      {(() => {
                        const isItemActive = item.isActive !== false && !item.isDeleted;
                        return (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${isItemActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                          >
                            {isItemActive ? (
                              <>
                                <CheckCircle2 size={11} /> Active
                              </>
                            ) : (
                              <>
                                <XCircle size={11} /> Inactive
                              </>
                            )}
                          </span>
                        );
                      })()}
                    </td>

                    <td className="px-6 py-3.5 text-right">
                      {(() => {
                        const isItemActive = item.isActive !== false && !item.isDeleted;
                        return (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition shadow-2xs"
                              title="Edit details"
                            >
                              <Edit2 size={13} />
                              <span>Edit</span>
                            </button>

                            {isItemActive ? (
                              <button
                                type="button"
                                onClick={() => handleOpenDelete(item)}
                                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition shadow-2xs"
                                title="Deactivate"
                              >
                                <Trash2 size={13} />
                                <span>Deactivate</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDirectActivate(item)}
                                disabled={submitting}
                                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition shadow-2xs"
                                title="Activate (Restore to Active)"
                              >
                                <RotateCcw size={13} />
                                <span>Activate</span>
                              </button>
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

      {/* Pagination Controls */}
      {!loading && totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-2xs mt-3">
          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
            <span>
              Showing <span className="font-bold text-slate-700">{totalCount === 0 ? 0 : ((page - 1) * pageSize) + 1}</span> to{' '}
              <span className="font-bold text-slate-700">{Math.min(page * pageSize, totalCount)}</span> of{' '}
              <span className="font-bold text-slate-700">{totalCount.toLocaleString()}</span> entries
            </span>
            <span className="text-slate-300">|</span>
            <label className="flex items-center gap-1.5 text-slate-600">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
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
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="First Page"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-1 px-2 text-xs font-medium text-slate-700">
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
                className="w-14 rounded border border-slate-200 bg-white px-1.5 py-1 text-center text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
              />
              <span>of {totalPages.toLocaleString()}</span>
            </div>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(totalPages)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Last Page"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ----------------- ADD MODAL ----------------- */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Add New {currentTabObj?.label}</h3>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              {activeTab === 'ports' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Port Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alexandria, Port Said, Dekheila"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Port Code</label>
                    <input
                      type="text"
                      placeholder="e.g. EGALY, EGPSD"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none uppercase"
                    />
                  </div>
                </>
              )}

              {activeTab === 'destinations' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Destination Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10th of Ramadan, 6th of October"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}

              {activeTab === 'drivers' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Driver Number / Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. DRV-01, 105"
                      value={formData.driverNumber}
                      onChange={(e) => setFormData({ ...formData, driverNumber: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Driver Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ahmed Mahmoud"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 01012345678"
                      value={formData.mobileNumber}
                      onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {activeTab === 'lines' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Abbreviation / Code</label>
                    <input
                      type="text"
                      placeholder="e.g. MSC, MSK, CMA, HPL"
                      value={formData.abbreviation}
                      onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none mb-3"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Shipping Line Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mediterranean Shipping Company"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {activeTab === 'transporters' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Transporter / Contractor Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Egyptian Transport Co."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}

              {activeTab === 'vehicles' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Car Number / Plate *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ABC 123 / 1234 XYZ"
                    value={formData.carNumber}
                    onChange={(e) => setFormData({ ...formData, carNumber: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Edit {currentTabObj?.label}</h3>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="mt-4 space-y-4">
              {activeTab === 'ports' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Port Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Port Code</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none uppercase"
                    />
                  </div>
                </>
              )}

              {activeTab === 'destinations' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Destination Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}

              {activeTab === 'drivers' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Driver Number / Code *</label>
                    <input
                      type="text"
                      required
                      value={formData.driverNumber}
                      onChange={(e) => setFormData({ ...formData, driverNumber: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Driver Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number</label>
                    <input
                      type="text"
                      value={formData.mobileNumber}
                      onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {activeTab === 'lines' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Abbreviation / Code</label>
                    <input
                      type="text"
                      placeholder="e.g. MSC, MSK, CMA"
                      value={formData.abbreviation}
                      onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none mb-3"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Shipping Line Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {activeTab === 'transporters' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Transporter Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}

              {activeTab === 'vehicles' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Car Number / Plate *</label>
                  <input
                    type="text"
                    required
                    value={formData.carNumber}
                    onChange={(e) => setFormData({ ...formData, carNumber: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Active Toggle */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isActiveToggle" className="text-sm font-semibold text-slate-700 cursor-pointer">
                  Is Active (Available in lists and operations)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="rounded-full bg-rose-50 p-2">
                <AlertCircle size={22} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Deactivate {currentTabObj?.label}?</h3>
            </div>

            <p className="mt-3 text-sm text-slate-600">
              Are you sure you want to deactivate and soft-delete{' '}
              <strong className="text-slate-900">
                {selectedItem.name || selectedItem.carNumber || selectedItem.driverNumber}
              </strong>
              ? It will be marked as inactive and archived with your audit stamp.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDelete}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {submitting ? 'Deactivating...' : 'Yes, Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

