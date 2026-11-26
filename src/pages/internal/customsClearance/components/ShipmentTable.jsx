import { useEffect, useState } from "react";
import { useAuth } from "../../../../auth/AuthContext";
import { CUSTOMS_PERMISSIONS, hasPermission } from "../../../../services/customsClearanceService";
import C from "../lib/core.js";
import { fieldColor, fieldWidth } from "../lib/format.js";
import { useApp } from "../AppState.jsx";
import OptionSelect from "./OptionSelect.jsx";
import ContainerCell from "./ContainerCell.jsx";
import { closeShipmentDialog } from "./dialogs/TableDialogs.jsx";

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
  const { fmt, tables, scopeKind, filters, selections, setSelection, setUpdatesCtx, updateShipment, toast } = app;
  const { t, label, display, typeLabel, statusName } = fmt;
  const { user } = useAuth();
  const canEdit = hasPermission(user, CUSTOMS_PERMISSIONS.edit);
  const canClose = hasPermission(user, CUSTOMS_PERMISSIONS.close);
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

  const startEdit = (r) => setEditing({ id: r.id, draft: draftOf(k, r), original: r });
  const cancelEdit = () => !saving && setEditing(null);
  const patchDraft = (patch) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, ...patch } } : e));

  const saveEdit = async () => {
    if (!editing || saving) return;
    const { draft, original } = editing;

    const check = { ...draft };
    for (const f of C.schemas[k].fields) if (f.type === "number" && /^\d+$/.test(C.clean(check[f.key]))) check[f.key] = Number(check[f.key]);
    const errors = C.issues(k, check);
    if (errors.length) return toast(errors.map((e) => fmt.message(e, k)).join("\n"), true);

    if (k !== "Domestic" && C.isSplit(original) && Number(check.numberOfContainers) !== Number(C.value(original, "numberOfContainers")))
      return toast(t("Merge container types before changing the count.", "ادمج مقاسات الحاويات قبل تغيير العدد."), true);

    setSaving(true);
    const result = await updateShipment(editing.id, updatePayload(k, draft));
    setSaving(false);
    if (!result.ok) return toast(result.error, true);
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
    <div className={"egrid" + (closed ? " archive-scroll" : "") + (table.loading ? " is-loading" : "")}>
      <table id={closed ? "closedTable" : "eTable"} className={closed ? "shipmentTable" : undefined}>
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
            return (
              <tr key={r.id} className={(sel.has(r.id) ? "selected" : "") + (rowEditing ? " row-editing" : "")}>
                {fs.map((f) => {
                  const locked = C.locked(k, f.key) || closed;
                  const disabled = C.inactive(k, f.key, { clearanceType: read("clearanceType") });
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
                            else patchDraft({ [f.key]: v });
                          }}
                        />
                      </div>
                    );
                  else
                    inner = (
                      <>
                        <span className="truncate" dir="auto">{disabled ? "—" : display(read(f.key), f)}</span>
                        {locked && <span className="lockicon" aria-hidden="true">⌑</span>}
                      </>
                    );

                  const stateClass = disabled ? "cell-disabled" : locked ? "cell-locked" : "";
                  return (
                    <td key={f.key} data-field={f.key} style={{ "--gc": fieldColor(f), "--w": fieldWidth(f) + "px" }}>
                      <div
                        className={"cbox grp-g" + (f.group + 1) + " " + stateClass + (fieldEditable ? " editing" : "")}
                        title={locked ? t("Locked after entry", "مقفول بعد الإدخال") : fieldEditable ? undefined : display(read(f.key), f)}
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
                      ) : canEdit ? (
                        <button
                          type="button"
                          className="act-btn edit"
                          disabled={!!editing}
                          title={editing ? t("Save or cancel the row being edited first.", "احفظ أو الغي السطر المفتوح الأول.") : undefined}
                          onClick={() => startEdit(r)}
                        >
                          {t("Edit", "تعديل")}
                        </button>
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
            );
          })}
        </tbody>
      </table>
      <div className="eempty" id={closed ? "closedEmpty" : "eEmpty"} role={table.error ? "alert" : undefined} style={{ display: rows.length ? "none" : "block" }}>
        {emptyText}
      </div>
    </div>
  );
}
