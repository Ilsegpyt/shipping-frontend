import { useEffect } from "react";
import { Download, FileSpreadsheet, X } from "lucide-react";
import { downloadCustomsExcel } from "../../lib/fclExportHelper.js";
import { useApp } from "../../AppState.jsx";
import { useCustomsPickerState } from "../../hooks/useCustomsPickerState.js";
import { CustomsColumnsPicker, CustomsShipmentsPicker } from "./CustomsExportPickers.jsx";

/** FCL-style Save as Excel modal for Customs Clearance (Open & Closed shipments). */
export function ExcelExportDialog({
  scope = "open",
  reportType: propReportType,
  status: propStatus,
  initialRows,
  preSelectedIds,
  search = "",
  alert = "",
  onClose: propOnClose,
}) {
  const app = useApp();
  const { fmt, scopeKind, tables, selections, closeDialog, toast } = app;
  const { t, name } = fmt;

  const activeKind = propReportType || scopeKind(scope);
  const activeStatus = propStatus || (scope === "closed" ? "Closed" : "Open");
  const rows = initialRows ?? tables[scope]?.items ?? [];
  const selectedList = preSelectedIds ?? [...(selections[scope] || [])];
  const handleClose = propOnClose || closeDialog;

  const picker = useCustomsPickerState({
    reportType: activeKind,
    status: activeStatus,
    initialRows: rows,
    preSelectedIds: selectedList,
    search,
    alert,
    fmt,
  });

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose]);

  const handleDownloadExcel = () => {
    if (picker.chosenCols.length === 0) {
      toast(t("Please select at least one column.", "يرجى اختيار عمود واحد على الأقل."), true);
      return;
    }
    if (picker.chosenShipments.length === 0) {
      toast(t("Please select at least one shipment.", "يرجى اختيار شحنة واحدة على الأقل."), true);
      return;
    }

    try {
      downloadCustomsExcel({
        reportType: activeKind,
        status: activeStatus,
        shipments: picker.chosenShipments,
        chosenCols: picker.chosenCols,
        fmt,
      });
      handleClose();
    } catch {
      toast(t("Excel export failed. Your records are unchanged.", "فشل تصدير Excel. بياناتك محفوظة زي ما هي."), true);
    }
  };

  return (
    <div className="ccl-tw">
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={handleClose} />

        <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-emerald-600" />
                <span>{t("Save as Excel", "حفظ كـ Excel")}</span>
              </h3>
              <p className="text-xs text-teal-600 font-medium mt-0.5">
                {name(activeKind)} · {activeStatus === "Closed" ? t("Closed", "مغلقة") : t("Open", "مفتوحة")} · Excel
              </p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              aria-label={t("Close", "إغلاق")}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto pe-1 mt-4 space-y-4">
            <CustomsColumnsPicker picker={picker} fmt={fmt} />
            <CustomsShipmentsPicker picker={picker} fmt={fmt} />
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 pt-3 mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={picker.loadingShipments}
              className="flex items-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white px-5 py-2.5 text-xs font-semibold shadow-md transition active:scale-95 cursor-pointer"
            >
              <Download size={14} />
              <span>{t("Download Excel", "تحميل Excel")}</span>
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition cursor-pointer"
            >
              {t("Cancel", "إلغاء")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
