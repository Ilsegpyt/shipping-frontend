import { useEffect, useRef, useState } from "react";
import { Check, Copy, Eye, FileSpreadsheet, History, Lock, Mail, Plus, RefreshCw, X } from "lucide-react";
import { useAuth } from "../../../../auth/AuthContext";
import { CUSTOMS_PERMISSIONS, hasPermission } from "../../../../services/customsClearanceService";
import C from "../lib/core.js";
import { TYPE_BADGE, cairoStamp, containerInfo, docNumber } from "../lib/drawerHelpers.js";
import { alertBadge, alertTone } from "../lib/alertText.js";
import { copyText } from "../lib/exporters.js";
import { useApp } from "../AppState.jsx";
import { rowsClipboardText } from "./actions.jsx";
import { ExcelExportDialog } from "./dialogs/ExportDialog.jsx";
import MailDialog from "./dialogs/MailDialog.jsx";
import { CopyFallbackDialog } from "./dialogs/TableDialogs.jsx";

// Shown in their own sections (containers / pieces, updates log), not as info cards.
const NOT_CARDS = new Set(["numberOfContainers", "containerType", "numberOfPieces", "latestUpdate"]);

const ACTION_BTN =
  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold shadow-2xs transition cursor-pointer active:scale-95";

/** Loads a shipment's updates log as drawer state. */
const fetchLogs = (getUpdates, id) =>
  getUpdates(id).then((res) => (res.ok ? { items: res.value || [], loading: false, error: "" } : { items: [], loading: false, error: res.error }));

const createdBy = (r, t) => r.createdByName || t("Operations", "فريق العمليات");

function SectionTitle({ children, badge, bar = "bg-sky-600" }) {
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
        <span className={`w-1.5 h-3.5 rounded-full ${bar}`} />
        <span>{children}</span>
      </h4>
      {badge}
    </div>
  );
}

function InfoCard({ label, children, wide }) {
  return (
    <div className={`p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 min-w-0 ${wide ? "col-span-2" : ""}`}>
      <div className="text-[10px] text-slate-400 font-medium mb-0.5">{label}</div>
      <div className="text-xs font-bold text-slate-800 break-words" dir="auto">
        {children}
      </div>
    </div>
  );
}

/**
 * FCL-style details drawer for one Open shipment: read-only info and containers, the customs updates log
 * with an "add update" box, quick actions, and a nested status history drawer.
 * Escape closes the top layer only: dialogs and the updates modal first (handled by the page), then
 * the status history drawer, then this drawer.
 */
export default function ActiveDetailsDrawer({ row: r, onClose }) {
  const app = useApp();
  const { fmt, lang, getUpdates, addUpdate, openDialog, dialog, updatesCtx, toast } = app;
  const { t, fmtN, name, label, display, optionLabel, stamp, statusName } = fmt;
  const ar = lang === "ar";
  const k = r.reportType;
  const { user } = useAuth();
  const canEdit = hasPermission(user, CUSTOMS_PERMISSIONS.edit);
  const currentUserName = user?.name || user?.userName || user?.email?.split("@")[0] || "User";

  const [history, setHistory] = useState(false);
  const [logs, setLogs] = useState({ items: [], loading: true, error: "" });
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState(canEdit); // focus highlight on the update box right after opening
  const inputRef = useRef(null);
  const sectionRef = useRef(null);
  const copyTimer = useRef();

  useEffect(() => {
    let alive = true;
    fetchLogs(getUpdates, r.id).then((next) => alive && setLogs(next));
    return () => {
      alive = false;
    };
  }, [r.id, getUpdates]);

  // On open: bring the update box into view and focus it (FCL), then drop the highlight after 1.4 s.
  useEffect(() => {
    if (!canEdit) return;
    const focus = setTimeout(() => {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      inputRef.current?.focus({ preventScroll: true });
    }, 160);
    const clear = setTimeout(() => setFlash(false), 1400);
    return () => {
      clearTimeout(focus);
      clearTimeout(clear);
    };
  }, [canEdit]);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  // Escape: runs before the page's own listener (window, capture phase) and stops it, so one press closes one layer.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape" || dialog || updatesCtx) return; // the page closes those first
      e.stopPropagation();
      if (history) setHistory(false);
      else onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [dialog, updatesCtx, history, onClose]);

  const submit = async () => {
    const value = text.trim();
    if (!value || adding) return;
    setAdding(true);
    const res = await addUpdate(r.id, value);
    setAdding(false);
    if (!res.ok) {
      toast(res.error, true);
      return;
    }
    setText("");
    setLogs(await fetchLogs(getUpdates, r.id));
    inputRef.current?.focus();
  };

  const copyRow = async () => {
    const clip = rowsClipboardText(fmt, k, [r]);
    try {
      await copyText(clip);
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2200);
    } catch {
      openDialog(<CopyFallbackDialog text={clip} />);
    }
  };

  const v = (key) => C.value(r, key);
  const alerts = C.alertsOf(r);
  const alertLevel = { etaDate: alerts.eta, dateOfFreeTimeEnd: alerts.freeTime };
  const info = containerInfo(r);
  const cards = C.reportFields(k).filter((f) => !NOT_CARDS.has(f.key));
  const doc = docNumber(r);
  const subtitle = [r.shipmentNumber, doc !== "—" && doc !== r.shipmentNumber ? doc : null].filter(Boolean).join(" · ") || "—";

  return (
    <div className="ccl-tw">
      <div
        className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs"
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          className="w-full max-w-3xl h-full bg-white shadow-2xl flex flex-col border-s border-slate-200 overflow-hidden"
          style={{ animation: `${ar ? "ccl-drawer-in-rtl" : "ccl-drawer-in"} .25s ease-out` }}
          role="dialog"
          aria-modal="true"
          aria-label={t("Operation Full Details", "تفاصيل العملية الكاملة")}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-sky-50/70 via-white to-slate-50 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 shadow-2xs">
                <Eye size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-800">{t("Operation Full Details", "تفاصيل العملية الكاملة")}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_BADGE[k] || ""}`}>{name(k)}</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                    <Lock size={10} />
                    {t("Read-Only Info", "البيانات للقراءة فقط")}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate" dir="auto">
                  {subtitle}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer shrink-0"
              aria-label={t("Close", "إغلاق")}
            >
              <X size={16} />
            </button>
          </div>

          {/* Summary banner & quick actions */}
          <div className="px-6 py-3 bg-sky-50/70 border-b border-sky-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-4 text-xs flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                <span className="text-slate-600">{t("Created By:", "أنشأها:")}</span>
                <strong className="text-sky-950">{createdBy(r, t)}</strong>
              </div>
              <div className="text-slate-500 text-[11px]">
                {t("Created At:", "تاريخ الإنشاء:")} <strong className="text-slate-700">{cairoStamp(r.createdAtUtc, ar)}</strong>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={copyRow}
                className={
                  ACTION_BTN +
                  (copied ? " bg-emerald-50 text-emerald-700 border-emerald-300" : " bg-white hover:bg-slate-50 text-slate-700 border-slate-200")
                }
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                <span>{copied ? t("Copied", "تم النسخ") : t("Copy", "نسخ")}</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  openDialog(<MailDialog scope="open" reportType={k} status="Open" initialRows={[r]} preSelectedIds={[r.id]} />)
                }
                className={ACTION_BTN + " bg-white hover:bg-sky-50 text-sky-700 border-sky-200"}
              >
                <Mail size={12} />
                <span>{t("Email it", "إرسال بالإيميل")}</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  openDialog(<ExcelExportDialog scope="open" reportType={k} status="Open" initialRows={[r]} preSelectedIds={[r.id]} />)
                }
                className={ACTION_BTN + " bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-200"}
              >
                <FileSpreadsheet size={12} />
                <span>{t("Save as Excel", "حفظ كـ Excel")}</span>
              </button>
              <button type="button" onClick={() => setHistory(true)} className={ACTION_BTN + " bg-white hover:bg-sky-50 text-sky-700 border-sky-200"}>
                <History size={12} />
                <span>{t("Status History", "سجل الحالات")}</span>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* 1. Shipment & master info */}
            <section className="space-y-3">
              <SectionTitle>{t("Shipment & Master Info", "بيانات الشحنة الأساسية")}</SectionTitle>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {cards.map((f) => {
                  const level = k === "OceanImport" ? alertLevel[f.key] : null;
                  return (
                    <InfoCard key={f.key} label={label(f)} wide={f.type === "note" || f.key === "currentStage"}>
                      {C.inactive(k, f.key, r) ? "—" : display(v(f.key), f)}
                      {level && (
                        <span
                          className={`inline-block ms-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold leading-snug whitespace-nowrap align-middle ${
                            alertTone(level) === "bad"
                              ? "bg-rose-100 text-rose-800 border border-rose-300"
                              : "bg-amber-100 text-amber-900 border border-amber-300"
                          }`}
                        >
                          {alertBadge(t, f.key, level, v(f.key), app.alertsSummary?.today)}
                        </span>
                      )}
                    </InfoCard>
                  );
                })}
                <InfoCard label={t("Status", "الحالة")}>
                  <span className="inline-flex items-center gap-1.5 text-sky-700">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    {statusName("Open")}
                  </span>
                </InfoCard>
              </div>
            </section>

            {/* 2. Containers / pieces */}
            <section className="space-y-3">
              <SectionTitle
                badge={
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                    {k === "Domestic" ? `${fmtN(info.pieces)} ${t("pcs", "قطعة")}` : `${fmtN(info.count)} ${t("cntrs", "حاوية")}`}
                  </span>
                }
              >
                {k === "Domestic" ? t("Pieces Details", "تفاصيل القطع") : t("Containers Details", "تفاصيل الحاويات")}
              </SectionTitle>
              {k === "Domestic" ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  <InfoCard label={t("Number of pieces", "عدد القطع")}>{fmtN(info.pieces)}</InfoCard>
                </div>
              ) : !info.count ? (
                <div className="py-6 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-400 italic font-medium">
                  {t("No containers registered yet", "لا توجد حاويات مسجلة بعد")}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-2xs">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-[11px]">
                        <th className="py-2 px-3 text-start">#</th>
                        <th className="py-2 px-3 text-start">{t("Container type", "نوع الحاوية")}</th>
                        <th className="py-2 px-3 text-start">{t("Count", "العدد")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {info.split ? (
                        info.parts.map((p, i) => (
                          <tr key={i}>
                            <td className="py-2 px-3 font-bold text-slate-500">{fmtN(i + 1)}</td>
                            <td className="py-2 px-3 font-semibold text-slate-800">{p ? optionLabel(p) : "—"}</td>
                            <td className="py-2 px-3 text-slate-700">{fmtN(1)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="py-2 px-3 font-bold text-slate-500">{info.count > 1 ? `${fmtN(1)}–${fmtN(info.count)}` : fmtN(1)}</td>
                          <td className="py-2 px-3 font-semibold text-slate-800">{info.parts[0] ? optionLabel(info.parts[0]) : "—"}</td>
                          <td className="py-2 px-3 text-slate-700">{fmtN(info.count)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* 3. Latest update (editable) + customs updates log */}
            <section
              ref={sectionRef}
              className={`rounded-2xl border bg-gradient-to-b from-sky-50/50 to-white p-4 space-y-3.5 transition-all duration-300 ${
                flash ? "border-sky-400 ring-4 ring-sky-200/80 shadow-md" : "border-sky-200 shadow-xs"
              }`}
            >
              <SectionTitle bar="bg-cyan-600">
                {canEdit ? t("Latest Update (Editable)", "أحدث التحديثات (قابل للتعديل)") : t("Latest Update", "أحدث التحديثات")}
              </SectionTitle>

              {canEdit ? (
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      dir="auto"
                      maxLength={2000}
                      disabled={adding}
                      value={text}
                      placeholder={t("Type the update and press Enter...", "اكتب التحديث واضغط Enter...")}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          submit();
                        }
                      }}
                      className={`flex-1 rounded-xl border bg-white px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-200/80 placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-400 transition-all ${
                        flash ? "border-sky-500 ring-4 ring-sky-200/80" : "border-slate-300"
                      }`}
                    />
                    <button
                      type="button"
                      disabled={adding || !text.trim()}
                      onClick={submit}
                      className="px-5 py-2.5 rounded-xl bg-[#0f4c81] hover:bg-[#0c3c66] text-white text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      {adding ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <>
                          <Plus size={14} />
                          {t("Add update", "إضافة تحديث")}
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
                    {t("Will be recorded as ", "سيتم التسجيل باسم ")}
                    <span className="font-semibold text-slate-600">{currentUserName}</span>
                  </p>
                </div>
              ) : (
                <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium flex items-center gap-2">
                  <Lock size={13} className="text-slate-400 shrink-0" />
                  {t("You can view the updates, but you don't have permission to add one.", "تقدر تشوف التحديثات، لكن مش عندك صلاحية تضيف تحديث.")}
                </div>
              )}

              <div className="pt-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    {t("Customs Updates Log", "سجل تحديثات التخليص")}
                  </span>
                  {!logs.loading && !logs.error && <span className="text-[11px] font-semibold text-slate-400">{fmtN(logs.items.length)}</span>}
                </div>
                {logs.loading ? (
                  <div className="space-y-2">
                    {[0, 1].map((i) => (
                      <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : logs.error ? (
                  <div className="px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold" role="alert">
                    {logs.error}
                  </div>
                ) : !logs.items.length ? (
                  <div className="py-6 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-400 italic font-medium">
                    {t("No updates yet", "لا توجد تحديثات حتى الآن")}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                    {logs.items.map((u, idx) => (
                      <div
                        key={u.id || idx}
                        className="flex items-start justify-between gap-3 p-3 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 transition shadow-2xs"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-[#0f4c81] text-white font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                            {fmtN(logs.items.length - idx)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5 text-[10.5px]">
                              <span className="text-slate-400">{stamp(u.updatedAtUtc)}</span>
                              <span className="font-semibold text-slate-600">· {u.updatedBy || "—"}</span>
                            </div>
                            <p className="text-xs font-semibold text-slate-800 leading-relaxed whitespace-pre-wrap break-words" dir="auto">
                              {u.updateText}
                            </p>
                          </div>
                        </div>
                        {idx === 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10.5px] font-semibold border border-emerald-200/70 shrink-0">
                            {t("latest", "الأحدث")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Lock size={12} />
              {t("Operation Details (Updates Only Editable)", "عرض تفاصيل الشحنة (التحديثات فقط متاحة)")}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setHistory(true)}
                className="inline-flex items-center gap-1.5 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 rounded-xl px-3.5 py-2 text-xs font-semibold transition cursor-pointer"
              >
                <History size={12} />
                {t("Status History", "سجل الحالات")}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl px-5 py-2 text-xs font-semibold transition cursor-pointer"
              >
                {t("Close", "إغلاق")}
              </button>
            </div>
          </div>
        </div>
      </div>
      {history && <OpenStatusHistoryDrawer row={r} onClose={() => setHistory(false)} />}
    </div>
  );
}

/* ---------- status history (FCL lifecycle timeline) for an Open shipment: created only ---------- */
function OpenStatusHistoryDrawer({ row: r, onClose }) {
  const { fmt, lang } = useApp();
  const { t, clientName, statusName } = fmt;
  const ar = lang === "ar";

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-slate-900/40 backdrop-blur-xs" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col border-s border-slate-200 overflow-hidden"
        style={{ animation: `${ar ? "ccl-drawer-in-rtl" : "ccl-drawer-in"} .25s ease-out` }}
        role="dialog"
        aria-modal="true"
        aria-label={t("Operation Status History", "سجل وتاريخ حالات الشحنة")}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-sky-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-100/70 text-sky-700 border border-sky-200/80 flex items-center justify-center shrink-0 shadow-2xs">
              <History size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">{t("Operation Status History", "سجل وتاريخ حالات الشحنة")}</h3>
              <p className="text-[11px] text-slate-400 font-medium">Audit Log & Lifecycle Timeline</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
            aria-label={t("Close", "إغلاق")}
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-3 text-xs">
          <div className="flex flex-col">
            <span className="text-[10.5px] text-slate-400 font-medium">{t("Shipment No", "رقم الشحنة")}</span>
            <span className="font-bold text-slate-800 tracking-wide text-xs">{r.shipmentNumber || "—"}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10.5px] text-slate-400 font-medium">{t("Client", "العميل")}</span>
            <span className="font-bold text-slate-700 text-xs truncate max-w-[150px]">{clientName(r.clientId) || "—"}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10.5px] text-slate-400 font-medium mb-0.5">{t("Current", "الحالة الحالية")}</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-sky-50 text-sky-800 border-sky-300">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              {statusName("Open")}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="relative flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 z-10 shadow-xs border-2 bg-sky-50 border-sky-500 text-sky-600">
              <Plus size={18} />
            </div>
            <div className="flex-1 min-w-0 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs transition">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="text-xs font-bold text-sky-800">{t("Shipment Created", "تم إنشاء الشحنة")}</span>
                <span className="text-[10.5px] text-slate-400 font-medium shrink-0">
                  {r.createdAtUtc ? cairoStamp(r.createdAtUtc, ar, " - ") : t("Unknown", "غير محدد")}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                <span className="text-slate-400 text-[11px]">{t("By:", "بواسطة:")}</span>
                <span className="font-semibold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200/60 shadow-2xs">{createdBy(r, t)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Lock size={12} className="text-slate-400" />
            {t("Immutable Audit Log", "سجل غير قابل للتعديل (Immutable Audit Log)")}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition cursor-pointer"
          >
            {t("Close", "إغلاق")}
          </button>
        </div>
      </div>
    </div>
  );
}
