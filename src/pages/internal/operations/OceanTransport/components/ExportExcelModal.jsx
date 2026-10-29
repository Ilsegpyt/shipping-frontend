import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, Download, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { COLS, CONTAINER_TYPES } from '../constants';

// Exact TPT Excel group fill and font colors (matching ils_tpt_upload_ready (5).xlsx & constants.js)
const EXCEL_GROUP_COLORS = {
  g1: { fill: '9BBB59', text: '000000', dataText: '000000', border: '7E9847' }, // Reference & Basic (Green)
  g2: { fill: '4BACC6', text: '000000', dataText: '000000', border: '3B8D9E' }, // Shipping & Port (Cyan)
  g3: { fill: 'C0504D', text: 'FFFFFF', dataText: 'FFFFFF', border: '9C3E3B' }, // Dates & Times (Crimson)
  g4: { fill: 'FF66FF', text: '000000', dataText: '000000', border: 'CC52CC' }, // Container Info (Pink/Magenta)
  g5: { fill: '66FFCC', text: '000000', dataText: '000000', border: '4FE0B0' }, // Trucker & Driver (Mint)
  g6: { fill: 'FFFF99', text: '000000', dataText: '000000', border: 'D9D977' }, // Documents & Notes (Yellow)
  g7: { fill: '31859B', text: 'FFFFFF', dataText: 'FFFFFF', border: '256A7C' }, // Status (Teal)
};

function formatShipmentDate(dStr) {
  if (!dStr) return '';
  const d = new Date(dStr);
  if (isNaN(d.getTime())) return String(dStr);
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export default function ExportExcelModal({
  isOpen,
  onClose,
  currentDir = 'Import',
  entry = { Import: [], Export: [] },
  preSelectedRefs = [],
  showToast,
  lang = 'en',
}) {
  const activeDir = currentDir === 'Delivered' ? 'Import' : (currentDir === 'Deleted' ? 'Import' : currentDir);
  const availableCols = useMemo(() => {
    const list = COLS[activeDir] || COLS.Import || [];
    // Exclude action buttons, checkboxes, and internal cards
    return list.filter((c) => !['actions', 'sel', 'opEntered'].includes(c.k));
  }, [activeDir]);

  // Column selection state (Set of column keys)
  const [selectedColKeys, setSelectedColKeys] = useState(new Set());

  // Shipment selection state (Set of shipment refs)
  const [selectedShipmentRefs, setSelectedShipmentRefs] = useState(new Set());

  // Search & date filter states inside the modal
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // 1. Group active rows into shipments
  const allGroupedShipments = useMemo(() => {
    let rows = [];
    if (currentDir === 'Delivered') {
      rows = [
        ...(entry.Import || []).filter((r) => r.status === 'Delivered'),
        ...(entry.Export || []).filter((r) => r.status === 'Delivered'),
      ];
    } else {
      rows = (entry[activeDir] || []).filter((r) => r.status !== 'Delivered');
    }

    const map = new Map();
    rows.forEach((r, idx) => {
      const ref = r._ref || r._operationId || (r.bl ? `BL-${r.bl}` : (r.booking ? `BK-${r.booking}` : `ROW-${idx}`));
      if (!map.has(ref)) {
        map.set(ref, []);
      }
      map.get(ref).push({ ...r, _originalIdx: idx });
    });
    return Array.from(map.values());
  }, [entry, activeDir, currentDir]);

  // Reset form and selections whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setDateFrom('');
      setDateTo('');

      // Default: all data columns selected
      setSelectedColKeys(new Set(availableCols.map((c) => c.k)));

      // If user had selected specific shipments in the main grid, pre-select them;
      // otherwise, default to all shipments selected
      if (Array.isArray(preSelectedRefs) && preSelectedRefs.length > 0) {
        setSelectedShipmentRefs(new Set(preSelectedRefs));
      } else {
        const allRefs = allGroupedShipments.map((s, idx) => s[0]?._ref || `ship_${idx}`);
        setSelectedShipmentRefs(new Set(allRefs));
      }
    }
  }, [isOpen, activeDir, availableCols, allGroupedShipments, preSelectedRefs]);

  // Filtered shipments inside modal
  const filteredModalShipments = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    const from = dateFrom ? dateFrom.slice(0, 10) : null;
    const toDate = dateTo ? dateTo.slice(0, 10) : null;

    return allGroupedShipments.filter((shipRows, idx) => {
      const first = shipRows[0] || {};

      // Text search
      if (q) {
        const matchesQ = shipRows.some((r) => {
          const hay = [
            r.shipNo,
            r.cntr,
            r.bl,
            r.booking,
            r.client,
            r.cert,
            r.line,
            r.dest,
            r.trucker,
            r.driver,
            r.car,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return hay.includes(q);
        });
        if (!matchesQ) return false;
      }

      // Date range filter
      if (from || toDate) {
        const rawDate = first.createdAt || first._createdAtUtc || first.created || first.reqDate || '';
        let rowDate = rawDate.slice(0, 10);
        if (rawDate.includes('T')) {
          const parsed = new Date(rawDate);
          if (!isNaN(parsed.getTime())) {
            const year = parsed.getFullYear();
            const month = String(parsed.getMonth() + 1).padStart(2, '0');
            const day = String(parsed.getDate()).padStart(2, '0');
            rowDate = `${year}-${month}-${day}`;
          }
        }
        if (!rowDate) return false;
        if (from && rowDate < from) return false;
        if (toDate && rowDate > toDate) return false;
      }

      return true;
    });
  }, [allGroupedShipments, searchTerm, dateFrom, dateTo]);

  // Toggle single column
  const toggleCol = (colKey) => {
    setSelectedColKeys((prev) => {
      const next = new Set(prev);
      if (next.has(colKey)) next.delete(colKey);
      else next.add(colKey);
      return next;
    });
  };

  // Toggle all columns
  const allColsSelected = availableCols.every((c) => selectedColKeys.has(c.k));
  const toggleAllCols = () => {
    if (allColsSelected) {
      setSelectedColKeys(new Set());
    } else {
      setSelectedColKeys(new Set(availableCols.map((c) => c.k)));
    }
  };

  // Toggle single shipment
  const toggleShipment = (ref) => {
    setSelectedShipmentRefs((prev) => {
      const next = new Set(prev);
      if (next.has(ref)) next.delete(ref);
      else next.add(ref);
      return next;
    });
  };

  // Toggle all shipments visible in the filtered list
  const allVisibleShipmentsSelected =
    filteredModalShipments.length > 0 &&
    filteredModalShipments.every((s, idx) => selectedShipmentRefs.has(s[0]?._ref || `ship_${idx}`));

  const toggleAllShipments = () => {
    setSelectedShipmentRefs((prev) => {
      const next = new Set(prev);
      if (allVisibleShipmentsSelected) {
        filteredModalShipments.forEach((s, idx) => {
          next.delete(s[0]?._ref || `ship_${idx}`);
        });
      } else {
        filteredModalShipments.forEach((s, idx) => {
          next.add(s[0]?._ref || `ship_${idx}`);
        });
      }
      return next;
    });
  };

  // Download styled Excel (.xlsx) workbook
  const handleDownloadExcel = () => {
    const chosenCols = availableCols.filter((c) => selectedColKeys.has(c.k));
    if (chosenCols.length === 0) {
      const msg = lang === 'ar' ? 'يرجى اختيار عمود واحد على الأقل.' : 'Please select at least one column.';
      if (showToast) showToast(msg, 'warning');
      else console.warn(msg);
      return;
    }

    const chosenShipments = allGroupedShipments.filter((s, idx) =>
      selectedShipmentRefs.has(s[0]?._ref || `ship_${idx}`)
    );

    if (chosenShipments.length === 0) {
      const msg = lang === 'ar' ? 'يرجى اختيار شحنة واحدة على الأقل.' : 'Please select at least one shipment.';
      if (showToast) showToast(msg, 'warning');
      else console.warn(msg);
      return;
    }

    const wb = XLSX.utils.book_new();
    const wsData = [];
    const merges = [];

    // 1. Single header row (English column titles, matching authentic TPT format)
    const headerRow = chosenCols.map((c) => c.h);
    wsData.push(headerRow);

    let currentRowIdx = 1; // Row 0 is header, data rows start at row 1

    chosenShipments.forEach((shipRows) => {
      const rowSpan = shipRows.length;
      const startRow = currentRowIdx;

      shipRows.forEach((r) => {
        const rowCells = [];

        chosenCols.forEach((c) => {
          let cellVal = r[c.k] ?? '';

          // Updates text formatting
          if (c.k === 'updates') {
            if (Array.isArray(cellVal) && cellVal.length > 0) {
              const manual = cellVal.filter(
                (up) =>
                  up &&
                  typeof up === 'object' &&
                  (!up.details ||
                    (!up.details.startsWith('Export container updated') &&
                      !up.details.startsWith('Import container updated')))
              );
              const target = manual.length > 0 ? manual[0] : cellVal[0];
              cellVal = target && typeof target === 'object' ? (target.details || '') : String(target || '');
            } else if (typeof cellVal === 'object' && cellVal !== null) {
              cellVal = cellVal.details || cellVal.name || '';
            }
          }

          // Container type formatting
          if (c.k === 'size' && cellVal) {
            const matchType = CONTAINER_TYPES.find((t) => t.value === cellVal);
            if (matchType) cellVal = matchType.label;
          }

          // Date formatting
          if (c.t === 'date' && cellVal) {
            cellVal = String(cellVal).slice(0, 10);
          }

          if (typeof cellVal === 'object' && cellVal !== null) {
            cellVal = cellVal.name || cellVal.label || '';
          }

          rowCells.push(cellVal);
        });

        wsData.push(rowCells);
        currentRowIdx++;
      });

      // Add merged cells for unique shipment-level columns
      if (rowSpan > 1) {
        chosenCols.forEach((c, cIdx) => {
          if (c.uniq === true) {
            merges.push({
              s: { r: startRow, c: cIdx },
              e: { r: startRow + rowSpan - 1, c: cIdx },
            });
          }
        });
      }
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!merges'] = merges;

    // Apply exact TPT styles: Header & Data cells both get the solid group background fill!
    chosenCols.forEach((c, colIdx) => {
      const gColor = EXCEL_GROUP_COLORS[c.g] || EXCEL_GROUP_COLORS.g7;

      // Header cell (row 0)
      const headerCellRef = XLSX.utils.encode_cell({ r: 0, c: colIdx });
      if (ws[headerCellRef]) {
        ws[headerCellRef].s = {
          fill: { patternType: 'solid', fgColor: { rgb: gColor.fill } },
          font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: gColor.text } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: false },
          border: {
            top: { style: 'thin', color: { rgb: gColor.border } },
            bottom: { style: 'medium', color: { rgb: '334155' } },
            left: { style: 'thin', color: { rgb: gColor.border } },
            right: { style: 'thin', color: { rgb: gColor.border } },
          },
        };
      }

      // Data cells (row 1 to N) - solid group fill matching TPT sheet!
      for (let rIdx = 1; rIdx < wsData.length; rIdx++) {
        const dataCellRef = XLSX.utils.encode_cell({ r: rIdx, c: colIdx });
        if (ws[dataCellRef]) {
          ws[dataCellRef].s = {
            fill: { patternType: 'solid', fgColor: { rgb: gColor.fill } },
            font: { name: 'Calibri', sz: 10, bold: false, color: { rgb: gColor.dataText } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: false },
            border: {
              top: { style: 'thin', color: { rgb: gColor.border } },
              bottom: { style: 'thin', color: { rgb: gColor.border } },
              left: { style: 'thin', color: { rgb: gColor.border } },
              right: { style: 'thin', color: { rgb: gColor.border } },
            },
          };
        }
      }
    });

    // Row heights: Header = 28pt, Data rows = 20pt
    const rowHeights = [{ hpt: 28, hpx: 28 }];
    for (let rIdx = 1; rIdx < wsData.length; rIdx++) {
      rowHeights.push({ hpt: 20, hpx: 20 });
    }
    ws['!rows'] = rowHeights;

    // Explicit column widths (approx 1 character = 7-8 pixels)
    ws['!cols'] = chosenCols.map((c) => ({
      wch: Math.max(16, Math.round((c.w || 150) / 7)),
    }));

    XLSX.utils.book_append_sheet(wb, ws, activeDir.toUpperCase());

    const fileName = `ILS_${activeDir}_Transport_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-emerald-600" />
              <span>Export Excel</span>
            </h3>
            <p className="text-xs text-teal-600 font-medium mt-0.5">
              {activeDir} · Excel
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-1 mt-4 space-y-4">
          {/* Columns Section */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-dashed border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 select-none">
                <input
                  type="checkbox"
                  checked={allColsSelected}
                  onChange={toggleAllCols}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-3.5 w-3.5"
                />
                <span>Columns</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {selectedColKeys.size} of {availableCols.length} selected
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-3 text-xs">
              {availableCols.map((c) => {
                const isChecked = selectedColKeys.has(c.k);
                return (
                  <label
                    key={c.k}
                    className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900 select-none text-[11.5px]"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCol(c.k)}
                      className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-3.5 w-3.5"
                    />
                    <span className="truncate">{c.h}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Shipments / Operations Section */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
            <div className="flex flex-col gap-2.5 pb-2 border-b border-dashed border-slate-200">
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 select-none shrink-0">
                  <input
                    type="checkbox"
                    checked={allVisibleShipmentsSelected}
                    onChange={toggleAllShipments}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-3.5 w-3.5"
                  />
                  <span>Select all</span>
                </label>

                {/* Search Input */}
                <div className="relative flex-1 max-w-sm">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search shipment, container, M/BL or client"
                    className="w-full text-[11px] rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                <span className="text-[11px] font-medium text-slate-500">Operation created from</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="text-xs rounded border border-slate-300 bg-white px-2 py-0.5 text-slate-700 outline-none"
                />
                <span className="text-[11px] font-medium text-slate-500">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="text-xs rounded border border-slate-300 bg-white px-2 py-0.5 text-slate-700 outline-none"
                />
                {(dateFrom || dateTo) && (
                  <button
                    type="button"
                    onClick={() => { setDateFrom(''); setDateTo(''); }}
                    className="text-[11px] text-sky-600 hover:underline cursor-pointer"
                  >
                    Clear dates
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Checklist */}
            <div className="max-h-56 overflow-y-auto pr-1 mt-2.5 rounded-lg border border-slate-200/80 bg-white p-2">
              {filteredModalShipments.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No shipments matching search / date criteria.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  {filteredModalShipments.map((shipRows, idx) => {
                    const first = shipRows[0] || {};
                    const shipRef = first._ref || `ship_${idx}`;
                    const isChecked = selectedShipmentRefs.has(shipRef);

                    const labelBlOrBooking = first.bl || first.booking || first.shipNo || 'N/A';
                    const clientName = first.client || 'Unknown';
                    const dateText = formatShipmentDate(first.createdAt || first._createdAtUtc || first.created || first.reqDate || new Date());

                    const titleText = `#${idx + 1} · ${labelBlOrBooking} · ${clientName} · ${dateText}`;

                    return (
                      <label
                        key={shipRef}
                        title={titleText}
                        className={`flex items-center gap-2 cursor-pointer p-1.5 rounded-md border text-[11px] transition select-none ${
                          isChecked
                            ? 'border-sky-300 bg-sky-50/60 text-slate-900 font-medium'
                            : 'border-transparent text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleShipment(shipRef)}
                          className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-3.5 w-3.5 shrink-0"
                        />
                        <span className="truncate">
                          <span className="font-semibold text-slate-500 mr-1">#{idx + 1}</span>
                          <span className="font-bold text-slate-800">{labelBlOrBooking}</span>
                          <span className="text-slate-400 mx-1">·</span>
                          <span className="text-slate-600">{clientName}</span>
                          <span className="text-slate-400 mx-1">·</span>
                          <span className="text-slate-400 text-[10px]">{dateText}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-2 text-right text-[11px] text-slate-500">
              {selectedShipmentRefs.size} of {allGroupedShipments.length} shipments selected
            </div>
          </div>
        </div>

        {/* Footer with Download Excel on the bottom */}
        <div className="border-t border-slate-100 pt-3 mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={handleDownloadExcel}
            className="flex items-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 text-xs font-semibold shadow-md transition active:scale-95 cursor-pointer"
          >
            <Download size={14} />
            <span>Download Excel</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
