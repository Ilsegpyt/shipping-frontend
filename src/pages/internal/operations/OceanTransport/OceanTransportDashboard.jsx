import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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

export const extractErrorMessage = (err) => {
  if (!err) return 'Unknown error';
  const data = err?.response?.data;
  if (!data) return err.message || 'Error updating operation';
  if (typeof data === 'string') return data;
  if (data.Error && typeof data.Error === 'string') return data.Error;
  if (data.error && typeof data.error === 'string') return data.error;
  if (data.message && typeof data.message === 'string') return data.message;
  if (data.title && typeof data.title === 'string') {
    if (data.errors && typeof data.errors === 'object') {
      const messages = Object.entries(data.errors)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
        .join(' | ');
      return `${data.title}: ${messages}`;
    }
    return data.title;
  }
  if (data.errors && typeof data.errors === 'object') {
    return Object.values(data.errors)
      .flat()
      .join(' | ');
  }
  return err.message || 'Error updating operation';
};

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
  getOperationCustomers,
  getOperationShippingLines,
  getOperationPorts,
  getOperationTransporters,
  getOperationDrivers,
  getOperationVehicles,
  getOperationDestinations,
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

  // Detect mode from URL: if path contains 'entry', start on entry mode, else dashboard
  const isEntryPath = location.pathname.includes('/entry');
  const [viewMode, setViewMode] = useState(isEntryPath ? 'entry' : 'dashboard'); // 'dashboard' | 'entry'

  // Within dashboard: 'Import' | 'Export' | 'FCL'
  const [dashTab, setDashTab] = useState('Import');
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

  // Core Data State
  const [entry, setEntry] = useState(INITIAL_ENTRY);
  const [ships, setShips] = useState(INITIAL_SHIPS);
  const [approvals, setApprovals] = useState(new Set());
  const [opSeq, setOpSeq] = useState(183);

  // Lookups & API Loading
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [lookups, setLookups] = useState({
    customers: [],
    shippingLines: [],
    ports: [],
    transporters: [],
    drivers: [],
    vehicles: [],
    destinations: [],
  });

  // Deleted Operations State
  const [deletedOperations, setDeletedOperations] = useState([]);
  const [isLoadingDeleted, setIsLoadingDeleted] = useState(false);

  const loadDeletedOperations = async () => {
    setIsLoadingDeleted(true);
    try {
      const data = await getDeletedOperations();
      if (Array.isArray(data)) {
        setDeletedOperations(data);
      }
    } catch (err) {
      console.error('Failed to load deleted operations:', err);
    } finally {
      setIsLoadingDeleted(false);
    }
  };

  // Fetch real data from Backend APIs
  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const [
        opsResult,
        customersResult,
        shippingLinesResult,
        portsResult,
        transportersResult,
        driversResult,
        vehiclesResult,
        destinationsResult,
        deletedResult,
      ] = await Promise.allSettled([
        getAllOperations(),
        getOperationCustomers(),
        getOperationShippingLines(),
        getOperationPorts(),
        getOperationTransporters(),
        getOperationDrivers(),
        getOperationVehicles(),
        getOperationDestinations(),
        getDeletedOperations(),
      ]);

      if (deletedResult.status === 'fulfilled' && Array.isArray(deletedResult.value)) {
        setDeletedOperations(deletedResult.value);
      }

      if (opsResult.status === 'fulfilled' && Array.isArray(opsResult.value)) {
        const { entry: mappedEntry, ships: mappedShips } = mapBackendOperationsToFrontend(opsResult.value);

        // Restore unpersisted uploaded rows from localStorage draft so refresh doesn't wipe them
        let savedDraft = null;
        try {
          const draftJson = localStorage.getItem('ocean_transport_uploaded_draft');
          if (draftJson) savedDraft = JSON.parse(draftJson);
        } catch (e) {}

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
      }

      setLookups({
        customers: customersResult.status === 'fulfilled' && Array.isArray(customersResult.value) ? customersResult.value : [],
        shippingLines: shippingLinesResult.status === 'fulfilled' && Array.isArray(shippingLinesResult.value) ? shippingLinesResult.value : [],
        ports: portsResult.status === 'fulfilled' && Array.isArray(portsResult.value) ? portsResult.value : [],
        transporters: transportersResult.status === 'fulfilled' && Array.isArray(transportersResult.value) ? transportersResult.value : [],
        drivers: driversResult.status === 'fulfilled' && Array.isArray(driversResult.value) ? driversResult.value : [],
        vehicles: vehiclesResult.status === 'fulfilled' && Array.isArray(vehiclesResult.value) ? vehiclesResult.value : [],
        destinations: destinationsResult.status === 'fulfilled' && Array.isArray(destinationsResult.value) ? destinationsResult.value : [],
      });
    } catch (err) {
      console.error('Failed to load operations data from backend:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [qualityModalOpen, setQualityModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailSelectedRefs, setEmailSelectedRefs] = useState([]);
  const [exportExcelModalOpen, setExportExcelModalOpen] = useState(false);
  const [exportExcelSelectedRefs, setExportExcelSelectedRefs] = useState([]);
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

  // FCL Recommendations
  const fclMatches = useMemo(() => {
    return fclCandidates(enrichedData, approvals);
  }, [enrichedData, approvals]);

  const recommendedCount = useMemo(() => {
    return fclMatches.filter((m) => m.score?.recommended).length;
  }, [fclMatches]);

  // Handlers
  const handleCreateOperation = async (dir, opData) => {
    const isImport = dir === 'Import';

    // 1. Resolve IDs from Lookups if not present directly
    let clientId = opData.clientId;
    if (!clientId && lookups.customers?.length > 0) {
      const match = lookups.customers.find(
        (c) => (c.companyName || c.name) === opData.client
      );
      if (match) clientId = match.customerId || match.id;
    }

    let shippingLineId = opData.shippingLineId;
    if (!shippingLineId && lookups.shippingLines?.length > 0) {
      const match = lookups.shippingLines.find(
        (l) => l.name === opData.line
      );
      if (match) shippingLineId = match.id;
    }

    let portId = opData.portId;
    if (!portId && lookups.ports?.length > 0) {
      const match = lookups.ports.find(
        (p) => p.name === opData.port
      );
      if (match) portId = match.id;
    }

    // 2. Validate Required Fields & Rules
    if (!clientId) {
      showToast(lang === 'ar' ? 'يرجى اختيار العميل من القائمة' : 'Please select a valid client');
      return;
    }
    if (!shippingLineId) {
      showToast(lang === 'ar' ? 'يرجى اختيار الخط الملاحي من القائمة' : 'Please select a valid shipping line');
      return;
    }
    if (!opData.blOrBooking || !opData.blOrBooking.trim()) {
      showToast(
        lang === 'ar'
          ? (isImport ? 'يرجى إدخال رقم البوليصة M/BL' : 'يرجى إدخال رقم البوكينج')
          : (isImport ? 'Please enter M/BL Number' : 'Please enter Booking Number')
      );
      return;
    }

    if (isImport) {
      if (!portId) {
        showToast(lang === 'ar' ? 'يرجى اختيار ميناء الوصول (POD)' : 'Please select POD');
        return;
      }
      if (!opData.dest || !opData.dest.trim()) {
        showToast(lang === 'ar' ? 'يرجى تحديد مكان التعتيق' : 'Please specify destination');
        return;
      }
      if (!opData.freeOrCut) {
        showToast(lang === 'ar' ? 'يرجى تحديد فترة السماح' : 'Please specify Free Time Till');
        return;
      }
      if (!opData.reqDate || !opData.reqTime) {
        showToast(lang === 'ar' ? 'يرجى تحديد تاريخ ووقت التعتيق المطلوب' : 'Please specify required offloading date and time');
        return;
      }
    } else {
      if (!portId) {
        showToast(lang === 'ar' ? 'يرجى اختيار ميناء الشحن (POL)' : 'Please select POL');
        return;
      }
    }

    // Helper to format TimeOnly: HH:mm:00
    const formatTimeOnly = (t) => {
      if (!t) return '08:00:00';
      const parts = t.split(':');
      if (parts.length === 2) return `${parts[0]}:${parts[1]}:00`;
      return t;
    };

    // Helper to resolve ClearanceType (Cert = 2, Bosla = 1)
    const resolveClearanceType = (val) => {
      if (!val) return 2;
      const str = String(val).toUpperCase();
      if (str === 'BOSLA' || str === '1') return 1;
      return 2;
    };

    const containerCount = Number(opData.cntrCount);
    if (!containerCount || containerCount <= 0) {
      showToast(
        lang === 'ar'
          ? 'عدد الحاويات (Containers in this operation) لا يمكن أن يكون صفر، يرجى إدخال عدد الحاويات (1 فأكثر)'
          : 'Containers in this operation cannot be 0, please enter a valid count'
      );
      return false;
    }

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
      freeTimeTill: isImport ? opData.freeOrCut : null,
      requiredOffloadingDate: isImport ? opData.reqDate : null,
      requiredOffloadingTime: isImport ? formatTimeOnly(opData.reqTime) : null,

      // Export Fields (Must be null for Import)
      clearanceType: isImport ? null : resolveClearanceType(opData.clrType),
      bookingNumber: isImport ? null : opData.blOrBooking.trim(),
      polId: isImport ? null : portId,
      powId: isImport ? null : (opData.powId || null),
      cutOffDate: isImport ? null : (opData.freeOrCut || null),
      exportDestination: isImport ? null : (opData.dest || null),
    };

    try {
      showToast(lang === 'ar' ? 'جاري إنشاء العملية في قاعدة البيانات...' : 'Creating operation in database...');
      await createOperation(payload);

      showToast(
        lang === 'ar'
          ? `تم إنشاء العملية بإجمالي ${containerCount} حاوية وحفظها بنجاح`
          : `Operation created with ${containerCount} container(s) successfully`
      );

      // Refresh data from backend to display real rows and containers
      await loadData();
      return true;
    } catch (err) {
      console.error('Failed to create operation:', err);
      const errMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        (typeof err?.response?.data === 'string' ? err.response.data : null) ||
        err?.message ||
        'Error creating operation';

      showToast(
        lang === 'ar'
          ? `خطأ أثناء إنشاء العملية: ${errMsg}`
          : `Error creating operation: ${errMsg}`
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
    const row = (entry[dir] || []).find(
      (r) => r._operationId === refOrOpId || r._ref === refOrOpId || r.shipNo === refOrOpId
    );
    const nextStatus = targetStatus || (row?.status === 'Delivered' ? 'Open' : 'Delivered');

    setEntry((prev) => {
      const list = (prev[dir] || []).map((r) => {
        if (r._operationId === refOrOpId || r._ref === refOrOpId || r.shipNo === refOrOpId) {
          return { ...r, status: nextStatus };
        }
        return r;
      });
      return { ...prev, [dir]: list };
    });

    if (row?._operationId && typeof row._operationId === 'string' && row._operationId.length > 20) {
      try {
        if (nextStatus === 'Delivered') {
          await deliverOperation(row._operationId);
        } else {
          await reopenOperation(row._operationId, 'Reopened from Data Entry');
        }
        showToast(
          lang === 'ar'
            ? `تم تحديث حالة العملية في السيرفر إلى ${nextStatus === 'Delivered' ? 'تم التسليم' : 'مفتوحة'}`
            : `Operation status updated to ${nextStatus}`
        );
      } catch (err) {
        console.error('Failed to update status on server:', err);
        showToast(
          lang === 'ar'
            ? 'فشل تحديث الحالة في قاعدة البيانات'
            : 'Failed to update status on server'
        );
      }
    } else {
      showToast(lang === 'ar' ? 'تم تحديث حالة الشحنة' : 'Shipment status updated');
    }
  };

  const handleReopenOperation = async (opId, reason) => {
    try {
      await reopenOperation(opId, reason);
      showToast(
        lang === 'ar'
          ? 'تمت إعادة فتح العملية بنجاح وأصبحت مفتوحة للتعديل'
          : 'Operation reopened successfully and is now open for editing'
      );
      await loadData();
      return true;
    } catch (err) {
      console.error('Failed to reopen operation:', err);
      const errMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        (typeof err?.response?.data === 'string' ? err.response.data : null) ||
        err?.message ||
        'Failed to reopen operation';
      showToast(lang === 'ar' ? `خطأ أثناء فتح العملية: ${errMsg}` : `Error reopening: ${errMsg}`);
      throw err;
    }
  };

  useEffect(() => {
    if (entryDir === 'Deleted') {
      loadDeletedOperations();
    }
  }, [entryDir]);

  const handleDeleteOperation = async (opId) => {
    try {
      await deleteOperation(opId);
      showToast(
        lang === 'ar'
          ? 'تم حذف العملية بنجاح ونقلها إلى سجل المحذوفات'
          : 'Operation deleted successfully and moved to Deleted archive',
        'success'
      );
      // Immediately remove from current active entry state
      setEntry((prev) => {
        const next = { ...prev };
        ['Import', 'Export'].forEach((dir) => {
          if (next[dir]) {
            next[dir] = next[dir].filter((r) => r._operationId !== opId);
          }
        });
        return next;
      });
      // Refresh backend data
      loadData();
      loadDeletedOperations();
      return true;
    } catch (err) {
      console.error('Failed to delete operation:', err);
      const errMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        (typeof err?.response?.data === 'string' ? err.response.data : null) ||
        err?.message ||
        'Failed to delete operation';
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
          (l) => (l.name || '').toLowerCase() === String(first.line || '').toLowerCase().trim()
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
            } catch (e) {}

            if (!isBulk) {
              await loadData();
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
        } catch (e) {}
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
          return {
            containerId: cntrId,
            actualArrivalDate: r.arrDate ? r.arrDate.slice(0, 10) : null,
            actualArrivalTime: r.arrTime ? (r.arrTime.length === 5 ? `${r.arrTime}:00` : r.arrTime.slice(0, 8)) : null,
            gateOutDate: r.gateOut ? r.gateOut.slice(0, 10) : null,
            gateOutTime: r.gateOutT ? (r.gateOutT.length === 5 ? `${r.gateOutT}:00` : r.gateOutT.slice(0, 8)) : null,
            containerType: normalizeContainerType(r.size),
            containerNumber: r.cntr?.trim() || null,
            transporterId: toGuidOrNull(r.truckerId),
            vehicleId: toGuidOrNull(r.carId),
            carNumber: r.car?.trim() || null,
            driverId: toGuidOrNull(r.driverId),
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
        if (!isBulk) await loadData();
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
          return {
            containerId: cntrId,
            containerType: normalizeContainerType(r.size),
            containerNumber: cntrNum ? cntrNum.slice(0, 11) : null,
            requiredLoadingDate: r.reqDate ? r.reqDate.slice(0, 10) : null,
            requiredLoadingTime: r.reqTime ? (r.reqTime.length === 5 ? `${r.reqTime}:00` : r.reqTime.slice(0, 8)) : null,
            destination: r.dest?.trim() || null,
            actualArrivalDate: r.arrDate ? r.arrDate.slice(0, 10) : null,
            actualArrivalTime: r.arrTime ? (r.arrTime.length === 5 ? `${r.arrTime}:00` : r.arrTime.slice(0, 8)) : null,
            gateOutDate: r.gateOut ? r.gateOut.slice(0, 10) : null,
            gateOutTime: r.gateOutT ? (r.gateOutT.length === 5 ? `${r.gateOutT}:00` : r.gateOutT.slice(0, 8)) : null,
            transporterId: toGuidOrNull(r.truckerId),
            vehicleId: toGuidOrNull(r.carId),
            carNumber: r.car?.trim() || null,
            driverId: toGuidOrNull(r.driverId),
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
        if (!isBulk) await loadData();
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

  const handleApproveMatch = (match) => {
    const { im, ex, pairKey } = match;
    setApprovals((prev) => {
      const next = new Set(prev);
      next.add(pairKey);
      return next;
    });

    if (im?.cntr && ex) {
      setEntry((prev) => {
        const exports = (prev.Export || []).map((r) => {
          if (r.booking === ex.booking || r._ref === ex._ref) {
            return {
              ...r,
              cntr: im.cntr,
              size: im.size || r.size,
              line: im.line || r.line,
            };
          }
          return r;
        });
        return { ...prev, Export: exports };
      });
    }

    showToast(
      lang === 'ar'
        ? `تم اعتماد ترشيح الحاوية ${im.cntr} لشحنة الصادر ${ex.booking}`
        : `Approved container ${im.cntr} for export booking ${ex.booking}`
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
    } catch (e) {}

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
  }, [entry]);

  const handleSaveAllDraftsToDatabase = async (targetEntry = null) => {
    const currentEntry = targetEntry || entry;
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
    } catch (e) {}

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

  const handleExportExcel = (selectedRefs = []) => {
    setExportExcelSelectedRefs(Array.isArray(selectedRefs) ? selectedRefs : []);
    setExportExcelModalOpen(true);
  };

  const switchToView = (targetMode) => {
    setViewMode(targetMode);
    if (targetMode === 'entry') {
      navigate('/transport/entry');
    } else {
      navigate('/transport/dashboard');
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
              onClick={() => setDashTab('Import')}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${
                dashTab === 'Import'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <ArrowDownCircle size={16} />
              <span>{lang === 'ar' ? 'الوارد (Import)' : 'Import Trips'}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  dashTab === 'Import' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {entry.Import?.length || 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDashTab('Export')}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${
                dashTab === 'Export'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <ArrowUpCircle size={16} />
              <span>{lang === 'ar' ? 'الصادر (Export)' : 'Export Trips'}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  dashTab === 'Export' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {entry.Export?.length || 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDashTab('FCL')}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${
                dashTab === 'FCL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <ArrowRightLeft size={16} />
              <span>{lang === 'ar' ? 'ترشيحات FCL' : 'FCL Recommendations'}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  dashTab === 'FCL' ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-700'
                }`}
              >
                {recommendedCount}
              </span>
            </button>
          </div>

          {/* Tab Sub-View */}
          {dashTab === 'FCL' ? (
            <FclTab
              matches={fclMatches}
              onApproveMatch={handleApproveMatch}
              lang={lang}
            />
          ) : (
            <AnalyticsTab
              data={enrichedData.filter((r) => r.dir === dashTab)}
              lang={lang}
              direction={dashTab}
            />
          )}
        </div>
      )}

      {/* VIEW MODE 2: DATA ENTRY GRID */}
      {viewMode === 'entry' && (
        <DataEntryTab
          entry={entry}
          ships={ships}
          lookups={lookups}
          isLoading={isLoadingData}
          onRefresh={loadData}
          currentDir={entryDir}
          onChangeDir={setEntryDir}
          onCreateOperation={handleCreateOperation}
          onUpdateCell={handleUpdateCell}
          onToggleStatus={handleToggleStatus}
          onSaveShipment={handleSaveShipment}
          onRestoreShipment={handleRestoreShipment}
          onReopenOperation={handleReopenOperation}
          onExportExcel={handleExportExcel}
          onOpenUploadModal={() => setUploadModalOpen(true)}
          onSwitchToDashboard={() => switchToView('dashboard')}
          onEmailIt={(selectedRefs = []) => {
            setEmailSelectedRefs(selectedRefs);
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
        preSelectedRefs={emailSelectedRefs}
        showToast={showToast}
        lang={lang}
      />

      <ExportExcelModal
        isOpen={exportExcelModalOpen}
        onClose={() => setExportExcelModalOpen(false)}
        currentDir={entryDir}
        entry={entry}
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
          className={`fixed bottom-6 right-6 z-50 flex items-start gap-3.5 p-4 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all animate-in fade-in slide-in-from-bottom-5 duration-300 max-w-lg ${
            toast.type === 'error'
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
