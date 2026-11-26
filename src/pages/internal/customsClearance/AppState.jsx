import { cloneElement, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import customsClearanceService from "../../../services/customsClearanceService";
import { emptyDashFilter, makeFilter, makeFmt } from "./lib/format.js";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const STATUS = { open: "Open", closed: "Closed" };
// Open Ocean Import pages come from the API ordered by ETA; the page sort follows that by default.
const openFilter = (k) => (k === "OceanImport" ? { ...makeFilter(), sort: "etaDate", dir: "asc" } : makeFilter());
const emptyTable = () => ({ items: [], totalCount: 0, loading: false, error: "" });
const emptyLookups = () => ({ clients: [], ports: [], shippingLines: [], terminals: [], containerTypes: [], clearanceTypes: [], loaded: false, error: "" });

/** Turns an API error (Result error string, validation errors or network failure) into one readable message. */
export function apiError(err, fallback = "Request failed.") {
  const data = err?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (data?.errors && typeof data.errors === "object")
    return Object.values(data.errors).flat().filter(Boolean).join("\n") || data.title || fallback;
  if (data?.title) return data.title;
  if (data?.detail) return data.detail;
  return err?.message || fallback;
}

/**
 * Single store for the Customs Clearance page.
 * The open table and the closed archive are pages from the API (server-side paging & search).
 */
export function AppProvider({ children, initialView = "entry" }) {
  const [lang, setLang] = useState("en");
  const [theme, setTheme] = useState("light");
  const [rootEl, setRootEl] = useState(null); // .ccl-root element; portals render inside it so scoped CSS applies
  const [view, setView] = useState(initialView);
  useEffect(() => {
    setView(initialView);
  }, [initialView]);
  const [kind, setKind] = useState("OceanImport");
  const [closedKind, setClosedKind] = useState("OceanImport");
  const [tables, setTables] = useState({ open: emptyTable(), closed: emptyTable() });
  const [reloadKey, setReloadKey] = useState({ open: 0, closed: 0 });
  const [drafts, setDrafts] = useState({});
  const [filters, setFilters] = useState({ open: openFilter("OceanImport"), closed: makeFilter() });
  const [selections, setSelections] = useState({ open: new Set(), closed: new Set() });
  const [dashFilter, setDashFilter] = useState(emptyDashFilter);
  const [closedOpen, setClosedOpen] = useState(false);
  const [updatesCtx, setUpdatesCtx] = useState(null); // { scope, id }
  const [dialog, setDialog] = useState(null); // React element
  const [toastState, setToastState] = useState({ msg: "", error: false, on: false });

  const [lookups, setLookups] = useState(emptyLookups);
  // Alerts 1 & 4 (Open Ocean Import): server-side filter of the open table + counts over all open shipments.
  const [alertFilter, setAlertFilterState] = useState(""); // "" | EtaSoon | EtaOverdue | FreeTimeSoon | FreeTimeExpired | Any
  const [alertsSummary, setAlertsSummary] = useState(null);

  const data = useMemo(
    () => ({
      OceanImport: [...(tables.open.items || []), ...(tables.closed.items || [])].filter((x) => x.reportType === "OceanImport"),
      OceanExport: [...(tables.open.items || []), ...(tables.closed.items || [])].filter((x) => x.reportType === "OceanExport"),
      Domestic: [...(tables.open.items || []), ...(tables.closed.items || [])].filter((x) => x.reportType === "Domestic"),
    }),
    [tables],
  );

  // Dropdown sources (clients, ports, shipping lines, terminals), loaded once when the page opens.
  useEffect(() => {
    let alive = true;
    customsClearanceService
      .getLookups()
      .then((data) => alive && setLookups({ ...emptyLookups(), ...data, loaded: true }))
      .catch((err) => alive && setLookups({ ...emptyLookups(), loaded: true, error: apiError(err, "Could not load the dropdown lists.") }));
    return () => {
      alive = false;
    };
  }, []);

  const fmt = useMemo(() => makeFmt(lang, lookups), [lang, lookups]);
  const toastTimer = useRef();
  const requestSeq = useRef({ open: 0, closed: 0 });
  const charts = useRef(new Map()); // chart id -> Chart.js instance (for PDF export)
  const dashSnapshot = useRef(null); // latest dashboard numbers (for PDF / email)

  const toast = useCallback((msg, error = false) => {
    clearTimeout(toastTimer.current);
    setToastState({ msg, error, on: true });
    toastTimer.current = setTimeout(() => setToastState((s) => ({ ...s, on: false })), 5500);
  }, []);

  /* ---------- loading pages from the API ---------- */
  const loadTable = useCallback(async (scope, reportType, f) => {
    const seq = ++requestSeq.current[scope];
    setTables((t) => ({ ...t, [scope]: { ...t[scope], loading: true, error: "" } }));
    try {
      const page = await customsClearanceService.getAll({
        reportType,
        status: STATUS[scope],
        pageNumber: f.page + 1,
        pageSize: f.size,
        search: f.q,
        alert: f.alert,
      });
      if (seq !== requestSeq.current[scope]) return; // a newer request already answered
      setTables((t) => ({ ...t, [scope]: { items: page.items || [], totalCount: page.totalCount || 0, loading: false, error: "" } }));
    } catch (err) {
      if (seq !== requestSeq.current[scope]) return;
      setTables((t) => ({ ...t, [scope]: { ...emptyTable(), error: apiError(err, "Could not load shipments.") } }));
    }
  }, []);

  // Only search, page and page size go to the server; sort / column / fields stay on the client.
  const { q: openQ, page: openPage, size: openSize } = filters.open;
  useEffect(() => {
    // Short delay so typing in the search box sends one request, not one per key.
    const alert = kind === "OceanImport" ? alertFilter : "";
    const timer = setTimeout(() => loadTable("open", kind, { q: openQ, page: openPage, size: openSize, alert }), openQ ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadTable, kind, openQ, openPage, openSize, alertFilter, reloadKey.open]);

  // Alert counts: on load, after every open-table change, when the tab regains focus, and every 5 minutes
  // (so "today" in Cairo moves on if the page stays open past midnight).
  const loadAlertsSummary = useCallback(async () => {
    try {
      setAlertsSummary(await customsClearanceService.getAlertsSummary());
    } catch {
      setAlertsSummary(null);
    }
  }, []);
  useEffect(() => {
    loadAlertsSummary();
  }, [loadAlertsSummary, reloadKey.open]);
  useEffect(() => {
    // Focus refreshes only the counts; the 5-minute tick also reloads the open table so row highlights follow.
    const onFocus = () => loadAlertsSummary();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") setReloadKey((r) => ({ ...r, open: r.open + 1 }));
    }, 5 * 60 * 1000);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadAlertsSummary]);

  const { q: closedQ, page: closedPage, size: closedSize } = filters.closed;
  useEffect(() => {
    if (!closedOpen) return;
    const timer = setTimeout(() => loadTable("closed", closedKind, { q: closedQ, page: closedPage, size: closedSize }), closedQ ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadTable, closedOpen, closedKind, closedQ, closedPage, closedSize, reloadKey.closed]);

  // Tab badges: one grouped count query (no rows), refreshed whenever the open or closed table reloads.
  // Inactive rows themselves are only fetched by the Inactive archive view, page by page.
  const [counts, setCounts] = useState(null); // { open, closed, inactive } x { oceanImport, oceanExport, domestic, total }
  const [countsKey, setCountsKey] = useState(0);
  const [inactiveVersion, setInactiveVersion] = useState(0); // bumps when a shipment is deactivated (archive cache key)
  const refreshCounts = useCallback(() => setCountsKey((k) => k + 1), []);
  useEffect(() => {
    let alive = true;
    customsClearanceService
      .getCounts()
      .then((c) => alive && setCounts(c))
      .catch(() => alive && setCounts(null));
    return () => {
      alive = false;
    };
  }, [reloadKey.open, reloadKey.closed, inactiveVersion, countsKey]);

  const reload = useCallback((scope) => setReloadKey((r) => ({ ...r, [scope]: r[scope] + 1 })), []);

  /* ---------- API actions: each returns { ok, error } ---------- */
  const run = useCallback(async (call, fallback) => {
    try {
      const value = await call();
      return { ok: true, value };
    } catch (err) {
      return { ok: false, error: apiError(err, fallback) };
    }
  }, []);

  const createShipment = useCallback(
    async (payload) => {
      const result = await run(() => customsClearanceService.create(payload), "Could not create the shipment.");
      if (result.ok) reload("open");
      return result;
    },
    [run, reload],
  );

  const updateShipment = useCallback(
    async (id, payload) => {
      const result = await run(() => customsClearanceService.update(id, payload), "Could not save the shipment.");
      if (result.ok) reload("open");
      return result;
    },
    [run, reload],
  );

  const closeShipment = useCallback(
    async (id) => {
      const result = await run(() => customsClearanceService.close(id), "Could not close the shipment.");
      if (result.ok) {
        reload("open");
        reload("closed");
      }
      return result;
    },
    [run, reload],
  );

  // Soft delete. The row leaves the open table at once and the badges move by one; the page then reloads to refill.
  const deactivateShipment = useCallback(
    async (row) => {
      const result = await run(() => customsClearanceService.deactivate(row.id), "Could not move the shipment to Inactive.");
      if (!result.ok) return result;
      const scope = row.status === "Closed" ? "closed" : "open";
      setTables((t) => ({
        ...t,
        [scope]: {
          ...t[scope],
          items: t[scope].items.filter((x) => x.id !== row.id),
          totalCount: Math.max(0, (t[scope].totalCount || 0) - 1),
        },
      }));
      const reportKey = { OceanImport: "oceanImport", OceanExport: "oceanExport", Domestic: "domestic" }[row.reportType];
      setCounts((c) => {
        if (!c || !reportKey) return c;
        const move = (bucket, d) => ({ ...bucket, [reportKey]: Math.max(0, (bucket[reportKey] || 0) + d), total: Math.max(0, (bucket.total || 0) + d) });
        return { ...c, [scope]: move(c[scope], -1), inactive: move(c.inactive, 1) };
      });
      setSelections((s) => {
        const n = new Set(s[scope]);
        n.delete(row.id);
        return { ...s, [scope]: n };
      });
      setInactiveVersion((v) => v + 1);
      reload(scope);
      return result;
    },
    [run, reload],
  );

  const getUpdates = useCallback((id) => run(() => customsClearanceService.getUpdates(id), "Could not load the updates."), [run]);

  const addUpdate = useCallback(
    async (id, text) => {
      const result = await run(() => customsClearanceService.addUpdate(id, text), "Could not add the update.");
      if (result.ok) reload("open");
      return result;
    },
    [run, reload],
  );

  /* ---------- table / filter state ---------- */
  const scopeKind = (scope) => (scope === "closed" ? closedKind : kind);
  const setFilter = (scope, patch) =>
    setFilters((f) => ({ ...f, [scope]: { ...f[scope], ...(typeof patch === "function" ? patch(f[scope]) : patch) } }));
  // Reset brings the open table back to its default sort (ETA ascending for Ocean Import).
  const resetFilter = (scope, k = kind) => {
    setFilters((f) => ({ ...f, [scope]: scope === "open" ? openFilter(k) : makeFilter() }));
    clearSelection(scope);
  };
  const setSelection = (scope, set) => setSelections((s) => ({ ...s, [scope]: set }));
  const clearSelection = (scope) => setSelections((s) => ({ ...s, [scope]: new Set() }));

  const switchKind = (k, scope = "open") => {
    if (scope === "closed") {
      setClosedKind(k);
      resetFilter("closed");
      return;
    }
    setKind(k);
    resetFilter("open", k);
    setAlertFilterState("");
    setDashFilter(emptyDashFilter());
  };
  // Choosing an alert chip filters the open table from its first page; choosing it again clears it.
  const setAlertFilter = (value) => {
    setAlertFilterState((cur) => (cur === value ? "" : value));
    setFilter("open", { page: 0 });
    clearSelection("open");
  };
  const openClosed = () => {
    setClosedKind(kind);
    resetFilter("closed");
    setClosedOpen(true);
  };

  const dialogSeq = useRef(0);
  // A fresh key per open: every dialog starts with clean local state and focus.
  const openDialog = useCallback((el) => setDialog(cloneElement(el, { key: ++dialogSeq.current })), []);
  const closeDialog = useCallback(() => setDialog(null), []);

  const value = {
    lang, setLang, theme, setTheme, rootEl, setRootEl, view, setView, kind, closedKind, scopeKind, switchKind,
    alertFilter, setAlertFilter, alertsSummary,
    counts, refreshCounts, inactiveVersion, deactivateShipment,
    lookups, data, tables, reload, createShipment, updateShipment, closeShipment, getUpdates, addUpdate,
    drafts, setDrafts,
    filters, setFilter, resetFilter, selections, setSelection, clearSelection,
    dashFilter, setDashFilter, closedOpen, setClosedOpen, openClosed,
    updatesCtx, setUpdatesCtx, dialog, openDialog, closeDialog,
    toast, toastState, fmt, charts, dashSnapshot,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
