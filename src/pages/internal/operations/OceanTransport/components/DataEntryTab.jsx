import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Plus,
  Save,
  FileSpreadsheet,
  CheckCircle,
  Search,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Mail,
  Upload,
  RefreshCw,
  Edit3,
  X,
  Loader2,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  Trash2,
  Filter,
  RotateCcw,
  LayoutDashboard,
  Globe,
  Database,
  History,
  Clock,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { COLS, MASTER_DEFAULTS, CONTAINER_TYPES } from '../constants';
import { fmtDay } from '../tptEngine';
import { normalizeContainerType } from '../operationsAdapter';
import { extractErrorMessage } from '../OceanTransportDashboard';
import { addContainerUpdate, getOperationStatusAudits } from '../../../../../services/operationsService';
import { useAuth } from '../../../../../auth/AuthContext';

export const parseUtcDate = (utcStr) => {
  if (!utcStr) return null;
  const raw = String(utcStr).trim();
  if (!raw) return null;
  // If string has date + time but no timezone indicator ('Z' or '+' or '-'), treat as UTC by appending 'Z'
  const iso = (!raw.endsWith('Z') && !raw.includes('+') && !/T.*\d{2}-\d{2}$/.test(raw))
    ? `${raw}Z`
    : raw;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
};

const fmtUpdateDateTime = (dateStr) => {
  if (!dateStr) return '';
  const d = parseUtcDate(dateStr);
  if (!d) return String(dateStr);
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const day = String(d.getDate()).padStart(2, '0');
  const mon = months[d.getMonth()];
  const yr = d.getFullYear();
  const hrs = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day}-${mon}-${yr} · ${hrs}:${mins}`;
};

const fmtTimeOnly = (dateStr) => {
  if (!dateStr) return '';
  const d = parseUtcDate(dateStr);
  if (!d) return '';
  const hrs = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${hrs}:${mins}`;
};

export default function DataEntryTab({
  entry = { Import: [], Export: [] },
  ships = { Import: {}, Export: {} },
  lookups = {},
  isLoading = false,
  onRefresh,
  currentDir = 'Import',
  onChangeDir,
  onCreateOperation,
  onUpdateCell,
  onToggleStatus,
  onSaveShipment,
  onRestoreShipment,
  onReopenOperation,
  onExportExcel,
  onOpenUploadModal,
  onSwitchToDashboard,
  onEmailIt,
  onToggleLang,
  onSaveAllToDatabase,
  unsavedDraftsCount = 0,
  onDeleteOperation,
  deletedOperations = [],
  isLoadingDeleted = false,
  onRefreshDeleted,
  showToast,
  lang = 'en',
}) {
  const [formOpen, setFormOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    client: '',
    line: '',
    port: '',
    transporter: '',
    containerType: '',
    destination: '',
    clearanceType: '',
    missingDocs: '',
    createdBy: '',
    customs: '',
    status: '',
    dateType: 'created',
    dateFrom: '',
    dateTo: '',
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Selected Operations state for checkbox column
  const [selectedOps, setSelectedOps] = useState(new Set());

  // Shipment Edit Mode State
  const [editingShipments, setEditingShipments] = useState({});
  const [savingShipments, setSavingShipments] = useState({});
  const [shipmentSnapshots, setShipmentSnapshots] = useState({});
  const [shipmentErrors, setShipmentErrors] = useState({});
  const [statusMenuOpenRef, setStatusMenuOpenRef] = useState(null);

  const [internalToast, setInternalToast] = useState(null);
  const internalToastTimeoutRef = useRef(null);

  const notify = (msg, type = 'info', options = {}) => {
    if (showToast) {
      showToast(msg, type, options);
    } else {
      const duration = typeof options === 'number' ? options : (options?.duration || 10000);
      if (internalToastTimeoutRef.current) clearTimeout(internalToastTimeoutRef.current);
      setInternalToast({
        message: String(msg),
        type,
        title: typeof options === 'object' ? options?.title : null,
      });
      internalToastTimeoutRef.current = setTimeout(() => {
        setInternalToast(null);
      }, duration);
    }
  };

  const startEditingShipment = (shipRef, shipRows) => {
    if (!shipRows || shipRows.length === 0) return;
    if (shipRows[0]?.status === 'Delivered') {
      notify(
        lang === 'ar'
          ? 'العملية مُسلّمة (Delivered). لإجراء تعديلات عليها، يجب تغيير الحالة إلى Open أو إعادة فتحها أولاً.'
          : 'Delivered operations cannot be edited. Please reopen first.',
        'warning'
      );
      return;
    }
    setShipmentSnapshots((prev) => ({
      ...prev,
      [shipRef]: shipRows.map((r) => ({ ...r })),
    }));
    setShipmentErrors((prev) => {
      const next = { ...prev };
      delete next[shipRef];
      return next;
    });
    setEditingShipments((prev) => ({ ...prev, [shipRef]: true }));
  };

  const cancelEditingShipment = (shipRef) => {
    const snapshot = shipmentSnapshots[shipRef];
    if (snapshot && onRestoreShipment) {
      onRestoreShipment(currentDir, shipRef, snapshot);
    }
    setEditingShipments((prev) => {
      const next = { ...prev };
      delete next[shipRef];
      return next;
    });
    setShipmentSnapshots((prev) => {
      const next = { ...prev };
      delete next[shipRef];
      return next;
    });
    setShipmentErrors((prev) => {
      const next = { ...prev };
      delete next[shipRef];
      return next;
    });
  };

  const handleSaveShipmentAction = async (shipRef, shipRows) => {
    if (!shipRows || shipRows.length === 0) return;

    // Client-side validations adhering to backend Validators
    if (currentDir === 'Export') {
      for (let i = 0; i < shipRows.length; i++) {
        const r = shipRows[i];
        if (r.cntr && r.cntr.trim().length > 11) {
          setShipmentErrors((prev) => ({
            ...prev,
            [shipRef]:
              lang === 'ar'
                ? `رقم الحاوية لا يمكن أن يتجاوز 11 حرفاً في الصادر (الحاوية #${i + 1})`
                : `Container number cannot exceed 11 characters in Export`,
          }));
          return;
        }
      }
    } else {
      for (let i = 0; i < shipRows.length; i++) {
        const r = shipRows[i];
        if (r.cntr && r.cntr.trim().length > 20) {
          setShipmentErrors((prev) => ({
            ...prev,
            [shipRef]:
              lang === 'ar'
                ? `رقم الحاوية لا يمكن أن يتجاوز 20 حرفاً (الحاوية #${i + 1})`
                : `Container number cannot exceed 20 characters in Import`,
          }));
          return;
        }
      }
    }

    setSavingShipments((prev) => ({ ...prev, [shipRef]: true }));
    setShipmentErrors((prev) => {
      const next = { ...prev };
      delete next[shipRef];
      return next;
    });

    try {
      if (onSaveShipment) {
        const success = await onSaveShipment(currentDir, shipRef, shipRows);
        if (success) {
          pendingScrollRef.current = shipRef;
          setHighlightedShipRef(shipRef);
          setEditingShipments((prev) => {
            const next = { ...prev };
            delete next[shipRef];
            return next;
          });
          setShipmentSnapshots((prev) => {
            const next = { ...prev };
            delete next[shipRef];
            return next;
          });
          setShipmentErrors((prev) => {
            const next = { ...prev };
            delete next[shipRef];
            return next;
          });
        } else {
          setShipmentErrors((prev) => ({
            ...prev,
            [shipRef]:
              lang === 'ar'
                ? 'تعذر الحفظ (تأكد من تسجيل العملية في قاعدة البيانات)'
                : 'Failed to save shipment',
          }));
        }
      }
    } catch (err) {
      const errMsg = extractErrorMessage(err);
      setShipmentErrors((prev) => ({ ...prev, [shipRef]: errMsg }));
    } finally {
      setSavingShipments((prev) => ({ ...prev, [shipRef]: false }));
    }
  };

  // Toggleable Unmerge / Merge state for dest, missDoc, and status per shipment
  const [unmergedCols, setUnmergedCols] = useState({});

  // Auto-focus and scroll to edited row after save/refresh
  const pendingScrollRef = useRef(null);
  const [highlightedShipRef, setHighlightedShipRef] = useState(null);

  const { user } = useAuth();
  const currentUserName = user?.name || user?.userName || user?.email?.split('@')[0] || 'User';
  const canReopen = Boolean(
    user?.isSuperAdmin ||
    user?.role === 'SuperAdmin' ||
    user?.permissions?.includes('operations.reopen')
  );
  const canDelete = Boolean(
    user?.isSuperAdmin ||
    user?.role === 'SuperAdmin' ||
    user?.permissions?.includes('operations.delete')
  );

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [viewDeletedDetailOp, setViewDeletedDetailOp] = useState(null);

  const openDeleteModal = (shipRef, shipRows) => {
    if (!shipRows || shipRows.length === 0) return;
    const firstRow = shipRows[0];
    const opId = firstRow._operationId;
    setDeleteTarget({
      shipRef,
      opId,
      shipNo: firstRow.shipNo || shipRef,
      blOrBooking: firstRow.bl || firstRow.booking || shipRef,
      client: firstRow.client,
      line: firstRow.line,
      containersCount: shipRows.length,
      dir: firstRow.operationType || currentDir,
      rows: shipRows,
    });
    setDeleteError('');
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmittingDelete(true);
    setDeleteError('');
    try {
      if (deleteTarget.opId && onDeleteOperation) {
        await onDeleteOperation(deleteTarget.opId);
      }
      setDeleteModalOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      const errMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        (typeof err?.response?.data === 'string' ? err.response.data : null) ||
        err?.message ||
        'Failed to delete operation';
      setDeleteError(errMsg);
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // Reopen Modal State
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [reopenTarget, setReopenTarget] = useState(null);
  const [reopenReason, setReopenReason] = useState('');
  const [isSubmittingReopen, setIsSubmittingReopen] = useState(false);
  const [reopenError, setReopenError] = useState('');

  const openReopenModal = (shipRef, shipRows) => {
    if (!shipRows || shipRows.length === 0) return;
    const opId = shipRows[0]._operationId;
    setReopenTarget({
      shipRef,
      opId,
      shipmentNumber: shipRows[0].shipNo || shipRef,
      rows: shipRows,
    });
    setReopenReason('');
    setReopenError('');
    setReopenModalOpen(true);
  };

  const handleConfirmReopen = async () => {
    if (!reopenReason.trim()) {
      setReopenError(lang === 'ar' ? 'سبب إعادة فتح الشحنة إجباري' : 'Reopen reason is required');
      return;
    }
    if (!reopenTarget?.opId) return;

    setIsSubmittingReopen(true);
    setReopenError('');
    try {
      if (onReopenOperation) {
        await onReopenOperation(reopenTarget.opId, reopenReason.trim());
      }
      setReopenModalOpen(false);
      setReopenTarget(null);
      setReopenReason('');
    } catch (err) {
      const errMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to reopen operation';
      setReopenError(errMsg);
    } finally {
      setIsSubmittingReopen(false);
    }
  };

  // Updates Modal State (Append-Only)
  const [updatesModalOpen, setUpdatesModalOpen] = useState(false);
  const [activeUpdateRow, setActiveUpdateRow] = useState(null);
  const [newUpdateText, setNewUpdateText] = useState('');
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);

  const openUpdatesModal = (row, shipRef) => {
    setActiveUpdateRow({ row, shipRef });
    setNewUpdateText('');
    setUpdatesModalOpen(true);
  };

  const handleAddUpdate = async () => {
    if (!newUpdateText.trim() || !activeUpdateRow) return;
    const text = newUpdateText.trim();
    const targetRow = activeUpdateRow.row;
    const containerId = targetRow._containerId;

    setIsSubmittingUpdate(true);
    try {
      let createdUpdate = null;
      if (containerId && !String(containerId).includes('dummy')) {
        createdUpdate = await addContainerUpdate(containerId, text);
      }

      const newObj = {
        id: createdUpdate?.id || `local_${Date.now()}`,
        operationContainerId: containerId,
        details: text,
        createdAtUtc: createdUpdate?.createdAtUtc || new Date().toISOString(),
        createdByName: createdUpdate?.createdByName || currentUserName,
      };

      const updatedList = [newObj, ...(targetRow.updates || [])];
      onUpdateCell && onUpdateCell(currentDir, targetRow._rowId, 'updates', updatedList);

      setActiveUpdateRow((prev) => ({
        ...prev,
        row: {
          ...prev.row,
          updates: updatedList,
        },
      }));

      setNewUpdateText('');
    } catch (err) {
      console.error('Failed to add container update to server:', err);
      // Fallback locally
      const fallbackObj = {
        id: `local_${Date.now()}`,
        operationContainerId: containerId,
        details: text,
        createdAtUtc: new Date().toISOString(),
        createdByName: currentUserName,
      };
      const updatedList = [fallbackObj, ...(targetRow.updates || [])];
      onUpdateCell && onUpdateCell(currentDir, targetRow._rowId, 'updates', updatedList);
      setActiveUpdateRow((prev) => ({
        ...prev,
        row: {
          ...prev.row,
          updates: updatedList,
        },
      }));
      setNewUpdateText('');
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  // Status History Drawer State & Fetcher
  const [statusHistoryOpen, setStatusHistoryOpen] = useState(false);
  const [statusHistoryTarget, setStatusHistoryTarget] = useState(null);
  const [statusHistoryList, setStatusHistoryList] = useState([]);
  const [isLoadingStatusHistory, setIsLoadingStatusHistory] = useState(false);

  const openStatusHistoryModal = async (shipRef, shipRows) => {
    if (!shipRows || shipRows.length === 0) return;
    const firstRow = shipRows[0];
    setStatusHistoryTarget({ shipRef, row: firstRow, rows: shipRows });
    setIsLoadingStatusHistory(true);
    setStatusHistoryOpen(true);

    const resolveUserName = (rawVal, defaultFallback = '') => {
      if (!rawVal) return defaultFallback || currentUserName;
      const str = String(rawVal).trim();
      const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      if (!isGuid) return str;

      // Check current user ID match
      const myId = user?.id || user?.userId || user?.sub || user?.profileId;
      if (myId && String(myId).toLowerCase() === str.toLowerCase()) {
        return currentUserName;
      }

      // Check operation creator
      if (firstRow?._createdByName && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(firstRow._createdByName)) {
        return firstRow._createdByName;
      }

      if (firstRow?.oper && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(firstRow.oper)) {
        return firstRow.oper;
      }

      if (defaultFallback && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(defaultFallback)) {
        return defaultFallback;
      }

      return currentUserName || 'Operations Team';
    };

    const events = [];

    // 1. Current / Delivered event
    if (firstRow.deliveredAtUtc || firstRow.deliveredAt || firstRow.status === 'Delivered') {
      events.push({
        id: 'delivered',
        type: 'Delivered',
        status: 'Delivered',
        title: lang === 'ar' ? 'تم التسليم (Delivered)' : 'Marked as Delivered',
        userName: resolveUserName(firstRow.deliveredByName || firstRow.deliveredBy, firstRow._createdByName),
        timestamp: firstRow.deliveredAtUtc || firstRow.deliveredAt,
        color: 'emerald',
      });
    }

    // 2. Reopened event if exists
    if (firstRow.reopenedAtUtc || firstRow.reopenedAt || firstRow.reopenReason) {
      events.push({
        id: 'reopened',
        type: 'Reopened',
        status: 'Open',
        title: lang === 'ar' ? 'إعادة فتح العملية (Reopened to Open)' : 'Reopened to Open',
        userName: resolveUserName(firstRow.reopenedByName || firstRow.reopenedBy, firstRow._createdByName),
        timestamp: firstRow.reopenedAtUtc || firstRow.reopenedAt,
        reason: firstRow.reopenReason,
        color: 'amber',
      });
    }

    // 3. Created event
    events.push({
      id: 'created',
      type: 'Created',
      status: 'Open',
      title: lang === 'ar' ? 'إنشاء العملية (Created)' : 'Operation Created',
      userName: resolveUserName(firstRow._createdByName || firstRow.createdByName, firstRow.oper),
      timestamp: firstRow._createdAtUtc || firstRow.createdAtUtc,
      color: 'sky',
    });

    try {
      const opId = firstRow._operationId || firstRow.id;
      if (opId && !String(opId).includes('dummy') && !String(opId).startsWith('imp_') && !String(opId).startsWith('exp_')) {
        const audits = await getOperationStatusAudits(opId);
        if (Array.isArray(audits) && audits.length > 0) {
          const auditEvents = audits.map((a, idx) => ({
            id: a.id || `audit_${idx}`,
            type: a.afterStatus === 'Delivered' ? 'Delivered' : (a.afterStatus === 'Open' && a.beforeStatus === 'Delivered' ? 'Reopened' : 'StatusChange'),
            status: a.afterStatus,
            beforeStatus: a.beforeStatus,
            title: a.afterStatus === 'Delivered'
              ? (lang === 'ar' ? 'تم التسليم (Delivered)' : 'Marked as Delivered')
              : (a.afterStatus === 'Open' && a.beforeStatus === 'Delivered'
                ? (lang === 'ar' ? 'إعادة فتح العملية (Reopened to Open)' : 'Reopened to Open')
                : (lang === 'ar' ? `تغيير الحالة إلى ${a.afterStatus}` : `Status changed to ${a.afterStatus}`)),
            userName: resolveUserName(a.userName || a.userId, firstRow._createdByName),
            timestamp: a.atUtc,
            reason: a.reason || (a.afterStatus === 'Open' ? firstRow.reopenReason : null),
            color: a.afterStatus === 'Delivered' ? 'emerald' : 'amber',
          }));

          const hasCreated = auditEvents.some((e) => e.type === 'Created');
          if (!hasCreated) {
            const cr = events.find((e) => e.type === 'Created');
            if (cr) auditEvents.push(cr);
          }
          auditEvents.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
          setStatusHistoryList(auditEvents);
          setIsLoadingStatusHistory(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Could not fetch backend audit logs, using row events:', err);
    }

    events.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    setStatusHistoryList(events);
    setIsLoadingStatusHistory(false);
  };

  // Helper to format Operation / entered date time: 27-OCT-2026 · 14:47 (Converts to User Local Time)
  const fmtEnteredDate = (utcStr) => {
    if (!utcStr) return '';
    const d = parseUtcDate(utcStr);
    if (!d) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} · ${hours}:${minutes}`;
  };

  const toggleSelectOp = (shipRef) => {
    setSelectedOps((prev) => {
      const next = new Set(prev);
      if (next.has(shipRef)) next.delete(shipRef);
      else next.add(shipRef);
      return next;
    });
  };

  const toggleUnmerge = (shipRef, colKey) => {
    setUnmergedCols((prev) => ({
      ...prev,
      [`${shipRef}_${colKey}`]: !prev[`${shipRef}_${colKey}`],
    }));
  };

  const handleMobChange = (enteredVal, rowId) => {
    if (onUpdateCell) {
      onUpdateCell(currentDir, rowId, 'mob', enteredVal);
    }
    if (lookups.drivers?.length > 0) {
      const clean = String(enteredVal).trim();
      const matched = lookups.drivers.find(
        (d) =>
          (d.mobileNumber && d.mobileNumber.trim() === clean) ||
          (d.driverNumber && d.driverNumber.trim() === clean) ||
          (clean.length >= 8 && d.mobileNumber && d.mobileNumber.includes(clean))
      );
      if (matched) {
        if (onUpdateCell) {
          onUpdateCell(currentDir, rowId, 'driver', matched.name);
          onUpdateCell(currentDir, rowId, 'driverId', matched.id);
        }
      }
    }
  };

  const handleCarChange = (enteredVal, rowId) => {
    if (onUpdateCell) {
      onUpdateCell(currentDir, rowId, 'car', enteredVal);
    }
    if (lookups.vehicles?.length > 0) {
      const clean = String(enteredVal).trim().toLowerCase();
      const matched = lookups.vehicles.find(
        (v) => v.carNumber && v.carNumber.trim().toLowerCase() === clean
      );
      if (onUpdateCell) {
        onUpdateCell(currentDir, rowId, 'carId', matched ? matched.id : null);
      }
    }
  };

  const handleDriverChange = (enteredVal, rowId) => {
    if (onUpdateCell) {
      onUpdateCell(currentDir, rowId, 'driver', enteredVal);
    }
    if (lookups.drivers?.length > 0) {
      const clean = String(enteredVal).trim().toLowerCase();
      const matched = lookups.drivers.find(
        (d) =>
          (d.name && d.name.trim().toLowerCase() === clean) ||
          (d.driverNumber && d.driverNumber.trim().toLowerCase() === clean)
      );
      if (matched && onUpdateCell) {
        onUpdateCell(currentDir, rowId, 'driverId', matched.id);
        if (matched.mobileNumber) {
          onUpdateCell(currentDir, rowId, 'mob', matched.mobileNumber);
        }
      }
    }
  };


  const handleMergedColChange = (shipRows, colKey, val) => {
    shipRows.forEach((row) => {
      onUpdateCell && onUpdateCell(currentDir, row._rowId, colKey, val);
    });
  };

  // Search input ref & Ctrl+K keyboard shortcut
  const searchInputRef = useRef(null);
  const cntrCountInputRef = useRef(null);
  const [cntrErrorModal, setCntrErrorModal] = useState(false);

  // Synchronized horizontal scroll refs & handlers
  const gridRef = useRef(null);
  const topScrollRef = useRef(null);
  const isSyncingScroll = useRef(false);
  const [tableScrollWidth, setTableScrollWidth] = useState(5500);

  const handleTopScroll = (e) => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    if (gridRef.current && topScrollRef.current) {
      const maxTopScroll = topScrollRef.current.scrollWidth - topScrollRef.current.clientWidth;
      const maxGridScroll = gridRef.current.scrollWidth - gridRef.current.clientWidth;
      if (maxTopScroll > 0 && maxGridScroll > 0) {
        const ratio = topScrollRef.current.scrollLeft / maxTopScroll;
        gridRef.current.scrollLeft = ratio * maxGridScroll;
      } else {
        gridRef.current.scrollLeft = e.target.scrollLeft;
      }
    }
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };

  const handleTableScroll = (e) => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    if (topScrollRef.current && gridRef.current) {
      const maxTopScroll = topScrollRef.current.scrollWidth - topScrollRef.current.clientWidth;
      const maxGridScroll = gridRef.current.scrollWidth - gridRef.current.clientWidth;
      if (maxTopScroll > 0 && maxGridScroll > 0) {
        const ratio = gridRef.current.scrollLeft / maxGridScroll;
        topScrollRef.current.scrollLeft = ratio * maxTopScroll;
      } else {
        topScrollRef.current.scrollLeft = e.target.scrollLeft;
      }
    }
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };

  const scrollTable = (directionOrAmount) => {
    if (!gridRef.current) return;
    if (directionOrAmount === 'start') {
      gridRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    } else if (directionOrAmount === 'end') {
      gridRef.current.scrollTo({ left: gridRef.current.scrollWidth, behavior: 'smooth' });
    } else {
      gridRef.current.scrollBy({ left: directionOrAmount, behavior: 'smooth' });
    }
  };

  const handleTableWheel = (e) => {
    // If scrolling while mouse is over sticky thead header, scroll horizontally!
    if (e.target.closest('thead')) {
      e.preventDefault();
      if (gridRef.current) {
        gridRef.current.scrollLeft += e.deltaY * 1.5;
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // New Operation Form State - all dropdowns default to empty/placeholder (-- Select --)
  const [newOp, setNewOp] = useState({
    cntrCount: 0,
    client: '',
    clientId: '',
    blOrBooking: '',
    line: '',
    shippingLineId: '',
    dest: '',
    port: '',
    portId: '',
    freeOrCut: '',
    reqDate: '',
    reqTime: '',
    clrType: 'CERT',
    pow: '',
    powId: '',
  });

  // Click outside listener for custom status popover menu
  useEffect(() => {
    if (!statusMenuOpenRef) return;
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.status-menu-container')) {
        setStatusMenuOpenRef(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [statusMenuOpenRef]);

  // Tab categorization: Active Import, Active Export, and Delivered
  const isDeliveredTab = currentDir === 'Delivered';

  const activeImportRows = useMemo(
    () => (entry.Import || []).filter((r) => r.status !== 'Delivered'),
    [entry.Import]
  );
  const activeExportRows = useMemo(
    () => (entry.Export || []).filter((r) => r.status !== 'Delivered'),
    [entry.Export]
  );
  const deliveredRows = useMemo(
    () => [
      ...(entry.Import || []).filter((r) => r.status === 'Delivered'),
      ...(entry.Export || []).filter((r) => r.status === 'Delivered'),
    ],
    [entry.Import, entry.Export]
  );

  // Helper to count unique shipments (operations) rather than individual container trips
  const countUniqueShipments = (rowList) => {
    const refs = new Set();
    rowList.forEach((r, idx) => {
      const ref = r._ref || r._operationId || (r.bl ? `BL-${r.bl}` : (r.booking ? `BK-${r.booking}` : `ROW-${idx}`));
      refs.add(ref);
    });
    return refs.size;
  };

  const activeImportCount = useMemo(() => countUniqueShipments(activeImportRows), [activeImportRows]);
  const activeExportCount = useMemo(() => countUniqueShipments(activeExportRows), [activeExportRows]);
  const deliveredCount = useMemo(() => countUniqueShipments(deliveredRows), [deliveredRows]);

  const cols = isDeliveredTab ? (COLS.Delivered || COLS.Export || []) : (COLS[currentDir] || []);
  const rows = isDeliveredTab
    ? deliveredRows
    : currentDir === 'Export'
      ? activeExportRows
      : activeImportRows;

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!newOp.client && !newOp.clientId) {
      notify(lang === 'ar' ? 'يرجى اختيار العميل أولاً' : 'Please select a Client', 'warning');
      return;
    }

    if (!newOp.blOrBooking.trim()) {
      notify(
        currentDir === 'Import'
          ? (lang === 'ar' ? 'يرجى إدخال رقم البوليصة M/BL' : 'Please enter M/BL')
          : (lang === 'ar' ? 'يرجى إدخال رقم البوكينج' : 'Please enter Booking No.'),
        'warning'
      );
      return;
    }

    const enteredRef = newOp.blOrBooking.trim().toLowerCase();
    if (currentDir === 'Import') {
      const exists = (entry?.Import || []).some((r) => r.bl && r.bl.trim().toLowerCase() === enteredRef);
      if (exists) {
        notify(
          lang === 'ar'
            ? `رقم بوليصة الشحن (M/BL) "${newOp.blOrBooking.trim()}" مسجل بالفعل في شحنات الوارد.`
            : `M/BL Number "${newOp.blOrBooking.trim()}" already exists in Import shipments.`,
          'error'
        );
        return;
      }
    } else if (currentDir === 'Export') {
      const exists = (entry?.Export || []).some((r) => r.booking && r.booking.trim().toLowerCase() === enteredRef);
      if (exists) {
        notify(
          lang === 'ar'
            ? `رقم البوكينج (Booking #) "${newOp.blOrBooking.trim()}" مسجل بالفعل في شحنات الصادر.`
            : `Booking Number "${newOp.blOrBooking.trim()}" already exists in Export shipments.`,
          'error'
        );
        return;
      }
    }

    const count = Number(newOp.cntrCount);
    if (!count || count <= 0) {
      setCntrErrorModal(true);
      return;
    }

    if (onCreateOperation) {
      const success = await onCreateOperation(currentDir, newOp);
      if (success !== false) {
        // Reset all form fields to default clean state (-- Select --)
        setNewOp({
          cntrCount: 0,
          client: '',
          clientId: '',
          blOrBooking: '',
          line: '',
          shippingLineId: '',
          dest: '',
          port: '',
          portId: '',
          freeOrCut: '',
          reqDate: '',
          reqTime: '',
          clrType: 'CERT',
          pow: '',
          powId: '',
        });
      }
    }
  };

  // Group rows by operation reference for merging
  const groupedShipments = useMemo(() => {
    const map = new Map();
    rows.forEach((r, idx) => {
      const ref = r._ref || `OP-${r.bl || r.booking || idx}`;
      if (!map.has(ref)) {
        map.set(ref, []);
      }
      map.get(ref).push({ ...r, _originalIdx: idx });
    });
    return Array.from(map.values());
  }, [rows]);

  // Extract unique Creators (Created By) and Customs dynamically from loaded operations
  const uniqueCreators = useMemo(() => {
    const set = new Set();
    Object.values(entry || {}).forEach((dirRows) => {
      if (Array.isArray(dirRows)) {
        dirRows.forEach((r) => {
          const name = r.oper || r.createdBy || r._createdByName;
          if (name && typeof name === 'string' && name.trim()) {
            set.add(name.trim());
          }
        });
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [entry]);

  const uniqueCustoms = useMemo(() => {
    const set = new Set();
    (entry?.Export || []).forEach((r) => {
      if (r.customs && typeof r.customs === 'string' && r.customs.trim()) {
        set.add(r.customs.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [entry]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.client) count++;
    if (filters.line) count++;
    if (filters.port) count++;
    if (filters.transporter) count++;
    if (filters.containerType) count++;
    if (filters.destination) count++;
    if (filters.clearanceType) count++;
    if (filters.missingDocs) count++;
    if (filters.createdBy) count++;
    if (filters.customs) count++;
    if (filters.status) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    return count;
  }, [filters]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilters({
      client: '',
      line: '',
      port: '',
      transporter: '',
      containerType: '',
      destination: '',
      clearanceType: '',
      missingDocs: '',
      createdBy: '',
      customs: '',
      status: '',
      dateType: 'created',
      dateFrom: '',
      dateTo: '',
    });
    setPage(1);
  };

  // Filtered shipments by live search & backend criteria filters
  const filteredShipments = useMemo(() => {
    const q = searchTerm ? searchTerm.toLowerCase().trim() : '';

    return groupedShipments.filter((shipRows) => {
      // 1. Live text search across all identifier columns (Ctrl + K)
      if (q) {
        const matchesSearch = shipRows.some((r) => {
          const hay = [
            r.shipNo,
            r.cntr,
            r.bl,
            r.booking,
            r.client,
            r.cert,
            r.customs,
            r.line,
            r.driver,
            r.mob,
            r.car,
            r.dest,
            r.pod,
            r.pol,
            r.pow,
            r.trucker,
            r.status,
            r._ref,
            r.oper,
            r.createdBy,
            r._createdByName,
          ].filter(Boolean).join(' ').toLowerCase();
          return hay.includes(q);
        });
        if (!matchesSearch) return false;
      }

      // 2. Client Filter (ClientId or Client Name)
      if (filters.client) {
        const cTarget = filters.client.toLowerCase();
        const clientMatch = shipRows.some(
          (r) =>
            (r.clientId && r.clientId.toLowerCase() === cTarget) ||
            (r.client && r.client.toLowerCase() === cTarget)
        );
        if (!clientMatch) return false;
      }

      // 3. Shipping Line Filter
      if (filters.line) {
        const lTarget = filters.line.toLowerCase();
        const lineMatch = shipRows.some(
          (r) =>
            (r.shippingLineId && r.shippingLineId.toLowerCase() === lTarget) ||
            (r.line && r.line.toLowerCase() === lTarget)
        );
        if (!lineMatch) return false;
      }

      // 4. Port Filter (POL, POD, POW)
      if (filters.port) {
        const pTarget = filters.port.toLowerCase();
        const portMatch = shipRows.some(
          (r) =>
            (r.pol && r.pol.toLowerCase().includes(pTarget)) ||
            (r.pod && r.pod.toLowerCase().includes(pTarget)) ||
            (r.pow && r.pow.toLowerCase().includes(pTarget)) ||
            (r.portId && r.portId.toLowerCase() === pTarget)
        );
        if (!portMatch) return false;
      }

      // 5. Transporter Filter
      if (filters.transporter) {
        const tTarget = filters.transporter.toLowerCase();
        const truckerMatch = shipRows.some(
          (r) =>
            (r.truckerId && r.truckerId.toLowerCase() === tTarget) ||
            (r.trucker && r.trucker.toLowerCase() === tTarget)
        );
        if (!truckerMatch) return false;
      }

      // 6. Container Type Filter
      if (filters.containerType) {
        const targetType = normalizeContainerType(filters.containerType);
        const typeMatch = shipRows.some(
          (r) => normalizeContainerType(r.size) === targetType
        );
        if (!typeMatch) return false;
      }

      // 7. Destination Filter
      if (filters.destination) {
        const dTarget = filters.destination.toLowerCase();
        const destMatch = shipRows.some(
          (r) => r.dest && r.dest.toLowerCase().includes(dTarget)
        );
        if (!destMatch) return false;
      }

      // 8. Clearance Type Filter (CERT / BOSLA)
      if (filters.clearanceType) {
        const clrTarget = filters.clearanceType.toUpperCase();
        const clrMatch = shipRows.some(
          (r) => (r.clrType || 'CERT').toUpperCase() === clrTarget
        );
        if (!clrMatch) return false;
      }

      // 9. Missing Docs Filter
      if (filters.missingDocs) {
        if (filters.missingDocs === 'yes') {
          const hasMissing = shipRows.some((r) => r.missDoc && r.missDoc.trim().length > 0);
          if (!hasMissing) return false;
        } else if (filters.missingDocs === 'no') {
          const allClean = shipRows.every((r) => !r.missDoc || r.missDoc.trim().length === 0);
          if (!allClean) return false;
        }
      }

      // 10. Created By (المُدخل) Filter
      if (filters.createdBy) {
        const targetCreator = filters.createdBy.toLowerCase();
        const creatorMatch = shipRows.some(
          (r) =>
            (r.oper && r.oper.toLowerCase() === targetCreator) ||
            (r.createdBy && r.createdBy.toLowerCase() === targetCreator) ||
            (r._createdByName && r._createdByName.toLowerCase() === targetCreator)
        );
        if (!creatorMatch) return false;
      }

      // 11. Customs (الجمارك / الساحات) Filter
      if (filters.customs) {
        const targetCustoms = filters.customs.toLowerCase();
        const customsMatch = shipRows.some(
          (r) => r.customs && r.customs.toLowerCase().includes(targetCustoms)
        );
        if (!customsMatch) return false;
      }

      // 12. Status Filter (Open / Delivered)
      if (filters.status) {
        const targetStatus = filters.status.toLowerCase();
        const statusMatch = shipRows.some(
          (r) => r.status && r.status.toLowerCase() === targetStatus
        );
        if (!statusMatch) return false;
      }

      // 13. Date Range Filter (Supports Created Date, Req Date, Actual Arrival, Gate Out, Free Time, Cut Off, Delivered, Checkout, Invoices, Missing Docs)
      if (filters.dateFrom || filters.dateTo) {
        const from = filters.dateFrom ? filters.dateFrom.slice(0, 10) : null;
        const to = filters.dateTo ? filters.dateTo.slice(0, 10) : null;

        const dateMatch = shipRows.some((r) => {
          let rowDate = null;
          if (filters.dateType === 'created') rowDate = r.createdAt || r._createdAtUtc || r.created;
          else if (filters.dateType === 'reqDate') rowDate = r.reqDate;
          else if (filters.dateType === 'arrDate') rowDate = r.arrDate;
          else if (filters.dateType === 'gateOut') rowDate = r.gateOut;
          else if (filters.dateType === 'freeOrCut') rowDate = r.free || r.freeOrCut || r.cutOff;
          else if (filters.dateType === 'delivered') rowDate = r.deliveredAtUtc || r.deliveredAt;
          else if (filters.dateType === 'checkout') rowDate = r.checkout;
          else if (filters.dateType === 'invRcv') rowDate = r.invRcv;
          else if (filters.dateType === 'missRcv') rowDate = r.missRcv;

          if (!rowDate) return false;

          let d = String(rowDate).slice(0, 10);
          if (String(rowDate).includes('T')) {
            const parsed = new Date(rowDate);
            if (!isNaN(parsed.getTime())) {
              const year = parsed.getFullYear();
              const month = String(parsed.getMonth() + 1).padStart(2, '0');
              const day = String(parsed.getDate()).padStart(2, '0');
              d = `${year}-${month}-${day}`;
            }
          }

          if (from && d < from) return false;
          if (to && d > to) return false;
          return true;
        });

        if (!dateMatch) return false;
      }

      return true;
    });
  }, [groupedShipments, searchTerm, filters]);

  // Flattened paginated rows with rowSpan metadata
  const totalShipments = filteredShipments.length;
  const totalTrips = filteredShipments.reduce((sum, s) => sum + s.length, 0);

  const paginatedShipments = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredShipments.slice(start, start + pageSize);
  }, [filteredShipments, page, pageSize]);

  // Auto-focus and scroll smoothly to the edited shipment after save / auto-refresh
  useEffect(() => {
    if (!highlightedShipRef) return;

    // 1. Ensure the user is on the page containing this shipment
    const shipIdx = filteredShipments.findIndex(
      (rows) => rows[0]?._ref === highlightedShipRef || rows[0]?.shipNo === highlightedShipRef
    );
    if (shipIdx !== -1) {
      const targetPage = Math.floor(shipIdx / pageSize) + 1;
      if (page !== targetPage) {
        setPage(targetPage);
      }
    }

    // 2. Perform smooth scroll directly to the row inside the table AND scroll the page window down
    const performScroll = () => {
      const rowEl =
        document.querySelector(`[data-ship-ref="${highlightedShipRef}"]`) ||
        document.getElementById(`shipment-row-${highlightedShipRef}`) ||
        document.querySelector(`[data-ship-no="${highlightedShipRef}"]`);
      const gridEl = gridRef?.current;

      if (rowEl) {
        // A. Scroll the internal grid container (.egrid) so the row is centered vertically
        if (gridEl) {
          const gridRect = gridEl.getBoundingClientRect();
          const rowRect = rowEl.getBoundingClientRect();
          const currentScroll = gridEl.scrollTop;
          const rowRelativeTop = rowRect.top - gridRect.top + currentScroll;
          const targetGridTop = Math.max(0, rowRelativeTop - (gridEl.clientHeight / 2) + (rowRect.height / 2));

          gridEl.scrollTo({
            top: targetGridTop,
            behavior: 'smooth',
          });
        }

        // B. Scroll the browser window / page viewport down until the row is centered in view
        rowEl.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });

        return true;
      }
      return false;
    };

    // Attempt immediately and with stagger for DOM updates/pagination
    const t1 = setTimeout(performScroll, 80);
    const t2 = setTimeout(performScroll, 250);
    const t3 = setTimeout(performScroll, 550);

    // 3. Keep highlight glow visible for 3.5 seconds
    const clearTimer = setTimeout(() => {
      setHighlightedShipRef(null);
      pendingScrollRef.current = null;
    }, 3500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(clearTimer);
    };
  }, [entry, highlightedShipRef, filteredShipments, pageSize, page]);

  // Filtered deleted operations for the archive tab
  const filteredDeletedOperations = useMemo(() => {
    if (!Array.isArray(deletedOperations)) return [];
    const q = searchTerm ? searchTerm.toLowerCase().trim() : '';
    const from = filters.dateFrom ? filters.dateFrom.slice(0, 10) : null;
    const to = filters.dateTo ? filters.dateTo.slice(0, 10) : null;

    return deletedOperations.filter((op) => {
      if (q) {
        const isImport = op.operationType === 'Import' || op.operationType === 1;
        const refNum = isImport ? op.importDetails?.mblNumber : op.exportDetails?.bookingNumber;
        const hay = [
          op.shipmentNumber,
          refNum,
          op.clientName,
          op.shippingLineName,
          op.certificateNumber,
          op.deletedByName,
          op.createdByName,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (filters.client) {
        const c = filters.client.toLowerCase();
        if (!op.clientName || !op.clientName.toLowerCase().includes(c)) return false;
      }

      if (filters.line) {
        const l = filters.line.toLowerCase();
        if (!op.shippingLineName || !op.shippingLineName.toLowerCase().includes(l)) return false;
      }

      if (filters.createdBy) {
        const cr = filters.createdBy.toLowerCase();
        if (!op.createdByName || !op.createdByName.toLowerCase().includes(cr)) return false;
      }

      if (from || to) {
        let rowDate = null;
        if (filters.dateType === 'created') rowDate = op.createdAtUtc;
        else rowDate = op.deletedAtUtc || op.createdAtUtc;

        if (!rowDate) return false;
        let d = String(rowDate).slice(0, 10);
        if (String(rowDate).includes('T')) {
          const parsed = new Date(rowDate);
          if (!isNaN(parsed.getTime())) {
            const year = parsed.getFullYear();
            const month = String(parsed.getMonth() + 1).padStart(2, '0');
            const day = String(parsed.getDate()).padStart(2, '0');
            d = `${year}-${month}-${day}`;
          }
        }
        if (from && d < from) return false;
        if (to && d > to) return false;
      }

      return true;
    });
  }, [deletedOperations, searchTerm, filters]);

  const totalPages = Math.ceil(totalShipments / pageSize) || 1;

  useEffect(() => {
    const updateScrollWidth = () => {
      const tableEl = document.getElementById('eTable');
      const sw = Math.max(
        gridRef.current ? gridRef.current.scrollWidth : 0,
        tableEl ? (tableEl.scrollWidth || tableEl.offsetWidth || 0) : 0
      );
      if (sw > 0) {
        setTableScrollWidth(sw);
      }
    };

    updateScrollWidth();
    const t1 = setTimeout(updateScrollWidth, 100);
    const t2 = setTimeout(updateScrollWidth, 400);

    let observer = null;
    if (gridRef.current && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateScrollWidth);
      observer.observe(gridRef.current);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (observer) observer.disconnect();
    };
  }, [cols, paginatedShipments, currentDir]);

  return (
    <div className="space-y-4">
      {/* 1. Compact New Operation Form */}
      {formOpen ? (
        <form onSubmit={handleFormSubmit} className="opcard">
          <div className="ophead">
            <div>
              <span className="opref">OPS-2026-0185</span>
              <span className="text-xs text-slate-500 mx-2">
                {currentDir === 'Import'
                  ? (lang === 'ar' ? 'عملية وارد جديدة · املأ البيانات المشتركة مرة واحدة' : 'New Import operation · fill the shared details once')
                  : (lang === 'ar' ? 'عملية صادر جديدة · املأ البيانات المشتركة مرة واحدة' : 'New Export operation · fill the shared details once')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="ebtn text-xs cursor-pointer flex items-center gap-1 hover:bg-slate-100"
            >
              <ChevronUp size={14} />
              <span>{lang === 'ar' ? 'إخفاء النموذج' : 'Hide form'}</span>
            </button>
          </div>

          <div className="opgrid">
            {currentDir === 'Export' ? (
              <>
                {/* 1. Clearance Type (g1) */}
                <div className="opf g1">
                  <label>{lang === 'ar' ? 'نوع الإفراج' : 'Clearance Type'} <i>{lang === 'ar' ? 'اختيار' : 'Text'}</i></label>
                  <select
                    value={newOp.clrType}
                    onChange={(e) => setNewOp({ ...newOp, clrType: e.target.value })}
                  >
                    <option value="CERT">CERT</option>
                    <option value="BOSLA">BOSLA</option>
                  </select>
                </div>

                {/* 2. BOOKING NO. (g1) */}
                <div className="opf g1">
                  <label>{lang === 'ar' ? 'رقم البوكينج' : 'BOOKING NO.'} <i>{lang === 'ar' ? 'رقم / معرف' : 'Number / ID'}</i> *</label>
                  <input
                    type="text"
                    required
                    value={newOp.blOrBooking}
                    onChange={(e) => setNewOp({ ...newOp, blOrBooking: e.target.value })}
                    placeholder="BK-2026-09"
                  />
                </div>

                {/* 3. CLEINT (g1) */}
                <div className="opf g1">
                  <label>{lang === 'ar' ? 'العميل' : 'CLEINT'} <i>{lang === 'ar' ? 'نص' : 'Text'}</i> *</label>
                  <select
                    value={newOp.clientId || newOp.client}
                    onChange={(e) => {
                      const val = e.target.value;
                      const item = (lookups.customers || []).find(
                        (c) => (c.customerId || c.id) === val || (c.companyName || c.name) === val
                      );
                      setNewOp({
                        ...newOp,
                        clientId: item ? (item.customerId || item.id) : val,
                        client: item ? (item.companyName || item.name) : val,
                      });
                    }}
                  >
                    <option value="">{lang === 'ar' ? '-- اختر العميل --' : '-- Select Client --'}</option>
                    {lookups.customers?.length > 0
                      ? lookups.customers.map((c) => (
                        <option key={c.customerId || c.id} value={c.customerId || c.id}>
                          {c.companyName || c.name}
                        </option>
                      ))
                      : MASTER_DEFAULTS.client.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                  </select>
                </div>

                {/* 4. Shipping Line (g2) */}
                <div className="opf g2">
                  <label>{lang === 'ar' ? 'الخط الملاحي' : 'Shipping Line'} <i>{lang === 'ar' ? 'نص' : 'Text'}</i></label>
                  <select
                    value={newOp.shippingLineId || newOp.line}
                    onChange={(e) => {
                      const val = e.target.value;
                      const item = (lookups.shippingLines || []).find(
                        (l) => l.id === val || l.name === val
                      );
                      setNewOp({
                        ...newOp,
                        shippingLineId: item ? item.id : val,
                        line: item ? item.name : val,
                      });
                    }}
                  >
                    <option value="">{lang === 'ar' ? '-- اختر الخط الملاحي --' : '-- Select Shipping Line --'}</option>
                    {lookups.shippingLines?.length > 0
                      ? lookups.shippingLines.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))
                      : MASTER_DEFAULTS.line.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                  </select>
                </div>

                {/* 5. POL (g2) */}
                <div className="opf g2">
                  <label>{lang === 'ar' ? 'ميناء الشحن (POL)' : 'POL'} <i>{lang === 'ar' ? 'نص' : 'Text'}</i></label>
                  <select
                    value={newOp.portId || newOp.port}
                    onChange={(e) => {
                      const val = e.target.value;
                      const item = (lookups.ports || []).find(
                        (p) => p.id === val || p.name === val
                      );
                      setNewOp({
                        ...newOp,
                        portId: item ? item.id : val,
                        port: item ? item.name : val,
                      });
                    }}
                  >
                    <option value="">{lang === 'ar' ? '-- اختر الميناء --' : '-- Select Port (POL) --'}</option>
                    {lookups.ports?.length > 0
                      ? lookups.ports.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.code ? `(${p.code})` : ''}
                        </option>
                      ))
                      : MASTER_DEFAULTS.pol.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                  </select>
                </div>

                {/* 6. POW (g2 optional) */}
                <div className="opf g2">
                  <label>{lang === 'ar' ? 'ميناء الوصول (POW)' : 'POW'} <i>{lang === 'ar' ? 'اختياري' : 'Text (optional)'}</i></label>
                  <select
                    value={newOp.powId || newOp.pow}
                    onChange={(e) => {
                      const val = e.target.value;
                      const item = (lookups.ports || []).find(
                        (p) => p.id === val || p.name === val
                      );
                      setNewOp({
                        ...newOp,
                        powId: item ? item.id : val,
                        pow: item ? item.name : val,
                      });
                    }}
                  >
                    <option value="">{lang === 'ar' ? 'لا يوجد (None)' : 'None'}</option>
                    {lookups.ports?.length > 0
                      ? lookups.ports.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.code ? `(${p.code})` : ''}
                        </option>
                      ))
                      : MASTER_DEFAULTS.pow.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                  </select>
                  <div className="op-hint">{lang === 'ar' ? 'اتركه فارغاً لاستخدام نفس ميناء الشحن' : 'Leave empty to use the POL'}</div>
                </div>

                {/* 7. CUT OFF (g3 optional) */}
                <div className="opf g3">
                  <label>{lang === 'ar' ? 'تاريخ Cut Off' : 'CUT OFF'} <i>{lang === 'ar' ? '(اختياري)' : '((optional))'}</i></label>
                  <input
                    type="date"
                    value={newOp.freeOrCut}
                    onChange={(e) => setNewOp({ ...newOp, freeOrCut: e.target.value })}
                  />
                </div>
              </>
            ) : (
              <>
                {/* IMPORT FIELDS */}
                {/* 1. CLEINT (g1) */}
                <div className="opf g1">
                  <label>{lang === 'ar' ? 'العميل' : 'CLEINT'} <i>{lang === 'ar' ? 'نص' : 'Text'}</i> *</label>
                  <select
                    value={newOp.clientId || newOp.client}
                    onChange={(e) => {
                      const val = e.target.value;
                      const item = (lookups.customers || []).find(
                        (c) => (c.customerId || c.id) === val || (c.companyName || c.name) === val
                      );
                      setNewOp({
                        ...newOp,
                        clientId: item ? (item.customerId || item.id) : val,
                        client: item ? (item.companyName || item.name) : val,
                      });
                    }}
                  >
                    <option value="">{lang === 'ar' ? '-- اختر العميل --' : '-- Select Client --'}</option>
                    {lookups.customers?.length > 0
                      ? lookups.customers.map((c) => (
                        <option key={c.customerId || c.id} value={c.customerId || c.id}>
                          {c.companyName || c.name}
                        </option>
                      ))
                      : MASTER_DEFAULTS.client.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                  </select>
                </div>

                {/* 2. M/BL Number (g1) */}
                <div className="opf g1">
                  <label>{lang === 'ar' ? 'رقم البوليصة (M/BL)' : 'M/BL Number'} <i>{lang === 'ar' ? 'رقم / معرف' : 'Number / ID'}</i> *</label>
                  <input
                    type="text"
                    required
                    value={newOp.blOrBooking}
                    onChange={(e) => setNewOp({ ...newOp, blOrBooking: e.target.value })}
                    placeholder="HUSG50003700"
                  />
                </div>

                {/* 3. Shipping Line (g2) */}
                <div className="opf g2">
                  <label>{lang === 'ar' ? 'الخط الملاحي' : 'Shipping Line'} <i>{lang === 'ar' ? 'نص' : 'Text'}</i></label>
                  <select
                    value={newOp.shippingLineId || newOp.line}
                    onChange={(e) => {
                      const val = e.target.value;
                      const item = (lookups.shippingLines || []).find(
                        (l) => l.id === val || l.name === val
                      );
                      setNewOp({
                        ...newOp,
                        shippingLineId: item ? item.id : val,
                        line: item ? item.name : val,
                      });
                    }}
                  >
                    <option value="">{lang === 'ar' ? '-- اختر الخط الملاحي --' : '-- Select Shipping Line --'}</option>
                    {lookups.shippingLines?.length > 0
                      ? lookups.shippingLines.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))
                      : MASTER_DEFAULTS.line.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                  </select>
                </div>

                {/* 4. destination (g2) */}
                <div className="opf g2">
                  <label>{lang === 'ar' ? 'مكان التعتيق / الوجهة' : 'destination'} <i>{lang === 'ar' ? 'اختيار' : 'Select'}</i></label>
                  <select
                    value={newOp.dest}
                    onChange={(e) => setNewOp({ ...newOp, dest: e.target.value })}
                  >
                    <option value="">{lang === 'ar' ? '-- اختر الوجهة --' : '-- Select Destination --'}</option>
                    {(lookups.destinations && lookups.destinations.length > 0
                      ? lookups.destinations.map((d) => (typeof d === 'string' ? d : d.name))
                      : MASTER_DEFAULTS.dest
                    ).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* 5. POD (g2) */}
                <div className="opf g2">
                  <label>{lang === 'ar' ? 'ميناء الوصول (POD)' : 'POD'} <i>{lang === 'ar' ? 'نص' : 'Text'}</i></label>
                  <select
                    value={newOp.portId || newOp.port}
                    onChange={(e) => {
                      const val = e.target.value;
                      const item = (lookups.ports || []).find(
                        (p) => p.id === val || p.name === val
                      );
                      setNewOp({
                        ...newOp,
                        portId: item ? item.id : val,
                        port: item ? item.name : val,
                      });
                    }}
                  >
                    <option value="">{lang === 'ar' ? '-- اختر الميناء --' : '-- Select Port (POD) --'}</option>
                    {lookups.ports?.length > 0
                      ? lookups.ports.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.code ? `(${p.code})` : ''}
                        </option>
                      ))
                      : MASTER_DEFAULTS.pod.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                  </select>
                </div>

                {/* 6. Free Time Till (g2) */}
                <div className="opf g2">
                  <label>{lang === 'ar' ? 'نهاية فترة السماح' : 'free time till'} <i>{lang === 'ar' ? 'تاريخ' : 'Date'}</i></label>
                  <input
                    type="date"
                    value={newOp.freeOrCut}
                    onChange={(e) => setNewOp({ ...newOp, freeOrCut: e.target.value })}
                  />
                </div>

                {/* 7. Required Offloading Date (g3) */}
                <div className="opf g3">
                  <label>{lang === 'ar' ? 'تاريخ التعتيق المطلوب' : 'Required Offloading Date'}</label>
                  <input
                    type="date"
                    value={newOp.reqDate}
                    onChange={(e) => setNewOp({ ...newOp, reqDate: e.target.value })}
                  />
                </div>

                {/* 8. Required Offloading Time (g3) */}
                <div className="opf g3">
                  <label>{lang === 'ar' ? 'وقت التعتيق المطلوب' : 'Required Offloading Time'}</label>
                  <input
                    type="time"
                    value={newOp.reqTime}
                    onChange={(e) => setNewOp({ ...newOp, reqTime: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>

          <div className="opfoot">
            <div className="opcount">
              <label className="font-semibold text-slate-700">
                {lang === 'ar' ? 'عدد الحاويات في هذه العملية' : 'Containers in this operation'}
              </label>
              <input
                ref={cntrCountInputRef}
                type="number"
                min="0"
                max="200"
                value={newOp.cntrCount === '' ? '' : newOp.cntrCount}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewOp({
                    ...newOp,
                    cntrCount: val === '' ? '' : Math.max(0, parseInt(val, 10) || 0),
                  });
                }}
                className={`font-bold text-center px-3 py-1.5 rounded-lg border text-sm transition ${(!newOp.cntrCount || Number(newOp.cntrCount) <= 0)
                    ? 'border-amber-400 bg-amber-50/70 text-amber-900 focus:ring-amber-300'
                    : 'border-slate-300 bg-white text-slate-900 focus:border-sky-500'
                  }`}
                placeholder="0"
              />
            </div>

            <button type="submit" className="ebtn go">
              {lang === 'ar' ? 'إنشاء العملية' : 'Create operation'}
            </button>

            <span className="text-xs text-slate-400">
              {lang === 'ar'
                ? 'املأ بيانات الشحنة المشتركة واضغط إنشاء — سيتم تجميع الصفوف التي تشترك في نفس البوليصة تلقائياً.'
                : 'Fill the shipment details once and press Create — rows that share one M/BL are grouped together automatically.'}
            </span>
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-between px-5 py-3 bg-white border border-slate-200/90 rounded-2xl shadow-xs transition">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-700">
              {lang === 'ar' ? 'نموذج إدخال شحنة جديدة مخفي' : 'New operation creation form is hidden'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="ebtn text-xs cursor-pointer flex items-center gap-1.5 bg-sky-50 text-sky-700 border border-sky-300 hover:bg-sky-100 font-semibold px-3 py-1.5 rounded-lg shadow-2xs transition"
          >
            <Plus size={14} />
            <span>{lang === 'ar' ? 'إظهار نموذج الإدخال' : 'Show form'}</span>
          </button>
        </div>
      )}

      {/* 2. Direction Tabs & Action Strip (Merged Sections 5 & 2) */}
      <div className="ebar flex flex-wrap items-center justify-between gap-3">
        {/* Left Side: Direction Tabs + Deleted + Upload Report */}
        <div className="etabs flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => { onChangeDir && onChangeDir('Import'); setPage(1); }}
            className={`etab ${currentDir === 'Import' ? 'on' : ''}`}
          >
            <span className="ico">↓</span>
            <span>{lang === 'ar' ? 'وارد' : 'Import'}</span>
            <span className="cnt">{activeImportCount}</span>
          </button>

          <button
            type="button"
            onClick={() => { onChangeDir && onChangeDir('Export'); setPage(1); }}
            className={`etab ${currentDir === 'Export' ? 'on' : ''}`}
          >
            <span className="ico">↑</span>
            <span>{lang === 'ar' ? 'صادر' : 'Export'}</span>
            <span className="cnt">{activeExportCount}</span>
          </button>

          <button
            type="button"
            onClick={() => { onChangeDir && onChangeDir('Delivered'); setPage(1); }}
            className={`etab ${isDeliveredTab ? 'on' : ''}`}
          >
            <span className="ico">🔒</span>
            <span>{lang === 'ar' ? 'الشحنات المسلّمة' : 'Delivered shipments'}</span>
            <span className="cnt">{deliveredCount}</span>
          </button>

          {/* Deleted Button (View soft-deleted shipments) */}
          <button
            type="button"
            onClick={() => { onChangeDir && onChangeDir('Deleted'); setPage(1); }}
            className={`etab ${currentDir === 'Deleted' ? 'on' : ''} border-rose-200 hover:border-rose-300 text-rose-700 bg-rose-50/70`}
            title={lang === 'ar' ? 'عرض العمليات المحذوفة' : 'View Deleted Shipments'}
          >
            <Trash2 size={13} className="text-rose-600" />
            <span>{lang === 'ar' ? 'المحذوفات' : 'Deleted'}</span>
            <span className="cnt bg-rose-100 text-rose-700 border-rose-200">{deletedOperations.length}</span>
          </button>

          {/* Upload Report Button (Relocated into Section 5) */}
          <button
            type="button"
            onClick={onOpenUploadModal}
            className="ebtn text-xs font-semibold flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
          >
            <Upload size={13} className="text-slate-600" />
            <span>{lang === 'ar' ? 'رفع التقرير' : 'Upload Report'}</span>
          </button>
        </div>

        <div className="espacer" />

        {/* Right Side: Section 2 Relocated Actions */}
        <div className="estatus flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onSwitchToDashboard}
            className="ebtn text-xs font-semibold flex items-center gap-1.5 text-blue-700 bg-blue-50/80 border border-blue-200 hover:bg-blue-100 shadow-2xs"
          >
            <LayoutDashboard size={13} />
            <span>{lang === 'ar' ? 'الداشبورد' : 'View Dashboard'}</span>
          </button>

          <button
            type="button"
            onClick={() => onEmailIt && onEmailIt(Array.from(selectedOps))}
            className="ebtn text-xs font-semibold flex items-center gap-1.5 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs"
          >
            <Mail size={13} className="text-slate-500" />
            <span>Email it</span>
          </button>

          <button
            type="button"
            onClick={() => onExportExcel && onExportExcel(Array.from(selectedOps))}
            className="ebtn text-xs font-semibold flex items-center gap-1.5 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet size={13} className="text-emerald-600" />
            <span>{lang === 'ar' ? 'حفظ كاكسيل' : 'Save as Excel'}</span>
          </button>

          {unsavedDraftsCount > 0 && onSaveAllToDatabase && (
            <button
              type="button"
              onClick={onSaveAllToDatabase}
              className="ebtn text-xs font-bold flex items-center gap-1.5 text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 shadow-sm transition active:scale-95 animate-pulse"
              title={lang === 'ar' ? 'حفظ كافة الشحنات غير المسجلة في قاعدة البيانات SQL Server' : 'Save all unpersisted shipments to SQL Server'}
            >
              <Database size={13} />
              <span>{lang === 'ar' ? `حفظ في الداتا بيز (${unsavedDraftsCount})` : `Save to DB (${unsavedDraftsCount})`}</span>
            </button>
          )}

          {onToggleLang && (
            <button
              type="button"
              onClick={onToggleLang}
              className="ebtn text-xs font-medium flex items-center gap-1 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50"
              title="Change Language"
            >
              <Globe size={13} />
              <span>{lang === 'ar' ? 'EN' : 'عربي'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Search Bar & Unified Single-Row Filters Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-3">
        {/* Row 1: Spacious Search Bar with Full Readable Placeholder */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 max-w-2xl">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              placeholder={
                lang === 'ar'
                  ? 'بحث شامل بالشحنة، الحاوية، البوليصة، البوكينج، العميل، الخط، السائق... (Ctrl + K)'
                  : 'Search by Shipment #, Container #, BL, Booking, Client, Line, Driver... (Ctrl + K)'
              }
              className="w-full pl-9 pr-20 py-2 rounded-xl border border-slate-300 bg-slate-50/70 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-100 transition shadow-2xs"
            />
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1.5">
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => { setSearchTerm(''); setPage(1); }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 cursor-pointer"
                  title="مسح البحث"
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
              <span className="px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-200 rounded-lg text-xs font-semibold">
                {activeFiltersCount} {lang === 'ar' ? 'فلاتر مطبقة' : 'active filters'}
              </span>
            )}
            {(activeFiltersCount > 0 || searchTerm) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold px-2.5 py-1.5 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-200 cursor-pointer transition shadow-2xs"
              >
                <RotateCcw size={13} />
                <span>{lang === 'ar' ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: All Filters on a Single Unified Horizontal Row */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          {/* Client Filter */}
          <select
            value={filters.client}
            onChange={(e) => { setFilters({ ...filters, client: e.target.value }); setPage(1); }}
            className="text-xs rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 outline-none focus:border-sky-500 cursor-pointer shrink-0 max-w-[135px]"
          >
            <option value="">{lang === 'ar' ? 'العميل: الكل' : 'Client: All'}</option>
            {(lookups.customers || []).map((c) => (
              <option key={c.customerId || c.id} value={c.companyName || c.name}>
                {c.companyName || c.name}
              </option>
            ))}
          </select>

          {/* Shipping Line Filter */}
          <select
            value={filters.line}
            onChange={(e) => { setFilters({ ...filters, line: e.target.value }); setPage(1); }}
            className="text-xs rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 outline-none focus:border-sky-500 cursor-pointer shrink-0 max-w-[125px]"
          >
            <option value="">{lang === 'ar' ? 'الخط: الكل' : 'Line: All'}</option>
            {(lookups.shippingLines || []).map((l) => (
              <option key={l.id} value={l.name}>
                {l.name}
              </option>
            ))}
          </select>

          {/* Port Filter */}
          <select
            value={filters.port}
            onChange={(e) => { setFilters({ ...filters, port: e.target.value }); setPage(1); }}
            className="text-xs rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 outline-none focus:border-sky-500 cursor-pointer shrink-0 max-w-[125px]"
          >
            <option value="">{lang === 'ar' ? 'الميناء: الكل' : 'Port: All'}</option>
            {(lookups.ports || []).map((p) => (
              <option key={p.id} value={p.name}>
                {p.name} {p.code ? `(${p.code})` : ''}
              </option>
            ))}
          </select>

          {/* Transporter Filter */}
          <select
            value={filters.transporter}
            onChange={(e) => { setFilters({ ...filters, transporter: e.target.value }); setPage(1); }}
            className="text-xs rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 outline-none focus:border-sky-500 cursor-pointer shrink-0 max-w-[130px]"
          >
            <option value="">{lang === 'ar' ? 'المقاول: الكل' : 'Transporter: All'}</option>
            {(lookups.transporters || []).map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Container Type Filter */}
          <select
            value={filters.containerType}
            onChange={(e) => { setFilters({ ...filters, containerType: e.target.value }); setPage(1); }}
            className="text-xs rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 outline-none focus:border-sky-500 cursor-pointer shrink-0 max-w-[130px]"
          >
            <option value="">{lang === 'ar' ? 'نوع الحاوية: الكل' : 'CNTR Type: All'}</option>
            {CONTAINER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          {/* Destination Filter */}
          <select
            value={filters.destination}
            onChange={(e) => { setFilters({ ...filters, destination: e.target.value }); setPage(1); }}
            className="text-xs rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 outline-none focus:border-sky-500 cursor-pointer shrink-0 max-w-[130px]"
          >
            <option value="">{lang === 'ar' ? 'الوجهة: الكل' : 'Destination: All'}</option>
            {(lookups.destinations && lookups.destinations.length > 0
              ? lookups.destinations.map((d) => (typeof d === 'string' ? d : d.name || d.label || d.value))
              : MASTER_DEFAULTS.dest
            ).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Clearance Type (CERT / BOSLA) */}
          <select
            value={filters.clearanceType}
            onChange={(e) => { setFilters({ ...filters, clearanceType: e.target.value }); setPage(1); }}
            className="text-xs rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 outline-none focus:border-sky-500 cursor-pointer shrink-0 max-w-[120px]"
          >
            <option value="">{lang === 'ar' ? 'الإفراج: الكل' : 'Clearance: All'}</option>
            <option value="CERT">CERT</option>
            <option value="BOSLA">BOSLA</option>
          </select>

          {/* Missing Docs Filter */}
          <select
            value={filters.missingDocs}
            onChange={(e) => { setFilters({ ...filters, missingDocs: e.target.value }); setPage(1); }}
            className="text-xs rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 outline-none focus:border-sky-500 cursor-pointer shrink-0 max-w-[110px]"
          >
            <option value="">{lang === 'ar' ? 'المستندات: الكل' : 'Docs: All'}</option>
            <option value="yes">{lang === 'ar' ? 'يوجد نواقص' : 'Has Missing'}</option>
            <option value="no">{lang === 'ar' ? 'مكتملة (Clean)' : 'Clean'}</option>
          </select>

          {/* Created By Filter (المُدخل) */}
          <select
            value={filters.createdBy}
            onChange={(e) => { setFilters({ ...filters, createdBy: e.target.value }); setPage(1); }}
            className="text-xs rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 outline-none focus:border-sky-500 cursor-pointer shrink-0 max-w-[130px]"
          >
            <option value="">{lang === 'ar' ? 'المُدخل: الكل' : 'Created By: All'}</option>
            {uniqueCreators.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          {/* Customs Filter (الجمارك / الساحات) */}
          {uniqueCustoms.length > 0 && (
            <select
              value={filters.customs}
              onChange={(e) => { setFilters({ ...filters, customs: e.target.value }); setPage(1); }}
              className="text-xs rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 outline-none focus:border-sky-500 cursor-pointer shrink-0 max-w-[125px]"
            >
              <option value="">{lang === 'ar' ? 'الجمارك: الكل' : 'Customs: All'}</option>
              {uniqueCustoms.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          {/* Date Range Controls */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200 shrink-0 text-xs">
            <span className="text-[11px] font-bold text-slate-600 shrink-0">
              {lang === 'ar' ? 'التاريخ:' : 'Date:'}
            </span>
            <select
              value={filters.dateType}
              onChange={(e) => setFilters({ ...filters, dateType: e.target.value })}
              className="text-xs rounded-lg border border-slate-300 bg-white px-2 py-1 text-slate-700 outline-none focus:border-sky-500 cursor-pointer max-w-[125px]"
            >
              <option value="created">{lang === 'ar' ? 'تاريخ الإنشاء' : 'Created Date'}</option>
              <option value="reqDate">{lang === 'ar' ? 'تاريخ التحميل/التعتيق' : 'Req Date'}</option>
              <option value="arrDate">{lang === 'ar' ? 'الوصول الفعلي' : 'Actual Arrival'}</option>
              <option value="gateOut">{lang === 'ar' ? 'خروج البوابة (Gate Out)' : 'Gate Out'}</option>
              <option value="freeOrCut">{lang === 'ar' ? 'المهلة / Cut Off' : 'Free Time / Cut Off'}</option>
              <option value="delivered">{lang === 'ar' ? 'تاريخ التسليم' : 'Delivered Date'}</option>
              <option value="checkout">{lang === 'ar' ? 'سحب الميناء' : 'Port Checkout'}</option>
              <option value="invRcv">{lang === 'ar' ? 'تاريخ استلام الفواتير' : 'Invoices Receive Date'}</option>
              <option value="missRcv">{lang === 'ar' ? 'تاريخ استلام المستندات' : 'Receive Date Missing Docs'}</option>
            </select>
            <span className="text-[11px] text-slate-400">{lang === 'ar' ? 'من' : 'From'}</span>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => { setFilters({ ...filters, dateFrom: e.target.value }); setPage(1); }}
              className="text-xs rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-slate-700 outline-none focus:border-sky-500 w-[115px]"
            />
            <span className="text-[11px] text-slate-400">{lang === 'ar' ? 'إلى' : 'To'}</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => { setFilters({ ...filters, dateTo: e.target.value }); setPage(1); }}
              className="text-xs rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-slate-700 outline-none focus:border-sky-500 w-[115px]"
            />
            {(filters.dateFrom || filters.dateTo) && (
              <button
                type="button"
                onClick={() => { setFilters({ ...filters, dateFrom: '', dateTo: '' }); setPage(1); }}
                className="p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                title="مسح التاريخ"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Operations & Trips Counter + Pagination Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-slate-500 px-1 pt-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-700">
            {lang === 'ar'
              ? `عدد العمليات: ${totalShipments}  ·  عدد الرحلات: ${totalTrips}`
              : `${totalShipments} Operations  ·  ${totalTrips} Trips`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span>Shipments {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalShipments)} of {totalShipments} · Page {page}/{totalPages}</span>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded border border-slate-200 bg-white px-2 py-0.5 disabled:opacity-40 cursor-pointer"
          >
            ‹
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded border border-slate-200 bg-white px-2 py-0.5 disabled:opacity-40 cursor-pointer"
          >
            ›
          </button>
        </div>
      </div>

      {/* 5. The Grid Table or Deleted Operations View */}
      {currentDir === 'Deleted' ? (
        <div className="space-y-4 my-2">
          {/* Top Bar of Deleted Operations */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-rose-200/80 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    {lang === 'ar' ? 'سجل العمليات والشحنات المحذوفة' : 'Deleted Operations Archive'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
                    {filteredDeletedOperations.length} {lang === 'ar' ? 'شحنة محذوفة' : 'deleted'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {lang === 'ar'
                    ? 'يتم أرشفة جميع العمليات المحذوفة هنا مع توثيق اسم المستخدم وتاريخ وساعة الحذف بدقة'
                    : 'All deleted operations are securely archived here with author and exact timestamp'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onRefreshDeleted}
                disabled={isLoadingDeleted}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={13} className={isLoadingDeleted ? 'animate-spin text-rose-600' : 'text-slate-500'} />
                <span>{lang === 'ar' ? 'تحديث' : 'Refresh'}</span>
              </button>
              <button
                type="button"
                onClick={() => { onChangeDir && onChangeDir('Import'); setPage(1); }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition cursor-pointer shadow-xs"
              >
                <ChevronLeft size={14} />
                <span>{lang === 'ar' ? 'العودة للشحنات النشطة' : 'Back to Active Shipments'}</span>
              </button>
            </div>
          </div>

          {/* Deleted Operations Table or Empty State */}
          {isLoadingDeleted ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <Loader2 size={28} className="animate-spin text-rose-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">
                {lang === 'ar' ? 'جاري تحميل العمليات المحذوفة...' : 'Loading deleted operations...'}
              </p>
            </div>
          ) : filteredDeletedOperations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50/30 p-12 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <Trash2 size={24} />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                {lang === 'ar' ? 'لا توجد شحنات محذوفة مطابقة' : 'No Matching Deleted Shipments'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {lang === 'ar'
                  ? 'لم يتم العثور على أي شحنات محذوفة تطابق معايير البحث أو الفلتر المحددة.'
                  : 'No deleted operations matched your search or filter criteria.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200/90 shadow-xs">
              <table className="w-full text-start border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3 text-start"># / {lang === 'ar' ? 'رقم الشحنة' : 'Shipment No'}</th>
                    <th className="py-3 px-3 text-start">{lang === 'ar' ? 'النوع' : 'Type'}</th>
                    <th className="py-3 px-3 text-start">{lang === 'ar' ? 'البوليصة / البوكينج' : 'BL / Booking'}</th>
                    <th className="py-3 px-3 text-start">{lang === 'ar' ? 'العميل والخط' : 'Client & Line'}</th>
                    <th className="py-3 px-3 text-start">{lang === 'ar' ? 'الحاويات' : 'Containers'}</th>
                    <th className="py-3 px-3 text-start bg-rose-50/60 text-rose-900 border-x border-rose-100">
                      {lang === 'ar' ? 'تم الحذف بواسطة' : 'Deleted By'}
                    </th>
                    <th className="py-3 px-3 text-start bg-rose-50/60 text-rose-900">
                      {lang === 'ar' ? 'تاريخ وساعة الحذف' : 'Deleted At'}
                    </th>
                    <th className="py-3 px-3 text-center">
                      {lang === 'ar' ? 'التفاصيل الكاملة' : 'Full Details'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDeletedOperations.map((op, idx) => {
                    const isImport = op.operationType === 'Import' || op.operationType === 1;
                    const refNum = isImport ? op.importDetails?.mblNumber : op.exportDetails?.bookingNumber;
                    return (
                      <tr key={op.id || idx} className="hover:bg-rose-50/20 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {op.shipmentNumber || `#${idx + 1}`}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${isImport
                                ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                              }`}
                          >
                            {isImport ? 'Import' : 'Export'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-900">
                          {refNum || '—'}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">{op.clientName || '—'}</div>
                          <div className="text-[11px] text-slate-500">{op.shippingLineName || '—'}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-700">
                              {op.numberOfContainers || (op.containers?.length || 0)} {lang === 'ar' ? 'حاوية' : 'cntrs'}
                            </span>
                            {(op.containers || []).slice(0, 3).map((c, cIdx) => (
                              <span key={cIdx} className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600 font-mono">
                                {c.containerNumber || '—'}
                              </span>
                            ))}
                            {(op.containers?.length || 0) > 3 && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                +{(op.containers?.length || 0) - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 bg-rose-50/30 border-x border-rose-100">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-rose-200 text-rose-800 font-bold shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                            <span>{op.deletedByName || (lang === 'ar' ? 'مستخدم' : 'User')}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 bg-rose-50/30 font-medium text-slate-700">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800">
                              {fmtUpdateDateTime(op.deletedAtUtc)}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setViewDeletedDetailOp(op)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition cursor-pointer active:scale-95"
                            title={lang === 'ar' ? 'عرض تفاصيل العملية المحذوفة بالكامل' : 'View Full Operation Details'}
                          >
                            <Eye size={13} className="text-sky-400" />
                            <span>{lang === 'ar' ? 'عرض التفاصيل' : 'Details'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          {/* Top Synchronized Horizontal Scrollbar */}
          <div
            ref={topScrollRef}
            onScroll={handleTopScroll}
            className="w-full overflow-x-auto overflow-y-hidden h-2.5 bg-slate-100 hover:bg-slate-200/70 border border-slate-200/80 rounded-t-lg transition-colors cursor-pointer scrollbar-thin"
            title={lang === 'ar' ? 'اسحب للتحرك يميناً ويساراً في الجدول من الأعلى' : 'Drag to scroll table horizontally from top'}
          >
            <div style={{ width: `${Math.max(tableScrollWidth, 5500)}px`, minWidth: `${Math.max(tableScrollWidth, 5500)}px`, height: '1px' }} />
          </div>

          <div
            className="egrid"
            ref={gridRef}
            onScroll={handleTableScroll}
            onWheel={handleTableWheel}
          >
            <table id="eTable">
              <thead>
                <tr>
                  {cols.map((c) => {
                    if (c.k === 'sel') {
                      const isAllSelected =
                        paginatedShipments.length > 0 &&
                        paginatedShipments.every((s, idx) => selectedOps.has(s[0]?._ref || `ship_${idx}`));

                      return (
                        <th
                          key={c.k}
                          className={`grp-${c.g} text-center`}
                          style={{ width: `${c.w}px`, minWidth: `${c.w}px` }}
                        >
                          <div className="flex flex-col items-center justify-center gap-1">
                            <div>{c.h}</div>
                            <input
                              type="checkbox"
                              checked={isAllSelected}
                              onChange={() => {
                                if (isAllSelected) {
                                  setSelectedOps(new Set());
                                } else {
                                  const allRefs = paginatedShipments.map(
                                    (s, idx) => s[0]?._ref || `ship_${idx}`
                                  );
                                  setSelectedOps(new Set(allRefs));
                                }
                              }}
                              className="w-4 h-4 rounded text-sky-600 border-slate-300 focus:ring-sky-500 cursor-pointer"
                              title="تحديد الكل / إلغاء التحديد"
                            />
                          </div>
                        </th>
                      );
                    }

                    return (
                      <th
                        key={c.k}
                        className={`grp-${c.g}`}
                        style={{ width: `${c.w}px`, minWidth: `${c.w}px` }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[11.5px] leading-tight">{c.h}</span>
                          {c.locked && (
                            <span className="text-[11px] opacity-75 select-none" title="Append-only column (لا يمكن تعديل السجلات السابقة)">🔒</span>
                          )}
                        </div>
                        <div className="text-[9.5px] opacity-75 font-medium leading-tight">{c.ar}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={cols.length} className="text-center py-16 text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw size={24} className="animate-spin text-sky-600" />
                        <span className="text-xs font-medium">جاري تحميل العمليات من قاعدة البيانات...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedShipments.length === 0 ? (
                  <tr>
                    <td colSpan={cols.length} className="text-center py-12 text-slate-400">
                      No shipments available.
                    </td>
                  </tr>
                ) : (
                  paginatedShipments.flatMap((shipRows, shipIdx) => {
                    const rowSpan = shipRows.length;
                    const shipRef = shipRows[0]?._ref || `ship_${shipIdx}`;

                    return shipRows.map((r, rIdx) => {
                      const isFirstRow = rIdx === 0;
                      const isHighlighted = highlightedShipRef && (shipRef === highlightedShipRef || r.shipNo === highlightedShipRef);

                      return (
                        <tr
                          key={r._rowId || `${shipIdx}_${rIdx}`}
                          data-ship-ref={shipRef}
                          data-ship-no={r.shipNo || ''}
                          id={isFirstRow ? `shipment-row-${shipRef}` : undefined}
                          tabIndex={isFirstRow ? -1 : undefined}
                          className={`outline-none transition-colors duration-500 ${
                            isHighlighted ? 'bg-sky-100/70 ring-2 ring-sky-400 ring-inset font-medium' : ''
                          }`}
                        >
                          {cols.map((c) => {
                            const canUnmerge = c.canUnmerge === true;
                            const isUnmerged = unmergedCols[`${shipRef}_${c.k}`] === true;
                            const isMergedCol = canUnmerge ? !isUnmerged : (c.uniq === true);

                            // If merged, only render on first row with rowSpan
                            if (isMergedCol && !isFirstRow) {
                              return null;
                            }

                            let val = r[c.k] ?? '';
                            if (c.k === 'bl' && !val && r.booking) val = r.booking;
                            if (c.k === 'reopenReason' && !val && r.reopenReason) val = r.reopenReason;
                            if (c.k === 'reopenedAt' && !val) val = r.reopenedAt || (r.reopenedAtUtc ? String(r.reopenedAtUtc).slice(0, 10) : '');
                            const isDelivered = r.status === 'Delivered';
                            const isShipmentEditing = !!editingShipments[shipRef];
                            const isSavingThisShipment = !!savingShipments[shipRef];

                            // By default, if shipment is NOT in edit mode OR is delivered OR is currently saving, fields are read-only
                            let isReadOnly = !isShipmentEditing || isDelivered || isSavingThisShipment;
                            let isDisabled = !isShipmentEditing || isDelivered || isSavingThisShipment;
                            let inputPlaceholder = '';
                            let cellTitle = isDelivered
                              ? 'العملية مسلّمة ولا يمكن تعديلها (Delivered)'
                              : !isShipmentEditing
                                ? 'انقر على زر "تعديل" لتعديل هذه الشحنة'
                                : '';

                            if (currentDir === 'Export') {
                              // Booking No., Client, Shipping Line, POL are strictly non-editable
                              if (['booking', 'client', 'line', 'pol', 'vol', 'clrType', 'oper'].includes(c.k)) {
                                isReadOnly = true;
                                isDisabled = true;
                                cellTitle = 'حقل غير قابل للتعديل';
                              }

                              // Clearance Type rules:
                              const clr = String(r.clrType || '').toUpperCase();
                              if (clr === 'BOSLA') {
                                // If BOSLA: Certificate Number is NOT allowed to be edited
                                if (c.k === 'cert') {
                                  isReadOnly = true;
                                  isDisabled = true;
                                  inputPlaceholder = 'غير مسموح للكتابة (BOSLA)';
                                  cellTitle = 'غير مسموح بالكتابة في رقم الشهادة لأن نوع التخليص بوصلة';
                                }
                              } else if (clr === 'CERT') {
                                // If CERT: Customs is NOT allowed to be edited
                                if (c.k === 'customs') {
                                  isReadOnly = true;
                                  isDisabled = true;
                                  inputPlaceholder = 'غير مسموح للكتابة (CERT)';
                                  cellTitle = 'غير مسموح بالكتابة في الجمارك لأن نوع التخليص شهادة (CERT)';
                                }
                              }

                              // Shipment # is editable when in edit mode
                              if (c.k === 'shipNo') {
                                isReadOnly = !isShipmentEditing || isDelivered || isSavingThisShipment;
                                isDisabled = !isShipmentEditing || isDelivered || isSavingThisShipment;
                              }
                            } else {
                              // Import direction immutable columns
                              const isImmutableCol = [
                                'client',
                                'line',
                                'bl',
                                'booking',
                                'pod',
                                'pol',
                                'pow',
                                'clrType',
                                'vol',
                                'oper',
                              ].includes(c.k);
                              if (isImmutableCol) {
                                isReadOnly = true;
                                isDisabled = true;
                                cellTitle = 'حقل غير قابل للتعديل';
                              }
                            }

                            // Column: Reopen Reason
                            if (c.k === 'reopenReason') {
                              const displayReason = r.reopenReason || val || '';
                              return (
                                <td
                                  key={c.k}
                                  rowSpan={isMergedCol ? rowSpan : 1}
                                  style={{
                                    width: `${c.w}px`,
                                    minWidth: `${c.w}px`,
                                    verticalAlign: 'middle',
                                    padding: '4px 0',
                                  }}
                                >
                                  <div
                                    className={`cbox grp-${c.g}`}
                                    style={{
                                      width: '100%',
                                      minWidth: `${c.w - 12}px`,
                                      height: '34px',
                                      minHeight: '34px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      padding: '0 8px',
                                    }}
                                  >
                                    {displayReason ? (
                                      <span
                                        className="text-xs font-semibold text-amber-900 bg-amber-50/90 border border-amber-200 px-2 py-0.5 rounded truncate max-w-full block"
                                        title={`سبب الفتح: ${displayReason}`}
                                      >
                                        {displayReason}
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-slate-400 select-none italic">—</span>
                                    )}
                                  </div>
                                </td>
                              );
                            }

                            // Column: Reopen Date
                            if (c.k === 'reopenedAt') {
                              const displayDate = r.reopenedAt || (r.reopenedAtUtc ? String(r.reopenedAtUtc).slice(0, 10) : '') || val || '';
                              return (
                                <td
                                  key={c.k}
                                  rowSpan={isMergedCol ? rowSpan : 1}
                                  style={{
                                    width: `${c.w}px`,
                                    minWidth: `${c.w}px`,
                                    verticalAlign: 'middle',
                                    padding: '4px 0',
                                  }}
                                >
                                  <div
                                    className={`cbox grp-${c.g}`}
                                    style={{
                                      width: '100%',
                                      minWidth: `${c.w - 12}px`,
                                      height: '34px',
                                      minHeight: '34px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      padding: '0 8px',
                                    }}
                                  >
                                    {displayDate ? (
                                      <span
                                        className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded font-mono"
                                        title={`تاريخ الفتح: ${displayDate}`}
                                      >
                                        {displayDate}
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-slate-400 select-none italic">—</span>
                                    )}
                                  </div>
                                </td>
                              );
                            }

                            // Column: Actions (Edit / Save / Cancel per shipment)
                            if (c.k === 'actions') {
                              const hasError = shipmentErrors[shipRef];
                              return (
                                <td
                                  key={c.k}
                                  rowSpan={rowSpan}
                                  style={{
                                    width: `${c.w}px`,
                                    minWidth: `${c.w}px`,
                                    verticalAlign: 'middle',
                                    textAlign: 'center',
                                    padding: '6px 4px',
                                  }}
                                >
                                  <div className="flex flex-col items-center justify-center gap-1.5 w-full">
                                    {isShipmentEditing ? (
                                      <>
                                        <button
                                          type="button"
                                          disabled={isSavingThisShipment}
                                          onClick={() => handleSaveShipmentAction(shipRef, shipRows)}
                                          className="inline-flex items-center justify-center gap-1 w-full px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition disabled:opacity-50 cursor-pointer"
                                          title="حفظ التعديلات في قاعدة البيانات"
                                        >
                                          {isSavingThisShipment ? (
                                            <Loader2 size={13} className="animate-spin" />
                                          ) : (
                                            <Save size={13} />
                                          )}
                                          <span>
                                            {isSavingThisShipment
                                              ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                                              : (lang === 'ar' ? 'حفظ' : 'Save')}
                                          </span>
                                        </button>
                                        <button
                                          type="button"
                                          disabled={isSavingThisShipment}
                                          onClick={() => cancelEditingShipment(shipRef)}
                                          className="inline-flex items-center justify-center gap-1 w-full px-2 py-1 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition disabled:opacity-50 cursor-pointer"
                                          title="إلغاء التعديلات واسترجاع القيم السابقة"
                                        >
                                          <X size={12} />
                                          <span>{lang === 'ar' ? 'إلغاء' : 'Cancel'}</span>
                                        </button>
                                        {hasError && (
                                          <div
                                            onClick={() => notify(`${lang === 'ar' ? 'خطأ أثناء الحفظ:' : 'Save error:'} ${hasError}`, 'error')}
                                            className="flex items-center justify-center gap-1 w-full px-1.5 py-1 rounded-md bg-rose-50 border border-rose-300 text-[10px] text-rose-700 font-semibold cursor-pointer hover:bg-rose-100 transition shadow-xs text-center"
                                            title={`${hasError} (انقر لرؤية التفاصيل كاملة)`}
                                          >
                                            <AlertTriangle size={11} className="text-rose-600 shrink-0" />
                                            <span className="truncate max-w-[80px]">{hasError}</span>
                                          </div>
                                        )}
                                      </>
                                    ) : isDelivered ? (
                                      canReopen ? (
                                        <button
                                          type="button"
                                          onClick={() => openReopenModal(shipRef, shipRows)}
                                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 shadow-sm transition cursor-pointer"
                                          title={lang === 'ar' ? 'إعادة فتح هذه الشحنة المسلّمة لتصبح قابلة للتعديل مجدداً' : 'Reopen delivered shipment to allow editing'}
                                        >
                                          <Unlock size={13} />
                                          <span>{lang === 'ar' ? 'إعادة فتح' : 'Reopen'}</span>
                                        </button>
                                      ) : (
                                        <div
                                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200"
                                          title={lang === 'ar' ? 'العملية مُسلّمة. لا تملك صلاحية إعادة فتح العمليات' : 'Delivered. You do not have permission to reopen'}
                                        >
                                          <Lock size={12} />
                                          <span>{lang === 'ar' ? 'مُسلّم' : 'Delivered'}</span>
                                        </div>
                                      )
                                    ) : (
                                      <div className="flex flex-col items-center gap-1.5 w-full">
                                        <button
                                          type="button"
                                          onClick={() => startEditingShipment(shipRef, shipRows)}
                                          className="inline-flex items-center justify-center gap-1.5 w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-300 hover:bg-sky-100 hover:border-sky-400 shadow-sm transition cursor-pointer"
                                          title={lang === 'ar' ? 'فتح وضع التعديل لهذه الشحنة' : 'Edit shipment'}
                                        >
                                          <Edit3 size={13} />
                                          <span>{lang === 'ar' ? 'تعديل' : 'Edit'}</span>
                                        </button>
                                        {canDelete && (
                                          <button
                                            type="button"
                                            onClick={() => openDeleteModal(shipRef, shipRows)}
                                            className="inline-flex items-center justify-center gap-1 w-full px-2 py-1 rounded-lg text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 shadow-2xs transition cursor-pointer"
                                            title={lang === 'ar' ? 'حذف هذه الشحنة ونقلها للمحذوفات' : 'Delete shipment'}
                                          >
                                            <Trash2 size={12} className="text-rose-600" />
                                            <span>{lang === 'ar' ? 'حذف' : 'Delete'}</span>
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              );
                            }

                            // 1. Column: Operation / entered (Card matching User Image 1)
                            if (c.k === 'opEntered') {
                              return (
                                <td
                                  key={c.k}
                                  rowSpan={rowSpan}
                                  style={{
                                    width: `${c.w}px`,
                                    minWidth: `${c.w}px`,
                                    verticalAlign: 'middle',
                                    padding: '4px',
                                  }}
                                >
                                  <div className="flex flex-col items-center justify-center py-2 px-3 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-sky-50/40 shadow-sm text-center w-full min-h-[58px]">
                                    <span className="text-[12px] font-semibold text-slate-700 tracking-tight leading-tight">
                                      {r._ref}
                                    </span>
                                    <span className="text-[10px] text-slate-500 my-0.5 leading-tight font-medium">
                                      {fmtEnteredDate(r._createdAtUtc)}
                                    </span>
                                    <span className="text-[12px] font-bold text-slate-900 leading-tight">
                                      {r.oper || r._createdByName || '—'}
                                    </span>
                                  </div>
                                </td>
                              );
                            }

                            // 1.1 Column: Delivered By
                            if (c.k === 'deliveredBy') {
                              let deliverer = r.deliveredBy || r.deliveredByName || r.deliveredByUserId || '';
                              if (user && (deliverer === user.id || deliverer === user.userId)) {
                                deliverer = currentUserName;
                              }
                              if (!deliverer || /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(deliverer)) {
                                deliverer = r.deliveredByName || r._createdByName || r.oper || '—';
                              }
                              return (
                                <td
                                  key={c.k}
                                  rowSpan={rowSpan}
                                  style={{
                                    width: `${c.w}px`,
                                    minWidth: `${c.w}px`,
                                    verticalAlign: 'middle',
                                    padding: '4px',
                                    textAlign: 'center',
                                  }}
                                >
                                  <div
                                    className="flex items-center justify-center py-2 px-3 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-sky-50/40 shadow-xs text-center w-full min-h-[46px]"
                                    title={deliverer}
                                  >
                                    <span className="text-[12px] font-bold text-slate-800 leading-tight truncate">
                                      {deliverer}
                                    </span>
                                  </div>
                                </td>
                              );
                            }

                            // 1.2 Column: Delivered At
                            if (c.k === 'deliveredAt') {
                              const dateVal = fmtEnteredDate(r.deliveredAtUtc || r.deliveredAt);
                              return (
                                <td
                                  key={c.k}
                                  rowSpan={rowSpan}
                                  style={{
                                    width: `${c.w}px`,
                                    minWidth: `${c.w}px`,
                                    verticalAlign: 'middle',
                                    padding: '4px',
                                    textAlign: 'center',
                                  }}
                                >
                                  <div
                                    className="flex items-center justify-center py-2 px-2.5 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-sky-50/40 shadow-xs text-center w-full min-h-[46px]"
                                    title={dateVal || '—'}
                                  >
                                    <span className="text-[11px] font-semibold text-slate-600 leading-tight whitespace-nowrap">
                                      {dateVal || '—'}
                                    </span>
                                  </div>
                                </td>
                              );
                            }

                            // 2. Column: Select (Checkbox matching User Image 1)
                            if (c.k === 'sel') {
                              const isSelected = selectedOps.has(shipRef);
                              return (
                                <td
                                  key={c.k}
                                  rowSpan={rowSpan}
                                  style={{
                                    width: `${c.w}px`,
                                    minWidth: `${c.w}px`,
                                    verticalAlign: 'middle',
                                    textAlign: 'center',
                                  }}
                                >
                                  <div className="flex items-center justify-center w-full">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleSelectOp(shipRef)}
                                      className="w-4 h-4 rounded text-sky-600 border-slate-300 focus:ring-sky-500 cursor-pointer"
                                      title="تحديد العملية"
                                    />
                                  </div>
                                </td>
                              );
                            }

                            // 3. Column: Status (Always Merged per Shipment, Non-Unmergeable, Modern Custom Popover)
                            if (c.k === 'status') {
                              const isDeliveredStatus = r.status === 'Delivered';
                              const isMenuOpen = statusMenuOpenRef === shipRef;

                              return (
                                <td
                                  key={c.k}
                                  rowSpan={rowSpan}
                                  style={{
                                    width: `${c.w}px`,
                                    minWidth: `${c.w}px`,
                                    verticalAlign: 'middle',
                                    padding: '4px',
                                    textAlign: 'center',
                                  }}
                                >
                                  <div className="status-menu-container relative flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-sky-50/40 shadow-xs text-center w-full min-h-[46px]">
                                    {isDeliveredTab ? (
                                      /* In Delivered tab: display clean locked/delivered pill */
                                      <div
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs select-none"
                                        title={lang === 'ar' ? 'العملية مسلّمة (Delivered)' : 'Delivered shipment'}
                                      >
                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                        <span>Delivered</span>
                                        <Lock size={12} className="text-emerald-600/80" />
                                      </div>
                                    ) : (
                                      /* In Import / Export: interactive custom pill dropdown */
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => setStatusMenuOpenRef((prev) => (prev === shipRef ? null : shipRef))}
                                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition shadow-2xs cursor-pointer select-none ${isDeliveredStatus
                                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400'
                                              : 'bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100 hover:border-sky-400'
                                            }`}
                                          title={lang === 'ar' ? 'تغيير حالة الشحنة' : 'Change status'}
                                        >
                                          <span
                                            className={`w-2 h-2 rounded-full ${isDeliveredStatus ? 'bg-emerald-500' : 'bg-sky-500 animate-pulse'
                                              }`}
                                          ></span>
                                          <span>{r.status || 'Open'}</span>
                                          <ChevronDown
                                            size={13}
                                            className={`transition-transform duration-150 ${isMenuOpen ? 'rotate-180' : ''
                                              } ${isDeliveredStatus ? 'text-emerald-600' : 'text-sky-600'}`}
                                          />
                                        </button>

                                        {/* Custom Floating Popover Menu (Zero native select styling) */}
                                        {isMenuOpen && (
                                          <div
                                            className="absolute top-full mt-1.5 z-50 w-36 bg-white rounded-2xl border border-slate-200/90 shadow-xl p-1.5 flex flex-col gap-1 text-xs font-semibold animate-in fade-in zoom-in-95"
                                            style={{ minWidth: '130px' }}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <button
                                              type="button"
                                              onClick={() => {
                                                onToggleStatus && onToggleStatus(currentDir, r._operationId || r._ref, 'Open');
                                                setStatusMenuOpenRef(null);
                                              }}
                                              className={`flex items-center justify-between w-full px-3 py-2 rounded-xl transition text-left cursor-pointer ${!isDeliveredStatus
                                                  ? 'bg-sky-50 text-sky-900 font-bold border border-sky-200'
                                                  : 'text-slate-700 hover:bg-slate-50'
                                                }`}
                                            >
                                              <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                                                <span>Open</span>
                                              </div>
                                              {!isDeliveredStatus && <CheckCircle2 size={13} className="text-sky-600" />}
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() => {
                                                onToggleStatus && onToggleStatus(currentDir, r._operationId || r._ref, 'Delivered');
                                                setStatusMenuOpenRef(null);
                                              }}
                                              className={`flex items-center justify-between w-full px-3 py-2 rounded-xl transition text-left cursor-pointer ${isDeliveredStatus
                                                  ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200'
                                                  : 'text-slate-700 hover:bg-slate-50'
                                                }`}
                                            >
                                              <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                <span>Delivered</span>
                                              </div>
                                              {isDeliveredStatus && <CheckCircle2 size={13} className="text-emerald-600" />}
                                            </button>
                                          </div>
                                        )}
                                      </>
                                    )}

                                    {/* Status History / Audit Log Trigger */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openStatusHistoryModal(shipRef, shipRows);
                                      }}
                                      className="w-7 h-7 rounded-xl flex items-center justify-center text-slate-400 hover:text-sky-600 hover:bg-white hover:border-slate-200 transition border border-transparent shadow-2xs shrink-0 cursor-pointer"
                                      title={lang === 'ar' ? 'سجل وتاريخ تغيرات الحالة (Status History Timeline)' : 'Status History Timeline'}
                                    >
                                      <History size={14} />
                                    </button>
                                  </div>
                                </td>
                              );
                            }

                            // 4. Column: POD (Editable dropdown list)
                            if (c.k === 'pod' && currentDir === 'Export') {
                              const podMatch = (lookups.ports || []).find(
                                (p) => (p.name || '').toLowerCase().trim() === String(val || '').toLowerCase().trim() ||
                                       (p.code || '').toLowerCase().trim() === String(val || '').toLowerCase().trim() ||
                                       p.id === val ||
                                       (r.podId && p.id === r.podId)
                              );
                              const selectedPodVal = podMatch ? podMatch.name : (val || '');

                              return (
                                <td
                                  key={c.k}
                                  rowSpan={isMergedCol ? rowSpan : 1}
                                  style={{
                                    width: `${c.w}px`,
                                    minWidth: `${c.w}px`,
                                    verticalAlign: 'middle',
                                    padding: '4px 0',
                                  }}
                                >
                                  <div
                                    className={`cbox grp-${c.g}`}
                                    style={{
                                      width: '100%',
                                      minWidth: `${c.w - 12}px`,
                                      height: '34px',
                                      minHeight: '34px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <select
                                      value={selectedPodVal}
                                      disabled={isDisabled}
                                      onChange={(e) => {
                                        const nextPort = e.target.value;
                                        const match = (lookups.ports || []).find(
                                          (p) => (p.name || '').toLowerCase().trim() === String(nextPort || '').toLowerCase().trim() ||
                                                 (p.code || '').toLowerCase().trim() === String(nextPort || '').toLowerCase().trim() ||
                                                 p.id === nextPort
                                        );
                                        const finalName = match ? match.name : nextPort;
                                        const finalId = match ? match.id : null;
                                        if (isMergedCol) {
                                          handleMergedColChange(shipRows, 'pod', finalName);
                                          handleMergedColChange(shipRows, 'podId', finalId);
                                        } else {
                                          onUpdateCell && onUpdateCell(currentDir, r._rowId, 'pod', finalName);
                                          onUpdateCell && onUpdateCell(currentDir, r._rowId, 'podId', finalId);
                                        }
                                      }}
                                      className="w-full text-xs font-semibold bg-transparent outline-none cursor-pointer text-slate-700"
                                    >
                                      <option value="">Select POD</option>
                                      {(lookups.ports && lookups.ports.length > 0
                                        ? lookups.ports
                                        : MASTER_DEFAULTS.pod.map(name => ({ id: name, name }))
                                      ).map((p) => (
                                        <option key={p.id || p.name} value={p.name}>
                                          {p.name} {p.code ? `(${p.code})` : ''}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </td>
                              );
                            }

                            // 5. Column: POW (Editable dropdown list)
                            if (c.k === 'pow' && currentDir === 'Export') {
                              const powMatch = (lookups.ports || []).find(
                                (p) => (p.name || '').toLowerCase().trim() === String(val || '').toLowerCase().trim() ||
                                       (p.code || '').toLowerCase().trim() === String(val || '').toLowerCase().trim() ||
                                       p.id === val ||
                                       (r.powId && p.id === r.powId)
                              );
                              const selectedPowVal = powMatch ? powMatch.name : (val || '');

                              return (
                                <td
                                  key={c.k}
                                  rowSpan={isMergedCol ? rowSpan : 1}
                                  style={{
                                    width: `${c.w}px`,
                                    minWidth: `${c.w}px`,
                                    verticalAlign: 'middle',
                                    padding: '4px 0',
                                  }}
                                >
                                  <div
                                    className={`cbox grp-${c.g}`}
                                    style={{
                                      width: '100%',
                                      minWidth: `${c.w - 12}px`,
                                      height: '34px',
                                      minHeight: '34px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <select
                                      value={selectedPowVal}
                                      disabled={isDisabled}
                                      onChange={(e) => {
                                        const nextPow = e.target.value;
                                        const pObj = (lookups.ports || []).find(
                                          (p) => (p.name || '').toLowerCase().trim() === String(nextPow || '').toLowerCase().trim() ||
                                                 (p.code || '').toLowerCase().trim() === String(nextPow || '').toLowerCase().trim() ||
                                                 p.id === nextPow
                                        );
                                        const finalName = pObj ? pObj.name : nextPow;
                                        const finalId = pObj ? pObj.id : null;
                                        if (isMergedCol) {
                                          handleMergedColChange(shipRows, 'pow', finalName);
                                          handleMergedColChange(shipRows, 'powId', finalId);
                                        } else {
                                          onUpdateCell && onUpdateCell(currentDir, r._rowId, 'pow', finalName);
                                          onUpdateCell && onUpdateCell(currentDir, r._rowId, 'powId', finalId);
                                        }
                                      }}
                                      className="w-full text-xs font-semibold bg-transparent outline-none cursor-pointer text-slate-700"
                                    >
                                      <option value="">None (Optional)</option>
                                      {(lookups.ports && lookups.ports.length > 0
                                        ? lookups.ports
                                        : MASTER_DEFAULTS.pow.map(name => ({ id: name, name }))
                                      ).map((p) => (
                                        <option key={p.id || p.name} value={p.name}>
                                          {p.name} {p.code ? `(${p.code})` : ''}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </td>
                              );
                            }

                            // 6. Column: CNTR Type (size - Dropdown list)
                            if (c.k === 'size') {
                              return (
                                <td
                                  key={c.k}
                                  rowSpan={isMergedCol ? rowSpan : 1}
                                  style={{
                                    width: `${c.w}px`,
                                    minWidth: `${c.w}px`,
                                    verticalAlign: 'middle',
                                    padding: '4px 0',
                                  }}
                                >
                                  <div
                                    className={`cbox grp-${c.g}`}
                                    style={{
                                      width: '100%',
                                      minWidth: `${c.w - 12}px`,
                                      height: '34px',
                                      minHeight: '34px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <select
                                      value={normalizeContainerType(val)}
                                      disabled={isDisabled}
                                      onChange={(e) =>
                                        onUpdateCell && onUpdateCell(currentDir, r._rowId, 'size', e.target.value)
                                      }
                                      className="w-full text-xs font-semibold bg-transparent outline-none cursor-pointer text-slate-700 px-1 truncate"
                                      title="نوع ومقاس الحاوية (Container Type)"
                                    >
                                      {CONTAINER_TYPES.map((ct) => (
                                        <option key={ct.value} value={ct.value}>
                                          {ct.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </td>
                              );
                            }

                            // 7. Column: Latest Updates (Append-only updates per container with modal popup)
                            if (c.k === 'updates') {
                              const rawUpdates = Array.isArray(r.updates) ? r.updates : [];
                              const containerUpdates = rawUpdates.filter(
                                (up) => !up.details || (!up.details.startsWith('Export container updated') && !up.details.startsWith('Import container updated'))
                              );
                              const latestUpdate = containerUpdates.length > 0 ? containerUpdates[0] : null;
                              const updatesCount = containerUpdates.length;

                              return (
                                <td
                                  key={c.k}
                                  rowSpan={isMergedCol ? rowSpan : 1}
                                  style={{
                                    width: `${c.w}px`,
                                    minWidth: `${c.w}px`,
                                    verticalAlign: 'middle',
                                    padding: '4px 0',
                                  }}
                                >
                                  <div
                                    onClick={() => openUpdatesModal(r, shipRef)}
                                    className={`cbox grp-${c.g} cursor-pointer hover:border-sky-400 hover:shadow-md transition-all`}
                                    style={{
                                      width: '100%',
                                      minWidth: `${c.w - 12}px`,
                                      height: '34px',
                                      minHeight: '34px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: updatesCount > 0 ? 'space-between' : 'center',
                                      padding: '0 8px',
                                    }}
                                    title="انقر لفتح وإضافة التحديثات (Append-only Updates)"
                                  >
                                    {updatesCount > 0 ? (
                                      <>
                                        <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                                          <span className="text-[11px] font-semibold text-slate-800 truncate">
                                            {latestUpdate.details}
                                          </span>
                                          <span className="text-[10px] text-slate-500 shrink-0 font-medium">
                                            {latestUpdate.createdByName || 'User'} · {fmtTimeOnly(latestUpdate.createdAtUtc)}
                                          </span>
                                        </div>
                                        <span className="shrink-0 ml-1.5 w-5 h-5 rounded-full bg-cyan-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                                          {updatesCount}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-[11px] text-slate-400 italic font-medium">
                                        No updates yet
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            }

                            // 8. Column: Transporter (trucker - Dropdown list from DB lookups)
                            if (c.k === 'trucker') {
                              return (
                                <td
                                  key={c.k}
                                  rowSpan={isMergedCol ? rowSpan : 1}
                                  style={{
                                    width: `${c.w}px`,
                                    minWidth: `${c.w}px`,
                                    verticalAlign: 'middle',
                                    padding: '4px 0',
                                  }}
                                >
                                  <div
                                    className={`cbox grp-${c.g}`}
                                    style={{
                                      width: '100%',
                                      minWidth: `${c.w - 12}px`,
                                      height: '34px',
                                      minHeight: '34px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <select
                                      value={val}
                                      disabled={isDisabled}
                                      onChange={(e) => {
                                        const selectedName = e.target.value;
                                        onUpdateCell && onUpdateCell(currentDir, r._rowId, 'trucker', selectedName);
                                        const match = (lookups.transporters || []).find((t) => t.name === selectedName);
                                        if (match) {
                                          onUpdateCell && onUpdateCell(currentDir, r._rowId, 'truckerId', match.id);
                                        }
                                      }}
                                      className="w-full text-xs font-semibold bg-transparent outline-none cursor-pointer text-slate-700"
                                    >
                                      <option value="">Select Transporter</option>
                                      {lookups.transporters?.length > 0
                                        ? lookups.transporters.map((t) => (
                                          <option key={t.id} value={t.name}>
                                            {t.name}
                                          </option>
                                        ))
                                        : MASTER_DEFAULTS.trucker.map((t) => (
                                          <option key={t} value={t}>
                                            {t}
                                          </option>
                                        ))}
                                    </select>
                                  </div>
                                </td>
                              );
                            }

                            // 8. Column: MOB (Driver phone number with automatic driver name autofill)
                            if (c.k === 'mob') {
                              return (
                                <td
                                  key={c.k}
                                  rowSpan={isMergedCol ? rowSpan : 1}
                                  style={{
                                    width: `${c.w}px`,
                                    minWidth: `${c.w}px`,
                                    verticalAlign: 'middle',
                                    padding: '4px 0',
                                  }}
                                >
                                  <div
                                    className={`cbox grp-${c.g}`}
                                    style={{
                                      width: '100%',
                                      minWidth: `${c.w - 12}px`,
                                      height: '34px',
                                      minHeight: '34px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <input
                                      type="text"
                                      value={val}
                                      readOnly={isReadOnly}
                                      disabled={isDisabled}
                                      placeholder="010..."
                                      onChange={(e) => handleMobChange(e.target.value, r._rowId)}
                                      title="أدخل رقم السائق وسينزل الاسم تلقائياً"
                                      style={{
                                        width: '100%',
                                        minWidth: `${c.w - 24}px`,
                                        textAlign: 'start',
                                        cursor: isReadOnly ? 'not-allowed' : 'text',
                                        opacity: isReadOnly ? 0.78 : 1,
                                      }}
                                    />
                                  </div>
                                </td>
                              );
                            }

                            // 8.1 Column: Car No. (car - with lookups from vehicles database)
                            if (c.k === 'car') {
                              return (
                                <td
                                  key={c.k}
                                  rowSpan={isMergedCol ? rowSpan : 1}
                                  style={{
                                    width: `${c.w}px`,
                                    minWidth: `${c.w}px`,
                                    verticalAlign: 'middle',
                                    padding: '4px 0',
                                  }}
                                >
                                  <div
                                    className={`cbox grp-${c.g}`}
                                    style={{
                                      width: '100%',
                                      minWidth: `${c.w - 12}px`,
                                      height: '34px',
                                      minHeight: '34px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <input
                                      type="text"
                                      list="vehicles-lookup-datalist"
                                      value={val}
                                      readOnly={isReadOnly}
                                      disabled={isDisabled}
                                      placeholder="رقم السيارة..."
                                      onChange={(e) => handleCarChange(e.target.value, r._rowId)}
                                      title="أدخل رقم السيارة أو اختر من القائمة"
                                      style={{
                                        width: '100%',
                                        minWidth: `${c.w - 24}px`,
                                        textAlign: 'start',
                                        cursor: isReadOnly ? 'not-allowed' : 'text',
                                        opacity: isReadOnly ? 0.78 : 1,
                                        backgroundColor: isReadOnly ? 'transparent' : (isShipmentEditing ? '#ffffff' : 'transparent'),
                                        borderRadius: isReadOnly ? '0px' : '6px',
                                        padding: isReadOnly ? '2px 4px' : '4px 8px',
                                        border: isReadOnly ? '1px solid transparent' : '1px solid #bae6fd',
                                        color: isReadOnly ? '#334155' : '#0f172a',
                                      }}
                                    />
                                  </div>
                                </td>
                              );
                            }

                            // 8.2 Column: Driver Name (driver - with lookups from drivers database)
                            if (c.k === 'driver') {
                              return (
                                <td
                                  key={c.k}
                                  rowSpan={isMergedCol ? rowSpan : 1}
                                  style={{
                                    width: `${c.w}px`,
                                    minWidth: `${c.w}px`,
                                    verticalAlign: 'middle',
                                    padding: '4px 0',
                                  }}
                                >
                                  <div
                                    className={`cbox grp-${c.g}`}
                                    style={{
                                      width: '100%',
                                      minWidth: `${c.w - 12}px`,
                                      height: '34px',
                                      minHeight: '34px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <input
                                      type="text"
                                      list="drivers-lookup-datalist"
                                      value={val}
                                      readOnly={isReadOnly}
                                      disabled={isDisabled}
                                      placeholder="اسم السائق..."
                                      onChange={(e) => handleDriverChange(e.target.value, r._rowId)}
                                      title="أدخل اسم السائق أو اختر من القائمة"
                                      style={{
                                        width: '100%',
                                        minWidth: `${c.w - 24}px`,
                                        textAlign: 'start',
                                        cursor: isReadOnly ? 'not-allowed' : 'text',
                                        opacity: isReadOnly ? 0.78 : 1,
                                        backgroundColor: isReadOnly ? 'transparent' : (isShipmentEditing ? '#ffffff' : 'transparent'),
                                        borderRadius: isReadOnly ? '0px' : '6px',
                                        padding: isReadOnly ? '2px 4px' : '4px 8px',
                                        border: isReadOnly ? '1px solid transparent' : '1px solid #bae6fd',
                                        color: isReadOnly ? '#334155' : '#0f172a',
                                      }}
                                    />
                                  </div>
                                </td>
                              );
                            }

                            // 8.5 Column: Destination (dest - Dropdown from database lookups with merge/unmerge support)
                            if (c.k === 'dest') {
                              const destList = (lookups.destinations && lookups.destinations.length > 0)
                                ? lookups.destinations.map((d) => (typeof d === 'string' ? d : d.name))
                                : (MASTER_DEFAULTS.dest || []);
                              const hasVal = !val || destList.some((opt) => opt.toLowerCase() === String(val).toLowerCase());

                              return (
                                <td
                                  key={c.k}
                                  rowSpan={isMergedCol ? rowSpan : 1}
                                  style={{
                                    width: `${c.w}px`,
                                    minWidth: `${c.w}px`,
                                    verticalAlign: 'middle',
                                    padding: '4px 0',
                                  }}
                                >
                                  <div
                                    className={`cbox grp-${c.g} relative`}
                                    style={{
                                      width: '100%',
                                      minWidth: `${c.w - 12}px`,
                                      height: '34px',
                                      minHeight: '34px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      paddingLeft: '6px',
                                      paddingRight: canUnmerge && isFirstRow ? '32px' : '6px',
                                    }}
                                  >
                                    {canUnmerge && isFirstRow && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleUnmerge(shipRef, c.k);
                                        }}
                                        className="unmerge-btn"
                                        title={isMergedCol ? 'فصل الخانات حسب عدد الحاويات (Unmerge)' : 'دمج الخانات (Merge)'}
                                      >
                                        {isMergedCol ? (
                                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                                            <rect x="2" y="2" width="8" height="8" rx="1.5" />
                                            <rect x="6" y="6" width="8" height="8" rx="1.5" />
                                          </svg>
                                        ) : (
                                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                                            <rect x="2" y="2" width="12" height="12" rx="1.5" />
                                            <line x1="8" y1="2" x2="8" y2="14" />
                                            <line x1="2" y1="8" x2="14" y2="8" />
                                          </svg>
                                        )}
                                      </button>
                                    )}

                                    <select
                                      value={val || ''}
                                      disabled={isDisabled || isReadOnly}
                                      onChange={(e) => {
                                        const selectedVal = e.target.value;
                                        if (isMergedCol) {
                                          handleMergedColChange(shipRows, c.k, selectedVal);
                                        } else {
                                          onUpdateCell && onUpdateCell(currentDir, r._rowId, c.k, selectedVal);
                                        }
                                      }}
                                      className="w-full text-xs font-semibold bg-transparent outline-none cursor-pointer text-slate-700"
                                      style={{
                                        textAlign: isMergedCol ? 'center' : 'start',
                                        cursor: isReadOnly ? 'not-allowed' : 'pointer',
                                        opacity: isReadOnly ? 0.72 : 1,
                                      }}
                                    >
                                      <option value="">{lang === 'ar' ? '-- اختر الوجهة --' : '-- Select Destination --'}</option>
                                      {!hasVal && val && (
                                        <option value={val}>{val}</option>
                                      )}
                                      {destList.map((d) => (
                                        <option key={d} value={d}>
                                          {d}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </td>
                              );
                            }

                            // 9. Generic Cell (including missDoc with merge/unmerge)
                            return (
                              <td
                                key={c.k}
                                rowSpan={isMergedCol ? rowSpan : 1}
                                style={{
                                  width: `${c.w}px`,
                                  minWidth: `${c.w}px`,
                                  verticalAlign: 'middle',
                                  padding: '4px 0',
                                }}
                              >
                                <div
                                  className={`cbox grp-${c.g} relative`}
                                  style={{
                                    width: '100%',
                                    minWidth: `${c.w - 12}px`,
                                    height: '34px',
                                    minHeight: '34px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    paddingLeft: '6px',
                                    paddingRight: canUnmerge && isFirstRow ? '32px' : '6px',
                                  }}
                                >
                                  {canUnmerge && isFirstRow && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleUnmerge(shipRef, c.k);
                                      }}
                                      className="unmerge-btn"
                                      title={isMergedCol ? 'فصل الخانات حسب عدد الحاويات (Unmerge)' : 'دمج الخانات (Merge)'}
                                    >
                                      {isMergedCol ? (
                                        /* Unmerge icon: Overlapping rectangles (Image 2) */
                                        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                                          <rect x="2" y="2" width="8" height="8" rx="1.5" />
                                          <rect x="6" y="6" width="8" height="8" rx="1.5" />
                                        </svg>
                                      ) : (
                                        /* Merge icon: 2x2 grid (Image 3) */
                                        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                                          <rect x="2" y="2" width="12" height="12" rx="1.5" />
                                          <line x1="8" y1="2" x2="8" y2="14" />
                                          <line x1="2" y1="8" x2="14" y2="8" />
                                        </svg>
                                      )}
                                    </button>
                                  )}

                                  <input
                                    type={c.t === 'date' ? 'date' : c.t === 'time' ? 'time' : 'text'}
                                    value={c.t === 'date' && val ? String(val).slice(0, 10) : val}
                                    readOnly={isReadOnly}
                                    disabled={isDisabled}
                                    placeholder={inputPlaceholder}
                                    onChange={(e) => {
                                      if (isReadOnly) return;
                                      if (isMergedCol) {
                                        handleMergedColChange(shipRows, c.k, e.target.value);
                                      } else {
                                        onUpdateCell && onUpdateCell(currentDir, r._rowId, c.k, e.target.value);
                                      }
                                    }}
                                    title={cellTitle}
                                    style={{
                                      width: '100%',
                                      minWidth: `${c.w - 24}px`,
                                      textAlign: isMergedCol ? 'center' : 'start',
                                      fontWeight: isMergedCol ? '600' : 'normal',
                                      cursor: isReadOnly ? 'default' : 'text',
                                      backgroundColor: isReadOnly ? 'transparent' : (isShipmentEditing ? '#ffffff' : 'transparent'),
                                      borderRadius: isReadOnly ? '0px' : '6px',
                                      padding: isReadOnly ? '2px 4px' : '4px 8px',
                                      border: isReadOnly ? '1px solid transparent' : '1px solid #bae6fd',
                                      boxShadow: !isReadOnly && isShipmentEditing ? '0 1px 2px rgba(14, 165, 233, 0.15)' : 'none',
                                      color: isReadOnly ? '#334155' : '#0f172a',
                                      opacity: isReadOnly ? 0.82 : 1,
                                    }}
                                  />
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    });
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Updates Modal (Append-Only) matching user screenshots 2, 3, 4 */}
      {updatesModalOpen && activeUpdateRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">
                Updates — {activeUpdateRow.shipRef || activeUpdateRow.row?._ref || 'OPS'}
              </h3>
              <button
                type="button"
                onClick={() => setUpdatesModalOpen(false)}
                className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer text-lg"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Input Form */}
            <div className="px-6 pb-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type the update and press Enter..."
                  value={newUpdateText}
                  onChange={(e) => setNewUpdateText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddUpdate();
                    }
                  }}
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 placeholder:text-slate-400"
                />
                <button
                  type="button"
                  disabled={isSubmittingUpdate || !newUpdateText.trim()}
                  onClick={handleAddUpdate}
                  className="px-5 py-2.5 rounded-xl bg-[#0f4c81] hover:bg-[#0c3c66] text-white text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center gap-1 shadow-sm cursor-pointer"
                >
                  {isSubmittingUpdate ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    '+ Add update'
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2 font-medium">
                Will be recorded as <span className="font-semibold text-slate-600">{currentUserName}</span>
              </p>
            </div>

            {/* Updates List (Showing only manual user-created updates) */}
            <div className="px-6 pb-6 pt-2 overflow-y-auto flex-1 space-y-2.5">
              {(() => {
                const manualUpdates = (activeUpdateRow.row.updates || []).filter(
                  (up) =>
                    !up.details ||
                    (!up.details.startsWith('Export container updated') &&
                      !up.details.startsWith('Import container updated'))
                );

                if (manualUpdates.length === 0) {
                  return (
                    <div className="py-8 text-center text-sm text-slate-400 italic font-medium">
                      {lang === 'ar' ? 'لا توجد تحديثات يدوية حتى الآن' : 'No manual updates yet'}
                    </div>
                  );
                }

                return manualUpdates.map((up, idx) => {
                  const totalCount = manualUpdates.length;
                  const itemNumber = totalCount - idx;
                  const isLatest = idx === 0;

                  return (
                    <div
                      key={up.id || idx}
                      className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 transition shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Numbered badge */}
                        <div className="w-7 h-7 rounded-full bg-[#0f4c81] text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {itemNumber}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-slate-900 leading-tight break-words">
                            {up.details}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium mt-1 leading-tight">
                            {fmtUpdateDateTime(up.createdAtUtc)} · <span className="text-slate-700 font-semibold">{up.createdByName || currentUserName}</span>
                          </span>
                        </div>
                      </div>

                      {/* Latest badge on the first item */}
                      {isLatest && (
                        <span className="ml-3 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200/70 shrink-0">
                          latest
                        </span>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* 6. Reopen Operation Modal with Audit Logging */}
      {reopenModalOpen && reopenTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Unlock size={17} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {lang === 'ar' ? 'إعادة فتح العملية المسلّمة' : 'Reopen Delivered Operation'}
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">
                    {reopenTarget.shipmentNumber || reopenTarget.shipRef}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReopenModalOpen(false)}
                className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-amber-50/80 border border-amber-200/70 rounded-2xl text-xs text-amber-900 leading-relaxed space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-950">
                  <AlertTriangle size={14} className="text-amber-600" />
                  <span>{lang === 'ar' ? 'تسجيل تدقيق أمني (Audit Trail)' : 'Security Audit Notice'}</span>
                </div>
                <p>
                  {lang === 'ar'
                    ? `سيتم تسجيل عملية فتح هذه الشحنة رسمياً في قاعدة البيانات باسمك (${currentUserName}) وتوثيق السبب ووقت الفتح بدقة.`
                    : `This reopen action will be officially audited with your name (${currentUserName}), timestamp, and reason.`}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {lang === 'ar' ? 'سبب إعادة فتح الشحنة (إجباري) *' : 'Reason for Reopening (Required) *'}
                </label>
                <textarea
                  rows={3}
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder={
                    lang === 'ar'
                      ? 'يرجى كتابة سبب إعادة فتح العملية بوضوح...'
                      : 'Please specify the exact operational reason for reopening...'
                  }
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 placeholder:text-slate-400"
                />
                {reopenError && (
                  <p className="text-xs text-rose-600 font-medium mt-1.5">
                    {reopenError}
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isSubmittingReopen}
                onClick={() => setReopenModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer disabled:opacity-50"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isSubmittingReopen || !reopenReason.trim()}
                onClick={handleConfirmReopen}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingReopen ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Unlock size={13} />
                )}
                <span>
                  {isSubmittingReopen
                    ? (lang === 'ar' ? 'جاري الفتح...' : 'Reopening...')
                    : (lang === 'ar' ? 'تأكيد إعادة الفتح' : 'Confirm Reopen')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}


      {/* 6.5 Confirm Delete Operation Modal */}
      {deleteModalOpen && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {lang === 'ar' ? 'تأكيد حذف العملية' : 'Confirm Delete Operation'}
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">
                    {deleteTarget.shipNo || deleteTarget.blOrBooking || deleteTarget.shipRef}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-rose-50/80 border border-rose-200/70 rounded-2xl text-xs text-rose-900 leading-relaxed space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-rose-950">
                  <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                  <span>{lang === 'ar' ? 'تنبيه نقل إلى سجل المحذوفات' : 'Move to Deleted Archive'}</span>
                </div>
                <p>
                  {lang === 'ar'
                    ? `هل أنت متأكد من حذف هذه الشحنة؟ سيتم نقلها إلى سجل المحذوفات وتوثيق اسمك (${currentUserName}) وتاريخ وساعة الحذف بدقة.`
                    : `Are you sure you want to delete this shipment? It will be moved to the Deleted archive with your name (${currentUserName}) and exact timestamp.`}
                </p>
              </div>

              {/* Target Details Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">{lang === 'ar' ? 'العملية / الشحنة:' : 'Shipment / BL:'}</span>
                  <span className="font-bold text-slate-800">{deleteTarget.blOrBooking || deleteTarget.shipRef}</span>
                </div>
                {deleteTarget.client && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">{lang === 'ar' ? 'العميل:' : 'Client:'}</span>
                    <span className="font-semibold text-slate-700">{deleteTarget.client}</span>
                  </div>
                )}
                {deleteTarget.line && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">{lang === 'ar' ? 'الخط الملاحي:' : 'Line:'}</span>
                    <span className="font-semibold text-slate-700">{deleteTarget.line}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">{lang === 'ar' ? 'عدد الحاويات:' : 'Containers:'}</span>
                  <span className="font-bold text-rose-600">{deleteTarget.containersCount} {lang === 'ar' ? 'حاوية' : 'cntrs'}</span>
                </div>
              </div>

              {deleteError && (
                <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  {deleteError}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isSubmittingDelete}
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer disabled:opacity-50"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isSubmittingDelete}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingDelete ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Trash2 size={13} />
                )}
                <span>
                  {isSubmittingDelete
                    ? (lang === 'ar' ? 'جاري الحذف...' : 'Deleting...')
                    : (lang === 'ar' ? 'نعم، حذف الشحنة' : 'Yes, Delete Shipment')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Containers Count Validation Modal (Keeps entered form inputs completely intact) */}
      {cntrErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 pt-6 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {lang === 'ar' ? 'تنبيه: عدد الحاويات إلزامي' : 'Container Count Required'}
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">
                    Containers in this operation
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCntrErrorModal(false);
                  setTimeout(() => cntrCountInputRef.current?.focus(), 50);
                }}
                className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs leading-relaxed text-slate-600">
              <p className="font-semibold text-slate-800 text-[13px]">
                {lang === 'ar'
                  ? 'لا يمكن إنشاء عملية بعدد حاويات صفر (0).'
                  : 'Cannot create an operation with 0 containers.'}
              </p>
              <p>
                {lang === 'ar'
                  ? 'تم الاحتفاظ بجميع البيانات التي أدخلتها (العميل، رقم البوليصة/البوكينج، الخط، الميناء، إلخ). يرجى فقط تحديد عدد الحاويات (من 1 إلى 200) ثم الضغط على "Create operation".'
                  : 'All your entered details (Client, Booking/BL, Shipping Line, Port, etc.) have been preserved. Please enter the container count (1–200) to proceed.'}
              </p>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setCntrErrorModal(false);
                  setTimeout(() => {
                    cntrCountInputRef.current?.focus();
                    cntrCountInputRef.current?.select();
                  }, 50);
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-sm transition cursor-pointer flex items-center gap-1.5"
              >
                <span>{lang === 'ar' ? 'تعديل عدد الحاويات الآن' : 'Set container count now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Operation Status History & Audit Log Slide-over Drawer / Modal */}
      {statusHistoryOpen && statusHistoryTarget && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setStatusHistoryOpen(false)}
        >
          <div
            className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col border-s border-slate-200 animate-in slide-in-from-right duration-250 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-sky-50/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-100/70 text-sky-700 border border-sky-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                  <History size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {lang === 'ar' ? 'سجل وتاريخ حالات الشحنة' : 'Operation Status History'}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {lang === 'ar' ? 'Audit Log & Lifecycle Timeline' : 'Audit Log & Lifecycle Timeline'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStatusHistoryOpen(false)}
                className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Operation Info Card */}
            <div className="px-6 py-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-3 text-xs">
              <div className="flex flex-col">
                <span className="text-[10.5px] text-slate-400 font-medium">
                  {lang === 'ar' ? 'الشحنة / البوليصة' : 'Shipment / BL'}
                </span>
                <span className="font-bold text-slate-800 tracking-wide text-xs">
                  {statusHistoryTarget.shipRef}
                </span>
              </div>

              {statusHistoryTarget.row?.client && (
                <div className="flex flex-col text-right">
                  <span className="text-[10.5px] text-slate-400 font-medium">
                    {lang === 'ar' ? 'العميل' : 'Client'}
                  </span>
                  <span className="font-bold text-slate-700 text-xs truncate max-w-[150px]">
                    {statusHistoryTarget.row.client}
                  </span>
                </div>
              )}

              <div className="flex flex-col items-end">
                <span className="text-[10.5px] text-slate-400 font-medium mb-0.5">
                  {lang === 'ar' ? 'الحالة الحالية' : 'Current'}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusHistoryTarget.row?.status === 'Delivered'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-sky-50 text-sky-800 border-sky-300'
                    }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${statusHistoryTarget.row?.status === 'Delivered' ? 'bg-emerald-500' : 'bg-sky-500'
                      }`}
                  ></span>
                  {statusHistoryTarget.row?.status || 'Open'}
                </span>
              </div>
            </div>

            {/* Drawer Body / Timeline */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {isLoadingStatusHistory ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <RefreshCw size={24} className="animate-spin text-sky-600" />
                  <span className="text-xs font-medium">
                    {lang === 'ar' ? 'جاري تحميل سجل الحالة...' : 'Loading status history...'}
                  </span>
                </div>
              ) : statusHistoryList.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs text-center">
                  <Clock size={28} className="opacity-40" />
                  <span>{lang === 'ar' ? 'لا يوجد سجلات سابقة مسجلة' : 'No status history records found'}</span>
                </div>
              ) : (
                <div className="relative">
                  {/* Vertical connector line */}
                  <div
                    className="absolute top-4 bottom-4 w-0.5 bg-slate-200"
                    style={{ [lang === 'ar' ? 'right' : 'left']: '19px' }}
                  ></div>

                  <div className="space-y-6">
                    {statusHistoryList.map((item, idx) => {
                      const isDelivered = item.type === 'Delivered' || item.status === 'Delivered';
                      const isReopened = item.type === 'Reopened' || item.reason;
                      const isCreated = item.type === 'Created';

                      return (
                        <div
                          key={item.id || idx}
                          className="relative flex items-start gap-4 animate-in fade-in duration-200"
                        >
                          {/* Timeline Node Badge */}
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 z-10 shadow-xs border-2 transition ${isDelivered
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-600'
                                : isReopened
                                  ? 'bg-amber-50 border-amber-500 text-amber-600'
                                  : 'bg-sky-50 border-sky-500 text-sky-600'
                              }`}
                          >
                            {isDelivered && <CheckCircle2 size={18} />}
                            {isReopened && <RotateCcw size={18} />}
                            {isCreated && <Plus size={18} />}
                            {!isDelivered && !isReopened && !isCreated && <Clock size={18} />}
                          </div>

                          {/* Event Card */}
                          <div className="flex-1 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs transition">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span
                                className={`text-xs font-bold ${isDelivered
                                    ? 'text-emerald-800'
                                    : isReopened
                                      ? 'text-amber-800'
                                      : 'text-sky-800'
                                  }`}
                              >
                                {item.title}
                              </span>
                              <span className="text-[10.5px] text-slate-400 font-medium shrink-0">
                                {fmtUpdateDateTime(item.timestamp) || (lang === 'ar' ? 'غير محدد' : 'Unknown')}
                              </span>
                            </div>

                            {/* User who performed the action */}
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                              <span className="text-slate-400 text-[11px]">
                                {lang === 'ar' ? 'بواسطة:' : 'By:'}
                              </span>
                              <span className="font-semibold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200/60 shadow-2xs">
                                {(() => {
                                  const rawName = item.userName;
                                  if (!rawName) return currentUserName || (lang === 'ar' ? 'مستخدم النظام' : 'System User');
                                  const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(rawName).trim());
                                  if (isGuid) {
                                    return statusHistoryTarget?.row?._createdByName || statusHistoryTarget?.row?.oper || currentUserName || 'Operations Team';
                                  }
                                  return rawName;
                                })()}
                              </span>
                            </div>

                            {/* Reopen Reason / Note Box */}
                            {item.reason && (
                              <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/80 text-[11.5px] text-amber-900 leading-relaxed">
                                <span className="font-bold block text-[11px] text-amber-800 mb-0.5">
                                  {lang === 'ar' ? 'سبب إعادة الفتح:' : 'Reopen Reason:'}
                                </span>
                                <span className="italic">"{item.reason}"</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Lock size={12} className="text-slate-400" />
                {lang === 'ar' ? 'سجل غير قابل للتعديل (Audit Log)' : 'Immutable Audit Log'}
              </span>
              <button
                type="button"
                onClick={() => setStatusHistoryOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition cursor-pointer"
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Deleted Operation Full Details Slide-over Drawer / Modal */}
      {viewDeletedDetailOp && (() => {
        const op = viewDeletedDetailOp;
        const isImport = op.operationType === 'Import' || op.operationType === 1;
        const refNum = isImport ? op.importDetails?.mblNumber : op.exportDetails?.bookingNumber;
        const portName = isImport
          ? (op.importDetails?.podName || op.importDetails?.podCode || '—')
          : (op.exportDetails?.polName || op.exportDetails?.polCode || '—');
        const powName = !isImport ? (op.exportDetails?.powName || '—') : null;
        const clearanceType = !isImport ? (op.exportDetails?.clearanceType || '—') : null;
        const customs = !isImport ? (op.exportDetails?.customs || '—') : null;
        const containers = op.containers || [];

        return (
          <div
            className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setViewDeletedDetailOp(null)}
          >
            <div
              className="w-full max-w-3xl h-full bg-white shadow-2xl flex flex-col border-s border-slate-200 animate-in slide-in-from-right duration-250 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-rose-50/50 via-white to-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
                    <Trash2 size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-800">
                        {lang === 'ar' ? 'التفاصيل الكاملة للعملية المحذوفة' : 'Deleted Operation Full Details'}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${isImport
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                      >
                        {isImport ? 'Import' : 'Export'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {op.shipmentNumber || refNum || op.id}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewDeletedDetailOp(null)}
                  className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Deletion Audit Banner */}
              <div className="px-6 py-3 bg-rose-50/70 border-b border-rose-100 flex items-center justify-between gap-3 text-xs flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                  <span className="text-slate-600">
                    {lang === 'ar' ? 'تم الحذف بواسطة:' : 'Deleted By:'}{' '}
                    <strong className="text-rose-900">{op.deletedByName || (lang === 'ar' ? 'مستخدم' : 'User')}</strong>
                  </span>
                </div>
                <div className="text-slate-500 text-[11px]">
                  <span>{lang === 'ar' ? 'تاريخ وساعة الحذف:' : 'Deleted At:'} </span>
                  <strong className="text-slate-700">{fmtUpdateDateTime(op.deletedAtUtc)}</strong>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {/* 1. Operation Master Details Cards */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-3.5 bg-sky-600 rounded-full"></span>
                    <span>{lang === 'ar' ? 'بيانات الشحنة والعملية الأساسية' : 'Shipment & Master Info'}</span>
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                      <span className="text-[10px] text-slate-400 block font-medium">
                        {lang === 'ar' ? 'العميل' : 'Client'}
                      </span>
                      <span className="text-xs font-bold text-slate-800 truncate block" title={op.clientName}>
                        {op.clientName || '—'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                      <span className="text-[10px] text-slate-400 block font-medium">
                        {lang === 'ar' ? 'الخط الملاحي' : 'Shipping Line'}
                      </span>
                      <span className="text-xs font-bold text-slate-800 truncate block" title={op.shippingLineName}>
                        {op.shippingLineName || '—'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                      <span className="text-[10px] text-slate-400 block font-medium">
                        {lang === 'ar' ? 'البوليصة / البوكينج' : 'BL / Booking'}
                      </span>
                      <span className="text-xs font-bold text-slate-800 truncate block">
                        {refNum || '—'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                      <span className="text-[10px] text-slate-400 block font-medium">
                        {lang === 'ar' ? 'رقم الشهادة' : 'Certificate No.'}
                      </span>
                      <span className="text-xs font-bold text-slate-800 truncate block">
                        {op.certificateNumber || '—'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                      <span className="text-[10px] text-slate-400 block font-medium">
                        {lang === 'ar' ? (isImport ? 'ميناء الوصول (POD)' : 'ميناء الشحن (POL)') : 'Port'}
                      </span>
                      <span className="text-xs font-bold text-slate-800 truncate block">
                        {portName}
                      </span>
                    </div>

                    {!isImport && (
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                        <span className="text-[10px] text-slate-400 block font-medium">
                          {lang === 'ar' ? 'ميناء العبور (POW)' : 'POW'}
                        </span>
                        <span className="text-xs font-bold text-slate-800 truncate block">
                          {powName}
                        </span>
                      </div>
                    )}

                    {!isImport && (
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                        <span className="text-[10px] text-slate-400 block font-medium">
                          {lang === 'ar' ? 'نوع التخليص' : 'Clearance Type'}
                        </span>
                        <span className="text-xs font-bold text-slate-800 truncate block">
                          {clearanceType}
                        </span>
                      </div>
                    )}

                    {!isImport && customs && (
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                        <span className="text-[10px] text-slate-400 block font-medium">
                          {lang === 'ar' ? 'الجمارك' : 'Customs'}
                        </span>
                        <span className="text-xs font-bold text-slate-800 truncate block">
                          {customs}
                        </span>
                      </div>
                    )}

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                      <span className="text-[10px] text-slate-400 block font-medium">
                        {lang === 'ar' ? 'تاريخ استلام الفواتير' : 'Invoices Rcv'}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 block">
                        {op.invoicesReceivedDate ? String(op.invoicesReceivedDate).slice(0, 10) : '—'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                      <span className="text-[10px] text-slate-400 block font-medium">
                        {lang === 'ar' ? 'المنشئ وتاريخ الإنشاء' : 'Created By & At'}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 block truncate" title={`${op.createdByName || ''} - ${fmtEnteredDate(op.createdAtUtc)}`}>
                        {op.createdByName || '—'} · {fmtEnteredDate(op.createdAtUtc)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                      <span className="text-[10px] text-slate-400 block font-medium">
                        {lang === 'ar' ? 'الحالة السابقة' : 'Status before delete'}
                      </span>
                      <span className="text-xs font-bold text-slate-800 block">
                        {op.status || 'Open'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Containers Table */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-3.5 bg-emerald-600 rounded-full"></span>
                      <span>{lang === 'ar' ? `تفاصيل الحاويات ورحلات النقل (${containers.length})` : `Containers & Trips (${containers.length})`}</span>
                    </h4>
                  </div>

                  {containers.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-slate-50 text-center text-xs text-slate-400">
                      {lang === 'ar' ? 'لا توجد حاويات مسجلة في هذه العملية' : 'No containers recorded in this operation'}
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-2xs">
                      <table className="w-full text-xs text-start border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-[11px]">
                            <th className="py-2.5 px-3 text-start">#</th>
                            <th className="py-2.5 px-3 text-start">{lang === 'ar' ? 'رقم الحاوية والنوع' : 'Container & Type'}</th>
                            <th className="py-2.5 px-3 text-start">{lang === 'ar' ? 'مكان التحميل / التعتيق' : 'Destination'}</th>
                            <th className="py-2.5 px-3 text-start">{lang === 'ar' ? 'مقاول النقل' : 'Transporter'}</th>
                            <th className="py-2.5 px-3 text-start">{lang === 'ar' ? 'السيارة والسائق' : 'Car & Driver'}</th>
                            <th className="py-2.5 px-3 text-start">{lang === 'ar' ? 'تاريخ الوصول' : 'Actual Arrival'}</th>
                            <th className="py-2.5 px-3 text-start">{lang === 'ar' ? 'الخروج من البوابة' : 'Gate Out'}</th>
                            <th className="py-2.5 px-3 text-start">{lang === 'ar' ? 'المستندات الناقصة' : 'Missing Docs'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {containers.map((c, cIdx) => (
                            <tr key={c.id || cIdx} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-2.5 px-3 font-semibold text-slate-500">
                                {c.ordinal || cIdx + 1}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900 font-mono">
                                  {c.containerNumber || '—'}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {c.containerType || '—'}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 font-medium text-slate-700">
                                {c.destination || '—'}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-slate-700">
                                {c.transporterName || '—'}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-800">
                                  {c.carNumber || '—'}
                                </div>
                                <div className="text-[10.5px] text-slate-500">
                                  {c.driverName || '—'} {c.driverMobileNumber ? `(${c.driverMobileNumber})` : ''}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                                {c.actualArrivalDate ? `${String(c.actualArrivalDate).slice(0, 10)} ${c.actualArrivalTime || ''}` : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                                {c.gateOutDate ? `${String(c.gateOutDate).slice(0, 10)} ${c.gateOutTime || ''}` : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                                {c.missingDocs ? (
                                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[10.5px]">
                                    {c.missingDocs}
                                  </span>
                                ) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 3. Container Updates Section if any container has updates */}
                {containers.some((c) => c.updates && c.updates.length > 0) && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-3.5 bg-purple-600 rounded-full"></span>
                      <span>{lang === 'ar' ? 'سجل تحديثات الحاويات (Container Updates)' : 'Container Updates Log'}</span>
                    </h4>
                    <div className="space-y-2">
                      {containers.flatMap((c) =>
                        (c.updates || []).map((u, uIdx) => (
                          <div key={u.id || `${c.id}_${uIdx}`} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono font-bold text-slate-800">{c.containerNumber}</span>
                                <span className="text-[10.5px] text-slate-400">· {fmtUpdateDateTime(u.createdAtUtc)}</span>
                              </div>
                              <p className="text-slate-700 leading-relaxed">{u.details}</p>
                            </div>
                            <span className="text-[10.5px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                              {u.createdByName || 'User'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Lock size={12} className="text-slate-400" />
                  {lang === 'ar' ? 'أرشيف العمليات المحذوفة (Read-Only Archive)' : 'Read-Only Deleted Archive'}
                </span>
                <button
                  type="button"
                  onClick={() => setViewDeletedDetailOp(null)}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition cursor-pointer"
                >
                  {lang === 'ar' ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Datalists for Vehicles and Drivers lookups */}
      <datalist id="vehicles-lookup-datalist">
        {(lookups.vehicles || []).map((v) => (
          <option key={v.id} value={v.carNumber}>
            {v.carNumber}
          </option>
        ))}
      </datalist>

      <datalist id="drivers-lookup-datalist">
        {(lookups.drivers || []).map((d) => (
          <option key={d.id} value={d.name}>
            {d.name} {d.mobileNumber ? `(${d.mobileNumber})` : ''}
          </option>
        ))}
      </datalist>

      {/* Internal Toast Fallback */}
      {internalToast && (
        <div
          onMouseEnter={() => {
            if (internalToastTimeoutRef.current) clearTimeout(internalToastTimeoutRef.current);
          }}
          onMouseLeave={() => {
            if (internalToastTimeoutRef.current) clearTimeout(internalToastTimeoutRef.current);
            internalToastTimeoutRef.current = setTimeout(() => setInternalToast(null), 4000);
          }}
          className={`fixed bottom-6 right-6 z-50 flex items-start gap-3.5 p-4 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all animate-in fade-in slide-in-from-bottom-5 duration-300 max-w-lg ${
            internalToast.type === 'error'
              ? 'bg-rose-950/95 text-rose-100 border-rose-600/70 shadow-rose-950/50 ring-1 ring-rose-500/30'
              : internalToast.type === 'warning'
              ? 'bg-amber-950/95 text-amber-100 border-amber-500/70 shadow-amber-950/50 ring-1 ring-amber-500/30'
              : internalToast.type === 'success'
              ? 'bg-emerald-950/95 text-emerald-100 border-emerald-500/70 shadow-emerald-950/50 ring-1 ring-emerald-500/30'
              : 'bg-slate-900/95 text-slate-100 border-slate-700/80 shadow-slate-950/50 ring-1 ring-slate-600/30'
          }`}
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
        >
          {/* Status Icon */}
          <div className="shrink-0 mt-0.5">
            {internalToast.type === 'error' && (
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300">
                <AlertCircle size={20} />
              </div>
            )}
            {internalToast.type === 'warning' && (
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
                <AlertTriangle size={20} />
              </div>
            )}
            {internalToast.type === 'success' && (
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300">
                <CheckCircle size={20} />
              </div>
            )}
            {internalToast.type === 'info' && (
              <div className="p-2 rounded-xl bg-sky-500/20 text-sky-300">
                <Info size={20} />
              </div>
            )}
          </div>

          {/* Content Body */}
          <div className="flex-1 min-w-0 pr-1">
            {internalToast.title && (
              <div className="text-xs font-bold uppercase tracking-wider mb-1 opacity-90 flex items-center gap-1.5">
                <span>{internalToast.title}</span>
              </div>
            )}
            <div className="text-xs sm:text-sm font-medium leading-relaxed select-text">
              {internalToast.message}
            </div>
          </div>

          {/* Dismiss Button */}
          <button
            type="button"
            onClick={() => setInternalToast(null)}
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
