import { useAuth } from '../../../../auth/AuthContext';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { extractApiErrorMessage } from '../../../../utils/errorUtils';
import {
  Ship,
  Upload,
  FileSpreadsheet,
  ShieldCheck,
  Globe,
  Layers,
  ArrowRightLeft,
  BarChart3,
  CheckCircle,
  LayoutDashboard,
  FileEdit,
  ArrowDownCircle,
  ArrowUpCircle,
  X,
  AlertTriangle,
  AlertCircle,
  Info,
} from 'lucide-react';

export const toGuidOrNull = (val) => {
  if (!val || typeof val !== 'string') return null;
  const clean = val.trim();
  const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return guidRegex.test(clean) ? clean : null;
};

export const extractErrorMessage = (err) => extractApiErrorMessage(err);

import { INITIAL_ENTRY, INITIAL_SHIPS } from './mockData';
import { enrich, exportToExcel } from './tptEngine';
import { fclCandidates } from './fclEngine';
import {
  getAllOperations,
  createOperation,
  updateImportOperation,
  updateExportOperation,
  deliverOperation,
  reopenOperation,
  deleteOperation,
  getDeletedOperations,
  getDeliveredOperations,
  getOperationsCounts,
  getCachedLookups,
  clearLookupsCache,
  getAllFclApprovals,
  approveFclSuggestion,
  unapproveFclSuggestion,
} from '../../../../services/operationsService';
import { mapBackendOperationsToFrontend, normalizeContainerType } from './operationsAdapter';

import FclTab from './components/FclTab';
import DataEntryTab from './components/DataEntryTab';
import AnalyticsTab from './components/AnalyticsTab';
import UploadModal from './components/UploadModal';
import DataQualityModal from './components/DataQualityModal';
import EmailDraftModal from './components/EmailDraftModal';
import ExportExcelModal from './components/ExportExcelModal';
import './ocean-dashboard-style.css';

export default function OceanTransportDashboard({ defaultView = 'dashboard' }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isOceanManager = user?.roleName === 'Ocean Operations Manager' || user?.permissions?.includes('operations.reopen');
  const canViewDashboard = Boolean(
    user?.isSuperAdmin ||
    user?.role === 'SuperAdmin' ||
    user?.roleName === 'Super Admin'
  );
  const canExportExcel = Boolean(
    user?.isSuperAdmin ||
    user?.role === 'SuperAdmin' ||
    user?.permissions?.includes('reports.download')
  );
  const canUploadReport = Boolean(
    user?.isSuperAdmin ||
    user?.role === 'SuperAdmin' ||
    user?.permissions?.includes('reports.upload')
  );

  // Detect mode from URL: if path contains 'entry', start on entry mode, else dashboard
  const isEntryPath = location.pathname.includes('/entry');
  const [viewMode, setViewMode] = useState(() => {
    if (!canViewDashboard || isEntryPath || defaultView === 'entry') return 'entry';
    return 'dashboard';
  });

  useEffect(() => {
    if (!canViewDashboard && viewMode === 'dashboard') {
      setViewMode('entry');
    }
  }, [canViewDashboard, viewMode]); // 'dashboard' | 'entry'

  // Within dashboard: 'Import' | 'Export'
  const [dashTab, setDashTab] = useState(() => {
    try {
      const saved = sessionStorage.getItem('ocean_dash_tab');
      if (saved && ['Import', 'Export'].includes(saved)) return saved;
    } catch (e) { }
    return 'Import';
  });

  const handleSelectDashTab = (tab) => {
    setDashTab(tab);
    try {
      sessionStorage.setItem('ocean_dash_tab', tab);
    } catch (e) { }
  };
  // Within entry: 'Import' | 'Export'
  const [entryDir, setEntryDir] = useState('Import');

  const [lang, setLang] = useState(() => {
    return localStorage.getItem('operations_lang') || 'ar';
  });

  const toggleLang = () => {
    const next = lang === 'ar' ? 'en' : 'ar';
    setLang(next);
    try {
      localStorage.setItem('operations_lang', next);
    } catch (e) {
      // Ignore localStorage errors
    }
  };

  // Core Data State - Clean production empty state
  const [entry, setEntry] = useState({ Import: [], Export: [] });
  const [ships, setShips] = useState({ Import: {}, Export: {} });
  const [approvals, setApprovals] = useState(new Set());
  const [fclApprovedList, setFclApprovedList] = useState(() => {
    try {
      const saved = localStorage.getItem('fcl_approved_allocations_v2');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [opSeq, setOpSeq] = useState(183);

  // Lookups & API Loading
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [operationsCounts, setOperationsCounts] = useState({
    activeImportCount: 0,
    activeExportCount: 0,
    deliveredCount: 0,
    inactiveCount: 0,
  });

  const [lookups, setLookups] = useState({
    customers: [],
    shippingLines: [],
    ports: [],
    transporters: [],
    drivers: [],
    vehicles: [],
    destinations: [],
  });

  // Delivered Operations State (Lazy loaded on clicking Delivered tab)
  const [deliveredOperations, setDeliveredOperations] = useState([]);
  const [isLoadingDelivered, setIsLoadingDelivered] = useState(false);
  const [hasLoadedDelivered, setHasLoadedDelivered] = useState(false);

  // Deleted Operations State (Lazy loaded on clicking Inactive tab)
  const [deletedOperations, setDeletedOperations] = useState([]);
  const [isLoadingDeleted, setIsLoadingDeleted] = useState(false);
  const [hasLoadedDeleted, setHasLoadedDeleted] = useState(false);

  // FCL State (Lazy loaded on clicking FCL tab)
  const [hasLoadedFcl, setHasLoadedFcl] = useState(false);
  const [isLoadingFcl, setIsLoadingFcl] = useState(false);

  const loadDeliveredOperations = async (silent = false) => {
    if (!silent) setIsLoadingDelivered(true);
    try {
      const data = await getDeliveredOperations();
      if (Array.isArray(data)) {
        const { entry: mapped } = mapBackendOperationsToFrontend(data);
        setDeliveredOperations([...(mapped.Import || []), ...(mapped.Export || [])]);
        setHasLoadedDelivered(true);
      }
    } catch (err) {
      console.error('Failed to load delivered operations:', err);
    } finally {
      if (!silent) setIsLoadingDelivered(false);
    }
  };

  const loadDeletedOperations = async (silent = false) => {
    if (!silent) setIsLoadingDeleted(true);
    try {
      const data = await getDeletedOperations();
      if (Array.isArray(data)) {
        setDeletedOperations(data);
        setHasLoadedDeleted(true);
      }
    } catch (err) {
      console.error('Failed to load deleted operations:', err);
    } finally {
      if (!silent) setIsLoadingDeleted(false);
    }
  };

  const loadFclData = async (forceRefresh = false) => {
    setIsLoadingFcl(true);
    try {
      const hasOps =
        !forceRefresh &&
        ((entry.Import && entry.Import.length > 0) || (entry.Export && entry.Export.length > 0));

      const [approvalsData, opsData] = await Promise.all([
        getAllFclApprovals().catch((err) => {
          console.warn('Failed to load FCL approvals:', err);
          return [];
        }),
        !hasOps
          ? getAllOperations(true).catch((err) => {
            console.warn('Failed to load operations for FCL:', err);
            return [];
          })
          : Promise.resolve(null),
      ]);

      if (Array.isArray(approvalsData)) {
        const approvedSet = new Set();
        approvalsData.forEach((a) => {
          if (a.importContainerId) approvedSet.add(String(a.importContainerId).toLowerCase());
          if (a.approvalKey) {
            approvedSet.add(a.approvalKey);
            const parts = a.approvalKey.split('|');
            if (parts.length >= 2) {
              approvedSet.add(`${parts[0].trim().toUpperCase()}|${parts[1].trim().toUpperCase()}`);
            }
          }
        });
        setApprovals(approvedSet);
      }

      if (Array.isArray(opsData) && opsData.length > 0) {
        processOperationsResult(opsData);
      }

      setHasLoadedFcl(true);
    } catch (err) {
      console.error('Failed to load FCL data:', err);
    } finally {
      setIsLoadingFcl(false);
    }
  };

  // Helper to process active operations and merge localStorage drafts
  const processOperationsResult = (opsList) => {
    if (!Array.isArray(opsList)) return;
    const { entry: mappedEntry, ships: mappedShips } = mapBackendOperationsToFrontend(opsList);

    let savedDraft = null;
    if (canUploadReport) {
      try {
        const draftJson = localStorage.getItem('ocean_transport_uploaded_draft');
        if (draftJson) savedDraft = JSON.parse(draftJson);
      } catch (e) { }
    }

    const finalEntry = {
      Import: [...mappedEntry.Import],
      Export: [...mappedEntry.Export],
    };
    const finalShips = {
      Import: { ...mappedShips.Import },
      Export: { ...mappedShips.Export },
    };

    if (savedDraft?.Import?.length || savedDraft?.Export?.length) {
      ['Import', 'Export'].forEach((dir) => {
        (savedDraft[dir] || []).forEach((draftRow) => {
          const exists = finalEntry[dir].some(
            (r) =>
              (draftRow._operationId && r._operationId === draftRow._operationId) ||
              (draftRow._rowId && r._rowId === draftRow._rowId) ||
              (draftRow.cntr && r.cntr && r.cntr === draftRow.cntr && (r.bl === draftRow.bl || r.booking === draftRow.booking))
          );
          if (!exists) {
            const newIdx = finalEntry[dir].length;
            finalEntry[dir].push(draftRow);
            const ref = draftRow._ref || (dir === 'Import' ? draftRow.bl : draftRow.booking) || `DRAFT_${newIdx}`;
            if (!finalShips[dir][ref]) {
              finalShips[dir][ref] = {
                id: null,
                ref,
                dir,
                status: draftRow.status || 'Open',
                day: draftRow.reqDate || new Date().toISOString().slice(0, 10),
                user: draftRow.oper || '',
                rows: [],
                unmerged: [],
              };
            }
            finalShips[dir][ref].rows.push(newIdx);
          }
        });
      });
    }

    setEntry(finalEntry);
    setShips(finalShips);
  };

  // Ultra-fast refresh for Counts (< 20ms) and Active Operations (only if on Dashboard view)
  const refreshActiveOperations = async () => {
    try {
      const tasks = [getOperationsCounts()];
      if (viewMode === 'dashboard') {
        tasks.push(getAllOperations(true));
      }
      const results = await Promise.allSettled(tasks);
      const countsResult = results[0];
      const opsResult = results[1];

      if (countsResult?.status === 'fulfilled' && countsResult.value) {
        setOperationsCounts(countsResult.value);
      }

      if (opsResult?.status === 'fulfilled' && Array.isArray(opsResult.value)) {
        processOperationsResult(opsResult.value);
      }
    } catch (err) {
      console.error('Failed to refresh active operations:', err);
    }
  };

  // Main initial load: Lookups (5-hour cached) + Active Operations + Counts
  const loadData = async (forceRefresh = false) => {
    setIsLoadingData(true);
    try {
      if (forceRefresh) {
        clearLookupsCache();
      }

      const tasks = [
        getCachedLookups(forceRefresh),
        getOperationsCounts(),
      ];
      if (viewMode === 'dashboard') {
        tasks.push(getAllOperations(true));
      }

      const results = await Promise.allSettled(tasks);
      const lookupsResult = results[0];
      const countsResult = results[1];
      const opsResult = results[2];

      if (lookupsResult && lookupsResult.status === 'fulfilled' && lookupsResult.value) {
        setLookups(lookupsResult.value);
      }

      if (countsResult && countsResult.status === 'fulfilled' && countsResult.value) {
        setOperationsCounts(countsResult.value);
      }

      if (opsResult && opsResult.status === 'fulfilled' && Array.isArray(opsResult.value)) {
        processOperationsResult(opsResult.value);
      }
    } catch (err) {
      console.error('Failed to load operations data from backend:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle switching tabs with Lazy Loading
  const handleDirChange = (newDir) => {
    setEntryDir(newDir);
    if (newDir === 'Delivered' && !hasLoadedDelivered) {
      loadDeliveredOperations();
    } else if (newDir === 'Deleted' && !hasLoadedDeleted) {
      loadDeletedOperations();
    } else if (newDir === 'FCL' && !hasLoadedFcl) {
      loadFclData();
    }
  };

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [qualityModalOpen, setQualityModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailSelectedRefs, setEmailSelectedRefs] = useState([]);
  const [emailActiveRows, setEmailActiveRows] = useState([]);
  const [exportExcelModalOpen, setExportExcelModalOpen] = useState(false);
  const [exportExcelSelectedRefs, setExportExcelSelectedRefs] = useState([]);
  const [exportExcelActiveRows, setExportExcelActiveRows] = useState([]);
  const [toast, setToast] = useState(null);

  // Sync with URL if user navigates
  useEffect(() => {
    if (location.pathname.includes('/entry')) {
      setViewMode('entry');
    } else if (location.pathname.includes('/dashboard')) {
      setViewMode('dashboard');
    }
  }, [location.pathname]);

  const toastTimeoutRef = useRef(null);

  const showToast = (msg, type = 'info', options = {}) => {
    if (!msg) return;
    const duration = typeof options === 'number' ? options : (options?.duration || 10000);
    const title = typeof options === 'object' ? options?.title : null;

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    setToast({
      message: String(msg),
      type,
      title: title || (
        type === 'warning'
          ? (lang === 'ar' ? 'تنبيه مهم' : 'Warning')
          : type === 'error'
            ? (lang === 'ar' ? 'تنبيه خطأ' : 'Error Notice')
            : type === 'success'
              ? (lang === 'ar' ? 'تمت العملية بنجاح' : 'Success')
              : (lang === 'ar' ? 'إشعار' : 'Notice')
      ),
      createdAt: Date.now(),
      duration,
    });

    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, duration);
  };

  // Enriched data
  const enrichedData = useMemo(() => {
    const all = [
      ...(entry.Import || []).map((r) => ({ ...r, dir: 'Import' })),
      ...(entry.Export || []).map((r) => ({ ...r, dir: 'Export' })),
    ];
    return enrich(all);
  }, [entry]);

  // FCL Recommendations (Computed lazily ONLY after user clicks FCL tab or on Dashboard view)
  const fclMatches = useMemo(() => {
    if (!hasLoadedFcl && viewMode !== 'dashboard') return [];
    return fclCandidates(enrichedData, approvals);
  }, [hasLoadedFcl, viewMode, enrichedData, approvals]);

  const recommendedCount = useMemo(() => {
    return fclMatches.filter((m) => m.score?.recommended).length;
  }, [fclMatches]);

  // Handlers
  const handleCreateOperation = async (dir, opData) => {
    const isImport = dir === 'Import';

    // 1. Resolve IDs from Lookups with strict GUID validation
    let clientId = toGuidOrNull(opData.clientId);
    if (!clientId && lookups.customers?.length > 0) {
      const target = String(opData.client || opData.clientId || '').trim().toLowerCase();
      const match = lookups.customers.find(
        (c) => (c.companyName || c.name || '')?.trim().toLowerCase() === target
      );
      if (match) clientId = toGuidOrNull(match.customerId || match.id);
    }

    let shippingLineId = toGuidOrNull(opData.shippingLineId);
    if (!shippingLineId && lookups.shippingLines?.length > 0) {
      const target = String(opData.line || opData.shippingLineId || '').trim().toLowerCase();
      const match = lookups.shippingLines.find(
        (l) => (l.name || '')?.trim().toLowerCase() === target || (l.abbreviation || '')?.trim().toLowerCase() === target
      );
      if (match) shippingLineId = toGuidOrNull(match.id);
    }

    let portId = toGuidOrNull(opData.portId);
    if (!portId && lookups.ports?.length > 0) {
      const target = String(opData.port || opData.portId || '').trim().toLowerCase();
      const match = lookups.ports.find(
        (p) =>
          (p.name || '')?.trim().toLowerCase() === target ||
          (p.code || '')?.trim().toLowerCase() === target
      );
      if (match) portId = toGuidOrNull(match.id);
    }

    let powId = toGuidOrNull(opData.powId);
    if (!powId && opData.pow && lookups.ports?.length > 0) {
      const target = String(opData.pow || '').trim().toLowerCase();
      const match = lookups.ports.find(
        (p) =>
          (p.name || '')?.trim().toLowerCase() === target ||
          (p.code || '')?.trim().toLowerCase() === target
      );
      if (match) powId = toGuidOrNull(match.id);
    }

    // 2. Validate Required Fields & Rules
    if (!clientId) {
      showToast(
        lang === 'ar'
          ? 'يرجى اختيار العميل من القائمة المعتمدة في النظام (يجب أن يكون مسجلاً في قاعدة البيانات)'
          : 'Please select a valid registered client from the list',
        'warning'
      );
      return false;
    }
    if (!shippingLineId) {
      showToast(
        lang === 'ar'
          ? 'يرجى اختيار الخط الملاحي من القائمة المعتمدة في النظام (يجب أن يكون مسجلاً في قاعدة البيانات)'
          : 'Please select a valid registered shipping line from the list',
        'warning'
      );
      return false;
    }
    if (!opData.blOrBooking || !opData.blOrBooking.trim()) {
      showToast(
        lang === 'ar'
          ? (isImport ? 'يرجى إدخال رقم البوليصة M/BL' : 'يرجى إدخال رقم البوكينج')
          : (isImport ? 'Please enter M/BL Number' : 'Please enter Booking Number'),
        'warning'
      );
      return false;
    }

    if (isImport) {
      if (!portId) {
        showToast(
          lang === 'ar'
            ? 'يرجى اختيار ميناء الوصول (POD) من القائمة المعتمدة في النظام'
            : 'Please select a valid POD from the list',
          'warning'
        );
        return false;
      }
      if (!opData.dest || !opData.dest.trim()) {
        showToast(
          lang === 'ar' ? 'يرجى تحديد مكان التعتيق' : 'Please specify destination',
          'warning'
        );
        return false;
      }
      if (!opData.freeOrCut) {
        showToast(
          lang === 'ar' ? 'يرجى تحديد فترة السماح' : 'Please specify Free Time Till',
          'warning'
        );
        return false;
      }
      if (!opData.reqDate || !opData.reqTime) {
        showToast(
          lang === 'ar' ? 'يرجى تحديد تاريخ ووقت التعتيق المطلوب' : 'Please specify required offloading date and time',
          'warning'
        );
        return false;
      }
    } else {
      if (!portId) {
        showToast(
          lang === 'ar'
            ? 'يرجى اختيار ميناء الشحن (POL) من القائمة المعتمدة في النظام'
            : 'Please select a valid POL from the list',
          'warning'
        );
        return false;
      }
    }

    // Helper to format DateOnly: YYYY-MM-DD
    const formatDateOnly = (d) => {
      if (!d) return null;
      const s = String(d).trim();
      if (!s) return null;
      return s.slice(0, 10);
    };

    // Helper to format TimeOnly: HH:mm:00
    const formatTimeOnly = (t) => {
      if (!t) return '08:00:00';
      const parts = String(t).trim().split(':');
      if (parts.length >= 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
      return t;
    };

    // Helper to resolve ClearanceType (Cert = 2, Bosla = 1)
    const resolveClearanceType = (val) => {
      if (!val) return 2;
      const str = String(val).toUpperCase();
      if (str === 'BOSLA' || str === '1') return 1;
      return 2;
    };

    const containerCount = Number(opData.cntrCount) || 1;

    // Build Payload adhering to CreateOperationRequest & Backend Validators
    const payload = {
      clientId,
      shippingLineId,
      operationType: isImport ? 1 : 2, // 1 = Import, 2 = Export
      numberOfContainers: containerCount,

      // Import Fields (Must be null for Export)
      mblNumber: isImport ? opData.blOrBooking.trim() : null,
      destination: isImport ? opData.dest.trim() : null,
      podId: isImport ? portId : null,
      freeTimeTill: isImport ? formatDateOnly(opData.freeOrCut) : null,
      requiredOffloadingDate: isImport ? formatDateOnly(opData.reqDate) : null,
      requiredOffloadingTime: isImport ? formatTimeOnly(opData.reqTime) : null,

      // Export Fields (Must be null for Import)
      clearanceType: isImport ? null : resolveClearanceType(opData.clrType),
      bookingNumber: isImport ? null : opData.blOrBooking.trim(),
      polId: isImport ? null : portId,
      powId: isImport ? null : (powId || null),
      cutOffDate: isImport ? null : formatDateOnly(opData.freeOrCut),
      exportDestination: isImport ? null : (opData.dest ? opData.dest.trim() : null),
    };

    try {
      showToast(lang === 'ar' ? 'جاري إنشاء العملية في قاعدة البيانات...' : 'Creating operation in database...');
      const newOpId = await createOperation(payload);

      showToast(
        lang === 'ar'
          ? `تم إنشاء العملية بإجمالي ${containerCount} حاوية وحفظها بنجاح`
          : `Operation created with ${containerCount} container(s) successfully`,
        'success'
      );

      // Fast refresh of active operations & counts only (instant < 300ms)
      await refreshActiveOperations();

      // Return the exact generated reference (e.g. OPS-2DA2AD1B) so DataEntryTab can immediately focus & scroll
      const rawId = String(
        typeof newOpId === 'object' && newOpId?.id
          ? newOpId.id
          : typeof newOpId === 'object' && newOpId?.value
            ? newOpId.value
            : (newOpId || '')
      ).replace(/^["'{]+|["'}]+$/g, '').trim();

      const createdRef = rawId && rawId.length >= 8 ? `OPS-${rawId.slice(0, 8).toUpperCase()}` : null;
      return createdRef || newOpId || true;
    } catch (err) {
      console.error('Failed to create operation:', err);
      const errMsg = extractErrorMessage(err);

      showToast(
        lang === 'ar'
          ? `خطأ أثناء إنشاء العملية: ${errMsg}`
          : `Error creating operation: ${errMsg}`,
        'error'
      );
      return false;
    }
  };

  const handleUpdateCell = (dir, rowIdOrIdx, colKey, val) => {
    setEntry((prev) => {
      const dirs = dir === 'Delivered' ? ['Import', 'Export'] : [dir];
      const next = { ...prev };

      for (const d of dirs) {
        const list = [...(next[d] || [])];
        const idx = list.findIndex(
          (item, i) =>
            (item._rowId && item._rowId === rowIdOrIdx) ||
            (item._containerId && item._containerId === rowIdOrIdx) ||
            (typeof rowIdOrIdx === 'number' && i === rowIdOrIdx)
        );

        if (idx !== -1) {
          list[idx] = {
            ...list[idx],
            [colKey]: val,
          };
          next[d] = list;
          break;
        }
      }

      return next;
    });
  };

  const handleToggleStatus = async (dir, refOrOpId, targetStatus) => {
    const isGuid = (val) =>
      typeof val === 'string' &&
      val.length > 20 &&
      !val.startsWith('REF_') &&
      !val.startsWith('DRAFT_');

    const row = (entry[dir] || [])
      .concat(deliveredOperations || [])
      .find((r) => r._operationId === refOrOpId || r._ref === refOrOpId || r.shipNo === refOrOpId);

    const opId = isGuid(refOrOpId)
      ? refOrOpId
      : (row?._operationId && isGuid(row._operationId) ? row._operationId : null);

    const nextStatus = targetStatus || (row?.status === 'Delivered' ? 'Open' : 'Delivered');

    // 1. Optimistic entry state update
    setEntry((prev) => {
      const list = (prev[dir] || []).map((r) => {
        if (
          r._operationId === refOrOpId ||
          r._ref === refOrOpId ||
          r.shipNo === refOrOpId ||
          (opId && r._operationId === opId)
        ) {
          return { ...r, status: nextStatus };
        }
        return r;
      });
      return { ...prev, [dir]: list };
    });

    // 2. Optimistic counts update immediately
    setOperationsCounts((prev) => {
      if (!prev) return prev;
      const isImport = dir === 'Import' || row?.operationType === 'Import';
      if (nextStatus === 'Delivered') {
        return {
          ...prev,
          importCount: isImport ? Math.max(0, (prev.importCount || 0) - 1) : prev.importCount,
          exportCount: !isImport ? Math.max(0, (prev.exportCount || 0) - 1) : prev.exportCount,
          activeTotalCount: Math.max(0, (prev.activeTotalCount || 0) - 1),
          deliveredCount: (prev.deliveredCount || 0) + 1,
        };
      } else {
        return {
          ...prev,
          importCount: isImport ? (prev.importCount || 0) + 1 : prev.importCount,
          exportCount: !isImport ? (prev.exportCount || 0) + 1 : prev.exportCount,
          activeTotalCount: (prev.activeTotalCount || 0) + 1,
          deliveredCount: Math.max(0, (prev.deliveredCount || 0) - 1),
        };
      }
    });

    if (opId) {
      try {
        if (nextStatus === 'Delivered') {
          await deliverOperation(opId);
        } else {
          await reopenOperation(opId, 'Reopened from Data Entry');
        }
        showToast(
          lang === 'ar'
            ? `تم تحديث حالة العملية في السيرفر إلى ${nextStatus === 'Delivered' ? 'تم التسليم' : 'مفتوحة'}`
            : `Operation status updated to ${nextStatus}`,
          'success'
        );
        refreshActiveOperations();
        if (hasLoadedDelivered) loadDeliveredOperations(true);
        return true;
      } catch (err) {
        console.error('Failed to update status on server:', err);
        refreshActiveOperations();
        const errMsg = extractErrorMessage(err);
        showToast(
          lang === 'ar'
            ? `فشل تحديث الحالة في قاعدة البيانات: ${errMsg}`
            : `Failed to update status on server: ${errMsg}`,
          'error'
        );
        throw err;
      }
    } else {
      showToast(lang === 'ar' ? 'تم تحديث حالة الشحنة' : 'Shipment status updated');
      return true;
    }
  };

  const handleReopenOperation = async (opId, reason) => {
    // Optimistic removal from delivered operations list
    setDeliveredOperations((prev) => prev.filter((r) => r._operationId !== opId));

    // Optimistic count adjustment
    setOperationsCounts((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        deliveredCount: Math.max(0, (prev.deliveredCount || 0) - 1),
        activeTotalCount: (prev.activeTotalCount || 0) + 1,
      };
    });

    try {
      await reopenOperation(opId, reason);
      showToast(
        lang === 'ar'
          ? 'تمت إعادة فتح العملية بنجاح وأصبحت مفتوحة للتعديل'
          : 'Operation reopened successfully and is now open for editing',
        'success'
      );
      refreshActiveOperations();
      if (hasLoadedDelivered) loadDeliveredOperations(true);
      return true;
    } catch (err) {
      console.error('Failed to reopen operation:', err);
      refreshActiveOperations();
      if (hasLoadedDelivered) loadDeliveredOperations(true);
      const errMsg = extractErrorMessage(err) || 'Failed to reopen operation';
      showToast(lang === 'ar' ? `خطأ أثناء فتح العملية: ${errMsg}` : `Error reopening: ${errMsg}`, 'error');
      throw err;
    }
  };

  useEffect(() => {
    if (entryDir === 'Deleted') {
      // If we don't have any deleted operations loaded yet, load with full loader.
      // If we already have them in memory, refresh quietly in background without hiding data.
      const hasExisting = deletedOperations.length > 0;
      loadDeletedOperations(!hasExisting ? false : true);
    }
  }, [entryDir]);

  const handleDeleteOperation = async (opId) => {
    // Optimistic removal from active entry state
    setEntry((prev) => {
      const next = { ...prev };
      ['Import', 'Export'].forEach((dir) => {
        if (next[dir]) {
          next[dir] = next[dir].filter((r) => r._operationId !== opId);
        }
      });
      return next;
    });

    // Optimistic count adjustment
    setOperationsCounts((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        importCount: entryDir === 'Import' ? Math.max(0, (prev.importCount || 0) - 1) : prev.importCount,
        exportCount: entryDir === 'Export' ? Math.max(0, (prev.exportCount || 0) - 1) : prev.exportCount,
        activeTotalCount: Math.max(0, (prev.activeTotalCount || 0) - 1),
        deletedCount: (prev.deletedCount || 0) + 1,
      };
    });

    try {
      await deleteOperation(opId);
      showToast(
        lang === 'ar'
          ? 'تم إيقاف العملية بنجاح ونقلها إلى سجل العمليات غير النشطة'
          : 'Operation moved to Inactive archive successfully',
        'success'
      );
      // Fast refresh in background
      refreshActiveOperations();
      if (hasLoadedDeleted) loadDeletedOperations(true);
      return true;
    } catch (err) {
      console.error('Failed to delete operation:', err);
      refreshActiveOperations();
      const errMsg = extractErrorMessage(err) || 'Failed to delete operation';
      showToast(lang === 'ar' ? `خطأ أثناء الحذف: ${errMsg}` : `Error deleting: ${errMsg}`, 'error');
      throw err;
    }
  };

  const handleSaveShipment = async (dir, shipRef, updatedRows, options = {}) => {
    const { silent = false, isBulk = false, outInfo = null } = options;
    if (!updatedRows || updatedRows.length === 0) return false;
    const first = updatedRows[0];
    const opId = toGuidOrNull(first._operationId);

    // If shipment has no server GUID (uploaded or draft shipment), try to create it in the database
    if (!opId) {
      const isImp = first.operationType
        ? first.operationType === 'Import'
        : dir === 'Import' || (first.bl !== undefined && !first.booking);

      let clientId = first.clientId;
      if (!clientId && lookups.customers?.length > 0) {
        const match = lookups.customers.find(
          (c) => (c.companyName || c.name || '').toLowerCase() === String(first.client || '').toLowerCase().trim()
        );
        clientId = match ? (match.customerId || match.id) : (lookups.customers[0]?.customerId || lookups.customers[0]?.id);
      }

      let shippingLineId = first.lineId;
      if (!shippingLineId && lookups.shippingLines?.length > 0) {
        const match = lookups.shippingLines.find(
          (l) => (l.name || '').toLowerCase() === String(first.line || '').toLowerCase().trim() || (l.abbreviation || '').toLowerCase() === String(first.line || '').toLowerCase().trim()
        );
        shippingLineId = match ? match.id : lookups.shippingLines[0]?.id;
      }

      let portId = first.podId || first.polId;
      if (!portId && lookups.ports?.length > 0) {
        const targetPort = isImp ? first.pod : first.pol;
        const match = lookups.ports.find(
          (p) => (p.name || '').toLowerCase() === String(targetPort || '').toLowerCase().trim()
        );
        portId = match ? match.id : lookups.ports[0]?.id;
      }

      const refCode = (isImp ? first.bl : first.booking) || first.shipNo;

      if (clientId && shippingLineId && portId && refCode) {
        try {
          const createPayload = {
            clientId,
            shippingLineId,
            operationType: isImp ? 1 : 2,
            numberOfContainers: updatedRows.length,
            mblNumber: isImp ? refCode.trim() : null,
            destination: isImp ? (first.dest?.trim() || 'Cairo') : null,
            podId: isImp ? portId : null,
            freeTimeTill: isImp ? (first.free || new Date().toISOString().slice(0, 10)) : null,
            requiredOffloadingDate: isImp ? (first.reqDate || new Date().toISOString().slice(0, 10)) : null,
            requiredOffloadingTime: isImp ? (first.reqTime ? (first.reqTime.length === 5 ? `${first.reqTime}:00` : first.reqTime) : '08:00:00') : null,
            clearanceType: isImp ? null : (String(first.clrType || 'CERT').toUpperCase() === 'BOSLA' ? 1 : 2),
            bookingNumber: isImp ? null : refCode.trim(),
            polId: isImp ? null : portId,
            exportDestination: isImp ? null : (first.dest?.trim() || null),
            cutOffDate: isImp ? null : (first.cut || null),
          };

          const newOpId = await createOperation(createPayload);
          if (newOpId) {
            // Remove from local draft as it is now in the database
            try {
              const draftJson = localStorage.getItem('ocean_transport_uploaded_draft');
              if (draftJson) {
                const parsedDraft = JSON.parse(draftJson);
                const targetDir = isImp ? 'Import' : 'Export';
                parsedDraft[targetDir] = (parsedDraft[targetDir] || []).filter(
                  (r) => r.bl !== refCode && r.booking !== refCode && r.shipNo !== refCode
                );
                localStorage.setItem('ocean_transport_uploaded_draft', JSON.stringify(parsedDraft));
              }
            } catch (e) { }

            if (!isBulk) {
              await refreshActiveOperations();
              if (!silent) {
                showToast(
                  lang === 'ar'
                    ? `تم إنشاء وحفظ العملية ${refCode} في قاعدة البيانات بنجاح`
                    : `Successfully created and saved operation ${refCode} in database`,
                  'success'
                );
              }
            }
            return true;
          }
        } catch (serverErr) {
          const errMsg = extractErrorMessage(serverErr);
          const isDuplicate =
            errMsg.includes('مسجل بالفعل') ||
            errMsg.includes('already exists') ||
            errMsg.includes('مكرر') ||
            errMsg.includes('تكرار') ||
            serverErr?.response?.status === 400;

          if (outInfo) {
            outInfo.isDuplicate = isDuplicate;
            outInfo.error = errMsg;
          }

          if (!silent) {
            showToast(
              lang === 'ar'
                ? `تعذر حفظ العملية (${refCode}): ${errMsg}`
                : `Could not save operation (${refCode}): ${errMsg}`,
              'error'
            );
          }
          return false;
        }
      } else {
        if (outInfo) {
          outInfo.isDuplicate = false;
          outInfo.error = 'Missing required lookup data';
        }
        if (isBulk) return false;
      }

      // Fallback: save to React state and localStorage draft so refresh doesn't lose it
      setEntry((prev) => {
        const dirs = dir === 'Delivered' ? ['Import', 'Export'] : [dir];
        const next = { ...prev };
        for (const d of dirs) {
          const list = [...(next[d] || [])];
          updatedRows.forEach((upRow) => {
            const idx = list.findIndex(
              (r) => (r._rowId && r._rowId === upRow._rowId) || (r._ref && r._ref === upRow._ref)
            );
            if (idx !== -1) {
              list[idx] = { ...upRow };
            }
          });
          next[d] = list;
        }
        try {
          localStorage.setItem('ocean_transport_uploaded_draft', JSON.stringify(next));
        } catch (e) { }
        return next;
      });

      if (!silent) {
        showToast(
          lang === 'ar'
            ? 'تم حفظ التعديلات في المسودة بنجاح (محفوظة حتى مع عمل رفرش)'
            : 'Saved in draft successfully (persists across page refreshes)',
          'info'
        );
      }
      return true;
    }

    // Accurately determine direction from operationType or row attributes
    const isImport = first.operationType
      ? first.operationType === 'Import'
      : dir === 'Import' || (first.bl !== undefined && !first.booking);

    if (isImport) {
      const payload = {
        shipmentNumber: first.shipNo?.trim() || null,
        certificateNumber: first.cert?.trim() || null,
        invoicesReceivedDate: first.invRcv
          ? (first.invRcv.includes('T') ? first.invRcv : `${first.invRcv.slice(0, 10)}T00:00:00Z`)
          : null,
        containers: updatedRows.map((r) => {
          const cntrId = toGuidOrNull(r._containerId);
          if (!cntrId) {
            throw new Error(lang === 'ar' ? 'معرّف الحاوية غير صالح في قاعدة البيانات' : 'Invalid container ID');
          }

          let resolvedTruckerId = toGuidOrNull(r.truckerId);
          if (!resolvedTruckerId && r.trucker && lookups.transporters?.length > 0) {
            const m = lookups.transporters.find(
              (t) => (t.name || '').trim().toLowerCase() === String(r.trucker).trim().toLowerCase()
            );
            if (m) resolvedTruckerId = m.id;
          }

          let resolvedDriverId = toGuidOrNull(r.driverId);
          if (!resolvedDriverId && (r.driver || r.mob) && lookups.drivers?.length > 0) {
            const m = lookups.drivers.find(
              (d) =>
                (r.mob && d.mobileNumber && d.mobileNumber.trim() === String(r.mob).trim()) ||
                (r.driver && d.name && d.name.trim().toLowerCase() === String(r.driver).trim().toLowerCase())
            );
            if (m) resolvedDriverId = m.id;
          }

          let resolvedVehicleId = toGuidOrNull(r.carId);
          if (!resolvedVehicleId && r.car && lookups.vehicles?.length > 0) {
            const m = lookups.vehicles.find(
              (v) => (v.carNumber || '').trim().toLowerCase() === String(r.car).trim().toLowerCase()
            );
            if (m) resolvedVehicleId = m.id;
          }

          return {
            containerId: cntrId,
            actualArrivalDate: r.arrDate ? r.arrDate.slice(0, 10) : null,
            actualArrivalTime: r.arrTime ? (r.arrTime.length === 5 ? `${r.arrTime}:00` : r.arrTime.slice(0, 8)) : null,
            gateOutDate: r.gateOut ? r.gateOut.slice(0, 10) : null,
            gateOutTime: r.gateOutT ? (r.gateOutT.length === 5 ? `${r.gateOutT}:00` : r.gateOutT.slice(0, 8)) : null,
            containerType: normalizeContainerType(r.size) || null,
            containerNumber: r.cntr?.trim() || null,
            transporterId: resolvedTruckerId,
            vehicleId: resolvedVehicleId,
            carNumber: r.car?.trim() || null,
            driverId: resolvedDriverId,
            checkOutFromThePort: r.checkout
              ? (r.checkout.includes('T') ? r.checkout : `${r.checkout.slice(0, 10)}T00:00:00Z`)
              : null,
            missingDocs: r.missDoc?.trim() || null,
            missingDocsReceivedDate: r.missRcv ? r.missRcv.slice(0, 10) : null,
            destination: r.dest?.trim() || null,
            freeTimeTill: r.free ? r.free.slice(0, 10) : null,
          };
        }),
      };

      try {
        await updateImportOperation(opId, payload);
        if (!silent) {
          showToast(
            lang === 'ar'
              ? 'تم حفظ تعديلات الشحنة بنجاح في قاعدة البيانات'
              : 'Import shipment saved successfully in database',
            'success'
          );
        }
        if (!isBulk) await refreshActiveOperations();
        return true;
      } catch (err) {
        console.error('Failed to update import operation:', err);
        const errMsg = extractErrorMessage(err);
        const isDuplicate =
          errMsg.includes('مسجل بالفعل') ||
          errMsg.includes('already exists') ||
          errMsg.includes('مكرر') ||
          errMsg.includes('تكرار');

        if (outInfo) {
          outInfo.isDuplicate = isDuplicate;
          outInfo.error = errMsg;
        }

        if (!silent) {
          showToast(lang === 'ar' ? `خطأ أثناء حفظ التعديلات: ${errMsg}` : `Error saving updates: ${errMsg}`, 'error');
        }
        if (!isBulk) throw err;
        return false;
      }
    } else {
      // Export
      const clr = String(first.clrType || 'CERT').toUpperCase();

      // Resolve port IDs robustly by ID or Name
      let resolvedPodId = toGuidOrNull(first.podId);
      if (!resolvedPodId && first.pod && lookups.ports?.length > 0) {
        const pMatch = lookups.ports.find(
          (p) => (p.name || '').toLowerCase().trim() === String(first.pod || '').toLowerCase().trim() ||
            (p.code || '').toLowerCase().trim() === String(first.pod || '').toLowerCase().trim() ||
            p.id === first.pod
        );
        if (pMatch) resolvedPodId = pMatch.id;
      }

      let resolvedPowId = toGuidOrNull(first.powId);
      if (!resolvedPowId && first.pow && lookups.ports?.length > 0) {
        const pMatch = lookups.ports.find(
          (p) => (p.name || '').toLowerCase().trim() === String(first.pow || '').toLowerCase().trim() ||
            (p.code || '').toLowerCase().trim() === String(first.pow || '').toLowerCase().trim() ||
            p.id === first.pow
        );
        if (pMatch) resolvedPowId = pMatch.id;
      }

      let resolvedPolId = toGuidOrNull(first.polId);
      if (!resolvedPolId && first.pol && lookups.ports?.length > 0) {
        const pMatch = lookups.ports.find(
          (p) => (p.name || '').toLowerCase().trim() === String(first.pol || '').toLowerCase().trim() ||
            (p.code || '').toLowerCase().trim() === String(first.pol || '').toLowerCase().trim() ||
            p.id === first.pol
        );
        if (pMatch) resolvedPolId = pMatch.id;
      }

      const payload = {
        shipmentNumber: first.shipNo?.trim() || null,
        certificateNumber: clr === 'CERT' ? (first.cert?.trim() || null) : null,
        customs: clr === 'BOSLA' ? (first.customs?.trim() || null) : null,
        polId: resolvedPolId,
        podId: resolvedPodId,
        powId: resolvedPowId,
        clearPOD: !first.pod && !resolvedPodId,
        clearPOW: !first.pow && !resolvedPowId,
        invoicesReceivedDate: first.invRcv
          ? (first.invRcv.includes('T') ? first.invRcv : `${first.invRcv.slice(0, 10)}T00:00:00Z`)
          : null,
        containers: updatedRows.map((r) => {
          const cntrId = toGuidOrNull(r._containerId);
          if (!cntrId) {
            throw new Error(lang === 'ar' ? 'معرّف الحاوية غير صالح في قاعدة البيانات' : 'Invalid container ID');
          }
          const cntrNum = r.cntr?.trim() || null;

          let resolvedTruckerId = toGuidOrNull(r.truckerId);
          if (!resolvedTruckerId && r.trucker && lookups.transporters?.length > 0) {
            const m = lookups.transporters.find(
              (t) => (t.name || '').trim().toLowerCase() === String(r.trucker).trim().toLowerCase()
            );
            if (m) resolvedTruckerId = m.id;
          }

          let resolvedDriverId = toGuidOrNull(r.driverId);
          if (!resolvedDriverId && (r.driver || r.mob) && lookups.drivers?.length > 0) {
            const m = lookups.drivers.find(
              (d) =>
                (r.mob && d.mobileNumber && d.mobileNumber.trim() === String(r.mob).trim()) ||
                (r.driver && d.name && d.name.trim().toLowerCase() === String(r.driver).trim().toLowerCase())
            );
            if (m) resolvedDriverId = m.id;
          }

          let resolvedVehicleId = toGuidOrNull(r.carId);
          if (!resolvedVehicleId && r.car && lookups.vehicles?.length > 0) {
            const m = lookups.vehicles.find(
              (v) => (v.carNumber || '').trim().toLowerCase() === String(r.car).trim().toLowerCase()
            );
            if (m) resolvedVehicleId = m.id;
          }

          return {
            containerId: cntrId,
            containerType: normalizeContainerType(r.size) || null,
            containerNumber: cntrNum ? cntrNum.slice(0, 11) : null,
            requiredLoadingDate: r.reqDate ? r.reqDate.slice(0, 10) : null,
            requiredLoadingTime: r.reqTime ? (r.reqTime.length === 5 ? `${r.reqTime}:00` : r.reqTime.slice(0, 8)) : null,
            destination: r.dest?.trim() || null,
            actualArrivalDate: r.arrDate ? r.arrDate.slice(0, 10) : null,
            actualArrivalTime: r.arrTime ? (r.arrTime.length === 5 ? `${r.arrTime}:00` : r.arrTime.slice(0, 8)) : null,
            gateOutDate: r.gateOut ? r.gateOut.slice(0, 10) : null,
            gateOutTime: r.gateOutT ? (r.gateOutT.length === 5 ? `${r.gateOutT}:00` : r.gateOutT.slice(0, 8)) : null,
            transporterId: resolvedTruckerId,
            vehicleId: resolvedVehicleId,
            carNumber: r.car?.trim() || null,
            driverId: resolvedDriverId,
            missingDocs: r.missDoc?.trim() || null,
            missingDocsReceivedDate: r.missRcv ? r.missRcv.slice(0, 10) : null,
          };
        }),
      };

      try {
        await updateExportOperation(opId, payload);
        if (!silent) {
          showToast(
            lang === 'ar'
              ? 'تم حفظ تعديلات شحنة الصادر بنجاح في قاعدة البيانات'
              : 'Export shipment saved successfully in database',
            'success'
          );
        }
        if (!isBulk) await refreshActiveOperations();
        return true;
      } catch (err) {
        console.error('Failed to update export operation:', err);
        const errMsg = extractErrorMessage(err);
        const isDuplicate =
          errMsg.includes('مسجل بالفعل') ||
          errMsg.includes('already exists') ||
          errMsg.includes('مكرر') ||
          errMsg.includes('تكرار');

        if (outInfo) {
          outInfo.isDuplicate = isDuplicate;
          outInfo.error = errMsg;
        }

        if (!silent) {
          showToast(lang === 'ar' ? `خطأ أثناء حفظ التعديلات: ${errMsg}` : `Error saving updates: ${errMsg}`, 'error');
        }
        if (!isBulk) throw err;
        return false;
      }
    }
  };

  const handleRestoreShipment = (dir, shipRef, originalRows) => {
    setEntry((prev) => {
      const dirs = dir === 'Delivered' ? ['Import', 'Export'] : [dir];
      const next = { ...prev };
      for (const d of dirs) {
        const currentList = [...(next[d] || [])];
        originalRows.forEach((orig) => {
          const idx = currentList.findIndex(
            (r, i) =>
              (orig._rowId && r._rowId === orig._rowId) ||
              (orig._containerId && r._containerId === orig._containerId) ||
              i === orig._originalIdx
          );
          if (idx !== -1) {
            currentList[idx] = { ...orig };
          }
        });
        next[d] = currentList;
      }
      return next;
    });
  };

  const handleApproveMatch = async (match) => {
    const { im, ex, pairKey, score } = match;

    const cntrNorm = String(im?.cntr || '').trim().toUpperCase();
    const blNorm = String(im?.bl || '').trim().toUpperCase();
    const cntrBlKey = cntrNorm && blNorm ? `${cntrNorm}|${blNorm}` : null;

    // 1. Mark as approved in local React state so UI updates immediately.
    // Notice: We add cntrBlKey so this container is blocked under this M/BL only!
    setApprovals((prev) => {
      const next = new Set(prev);
      if (pairKey) next.add(pairKey);
      if (cntrBlKey) next.add(cntrBlKey);
      if (im?._containerId) next.add(String(im._containerId).toLowerCase());
      return next;
    });

    // 2. Build the rich approved allocation record
    const newRecord = {
      id: `appr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      pairKey: pairKey || `${im?.cntr}|${im?.bl}|${ex?.booking}`,
      type: 'assigned',
      im: { ...im },
      ex: { ...ex },
      score: { ...score },
      approvedAt: new Date().toISOString(),
      approvedBy: 'Operations',
    };

    setFclApprovedList((prev) => {
      const next = [newRecord, ...prev.filter((r) => r.pairKey !== newRecord.pairKey)];
      try {
        localStorage.setItem('fcl_approved_allocations_v2', JSON.stringify(next));
      } catch (e) { }
      return next;
    });

    // 3. Assign container to export shipment in memory AND in backend database
    if (im?.cntr && ex) {
      const exportList = entry.Export || [];
      const targetRef = ex._ref || ex.booking;

      // Find all rows belonging to this export shipment
      const shipmentRows = exportList.filter(
        (r) => r.booking === ex.booking || r._ref === targetRef
      );

      // Find the specific container row to assign to
      let assignedRow = null;
      const updatedShipmentRows = shipmentRows.map((r) => {
        const isTargetSlot =
          (ex._containerId && r._containerId === ex._containerId) ||
          (ex._rowId && r._rowId === ex._rowId) ||
          (ex.ordinal && r.ordinal === ex.ordinal && (r.booking === ex.booking || r._ref === targetRef));

        if (!assignedRow && (isTargetSlot || (!r.cntr && (r.booking === ex.booking || r._ref === targetRef)))) {
          // Transfer transport & driver details from the matched import container
          let truckerName = im.trucker || r.trucker || '';
          let truckerId = im.truckerId || r.truckerId || null;
          if (!truckerId && truckerName && lookups.transporters?.length > 0) {
            const tMatch = lookups.transporters.find(
              (t) => (t.name || '').trim().toLowerCase() === truckerName.trim().toLowerCase()
            );
            if (tMatch) truckerId = tMatch.id;
          }

          let carNumber = im.car || r.car || '';
          let carId = im.carId || r.carId || null;
          if (!carId && carNumber && lookups.vehicles?.length > 0) {
            const vMatch = lookups.vehicles.find(
              (v) => (v.carNumber || '').trim().toLowerCase() === carNumber.trim().toLowerCase()
            );
            if (vMatch) carId = vMatch.id;
          }

          let driverName = im.driver || r.driver || '';
          let driverId = im.driverId || r.driverId || null;
          let driverMob = im.mob || r.mob || '';
          if (!driverId && (driverName || driverMob) && lookups.drivers?.length > 0) {
            const dMatch = lookups.drivers.find(
              (d) =>
                (driverMob && d.mobileNumber && d.mobileNumber.trim() === driverMob.trim()) ||
                (driverName && d.name && d.name.trim().toLowerCase() === driverName.trim().toLowerCase())
            );
            if (dMatch) {
              driverId = dMatch.id;
              if (!driverName) driverName = dMatch.name;
              if (!driverMob) driverMob = dMatch.mobileNumber;
            }
          }

          assignedRow = {
            ...r,
            cntr: im.cntr,
            size: im.size || r.size,
            line: im.line || r.line,
            trucker: truckerName,
            truckerId: truckerId,
            car: carNumber,
            carId: carId,
            driver: driverName,
            driverId: driverId,
            mob: driverMob,
          };
          return assignedRow;
        }
        return r;
      });

      // Update local state immediately
      if (assignedRow) {
        setEntry((prev) => ({
          ...prev,
          Export: (prev.Export || []).map((r) => {
            if (
              (assignedRow._containerId && r._containerId === assignedRow._containerId) ||
              (assignedRow._rowId && r._rowId === assignedRow._rowId)
            ) {
              return assignedRow;
            }
            return r;
          }),
        }));

        // Persist approval to backend FclApprovals table FIRST so loadData sees it
        if (im?._containerId && !String(im._containerId).startsWith('dummy_')) {
          try {
            await approveFclSuggestion(im._containerId);
          } catch (err) {
            console.warn('Backend FCL approval note:', err?.response?.data?.error || err.message);
          }
        }

        // Persist to database using handleSaveShipment (which calls loadData to refresh)
        try {
          showToast(
            lang === 'ar'
              ? `جاري حفظ وتخصيص الحاوية ${im.cntr} في شحنة الصادر...`
              : `Assigning container ${im.cntr} to export shipment...`
          );
          await handleSaveShipment('Export', targetRef, updatedShipmentRows, { silent: false });
        } catch (e) {
          console.error('Assign save error:', e);
          showToast(
            lang === 'ar'
              ? `فشل حفظ التخصيص في قاعدة البيانات: ${extractErrorMessage(e)}`
              : `Failed to persist assignment: ${extractErrorMessage(e)}`,
            'error'
          );
        }
      }
    }

    showToast(
      lang === 'ar'
        ? `تم اعتماد وتخصيص الحاوية ${im?.cntr || ''} لشحنة الصادر ${ex?.booking || ''} بنجاح`
        : `Approved & assigned container ${im?.cntr || ''} to booking ${ex?.booking || ''}`
    );
  };

  const handleUnapproveMatch = async (record) => {
    if (!record) return;
    if (record.type === 'assigned') {
      showToast(
        lang === 'ar'
          ? 'لا يمكن التراجع عن تخصيص نهائي من هنا؛ الحاوية ارتبطت رسمياً بشحنة الصادر في تفاصيل العمليات'
          : 'Cannot revoke a committed assignment from here',
        'error'
      );
      return;
    }

    const { im, pairKey } = record;

    // 1. Remove from approvals Set so the match immediately reappears as candidate
    setApprovals((prev) => {
      const next = new Set(prev);
      if (pairKey) next.delete(pairKey);
      if (im?._containerId) next.delete(String(im._containerId).toLowerCase());
      if (im?.cntr) next.delete(String(im.cntr).toUpperCase());
      return next;
    });

    // 2. Remove from approved records list
    setFclApprovedList((prev) => {
      const next = prev.filter((r) => r.id !== record.id && r.pairKey !== pairKey);
      try {
        localStorage.setItem('fcl_approved_allocations_v2', JSON.stringify(next));
      } catch (e) { }
      return next;
    });

    // 3. Call backend unapprove endpoint if available
    if (im?._containerId && !String(im._containerId).startsWith('dummy_')) {
      try {
        await unapproveFclSuggestion(im._containerId);
      } catch (e) {
        console.warn('Backend unapprove note:', e.message);
      }
    }

    showToast(
      lang === 'ar'
        ? `تم التراجع عن اعتماد الحاوية ${im?.cntr || ''} وإعادتها لقائمة الترشيحات المتاحة`
        : `Revoked approval for container ${im?.cntr || ''} and restored to available matches`
    );
  };

  const handleUploadSuccess = async (parsed, fileName, options = {}) => {
    const newEntry = {
      Import: parsed.Import?.length ? parsed.Import : entry.Import,
      Export: parsed.Export?.length ? parsed.Export : entry.Export,
    };

    // Rebuild ships mapping so group collapsing and table rendering work seamlessly
    const newShips = { Import: {}, Export: {} };
    ['Import', 'Export'].forEach((dir) => {
      const rows = newEntry[dir] || [];
      rows.forEach((r, idx) => {
        const ref = r._ref || (dir === 'Import' ? r.bl : r.booking) || r.shipNo || `REF_${idx}`;
        if (!newShips[dir][ref]) {
          newShips[dir][ref] = {
            id: r._operationId || null,
            ref,
            dir,
            status: r.status || 'Open',
            day: r.reqDate || new Date().toISOString().slice(0, 10),
            user: r.oper || '',
            rows: [],
            unmerged: [],
          };
        }
        newShips[dir][ref].rows.push(idx);
      });
    });

    setEntry(newEntry);
    setShips(newShips);

    try {
      localStorage.setItem('ocean_transport_uploaded_draft', JSON.stringify(newEntry));
    } catch (e) { }

    const totalCount = (parsed.Import?.length || 0) + (parsed.Export?.length || 0);

    if (options.saveToDb) {
      await handleSaveAllDraftsToDatabase(newEntry);
    } else {
      showToast(
        lang === 'ar'
          ? `تم استيراد ${totalCount} صف في المسودة بنجاح. لحفظها نهائياً بالسيرفر اضغط "حفظ في الداتا بيز".`
          : `Loaded ${totalCount} rows as draft. Click "Save to DB" to insert into SQL Server.`,
        'success'
      );
    }
  };

  const unsavedDrafts = useMemo(() => {
    if (!canUploadReport) return [];
    const list = [];
    ['Import', 'Export'].forEach((dir) => {
      const rows = entry[dir] || [];
      const grouped = {};
      rows.forEach((r) => {
        if (!r._operationId) {
          const ref = r._ref || (dir === 'Import' ? r.bl : r.booking) || r.shipNo;
          if (ref) {
            if (!grouped[ref]) grouped[ref] = [];
            grouped[ref].push(r);
          }
        }
      });
      Object.keys(grouped).forEach((ref) => {
        list.push({ dir, ref, rows: grouped[ref] });
      });
    });
    return list;
  }, [entry, canUploadReport]);

  const handleSaveAllDraftsToDatabase = async (targetEntry = null) => {
    // If invoked from an onClick event handler, targetEntry is a SyntheticEvent object, not a data dictionary
    const validTarget = (targetEntry && (Array.isArray(targetEntry.Import) || Array.isArray(targetEntry.Export))) ? targetEntry : null;
    const currentEntry = validTarget || entry;
    setIsLoadingData(true);
    let successCount = 0;
    let duplicateCount = 0;
    let failCount = 0;

    const shipmentsToSave = [];
    ['Import', 'Export'].forEach((dir) => {
      const rows = currentEntry[dir] || [];
      const grouped = {};
      rows.forEach((r) => {
        if (!r._operationId) {
          const ref = r._ref || (dir === 'Import' ? r.bl : r.booking) || r.shipNo || `SHIP_${Math.random()}`;
          if (!grouped[ref]) grouped[ref] = [];
          grouped[ref].push(r);
        }
      });
      Object.keys(grouped).forEach((ref) => {
        shipmentsToSave.push({ dir, ref, rows: grouped[ref] });
      });
    });

    if (shipmentsToSave.length === 0) {
      // Clear any stale local storage key so the button doesn't remain stuck
      try {
        localStorage.removeItem('ocean_transport_uploaded_draft');
      } catch (e) { }
      showToast(
        lang === 'ar' ? 'جميع الشحنات محفوظة بالفعل في قاعدة البيانات.' : 'All shipments are already saved in database.',
        'info'
      );
      setIsLoadingData(false);
      return;
    }

    showToast(
      lang === 'ar'
        ? `جاري فحص وحفظ ${shipmentsToSave.length} عملية في قاعدة البيانات SQL Server...`
        : `Checking and saving ${shipmentsToSave.length} operations to SQL Server...`,
      'info'
    );

    for (const item of shipmentsToSave) {
      const outInfo = { isDuplicate: false, error: null };
      try {
        const ok = await handleSaveShipment(item.dir, item.ref, item.rows, {
          silent: true,
          isBulk: true,
          outInfo,
        });
        if (ok) {
          successCount++;
        } else {
          if (outInfo.isDuplicate) {
            duplicateCount++;
          } else {
            failCount++;
          }
        }
      } catch (e) {
        failCount++;
      }
    }

    try {
      localStorage.removeItem('ocean_transport_uploaded_draft');
    } catch (e) { }

    await loadData();
    setIsLoadingData(false);

    if (successCount > 0 && duplicateCount === 0 && failCount === 0) {
      showToast(
        lang === 'ar'
          ? `تم حفظ جميع الشحنات (${successCount} عملية) بنجاح تام في قاعدة بيانات SQL Server!`
          : `Finished: All ${successCount} operations saved successfully to SQL Server!`,
        'success',
        {
          title: lang === 'ar' ? 'اكتمل الحفظ بنجاح' : 'Save Completed',
          duration: 12000,
        }
      );
    } else if (successCount === 0 && duplicateCount > 0) {
      showToast(
        lang === 'ar'
          ? `لم يتم حفظ أي عملية: تم فحص جميع الشحنات (${duplicateCount}) ووجد أنها مسجلة ومحفوظة بالفعل مسبقاً في قاعدة البيانات (تم منع التكرار بنجاح).`
          : `No operations saved: All ${duplicateCount} shipments already exist in the database (duplicates prevented).`,
        'warning',
        {
          title: lang === 'ar' ? 'تنبيه: جميع الشحنات مسجلة مسبقاً' : 'Duplicate Shipments Notice',
          duration: 14000,
        }
      );
    } else if (successCount > 0 && duplicateCount > 0) {
      showToast(
        lang === 'ar'
          ? `اكتمل الفحص: تم حفظ ${successCount} عملية جديدة بنجاح في قاعدة البيانات، وتم تخطي ${duplicateCount} عملية لأنها مسجلة مسبقاً لمنع التكرار.`
          : `Save complete: Saved ${successCount} new operations successfully, and skipped ${duplicateCount} duplicate operations.`,
        'info',
        {
          title: lang === 'ar' ? 'تقرير حفظ الشحنات' : 'Save Report',
          duration: 14000,
        }
      );
    } else if (failCount > 0 && successCount === 0) {
      showToast(
        lang === 'ar'
          ? `تعذر حفظ ${failCount} عملية في قاعدة البيانات. يرجى مراجعة بيانات الشحنات والتأكد من مطابقتها.`
          : `Failed to save ${failCount} operations to database. Please review shipment details.`,
        'error',
        {
          title: lang === 'ar' ? 'تعذر الحفظ' : 'Save Failed',
          duration: 14000,
        }
      );
    } else {
      showToast(
        lang === 'ar'
          ? `تم الانتهاء: تم حفظ ${successCount} عملية بنجاح، وتخطي ${duplicateCount + failCount} عملية.`
          : `Finished: ${successCount} saved, ${duplicateCount + failCount} skipped/failed.`,
        'info',
        {
          title: lang === 'ar' ? 'تقرير العمليات' : 'Operation Report',
          duration: 12000,
        }
      );
    }
  };

  const handleExportExcel = (selectedRefs = [], activeRows = []) => {
    setExportExcelSelectedRefs(Array.isArray(selectedRefs) ? selectedRefs : []);
    setExportExcelActiveRows(Array.isArray(activeRows) ? activeRows : []);
    setExportExcelModalOpen(true);
  };

  const switchToView = async (targetMode) => {
    setViewMode(targetMode);
    if (targetMode === 'entry') {
      navigate('/transport/entry');
    } else {
      navigate('/transport/dashboard');
      if (!entry.Import || entry.Import.length === 0) {
        setIsLoadingData(true);
        try {
          const ops = await getAllOperations(true);
          if (Array.isArray(ops)) {
            processOperationsResult(ops);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsLoadingData(false);
        }
      }
    }
  };

  return (
    <div className="min-h-full space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Main Page Header (Dashboard Mode Only) */}
      {viewMode === 'dashboard' && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <Ship size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {lang === 'ar' ? 'داشبورد النقل البري وترشيحات FCL' : 'Transport Operations Dashboard'}
                </h1>
                <span className="rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                  Analytics & FCL
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {lang === 'ar'
                  ? 'مؤشرات الأداء، فلاتر الشحنات، وترشيحات إعادة استخدام الحاويات FCL.'
                  : 'KPI metrics, shipment filters, and Full Container Load reuse matching.'}
              </p>
            </div>
          </div>

          {/* Action Controls & Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => switchToView('entry')}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <FileEdit size={15} />
              {lang === 'ar' ? 'شاشة الإدخال (Data Entry)' : 'Data Entry Grid'}
            </button>

            {/* Export Excel */}
            <button
              type="button"
              onClick={() => handleExportExcel(dashTab)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <FileSpreadsheet size={15} className="text-emerald-600" />
              {lang === 'ar' ? 'حفظ كاكسيل' : 'Save as Excel'}
            </button>

            {/* Language Toggle */}
            <button
              type="button"
              onClick={toggleLang}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer"
            >
              <Globe size={15} />
              {lang === 'ar' ? 'EN' : 'عربي'}
            </button>
          </div>
        </div>
      )}

      {/* VIEW MODE 1: DASHBOARD */}
      {viewMode === 'dashboard' && (
        <div className="space-y-6">
          {/* Dashboard Direction Tabs (Import / Export / FCL) - Exactly like the original */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <button
              type="button"
              onClick={() => handleSelectDashTab('Import')}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${dashTab === 'Import'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
            >
              <ArrowDownCircle size={16} />
              <span>{lang === 'ar' ? 'الوارد (Import)' : 'Import Trips'}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${dashTab === 'Import' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                  }`}
              >
                {entry.Import?.length || 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectDashTab('Export')}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${dashTab === 'Export'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
            >
              <ArrowUpCircle size={16} />
              <span>{lang === 'ar' ? 'الصادر (Export)' : 'Export Trips'}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${dashTab === 'Export' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                  }`}
              >
                {entry.Export?.length || 0}
              </span>
            </button>
          </div>

          {/* Tab Sub-View */}
          <AnalyticsTab
            data={enrichedData.filter((r) => r.dir === dashTab)}
            lang={lang}
            direction={dashTab}
          />
        </div>
      )}

      {/* VIEW MODE 2: DATA ENTRY GRID */}
      {viewMode === 'entry' && (
        <DataEntryTab
          entry={entry}
          ships={ships}
          lookups={lookups}
          isLoading={isLoadingData}
          onRefresh={() => loadData(true)}
          currentDir={entryDir}
          onChangeDir={handleDirChange}
          counts={operationsCounts}
          deliveredOperations={deliveredOperations}
          isLoadingDelivered={isLoadingDelivered}
          onRefreshDelivered={loadDeliveredOperations}
          onCreateOperation={handleCreateOperation}
          onUpdateCell={handleUpdateCell}
          onToggleStatus={handleToggleStatus}
          onSaveShipment={handleSaveShipment}
          onRestoreShipment={handleRestoreShipment}
          onReopenOperation={handleReopenOperation}
          onExportExcel={handleExportExcel}
          onOpenUploadModal={() => setUploadModalOpen(true)}
          onSwitchToDashboard={() => switchToView('dashboard')}
          onEmailIt={(selectedRefs = [], activeRows = []) => {
            setEmailSelectedRefs(selectedRefs);
            setEmailActiveRows(activeRows);
            setEmailModalOpen(true);
          }}
          onToggleLang={toggleLang}
          onSaveAllToDatabase={handleSaveAllDraftsToDatabase}
          unsavedDraftsCount={unsavedDrafts.length}
          onDeleteOperation={handleDeleteOperation}
          deletedOperations={deletedOperations}
          isLoadingDeleted={isLoadingDeleted}
          onRefreshDeleted={loadDeletedOperations}
          showToast={showToast}
          lang={lang}
          fclMatches={fclMatches}
          fclApprovedList={fclApprovedList}
          onApproveMatch={handleApproveMatch}
          onUnapproveMatch={handleUnapproveMatch}
          fclRecommendedCount={recommendedCount}
          enrichedData={enrichedData}
          isLoadingFcl={isLoadingFcl}
          onRefreshFcl={() => loadFclData(true)}
        />
      )}

      {/* Modals */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
        lang={lang}
      />

      <DataQualityModal
        isOpen={qualityModalOpen}
        onClose={() => setQualityModalOpen(false)}
        lang={lang}
      />

      <EmailDraftModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        currentDir={entryDir}
        entry={entry}
        activeRows={emailActiveRows}
        preSelectedRefs={emailSelectedRefs}
        showToast={showToast}
        lang={lang}
      />

      <ExportExcelModal
        isOpen={exportExcelModalOpen}
        onClose={() => setExportExcelModalOpen(false)}
        currentDir={entryDir}
        entry={entry}
        activeRows={exportExcelActiveRows}
        preSelectedRefs={exportExcelSelectedRefs}
        showToast={showToast}
        lang={lang}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div
          onMouseEnter={() => {
            if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
          }}
          onMouseLeave={() => {
            if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
            toastTimeoutRef.current = setTimeout(() => setToast(null), 4000);
          }}
          className={`fixed bottom-6 right-6 z-50 flex items-start gap-3.5 p-4 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all animate-in fade-in slide-in-from-bottom-5 duration-300 max-w-lg ${toast.type === 'error'
            ? 'bg-rose-950/95 text-rose-100 border-rose-600/70 shadow-rose-950/50 ring-1 ring-rose-500/30'
            : toast.type === 'warning'
              ? 'bg-amber-950/95 text-amber-100 border-amber-500/70 shadow-amber-950/50 ring-1 ring-amber-500/30'
              : toast.type === 'success'
                ? 'bg-emerald-950/95 text-emerald-100 border-emerald-500/70 shadow-emerald-950/50 ring-1 ring-emerald-500/30'
                : 'bg-slate-900/95 text-slate-100 border-slate-700/80 shadow-slate-950/50 ring-1 ring-slate-600/30'
            }`}
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
        >
          {/* Status Icon */}
          <div className="shrink-0 mt-0.5">
            {toast.type === 'error' && (
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300">
                <AlertCircle size={20} />
              </div>
            )}
            {toast.type === 'warning' && (
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
                <AlertTriangle size={20} />
              </div>
            )}
            {toast.type === 'success' && (
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300">
                <CheckCircle size={20} />
              </div>
            )}
            {toast.type === 'info' && (
              <div className="p-2 rounded-xl bg-sky-500/20 text-sky-300">
                <Info size={20} />
              </div>
            )}
          </div>

          {/* Content Body */}
          <div className="flex-1 min-w-0 pr-1">
            {toast.title && (
              <div className="text-xs font-bold uppercase tracking-wider mb-1 opacity-90 flex items-center gap-1.5">
                <span>{toast.title}</span>
              </div>
            )}
            <div className="text-xs sm:text-sm font-medium leading-relaxed select-text">
              {toast.message}
            </div>
          </div>

          {/* Dismiss Button */}
          <button
            type="button"
            onClick={() => setToast(null)}
            className="shrink-0 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
            title={lang === 'ar' ? 'إغلاق' : 'Close'}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
