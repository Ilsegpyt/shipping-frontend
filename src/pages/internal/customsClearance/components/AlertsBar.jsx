import { useEffect } from "react";
import { useApp } from "../AppState.jsx";
import AlertsBriefingDialog from "./dialogs/AlertsBriefingDialog.jsx";

const BRIEFING_KEY = "ccl.alertsBriefing"; // { date: Cairo "YYYY-MM-DD", total }

// Alerts 1 & 4 for Open Ocean Import shipments: counts from /alerts/summary; a chip filters the open table.
export default function AlertsBar() {
  const { fmt, kind, alertFilter, setAlertFilter, alertsSummary, dialog, openDialog } = useApp();
  const { t, fmtN } = fmt;
  const s = alertsSummary;
  const active = kind === "OceanImport";

  // Daily briefing: opens by itself once per Cairo day, or again when the number of alerts grows.
  useEffect(() => {
    if (!active || !s?.today || !(s.total > 0) || dialog) return;
    let seen;
    try {
      seen = JSON.parse(localStorage.getItem(BRIEFING_KEY) || "null");
    } catch {
      seen = null;
    }
    if (seen?.date === s.today && s.total <= (seen.total ?? 0)) return;
    try {
      localStorage.setItem(BRIEFING_KEY, JSON.stringify({ date: s.today, total: s.total }));
    } catch {
      // storage unavailable: the briefing still shows, it just may show again
    }
    openDialog(<AlertsBriefingDialog />);
  }, [active, s?.today, s?.total, dialog, openDialog]);

  if (!active) return null;
  // Nothing to warn about: no bar (unless a chip filter is still on, so it can be cleared).
  if (!(s?.total > 0) && !alertFilter) return null;

  const chips = [
    { key: "EtaSoon", tone: "warn", count: s?.etaSoon, label: t("ETA arriving soon", "وصول قريب") },
    { key: "EtaOverdue", tone: "bad", count: s?.etaOverdue, label: t("ETA passed, no ATA", "عدّى ETA بدون ATA") },
    { key: "FreeTimeSoon", tone: "warn", count: s?.freeTimeSoon, label: t("Free time ending soon", "السماح قرب ينتهي") },
    { key: "FreeTimeExpired", tone: "bad", count: s?.freeTimeExpired, label: t("Free time expired", "السماح انتهى") },
  ].filter((c) => c.count > 0 || alertFilter === c.key);

  return (
    <div className="ccl-alerts" role="region" aria-label={t("Shipment alerts", "تنبيهات الشحنات")}>
      <span className="ccl-alerts-title">
        {t("Alerts", "التنبيهات")}
        {s?.total > 0 && <span className="ccl-alerts-total">{fmtN(s.total)}</span>}
      </span>
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          className={"ccl-alert-chip tone-" + c.tone + (alertFilter === c.key ? " active" : "")}
          aria-pressed={alertFilter === c.key}
          onClick={() => setAlertFilter(c.key)}
        >
          <span>{c.label}</span>
          <b>{fmtN(c.count || 0)}</b>
        </button>
      ))}
      {alertFilter && (
        <button type="button" className="ccl-alert-clear" onClick={() => setAlertFilter(alertFilter)}>
          {t("Show all", "عرض الكل")}
        </button>
      )}
      <span className="ccl-alerts-today muted small">{s?.today && t("Cairo date: ", "تاريخ القاهرة: ") + s.today}</span>
      {s?.total > 0 && (
        <button type="button" className="ebtn" onClick={() => openDialog(<AlertsBriefingDialog />)}>
          {t("Alerts summary", "ملخص التنبيهات")}
        </button>
      )}
    </div>
  );
}
