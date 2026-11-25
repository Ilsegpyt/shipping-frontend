import { useEffect, useState } from "react";
import { useAuth } from "../../../../auth/AuthContext";
import { CUSTOMS_PERMISSIONS, hasPermission } from "../../../../services/customsClearanceService";
import { useApp } from "../AppState.jsx";
import { Modal } from "./Modal.jsx";
import KindTabs from "./KindTabs.jsx";
import ShipmentTable from "./ShipmentTable.jsx";
import { TablePager, TableTools } from "./TableTools.jsx";
import { ExcelExportDialog } from "./dialogs/ExportDialog.jsx";
import MailDialog from "./dialogs/MailDialog.jsx";

/** Read-only archive with its own search, copy, export and email. */
export function ClosedModal() {
  const { fmt, setClosedOpen, openDialog } = useApp();
  const { t } = fmt;
  return (
    <Modal id="closedModal" titleId="closedTitle" boxClass="box archive-box" title={t("Closed shipments", "الشحنات المغلقة")} onClose={() => setClosedOpen(false)}>
      <p id="closedNote" className="modal-note">
        {t(
          "Closed shipments are read-only. Search, copy, Excel export and email use only this archive.",
          "الشحنات المغلقة للقراءة فقط. البحث والنسخ وتصدير Excel والإيميل خاصين بالأرشيف ده فقط.",
        )}
      </p>
      <div className="ebar">
        <KindTabs id="closedTabs" scope="closed" />
        <span className="espacer" />
        <button className="ebtn" onClick={() => openDialog(<ExcelExportDialog scope="closed" />)}>{t("Export Excel", "تصدير Excel")}</button>
        <button className="ebtn" onClick={() => openDialog(<MailDialog scope="closed" />)}>{t("Email", "إيميل")}</button>
      </div>
      <TableTools scope="closed" />
      <TablePager scope="closed" />
      <ShipmentTable scope="closed" />
    </Modal>
  );
}

/** Full update history, loaded from the API when the modal opens (newest first). */
export function UpdatesModal() {
  const { fmt, tables, updatesCtx, setUpdatesCtx, getUpdates, addUpdate, toast } = useApp();
  const { t, fmtN, stamp } = fmt;
  const { user } = useAuth();
  const { scope, id } = updatesCtx;
  const row = tables[scope].items.find((x) => x.id === id);
  const readOnly = !row || row.status === "Closed" || !hasPermission(user, CUSTOMS_PERMISSIONS.edit);

  const [text, setText] = useState("");
  const [logs, setLogs] = useState({ items: [], loading: true, error: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    getUpdates(id).then((result) => {
      if (alive) setLogs(result.ok ? { items: result.value || [], loading: false, error: "" } : { items: [], loading: false, error: result.error });
    });
    return () => {
      alive = false;
    };
  }, [id, getUpdates]);

  const add = async () => {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    const result = await addUpdate(id, value);
    if (result.ok) {
      setText("");
      const fresh = await getUpdates(id);
      if (fresh.ok) setLogs({ items: fresh.value || [], loading: false, error: "" });
    } else toast(result.error, true);
    setBusy(false);
  };

  const list = logs.items;

  return (
    <Modal
      id="updatesModal"
      titleId="updatesTitle"
      title={t("Latest updates · ", "آخر التحديثات · ") + (row?.shipmentNumber || "—")}
      onClose={() => setUpdatesCtx(null)}
    >
      <div id="updatesBody">
        {readOnly ? (
          <p className="muted small">
            {row?.status === "Closed" ? t("Closed shipment · read-only", "شحنة مغلقة · للقراءة فقط") : t("View only", "عرض فقط")}
          </p>
        ) : (
          <>
            <div className="updadd">
              <input
                id="uText"
                autoFocus
                placeholder={t("Write a customs update…", "اكتب تحديث التخليص…")}
                maxLength={4000}
                aria-label={t("New update", "تحديث جديد")}
                value={text}
                disabled={busy}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && add()}
              />
              <button className="ebtn go" id="addUpdateBtn" disabled={busy} onClick={add}>＋ {t("Add update", "إضافة تحديث")}</button>
            </div>
            <div className="updmeta">{t("Each update is kept with its user, date and Cairo time.", "كل تحديث بيتحفظ باسم المستخدم وتاريخه وتوقيت القاهرة.")}</div>
          </>
        )}
        {logs.loading ? (
          <p className="modal-note">{t("Loading updates…", "جاري تحميل التحديثات…")}</p>
        ) : logs.error ? (
          <p className="errorlist" role="alert">{logs.error}</p>
        ) : list.length ? (
          <ol className="updlist">
            {list.map((u, i) => (
              <li className="updrow" key={u.id}>
                <span className="updn2">{fmtN(list.length - i)}</span>
                <div>
                  <div className="updtext" dir="auto">{u.updateText}</div>
                  <div className="updsub">{stamp(u.updatedAtUtc)}{u.updatedBy ? " · " + u.updatedBy : ""}</div>
                </div>
                {i === 0 && <em>{t("Latest", "الأحدث")}</em>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="modal-note">{t("No updates yet.", "لا توجد تحديثات بعد.")}</p>
        )}
      </div>
    </Modal>
  );
}
