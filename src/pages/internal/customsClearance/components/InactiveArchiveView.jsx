import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, History, Lock, Plus, RefreshCw, Search, Trash2, X, CheckCircle2, CalendarRange } from "lucide-react";
import customsClearanceService from "../../../../services/customsClearanceService";
import C from "../lib/core.js";
import { apiError, useApp } from "../AppState.jsx";

// "" = all reports (the Inactive listing accepts an optional reportType).
const REPORTS = ["", "OceanImport", "Domestic", "OceanExport"];
const PAGE_SIZES = [10, 20, 50, 100];
const COUNT_KEY = { "": "total", OceanImport: "oceanImport", OceanExport: "oceanExport", Domestic: "domestic" };
const EMPTY_FILTERS = { inactiveBy: "", dateType: "Inactive", from: "", to: "" };

const TYPE_BADGE = {
  OceanImport: "bg-sky-50 text-sky-700 border border-sky-200",
  OceanExport: "bg-purple-50 text-purple-700 border border-purple-200",
  Domestic: "bg-amber-50 text-amber-800 border border-amber-200",
};

/* ---------- in-memory stale-while-revalidate cache of archive pages ---------- */
// Keyed by the full request (incl. the deactivation version), so a deactivation never shows a stale page.
const pageCache = new Map();
let cacheVersion = -1;
function cachePut(key, value) {
  pageCache.delete(key);
  pageCache.set(key, value);
  while (pageCache.size > 30) pageCache.delete(pageCache.keys().next().value);
}

/** "22-NOV-2026 - 11:06" in Cairo time. API UTC values without a zone are read as UTC. */
function cairoStamp(value, ar) {
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

const inactiveBy = (r, t) => r.deletedByName || t("User", "مستخدم");
const docNumber = (r) =>
  C.value(r, "mbl") || C.value(r, "bookingNumber") || r.certificateNumber || C.value(r, "commercialInvoiceNumber") || "—";

/** 1 … 4 5 6 … 12 */
function pageList(page, pages) {
  const out = [];
  const add = (p) => out.push(p);
  const lo = Math.max(2, page - 1);
  const hi = Math.min(pages - 1, page + 1);
  add(1);
  if (lo > 2) add("…a");
  for (let p = lo; p <= hi; p++) add(p);
  if (hi < pages - 1) add("…b");
  if (pages > 1) add(pages);
  return out;
}

/** Inactive (soft-deleted) shipments archive (FTL inactive-archive layout, Rose). Loads only while it is shown. */
export default function InactiveArchiveView({ onBack }) {
  const { fmt, lang, counts, refreshCounts, inactiveVersion } = useApp();
  const { t, fmtN, name, clientName, optionLabel } = fmt;
  const ar = lang === "ar";

  const [reportType, setReportType] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [reloadKey, setReloadKey] = useState(0);
  // The page answer is tagged with the request (and reload) it belongs to; loading = no answer yet for the current one.
  const [answer, setAnswer] = useState({ key: "", rk: -1, items: [], totalCount: 0, error: "" });
  const [names, setNames] = useState([]);
  const [detail, setDetail] = useState(null);
  const [historyRow, setHistoryRow] = useState(null);
  const seq = useRef(0);
  const searchRef = useRef(null);

  // Debounced search (300 ms), back to page 1.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Ctrl+K / Cmd+K focuses the search box.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { inactiveBy: by, dateType, from: dateFrom, to: dateTo } = filters;
  const requestKey = [inactiveVersion, reportType, page, pageSize, query, by, dateType, dateFrom, dateTo].join("|");

  // One page per request; stale in-flight requests are aborted and their answers ignored.
  useEffect(() => {
    if (cacheVersion !== inactiveVersion) {
      pageCache.clear();
      cacheVersion = inactiveVersion;
    }
    const mine = ++seq.current;
    const controller = new AbortController();
    customsClearanceService
      .getInactive({ reportType, pageNumber: page, pageSize, search: query, inactiveBy: by, dateType, dateFrom, dateTo, signal: controller.signal })
      .then((res) => {
        if (mine !== seq.current) return;
        const value = { items: res?.items || [], totalCount: res?.totalCount || 0 };
        cachePut(requestKey, value);
        setAnswer({ key: requestKey, rk: reloadKey, ...value, error: "" });
      })
      .catch((err) => {
        if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError" || mine !== seq.current) return;
        setAnswer((a) => ({ ...a, key: requestKey, rk: reloadKey, error: apiError(err, "Could not load inactive shipments.") }));
      });
    return () => controller.abort();
  }, [inactiveVersion, reportType, page, pageSize, query, by, dateType, dateFrom, dateTo, requestKey, reloadKey]);

  // "Inactive by" options: small distinct list, reloaded per report type.
  useEffect(() => {
    const controller = new AbortController();
    customsClearanceService
      .getInactiveBy(reportType, { signal: controller.signal })
      .then((list) => setNames(Array.isArray(list) ? list : []))
      .catch(() => {});
    return () => controller.abort();
  }, [reportType, inactiveVersion]);

  // Current answer, else the cached page shown while it revalidates, else the previous rows (dimmed).
  const cached = pageCache.get(requestKey);
  const current = answer.key === requestKey;
  const data = current
    ? { ...answer, loading: answer.rk !== reloadKey, dim: false }
    : cached
      ? { ...cached, error: "", loading: true, dim: false }
      : { ...answer, loading: true, dim: true };

  const pages = Math.max(1, Math.ceil(data.totalCount / pageSize));
  const from = data.totalCount ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, data.totalCount);
  const filtered = !!(query || by || dateFrom || dateTo);
  const overall = counts?.inactive?.[COUNT_KEY[reportType]];

  const setFilter = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  const clearAll = () => {
    setSearch("");
    setQuery("");
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };
  const refresh = () => {
    pageCache.delete(requestKey);
    setReloadKey((k) => k + 1);
    refreshCounts?.();
  };

  const navBtn =
    "px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed text-slate-700 transition";
  const field =
    "bg-slate-50/70 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-100 transition";

  return (
    <div className="ccl-tw space-y-3 w-full my-2 flex flex-col">
      {/* 1. Hero banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-rose-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
            <Trash2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900">{t("Inactive Shipments Archive", "سجل الشحنات غير النشطة")}</h3>
              <span className="bg-rose-100 text-rose-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {filtered && overall != null
                  ? `${fmtN(data.totalCount)} ${t("of", "من")} ${fmtN(overall)} ${t("inactive", "غير نشطة")}`
                  : `${fmtN(data.totalCount)} ${t("inactive", "غير نشطة")}`}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {t(
                "Inactive shipments are archived here read-only, with who moved them and the exact timestamp",
                "الشحنات غير النشطة بتتأرشف هنا للقراءة فقط، مع توثيق مين نقلها وتاريخ وساعة النقل بدقة",
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={data.loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={data.loading ? "animate-spin text-rose-600" : "text-slate-500"} />
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

      {/* 2. Controls & filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 shadow-2xs" role="group" aria-label={t("Report type", "نوع التقرير")}>
            {REPORTS.map((k) => (
              <button
                key={k || "all"}
                type="button"
                aria-pressed={k === reportType}
                onClick={() => {
                  if (k === reportType) return;
                  setReportType(k);
                  setFilters((f) => ({ ...f, inactiveBy: "" }));
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  k === reportType ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                {k ? name(k) : t("All", "الكل")}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[240px]">
            <span className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
              <Search size={14} />
            </span>
            <input
              ref={searchRef}
              type="text"
              value={search}
              maxLength={100}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Search shipment #, certificate, ACID, B/L, booking, invoice…", "ابحث برقم العملية أو الشهادة أو ACID أو البوليصة أو الحجز أو الفاتورة…")}
              aria-label={t("Search inactive shipments", "البحث في الشحنات غير النشطة")}
              className="w-full ps-9 pe-14 py-2 rounded-xl border border-slate-300 bg-slate-50/70 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-100 transition"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute inset-y-0 end-0 pe-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                title={t("Clear search", "مسح البحث")}
              >
                <X size={13} />
              </button>
            ) : (
              <kbd className="absolute inset-y-0 end-2 my-auto h-5 px-1.5 flex items-center rounded border border-slate-200 bg-white text-[10px] text-slate-400 font-sans">
                Ctrl K
              </kbd>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={by}
              onChange={(e) => setFilter({ inactiveBy: e.target.value })}
              className={field + " cursor-pointer"}
              aria-label={t("Inactive by", "تم الإيقاف بواسطة")}
            >
              <option value="">{t("Inactive By: All", "تم الإيقاف بواسطة: الكل")}</option>
              {names.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span className="inline-flex items-center gap-1 text-slate-400">
              <CalendarRange size={14} />
            </span>
            <select
              value={dateType}
              onChange={(e) => setFilter({ dateType: e.target.value })}
              className={field + " cursor-pointer"}
              aria-label={t("Date type", "نوع التاريخ")}
            >
              <option value="Inactive">{t("Inactive Date", "تاريخ الإيقاف")}</option>
              <option value="Created">{t("Created Date", "تاريخ الإنشاء")}</option>
            </select>
            <label className="inline-flex items-center gap-1">
              <span className="text-slate-500">{t("From", "من")}</span>
              <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setFilter({ from: e.target.value })} className={field} />
            </label>
            <label className="inline-flex items-center gap-1">
              <span className="text-slate-500">{t("To", "إلى")}</span>
              <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setFilter({ to: e.target.value })} className={field} />
            </label>
            {(dateFrom || dateTo || by) && (
              <button
                type="button"
                onClick={() => setFilter({ inactiveBy: "", from: "", to: "" })}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-rose-700 hover:bg-rose-50 font-semibold cursor-pointer"
              >
                <X size={12} />
                {t("Clear filters", "مسح الفلاتر")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Active search / filter banner */}
      {filtered && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs shadow-2xs" role="status">
          <span>
            {t("Showing filtered results", "معروض نتائج مفلترة")} ({fmtN(data.totalCount)})
            {query && <> — {t("search:", "بحث:")} <strong>“{query}”</strong></>}
            {by && <> — {t("inactive by:", "بواسطة:")} <strong>{by}</strong></>}
            {(dateFrom || dateTo) && (
              <>
                {" "}— {dateType === "Created" ? t("created", "الإنشاء") : t("inactive", "الإيقاف")}: <strong>{dateFrom || "…"} → {dateTo || "…"}</strong>
              </>
            )}
          </span>
          <button type="button" onClick={clearAll} className="shrink-0 px-3 py-1 rounded-xl bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 font-semibold cursor-pointer transition">
            {t("Clear & show all", "مسح وعرض الكل")}
          </button>
        </div>
      )}

      {/* 4. Archive table */}
      {data.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800" role="alert">
          {data.error}
        </div>
      ) : !data.loading && !data.items.length ? (
        <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50/30 p-12 text-center min-h-[260px] flex flex-col items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shadow-2xs">
            <Trash2 size={22} />
          </div>
          <p className="text-sm font-bold text-slate-800">
            {filtered ? t("No inactive shipments match your search or filters", "مفيش شحنات غير نشطة مطابقة للبحث أو الفلاتر") : t("No inactive shipments", "لا توجد شحنات غير نشطة")}
          </p>
          {filtered && (
            <button type="button" onClick={clearAll} className="px-4 py-1.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700 text-xs font-semibold cursor-pointer transition">
              {t("Reset", "إعادة ضبط")}
            </button>
          )}
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
                <th className="py-3 px-3 text-start">{t("Containers / Pieces", "الحاويات / القطع")}</th>
                <th className="py-3 px-3 text-start bg-rose-50/60 text-rose-950 border-x border-rose-100">{t("Inactive By", "تم الإيقاف بواسطة")}</th>
                <th className="py-3 px-3 text-start bg-rose-50/60 text-rose-950">{t("Inactive At", "تاريخ الإيقاف")}</th>
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
                      <tr key={r.id} className={"hover:bg-rose-50/20 transition-colors" + (data.dim ? " opacity-60" : "")}>
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
                        <td className="py-3 px-3 bg-rose-50/30 border-x border-rose-100">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-rose-200 text-rose-800 font-bold shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            <span>{inactiveBy(r, t)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 bg-rose-50/30 font-semibold text-slate-800">{cairoStamp(r.deletedAtUtc, ar)}</td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setDetail(r)}
                              className="inline-flex items-center gap-1.5 bg-slate-900 text-white hover:bg-slate-800 px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer transition"
                            >
                              <Eye size={13} />
                              <span>{t("Details", "التفاصيل")}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setHistoryRow(r)}
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

      {/* 5. Bottom Pagination (matching FCL / FTL layout) */}
      {data.items.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs">
          <div className="flex items-center gap-3 text-slate-500 font-medium">
            <span>
              {ar
                ? `الصفحة ${fmtN(page)} من ${fmtN(pages)} (${fmtN(from)}–${fmtN(to)} من ${fmtN(data.totalCount)} شحنة غير نشطة)`
                : `Page ${fmtN(page)} of ${fmtN(pages)} (${fmtN(from)}–${fmtN(to)} of ${fmtN(data.totalCount)} inactive)`}
            </span>
            <div className="flex items-center gap-1.5 border-s border-slate-200 ps-3">
              <span className="text-slate-400">{t("Per page:", "لكل صفحة:")}</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-md px-1.5 py-0.5 text-slate-700 font-semibold cursor-pointer focus:outline-none focus:border-rose-500"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={navBtn} aria-label={t("Previous page", "الصفحة السابقة")}>
              {ar ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
            {pageList(page, pages).map((p) =>
              typeof p === "string" ? (
                <span key={p} className="px-1 text-slate-400">…</span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  aria-current={p === page ? "page" : undefined}
                  className={`min-w-[28px] px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
                    p === page ? "bg-rose-600 text-white shadow-2xs" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {fmtN(p)}
                </button>
              ),
            )}
            <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className={navBtn} aria-label={t("Next page", "الصفحة التالية")}>
              {ar ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      )}

      {detail && (
        <InactiveDetailsDrawer row={detail} onClose={() => setDetail(null)} onHistory={() => setHistoryRow(detail)} blocked={!!historyRow} />
      )}
      {historyRow && <StatusHistoryDrawer row={historyRow} onClose={() => setHistoryRow(null)} />}
    </div>
  );
}

/* ---------- slide-over full details (read-only) ---------- */

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
        <span className="w-1 h-4 rounded-full bg-rose-500" />
        <span>{children}</span>
      </h4>
      {badge}
    </div>
  );
}

function StatusBefore({ status, t }) {
  const closed = status === "Closed";
  return (
    <span className={"inline-flex items-center gap-1.5 " + (closed ? "text-emerald-700" : "text-sky-700")}>
      <span className={"w-2 h-2 rounded-full " + (closed ? "bg-emerald-500" : "bg-sky-500")} />
      {closed ? t("Closed", "مغلقة") : t("Open", "مفتوحة")}
    </span>
  );
}

// Fields already shown in their own card (or in the containers section).
const SHOWN = new Set([
  "shipmentNumber", "clientId", "shippingLine", "pod", "pol", "mbl", "bookingNumber", "certificateNumber", "acidNumber",
  "etaDate", "numberOfContainers", "containerType", "numberOfPieces", "latestUpdate", "status",
]);

function InactiveDetailsDrawer({ row: r, onClose, onHistory, blocked }) {
  const { fmt, lang, getUpdates } = useApp();
  const { t, fmtN, name, clientName, optionLabel, label, display, stamp } = fmt;
  const ar = lang === "ar";
  const k = r.reportType;
  const info = containerInfo(r);
  const [logs, setLogs] = useState({ items: [], loading: true, error: "" });

  // Update logs load only when the drawer opens.
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
      aria-label={t("Inactive Shipment Full Details", "التفاصيل الكاملة للشحنة غير النشطة")}
    >
      <div
        className="w-full max-w-3xl h-full bg-white shadow-2xl flex flex-col border-s border-slate-200 overflow-hidden"
        style={{ animation: `${ar ? "ccl-drawer-in-rtl" : "ccl-drawer-in"} .25s ease-out` }}
      >
        {/* Header */}
        <div className="p-5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="bg-rose-100 text-rose-600 w-10 h-10 rounded-2xl flex items-center justify-center shrink-0">
              <Trash2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900">{t("Inactive Shipment Full Details", "التفاصيل الكاملة للشحنة غير النشطة")}</h3>
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

        {/* Inactive audit banner */}
        <div className="p-4 border-b bg-rose-50/80 border-rose-100 text-rose-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-4 text-xs flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">{t("Inactive By:", "تم الإيقاف بواسطة:")}</span>
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <strong className="text-rose-900 font-bold">{inactiveBy(r, t)}</strong>
            </div>
            <div>
              <span className="text-slate-500">{t("Inactive At:", "تاريخ وساعة الإيقاف:")} </span>
              <strong className="text-slate-800 font-bold">{cairoStamp(r.deletedAtUtc, ar)}</strong>
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
              <Card label={t("Status before inactive", "الحالة قبل الإيقاف")}>
                <StatusBefore status={r.status} t={t} />
              </Card>
              <Card label={t("Current", "الحالة الحالية")}>
                <span className="inline-flex items-center gap-1.5 text-rose-700">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  {t("Inactive", "غير نشطة")}
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
                        <td className="py-2 px-3 font-bold text-slate-500">{info.count > 1 ? `${fmtN(1)}–${fmtN(info.count)}` : fmtN(1)}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800">{info.parts[0] ? optionLabel(info.parts[0]) : "—"}</td>
                        <td className="py-2 px-3 text-slate-700">{fmtN(info.count)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 3. Customs updates log (read-only) */}
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
                      {i === 0 && <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-semibold">{t("Latest", "الأحدث")}</span>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Lock size={12} className="text-rose-500" />
            {t("Read-Only Inactive Archive", "أرشيف غير النشطة (للقراءة فقط)")}
          </span>
          <div className="flex items-center gap-2">
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
    </div>
  );
}

/* ---------- status history timeline: Created → Closed (if any) → Inactive ---------- */

const NODE = {
  created: { box: "bg-sky-50 border-sky-500 text-sky-600", title: "text-sky-800", Icon: Plus },
  closed: { box: "bg-emerald-50 border-emerald-500 text-emerald-600", title: "text-emerald-800", Icon: CheckCircle2 },
  inactive: { box: "bg-rose-50 border-rose-500 text-rose-600", title: "text-rose-800", Icon: Trash2 },
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

  const events = [
    { id: "created", kind: "created", title: t("Shipment Created", "تم إنشاء الشحنة"), at: r.createdAtUtc, by: r.createdByName || t("Operations", "فريق العمليات") },
    ...(r.closedAtUtc
      ? [{ id: "closed", kind: "closed", title: t("Shipment Closed", "تم إغلاق الشحنة"), at: r.closedAtUtc, by: r.closedByName || t("Operations", "فريق العمليات") }]
      : []),
    { id: "inactive", kind: "inactive", title: t("Moved to Inactive", "تم نقل الشحنة لغير النشطة"), at: r.deletedAtUtc, by: inactiveBy(r, t) },
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-rose-50/30">
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
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-rose-50 text-rose-800 border-rose-300">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              {t("Inactive", "غير نشطة")}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="relative">
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
                        <span className="text-[10.5px] text-slate-400 font-medium shrink-0">{ev.at ? cairoStamp(ev.at, ar) : t("Unknown", "غير محدد")}</span>
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
