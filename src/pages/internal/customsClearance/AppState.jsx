import { cloneElement, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import customsClearanceService from "../../../services/customsClearanceService";
import { emptyDashFilter, makeFilter, makeFmt } from "./lib/format.js";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const STATUS = { open: "Open", closed: "Closed" };
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
  const [filters, setFilters] = useState({ open: makeFilter(), closed: makeFilter() });
  const [selections, setSelections] = useState({ open: new Set(), closed: new Set() });
  const [dashFilter, setDashFilter] = useState(emptyDashFilter);
  const [closedOpen, setClosedOpen] = useState(false);
  const [updatesCtx, setUpdatesCtx] = useState(null); // { scope, id }
  const [dialog, setDialog] = useState(null); // React element
  const [toastState, setToastState] = useState({ msg: "", error: false, on: false });

  const [lookups, setLookups] = useState(emptyLookups);

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
    const timer = setTimeout(() => loadTable("open", kind, { q: openQ, page: openPage, size: openSize }), openQ ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadTable, kind, openQ, openPage, openSize, reloadKey.open]);

  const { q: closedQ, page: closedPage, size: closedSize } = filters.closed;
  useEffect(() => {
    if (!closedOpen) return;
    const timer = setTimeout(() => loadTable("closed", closedKind, { q: closedQ, page: closedPage, size: closedSize }), closedQ ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadTable, closedOpen, closedKind, closedQ, closedPage, closedSize, reloadKey.closed]);

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
  const resetFilter = (scope) => {
    setFilters((f) => ({ ...f, [scope]: makeFilter() }));
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
    resetFilter("open");
    setDashFilter(emptyDashFilter());
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
    lookups, data, tables, reload, createShipment, updateShipment, closeShipment, getUpdates, addUpdate,
    drafts, setDrafts,
    filters, setFilter, resetFilter, selections, setSelection, clearSelection,
    dashFilter, setDashFilter, closedOpen, setClosedOpen, openClosed,
    updatesCtx, setUpdatesCtx, dialog, openDialog, closeDialog,
    toast, toastState, fmt, charts, dashSnapshot,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
