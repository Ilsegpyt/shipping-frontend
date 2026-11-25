import { useState } from "react";
import { useAuth } from "../../../../auth/AuthContext";
import { CUSTOMS_PERMISSIONS, hasPermission } from "../../../../services/customsClearanceService";
import { useApp } from "../AppState.jsx";
import EntryForm from "./EntryForm.jsx";
import KindTabs from "./KindTabs.jsx";
import ShipmentTable from "./ShipmentTable.jsx";
import { TablePager, TableTools } from "./TableTools.jsx";
import { ExcelExportDialog } from "./dialogs/ExportDialog.jsx";
import MailDialog from "./dialogs/MailDialog.jsx";

export default function EntryView() {
  const { fmt, tables, lookups, openClosed, openDialog, reload } = useApp();
  const { t, fmtN } = fmt;
  const { user } = useAuth();
  const canCreate = hasPermission(user, CUSTOMS_PERMISSIONS.create);
  const [collapsed, setCollapsed] = useState(false);
  const open = tables.open;

  return (
    <section id="entryView">
      {canCreate && <EntryForm collapsed={collapsed} setCollapsed={setCollapsed} />}
      <div className="ebar">
        <KindTabs id="entryTabs" scope="open" />
        <button className="ebtn" id="closedBtn" onClick={openClosed}>
          {t("Closed shipments", "الشحنات المغلقة")}
        </button>
        <div className="espacer" />
        <button className="ebtn" onClick={() => openDialog(<ExcelExportDialog scope="open" />)}>{t("Export Excel", "تصدير Excel")}</button>
        <button className="ebtn" onClick={() => openDialog(<MailDialog scope="open" />)}>{t("Email", "إيميل")}</button>
      </div>
      <div className="sysbar">
        <span className="chipst" id="recordCounts">
          {open.loading ? t("Loading…", "جاري التحميل…") : fmtN(open.totalCount) + " " + t("open", "مفتوحة")}
        </span>
        <span className="chipst muted">{t("No deletion", "بدون حذف")}</span>
        {lookups.error && (
          <span className="chipst" role="alert" style={{ color: "var(--bad)" }}>
            {lookups.error}
          </span>
        )}
        <span className="spacer" />
        <button className="ebtn" onClick={() => reload("open")} disabled={open.loading}>{t("Refresh", "تحديث")}</button>
      </div>
      <TableTools scope="open" />
      <TablePager scope="open" />
      <ShipmentTable scope="open" />
    </section>
  );
}
