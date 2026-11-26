import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_EXCLUDED_CUSTOMS_COLS,
  fetchAllCustomsShipments,
  getCustomsExportFields,
  getShipmentFilterDate,
  getShipmentSearchText,
} from "../lib/fclExportHelper.js";

/**
 * Shared state hook for FCL-style Customs Clearance Export Excel & Email Draft modals.
 * If rows are pre-selected in the table, uses those immediately; otherwise fetches all
 * shipments for the active report type and status across pages.
 */
export function useCustomsPickerState({
  reportType,
  status = "Open",
  initialRows = [],
  preSelectedIds = [],
  search = "",
  alert = "",
  fmt,
}) {
  const availableCols = useMemo(() => getCustomsExportFields(reportType), [reportType]);
  const hasPreSelection = Array.isArray(preSelectedIds) && preSelectedIds.length > 0;

  const [selectedColKeys, setSelectedColKeys] = useState(
    () => new Set(availableCols.filter((c) => !DEFAULT_EXCLUDED_CUSTOMS_COLS.has(c.key)).map((c) => c.key)),
  );
  const [shipments, setShipments] = useState(() => (Array.isArray(initialRows) ? initialRows : []));
  const [loadingShipments, setLoadingShipments] = useState(!hasPreSelection);
  const [loadError, setLoadError] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => {
    if (hasPreSelection) {
      const base = Array.isArray(initialRows) ? initialRows : [];
      const valid = preSelectedIds.filter((id) => base.some((r) => r.id === id));
      return new Set(valid.length > 0 ? valid : preSelectedIds);
    }
    return new Set((initialRows || []).map((r) => r.id));
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (hasPreSelection) return undefined;

    let alive = true;
    fetchAllCustomsShipments({ reportType, status, search, alert })
      .then((all) => {
        if (!alive) return;
        setShipments(all);
        setSelectedIds(new Set(all.map((r) => r.id)));
        setLoadingShipments(false);
      })
      .catch(() => {
        if (!alive) return;
        setLoadError(
          fmt.t(
            "Could not load all pages; showing current page rows.",
            "تعذر تحميل كل الصفحات؛ معروض صفوف الصفحة الحالية فقط.",
          ),
        );
        setLoadingShipments(false);
      });

    return () => {
      alive = false;
    };
  }, [hasPreSelection, reportType, status, search, alert, fmt]);

  const filteredShipments = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    const from = dateFrom ? dateFrom.slice(0, 10) : "";
    const to = dateTo ? dateTo.slice(0, 10) : "";

    return shipments.filter((s) => {
      if (q && !getShipmentSearchText(s, fmt).includes(q)) return false;
      if (from || to) {
        const rowDate = getShipmentFilterDate(s);
        if (!rowDate) return false;
        if (from && rowDate < from) return false;
        if (to && rowDate > to) return false;
      }
      return true;
    });
  }, [shipments, searchTerm, dateFrom, dateTo, fmt]);

  const toggleCol = (key) => {
    setSelectedColKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allColsSelected = availableCols.length > 0 && availableCols.every((c) => selectedColKeys.has(c.key));
  const toggleAllCols = () => {
    setSelectedColKeys(allColsSelected ? new Set() : new Set(availableCols.map((c) => c.key)));
  };

  const toggleShipment = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleShipmentsSelected =
    filteredShipments.length > 0 && filteredShipments.every((s) => selectedIds.has(s.id));

  const toggleAllShipments = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleShipmentsSelected) {
        filteredShipments.forEach((s) => next.delete(s.id));
      } else {
        filteredShipments.forEach((s) => next.add(s.id));
      }
      return next;
    });
  };

  const chosenCols = useMemo(
    () => availableCols.filter((c) => selectedColKeys.has(c.key)),
    [availableCols, selectedColKeys],
  );
  const chosenShipments = useMemo(
    () => shipments.filter((s) => selectedIds.has(s.id)),
    [shipments, selectedIds],
  );

  return {
    availableCols,
    selectedColKeys,
    allColsSelected,
    toggleCol,
    toggleAllCols,
    shipments,
    filteredShipments,
    selectedIds,
    allVisibleShipmentsSelected,
    toggleShipment,
    toggleAllShipments,
    loadingShipments,
    loadError,
    searchTerm,
    setSearchTerm,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    chosenCols,
    chosenShipments,
  };
}
