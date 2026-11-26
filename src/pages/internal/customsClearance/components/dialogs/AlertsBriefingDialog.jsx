import { useEffect, useState } from "react";
import customsClearanceService from "../../../../../services/customsClearanceService";
import C from "../../lib/core.js";
import { FOCUS_ROW_EVENT, alertBadge, alertTone } from "../../lib/alertText.js";
import { apiError, useApp } from "../../AppState.jsx";
import { Dialog } from "../Modal.jsx";

/** Daily briefing: every Open Ocean Import shipment with Alert 1 (ETA) or Alert 4 (free time), nearest ETA first. */
export default function AlertsBriefingDialog() {
  const app = useApp();
  const { fmt, alertsSummary, alertFilter, setAlertFilter, setFilter, closeDialog } = app;
  const { t, fmtN, clientName } = fmt;
  const [state, setState] = useState({ loading: true, error: "", items: [], totalCount: 0 });

  useEffect(() => {
    let alive = true;
    customsClearanceService
      .getAll({ reportType: "OceanImport", status: "Open", alert: "Any", pageNumber: 1, pageSize: 100 })
      .then((page) => alive && setState({ loading: false, error: "", items: page.items || [], totalCount: page.totalCount || 0 }))
      .catch((err) => alive && setState({ loading: false, error: apiError(err, "Could not load the alerts."), items: [], totalCount: 0 }));
    return () => {
      alive = false;
    };
  }, []);

  // Shows exactly this shipment in the open table (search by its MB/L) and highlights its row.
  const jump = (row) => {
    if (alertFilter) setAlertFilter(alertFilter); // clears the chip filter
    const key = C.value(row, "mbl") || row.shipmentNumber || C.value(row, "acidNumber") || "";
    setFilter("open", { q: key, page: 0 });
    window.dispatchEvent(new CustomEvent(FOCUS_ROW_EVENT, { detail: { id: row.id } }));
    closeDialog();
  };

  const s = alertsSummary;
  const badge = (field, level, date) =>
    level ? <span className={"ccl-alert-badge tone-" + alertTone(level)}>{alertBadge(t, field, level, date, s?.today)}</span> : null;

  return (
    <Dialog title={t("Today's alerts", "تنبيهات النهارده")} wide buttons={[{ text: t("Close", "إغلاق"), onClick: closeDialog }]}>
      {s && (
        <p className="ccl-briefing-sum">
          {[
            [s.etaSoon, t("arriving soon", "وصول قريب")],
            [s.etaOverdue, t("ETA passed with no ATA", "عدّى ETA بدون ATA")],
            [s.freeTimeSoon, t("free time ending soon", "سماح قرب ينتهي")],
            [s.freeTimeExpired, t("free time expired", "السماح انتهى")],
          ]
            .filter(([n]) => n > 0)
            .map(([n, text]) => fmtN(n) + " " + text)
            .join(t(" · ", " · "))}
          <span className="muted small">{" — " + t("Cairo date ", "تاريخ القاهرة ") + s.today}</span>
        </p>
      )}
      {state.loading ? (
        <p className="muted">{t("Loading alerts…", "جاري تحميل التنبيهات…")}</p>
      ) : state.error ? (
        <p role="alert" style={{ color: "var(--bad)" }}>{state.error}</p>
      ) : !state.items.length ? (
        <p className="muted">{t("No alerts right now.", "مفيش تنبيهات دلوقتي.")}</p>
      ) : (
        <div className="ccl-briefing-scroll">
          <table className="ccl-briefing">
            <thead>
              <tr>
                <th>{t("Shipment #", "رقم العملية")}</th>
                <th>{t("Client", "العميل")}</th>
                <th>{t("MB/L", "البوليصة الكلية")}</th>
                <th>{t("ETA", "الوصول المتوقع")}</th>
                <th>{t("Free time end", "انتهاء السماح")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {state.items.map((r) => {
                const a = C.alertsOf(r);
                return (
                  <tr key={r.id}>
                    <td dir="auto">{r.shipmentNumber || "—"}</td>
                    <td dir="auto">{clientName(r.clientId)}</td>
                    <td dir="auto">{C.value(r, "mbl") || "—"}</td>
                    <td>
                      <span className="ccl-briefing-date">{C.value(r, "etaDate") || "—"}</span>
                      {badge("etaDate", a.eta, C.value(r, "etaDate"))}
                    </td>
                    <td>
                      <span className="ccl-briefing-date">{C.value(r, "dateOfFreeTimeEnd") || "—"}</span>
                      {badge("dateOfFreeTimeEnd", a.freeTime, C.value(r, "dateOfFreeTimeEnd"))}
                    </td>
                    <td>
                      <button type="button" className="act-btn edit" onClick={() => jump(r)}>
                        {t("Edit / Go", "تعديل / انتقال")}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {state.totalCount > state.items.length && (
            <p className="muted small">
              {t(`Showing the first ${state.items.length} of ${state.totalCount}. Use the alert chips to see the rest.`,
                `معروض أول ${state.items.length} من ${state.totalCount}. استخدم أزرار التنبيهات لعرض الباقي.`)}
            </p>
          )}
        </div>
      )}
    </Dialog>
  );
}
