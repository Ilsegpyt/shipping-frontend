import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Trash2,
  RefreshCw,
  Search,
  X,
  ChevronLeft,
  Eye,
  History,
  Truck,
  RotateCcw as ResetIcon,
} from 'lucide-react';
import api from '../../../../../services/api';
import {
  getPagedFtlOperations,
} from '../../../../../services/operationsService';
import {
  fmtUpdateDateTime,
  FtlStatusHistoryModal,
  FtlFullDetailsDrawer,
} from './FtlArchiveShared';

export default function FtlInactiveArchive({
  counts = {},
  onCountsRefresh,
  onTotalCountChange,
  onBackToActive,
  lang = 'en',
  canReopen = true,
  onOperationsLoaded,
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [operations, setOperations] = useState([]);
  const [serverTotalCount, setServerTotalCount] = useState(counts?.inactiveCount || 0);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const [serverTotalTrucks, setServerTotalTrucks] = useState(0);

  useEffect(() => {
    if (counts?.inactiveCount != null && !searchTerm && !Object.values(filters).some(Boolean)) {
      setServerTotalCount(counts.inactiveCount);
    }
  }, [counts?.inactiveCount]);

  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Comprehensive Filter State (Matching FCL 1:1)
  const [filters, setFilters] = useState({
    client: '',
    transporter: '',
    direction: '',
    terminal: '',
    createdBy: '',
    dateType: 'inactive',
    dateFrom: '',
    dateTo: '',
  });

  // Master lookups
  const [lookups, setLookups] = useState({
    clients: [],
    truckers: [],
    terminals: [],
  });

  // Modals state
  const [viewDetailOp, setViewDetailOp] = useState(null);
  const [historyOp, setHistoryOp] = useState(null);
  const [knownUsers, setKnownUsers] = useState([]);

  // Stale-While-Revalidate in-memory cache
  const cacheRef = useRef({});

  // Sync loaded operations and direction filter to engine for Excel/Email exports
  useEffect(() => {
    onOperationsLoaded?.(operations, filters.direction, serverTotalCount);
  }, [operations, filters.direction, serverTotalCount, onOperationsLoaded]);

  // Debounce search text
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load master lookups on mount
  useEffect(() => {
    let isMounted = true;
    api
      .get('/api/operations/ftl/master')
      .then((res) => {
        if (!isMounted || !res.data) return;
        setLookups({
          clients: res.data.client || res.data.clients || [],
          truckers: res.data.trucker || res.data.truckers || [],
          terminals: res.data.line || res.data.lines || res.data.terminals || [],
        });
      })
      .catch(() => {
        // Fallback
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const cacheKey = useMemo(() => {
    return `inact_p_${page}_ps_${pageSize}_s_${debouncedSearch.trim().toLowerCase()}_f_${JSON.stringify(filters)}`;
  }, [page, pageSize, debouncedSearch, filters]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.client) count++;
    if (filters.transporter) count++;
    if (filters.direction) count++;
    if (filters.terminal) count++;
    if (filters.createdBy) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    return count;
  }, [filters]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setFilters({
      client: '',
      transporter: '',
      direction: '',
      terminal: '',
      createdBy: '',
      dateType: 'inactive',
      dateFrom: '',
      dateTo: '',
    });
    setPage(1);
  };

  const fetchPage = async (silent = false) => {
    if (!silent) setIsLoading(true);

    try {
      const res = await getPagedFtlOperations({
        page,
        pageSize,
        operationType: filters.direction || undefined,
        isDeleted: true,
        search: debouncedSearch.trim() || undefined,
        client: filters.client || undefined,
        transporter: filters.transporter || undefined,
        terminal: filters.terminal || undefined,
        createdBy: filters.createdBy || undefined,
        dateType: 'inactive',
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      });

      if (res) {
        let items = res.items || [];
        let count = res.totalCount || 0;
        let pages = res.totalPages || 1;
        let trucks = res.totalTrucksCount || 0;

        // Accumulate known users for the filter dropdown
        setKnownUsers((prev) => {
          const names = new Set(prev);
          items.forEach((op) => {
            if (op.deletedByName) names.add(op.deletedByName);
            if (op.createdByName) names.add(op.createdByName);
          });
          return Array.from(names);
        });

        setOperations(items);
        setServerTotalCount(count);
        setServerTotalPages(pages);
        setServerTotalTrucks(trucks);
        if (!searchTerm && !Object.values(filters).some(Boolean)) {
          onTotalCountChange?.(count);
        }

        cacheRef.current[cacheKey] = {
          items,
          totalCount: count,
          totalPages: pages,
          totalTrucks: trucks,
          timestamp: Date.now(),
        };
      }
    } catch (err) {
      console.error('Failed to load inactive FTL operations:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    const cached = cacheRef.current[cacheKey];
    if (cached) {
      setOperations(cached.items);
      setServerTotalCount(cached.totalCount);
      setServerTotalPages(cached.totalPages);
      setServerTotalTrucks(cached.totalTrucks);
      setIsLoading(false);
      fetchPage(true);
    } else {
      fetchPage(false);
    }
  }, [cacheKey]);

  const handleRefresh = () => {
    cacheRef.current = {};
    fetchPage(false);
    if (onCountsRefresh) onCountsRefresh();
  };

  // Unique list of creators / deleted-by users
  const uniqueUsers = useMemo(() => {
    const names = new Set(knownUsers);
    operations.forEach((op) => {
      if (op.deletedByName) names.add(op.deletedByName);
      if (op.createdByName) names.add(op.createdByName);
    });
    return Array.from(names);
  }, [operations, knownUsers]);

  return (
    <div className="space-y-4 w-full my-2 flex-1 flex flex-col" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* 1. Search & Comprehensive Filter Bar (Matching FCL 1:1) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-3">
        {/* Row 1: Search Input + Active Filters Counter + Reset Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 max-w-2xl">
            <span
              className={`absolute inset-y-0 ${lang === 'ar' ? 'right-0 pr-3' : 'left-0 pl-3'
                } flex items-center pointer-events-none text-slate-400`}
            >
              <Search size={16} />
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder={
                lang === 'ar'
                  ? 'بحث شامل بالشحنة، البوليصة MAWB/HAWB، العميل، الناقل، رقم السيارة، السائق... (Ctrl + K)'
                  : 'Search by Shipment #, MAWB, HAWB, Client, Transporter, Truck Plate, Driver... (Ctrl + K)'
              }
              className={`w-full ${lang === 'ar' ? 'pr-9 pl-20' : 'pl-9 pr-20'
                } py-2 rounded-xl border border-slate-300 bg-slate-50/70 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-100 transition shadow-2xs`}
            />
            <div
              className={`absolute inset-y-0 ${lang === 'ar' ? 'left-0 pl-2.5' : 'right-0 pr-2.5'
                } flex items-center gap-1.5`}
            >
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setPage(1);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 cursor-pointer"
                  title={lang === 'ar' ? 'مسح البحث' : 'Clear search'}
                >
                  <X size={13} />
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded">
                Ctrl K
              </kbd>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold">
                {activeFiltersCount} {lang === 'ar' ? 'فلاتر مطبقة' : 'active filters'}
              </span>
            )}
            {(activeFiltersCount > 0 || searchTerm) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold px-2.5 py-1.5 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-200 cursor-pointer transition shadow-2xs"
              >
                <ResetIcon size={13} />
                <span>{lang === 'ar' ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Unified Horizontal Filter Bar */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 overflow-x-auto no-scrollbar pb-1">
          {/* Client Filter */}
          <select
            value={filters.client}
            onChange={(e) => {
              setFilters({ ...filters, client: e.target.value });
              setPage(1);
            }}
            className="text-xs rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 outline-none focus:border-rose-500 cursor-pointer shrink-0 min-w-[145px] max-w-[170px]"
          >
            <option value="">{lang === 'ar' ? 'العميل: الكل' : 'Client: All'}</option>
            {lookups.clients.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Transporter Filter */}
          <select
            value={filters.transporter}
            onChange={(e) => {
              setFilters({ ...filters, transporter: e.target.value });
              setPage(1);
            }}
            className="text-xs rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 outline-none focus:border-rose-500 cursor-pointer shrink-0 min-w-[145px] max-w-[170px]"
          >
            <option value="">{lang === 'ar' ? 'المقاول: الكل' : 'Transporter: All'}</option>
            {lookups.truckers.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Type / Direction Filter */}
          <select
            value={filters.direction}
            onChange={(e) => {
              setFilters({ ...filters, direction: e.target.value });
              setPage(1);
            }}
            className="text-xs rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 outline-none focus:border-rose-500 cursor-pointer shrink-0 min-w-[125px] max-w-[145px]"
          >
            <option value="">{lang === 'ar' ? 'النوع: الكل' : 'Type: All'}</option>
            <option value="Import">{lang === 'ar' ? 'وارد (Import)' : 'Import'}</option>
            <option value="Export">{lang === 'ar' ? 'صادر (Export)' : 'Export'}</option>
          </select>

          {/* Airport / Terminal Filter */}
          <select
            value={filters.terminal}
            onChange={(e) => {
              setFilters({ ...filters, terminal: e.target.value });
              setPage(1);
            }}
            className="text-xs rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 outline-none focus:border-rose-500 cursor-pointer shrink-0 min-w-[135px] max-w-[160px]"
          >
            <option value="">{lang === 'ar' ? 'المطار: الكل' : 'Airport: All'}</option>
            {lookups.terminals.map((term) => (
              <option key={term} value={term}>
                {term}
              </option>
            ))}
          </select>

          {/* Inactive By Filter */}
          <select
            value={filters.createdBy}
            onChange={(e) => {
              setFilters({ ...filters, createdBy: e.target.value });
              setPage(1);
            }}
            className={`text-xs rounded-xl border px-2.5 py-1.5 outline-none cursor-pointer shrink-0 min-w-[135px] max-w-[165px] font-medium transition ${filters.createdBy
                ? 'border-rose-500 bg-rose-50 text-rose-900 font-bold shadow-2xs'
                : 'border-slate-300 bg-white text-slate-700 focus:border-rose-500'
              }`}
          >
            <option value="">{lang === 'ar' ? 'تم الإيقاف بواسطة: الكل' : 'Inactive By: All'}</option>
            {uniqueUsers.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>

          {/* Date Range Controls */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200 shrink-0 text-xs">
            <span className="text-[11px] font-bold text-slate-600 shrink-0">
              {lang === 'ar' ? 'التاريخ:' : 'Date:'}
            </span>
            <select
              value={filters.dateType}
              onChange={(e) => setFilters({ ...filters, dateType: e.target.value })}
              className="text-xs rounded-lg border border-slate-300 bg-white px-2 py-1 text-slate-700 outline-none focus:border-rose-500 cursor-pointer max-w-[125px]"
            >
              <option value="inactive">{lang === 'ar' ? 'تاريخ الإيقاف' : 'Inactive Date'}</option>
              <option value="created">{lang === 'ar' ? 'تاريخ الإنشاء' : 'Created Date'}</option>
            </select>
            <span className="text-[11px] text-slate-400">{lang === 'ar' ? 'من' : 'From'}</span>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => {
                setFilters({ ...filters, dateFrom: e.target.value });
                setPage(1);
              }}
              className="text-xs rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-slate-700 outline-none focus:border-rose-500 w-[115px]"
            />
            <span className="text-[11px] text-slate-400">{lang === 'ar' ? 'إلى' : 'To'}</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => {
                setFilters({ ...filters, dateTo: e.target.value });
                setPage(1);
              }}
              className="text-xs rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-slate-700 outline-none focus:border-rose-500 w-[115px]"
            />
            {(filters.dateFrom || filters.dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setFilters({ ...filters, dateFrom: '', dateTo: '' });
                  setPage(1);
                }}
                className="p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                title={lang === 'ar' ? 'مسح التاريخ' : 'Clear dates'}
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Hero Bar of Inactive Operations (Matching FCL 1:1) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-rose-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 shadow-2xs">
            <Trash2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                {lang === 'ar'
                  ? 'سجل العمليات والشحنات غير النشطة'
                  : 'Inactive Operations Archive'}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
                {debouncedSearch || activeFiltersCount > 0
                  ? lang === 'ar'
                    ? `${serverTotalCount} من أصل ${counts?.inactiveCount ?? serverTotalCount
                    } شحنة غير نشطة`
                    : `${serverTotalCount} of ${counts?.inactiveCount ?? serverTotalCount
                    } inactive`
                  : lang === 'ar'
                    ? `${serverTotalCount} شحنة غير نشطة`
                    : `${serverTotalCount} inactive`}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {lang === 'ar'
                ? 'يتم أرشفة جميع العمليات غير النشطة هنا مع توثيق اسم المستخدم وتاريخ وساعة الإيقاف بدقة'
                : 'All inactive operations are securely archived here with author and exact timestamp'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              size={13}
              className={isLoading ? 'animate-spin text-rose-600' : 'text-slate-500'}
            />
            <span>{lang === 'ar' ? 'تحديث' : 'Refresh'}</span>
          </button>
          <button
            type="button"
            onClick={onBackToActive}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition cursor-pointer shadow-xs"
          >
            <ChevronLeft size={14} className={lang === 'ar' ? 'rotate-180' : ''} />
            <span>{lang === 'ar' ? 'العودة للشحنات النشطة' : 'Back to Active Shipments'}</span>
          </button>
        </div>
      </div>

      {/* 4. Active Search / Filters Alert Banner */}
      {(debouncedSearch || activeFiltersCount > 0) && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <Search size={14} className="text-amber-600 shrink-0" />
            <span>
              {lang === 'ar'
                ? `تصفية البحث نشطة: "${debouncedSearch || 'فلاتر مخصصة'}" (إجمالي النتائج: ${serverTotalCount} شحنة غير نشطة)`
                : `Search filter active: "${debouncedSearch || 'Active Filters'}" (${serverTotalCount} total inactive)`}
            </span>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-3 py-1 rounded-xl bg-amber-200/90 hover:bg-amber-300 text-amber-950 font-bold transition cursor-pointer flex items-center gap-1 shrink-0 text-xs"
          >
            <X size={12} />
            <span>{lang === 'ar' ? 'إلغاء البحث وعرض كل الشحنات غير النشطة' : 'Clear search & show all'}</span>
          </button>
        </div>
      )}

      {/* 5. Inactive Operations Table or Empty State (Matching FCL 1:1) */}
      {isLoading && operations.length === 0 ? (
        <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200/90 shadow-xs min-h-[440px]">
          <table className="w-full text-start border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 text-start"># / {lang === 'ar' ? 'رقم الشحنة' : 'Shipment No'}</th>
                <th className="py-3 px-3 text-start">{lang === 'ar' ? 'النوع' : 'Type'}</th>
                <th className="py-3 px-3 text-start">{lang === 'ar' ? 'البوليصة / المستند' : 'MAWB / HAWB'}</th>
                <th className="py-3 px-3 text-start">{lang === 'ar' ? 'العميل والناقل' : 'Client & Transporter'}</th>
                <th className="py-3 px-3 text-start">{lang === 'ar' ? 'السيارات والنقلات' : 'Trucks & Trips'}</th>
                <th className="py-3 px-3 text-start bg-rose-50/60 text-rose-950 border-x border-rose-100">
                  {lang === 'ar' ? 'تم الإيقاف بواسطة' : 'Inactive By'}
                </th>
                <th className="py-3 px-3 text-start bg-rose-50/60 text-rose-950">
                  {lang === 'ar' ? 'تاريخ وساعة الإيقاف' : 'Inactive At'}
                </th>
                <th className="py-3 px-3 text-center">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Array.from({ length: 5 }).map((_, idx) => (
                <tr key={`inact_skel_${idx}`} className="border-b border-slate-100">
                  <td className="py-3 px-3"><div className="h-4 w-16 bg-slate-200/70 rounded-md animate-pulse" /></td>
                  <td className="py-3 px-3"><div className="h-5 w-14 bg-slate-200/70 rounded-full animate-pulse" /></td>
                  <td className="py-3 px-3"><div className="h-4 w-24 bg-slate-200/70 rounded-md animate-pulse" /></td>
                  <td className="py-3 px-3 space-y-1">
                    <div className="h-3.5 w-28 bg-slate-200/70 rounded-md animate-pulse" />
                    <div className="h-3 w-16 bg-slate-100 rounded-md animate-pulse" />
                  </td>
                  <td className="py-3 px-3"><div className="h-4 w-20 bg-slate-200/70 rounded-md animate-pulse" /></td>
                  <td className="py-3 px-3 bg-rose-50/20 border-x border-rose-100">
                    <div className="h-6 w-20 bg-rose-100/60 rounded-xl animate-pulse" />
                  </td>
                  <td className="py-3 px-3 bg-rose-50/20"><div className="h-4 w-28 bg-slate-200/70 rounded-md animate-pulse" /></td>
                  <td className="py-3 px-3 text-center">
                    <div className="h-7 w-24 bg-slate-200/50 rounded-xl mx-auto animate-pulse" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : operations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50/30 p-12 text-center space-y-3 min-h-[380px] flex flex-col items-center justify-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shadow-2xs">
            <Trash2 size={24} />
          </div>
          <h4 className="text-sm font-bold text-slate-800">
            {lang === 'ar' ? 'لا توجد شحنات غير نشطة مطابقة' : 'No Matching Inactive Shipments'}
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {debouncedSearch || activeFiltersCount > 0
              ? lang === 'ar'
                ? 'لم يتم العثور على أي شحنات غير نشطة تطابق معايير البحث أو الفلتر المحددة.'
                : 'No inactive operations matched search or filter criteria.'
              : lang === 'ar'
                ? 'لم يتم العثور على أي شحنات غير نشطة مسجلة في الأرشيف.'
                : 'No inactive operations found in the archive.'}
          </p>
          {(debouncedSearch || activeFiltersCount > 0) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <X size={12} />
              <span>{lang === 'ar' ? 'إلغاء البحث وعرض كل الشحنات غير النشطة' : 'Clear search & show all'}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200/90 shadow-xs">
            <table className="w-full text-start border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3 text-start"># / {lang === 'ar' ? 'رقم الشحنة' : 'Shipment No'}</th>
                  <th className="py-3 px-3 text-start">{lang === 'ar' ? 'النوع' : 'Type'}</th>
                  <th className="py-3 px-3 text-start">{lang === 'ar' ? 'البوليصة / المستند' : 'MAWB / HAWB'}</th>
                  <th className="py-3 px-3 text-start">{lang === 'ar' ? 'العميل والناقل' : 'Client & Transporter'}</th>
                  <th className="py-3 px-3 text-start">{lang === 'ar' ? 'السيارات والنقلات' : 'Trucks & Trips'}</th>
                  <th className="py-3 px-3 text-start bg-rose-50/60 text-rose-950 border-x border-rose-100">
                    {lang === 'ar' ? 'تم الإيقاف بواسطة' : 'Inactive By'}
                  </th>
                  <th className="py-3 px-3 text-start bg-rose-50/60 text-rose-950">
                    {lang === 'ar' ? 'تاريخ وساعة الإيقاف' : 'Inactive At'}
                  </th>
                  <th className="py-3 px-3 text-center">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {operations.map((op, idx) => {
                  const trips = op.trips || [];
                  const firstTrip = trips[0] || {};
                  const fields = firstTrip.fields || {};

                  const shipNo = fields.shipNo || op.ref;
                  const isImport = (op.direction || 'Import').toLowerCase() === 'import';
                  const mawb = fields.mawb || fields.bl || fields.booking || '—';
                  const hawb = fields.hawb || '';
                  const client = fields.client || '—';
                  const trucker = fields.trucker || '—';

                  // Extract truck plate pills
                  const truckPlates = trips
                    .map((t) => t.fields?.car || t.fields?.cntr)
                    .filter(Boolean);

                  return (
                    <tr key={op.ref || idx} className="hover:bg-rose-50/20 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-800" title={`${shipNo} (${op.ref})`}>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-xs" title={shipNo}>{shipNo}</span>
                          <span className="text-[10px] text-slate-400 font-mono" title={op.ref}>{op.ref}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${isImport
                              ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}
                          title={isImport ? 'Import Operation' : 'Export Operation'}
                        >
                          {isImport ? 'Import' : 'Export'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-900" title={`${mawb}${hawb ? ` - HAWB: ${hawb}` : ''}`}>
                        <div className="flex flex-col font-mono text-[11px]">
                          <span className="font-semibold text-slate-800" title={mawb}>{mawb}</span>
                          {hawb && <span className="text-slate-500 text-[10px]" title={`HAWB: ${hawb}`}>HAWB: {hawb}</span>}
                        </div>
                      </td>
                      <td className="py-3 px-3" title={`${client}${trucker ? ` / ${trucker}` : ''}`}>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-xs" title={client}>{client}</span>
                          <span className="text-[11px] text-slate-500" title={trucker}>{trucker}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-xs">
                            <Truck size={12} className="text-slate-600" />
                            <span>
                              {trips.length}{' '}
                              {trips.length === 1
                                ? lang === 'ar'
                                  ? 'سيارة'
                                  : 'truck'
                                : lang === 'ar'
                                  ? 'سيارات'
                                  : 'trucks'}
                            </span>
                          </span>
                          {truckPlates.slice(0, 3).map((car, cIdx) => (
                            <span
                              key={cIdx}
                              className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-700 font-mono font-medium"
                            >
                              {car}
                            </span>
                          ))}
                          {truckPlates.length > 3 && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              +{truckPlates.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 bg-rose-50/30 border-x border-rose-100">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-rose-200 text-rose-800 font-bold shadow-2xs">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          <span>{op.deletedByName || (lang === 'ar' ? 'مستخدم' : 'User')}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 bg-rose-50/30 font-medium text-slate-700">
                        <span className="font-semibold text-slate-800">
                          {fmtUpdateDateTime(op.deletedAtUtc)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewDetailOp(op)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition cursor-pointer active:scale-95"
                            title={lang === 'ar' ? 'عرض تفاصيل العملية المحذوفة بالكامل' : 'View Full Details'}
                          >
                            <Eye size={13} className="text-sky-400" />
                            <span>{lang === 'ar' ? 'عرض التفاصيل' : 'Details'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setHistoryOp({ ...op, isDeleted: true, status: 'Inactive' })}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-semibold shadow-2xs transition cursor-pointer active:scale-95"
                            title={lang === 'ar' ? 'سجل وتاريخ تغيرات الحالة' : 'Status History'}
                          >
                            <History size={12} className="text-sky-600" />
                            <span>{lang === 'ar' ? 'السجل' : 'History'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 6. Inactive Pagination Controls (Server-Side + Instant Client-Side Cache) */}
          {operations.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs">
              <div className="flex items-center gap-3 text-slate-500 font-medium">
                <span>
                  {lang === 'ar'
                    ? `الصفحة ${page} من ${serverTotalPages} (${serverTotalCount} عملية غير نشطة · ${serverTotalTrucks} نقلة)`
                    : `Page ${page} of ${serverTotalPages} (${serverTotalCount} inactive ops · ${serverTotalTrucks} trucks)`}
                </span>
                <div className="flex items-center gap-1.5 border-s border-slate-200 ps-3">
                  <span className="text-slate-400">{lang === 'ar' ? 'لكل صفحة:' : 'Per page:'}</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="bg-slate-50 border border-slate-200 rounded-md px-1.5 py-0.5 text-slate-700 font-semibold cursor-pointer focus:outline-none focus:border-sky-500"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed font-medium text-slate-700 transition"
                >
                  {lang === 'ar' ? 'السابق' : 'Previous'}
                </button>

                {Array.from({ length: Math.min(5, serverTotalPages) }, (_, i) => {
                  let pNum;
                  if (serverTotalPages <= 5) {
                    pNum = i + 1;
                  } else if (page <= 3) {
                    pNum = i + 1;
                  } else if (page >= serverTotalPages - 2) {
                    pNum = serverTotalPages - 4 + i;
                  } else {
                    pNum = page - 2 + i;
                  }
                  const isActive = pNum === page;
                  return (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => setPage(pNum)}
                      className={`min-w-7 h-7 px-2 rounded-lg font-bold text-xs transition cursor-pointer ${isActive
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                    >
                      {pNum}
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={page >= serverTotalPages}
                  onClick={() => setPage((p) => Math.min(serverTotalPages, p + 1))}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed font-medium text-slate-700 transition"
                >
                  {lang === 'ar' ? 'التالي' : 'Next'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals & Drawers */}
      <FtlFullDetailsDrawer
        op={viewDetailOp}
        onClose={() => setViewDetailOp(null)}
        isDelivered={false}
        lang={lang}
        onOpenHistory={(op) => setHistoryOp({ ...op, isDeleted: true, status: 'Inactive' })}
      />
      <FtlStatusHistoryModal
        op={historyOp}
        onClose={() => setHistoryOp(null)}
        lang={lang}
      />
    </div>
  );
}
