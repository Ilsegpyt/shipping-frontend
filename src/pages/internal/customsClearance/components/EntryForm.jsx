import { useState } from "react";
import C from "../lib/core.js";
import { fieldColor } from "../lib/format.js";
import { useApp } from "../AppState.jsx";
import OptionSelect from "./OptionSelect.jsx";
import { ValidationErrorsDialog } from "./dialogs/TableDialogs.jsx";

// Number inputs start at 0 so the user has to enter the real value (the API requires at least 1).
const NUMBER_DEFAULT = "0";

/** POST body: CreateCustomsShipmentRequest. The create-form fields go into the report's details object, same names. */
function createPayload(kind, row) {
  const details = Object.fromEntries(C.entryKeys[kind].filter((key) => key !== "clientId").map((key) => [key, row[key]]));
  return { reportType: kind, clientId: row.clientId, [C.DETAILS[kind]]: details };
}

/** Essential red-header fields. They lock once the shipment is created. */
export default function EntryForm({ collapsed, setCollapsed }) {
  const { fmt, kind, drafts, setDrafts, createShipment, toast, openDialog } = useApp();
  const { t, label, typeLabel, message } = fmt;
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);
  const draft = drafts[kind] || {};
  const schema = C.schemas[kind];
  const setValue = (key, v) =>
    setDrafts((d) => {
      const cur = d[kind] || {};
      const next = { ...cur, [key]: v };
      if (key === "pod" && cur.pod !== v) next.terminal = "";
      return { ...d, [kind]: next };
    });
  const inputValue = (key, f) => draft[key] ?? (f.type === "number" ? NUMBER_DEFAULT : "");

  const reset = () => {
    setDrafts((d) => ({ ...d, [kind]: {} }));
    setErrors([]);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const row = {};
    for (const key of C.entryKeys[kind]) {
      const f = schema.fields.find((x) => x.key === key);
      const v = C.clean(inputValue(key, f));
      row[key] = f.type === "number" && /^\d+$/.test(v) ? Number(v) : v;
    }
    const found = C.issues(kind, row);
    setErrors(found);
    if (found.length) {
      document.getElementById("f-" + found[0].key)?.focus();
      openDialog(<ValidationErrorsDialog errors={found.map((x) => message(x, kind))} />);
      return;
    }
    setBusy(true);
    const result = await createShipment(createPayload(kind, row));
    setBusy(false);
    if (!result.ok) {
      openDialog(<ValidationErrorsDialog errors={String(result.error).split("\n").filter(Boolean)} />);
      return;
    }
    reset();
    toast(t("Shipment created. Entry fields are now locked.", "تم إنشاء الشحنة. حقول الإدخال اتقفلت في الجدول."));
  };

  const errorKeys = new Set(errors.map((e) => e.key));

  return (
    <div className="opwrap">
      <form className={"opcard" + (collapsed ? " closed" : "")} id="opForm" noValidate onSubmit={submit}>
        <div className="ophead">
          <div>
            <div className="opref" id="opRef">{t("New shipment", "شحنة جديدة")}</div>
            <div className="opsub">{t("Essential fields · All active inputs are required", "الحقول الأساسية · كل الحقول المفعلة مطلوبة")}</div>
          </div>
          <button type="button" className="ebtn" id="collapseForm" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? t("Show inputs", "إظهار الإدخال") : t("Hide inputs", "إخفاء الإدخال")}
          </button>
        </div>
        <div className="opgrid" id="opGrid">
          {C.entryKeys[kind].map((key) => {
            const f = schema.fields.find((f) => f.key === key);
            const v = inputValue(key, f);
            const cls = errorKeys.has(key) ? "errorfield" : undefined;
            return (
              <div className="opf" id={"wrap-" + key} key={kind + key} style={{ "--gc": fieldColor(f) }}>
                <label htmlFor={"f-" + key}>
                  {label(f)} <small className="optype">{typeLabel(f)}</small>
                  <span className="req">*</span>
                </label>
                {C.dropdownKeys.includes(key) ? (
                  <OptionSelect id={"f-" + key} className={cls} k={kind} fieldKey={key} value={v} context={{ pod: draft.pod }} required onChange={(nv) => setValue(key, nv)} />
                ) : (
                  <input
                    id={"f-" + key}
                    className={cls}
                    type={f.type === "date" ? "date" : "text"}
                    inputMode={f.type === "number" || key === "acidNumber" ? "numeric" : undefined}
                    maxLength={key === "acidNumber" ? 19 : 120}
                    value={v}
                    required
                    autoComplete="off"
                    dir="auto"
                    onChange={(e) => setValue(key, e.target.value)}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="opfoot">
          <button type="submit" className="ebtn go" disabled={busy}>
            {busy ? t("Creating…", "جاري الإنشاء…") : t("＋ Create shipment", "＋ إنشاء شحنة")}
          </button>
          <button type="button" className="ebtn" onClick={reset} disabled={busy}>{t("Reset inputs", "مسح الإدخال")}</button>
          <span className="ophint">
            {t(
              "Entry fields lock after creation, except the ETA date. Complete follow-up fields in the table with Edit.",
              "حقول الإدخال بتتقفل بعد الإنشاء، ماعدا تاريخ الوصول المتوقع. كمّل المتابعة من الجدول بزرار تعديل.",
            )}
          </span>
        </div>
      </form>
    </div>
  );
}
