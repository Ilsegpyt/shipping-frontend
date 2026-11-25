import { useState } from "react";
import C from "../../lib/core.js";
import { useApp } from "../../AppState.jsx";
import { Dialog } from "../Modal.jsx";

/** Simple yes / cancel confirmation. */
export function ConfirmDialog({ title, text, confirmText, onConfirm }) {
  const { fmt, closeDialog } = useApp();
  return (
    <Dialog
      title={title}
      buttons={[
        { text: fmt.t("Cancel", "إلغاء"), onClick: closeDialog },
        { text: confirmText, primary: true, onClick: onConfirm },
      ]}
    >
      <p className="helptext">{text}</p>
    </Dialog>
  );
}

/** Validation errors (client checks or the API's answer) as a bulleted list, like FCL. */
export function ValidationErrorsDialog({ errors }) {
  const { fmt, closeDialog } = useApp();
  return (
    <Dialog
      title={fmt.t("Validation Errors", "أخطاء التحقق")}
      buttons={[{ text: fmt.t("Close", "إغلاق"), primary: true, onClick: closeDialog }]}
    >
      <ul className="helptext" role="alert" style={{ margin: 0, paddingInlineStart: 20 }}>
        {errors.map((e, i) => <li key={i}>{e}</li>)}
      </ul>
    </Dialog>
  );
}

/** Close needs a confirmation; it is one-way (no reopen, no delete). */
export function closeShipmentDialog(app, row) {
  const { fmt, closeShipment, closeDialog, toast, openDialog } = app;
  const { t } = fmt;
  const name = row.shipmentNumber || t("this shipment", "الشحنة دي");
  openDialog(
    <ConfirmDialog
      title={t("Close shipment", "إغلاق الشحنة")}
      text={t("Close ", "إغلاق ") + name + t("? It will move to the closed archive and become read-only. This cannot be undone.", "؟ هتتنقل لأرشيف الشحنات المغلقة وتبقى للقراءة فقط. مفيش رجوع في الخطوة دي.")}
      confirmText={t("Close shipment", "إغلاق الشحنة")}
      onConfirm={async () => {
        const result = await closeShipment(row.id);
        closeDialog();
        if (result.ok) toast(t("Shipment moved to the closed archive.", "الشحنة اتنقلت لأرشيف المغلق."));
        else toast(result.error, true);
      }}
    />,
  );
}

export function ColumnsDialog({ scope }) {
  const { fmt, scopeKind, filters, setFilter, closeDialog, toast } = useApp();
  const { t, label } = fmt;
  const fs = C.reportFields(scopeKind(scope));
  const current = filters[scope].columns;
  const [picked, setPicked] = useState(() => new Set(fs.filter((f) => !current || current.includes(f.key)).map((f) => f.key)));
  const apply = () => {
    const keys = fs.filter((f) => picked.has(f.key)).map((f) => f.key);
    if (!keys.length) {
      toast(t("Choose at least one field.", "اختار حقل واحد على الأقل."), true);
      return;
    }
    setFilter(scope, { columns: keys });
    closeDialog();
  };
  return (
    <Dialog
      title={t("Visible fields", "الحقول الظاهرة")}
      buttons={[
        { text: t("All fields", "كل الحقول"), onClick: () => setPicked(new Set(fs.map((f) => f.key))) },
        { text: t("Apply", "تطبيق"), primary: true, onClick: apply },
      ]}
    >
      <p className="modal-note">{t("This only changes the table view. Export fields are chosen separately.", "ده بيغيّر عرض الجدول فقط. حقول التصدير بتختارها بشكل مستقل.")}</p>
      <div className="checkgrid">
        {fs.map((f) => (
          <label key={f.key}>
            <input
              type="checkbox"
              className="colpick"
              checked={picked.has(f.key)}
              onChange={(e) =>
                setPicked((p) => {
                  const n = new Set(p);
                  e.target.checked ? n.add(f.key) : n.delete(f.key);
                  return n;
                })
              }
            />
            {label(f)}
          </label>
        ))}
      </div>
    </Dialog>
  );
}

export function CopyFallbackDialog({ text }) {
  const { fmt } = useApp();
  return (
    <Dialog title={fmt.t("Copy rows", "نسخ الصفوف")}>
      <p className="modal-note">{fmt.t("Clipboard access is unavailable. Select and copy the text below.", "الوصول للحافظة غير متاح. حدد النص اللي تحت وانسخه.")}</p>
      <textarea style={{ width: "100%", height: 250 }} readOnly value={text} />
    </Dialog>
  );
}
