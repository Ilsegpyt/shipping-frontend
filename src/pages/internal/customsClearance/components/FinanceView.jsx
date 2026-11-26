import { useEffect, useRef, useState } from "react";
import {
  Banknote,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  PauseCircle,
  RefreshCw,
  RotateCcw,
  Search,
  TrendingUp,
  X,
  XCircle,
} from "lucide-react";
import { useAuth } from "../../../../auth/AuthContext";
import customsClearanceService, { CUSTOMS_PERMISSIONS, hasPermission } from "../../../../services/customsClearanceService";
import C from "../lib/core.js";
import { cairoStamp } from "../lib/drawerHelpers.js";
import { apiError, useApp } from "../AppState.jsx";

// Customs Finance: Open Ocean Import shipments, Cairo dates. Rules live in the API (GET /finance?tab=…):
//   Forecast  Today <= ETA <= Today + 15
//   Request   ETA = tomorrow (no decision yet), restored, or deferred until today or earlier
//   Approved  approved from the request list
//   Excluded  on hold, or deferred to a later date (shown inside the Finance Request tab)
const PAGE_SIZES = [10, 20, 50, 100];
const CURRENCIES = ["egp", "eur", "usd"];
const CANCELED = (err) => err?.code === "ERR_CANCELED" || err?.name === "CanceledError";

const TABS = [
  { key: "Forecast", icon: TrendingUp, en: "Forecast", ar: "التوقعات" },
  { key: "Request", icon: ClipboardList, en: "Finance Request", ar: "طلب التمويل" },
  { key: "Approved", icon: CheckCircle2, en: "Approved Requests", ar: "الطلبات المعتمدة" },
];

const addDays = (iso, n) => new Date(Date.parse(iso + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);

export default function FinanceView() {
  const { fmt, lang, toast } = useApp();
  const { t, fmtN, clientName, display } = fmt;
  const ar = lang === "ar";
  const { user } = useAuth();
  const canAct = hasPermission(user, CUSTOMS_PERMISSIONS.edit);

  const [tab, setTab] = useState("Forecast");
  const [excludedView, setExcludedView] = useState(false); // Finance Request: pending list or excluded / on hold
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [version, setVersion] = useState(0); // bumped after every action and on Refresh
  const [answer, setAnswer] = useState({ key: "", items: [], totalCount: 0, today: "", totals: null, error: "" });
  const [counts, setCounts] = useState(null);
  const [modal, setModal] = useState(null); // { type: "approve" | "exclude", row }
  const seq = useRef(0);

  const apiTab = tab === "Request" && excludedView ? "Excluded" : tab;
  const requestKey = [apiTab, page, pageSize, query, version].join("|");
  const loading = answer.key !== requestKey;

  // Debounced search (300 ms), back to page 1.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // One page per request; stale requests are aborted and their answers ignored.
  useEffect(() => {
    const mine = ++seq.current;
    const controller = new AbortController();
    customsClearanceService
      .getFinance({ tab: apiTab, pageNumber: page, pageSize, search: query, signal: controller.signal })
      .then((res) => {
        if (mine !== seq.current) return;
        setAnswer({ key: requestKey, items: res?.items || [], totalCount: res?.totalCount || 0, today: res?.today || "", totals: res?.totals || null, error: "" });
      })
      .catch((err) => {
        if (CANCELED(err) || mine !== seq.current) return;
        setAnswer((a) => ({ ...a, key: requestKey, items: [], totalCount: 0, error: apiError(err, "Could not load the finance list.") }));
      });
    return () => controller.abort();
  }, [apiTab, page, pageSize, query, requestKey]);

  // Tab badges.
  useEffect(() => {
    const controller = new AbortController();
    customsClearanceService
      .getFinanceCounts({ signal: controller.signal })
      .then((c) => setCounts(c || null))
      .catch(() => {});
    return () => controller.abort();
  }, [version]);

  // Escape closes the action popup first (before the page's own Escape handling).
  useEffect(() => {
    if (!modal) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setModal(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [modal]);

  const today = answer.today || counts?.today || C.today();
  const switchTab = (k) => {
    setTab(k);
    setExcludedView(false);
    setPage(1);
  };
  const switchExcluded = (on) => {
    setExcludedView(on);
    setPage(1);
  };
  const refresh = () => setVersion((v) => v + 1);

  const done = (message) => {
    setModal(null);
    toast(message);
    refresh();
  };
  const restore = async (row) => {
    try {
      await customsClearanceService.restoreFinance(row.id);
      toast(t("Restored to the finance request list.", "رجعت لقائمة طلب التمويل."));
      refresh();
    } catch (err) {
      toast(apiError(err, "Could not restore the request."), true);
    }
  };

  const totalPages = Math.max(1, Math.ceil(answer.totalCount / pageSize));
  const rows = answer.items;
  const date = (v) => (v ? display(v, { key: "etaDate", type: "date" }) : "—");
  const amount = (v) => (v == null ? <span className="text-slate-300">—</span> : Number(v).toLocaleString(ar ? "ar-EG" : "en-US", { minimumFractionDigits: 2 }));
  const daysTo = (eta) => {
    const d = C.days(String(eta).slice(0, 10), today);
    if (!Number.isFinite(d)) return "";
    if (d === 0) return t("today", "النهارده");
    if (d === 1) return t("tomorrow", "بكرة");
    return t(`in ${d} days`, `بعد ${fmtN(d)} يوم`);
  };
  const countOf = (k) => (counts ? (k === "Forecast" ? counts.forecast : k === "Request" ? counts.request : counts.approved) : null);

  const tabNote = {
    Forecast: t(
      `Open Ocean Import shipments with ETA from today to ${date(addDays(today, 15))} (15 days ahead).`,
      `شحنات الوارد البحري المفتوحة اللي ETA بتاعها من النهارده لحد ${date(addDays(today, 15))} (15 يوم).`,
    ),
    Request: excludedView
      ? t("Excluded requests: on hold, or deferred to a later date. Restore one to send it back to the request list.", "الطلبات المستبعدة: موقوفة أو مؤجلة لتاريخ لاحق. استرجع أي طلب علشان يرجع لقائمة الطلبات.")
      : t(
          `Shipments arriving tomorrow (${date(addDays(today, 1))}), plus deferred requests that are due and restored ones.`,
          `الشحنات الواصلة بكرة (${date(addDays(today, 1))})، ومعاها الطلبات المؤجلة اللي ميعادها جه والمسترجعة.`,
        ),
    Approved: t("Requests approved from the Finance Request list, while the shipment is still open.", "الطلبات اللي اتعتمدت من قائمة طلب التمويل، طول ما الشحنة لسه مفتوحة."),
  }[tab];

  return (
    <div className="ccl-tw">
      <div className="space-y-4 text-slate-800">
        {/* Hero */}
        <div className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-white to-emerald-50/40 p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center shadow-2xs">
              <Banknote size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t("Customs Finance", "تمويل التخليص الجمركي")}</h2>
              <p className="text-xs text-slate-500 font-medium">
                {t("Open Ocean Import shipments", "شحنات الوارد البحري المفتوحة")} · {t("Cairo date", "تاريخ القاهرة")}{" "}
                <strong className="text-slate-700">{date(today)}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs cursor-pointer transition"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            {t("Refresh", "تحديث")}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2" role="tablist">
          {TABS.map(({ key, icon: Icon, en, ar: arText }) => {
            const on = tab === key;
            const n = countOf(key);
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => switchTab(key)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition cursor-pointer ${
                  on ? "bg-[#0f4c81] text-white border-[#0f4c81] shadow-sm" : "bg-white text-slate-700 border-slate-200 hover:border-sky-300 hover:bg-sky-50"
                }`}
              >
                <Icon size={15} />
                {t(en, arText)}
                {n != null && (
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${on ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>{fmtN(n)}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs">
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-3 justify-between">
            <p className="text-xs text-slate-500 max-w-2xl">{tabNote}</p>
            <div className="flex flex-wrap items-center gap-2">
              {tab === "Request" && (
                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => switchExcluded(false)}
                    className={`px-3 py-1.5 rounded-lg cursor-pointer transition ${!excludedView ? "bg-white text-sky-800 shadow-2xs" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    {t("Pending", "قيد الطلب")}
                    {counts && <span className="ms-1.5 text-slate-400">{fmtN(counts.request)}</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => switchExcluded(true)}
                    className={`px-3 py-1.5 rounded-lg cursor-pointer transition ${excludedView ? "bg-white text-amber-800 shadow-2xs" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    {t("Excluded / On Hold", "مستبعدة / موقوفة")}
                    {counts && <span className="ms-1.5 text-slate-400">{fmtN(counts.excluded)}</span>}
                  </button>
                </div>
              )}
              <label className="relative">
                <Search size={14} className="absolute top-1/2 -translate-y-1/2 start-3 text-slate-400 pointer-events-none" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("Shipment #, MB/L or certificate…", "رقم العملية أو البوليصة أو الشهادة…")}
                  className="w-64 rounded-xl border border-slate-300 bg-white ps-9 pe-3 py-2 text-xs outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-200/70"
                />
              </label>
            </div>
          </div>

          {/* Approved: currency totals */}
          {tab === "Approved" && (
            <div className="p-4 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {CURRENCIES.map((c) => (
                <div key={c} className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <div className="text-[11px] font-bold text-emerald-800 uppercase">{t("Total", "الإجمالي")} {c.toUpperCase()}</div>
                  <div className="text-lg font-bold text-slate-800 mt-0.5">{amount(answer.totals?.[c])}</div>
                  {answer.totals?.[c] == null && <div className="text-[10.5px] text-slate-400">{t("Amounts not available yet", "المبالغ لسه مش متاحة")}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                  <th className="py-2.5 px-3 text-start">{t("Shipment #", "رقم العملية")}</th>
                  <th className="py-2.5 px-3 text-start">{t("Client", "العميل")}</th>
                  <th className="py-2.5 px-3 text-start">{t("ETA", "الوصول المتوقع")}</th>
                  {tab === "Request" && <th className="py-2.5 px-3 text-start">{excludedView ? t("Excluded as", "الاستبعاد") : t("Request", "الطلب")}</th>}
                  {tab === "Approved" && <th className="py-2.5 px-3 text-start">{t("Approved", "الاعتماد")}</th>}
                  {!(tab === "Request" && excludedView) &&
                    CURRENCIES.map((c) => (
                      <th key={c} className="py-2.5 px-3 text-end">
                        {c.toUpperCase()}
                      </th>
                    ))}
                  {(tab === "Request" || tab === "Approved") && canAct && <th className="py-2.5 px-3 text-end">{t("Actions", "الإجراءات")}</th>}
                </tr>
              </thead>
              <tbody className={`divide-y divide-slate-100 ${loading && rows.length ? "opacity-60" : ""}`}>
                {loading && !rows.length
                  ? [0, 1, 2, 3].map((i) => (
                      <tr key={i}>
                        <td colSpan={9} className="py-2 px-3">
                          <div className="h-6 bg-slate-100 rounded-lg animate-pulse" />
                        </td>
                      </tr>
                    ))
                  : rows.map((r) => (
                      <tr key={r.id} className="hover:bg-sky-50/40 transition">
                        <td className="py-2.5 px-3 font-bold text-slate-800" dir="auto">
                          {r.shipmentNumber || <span className="text-slate-400 font-normal">—</span>}
                          <div className="text-[10.5px] font-mono font-normal text-slate-400">{r.mbl}</div>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700" dir="auto">{clientName(r.clientId) || "—"}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="font-semibold text-slate-800">{date(r.etaDate)}</span>
                          <span className="ms-1.5 text-[10.5px] text-slate-400">{daysTo(r.etaDate)}</span>
                        </td>
                        {tab === "Request" && (
                          <td className="py-2.5 px-3">
                            <RequestState row={r} t={t} date={date} excludedView={excludedView} ar={ar} />
                          </td>
                        )}
                        {tab === "Approved" && (
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="font-semibold text-emerald-800">{r.approvedByName || "—"}</div>
                            <div className="text-[10.5px] text-slate-400">{cairoStamp(r.approvedAtUtc, ar)}</div>
                            {r.note && (
                              <div className="text-[10.5px] text-slate-500 max-w-[220px] truncate" dir="auto" title={r.note}>
                                {r.note}
                              </div>
                            )}
                          </td>
                        )}
                        {!(tab === "Request" && excludedView) &&
                          CURRENCIES.map((c) => (
                            <td key={c} className="py-2.5 px-3 text-end font-semibold tabular-nums">
                              {amount(r[c])}
                            </td>
                          ))}
                        {(tab === "Request" || tab === "Approved") && canAct && (
                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-end gap-1.5">
                              {tab === "Approved" ? (
                                <button
                                  type="button"
                                  onClick={() => setModal({ type: "exclude", row: r })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-200 bg-white text-amber-800 hover:bg-amber-50 font-semibold cursor-pointer transition"
                                >
                                  <XCircle size={12} />
                                  {t("Exclude", "استبعاد")}
                                </button>
                              ) : excludedView ? (
                                <button
                                  type="button"
                                  onClick={() => restore(r)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-sky-200 bg-white text-sky-700 hover:bg-sky-50 font-semibold cursor-pointer transition"
                                >
                                  <RotateCcw size={12} />
                                  {t("Restore", "استرجاع")}
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setModal({ type: "approve", row: r })}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold cursor-pointer transition"
                                  >
                                    <CheckCircle2 size={12} />
                                    {t("Approve", "اعتماد")}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setModal({ type: "exclude", row: r })}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-200 bg-white text-amber-800 hover:bg-amber-50 font-semibold cursor-pointer transition"
                                  >
                                    <XCircle size={12} />
                                    {t("Exclude", "استبعاد")}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
              </tbody>
            </table>
            {!loading && answer.error && (
              <p role="alert" className="m-4 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {answer.error}
              </p>
            )}
            {!loading && !answer.error && !rows.length && (
              <div className="m-4 py-8 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400 italic font-medium">
                {query ? t("No shipments match this search.", "مفيش شحنات مطابقة للبحث.") : t("No shipments in this list right now.", "مفيش شحنات في القائمة دي دلوقتي.")}
              </div>
            )}
          </div>

          {/* Pager */}
          <div className="p-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              {fmtN(answer.totalCount)} {t("shipments", "شحنة")}
            </span>
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1"
                aria-label={t("Rows per page", "عدد الصفوف")}
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center disabled:opacity-40 cursor-pointer"
                aria-label={t("Previous page", "الصفحة السابقة")}
              >
                {ar ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              </button>
              <span className="font-semibold text-slate-700">
                {fmtN(page)} / {fmtN(totalPages)}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center disabled:opacity-40 cursor-pointer"
                aria-label={t("Next page", "الصفحة التالية")}
              >
                {ar ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {modal?.type === "approve" && (
        <ApproveModal row={modal.row} onClose={() => setModal(null)} onDone={() => done(t("Approved: moved to Approved Requests.", "اتعتمد واتنقل للطلبات المعتمدة."))} />
      )}
      {modal?.type === "exclude" && (
        <ExcludeModal row={modal.row} today={today} onClose={() => setModal(null)} onDone={(msg) => done(msg)} />
      )}
    </div>
  );
}

/* ---------- request list state column ---------- */
function RequestState({ row: r, t, date, excludedView, ar }) {
  if (excludedView) {
    return (
      <div className="space-y-0.5">
        {r.financeStatus === "OnHold" ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
            <PauseCircle size={11} />
            {t("On hold", "موقوفة")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
            <CalendarClock size={11} />
            {t("Deferred to ", "مؤجلة لـ ")}
            {date(r.deferredUntilDate)}
          </span>
        )}
        {r.note && (
          <div className="text-[10.5px] text-slate-500 max-w-[260px] truncate" dir="auto" title={r.note}>
            {r.note}
          </div>
        )}
        <div className="text-[10.5px] text-slate-400">
          {r.updatedByName || "—"} · {cairoStamp(r.updatedAtUtc, ar)}
        </div>
      </div>
    );
  }
  if (r.financeStatus === "Deferred")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
        <CalendarClock size={11} />
        {t("Deferred, due ", "مؤجلة، ميعادها ")}
        {date(r.deferredUntilDate)}
      </span>
    );
  if (r.financeStatus === "Pending")
    return <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200 font-semibold">{t("Restored", "مسترجعة")}</span>;
  return <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">{t("New · arrives tomorrow", "جديد · واصلة بكرة")}</span>;
}

/* ---------- popups ---------- */
function ModalShell({ title, icon, tone, row, onClose, children, footer }) {
  const { fmt } = useApp();
  const { t, clientName } = fmt;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden" role="dialog" aria-modal="true" aria-label={title}>
        <div className={`px-5 py-4 border-b flex items-center justify-between ${tone}`}>
          <div className="flex items-center gap-2.5">
            {icon}
            <h3 className="text-sm font-bold">{title}</h3>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-white/70 flex items-center justify-center cursor-pointer" aria-label={t("Close", "إغلاق")}>
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="text-[10px] text-slate-400">{t("Shipment #", "رقم العملية")}</div>
              <div className="font-bold text-slate-800" dir="auto">{row.shipmentNumber || "—"}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <div className="text-[10px] text-slate-400">{t("Client", "العميل")}</div>
              <div className="font-bold text-slate-800" dir="auto">{clientName(row.clientId) || "—"}</div>
            </div>
          </div>
          {children}
        </div>
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">{footer}</div>
      </div>
    </div>
  );
}

const NOTE_CLASS =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-200/70";

function ApproveModal({ row, onClose, onDone }) {
  const { fmt } = useApp();
  const { t } = fmt;
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await customsClearanceService.approveFinance(row.id, note);
      onDone();
    } catch (err) {
      setError(apiError(err, "Could not approve the request."));
      setBusy(false);
    }
  };

  return (
    <ModalShell
      title={t("Approve finance request", "اعتماد طلب التمويل")}
      icon={<CheckCircle2 size={18} className="text-emerald-600" />}
      tone="bg-emerald-50/70 border-emerald-100 text-emerald-900"
      row={row}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer">
            {t("Cancel", "إلغاء")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
          >
            {busy && <RefreshCw size={12} className="animate-spin" />}
            {t("Approve", "اعتماد")}
          </button>
        </>
      }
    >
      <p className="text-slate-600">{t("The shipment moves to Approved Requests and leaves the request list.", "الشحنة هتتنقل للطلبات المعتمدة وتخرج من قائمة الطلبات.")}</p>
      <label className="block space-y-1">
        <span className="font-semibold text-slate-600">{t("Note (optional)", "ملاحظة (اختياري)")}</span>
        <textarea rows={2} maxLength={500} dir="auto" value={note} onChange={(e) => setNote(e.target.value)} className={NOTE_CLASS} />
      </label>
      {error && (
        <p role="alert" className="text-rose-700 font-semibold">
          {error}
        </p>
      )}
    </ModalShell>
  );
}

function ExcludeModal({ row, today, onClose, onDone }) {
  const { fmt } = useApp();
  const { t } = fmt;
  const tomorrow = addDays(today, 1);
  const [mode, setMode] = useState("Defer");
  const [until, setUntil] = useState(tomorrow);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (mode === "Defer" && (!until || until < tomorrow)) {
      setError(t("Choose a date after today.", "اختار تاريخ بعد النهارده."));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await customsClearanceService.excludeFinance(row.id, { mode, deferredUntilDate: until, note });
      onDone(mode === "Defer" ? t("Deferred: it returns to the request list on that date.", "اتأجل: هيرجع لقائمة الطلبات في التاريخ ده.") : t("Put on hold.", "اتوقف."));
    } catch (err) {
      setError(apiError(err, "Could not exclude the request."));
      setBusy(false);
    }
  };

  const option = (key, icon, title, hint) => (
    <button
      type="button"
      onClick={() => setMode(key)}
      aria-pressed={mode === key}
      className={`text-start p-3 rounded-xl border transition cursor-pointer ${mode === key ? "border-amber-400 bg-amber-50 ring-2 ring-amber-200" : "border-slate-200 bg-white hover:bg-slate-50"}`}
    >
      <div className="flex items-center gap-1.5 font-bold text-slate-800">
        {icon}
        {title}
      </div>
      <div className="text-[10.5px] text-slate-500 mt-0.5">{hint}</div>
    </button>
  );

  return (
    <ModalShell
      title={t("Exclude from finance request", "استبعاد من طلب التمويل")}
      icon={<XCircle size={18} className="text-amber-600" />}
      tone="bg-amber-50/70 border-amber-100 text-amber-900"
      row={row}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer">
            {t("Cancel", "إلغاء")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
          >
            {busy && <RefreshCw size={12} className="animate-spin" />}
            {t("Exclude", "استبعاد")}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2.5">
        {option("Defer", <CalendarClock size={13} className="text-amber-600" />, t("Defer to date", "تأجيل لتاريخ"), t("Back on the request list on that date.", "يرجع لقائمة الطلبات في التاريخ ده."))}
        {option("OnHold", <PauseCircle size={13} className="text-slate-600" />, t("On hold", "إيقاف"), t("Stays out until restored by hand.", "يفضل برّه لحد ما يتسترجع يدوي."))}
      </div>
      {mode === "Defer" && (
        <label className="block space-y-1">
          <span className="font-semibold text-slate-600">{t("Defer until (Cairo date)", "التأجيل لحد (تاريخ القاهرة)")}</span>
          <div className="flex items-center gap-2">
            <input type="date" min={tomorrow} value={until} onChange={(e) => setUntil(e.target.value)} className={NOTE_CLASS + " max-w-[180px]"} />
            <button type="button" onClick={() => setUntil(tomorrow)} className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer">
              {t("Next request (tomorrow)", "الطلب الجاي (بكرة)")}
            </button>
          </div>
        </label>
      )}
      <label className="block space-y-1">
        <span className="font-semibold text-slate-600">{t("Reason (optional)", "السبب (اختياري)")}</span>
        <textarea rows={2} maxLength={500} dir="auto" value={note} onChange={(e) => setNote(e.target.value)} className={NOTE_CLASS} />
      </label>
      {error && (
        <p role="alert" className="text-rose-700 font-semibold">
          {error}
        </p>
      )}
    </ModalShell>
  );
}
