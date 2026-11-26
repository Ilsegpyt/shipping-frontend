import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useAuth } from "../../../../auth/AuthContext";
import { CUSTOMS_PERMISSIONS, hasPermission } from "../../../../services/customsClearanceService";
import { useApp } from "../AppState.jsx";
import AlertsBar from "./AlertsBar.jsx";
import ClosedArchiveView from "./ClosedArchiveView.jsx";
import EntryForm from "./EntryForm.jsx";
import InactiveArchiveView from "./InactiveArchiveView.jsx";
import KindTabs from "./KindTabs.jsx";
import ShipmentTable from "./ShipmentTable.jsx";
import { TablePager, TableTools } from "./TableTools.jsx";
import { ExcelExportDialog } from "./dialogs/ExportDialog.jsx";
import MailDialog from "./dialogs/MailDialog.jsx";

export default function EntryView() {
  const { fmt, tables, lookups, openDialog, reload, counts, kind, selections, filters, alertFilter } = useApp();
  const { t, fmtN } = fmt;
  const { user } = useAuth();
  const canCreate = hasPermission(user, CUSTOMS_PERMISSIONS.create);
  const [collapsed, setCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState("active"); // "active" | "closed"
  const open = tables.open;
  const openSelectedIds = [...(selections.open || [])];
  const openAlert = kind === "OceanImport" ? alertFilter : "";

  // The closed and inactive archives replace the form and the open table; each loads its own pages only while shown.
  if (viewMode === "closed")
    return (
      <section id="entryView">
        <ClosedArchiveView onBack={() => setViewMode("active")} />
      </section>
    );
  if (viewMode === "inactive")
    return (
      <section id="entryView">
        <InactiveArchiveView onBack={() => setViewMode("active")} />
      </section>
    );
  const inactiveCount = counts?.inactive?.total;

  return (
    <section id="entryView">
      {canCreate && <EntryForm collapsed={collapsed} setCollapsed={setCollapsed} />}
      <div className="ebar">
        <KindTabs id="entryTabs" scope="open" />
        <button className="ebtn" id="closedBtn" onClick={() => setViewMode("closed")}>
          {t("Closed shipments", "الشحنات المغلقة")}
        </button>
        <button className="ebtn ccl-inactive-btn" id="inactiveBtn" onClick={() => setViewMode("inactive")}>
          <Trash2 size={14} aria-hidden="true" />
          <span>{t("Inactive", "غير النشطة")}</span>
          {inactiveCount != null && <span className="ccl-inactive-count">{fmtN(inactiveCount)}</span>}
        </button>
        <div className="espacer" />
        <button
          className="ebtn"
          onClick={() =>
            openDialog(
              <ExcelExportDialog
                scope="open"
                reportType={kind}
                status="Open"
                initialRows={open.items}
                preSelectedIds={openSelectedIds}
                search={filters.open.q}
                alert={openAlert}
              />,
            )
          }
        >
          {t("Save as Excel", "حفظ كـ Excel")}
        </button>
        <button
          className="ebtn"
          onClick={() =>
            openDialog(
              <MailDialog
                scope="open"
                reportType={kind}
                status="Open"
                initialRows={open.items}
                preSelectedIds={openSelectedIds}
                search={filters.open.q}
                alert={openAlert}
              />,
            )
          }
        >
          {t("Email", "إيميل")}
        </button>
      </div>
      <div className="sysbar">
        <span className="chipst" id="recordCounts">
          {open.loading ? t("Loading…", "جاري التحميل…") : fmtN(open.totalCount) + " " + t("open", "مفتوحة")}
        </span>
        {lookups.error && (
          <span className="chipst" role="alert" style={{ color: "var(--bad)" }}>
            {lookups.error}
          </span>
        )}
        <span className="spacer" />
        <button className="ebtn" onClick={() => reload("open")} disabled={open.loading}>{t("Refresh", "تحديث")}</button>
      </div>
      <AlertsBar />
      <TableTools scope="open" />
      <TablePager scope="open" />
      <ShipmentTable scope="open" />
    </section>
  );
}
