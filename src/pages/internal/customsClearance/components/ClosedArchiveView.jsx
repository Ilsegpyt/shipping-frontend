import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Eye, History, Lock, Plus, RefreshCw, Search, X } from "lucide-react";
import customsClearanceService from "../../../../services/customsClearanceService";
import C from "../lib/core.js";
import { PAGE_SIZES } from "../lib/format.js";
import { apiError, useApp } from "../AppState.jsx";

// Same report order as the spec; the API lists one report type at a time (no "All").
const REPORTS = ["OceanImport", "Domestic", "OceanExport"];

const TYPE_BADGE = {
  OceanImport: "bg-sky-50 text-sky-700 border border-sky-200",
  OceanExport: "bg-purple-50 text-purple-700 border border-purple-200",
  Domestic: "bg-amber-50 text-amber-800 border border-amber-200",
};

/** "22-NOV-2026 - 11:06" in Cairo time. API UTC values without a zone are read as UTC. */
function closedStamp(value, ar) {
  if (!value) return "—";
  const s = String(value);
  const d = new Date(/(Z|[+-]\d\d:?\d\d)$/.test(s) ? s : s + "Z");
  if (Number.isNaN(d.getTime())) return s;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Cairo",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  const text = `${parts.day}-${String(parts.month).toUpperCase()}-${parts.year} - ${parts.hour}:${parts.minute}`;
  return ar ? text.replace(/\d/g, (n) => "٠١٢٣٤٥٦٧٨٩"[n]) : text;
}

/** Count + types: merged rows have one type for all containers, split rows one type per container. */
function containerInfo(r) {
  if (r.reportType === "Domestic") return { pieces: Number(C.value(r, "numberOfPieces")) || 0, count: 0, groups: [], parts: [] };
  const count = Number(C.value(r, "numberOfContainers")) || 0;
  const split = C.isSplit(r);
  const parts = C.containerParts(r);
  const groups = new Map();
  if (split) parts.forEach((p) => p && groups.set(p, (groups.get(p) || 0) + 1));
  else if (parts[0]) groups.set(parts[0], count);
  return { pieces: 0, count, split, parts, groups: [...groups.entries()] };
}

const closedBy = (r, t) => r.closedByName || t("Operations", "فريق العمليات");
const docNumber = (r) =>
  C.value(r, "mbl") || C.value(r, "bookingNumber") || r.certificateNumber || C.value(r, "commercialInvoiceNumber") || "—";

/** Closed shipments archive (FCL delivered-archive layout). Loads only while it is shown. */
export default function ClosedArchiveView({ onBack }) {
  const { fmt, lang, kind } = useApp();
  const { t, fmtN, name, clientName, optionLabel } = fmt;
  const ar = lang === "ar";

  const [reportType, setReportType] = useState(kind || "OceanImport");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [reloadKey, setReloadKey] = useState(0);
  // The page answer is tagged with the request it belongs to; loading = no answer yet for the current request.
  const [answer, setAnswer] = useState({ key: "", items: [], totalCount: 0, error: "" });
  const [detail, setDetail] = useState(null);
  const [historyRow, setHistoryRow] = useState(null);
  const seq = useRef(0);

  // Debounced search (300 ms), back to page 1.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const requestKey = [reportType, page, pageSize, query, reloadKey].join("|");
  useEffect(() => {
    const mine = ++seq.current;
    customsClearanceService
      .getAll({ reportType, status: "Closed", pageNumber: page, pageSize, search: query })
      .then((res) => {
        if (mine === seq.current) setAnswer({ key: requestKey, items: res?.items || [], totalCount: res?.totalCount || 0, error: "" });
      })
      .catch((err) => {
        if (mine === seq.current)
          setAnswer((a) => ({ ...a, key: requestKey, error: apiError(err, "Could not load closed shipments.") }));
      });
  }, [reportType, page, pageSize, query, requestKey]);
  // While a new page loads, the previous rows stay visible (dimmed) instead of flashing empty.
  const data = { ...answer, loading: answer.key !== requestKey };

  const pages = Math.max(1, Math.ceil(data.totalCount / pageSize));
  const from = data.totalCount ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, data.totalCount);
  const openHistory = (r) => setHistoryRow(r);

  return (
    <div className="ccl-tw space-y-3 w-full my-2 flex flex-col">
      {/* 1. Header banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-emerald-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">{t("Closed Shipments Archive", "سجل الشحنات المغلقة")}</h3>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {fmtN(data.totalCount)} {t("closed", "مغلقة")}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {t(
                "All closed shipments are securely archived here with details and exact timestamp",
                "يتم أرشفة جميع الشحنات المغلقة هنا مع توثيق تفاصيل وتاريخ وساعة الإغلاق بدقة",
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={data.loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={data.loading ? "animate-spin text-emerald-600" : "text-slate-500"} />
            <span>{t("Refresh", "تحديث")}</span>
          </button>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 bg-slate-900 text-white hover:bg-slate-800 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer shadow-sm transition"
          >
            <ChevronLeft size={14} className={ar ? "rotate-180" : ""} />
            <span>{t("Back to Active Shipments", "العودة للشحنات النشطة")}</span>
          </button>
        </div>
      </div>

      {/* 2. Controls strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 shadow-2xs" role="group" aria-label={t("Report type", "نوع التقرير")}>
          {REPORTS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                if (k === reportType) return;
                setReportType(k);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                k === reportType ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              {name(k)}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[220px] max-w-md">
          <span className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
            <Search size={14} />
          </span>
          <input
            type="text"
            value={search}
            maxLength={100}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Search shipment #, certificate, ACID, B/L, booking, invoice…", "ابحث برقم العملية أو الشهادة أو ACID أو البوليصة أو الحجز أو الفاتورة…")}
            aria-label={t("Search closed shipments", "البحث في الشحنات المغلقة")}
            className="w-full ps-9 pe-8 py-2 rounded-xl border border-slate-300 bg-slate-50/70 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute inset-y-0 end-0 pe-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              title={t("Clear search", "مسح البحث")}
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">{t("Per page:", "لكل صفحة:")}</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-md px-1.5 py-0.5 text-slate-700 font-semibold cursor-pointer focus:outline-none focus:border-sky-500"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span className="text-slate-500 font-medium">
            {fmtN(from)}–{fmtN(to)} {t("of", "من")} {fmtN(data.totalCount)}
          </span>
          <button
            type="button"
            disabled={page <= 1 || data.loading}
            onClick={() => setPage((p) => p - 1)}
            className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed text-slate-700 transition"
            aria-label={t("Previous page", "الصفحة السابقة")}
          >
            {ar ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
          <span className="font-semibold text-slate-700">
            {fmtN(page)} / {fmtN(pages)}
          </span>
          <button
            type="button"
            disabled={page >= pages || data.loading}
            onClick={() => setPage((p) => p + 1)}
            className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed text-slate-700 transition"
            aria-label={t("Next page", "الصفحة التالية")}
          >
            {ar ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      </div>

      {/* 3. Archive table */}
      {data.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800" role="alert">
          {data.error}
        </div>
      ) : !data.loading && !data.items.length ? (
        <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/30 p-12 text-center min-h-[260px] flex flex-col items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-2xs">
            <CheckCircle2 size={22} />
          </div>
          <p className="text-sm font-bold text-slate-800">
            {query ? t("No closed shipments match your search", "مفيش شحنات مغلقة مطابقة للبحث") : t("No closed shipments yet", "لا توجد شحنات مغلقة بعد")}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200/90 shadow-xs">
          <table className="w-full text-start border-collapse text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 text-start"># / {t("Shipment No", "رقم الشحنة")}</th>
                <th className="py-3 px-3 text-start">{t("Type", "النوع")}</th>
                <th className="py-3 px-3 text-start">{t("BL / Booking / Cert", "البوليصة / الحجز / الشهادة")}</th>
                <th className="py-3 px-3 text-start">{t("Client & Line", "العميل والخط الملاحي")}</th>
                <th className="py-3 px-3 text-start">{t("Containers", "الحاويات")}</th>
                <th className="py-3 px-3 text-start bg-emerald-50/60 text-emerald-950 border-x border-emerald-100">{t("Closed By", "أغلقها")}</th>
                <th className="py-3 px-3 text-start bg-emerald-50/60 text-emerald-950">{t("Closed At", "تاريخ الإغلاق")}</th>
                <th className="py-3 px-3 text-center">{t("Actions", "الإجراءات")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.loading && !data.items.length
                ? Array.from({ length: 6 }, (_, i) => (
                    <tr key={"skel" + i}>
                      {Array.from({ length: 8 }, (_, j) => (
                        <td key={j} className="py-3 px-3">
                          <div className="h-4 w-20 bg-slate-200/70 rounded-md animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                : data.items.map((r, i) => {
                    const info = containerInfo(r);
                    const line = C.value(r, "shippingLine");
                    return (
                      <tr key={r.id} className={"hover:bg-emerald-50/20 transition-colors" + (data.loading ? " opacity-60" : "")}>
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{r.shipmentNumber || "—"}</span>
                            <span className="text-[10px] text-slate-400">#{fmtN(from + i)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${TYPE_BADGE[r.reportType] || ""}`}>
                            {name(r.reportType)}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] font-semibold text-slate-800">{docNumber(r)}</td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{clientName(r.clientId) || "—"}</span>
                            {line && <span className="text-[11px] text-slate-500">{line}</span>}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {r.reportType === "Domestic" ? (
                            <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                              {fmtN(info.pieces)} {t("pcs", "قطعة")}
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                                {fmtN(info.count)} {t("cntrs", "حاوية")}
                              </span>
                              {info.groups.map(([type, n]) => (
                                <span key={type} className="px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-[10px] text-slate-700 font-medium">
                                  {info.split ? fmtN(n) + "× " : ""}
                                  {optionLabel(type)}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 bg-emerald-50/30 border-x border-emerald-100">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-emerald-200 text-emerald-800 font-bold shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>{closedBy(r, t)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 bg-emerald-50/30 font-semibold text-slate-800">{closedStamp(r.closedAtUtc, ar)}</td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setDetail(r)}
                              className="inline-flex items-center gap-1.5 bg-[#0b4f7a] text-white hover:bg-[#083a5a] px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer transition"
                            >
                              <Eye size={13} />
                              <span>{t("Details", "التفاصيل")}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openHistory(r)}
                              className="inline-flex items-center gap-1.5 bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 px-2.5 py-1 rounded-xl text-xs font-semibold cursor-pointer transition"
                            >
                              <History size={12} />
                              <span>{t("History", "السجل")}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      )}

      {detail && (
        <ClosedDetailsDrawer row={detail} onClose={() => setDetail(null)} onHistory={() => openHistory(detail)} blocked={!!historyRow} />
      )}
      {historyRow && <StatusHistoryDrawer row={historyRow} onClose={() => setHistoryRow(null)} />}
    </div>
  );
}

/* ---------- slide-over full details ---------- */

function Card({ label, children, wide }) {
  return (
    <div className={"bg-slate-50 p-2.5 rounded-xl border border-slate-100" + (wide ? " col-span-2 sm:col-span-3" : "")}>
      <span className="text-slate-400 block text-[10px]">{label}</span>
      <span className="font-bold text-slate-800 break-words whitespace-normal">{children}</span>
    </div>
  );
}

function SectionTitle({ children, badge }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-emerald-500" />
        <span>{children}</span>
      </h4>
      {badge}
    </div>
  );
}

// Fields already shown in their own card (or in the containers section).
const SHOWN = new Set([
  "shipmentNumber", "clientId", "shippingLine", "pod", "pol", "mbl", "bookingNumber", "certificateNumber", "acidNumber",
  "etaDate", "numberOfContainers", "containerType", "numberOfPieces", "latestUpdate", "status",
]);

function ClosedDetailsDrawer({ row: r, onClose, onHistory, blocked }) {
  const { fmt, lang, getUpdates } = useApp();
  const { t, fmtN, name, clientName, optionLabel, label, display, stamp } = fmt;
  const ar = lang === "ar";
  const k = r.reportType;
  const info = containerInfo(r);
  const [logs, setLogs] = useState({ items: [], loading: true, error: "" });

  useEffect(() => {
    let alive = true;
    getUpdates(r.id).then((res) => {
      if (alive) setLogs(res.ok ? { items: res.value || [], loading: false, error: "" } : { items: [], loading: false, error: res.error });
    });
    return () => {
      alive = false;
    };
  }, [r.id, getUpdates]);

  // Escape closes the drawer, unless the status history drawer is open above it (that one closes first).
  useEffect(() => {
    if (blocked) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, blocked]);

  const v = (key) => C.value(r, key);
  const port =
    k === "OceanExport" ? [v("pol"), v("pod")].filter(Boolean).map(optionLabel).join(" → ") : v("pod") ? optionLabel(v("pod")) : "";
  const blOrBooking = k === "OceanExport" ? v("bookingNumber") : v("mbl");
  const eta = v("etaDate");
  const extra = C.reportFields(k).filter((f) => !SHOWN.has(f.key));

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={t("Closed Shipment Full Details", "التفاصيل الكاملة للشحنة المغلقة")}
    >
      <div
        className="w-full max-w-3xl h-full bg-white shadow-2xl flex flex-col border-s border-slate-200 animate-in slide-in-from-right duration-250 overflow-hidden"
        style={{ animation: `${ar ? "ccl-drawer-in-rtl" : "ccl-drawer-in"} .25s ease-out` }}
      >
        {/* Header */}
        <div className="p-5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 text-emerald-700 w-10 h-10 rounded-2xl flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900">{t("Closed Shipment Full Details", "التفاصيل الكاملة للشحنة المغلقة")}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${TYPE_BADGE[k] || ""}`}>{name(k)}</span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{r.shipmentNumber || "—"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
            aria-label={t("Close", "إغلاق")}
          >
            <X size={16} />
          </button>
        </div>

        {/* Close audit banner */}
        <div className="p-4 border-b bg-emerald-50/80 border-emerald-100 text-emerald-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-4 text-xs flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">{t("Closed By:", "أغلقها:")}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <strong className="text-emerald-900 font-bold">{closedBy(r, t)}</strong>
            </div>
            <div>
              <span className="text-slate-500">{t("Closed At:", "تاريخ وساعة الإغلاق:")} </span>
              <strong className="text-slate-800 font-bold">{closedStamp(r.closedAtUtc, ar)}</strong>
            </div>
          </div>
          <button
            type="button"
            onClick={onHistory}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <History size={12} className="text-sky-600" />
            <span>{t("Status History", "سجل الحالات")}</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50">
          {/* 1. Shipment & master info */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <SectionTitle>{t("Shipment & Master Info", "بيانات الشحنة الأساسية")}</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <Card label={t("Client", "العميل")}>{clientName(r.clientId) || "—"}</Card>
              <Card label={t("Shipping Line", "الخط الملاحي")}>{v("shippingLine") || "—"}</Card>
              <Card label={k === "OceanExport" ? t("Port (POL → POD)", "الميناء (التحميل ← الوصول)") : t("Port", "الميناء")}>{port || "—"}</Card>
              <Card label={k === "OceanExport" ? t("Booking", "رقم الحجز") : t("MBL", "البوليصة الرئيسية")}>
                <span className="font-mono">{blOrBooking || "—"}</span>
              </Card>
              <Card label={t("Certificate No.", "رقم الشهادة")}>{r.certificateNumber || "—"}</Card>
              <Card label={t("ACID #", "رقم ACID")}>
                <span className="font-mono">{v("acidNumber") || "—"}</span>
              </Card>
              <Card label={t("ETA", "تاريخ الوصول المتوقع")}>{eta ? display(eta, { key: "etaDate", type: "date" }) : "—"}</Card>
              <Card label={t("Status", "الحالة")}>
                <span className="inline-flex items-center gap-1.5 text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {t("Closed", "مغلقة")}
                </span>
              </Card>
              {extra.map((f) => (
                <Card key={f.key} label={label(f)} wide={f.type === "note"}>
                  {display(v(f.key), f)}
                </Card>
              ))}
            </div>
          </div>

          {/* 2. Containers & details */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <SectionTitle
              badge={
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                  {k === "Domestic" ? `${fmtN(info.pieces)} ${t("pcs", "قطعة")}` : `${fmtN(info.count)} ${t("cntrs", "حاوية")}`}
                </span>
              }
            >
              {t("Containers & Details", "الحاويات والتفاصيل")}
            </SectionTitle>
            {k === "Domestic" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <Card label={t("Number of pieces", "عدد الطرود")}>{fmtN(info.pieces)}</Card>
              </div>
            ) : !info.count && !info.groups.length ? (
              <div className="p-4 text-center text-xs text-slate-400 border border-slate-100 rounded-xl">
                {t("No containers registered", "لا توجد حاويات مسجلة")}
              </div>
            ) : (
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-start border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-bold text-[11px]">
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
                        <td className="py-2 px-3 font-bold text-slate-500">
                          {info.count > 1 ? `${fmtN(1)}–${fmtN(info.count)}` : fmtN(1)}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{info.parts[0] ? optionLabel(info.parts[0]) : "—"}</td>
                        <td className="py-2 px-3 text-slate-700">{fmtN(info.count)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 3. Customs updates log */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <SectionTitle
              badge={
                !logs.loading && !logs.error ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{fmtN(logs.items.length)}</span>
                ) : null
              }
            >
              {t("Customs Updates Log", "سجل تحديثات التخليص")}
            </SectionTitle>
            {logs.loading ? (
              <div className="space-y-2">
                {[0, 1].map((i) => (
                  <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : logs.error ? (
              <p className="text-xs text-rose-700" role="alert">{logs.error}</p>
            ) : !logs.items.length ? (
              <p className="p-4 text-center text-xs text-slate-400 border border-slate-100 rounded-xl">{t("No updates yet.", "لا توجد تحديثات بعد.")}</p>
            ) : (
              <ol className="space-y-2">
                {logs.items.map((u, i) => (
                  <li key={u.id || i} className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1">
                    <div className="text-xs text-slate-800 whitespace-pre-wrap break-words" dir="auto">{u.updateText}</div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                      <span className="font-semibold text-slate-700">{u.updatedBy || "—"}</span>
                      <span>·</span>
                      <span>{stamp(u.updatedAtUtc)}</span>
                      {i === 0 && <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">{t("Latest", "الأحدث")}</span>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onHistory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 text-xs font-semibold cursor-pointer transition"
          >
            <History size={12} />
            <span>{t("Status History", "سجل الحالات")}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold cursor-pointer transition"
          >
            {t("Close", "إغلاق")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- status history (FCL lifecycle timeline): closed → created ---------- */

const NODE = {
  closed: { box: "bg-emerald-50 border-emerald-500 text-emerald-600", title: "text-emerald-800", Icon: CheckCircle2 },
  created: { box: "bg-sky-50 border-sky-500 text-sky-600", title: "text-sky-800", Icon: Plus },
};

function StatusHistoryDrawer({ row: r, onClose }) {
  const { fmt, lang } = useApp();
  const { t, clientName } = fmt;
  const ar = lang === "ar";

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // The status lifecycle only tracks administrative status transitions (Closed and Created).
  // Customs text updates belong to the Customs Updates Log in the details drawer.
  const events = [
    { id: "closed", kind: "closed", title: t("Shipment Closed & Archived", "تم إغلاق الشحنة وأرشفتها"), at: r.closedAtUtc, by: closedBy(r, t) },
    { id: "created", kind: "created", title: t("Shipment Created", "تم إنشاء الشحنة"), at: r.createdAtUtc, by: r.createdByName || t("Operations", "فريق العمليات") },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-slate-900/40 backdrop-blur-xs" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col border-s border-slate-200 overflow-hidden"
        style={{ animation: `${ar ? "ccl-drawer-in-rtl" : "ccl-drawer-in"} .25s ease-out` }}
        role="dialog"
        aria-modal="true"
        aria-label={t("Operation Status History", "سجل وتاريخ حالات الشحنة")}
      >
        {/* Header */}
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

        {/* Shipment info */}
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
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-emerald-50 text-emerald-800 border-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {t("Closed", "مغلقة")}
            </span>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="relative">
            {/* Vertical connector line */}
            <div className="absolute top-4 bottom-4 w-0.5 bg-slate-200" style={{ [ar ? "right" : "left"]: "19px" }} />
            <div className="space-y-6">
              {events.map((ev) => {
                const n = NODE[ev.kind];
                return (
                  <div key={ev.id} className="relative flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 z-10 shadow-xs border-2 ${n.box}`}>
                      <n.Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs transition">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className={`text-xs font-bold whitespace-pre-wrap break-words ${n.title}`} dir="auto">
                          {ev.title}
                        </span>
                        <span className="text-[10.5px] text-slate-400 font-medium shrink-0">
                          {ev.at ? closedStamp(ev.at, ar) : t("Unknown", "غير محدد")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                        <span className="text-slate-400 text-[11px]">{t("By:", "بواسطة:")}</span>
                        <span className="font-semibold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200/60 shadow-2xs">
                          {ev.by || t("System User", "مستخدم النظام")}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
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
