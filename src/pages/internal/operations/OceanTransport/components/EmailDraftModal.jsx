import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, Calendar, Download, Mail, CheckSquare, Square, AlertCircle, Copy, Check } from 'lucide-react';
import { COLS, CONTAINER_TYPES, PAIR_MERGE_COLS } from '../constants';

// Exact group colors matching the Ocean Transport dashboard
const GROUP_STYLES = {
  g1: { bg: '#eaf2e8', border: '#d2e4cf', color: '#2d5a1e' }, // Pale Green
  g2: { bg: '#e6f4f8', border: '#cce9f2', color: '#105463' }, // Pale Blue
  g3: { bg: '#faebeb', border: '#f4d3d3', color: '#8c2c2c' }, // Pale Salmon / Pink
  g4: { bg: '#faebfa', border: '#f2d4f2', color: '#702670' }, // Pale Purple
  g5: { bg: '#eafaf5', border: '#d1f4e7', color: '#146347' }, // Pale Teal
  g6: { bg: '#fafae8', border: '#f4f4ce', color: '#736d10' }, // Pale Yellow
  g7: { bg: '#f0f4f8', border: '#d9e2ec', color: '#203a54' }, // Slate
};

// Default columns excluded upon initial modal opening (user can still select them manually)
const DEFAULT_EXCLUDED_COL_KEYS = new Set([
  'shipNo',   // Shipment #
  'trucker',  // Transporter
  'invRcv',   // Invoices Receive Date
  'missDoc',  // Missing Docs
  'missRcv',  // Receive Date Missing Docs
  'status',   // Status
]);

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

function getRowPairId(row) {
  if (!row) return null;
  if (row._pairId) return row._pairId;
  try {
    const saved = JSON.parse(localStorage.getItem('ocean_container_pairs') || '{}');
    const id = row._rowId || row._containerId;
    if (id && saved[id]) return saved[id];
  } catch (e) {}
  return null;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default function EmailDraftModal({
  isOpen,
  onClose,
  currentDir = 'Import',
  entry = { Import: [], Export: [] },
  activeRows = [],
  preSelectedRefs = [],
  showToast,
  lang = 'en',
}) {
  const activeDir = useMemo(() => {
    if (currentDir === 'Import' || currentDir === 'Export') return currentDir;
    if (Array.isArray(activeRows) && activeRows.length > 0) {
      const isAllExport = activeRows.every((r) => r.dir === 'Export' || (r.booking && !r.bl));
      if (isAllExport) return 'Export';
    }
    return 'Import';
  }, [currentDir, activeRows]);
  const availableCols = useMemo(() => {
    const list = COLS[activeDir] || COLS.Import || [];
    // Exclude action buttons, checkboxes, and internal cards
    return list.filter((c) => !['actions', 'sel', 'opEntered'].includes(c.k));
  }, [activeDir]);

  // Form states
  const [to, setTo] = useState('');
  const [toAlertOpen, setToAlertOpen] = useState(false);
  const [toError, setToError] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

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
    if (Array.isArray(activeRows) && activeRows.length > 0) {
      rows = activeRows;
    } else if (currentDir === 'Delivered') {
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
      map.get(ref).push({ ...r, _originalIdx: idx, _computedShipRef: ref });
    });
    return Array.from(map.values());
  }, [entry, activeDir, currentDir, activeRows]);

  // Reset form and selections whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setSubject(`ILS Transport report — ${activeDir}`);
      setMessage('Dear team,\n\nPlease find the shipment details below.\n\nBest regards.');
      setTo('');
      setSearchTerm('');
      setDateFrom('');
      setDateTo('');

      // Default: 21 standard columns selected (excludes shipment #, trucker, invoices, missing docs, and status)
      setSelectedColKeys(new Set(availableCols.filter((c) => !DEFAULT_EXCLUDED_COL_KEYS.has(c.k)).map((c) => c.k)));

      // If user had selected specific shipments in the main grid, pre-select them;
      // otherwise, select all shipments
      if (Array.isArray(preSelectedRefs) && preSelectedRefs.length > 0) {
        const preSet = new Set(preSelectedRefs);
        const matched = new Set();
        allGroupedShipments.forEach((s, idx) => {
          const first = s[0] || {};
          const ref = first._computedShipRef || first._ref || `ship_${idx}`;
          if (
            preSet.has(ref) ||
            (first._ref && preSet.has(first._ref)) ||
            (first._operationId && preSet.has(first._operationId)) ||
            (first.bl && preSet.has(first.bl)) ||
            (first.booking && preSet.has(first.booking)) ||
            (first.shipNo && preSet.has(first.shipNo))
          ) {
            matched.add(ref);
          }
        });
        setSelectedShipmentRefs(matched.size > 0 ? matched : preSet);
      } else {
        const allRefs = allGroupedShipments.map((s, idx) => s[0]?._computedShipRef || s[0]?._ref || `ship_${idx}`);
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

      // Date range filter (checks created date or reqDate)
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
    filteredModalShipments.every((s, idx) => selectedShipmentRefs.has(s[0]?._computedShipRef || s[0]?._ref || `ship_${idx}`));

  const toggleAllShipments = () => {
    setSelectedShipmentRefs((prev) => {
      const next = new Set(prev);
      if (allVisibleShipmentsSelected) {
        filteredModalShipments.forEach((s, idx) => {
          next.delete(s[0]?._computedShipRef || s[0]?._ref || `ship_${idx}`);
        });
      } else {
        filteredModalShipments.forEach((s, idx) => {
          next.add(s[0]?._computedShipRef || s[0]?._ref || `ship_${idx}`);
        });
      }
      return next;
    });
  };

  // Shared email HTML generator for both .eml download and clipboard reply
  const generateEmailContent = () => {
    const chosenCols = availableCols.filter((c) => selectedColKeys.has(c.k));
    if (chosenCols.length === 0) {
      const msg = lang === 'ar' ? 'يرجى اختيار عمود واحد على الأقل.' : 'Please select at least one column.';
      if (showToast) showToast(msg, 'warning');
      else console.warn(msg);
      return null;
    }

    const chosenShipments = allGroupedShipments.filter((s, idx) =>
      selectedShipmentRefs.has(s[0]?._computedShipRef || s[0]?._ref || `ship_${idx}`)
    );

    if (chosenShipments.length === 0) {
      const msg = lang === 'ar' ? 'يرجى اختيار شحنة واحدة على الأقل.' : 'Please select at least one shipment.';
      if (showToast) showToast(msg, 'warning');
      else console.warn(msg);
      return null;
    }

    // Base optimal widths per column ensuring safe dimensions within Word limits
    const BASE_COL_WIDTHS = {
      shipNo: 50,
      vol: 45,
      oper: 70,
      cert: 90,
      client: 130,
      bl: 110,
      booking: 110,
      line: 85,
      dest: 85,
      pod: 80,
      pol: 80,
      pow: 75,
      clrType: 80,
      customs: 80,
      cut: 80,
      free: 55,
      reqDate: 78,
      reqTime: 55,
      arrDate: 78,
      arrTime: 55,
      gateOut: 78,
      gateOutT: 55,
      size: 70,
      cntr: 105,
      updates: 140,
      trucker: 95,
      car: 65,
      driver: 95,
      mob: 85,
      checkout: 75,
      invRcv: 75,
      missDoc: 80,
      missRcv: 75,
      status: 65,
    };

    // Calculate raw width
    const rawTotalWidth = chosenCols.reduce(
      (sum, c) => sum + (BASE_COL_WIDTHS[c.k] || (c.w ? Math.min(c.w, 110) : 80)),
      0
    );

    // Hard limit in MS Word/Outlook is 22 inches (~2,112px). We strictly cap at 1,800px.
    const MAX_SAFE_TABLE_WIDTH = 1800;
    const scale = rawTotalWidth > MAX_SAFE_TABLE_WIDTH ? MAX_SAFE_TABLE_WIDTH / rawTotalWidth : 1;

    // Build scaled column width map
    const colWidthsMap = {};
    chosenCols.forEach((c) => {
      const base = BASE_COL_WIDTHS[c.k] || (c.w ? Math.min(c.w, 110) : 80);
      colWidthsMap[c.k] = Math.max(36, Math.round(base * scale));
    });

    const totalTableWidth = chosenCols.reduce((sum, c) => sum + colWidthsMap[c.k], 0);

    const isScaledDown = scale < 0.85;
    const cellFontSize = isScaledDown ? '10px' : '11.5px';
    const cellPadding = isScaledDown ? '3px 4px' : '5px 8px';
    const headerPadding = isScaledDown ? '4px 4px' : '6px 8px';

    // Build the HTML Table with strict inline styles and explicit pixel widths
    const theadHtml = `
      <thead>
        <tr style="height: 40px;">
          ${chosenCols
        .map((c) => {
          const colWidth = colWidthsMap[c.k];
          const gStyle = GROUP_STYLES[c.g] || GROUP_STYLES.g7;
          return `<th width="${colWidth}" style="width: ${colWidth}px; background-color: ${gStyle.bg}; border: 1px solid ${gStyle.border}; color: ${gStyle.color}; font-weight: bold; padding: ${headerPadding}; text-align: center; font-size: ${cellFontSize}; line-height: 1.25; white-space: nowrap;">
                <div style="font-size: ${cellFontSize}; font-weight: bold; margin-bottom: 2px; white-space: nowrap;"><span style="white-space: nowrap;">${escapeHtml(c.h)}</span></div>
                ${c.ar && !isScaledDown ? `<div style="font-size: 9px; opacity: 0.85; font-weight: normal; white-space: nowrap;"><span style="white-space: nowrap;">${escapeHtml(c.ar)}</span></div>` : ''}
              </th>`;
        })
        .join('')}
        </tr>
      </thead>
    `;

    const tbodyHtml = `
      <tbody>
        ${chosenShipments
        .map((shipRows, shipIdx) => {
          const rowSpan = shipRows.length;
          const isEvenShip = shipIdx % 2 === 0;
          const shipBg = isEvenShip ? '#ffffff' : '#f8fafc';

          // Pre-calculate merge eligibility per column for this specific shipment:
          // A column is merged IF:
          // 1. Shipment has more than 1 container (rowSpan > 1)
          // 2. Column is unique (c.uniq === true)
          // 3. If canUnmerge is true (e.g. Transporter, Destination, Missing Docs):
          //    only merge if all containers have identical values; if values differ, unmerge!
          const colMergeEligibility = {};
          chosenCols.forEach((c) => {
            if (c.uniq !== true || rowSpan <= 1) {
              colMergeEligibility[c.k] = false;
              return;
            }
            if (c.canUnmerge === true) {
              const distinctVals = new Set(
                shipRows.map((r) => {
                  let v = r[c.k] ?? '';
                  if (typeof v === 'object' && v !== null) {
                    v = v.name || v.label || v.value || v.text || '';
                  }
                  if (c.t === 'date' && v) {
                    v = String(v).slice(0, 10);
                  }
                  return String(v).trim();
                })
              );
              colMergeEligibility[c.k] = distinctVals.size <= 1;
            } else {
              colMergeEligibility[c.k] = true;
            }
          });

          return shipRows
            .map((r, rIdx) => {
              const isFirstRow = rIdx === 0;
              const nextR = shipRows[rIdx + 1];
              const prevR = shipRows[rIdx - 1];
              const pCurrent = r._pairId || getRowPairId(r);
              const pNext = nextR?._pairId || (nextR ? getRowPairId(nextR) : null);
              const pPrev = prevR?._pairId || (prevR ? getRowPairId(prevR) : null);

              const isPairFirst = Boolean(pCurrent && pNext && pCurrent === pNext);
              const isPairSecond = Boolean(pCurrent && pPrev && pCurrent === pPrev);

              const cells = chosenCols
                .map((c) => {
                  const shouldMerge = colMergeEligibility[c.k] === true;
                  if (shouldMerge && !isFirstRow) return null; // handled by shipment-level rowspan

                  const isPairCol = PAIR_MERGE_COLS.includes(c.k) && !shouldMerge;
                  if (isPairCol && isPairSecond) return null; // handled by 2x20' pair rowspan

                  let cellVal = r[c.k] ?? '';

                  // Formatting container updates (extract human-readable text)
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
                      if (target && typeof target === 'object') {
                        cellVal = target.details || target.message || target.text || '';
                      } else if (target) {
                        cellVal = String(target);
                      } else {
                        cellVal = '';
                      }
                    } else if (typeof cellVal === 'object' && cellVal !== null) {
                      cellVal = cellVal.details || cellVal.message || cellVal.text || '';
                    } else {
                      cellVal = cellVal ? String(cellVal) : '';
                    }
                  }

                  // Formatting container types
                  if (c.k === 'size' && cellVal) {
                    const matchType = CONTAINER_TYPES.find((t) => t.value === cellVal);
                    if (matchType) cellVal = matchType.label;
                  }

                  // Formatting dates
                  if (c.t === 'date' && cellVal) {
                    cellVal = String(cellVal).slice(0, 10);
                  }

                  // Safety guard: ensure no object or array ever prints as [object Object]
                  if (typeof cellVal === 'object' && cellVal !== null) {
                    cellVal = cellVal.name || cellVal.label || cellVal.value || cellVal.text || '';
                  }

                  const colWidth = colWidthsMap[c.k];
                  const effectiveRowSpan = shouldMerge && rowSpan > 1 ? rowSpan : (isPairCol && isPairFirst ? 2 : 1);
                  const spanAttr = effectiveRowSpan > 1 ? ` rowspan="${effectiveRowSpan}"` : '';
                  const cellBg = shouldMerge ? shipBg : (rIdx % 2 === 0 ? '#ffffff' : '#fafafa');

                  return `<td width="${colWidth}"${spanAttr} style="width: ${colWidth}px; background-color: ${cellBg}; border: 1px solid #cbd5e1; padding: ${cellPadding}; text-align: center; vertical-align: middle; font-size: ${cellFontSize}; line-height: 1.25; color: #1e293b; white-space: nowrap;">
                      <span style="white-space: nowrap;">${escapeHtml(cellVal)}</span>
                    </td>`;
                })
                .filter(Boolean)
                .join('');

              return `<tr>${cells}</tr>`;
            })
            .join('');
        })
        .join('')}
      </tbody>
    `;

    const fullTableHtml = `
      <div style="overflow-x: auto; width: 100%; margin-top: 18px; margin-bottom: 28px;">
        <table border="1" cellpadding="4" cellspacing="0" width="${totalTableWidth}" style="border-collapse: collapse; width: ${totalTableWidth}px; border: 1px solid #cbd5e1; font-family: 'Segoe UI', Calibri, -apple-system, Arial, sans-serif; font-size: ${cellFontSize}; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
          ${theadHtml}
          ${tbodyHtml}
        </table>
      </div>
    `;

    const formattedMessage = escapeHtml(message).replace(/\n/g, '<br/>');

    const htmlDocument = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(subject)}</title>
<style>
  body { font-family: Segoe UI, Tahoma, Geneva, Verdana, sans-serif; font-size: 13px; color: #1e293b; margin: 24px; line-height: 1.5; }
  .msg-block { font-size: 14px; margin-bottom: 20px; color: #0f172a; }
  .footer-meta { margin-top: 24px; font-size: 11px; color: #94a3b8; font-style: italic; }
</style>
</head>
<body>
  <div class="msg-block">${formattedMessage}</div>
  ${fullTableHtml}
  <div class="footer-meta">Generated via ILS Ocean Transport Platform on ${new Date().toLocaleString()}</div>
</body>
</html>`;

    return {
      theadHtml,
      tbodyHtml,
      fullTableHtml,
      formattedMessage,
      htmlDocument,
      totalTableWidth,
      cellFontSize,
    };
  };

  // EML Download generator (opens standalone draft)
  const handleDownloadEml = () => {
    // 0. Validate recipient email (To) is not empty
    if (!to || !to.trim()) {
      setToError(true);
      setToAlertOpen(true);
      return;
    }

    const content = generateEmailContent();
    if (!content) return;
    const { htmlDocument } = content;

    // Construct RFC 822 / EML draft format with X-Unsent: 1 header
    const emlHeaders = [
      'X-Unsent: 1',
      to ? `To: ${to}` : null,
      `Subject: ${subject || 'ILS Transport Report'}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: 8bit',
    ].filter(Boolean);

    const emlData = `${emlHeaders.join('\r\n')}\r\n\r\n${htmlDocument}`;

    const blob = new Blob([emlData], { type: 'message/rfc822;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeSub = (subject || 'Transport_Report').replace(/[^a-zA-Z0-9_\-\u0600-\u06FF]/g, '_');
    link.href = downloadUrl;
    link.download = `${safeSub}.eml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);

    onClose();
  };

  // Copy for Reply generator (copies rich HTML table to paste directly into existing Outlook thread)
  const handleCopyForReply = async () => {
    const content = generateEmailContent();
    if (!content) return;

    const { theadHtml, tbodyHtml, totalTableWidth, formattedMessage, cellFontSize } = content;

    // Notice: NO wrapping div with width:100% and NO table-layout:fixed to prevent Word/Outlook from squishing columns
    const replyHtml = `
      <div style="font-family: 'Segoe UI', Calibri, -apple-system, Arial, sans-serif; font-size: 13px; color: #1e293b; line-height: 1.5;">
        ${formattedMessage ? `<div style="font-size: 14px; margin-bottom: 16px; color: #0f172a;">${formattedMessage}</div>` : ''}
        <table border="1" cellpadding="4" cellspacing="0" width="${totalTableWidth}" style="border-collapse: collapse; width: ${totalTableWidth}px; border: 1px solid #cbd5e1; font-family: 'Segoe UI', Calibri, -apple-system, Arial, sans-serif; font-size: ${cellFontSize}; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
          ${theadHtml}
          ${tbodyHtml}
        </table>
      </div>
    `;

    const plainText = message ? `${message}\n\n[Table content copied]` : '[Table content copied]';

    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const htmlBlob = new Blob([replyHtml], { type: 'text/html' });
        const textBlob = new Blob([plainText], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': htmlBlob,
            'text/plain': textBlob,
          }),
        ]);
      } else {
        const listener = (e) => {
          e.clipboardData.setData('text/html', replyHtml);
          e.clipboardData.setData('text/plain', plainText);
          e.preventDefault();
        };
        document.addEventListener('copy', listener);
        document.execCommand('copy');
        document.removeEventListener('copy', listener);
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 2500);

      const successMsg = lang === 'ar'
        ? 'تم نسخ الجدول بنجاح! افتح الآوتلوك واضغط Reply ثم الصق (Ctrl + V).'
        : 'Copied! Open Outlook, click Reply, and paste (Ctrl + V).';

      if (showToast) {
        showToast(successMsg, 'success');
      }
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      if (showToast) {
        showToast(lang === 'ar' ? 'تعذر نسخ الجدول' : 'Failed to copy to clipboard', 'error');
      }
    }
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
              <Mail size={18} className="text-sky-600" />
              <span>Download email draft (.eml)</span>
            </h3>
            <p className="text-xs text-teal-600 font-medium mt-0.5">
              {activeDir} · Table embedded in the email
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-1 mt-4 space-y-4">
          {/* To Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              To <span className="text-rose-500">*</span>
            </label>
            <input
              id="email-draft-to-input"
              type="text"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                if (toError && e.target.value.trim()) setToError(false);
              }}
              placeholder="name@company.com; other@company.com"
              className={`w-full text-xs rounded-lg border px-3 py-2 outline-none transition ${toError
                  ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                  : 'border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500'
                }`}
            />
            {toError && (
              <p className="text-[11px] text-rose-600 mt-1 font-medium">
                {lang === 'ar' ? 'يرجى إدخال البريد الإلكتروني (To) هنا' : 'Please enter recipient email address (To)'}
              </p>
            )}
          </div>

          {/* Subject Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-medium"
            />
          </div>

          {/* Message Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Message</label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 leading-relaxed resize-y"
            />
          </div>

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
                    title={`${c.h}${c.ar ? ` (${c.ar})` : ''}`}
                    className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900 select-none text-[11.5px]"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCol(c.k)}
                      className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-3.5 w-3.5 shrink-0"
                    />
                    <span className="truncate">
                      <span className="font-medium text-slate-800">{c.h}</span>
                      {c.ar && <span className="text-slate-500 font-normal ml-1.5 text-[11px]">({c.ar})</span>}
                    </span>
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
                    className="text-[11px] text-sky-600 hover:underline"
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
                    const shipRef = first._computedShipRef || first._ref || `ship_${idx}`;
                    const isChecked = selectedShipmentRefs.has(shipRef);

                    const labelBlOrBooking = first.bl || first.booking || first.shipNo || 'N/A';
                    const clientName = first.client || 'Unknown';
                    const dateText = formatShipmentDate(first.createdAt || first._createdAtUtc || first.created || first.reqDate || new Date());

                    const titleText = `#${idx + 1} · ${labelBlOrBooking} · ${clientName} · ${dateText}`;

                    return (
                      <label
                        key={shipRef}
                        title={titleText}
                        className={`flex items-center gap-2 cursor-pointer p-1.5 rounded-md border text-[11px] transition select-none ${isChecked
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

        {/* Footer */}
        <div className="border-t border-slate-100 pt-3 mt-3">
          <p className="text-[11.5px] text-slate-500 mb-3">
            {lang === 'ar'
              ? 'يمكنك تحميل مسودة (.eml) لفتح إيميل جديد، أو نسخ المحتوى والجدول للرد مباشرة في سكونس مفتوح بالآوتلوك.'
              : 'Download an unsent .eml draft to open a new email, or copy formatted table to reply directly in an existing Outlook thread.'}
          </p>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyForReply}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-sm border transition active:scale-95 ${
                  copied
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400'
                }`}
                title={lang === 'ar' ? 'انسخ الجدول للرد في سكونس مفتوح بالآوتلوك' : 'Copy formatted table to reply into an existing Outlook thread'}
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} className="text-slate-500" />}
                <span>
                  {copied
                    ? (lang === 'ar' ? 'تم النسخ!' : 'Copied!')
                    : (lang === 'ar' ? 'نسخ للرد في سكونس (Copy)' : 'Copy for Reply')}
                </span>
              </button>

              <button
                type="button"
                onClick={handleDownloadEml}
                className="flex items-center gap-2 rounded-xl bg-[#0f4c81] hover:bg-[#0c3d68] text-white px-5 py-2.5 text-xs font-semibold shadow-md transition active:scale-95"
              >
                <Download size={14} />
                <span>Download email draft (.eml)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* To Validation Alert Popup */}
      {toAlertOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
            onClick={() => setToAlertOpen(false)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-3">
              <AlertCircle size={26} />
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-1">
              {lang === 'ar' ? 'البريد الإلكتروني (To) مطلوب' : 'Recipient Email (To) Required'}
            </h4>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              {lang === 'ar'
                ? 'يرجى كتابة البريد الإلكتروني للمستلم في خانة (To) أولاً لتتمكن من تنزيل مسودة الإيميل.'
                : 'Please enter the recipient email address in the "To" field before downloading the draft.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setToAlertOpen(false);
                setTimeout(() => {
                  const input = document.getElementById('email-draft-to-input');
                  if (input) input.focus();
                }, 50);
              }}
              className="w-full rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 text-xs transition shadow-sm"
            >
              {lang === 'ar' ? 'حسناً، فهمت' : 'OK, Got it'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
