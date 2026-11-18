import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  History,
  CheckCircle2,
  Trash2,
  Truck,
  RotateCcw,
  Calendar,
  Clock,
  User,
  MapPin,
  FileText,
  ShieldAlert,
  Info,
  ChevronRight,
  Eye,
  Plus,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { getFtlStatusAudits } from '../../../../../services/operationsService';

export const parseUtcDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

export const fmtUpdateDateTime = (dateStr) => {
  if (!dateStr) return '—';
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

/**
 * Status History Slide-over Drawer for FTL Operation (Identical to FCL 1:1)
 */
export function FtlStatusHistoryModal({ op, onClose, lang = 'en' }) {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper to format date matching FCL: "18-NOV-2026 · 05:28"
  const fmtStatusDateTime = (val) => {
    if (!val) return '';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val);
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const day = String(d.getDate()).padStart(2, '0');
      const mmm = months[d.getMonth()];
      const yyyy = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${day}-${mmm}-${yyyy} · ${hh}:${mm}`;
    } catch {
      return String(val);
    }
  };

  useEffect(() => {
    if (!op) {
      setTimeline([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const firstTripFields = op.trips?.[0]?.fields || op.fields || {};
    const isInactive =
      Boolean(op.isDeleted) ||
      op.status === 'Inactive' ||
      op.status === 'Deleted' ||
      Boolean(op.deletedAtUtc);

    const isDelivered = !isInactive && (op.status === 'Delivered' || Boolean(op.deliveredAtUtc));

    // Resolve user name and clean up GUIDs matching FCL logic
    const resolveUserName = (rawVal, defaultFallback = '') => {
      if (!rawVal) return defaultFallback || (lang === 'ar' ? 'فريق العمليات' : 'Operations Team');
      const str = String(rawVal).trim();
      const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      if (!isGuid) return str;

      if (defaultFallback && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(defaultFallback).trim())) {
        return defaultFallback;
      }

      if (op.deliveredByName && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(op.deliveredByName)) {
        return op.deliveredByName;
      }

      if (op.deletedByName && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(op.deletedByName)) {
        return op.deletedByName;
      }

      if (op.createdByName && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(op.createdByName)) {
        return op.createdByName;
      }

      if (op.enteredBy?.displayName && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(op.enteredBy.displayName)) {
        return op.enteredBy.displayName;
      }

      return defaultFallback || (lang === 'ar' ? 'فريق العمليات' : 'Operations Team');
    };

    // 1. Build initial core lifecycle events (Matching FCL 1:1)
    const baseEvents = [];

    // Deleted / Inactive event
    if (isInactive || op.deletedAtUtc || op.deletedByName) {
      baseEvents.push({
        id: 'event_deleted',
        type: 'Deleted',
        status: 'Inactive',
        title: lang === 'ar' ? 'تم نقل العملية إلى المحذوفات (Deleted)' : 'Operation Moved to Inactive Archive',
        userName: resolveUserName(op.deletedByName, op.createdByName),
        timestamp: op.deletedAtUtc || op.createdAtUtc || new Date().toISOString(),
        sortTime: new Date(op.deletedAtUtc || op.createdAtUtc || 0).getTime(),
        color: 'rose',
      });
    }

    // Delivered event
    if (op.deliveredAtUtc || op.deliveredByName || isDelivered) {
      baseEvents.push({
        id: 'event_delivered',
        type: 'Delivered',
        status: 'Delivered',
        title: lang === 'ar' ? 'تم التسليم (Delivered)' : 'Marked as Delivered',
        userName: resolveUserName(op.deliveredByName, op.createdByName),
        timestamp: op.deliveredAtUtc || new Date().toISOString(),
        sortTime: new Date(op.deliveredAtUtc || 0).getTime(),
        color: 'emerald',
      });
    }

    // Reopened event
    if (op.reopenedAtUtc || op.reopenedByName || op.reopenReason) {
      baseEvents.push({
        id: 'event_reopened',
        type: 'Reopened',
        status: 'Open',
        title: lang === 'ar' ? 'إعادة فتح العملية (Reopened to Open)' : 'Reopened to Open',
        userName: resolveUserName(op.reopenedByName, op.createdByName),
        timestamp: op.reopenedAtUtc,
        sortTime: new Date(op.reopenedAtUtc || 0).getTime(),
        reason: op.reopenReason,
        color: 'amber',
      });
    }

    // Created event (Always present for every operation)
    const createdTimestamp =
      op.createdAtUtc ||
      (op.day && op.at ? `${op.day}T${op.at}` : op.day) ||
      (firstTripFields.day && firstTripFields.at ? `${firstTripFields.day}T${firstTripFields.at}` : null) ||
      op.deletedAtUtc ||
      op.deliveredAtUtc;

    const createdUser = resolveUserName(
      op.createdByName || op.enteredBy?.displayName || op.enteredBy?.id || op.user,
      lang === 'ar' ? 'فريق العمليات' : 'Operations Team'
    );

    baseEvents.push({
      id: 'event_created',
      type: 'Created',
      status: 'Open',
      title: lang === 'ar' ? 'إنشاء العملية (Created)' : 'Operation Created',
      userName: createdUser,
      timestamp: createdTimestamp,
      sortTime: new Date(createdTimestamp || 0).getTime(),
      color: 'sky',
    });

    // 2. Fetch audits from backend and merge with base events
    const refOrId = op.ref || op.id;
    if (refOrId && !String(refOrId).startsWith('draft_')) {
      getFtlStatusAudits(refOrId)
        .then((serverAudits) => {
          if (Array.isArray(serverAudits) && serverAudits.length > 0) {
            const mappedAudits = serverAudits.map((a, idx) => {
              const isDeliv = a.afterStatus === 'Delivered';
              const isReopen = a.afterStatus === 'Open' && a.beforeStatus === 'Delivered';
              const type = isDeliv ? 'Delivered' : isReopen ? 'Reopened' : 'StatusChange';

              let title = '';
              if (isDeliv) {
                title = lang === 'ar' ? 'تم التسليم (Delivered)' : 'Marked as Delivered';
              } else if (isReopen) {
                title = lang === 'ar' ? 'إعادة فتح العملية (Reopened to Open)' : 'Reopened to Open';
              } else {
                title = lang === 'ar' ? `تغيير الحالة إلى ${a.afterStatus}` : `Status changed to ${a.afterStatus}`;
              }

              return {
                id: a.id || `audit_${idx}`,
                type,
                status: a.afterStatus,
                beforeStatus: a.beforeStatus,
                title,
                userName: resolveUserName(a.userName || a.userId, isDeliv ? op.deliveredByName : createdUser),
                timestamp: a.atUtc,
                sortTime: new Date(a.atUtc || 0).getTime(),
                reason: a.reason || (isReopen ? op.reopenReason : null),
                color: isDeliv ? 'emerald' : isReopen ? 'amber' : 'sky',
              };
            });

            // Ensure "Created" event is present
            if (!mappedAudits.some((e) => e.type === 'Created')) {
              const cr = baseEvents.find((e) => e.type === 'Created');
              if (cr) mappedAudits.push(cr);
            }

            // Ensure "Deleted" event is present if inactive
            if (isInactive && !mappedAudits.some((e) => e.type === 'Deleted')) {
              const del = baseEvents.find((e) => e.type === 'Deleted');
              if (del) mappedAudits.push(del);
            }

            // Ensure "Delivered" event is present if marked delivered
            if (isDelivered && !mappedAudits.some((e) => e.type === 'Delivered')) {
              const deliv = baseEvents.find((e) => e.type === 'Delivered');
              if (deliv) mappedAudits.push(deliv);
            }

            mappedAudits.sort((a, b) => (b.sortTime || 0) - (a.sortTime || 0));
            setTimeline(mappedAudits);
          } else {
            baseEvents.sort((a, b) => (b.sortTime || 0) - (a.sortTime || 0));
            setTimeline(baseEvents);
          }
        })
        .catch((err) => {
          console.warn('Could not fetch backend FTL status audits, using lifecycle events:', err);
          baseEvents.sort((a, b) => (b.sortTime || 0) - (a.sortTime || 0));
          setTimeline(baseEvents);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      baseEvents.sort((a, b) => (b.sortTime || 0) - (a.sortTime || 0));
      setTimeline(baseEvents);
      setLoading(false);
    }
  }, [op, lang]);

  if (!op || typeof document === 'undefined') return null;

  const firstTripFields = op.trips?.[0]?.fields || op.fields || {};
  const shipRef =
    op.shipNo ||
    firstTripFields.shipNo ||
    op.ref ||
    op.shipmentNumber ||
    '—';

  const clientName =
    op.client ||
    op.clientName ||
    firstTripFields.client ||
    '';

  const isInactive =
    Boolean(op.isDeleted) ||
    op.status === 'Inactive' ||
    op.status === 'Deleted' ||
    Boolean(op.deletedAtUtc);

  const isDelivered = !isInactive && (op.status === 'Delivered' || Boolean(op.deliveredAtUtc));

  const currentStatusCode = isInactive ? 'Inactive' : isDelivered ? 'Delivered' : 'Open';

  const currentStatusText = isInactive
    ? (lang === 'ar' ? 'غير نشطة' : 'Inactive')
    : isDelivered
    ? (lang === 'ar' ? 'تم التسليم' : 'Delivered')
    : (lang === 'ar' ? 'مفتوحة' : 'Open');

  return createPortal(
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-[9999] flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col border-s border-slate-200 animate-in slide-in-from-right duration-250 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-sky-50/30 shrink-0">
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
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Operation Info Card */}
        <div className="px-6 py-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex flex-col">
            <span className="text-[10.5px] text-slate-400 font-medium">
              {lang === 'ar' ? 'الشحنة / العملية' : 'Shipment / Operation'}
            </span>
            <span className="font-bold text-slate-800 tracking-wide text-xs">
              {shipRef}
            </span>
          </div>

          {clientName && (
            <div className="flex flex-col text-right">
              <span className="text-[10.5px] text-slate-400 font-medium">
                {lang === 'ar' ? 'العميل' : 'Client'}
              </span>
              <span className="font-bold text-slate-700 text-xs truncate max-w-[150px]">
                {clientName}
              </span>
            </div>
          )}

          <div className="flex flex-col items-end">
            <span className="text-[10.5px] text-slate-400 font-medium mb-0.5">
              {lang === 'ar' ? 'الحالة الحالية' : 'Current'}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                currentStatusCode === 'Delivered'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : currentStatusCode === 'Inactive'
                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                  : 'bg-sky-50 text-sky-800 border-sky-300'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  currentStatusCode === 'Delivered'
                    ? 'bg-emerald-500'
                    : currentStatusCode === 'Inactive'
                    ? 'bg-rose-500'
                    : 'bg-sky-500'
                }`}
              />
              {currentStatusText}
            </span>
          </div>
        </div>

        {/* Drawer Body / Timeline */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw size={24} className="animate-spin text-sky-600" />
              <span className="text-xs font-medium">
                {lang === 'ar' ? 'جاري تحميل سجل الحالة...' : 'Loading status history...'}
              </span>
            </div>
          ) : timeline.length === 0 ? (
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
              />

              <div className="space-y-6">
                {timeline.map((item, idx) => {
                  const itemIsDelivered = item.type === 'Delivered' || item.status === 'Delivered';
                  const itemIsReopened = item.type === 'Reopened' || item.reason;
                  const itemIsCreated = item.type === 'Created';
                  const itemIsDeleted = item.type === 'Deleted' || item.status === 'Inactive' || item.status === 'Deleted';

                  return (
                    <div
                      key={item.id || idx}
                      className="relative flex items-start gap-4 animate-in fade-in duration-200"
                    >
                      {/* Timeline Node Badge */}
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 z-10 shadow-xs border-2 transition ${
                          itemIsDelivered
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-600'
                            : itemIsReopened
                            ? 'bg-amber-50 border-amber-500 text-amber-600'
                            : itemIsDeleted
                            ? 'bg-rose-50 border-rose-500 text-rose-600'
                            : 'bg-sky-50 border-sky-500 text-sky-600'
                        }`}
                      >
                        {itemIsDelivered && <CheckCircle2 size={18} />}
                        {itemIsReopened && <RotateCcw size={18} />}
                        {itemIsDeleted && <Trash2 size={18} />}
                        {itemIsCreated && <Plus size={18} />}
                        {!itemIsDelivered && !itemIsReopened && !itemIsDeleted && !itemIsCreated && <Clock size={18} />}
                      </div>

                      {/* Event Card */}
                      <div className="flex-1 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs transition">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span
                            className={`text-xs font-bold ${
                              itemIsDelivered
                                ? 'text-emerald-800'
                                : itemIsReopened
                                ? 'text-amber-800'
                                : itemIsDeleted
                                ? 'text-rose-800'
                                : 'text-sky-800'
                            }`}
                          >
                            {item.title}
                          </span>
                          <span className="text-[10.5px] text-slate-400 font-medium shrink-0">
                            {fmtStatusDateTime(item.timestamp) || (lang === 'ar' ? 'غير محدد' : 'Unknown')}
                          </span>
                        </div>

                        {/* User who performed the action */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                          <span className="text-slate-400 text-[11px]">
                            {lang === 'ar' ? 'بواسطة:' : 'By:'}
                          </span>
                          <span className="font-semibold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200/60 shadow-2xs">
                            {item.userName}
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
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Lock size={12} className="text-slate-400" />
            {lang === 'ar' ? 'سجل غير قابل للتعديل (Audit Log)' : 'Immutable Audit Log'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition cursor-pointer"
          >
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Confirm Delete Operation Modal (Identical to FCL)
 */
export function FtlConfirmDeleteModal({
  target,
  isOpen,
  onClose,
  onConfirm,
  isDeleting = false,
  error = null,
  lang = 'en',
  currentUserName = 'User',
}) {
  if (!isOpen || !target || typeof document === 'undefined') return null;

  return createPortal(
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-[9990] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
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
                {target.shipNo || target.mawb || target.ref}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer text-base"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 bg-rose-50/80 border border-rose-200/70 rounded-2xl text-xs text-rose-900 leading-relaxed space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-rose-950">
              <ShieldAlert size={15} className="text-rose-600 shrink-0" />
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
              <span className="text-slate-500 font-medium">{lang === 'ar' ? 'العملية / الشحنة:' : 'Shipment / Operation:'}</span>
              <span className="font-bold text-slate-800">{target.shipNo || target.ref}</span>
            </div>
            {target.client && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">{lang === 'ar' ? 'العميل:' : 'Client:'}</span>
                <span className="font-semibold text-slate-700 truncate max-w-[200px]">{target.client}</span>
              </div>
            )}
            {target.transporter && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">{lang === 'ar' ? 'شركة النقل:' : 'Transporter:'}</span>
                <span className="font-semibold text-slate-700 truncate max-w-[200px]">{target.transporter}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">{lang === 'ar' ? 'عدد العربيات / النقلات:' : 'Trucks & Trips:'}</span>
              <span className="font-bold text-rose-600">{target.trucksCount || 1} {lang === 'ar' ? 'سيارة' : 'trucks'}</span>
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-xl border border-rose-200">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer disabled:opacity-50"
          >
            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            {isDeleting ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 size={13} />
            )}
            <span>{lang === 'ar' ? 'حذف العملية' : 'Delete Operation'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Reopen / Restore Confirmation Modal
 */
export function FtlReopenModal({ op, isOpen, onConfirm, onClose, lang = 'en', mode = 'delivered' }) {
  const [reason, setReason] = useState('Reopened for modifications');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (op) {
      setReason(mode === 'inactive' ? 'Restored operation' : 'Reopened for modifications');
    }
  }, [op, mode]);

  if (!isOpen || !op || typeof document === 'undefined') return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!op?.ref) return;
    setSubmitting(true);
    try {
      await onConfirm(op.ref, reason);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const isInactive = mode === 'inactive';
  const opRef = op?.ref || '';

  return createPortal(
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-2xs">
            <RotateCcw size={22} />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              {lang === 'ar'
                ? (isInactive ? 'استعادة العملية المحذوفة' : 'إعادة فتح العملية المسلّمة')
                : (isInactive ? 'Restore Inactive Operation' : 'Reopen Delivered Operation')}
            </h3>
            <p className="text-xs text-slate-500">
              {lang === 'ar'
                ? (isInactive
                  ? `سيتم استعادة العملية "${opRef}" وإرجاعها إلى الشحنات النشطة.`
                  : `سيتم إلغاء حالة التسليم وإرجاع العملية "${opRef}" إلى الشحنات النشطة المفتوحة.`)
                : (isInactive
                  ? `Shipment "${opRef}" will be restored back to Active shipments.`
                  : `Shipment "${opRef}" will be moved back to Active Open shipments.`)}
            </p>
          </div>

          <div className="space-y-1.5 text-start">
            <label className="text-xs font-bold text-slate-700">
              {lang === 'ar'
                ? (isInactive ? 'سبب الاستعادة (مطلوب للتدقيق):' : 'سبب إعادة الفتح (مطلوب للتدقيق):')
                : (isInactive ? 'Restore Reason (Required for Audit):' : 'Reopen Reason (Required for Audit):')}
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              placeholder={
                lang === 'ar'
                  ? (isInactive ? 'اكتب سبب الاستعادة بالتفصيل...' : 'اكتب سبب إعادة الفتح بالتفصيل...')
                  : (isInactive ? 'Reason for restoring...' : 'Reason for reopening...')
              }
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {submitting
                ? (lang === 'ar' ? (isInactive ? 'جارٍ الاستعادة...' : 'جارٍ الإرجاع...') : (isInactive ? 'Restoring...' : 'Reopening...'))
                : (lang === 'ar' ? (isInactive ? 'تأكيد الاستعادة' : 'تأكيد إعادة الفتح') : (isInactive ? 'Confirm Restore' : 'Confirm Reopen'))}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

/**
 * Slide-over Full Details Drawer for FTL Operations (Read-Only)
 */
export function FtlFullDetailsDrawer({ op, onClose, isDelivered = true, lang = 'en', onOpenHistory }) {
  if (!op) return null;

  // Extract primary fields
  const trips = op.trips || [];
  const firstTrip = trips[0] || {};
  const fields = firstTrip.fields || {};

  const shipNo = fields.shipNo || op.shipNo || op.ref;
  const mawb = fields.mawb || fields.bl || fields.booking || '—';
  const hawb = fields.hawb || '—';
  const cert = fields.cert || '—';
  const client = fields.client || '—';
  const terminal = fields.line || '—';
  const dest = fields.dest || '—';
  const aod = fields.aod || '—';
  const clrType = fields.clrType || '—';

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-[9990] overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-slate-50 h-full shadow-2xl flex flex-col border-s border-slate-200 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${isDelivered ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}
            >
              {isDelivered ? <CheckCircle2 size={20} /> : <Trash2 size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  {isDelivered
                    ? (lang === 'ar' ? 'التفاصيل الكاملة للعملية المسلّمة' : 'Delivered Operation Full Details')
                    : (lang === 'ar' ? 'التفاصيل الكاملة للعملية غير النشطة' : 'Inactive Operation Full Details')}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${isDelivered ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                >
                  {isDelivered ? (lang === 'ar' ? 'مسلّمة' : 'Delivered') : (lang === 'ar' ? 'غير نشطة' : 'Inactive')}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                  {lang === 'ar' ? 'للقراءة فقط (محمي)' : 'Read-Only (Protected)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {op.ref} · {shipNo}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Audit Banner */}
        <div
          className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${isDelivered
              ? 'bg-emerald-50/80 border-emerald-100 text-emerald-950'
              : 'bg-rose-50/80 border-rose-100 text-rose-950'
            }`}
        >
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-slate-500">
                {isDelivered
                  ? (lang === 'ar' ? 'تم التسليم بواسطة:' : 'Delivered By:')
                  : (lang === 'ar' ? 'تم الإيقاف بواسطة:' : 'Inactive By:')}{' '}
              </span>
              <strong className={isDelivered ? 'text-emerald-900 font-bold' : 'text-rose-900 font-bold'}>
                {isDelivered
                  ? (op.deliveredByName || (lang === 'ar' ? 'مستخدم' : 'User'))
                  : (op.deletedByName || (lang === 'ar' ? 'مستخدم' : 'User'))}
              </strong>
            </div>
            <div>
              <span className="text-slate-500">
                {isDelivered
                  ? (lang === 'ar' ? 'تاريخ وساعة التسليم:' : 'Delivered At:')
                  : (lang === 'ar' ? 'تاريخ وساعة الإيقاف:' : 'Inactive At:')}{' '}
              </span>
              <strong className="text-slate-800 font-bold">
                {fmtUpdateDateTime(isDelivered ? op.deliveredAtUtc : op.deletedAtUtc)}
              </strong>
            </div>
          </div>

          {onOpenHistory && (
            <button
              type="button"
              onClick={() => onOpenHistory(op)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition cursor-pointer"
            >
              <History size={12} className="text-sky-600" />
              <span>{lang === 'ar' ? 'سجل الحالات' : 'Status History'}</span>
            </button>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Section 1: Operation & Shipment Overview Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FileText size={14} className="text-slate-500" />
              <span>{lang === 'ar' ? 'بيانات العملية ومستندات الشحن' : 'Operation & Shipment Documentation'}</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px]">{lang === 'ar' ? 'نوع العملية' : 'Direction'}</span>
                <span className="font-bold text-slate-800">{op.direction || 'Import'}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px]">{lang === 'ar' ? 'العميل' : 'Client'}</span>
                <span className="font-bold text-slate-800">{client}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px]">{lang === 'ar' ? 'نوع التخليص' : 'Clearance'}</span>
                <span className="font-bold text-slate-800">{clrType}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px]">MAWB / BL</span>
                <span className="font-bold text-slate-800 font-mono">{mawb}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px]">HAWB</span>
                <span className="font-bold text-slate-800 font-mono">{hawb}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px]">{lang === 'ar' ? 'الشهادة الجمركية' : 'Customs Cert'}</span>
                <span className="font-bold text-slate-800">{cert}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Route & Stations */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <MapPin size={14} className="text-slate-500" />
              <span>{lang === 'ar' ? 'المسار والمحطات والمواقع' : 'Routing & Station Terminals'}</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px]">{lang === 'ar' ? 'محطة الوصول / المطار' : 'Terminal / AOD'}</span>
                <span className="font-bold text-slate-800">{aod || terminal}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px]">{lang === 'ar' ? 'موقع التسليم / التعتيق' : 'Destination'}</span>
                <span className="font-bold text-slate-800">{dest}</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[10px]">{lang === 'ar' ? 'تاريخ الإنشاء' : 'Created Date'}</span>
                <span className="font-bold text-slate-800">{op.day || '—'} · {op.at || '—'}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Detailed Trucks & Trips Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Truck size={14} className="text-slate-500" />
                <span>{lang === 'ar' ? 'تفاصيل السيارات والنقلات وسجل التحديثات' : 'Trucks & Trips Details'}</span>
              </h4>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                {trips.length} {lang === 'ar' ? 'سيارة / نقلة' : 'trips'}
              </span>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
              {trips.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  {lang === 'ar' ? 'لا توجد سيارات مسجلة' : 'No trips registered'}
                </div>
              ) : (
                trips.map((tr, tIdx) => {
                  const tF = tr.fields || {};
                  const updates = tr.updates || [];
                  return (
                    <div key={tr.id || tIdx} className="p-3 bg-white hover:bg-slate-50/70 transition space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                            {tIdx + 1}
                          </span>
                          <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded font-mono">
                            {tF.car || tF.cntr || '—'}
                          </span>
                          <span className="text-slate-600 font-medium">
                            {tF.trucker || '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span>{lang === 'ar' ? 'السائق:' : 'Driver:'} <strong className="text-slate-800">{tF.driver || '—'}</strong></span>
                          {tF.mob && <span className="font-mono text-slate-600">({tF.mob})</span>}
                          <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 font-semibold">{tF.truckType || 'Full'}</span>
                        </div>
                      </div>

                      {/* Measures row */}
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[11px] bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                        <div>
                          <span className="text-slate-400 block text-[9px]">{lang === 'ar' ? 'وصول الميناء' : 'Arrival Date'}</span>
                          <span className="font-semibold text-slate-700">{tF.arrDate || '—'} {tF.arrTime || ''}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px]">{lang === 'ar' ? 'دخول البوابة' : 'Gate In'}</span>
                          <span className="font-semibold text-slate-700">{tF.gateIn || '—'} {tF.gateInT || ''}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px]">{lang === 'ar' ? 'خروج البوابة' : 'Gate Out'}</span>
                          <span className="font-semibold text-slate-700">{tF.gateOut || '—'} {tF.gateOutT || ''}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px]">{lang === 'ar' ? 'الطرود' : 'Packages'}</span>
                          <span className="font-semibold text-slate-700">{tF.loadedPackages || tF.packages || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px]">{lang === 'ar' ? 'الوزن (طن)' : 'Weight (T)'}</span>
                          <span className="font-semibold text-slate-700">{tF.loadedWeight || tF.weight || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px]">CBM</span>
                          <span className="font-semibold text-slate-700">{tF.loadedCbm || tF.cbm || '—'}</span>
                        </div>
                      </div>

                      {/* Updates Timeline for this trip */}
                      {updates.length > 0 && (
                        <div className="pt-1 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            {lang === 'ar' ? 'سجل ملاحظات التتبع والتعتيق:' : 'Updates & Tracking Notes:'}
                          </span>
                          <div className="space-y-1">
                            {updates.map((u, uIdx) => (
                              <div key={u.id || uIdx} className="text-[11px] bg-slate-100/70 p-1.5 rounded-lg flex items-center justify-between text-slate-700">
                                <span>{u.text || u.note}</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {u.day} {u.at} · {u.user || u.by || 'Ops'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldAlert size={14} className="text-slate-400" />
            <span>{lang === 'ar' ? 'سجل الأرشيف موثق ومحمي ضد التعديل العرضي.' : 'Archive records are immutable and audit-protected.'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
