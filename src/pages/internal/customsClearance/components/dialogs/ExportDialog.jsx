import { useState } from "react";
import { reportExportFields } from "../../lib/format.js";
import { dashboardPDF, saveBlob, workbookBuffer, XLSX_MIME } from "../../lib/exporters.js";
import { useApp } from "../../AppState.jsx";
import { Dialog } from "../Modal.jsx";
import MailDialog from "./MailDialog.jsx";

/* ---------- shared "which rows / which fields" picker ---------- */
export const initialChoice = (k) => ({ rows: "page", fields: new Set(reportExportFields(k).map((f) => f.key)) });

export function ExportChoice({ scope, choice, setChoice }) {
  const { fmt, scopeKind, selections } = useApp();
  const { t, label } = fmt;
  const fs = reportExportFields(scopeKind(scope));
  const hasSelection = selections[scope].size;
  const toggleField = (key, on) =>
    setChoice((c) => {
      const fields = new Set(c.fields);
      on ? fields.add(key) : fields.delete(key);
      return { ...c, fields };
    });
  return (
    <>
      <div className="field">
        <label htmlFor="exportRows">{t("Rows", "الصفوف")}</label>
        <select id="exportRows" value={choice.rows} onChange={(e) => setChoice((c) => ({ ...c, rows: e.target.value }))}>
          <option value="page">{t("Shipments on this page", "شحنات الصفحة الحالية")}</option>
          <option value="selected" disabled={!hasSelection}>
            {t("Selected rows", "الصفوف المحددة")} ({hasSelection})
          </option>
        </select>
      </div>
      <div className="checkgrid">
        {fs.map((f) => (
          <label key={f.key}>
            <input className="exportfield" type="checkbox" checked={choice.fields.has(f.key)} onChange={(e) => toggleField(f.key, e.target.checked)} />
            {label(f)}
          </label>
        ))}
      </div>
      <p className="modal-note">
        {t(
          "The table loads one page at a time. To export more rows, raise Rows per page or search first.",
          "الجدول بيحمّل صفحة واحدة في المرة. لتصدير صفوف أكتر، زوّد عدد الصفوف في الصفحة أو ابحث الأول.",
        )}
      </p>
    </>
  );
}

/** Resolves the picker into workbook groups: [{ k, rows, fields }]. */
export function exportGroups(app, scope, choice) {
  const { tables, selections, scopeKind } = app;
  const k = scopeKind(scope);
  const page = tables[scope].items;
  const rows = choice.rows === "selected" ? page.filter((r) => selections[scope].has(r.id)) : page;
  return [{ k, rows, fields: reportExportFields(k).filter((f) => choice.fields.has(f.key)) }];
}

export function ExcelExportDialog({ scope }) {
  const app = useApp();
  const { fmt, scopeKind, closeDialog, toast } = app;
  const { t, name } = fmt;
  const [choice, setChoice] = useState(() => initialChoice(scopeKind(scope)));

  const download = async () => {
    const groups = exportGroups(app, scope, choice);
    if (!groups.some((g) => g.rows.length) || groups.some((g) => !g.fields.length)) {
      toast(t("Choose fields and at least one shipment.", "اختار حقول وشحنة واحدة على الأقل."), true);
      return;
    }
    try {
      const buffer = await workbookBuffer(groups, fmt);
      saveBlob(new Blob([buffer], { type: XLSX_MIME }), "ILS_Customs_" + (groups.length > 1 ? "All_Reports" : scopeKind(scope)) + "_" + scope + ".xlsx");
      closeDialog();
    } catch {
      toast(t("Excel export failed. Your records are unchanged.", "فشل تصدير Excel. بياناتك محفوظة زي ما هي."), true);
    }
  };

  return (
    <Dialog
      wide
      title={t("Export Excel · ", "تصدير Excel · ") + name(scopeKind(scope))}
      buttons={[
        { text: t("Cancel", "إلغاء"), onClick: closeDialog },
        { text: t("Download Excel", "تحميل Excel"), primary: true, onClick: download },
      ]}
    >
      <ExportChoice scope={scope} choice={choice} setChoice={setChoice} />
    </Dialog>
  );
}

/* ---------- dashboard PDF ---------- */
export function collectDashboard(app) {
  const snap = app.dashSnapshot.current;
  if (!snap) throw Error("Dashboard not rendered");
  return { ...snap, charts: snap.chartList.map((c) => ({ title: c.title, chart: app.charts.current.get(c.id) })).filter((c) => c.chart) };
}

function DashboardExportDialog() {
  const app = useApp();
  const { fmt, closeDialog, toast, openDialog, kind } = app;
  const { t } = fmt;
  const download = async () => {
    try {
      saveBlob(await dashboardPDF(collectDashboard(app), fmt), "ILS_Customs_" + kind + ".pdf");
      closeDialog();
    } catch {
      toast(t("PDF export failed.", "تصدير PDF فشل."), true);
    }
  };
  return (
    <Dialog
      title={t("Export Dashboard", "تصدير لوحة المؤشرات")}
      buttons={[
        { text: t("Email", "إيميل"), onClick: () => openDialog(<MailDialog scope="dashboard" />) },
        { text: t("Download PDF", "تحميل PDF"), primary: true, onClick: download },
      ]}
    >
      <p className="helptext">
        {t(
          "The PDF includes the current section, active filters, KPIs, insights and charts.",
          "ملف PDF هيشمل القسم الحالي والفلاتر والمؤشرات والقراءات والرسوم.",
        )}
      </p>
    </Dialog>
  );
}

export function openDashboardExport(app) {
  if (app.view !== "dash") app.setView("dash");
  app.openDialog(<DashboardExportDialog />);
}
