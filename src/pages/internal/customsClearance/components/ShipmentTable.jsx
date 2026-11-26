import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { useAuth } from "../../../../auth/AuthContext";
import { CUSTOMS_PERMISSIONS, hasPermission } from "../../../../services/customsClearanceService";
import C from "../lib/core.js";
import { fieldColor, fieldWidth } from "../lib/format.js";
import { useApp } from "../AppState.jsx";
import OptionSelect from "./OptionSelect.jsx";
import ContainerCell from "./ContainerCell.jsx";
import ActiveDetailsDrawer from "./ActiveDetailsDrawer.jsx";
import { closeShipmentDialog, deactivateShipmentDialog } from "./dialogs/TableDialogs.jsx";
import { FOCUS_ROW_EVENT, alertBadge, alertTone, alertTooltip } from "../lib/alertText.js";

// Alert 2 (free time end) and Alert 3 (D/O date): errors on these fields stay on the row until fixed or cancelled.
const ARRIVAL_KEYS = ["dateOfFreeTimeEnd", "doDate"];

/* ---------- one editable field while its row is in Edit mode (keys never save or cancel: only the Save / Cancel buttons do) ---------- */
function FieldInput({ k, f, value, pod, onChange }) {
  const v = value ?? "";
  if (C.dropdownKeys.includes(f.key))
    return <OptionSelect k={k} fieldKey={f.key} value={String(v)} context={f.key === "terminal" ? { pod } : undefined} onChange={onChange} />;
  if (f.type === "note")
    return <textarea rows={2} maxLength={2000} dir="auto" value={v} onChange={(e) => onChange(e.target.value)} />;
  return (
    <input
      type={f.type === "date" ? "date" : f.type === "datetime" ? "datetime-local" : "text"}
      inputMode={f.type === "number" ? "numeric" : undefined}
      maxLength={f.type === "number" ? 5 : 500}
      dir="auto"
      value={v}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/** Edit draft: the row's field values under their API names, plus the split container types. */
function draftOf(k, r) {
  const draft = { id: r.id, reportType: r.reportType, containers: C.isSplit(r) ? C.containerParts(r) : [] };
  for (const f of C.schemas[k].fields) {
    const v = C.value(r, f.key);
    draft[f.key] = v == null ? "" : f.type === "datetime" ? String(v).slice(0, 16) : String(v);
  }
  return draft;
}

/** PUT body: UpdateCustomsShipmentRequest. Only table-editable fields; locked create-form fields are never sent. */
function updatePayload(k, draft) {
  const field = (key) => C.schemas[k].fields.find((f) => f.key === key);
  const toApi = (key) => {
    if (key === "containers") return draft.containers.length ? draft.containers : null;
    // Ocean Import: inspection date is sent only for the Red / GreenImports tracks.
    if (key === "inspectionDate" && k === "OceanImport" && !C.allowsInspection(draft.track)) return null;
    const v = C.clean(draft[key]);
    if (!v) return null;
    return field(key)?.type === "number" ? Number(v) : v;
  };
  return {
    shipmentNumber: toApi("shipmentNumber"),
    certificateNumber: toApi("certificateNumber"),
    [C.DETAILS[k]]: Object.fromEntries(C.updateKeys[k].map((key) => [key, toApi(key)])),
  };
}

/* ---------- table ---------- */
export default function ShipmentTable({ scope }) {
  const app = useApp();
  const { fmt, tables, scopeKind, filters, selections, setSelection, setUpdatesCtx, updateShipment, toast, alertsSummary } = app;
  const { t, label, display, typeLabel, statusName } = fmt;
  const { user } = useAuth();
  const canEdit = hasPermission(user, CUSTOMS_PERMISSIONS.edit);
  const canClose = hasPermission(user, CUSTOMS_PERMISSIONS.close);
  const canDelete = hasPermission(user, CUSTOMS_PERMISSIONS.delete);
  const k = scopeKind(scope);
  const s = filters[scope];
  const table = tables[scope];
  // Sort by / direction from the toolbar: orders the rows of the current page (empty values last, as in the original tool).
  const sortType = C.reportFields(k).find((f) => f.key === s.sort)?.type;
  const sortValue = (r) => (s.sort === "clientId" ? fmt.clientName(r.clientId) : C.value(r, s.sort));
  const rows = [...table.items].sort((a, b) => {
    const x = C.clean(sortValue(a));
    const y = C.clean(sortValue(b));
    if (!x || !y) return !x - !y;
    const n = sortType === "number" ? Number(x) - Number(y) : String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: "base" });
    return s.dir === "desc" ? -n : n;
  });
  const closed = scope === "closed";
  // FCL pattern: rows are read-only; one row at a time opens with Edit and closes with Save / Cancel.
  const [editing, setEditing] = useState(null); // { id, draft, original }
  const [saving, setSaving] = useState(false);

  const fs = C.reportFields(k).filter((f) => !s.columns || s.columns.includes(f.key));
  const sel = selections[scope];
  const showActions = !closed;

  // Keep the selection limited to rows on the current page.
  useEffect(() => {
    const allowed = new Set(rows.map((r) => r.id));
    if ([...sel].some((id) => !allowed.has(id))) setSelection(scope, new Set([...sel].filter((id) => allowed.has(id))));
  });

  // Switching report, table or page drops an unsaved edit.
  useEffect(() => setEditing(null), [k, scope, s.page, s.size, s.q]);

  // FCL-style details drawer (Open shipments). It follows the live row, so a refresh after "Add update" shows at once.
  const [details, setDetails] = useState(null); // the row it was opened with
  const detailsRow = details ? table.items.find((x) => x.id === details.id) || details : null;
  const canOpenDetails = !closed && !editing && !saving;
  const openDetails = (e, r) => {
    if (!canOpenDetails) return;
    if (e.target.closest("button, a, input, select, textarea")) return;
    if (window.getSelection()?.toString().trim()) return; // the user is selecting text to copy
    setFocusId(null);
    setDetails(r);
  };
  const closeDetails = useCallback(() => setDetails(null), []);
  const detailsHint = t("Click to view details & add update", "انقر لعرض التفاصيل وإضافة تحديث");

  const toggleRow = (id, on) => {
    const n = new Set(sel);
    on ? n.add(id) : n.delete(id);
    setSelection(scope, n);
  };
  const togglePage = (on) => {
    const n = new Set(sel);
    rows.forEach((r) => (on ? n.add(r.id) : n.delete(r.id)));
    setSelection(scope, n);
  };

  // The alerts briefing asks for one shipment: highlight its row and scroll to it once it is on the page.
  const [focusId, setFocusId] = useState(null);
  const tableRef = useRef(null);
  useEffect(() => {
    if (closed) return;
    const onFocusRow = (e) => setFocusId(e.detail?.id || null);
    window.addEventListener(FOCUS_ROW_EVENT, onFocusRow);
    return () => window.removeEventListener(FOCUS_ROW_EVENT, onFocusRow);
  }, [closed]);
  useEffect(() => {
    if (!focusId) return;
    tableRef.current?.querySelector(`tr[data-row-id="${CSS.escape(focusId)}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focusId, table.items]);

  const startEdit = (r) => {
    setFocusId(null);
    setEditing({ id: r.id, draft: draftOf(k, r), original: r, errors: {} });
  };
  const cancelEdit = () => !saving && setEditing(null);
  // Sticky Alert 2 / 3 errors stay on their field until the field is valid again (checked on every change).
  const patchDraft = (patch) =>
    setEditing((e) => {
      if (!e) return e;
      const draft = { ...e.draft, ...patch };
      const keys = Object.keys(e.errors || {});
      if (!keys.length) return { ...e, draft };
      const still = C.arrivalIssues(draft);
      const errors = {};
      for (const key of keys) {
        const issue = still.find((x) => x.key === key);
        if (issue) errors[key] = fmt.message(issue, k);
      }
      return { ...e, draft, errors };
    });
  const setFieldErrors = (errors) => setEditing((e) => (e ? { ...e, errors } : e));

  const saveEdit = async () => {
    if (!editing || saving) return;
    const { draft, original } = editing;

    const check = { ...draft };
    for (const f of C.schemas[k].fields) if (f.type === "number" && /^\d+$/.test(C.clean(check[f.key]))) check[f.key] = Number(check[f.key]);
    const errors = C.issues(k, check);
    if (errors.length) {
      // Alert 2 / 3 problems stay on the row; anything else is a toast as before.
      const sticky = {};
      for (const e of errors) if (ARRIVAL_KEYS.includes(e.key) && !sticky[e.key]) sticky[e.key] = fmt.message(e, k);
      setFieldErrors(sticky);
      const rest = errors.filter((e) => !ARRIVAL_KEYS.includes(e.key));
      if (rest.length) toast(rest.map((e) => fmt.message(e, k)).join("\n"), true);
      return;
    }

    if (k !== "Domestic" && C.isSplit(original) && Number(check.numberOfContainers) !== Number(C.value(original, "numberOfContainers")))
      return toast(t("Merge container types before changing the count.", "ادمج مقاسات الحاويات قبل تغيير العدد."), true);

    setSaving(true);
    const result = await updateShipment(editing.id, updatePayload(k, draft));
    setSaving(false);
    if (!result.ok) {
      // Server-side Alert 2 / 3 messages are matched back to their field.
      const sticky = {};
      const rest = [];
      for (const line of String(result.error || "").split("\n").filter(Boolean)) {
        const key = /free time end/i.test(line) ? "dateOfFreeTimeEnd" : /D\/O date/i.test(line) ? "doDate" : null;
        if (key) sticky[key] = sticky[key] ? sticky[key] + " " + line : line;
        else rest.push(line);
      }
      setFieldErrors(sticky);
      if (rest.length || !Object.keys(sticky).length) toast(rest.join("\n") || result.error, true);
      return;
    }
    setEditing(null);
    toast(t("Shipment saved.", "تم حفظ الشحنة."));
  };


  const emptyText = table.loading
    ? t("Loading shipments…", "جاري تحميل الشحنات…")
    : table.error
      ? table.error
      : s.q
        ? t("No matching shipments. Change the search.", "لا توجد شحنات مطابقة. غيّر البحث.")
        : closed
          ? t("No closed shipments in this section.", "لا توجد شحنات مغلقة في القسم ده.")
          : t("Add a shipment above to start.", "أضف شحنة من فوق للبدء.");

  return (
    <>
    <div className={"egrid" + (closed ? " archive-scroll" : "") + (table.loading ? " is-loading" : "")}>
      <table ref={tableRef} id={closed ? "closedTable" : "eTable"} className={closed ? "shipmentTable" : undefined}>
        <thead id={closed ? "closedHead" : "eHead"}>
          <tr>
            {fs.map((f) => (
              <th key={f.key} style={{ "--gc": "#0b4f7a", "--w": fieldWidth(f) + "px" }}>
                <span>
                  {label(f)}
                  <small className="dtype">{typeLabel(f)}</small>
                </span>
                {C.locked(k, f.key) && <i className="lk" aria-hidden="true">🔒</i>}
              </th>
            ))}
            <th className="workflow-head" style={{ "--w": "110px" }}>
              <span>{t("Status", "حالة الشحنة")}</span>
            </th>
            {showActions && (
              <th className="actions-head" style={{ "--w": "120px" }}>
                <span>{t("Actions", "الإجراءات")}</span>
              </th>
            )}
            <th className="selection-head" style={{ "--w": "60px" }}>
              <span>
                <input
                  type="checkbox"
                  className="selectpage"
                  aria-label={t("Select this page", "تحديد الصفحة")}
                  checked={!!rows.length && rows.every((r) => sel.has(r.id))}
                  onChange={(e) => togglePage(e.target.checked)}
                />
              </span>
            </th>
          </tr>
        </thead>
        <tbody id={closed ? "closedBody" : "eBody"}>
          {rows.map((r) => {
            const rowEditing = !closed && editing?.id === r.id;
            const row = rowEditing ? editing.draft : r;
            const read = (key) => C.value(row, key);
            // Alerts 1 & 4 come from the API row (Open Ocean Import only).
            const alerts = closed ? { eta: null, freeTime: null } : C.alertsOf(r);
            const alertCell = { etaDate: alerts.eta && "eta-" + alerts.eta, dateOfFreeTimeEnd: alerts.freeTime && "ft-" + alerts.freeTime };
            const alertTitle = {
              etaDate: alertTooltip(t, "etaDate", alerts.eta, read("etaDate"), alertsSummary?.today),
              dateOfFreeTimeEnd: alertTooltip(t, "dateOfFreeTimeEnd", alerts.freeTime, read("dateOfFreeTimeEnd"), alertsSummary?.today),
            };
            const rowAlert = alerts.eta === "overdue" || alerts.freeTime === "expired" ? " alert-bad" : alerts.eta || alerts.freeTime ? " alert-warn" : "";
            const alertLevel = { etaDate: alerts.eta, dateOfFreeTimeEnd: alerts.freeTime };
            const fieldErrors = rowEditing ? editing.errors || {} : {};
            const errorLines = Object.values(fieldErrors);
            return (
              <Fragment key={r.id}>
              <tr
                data-row-id={r.id}
                className={(sel.has(r.id) ? "selected" : "") + (rowEditing ? " row-editing" : "") + rowAlert + (focusId === r.id ? " row-focus" : "")}
              >
                {fs.map((f) => {
                  const locked = C.locked(k, f.key) || closed;
                  const disabled = C.inactive(k, f.key, { clearanceType: read("clearanceType"), track: read("track") });
                  const isTypes = f.key === "containerType";
                  const isLatest = f.key === "latestUpdate";
                  const fieldEditable = rowEditing && !locked && !disabled && !isLatest && !isTypes;

                  let inner;
                  if (isTypes) inner = <ContainerCell row={row} editing={rowEditing} onChange={patchDraft} />;
                  else if (isLatest)
                    inner = (
                      <button className="updbtn" onClick={() => setUpdatesCtx({ scope, id: r.id })}>
                        <div>
                          <span className="updtextcell" dir="auto">{r.latestUpdate || t("No updates yet", "لا توجد تحديثات")}</span>
                        </div>
                      </button>
                    );
                  else if (fieldEditable)
                    inner = (
                      <div className="cell-editor">
                        <FieldInput
                          k={k}
                          f={f}
                          value={row[f.key]}
                          pod={row.pod}
                          onChange={(v) => {
                            if (f.key === "pod" && v !== row.pod) patchDraft({ pod: v, terminal: "" });
                            // A track without inspection (blank, Blue, Yellow, Green) clears the inspection date.
                            else if (f.key === "track" && !C.allowsInspection(v)) patchDraft({ track: v, inspectionDate: "" });
                            else patchDraft({ [f.key]: v });
                          }}
                        />
                      </div>
                    );
                  else
                    inner = (
                      <>
                        <span className="truncate" dir="auto">{disabled ? "—" : display(read(f.key), f)}</span>
                        {alertLevel[f.key] && (
                          <span className={"ccl-alert-badge tone-" + alertTone(alertLevel[f.key])}>
                            {alertBadge(t, f.key, alertLevel[f.key], read(f.key), alertsSummary?.today)}
                          </span>
                        )}
                        {locked && <span className="lockicon" aria-hidden="true">⌑</span>}
                      </>
                    );

                  const stateClass = disabled ? "cell-disabled" : locked ? "cell-locked" : "";
                  const alertClass = alertCell[f.key] ? " cell-alert " + alertCell[f.key] : "";
                  const fieldError = fieldErrors[f.key];
                  // Read-only data cells of Open rows open the details drawer (Latest update keeps its own updates popup).
                  const clickable = canOpenDetails && !isLatest;
                  const baseTitle =
                    fieldError ||
                    alertTitle[f.key] ||
                    (locked ? t("Locked after entry", "مقفول بعد الإدخال") : fieldEditable ? undefined : display(read(f.key), f));
                  return (
                    <td key={f.key} data-field={f.key} style={{ "--gc": fieldColor(f), "--w": fieldWidth(f) + "px" }}>
                      <div
                        className={
                          "cbox grp-g" + (f.group + 1) + " " + stateClass + (fieldEditable ? " editing" : "") + alertClass + (fieldError ? " field-error" : "") + (clickable ? " cbox-details" : "")
                        }
                        title={clickable ? [baseTitle, detailsHint].filter(Boolean).join("\n") : baseTitle}
                        onClick={clickable ? (e) => openDetails(e, r) : undefined}
                        aria-invalid={fieldError ? true : undefined}
                      >
                        {inner}
                      </div>
                    </td>
                  );
                })}
                <td className="workflow-cell" style={{ "--w": "110px" }}>
                  <div className="cbox status">
                    {closed || !canClose ? (
                      <span className={closed ? "closed-badge" : undefined}>{statusName(r.status)}</span>
                    ) : (
                      <select
                        value="Open"
                        disabled={rowEditing}
                        aria-label={t("Shipment status", "حالة الشحنة")}
                        onChange={() => closeShipmentDialog(app, r)}
                      >
                        <option value="Open">{statusName("Open")}</option>
                        <option value="Closed">{statusName("Closed")}</option>
                      </select>
                    )}
                  </div>
                </td>
                {showActions && (
                  <td className="actions-cell" style={{ "--w": "120px" }}>
                    <div className="cbox actions">
                      {rowEditing ? (
                        <>
                          <button type="button" className="act-btn save" disabled={saving} onClick={saveEdit}>
                            {saving ? t("Saving…", "جاري الحفظ…") : t("Save", "حفظ")}
                          </button>
                          <button type="button" className="act-btn" disabled={saving} onClick={cancelEdit}>
                            {t("Cancel", "إلغاء")}
                          </button>
                        </>
                      ) : canEdit || canDelete ? (
                        <>
                          {canEdit && (
                            <button
                              type="button"
                              className="act-btn edit"
                              disabled={!!editing}
                              title={editing ? t("Save or cancel the row being edited first.", "احفظ أو الغي السطر المفتوح الأول.") : undefined}
                              onClick={() => startEdit(r)}
                            >
                              {t("Edit", "تعديل")}
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              className="act-btn deactivate"
                              disabled={!!editing}
                              title={t("Move to Inactive", "نقل لغير النشطة")}
                              aria-label={t("Move to Inactive", "نقل لغير النشطة") + " " + (r.shipmentNumber || "")}
                              onClick={() => deactivateShipmentDialog(app, r)}
                            >
                              <Trash2 size={13} aria-hidden="true" />
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="muted small">{t("View only", "عرض فقط")}</span>
                      )}
                    </div>
                  </td>
                )}
                <td className="selection-cell" style={{ "--w": "60px" }}>
                  <div className="cbox checkcell">
                    <input
                      className="row-select"
                      type="checkbox"
                      checked={sel.has(r.id)}
                      aria-label={t("Select shipment ", "تحديد الشحنة ") + (r.shipmentNumber || r.id)}
                      onChange={(e) => toggleRow(r.id, e.target.checked)}
                    />
                  </div>
                </td>
              </tr>
              {errorLines.length > 0 && (
                <tr className="row-errors">
                  <td colSpan={fs.length + (showActions ? 3 : 2)}>
                    <div className="ccl-row-errors" role="alert">
                      <b>{t("Cannot save this row:", "مش هينفع حفظ الصف ده:")}</b>
                      <ul>
                        {errorLines.map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  </td>
                </tr>
              )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      <div className="eempty" id={closed ? "closedEmpty" : "eEmpty"} role={table.error ? "alert" : undefined} style={{ display: rows.length ? "none" : "block" }}>
        {emptyText}
      </div>
    </div>
    {/* Outside the scrolling grid so table reloads (is-loading) never dim the drawer. */}
    {detailsRow && <ActiveDetailsDrawer key={detailsRow.id} row={detailsRow} onClose={closeDetails} />}
    </>
  );
}
