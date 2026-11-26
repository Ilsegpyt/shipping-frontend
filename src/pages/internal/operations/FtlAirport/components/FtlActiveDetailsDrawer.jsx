import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  History,
  Lock,
  Eye,
  Truck,
  Package,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { fmtUpdateDateTime } from './FtlArchiveShared';

/**
 * Active FTL Operation Slide-Over Details Drawer.
 * All operation, shipment, and truck fields are strictly Read-Only.
 * Only the Latest Update box for a single selected saved truck/trip is editable.
 */
export default function FtlActiveDetailsDrawer({
  op,
  onClose,
  onOpenStatusHistory,
  onAddTripUpdate,
  onTripUpdateAdded,
  isStatusHistoryOpen = false,
  lang = 'en',
  currentUserName = 'User',
}) {
  const [trucks, setTrucks] = useState(() => (Array.isArray(op?.trucks) ? op.trucks : []));
  const [selectedTruckKey, setSelectedTruckKey] = useState(() => op?.initialSelectedTruckKey || null);
  const [updateText, setUpdateText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [scrollFocusTarget, setScrollFocusTarget] = useState(null);
  const inputRef = useRef(null);
  const updatesSectionRef = useRef(null);
  const truckBtnRefs = useRef([]);

  const selectedTruck = selectedTruckKey
    ? trucks.find((t) => t.truckKey === selectedTruckKey) || null
    : null;

  const canWriteUpdate = Boolean(
    selectedTruck &&
      selectedTruck.isSavedTripId &&
      selectedTruck.tripId &&
      !selectedTruck.isUnassigned
  );

  // Auto-scroll and apply clear visual + keyboard focus on the target area:
  // - If truck selection is mandatory (!selectedTruck && trucks.length > 1): scroll to selector, highlight it, and focus first truck option
  // - If truck is ready (single truck, clicked truck, or after choosing): scroll to update box, highlight it, and focus input
  useEffect(() => {
    if (!op) return;
    let clearTimerId = null;
    const scrollAndFocus = () => {
      if (canWriteUpdate) {
        const inp = inputRef.current;
        if (inp && !inp.disabled) {
          inp.scrollIntoView({ behavior: 'smooth', block: 'center' });
          inp.focus({ preventScroll: true });
          setScrollFocusTarget('input');
        }
      } else if (!selectedTruck && trucks.length > 1) {
        const sec = updatesSectionRef.current;
        if (sec) {
          sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        const firstBtn = truckBtnRefs.current[0];
        if (firstBtn) {
          firstBtn.focus({ preventScroll: true });
        }
        setScrollFocusTarget('selector');
      }
      if (clearTimerId) clearTimeout(clearTimerId);
      clearTimerId = setTimeout(() => setScrollFocusTarget(null), 1400);
    };
    const rafId = requestAnimationFrame(() => setTimeout(scrollAndFocus, 20));
    const timerId = setTimeout(scrollAndFocus, 160);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      if (clearTimerId) clearTimeout(clearTimerId);
    };
  }, [op, selectedTruckKey, selectedTruck, trucks.length, canWriteUpdate]);

  // Close drawer on Escape (unless Status History drawer is open on top)
  useEffect(() => {
    if (!op) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape' && !isStatusHistoryOpen) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [op, isStatusHistoryOpen, onClose]);

  const handleSelectTruck = useCallback((truckKey) => {
    setSelectedTruckKey(truckKey);
    setSubmitError('');
  }, []);

  const handleSubmitUpdate = async () => {
    const trimmed = updateText.trim();
    if (!trimmed || !op || !selectedTruck || !canWriteUpdate || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError('');
    try {
      const res = await onAddTripUpdate?.(op.ref, selectedTruck.tripId, trimmed);

      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const dayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const atStr = res?.at || `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const byStr = res?.by || currentUserName;

      const updateObj = {
        id: res?.id || `upd_${now.getTime()}`,
        text: res?.text || trimmed,
        note: res?.text || trimmed,
        day: dayStr,
        at: atStr,
        user: byStr,
        by: byStr,
      };

      setTrucks((prev) =>
        prev.map((t) =>
          t.truckKey === selectedTruck.truckKey
            ? { ...t, updates: [...(t.updates || []), updateObj] }
            : t
        )
      );

      onTripUpdateAdded?.(op.dir, op.ref, selectedTruck.rowIndices || [], updateObj);
      setUpdateText('');

      requestAnimationFrame(() => {
        if (inputRef.current && !inputRef.current.disabled) {
          inputRef.current.focus();
        }
      });
    } catch (err) {
      console.error('[FTL Drawer] Failed to save truck update:', err);
      const errMsg =
        err?.response?.data?.error ||
        err?.message ||
        (lang === 'ar'
          ? 'تعذر حفظ التحديث في قاعدة البيانات. برجاء المحاولة مرة أخرى.'
          : 'Failed to save update to database. Please try again.');
      setSubmitError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!op || typeof document === 'undefined') return null;

  const isImport = op.dir === 'Import';
  const shipments = Array.isArray(op.shipments) ? op.shipments : [];
  const clickedShipmentIdx = op.clickedShipmentIdx ?? null;
  const isLockedToClickedTruck = Boolean(op?.initialSelectedTruckKey);
  const createdDisplay = op.createdAtUtc
    ? fmtUpdateDateTime(op.createdAtUtc)
    : (op.day ? `${op.day} ${op.at || ''}` : '—');

  // Updates displayed newest-first (same as FTL Updates modal)
  const displayedUpdates = selectedTruck
    ? (selectedTruck.updates || [])
        .slice()
        .reverse()
        .map((u) => ({
          ...u,
          _truckLabel:
            selectedTruck.plate ||
            (selectedTruck.trkNo ? `${lang === 'ar' ? 'شاحنة' : 'Truck'} ${selectedTruck.trkNo}` : '—'),
        }))
    : trucks
        .flatMap((t) =>
          (t.updates || []).map((u) => ({
            ...u,
            _truckLabel:
              t.plate ||
              (t.trkNo ? `${lang === 'ar' ? 'شاحنة' : 'Truck'} ${t.trkNo}` : '—'),
          }))
        )
        .reverse();

  return createPortal(
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-[9990] flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl h-full bg-white shadow-2xl flex flex-col border-s border-slate-200 animate-in slide-in-from-right duration-250 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 shadow-2xs">
              <Eye size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-800">
                  {lang === 'ar' ? 'تفاصيل عملية FTL الكاملة' : 'FTL Operation Full Details'}
                </h3>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isImport
                      ? 'bg-sky-50 text-sky-700 border border-sky-200'
                      : 'bg-purple-50 text-purple-700 border border-purple-200'
                  }`}
                >
                  {isImport ? 'Import' : 'Export'}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  <Lock size={10} />
                  {lang === 'ar' ? 'البيانات للقراءة فقط' : 'Read-Only Info'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono font-medium mt-0.5">
                {op.ref}
                {op.mawb ? ` · ${op.mawb}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
            title={lang === 'ar' ? 'إغلاق' : 'Close'}
          >
            <X size={16} />
          </button>
        </div>

        {/* Summary Banner */}
        <div className="px-6 py-3 bg-sky-50/70 border-b border-sky-100 flex items-center justify-between gap-3 text-xs flex-wrap shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
              <span className="text-slate-600">
                {lang === 'ar' ? 'أنشئت بواسطة:' : 'Created By:'}{' '}
                <strong className="text-sky-950">{op.createdByName || '—'}</strong>
              </span>
            </div>
            <div className="text-slate-500 text-[11px]">
              <span>{lang === 'ar' ? 'تاريخ الإنشاء:' : 'Created At:'} </span>
              <strong className="text-slate-700">{createdDisplay}</strong>
            </div>
          </div>
          {onOpenStatusHistory && op.statusHistoryPayload && (
            <button
              type="button"
              onClick={() => onOpenStatusHistory(op.statusHistoryPayload)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 text-xs font-semibold shadow-2xs transition cursor-pointer active:scale-95"
              title={lang === 'ar' ? 'عرض سجل وتاريخ الحالات الزمني' : 'View Status History'}
            >
              <History size={12} className="text-sky-600" />
              <span>{lang === 'ar' ? 'سجل الحالات' : 'Status History'}</span>
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* 1. Operation & Master Info (Read-Only - Stacked per Shipment) */}
          <div>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2.5">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-3.5 bg-sky-600 rounded-full" />
                <span>{lang === 'ar' ? 'بيانات العملية والشحنات' : 'Operation & Master Info'}</span>
              </h4>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200">
                  {shipments.length} {lang === 'ar' ? 'شحنة' : 'shp'} · {trucks.length} {lang === 'ar' ? 'عربية' : 'trk'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 font-bold border border-sky-200">
                  {op.status || 'Open'}
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              {(shipments.length > 0 ? shipments : [{ shpIdx: 0 }]).map((s, idx) => {
                const isFocusedShipment = shipments.length > 1 && clickedShipmentIdx === idx;
                const sClient = s.client || op.client || '—';
                const sLine = s.line || op.line || '—';
                const sPort = (isImport ? (s.aod || op.aod) : (s.pol || op.pol || s.aod || op.aod)) || '—';
                const sClrType = s.clrType || op.clrType || '—';
                const sDest = s.dest || op.dest || '—';
                const sInvRcv = s.invRcv || op.invRcv || '—';
                const sFullAddress = s.fullAddress || (idx === 0 ? op.fullAddress : '');

                return (
                  <div
                    key={s.shpIdx ?? idx}
                    className={`p-3 rounded-2xl border transition-colors space-y-2.5 ${
                      isFocusedShipment
                        ? 'bg-sky-50/60 border-sky-300 ring-1 ring-sky-200 shadow-xs'
                        : 'bg-white border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center ${
                            isFocusedShipment
                              ? 'bg-sky-600 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          {lang === 'ar' ? 'رقم الشحنة:' : 'Shipment #:'}{' '}
                          <span className="font-mono text-slate-950">{s.shipNo || '—'}</span>
                        </span>
                        {(s.mawb || s.hawb) && (
                          <span className="text-[11px] font-mono text-slate-500">
                            {s.mawb ? `· ${s.mawb}` : ''}
                            {s.hawb ? ` · HAWB: ${s.hawb}` : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div className="p-2 rounded-xl bg-slate-50/90 border border-slate-200/60">
                        <span className="text-[10px] text-slate-400 block font-medium">
                          {lang === 'ar' ? 'رقم الشحنة' : 'Shipment #'}
                        </span>
                        <span className="text-xs font-bold text-slate-900 font-mono truncate block" title={s.shipNo}>
                          {s.shipNo || '—'}
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-50/90 border border-slate-200/60">
                        <span className="text-[10px] text-slate-400 block font-medium">
                          {lang === 'ar' ? 'العميل' : 'Client'}
                        </span>
                        <span className="text-xs font-bold text-slate-800 truncate block" title={sClient}>
                          {sClient}
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-50/90 border border-slate-200/60">
                        <span className="text-[10px] text-slate-400 block font-medium">
                          {lang === 'ar' ? 'المحطة الجوية' : 'Air Terminal'}
                        </span>
                        <span className="text-xs font-bold text-slate-800 truncate block" title={sLine}>
                          {sLine}
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-50/90 border border-slate-200/60">
                        <span className="text-[10px] text-slate-400 block font-medium">
                          {lang === 'ar' ? (isImport ? 'مطار الوصول (AOD)' : 'ميناء الشحن (POL)') : (isImport ? 'AOD' : 'POL')}
                        </span>
                        <span className="text-xs font-bold text-slate-800 truncate block">
                          {sPort}
                        </span>
                      </div>

                      {!isImport && (
                        <div className="p-2 rounded-xl bg-slate-50/90 border border-slate-200/60">
                          <span className="text-[10px] text-slate-400 block font-medium">
                            {lang === 'ar' ? 'نوع التخليص' : 'Clearance Type'}
                          </span>
                          <span className="text-xs font-bold text-slate-800 truncate block">
                            {sClrType}
                          </span>
                        </div>
                      )}

                      <div className="p-2 rounded-xl bg-slate-50/90 border border-slate-200/60">
                        <span className="text-[10px] text-slate-400 block font-medium">
                          {lang === 'ar' ? 'الوجهة' : 'Destination'}
                        </span>
                        <span className="text-xs font-bold text-slate-800 truncate block" title={sDest}>
                          {sDest}
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-50/90 border border-slate-200/60">
                        <span className="text-[10px] text-slate-400 block font-medium">
                          {lang === 'ar' ? 'تاريخ استلام الفواتير' : 'Invoices Rcv'}
                        </span>
                        <span className="text-xs font-semibold text-slate-700 block">
                          {sInvRcv}
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-50/90 border border-slate-200/60">
                        <span className="text-[10px] text-slate-400 block font-medium">
                          {lang === 'ar' ? 'الحالة' : 'Status'}
                        </span>
                        <span className="text-xs font-bold text-sky-700 block">
                          {op.status || 'Open'}
                        </span>
                      </div>

                      {sFullAddress && (
                        <div className="p-2 rounded-xl bg-slate-50/90 border border-slate-200/60 col-span-2 md:col-span-4">
                          <span className="text-[10px] text-slate-400 block font-medium">
                            {lang === 'ar' ? 'العنوان التفصيلي' : 'Full Address'}
                          </span>
                          <span className="text-xs font-semibold text-slate-800 break-words">
                            {sFullAddress}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Shipments in Operation (Read-Only) */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Package size={14} className="text-sky-600" />
                <span>
                  {lang === 'ar'
                    ? `الشحنات داخل العملية (${shipments.length})`
                    : `Shipments in Operation (${shipments.length})`}
                </span>
              </h4>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-2xs">
              <table className="w-full text-xs text-start border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-[11px]">
                    <th className="py-2 px-3 text-start">#</th>
                    <th className="py-2 px-3 text-start">{lang === 'ar' ? 'رقم الشحنة' : 'Shipment #'}</th>
                    <th className="py-2 px-3 text-start">MAWB / HAWB</th>
                    <th className="py-2 px-3 text-start">{lang === 'ar' ? 'الشهادة / الجمرك' : 'Cert / Customs'}</th>
                    <th className="py-2 px-3 text-start">{lang === 'ar' ? 'الطرود / الوزن / CBM' : 'Pkgs / Wt / CBM'}</th>
                    <th className="py-2 px-3 text-start">{lang === 'ar' ? 'العربيات الناقلة' : 'Assigned Trucks'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shipments.map((s, idx) => {
                    const carryingTrucks = trucks.filter((t) =>
                      (t.carriedShipments || []).some((cs) => cs.shpIdx === s.shpIdx)
                    );
                    const isFocusedShipment = shipments.length > 1 && clickedShipmentIdx === idx;
                    return (
                      <tr
                        key={s.shpIdx ?? idx}
                        className={isFocusedShipment ? 'bg-sky-50/75' : 'bg-white'}
                      >
                        <td className="py-2 px-3 font-semibold text-slate-500">
                          <div className="flex items-center gap-1.5">
                            {isFocusedShipment && <span className="w-1.5 h-1.5 rounded-full bg-sky-600 shrink-0" />}
                            <span>{idx + 1}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900 font-mono">
                          {s.shipNo || '—'}
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-mono font-semibold text-slate-800">{s.mawb || '—'}</div>
                          {s.hawb && <div className="text-[10.5px] text-slate-500 font-mono">HAWB: {s.hawb}</div>}
                        </td>
                        <td className="py-2 px-3 text-slate-700">
                          {s.cert || s.customs || '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-700 text-[11px]">
                          {[
                            s.packages ? `${s.packages} ${lang === 'ar' ? 'طرد' : 'pkgs'}` : null,
                            s.weight ? `${s.weight} T` : null,
                            s.cbm ? `${s.cbm} CBM` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </td>
                        <td className="py-2 px-3">
                          {carryingTrucks.length === 0 ? (
                            <span className="text-slate-400 text-[10.5px] italic">
                              {shipments.length > 1
                                ? (lang === 'ar' ? 'غير موزعة بعد' : 'Not allocated yet')
                                : '—'}
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {carryingTrucks.map((t) => (
                                <span
                                  key={t.truckKey}
                                  className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[10.5px] font-mono font-semibold"
                                >
                                  {t.plate || `${lang === 'ar' ? 'شاحنة' : 'Truck'} ${t.trkNo}`}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Trucks & Trips (Read-Only, click row to select truck for update) */}
          <div>
            <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Truck size={14} className="text-sky-600" />
                <span>
                  {lang === 'ar'
                    ? `العربيات والنقلات (${trucks.length})`
                    : `Trucks & Trips (${trucks.length})`}
                </span>
              </h4>
              {trucks.length > 1 && !isLockedToClickedTruck && (
                <span className="text-[11px] text-slate-500 font-medium">
                  {lang === 'ar'
                    ? 'اضغط على أي عربية لتحديدها لإضافة تحديث'
                    : 'Click any truck row to select it for update'}
                </span>
              )}
            </div>

            <div className="space-y-2">
              {trucks.map((t, idx) => {
                const isSelected = selectedTruck?.truckKey === t.truckKey;
                const truckLabel =
                  t.plate ||
                  (t.isUnassigned
                    ? (lang === 'ar' ? 'في انتظار تعيين عربية' : 'Unassigned Truck')
                    : `${lang === 'ar' ? 'شاحنة' : 'Truck'} ${t.trkNo || idx + 1}`);
                const canSelectRow = trucks.length > 1 && !isLockedToClickedTruck;

                return (
                  <div
                    key={t.truckKey}
                    onClick={canSelectRow ? () => handleSelectTruck(t.truckKey) : undefined}
                    className={`p-3 rounded-2xl border transition space-y-2 ${canSelectRow ? 'cursor-pointer' : ''} ${
                      isSelected
                        ? 'bg-sky-50/80 border-sky-400 ring-1 ring-sky-300 shadow-xs'
                        : `bg-white border-slate-200 ${canSelectRow ? 'hover:border-sky-300 hover:bg-slate-50/60' : ''}`
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center ${
                            isSelected
                              ? 'bg-[#0f4c81] text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded font-mono">
                          {truckLabel}
                        </span>
                        {t.trucker && (
                          <span className="text-slate-600 font-medium">{t.trucker}</span>
                        )}
                        {!t.isSavedTripId && (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                            {lang === 'ar' ? 'غير محفوظة / غير معينة' : 'Unsaved / Unassigned'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span>
                          {lang === 'ar' ? 'السائق:' : 'Driver:'}{' '}
                          <strong className="text-slate-800">{t.driver || '—'}</strong>
                        </span>
                        {t.mob && <span className="font-mono text-slate-600">({t.mob})</span>}
                        {t.truckType && (
                          <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 font-semibold border border-sky-100">
                            {t.truckType}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Carried shipments pills */}
                    {Array.isArray(t.carriedShipments) && t.carriedShipments.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                        <span className="text-slate-400 font-medium">
                          {lang === 'ar' ? 'الشحنات المحملة:' : 'Carrying:'}
                        </span>
                        {t.carriedShipments.map((cs) => (
                          <span
                            key={cs.shpIdx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-semibold"
                          >
                            <span className="font-mono">{cs.label}</span>
                            {cs.pkgs > 0 && (
                              <span className="text-sky-700">({cs.pkgs} {lang === 'ar' ? 'طرد' : 'pkgs'})</span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Timing & Measures */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[11px] bg-slate-50/90 p-2 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[9px]">
                          {lang === 'ar' ? 'الوصول الفعلي' : 'Actual Arrival'}
                        </span>
                        <span className="font-semibold text-slate-700">
                          {t.arrDate || '—'} {t.arrTime || ''}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">
                          {lang === 'ar' ? 'دخول البوابة' : 'Gate In'}
                        </span>
                        <span className="font-semibold text-slate-700">
                          {t.gateIn || '—'} {t.gateInT || ''}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">
                          {lang === 'ar' ? 'خروج البوابة' : 'Gate Out'}
                        </span>
                        <span className="font-semibold text-slate-700">
                          {t.gateOut || '—'} {t.gateOutT || ''}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">
                          {lang === 'ar' ? 'الطرود' : 'Packages'}
                        </span>
                        <span className="font-semibold text-slate-700">{t.loadedPackages || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">
                          {lang === 'ar' ? 'الوزن (طن)' : 'Weight (T)'}
                        </span>
                        <span className="font-semibold text-slate-700">{t.loadedWeight || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">CBM</span>
                        <span className="font-semibold text-slate-700">{t.loadedCbm || '—'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Editable Latest Update + Truck Updates Log */}
          <div
            ref={updatesSectionRef}
            className={`rounded-2xl border bg-gradient-to-b from-sky-50/50 to-white p-4 space-y-3.5 transition-all duration-300 ${
              scrollFocusTarget === 'input'
                ? 'border-sky-400 ring-4 ring-sky-200/80 shadow-md'
                : scrollFocusTarget === 'selector'
                  ? 'border-amber-400 ring-4 ring-amber-200/80 shadow-md'
                  : 'border-sky-200 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-3.5 bg-cyan-600 rounded-full" />
                <span>
                  {lang === 'ar'
                    ? 'أحدث التحديثات (Latest Update - قابل للتعديل)'
                    : 'Latest Update (Editable)'}
                </span>
              </h4>
              {selectedTruck && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-900 border border-sky-200 text-[11px] font-bold font-mono">
                  {selectedTruck.plate || `${lang === 'ar' ? 'شاحنة' : 'Truck'} ${selectedTruck.trkNo || ''}`}
                </span>
              )}
            </div>

            {/* Single-Truck Selector Pills ONLY when opened from operation/shipment cell with multiple trucks */}
            {trucks.length > 1 && !isLockedToClickedTruck && (
              <div
                className={`space-y-2 rounded-xl transition-all duration-300 ${
                  !selectedTruck
                    ? `p-3 border ${
                        scrollFocusTarget === 'selector'
                          ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-300'
                          : 'bg-amber-50/50 border-amber-200'
                      }`
                    : ''
                }`}
              >
                <div className="text-[11px] font-bold text-slate-700">
                  {selectedTruck
                    ? (lang === 'ar' ? 'العربية المحددة للتحديث:' : 'Selected truck for update:')
                    : (lang === 'ar' ? 'اختر عربية واحدة أولاً لكتابة التحديث:' : 'Select one truck first to write an update:')}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {trucks.map((t, idx) => {
                    const isSelected = selectedTruck?.truckKey === t.truckKey;
                    const label =
                      t.plate ||
                      (t.isUnassigned
                        ? (lang === 'ar' ? `عربية ${idx + 1} (غير معينة)` : `Truck ${idx + 1} (Unassigned)`)
                        : `${lang === 'ar' ? 'شاحنة' : 'Truck'} ${t.trkNo || idx + 1}`);
                    return (
                      <button
                        key={t.truckKey}
                        ref={(el) => {
                          truckBtnRefs.current[idx] = el;
                        }}
                        type="button"
                        onClick={() => handleSelectTruck(t.truckKey)}
                        onKeyDown={(e) => {
                          const isRtl = lang === 'ar';
                          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                            e.preventDefault();
                            const step = (e.key === 'ArrowRight') ? (isRtl ? -1 : 1) : (isRtl ? 1 : -1);
                            const nextIdx = (idx + step + trucks.length) % trucks.length;
                            truckBtnRefs.current[nextIdx]?.focus();
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1 ${
                          isSelected
                            ? 'bg-[#0f4c81] text-white border-[#0f4c81] shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-sky-400 hover:bg-sky-50'
                        }`}
                      >
                        <span className="font-mono">{label}</span>
                        {t.driver && (
                          <span className={`text-[10px] font-medium ${isSelected ? 'text-sky-100' : 'text-slate-400'}`}>
                            · {t.driver}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Warning prompt if multi-truck operation opened from operation/shipment cell */}
            {!selectedTruck && trucks.length > 1 && (
              <div className="px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                <span>
                  {lang === 'ar'
                    ? 'هذه العملية تحتوي على أكثر من عربية — اختر العربية المطلوبة أعلاه لتفعيل خانة كتابة التحديث.'
                    : 'This operation has multiple trucks — please select the target truck above to enable the update input.'}
                </span>
              </div>
            )}

            {/* Warning if selected truck is Unassigned / not yet saved in DB */}
            {selectedTruck && !canWriteUpdate && (
              <div className="px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                <span>
                  {lang === 'ar'
                    ? 'يجب تعيين العربية وحفظ العملية في قاعدة البيانات أولاً قبل إضافة تحديث لهذه النقلة.'
                    : 'Please assign a truck and save the operation to the database first before adding updates to this trip.'}
                </span>
              </div>
            )}

            {/* Error Banner if API failed */}
            {submitError && (
              <div className="px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Add Update Input Form */}
            <div>
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  disabled={!canWriteUpdate || isSubmitting}
                  placeholder={
                    !selectedTruck
                      ? (lang === 'ar' ? 'اختر العربية أولاً لإضافة التحديث...' : 'Select a truck first...')
                      : !canWriteUpdate
                        ? (lang === 'ar' ? 'العربية غير معينة أو غير محفوظة بعد...' : 'Truck unassigned or unsaved...')
                        : (lang === 'ar' ? 'اكتب التحديث واضغط Enter...' : 'Type the update and press Enter...')
                  }
                  value={updateText}
                  onChange={(e) => setUpdateText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSubmitUpdate();
                    }
                  }}
                  className={`flex-1 rounded-xl border bg-white px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-200/80 placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all ${
                    scrollFocusTarget === 'input' ? 'border-sky-500 ring-4 ring-sky-200/80' : 'border-slate-300'
                  }`}
                />
                <button
                  type="button"
                  disabled={!canWriteUpdate || isSubmitting || !updateText.trim()}
                  onClick={handleSubmitUpdate}
                  className="px-5 py-2.5 rounded-xl bg-[#0f4c81] hover:bg-[#0c3c66] text-white text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center gap-1 shadow-sm cursor-pointer"
                >
                  {isSubmitting ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    '+ Add update'
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
                {lang === 'ar' ? 'سيتم التسجيل باسم ' : 'Will be recorded as '}
                <span className="font-semibold text-slate-600">{currentUserName}</span>
              </p>
            </div>

            {/* Truck Updates Log (Latest First) */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  {lang === 'ar' ? 'سجل تحديثات العربيات (Updates Log)' : 'Truck Updates Log'}
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  {displayedUpdates.length}
                </span>
              </div>

              {displayedUpdates.length === 0 ? (
                <div className="py-6 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-400 italic font-medium">
                  {lang === 'ar' ? 'لا توجد تحديثات حتى الآن' : 'No updates yet'}
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                  {displayedUpdates.map((u, uIdx) => {
                    const itemNumber = displayedUpdates.length - uIdx;
                    const isLatest = uIdx === 0;
                    return (
                      <div
                        key={u.id || `${u._truckLabel}_${uIdx}`}
                        className="flex items-start justify-between gap-3 p-3 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 transition shadow-2xs"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-[#0f4c81] text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                            {itemNumber}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <span className="font-mono font-bold text-xs text-slate-800">{u._truckLabel}</span>
                              <span className="text-[10.5px] text-slate-400">
                                · {u.day || ''} {u.at || ''}
                              </span>
                              <span className="text-[10.5px] font-semibold text-slate-600">
                                · {u.user || u.by || currentUserName}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-800 leading-relaxed break-words">
                              {u.text || u.note}
                            </p>
                          </div>
                        </div>

                        {isLatest && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10.5px] font-semibold border border-emerald-200/70 shrink-0">
                            latest
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Lock size={12} className="text-slate-400" />
            {lang === 'ar'
              ? 'عرض تفاصيل العملية (التحديثات فقط متاحة)'
              : 'Operation Details (Updates Only Editable)'}
          </span>
          <div className="flex items-center gap-2">
            {onOpenStatusHistory && op.statusHistoryPayload && (
              <button
                type="button"
                onClick={() => onOpenStatusHistory(op.statusHistoryPayload)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 shadow-2xs transition cursor-pointer flex items-center gap-1.5"
              >
                <History size={12} className="text-sky-700" />
                <span>{lang === 'ar' ? 'سجل وتاريخ الحالات' : 'Status History'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition cursor-pointer"
            >
              {lang === 'ar' ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
