import * as XLSX from "xlsx-js-style";
import customsClearanceService from "../../../../services/customsClearanceService";
import C from "./core.js";
import { statusField } from "./format.js";

// Exact FCL Excel solid group fill & font colors mapped to Customs Clearance groups (0..3) + Status (4)
export const CUSTOMS_EXCEL_GROUP_COLORS = {
  0: { fill: "9BBB59", text: "000000", dataText: "000000", border: "7E9847" }, // Reference & Basic (Green)
  1: { fill: "4BACC6", text: "000000", dataText: "000000", border: "3B8D9E" }, // Shipping, Port & Containers (Cyan)
  2: { fill: "C0504D", text: "FFFFFF", dataText: "FFFFFF", border: "9C3E3B" }, // Dates & Times (Crimson)
  3: { fill: "FF66FF", text: "000000", dataText: "000000", border: "CC52CC" }, // Docs, Stage & Updates (Pink/Magenta)
  4: { fill: "31859B", text: "FFFFFF", dataText: "FFFFFF", border: "256A7C" }, // Status (Teal)
};

// Exact FCL Email pastel group header styles mapped to Customs Clearance groups (0..3) + Status (4)
export const CUSTOMS_EMAIL_GROUP_STYLES = {
  0: { bg: "#eaf2e8", border: "#d2e4cf", color: "#2d5a1e" }, // Pale Green
  1: { bg: "#e6f4f8", border: "#cce9f2", color: "#105463" }, // Pale Blue
  2: { bg: "#faebeb", border: "#f4d3d3", color: "#8c2c2c" }, // Pale Salmon / Pink
  3: { bg: "#faebfa", border: "#f2d4f2", color: "#702670" }, // Pale Purple
  4: { bg: "#f0f4f8", border: "#d9e2ec", color: "#203a54" }, // Slate
};

// Status is available in the column picker, unchecked by default (like FCL)
export const DEFAULT_EXCLUDED_CUSTOMS_COLS = new Set(["status"]);

// Base optimal pixel widths per Customs Clearance column for Outlook/Word email tables
const BASE_EMAIL_COL_WIDTHS = {
  shipmentNumber: 80,
  clientId: 135,
  certificateNumber: 100,
  customsDeclarations: 110,
  acidNumber: 135,
  clearanceType: 85,
  customsArea: 95,
  numberOfContainers: 65,
  containerType: 115,
  numberOfPieces: 65,
  mbl: 115,
  hbl: 115,
  bookingNumber: 115,
  commercialInvoiceNumber: 110,
  shippingLine: 105,
  commodity: 115,
  pod: 95,
  pol: 95,
  terminal: 100,
  etaDate: 88,
  ataDate: 88,
  freeTime: 65,
  dateOfFreeTimeEnd: 92,
  doDate: 88,
  inspectionDate: 88,
  dateOfReceivingMissingDocs: 95,
  cutoff: 110,
  loadingDate: 88,
  certificateDate: 88,
  dateOfCoo: 88,
  dateOfReceivingForm13: 95,
  missingDocs: 120,
  currentStage: 155,
  latestUpdate: 160,
  status: 70,
};

/** Returns all exportable columns for a Customs Clearance report type, including Status. */
export function getCustomsExportFields(reportType) {
  const fields = C.reportFields(reportType || "OceanImport");
  return [...fields, { ...statusField(), group: 4 }];
}

/** Escapes HTML special characters safely. */
export function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Formats a date/timestamp as DD-MMM-YYYY (e.g., 26-NOV-2026) for checklist labels. */
export function formatChecklistDate(dStr) {
  if (!dStr) return "";
  const raw = String(dStr).trim();
  const iso = raw.includes("T") && !/(Z|[+-]\d{2}:?\d{2})$/.test(raw) ? raw + "Z" : raw;
  const d = new Date(iso.length === 10 ? iso + "T00:00:00Z" : iso);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = months[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

/** Extracts local Cairo YYYY-MM-DD date string from a shipment for modal date-range filtering. */
export function getShipmentFilterDate(shipment) {
  const raw =
    shipment?.createdAtUtc ||
    C.value(shipment, "etaDate") ||
    C.value(shipment, "loadingDate") ||
    C.value(shipment, "certificateDate") ||
    "";
  if (!raw) return "";
  const s = String(raw).trim();
  if (!s.includes("T")) return s.slice(0, 10);
  const utc = /(Z|[+-]\d{2}:?\d{2})$/.test(s) ? s : s + "Z";
  const d = new Date(utc);
  if (Number.isNaN(d.getTime())) return s.slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Builds searchable haystack text for a Customs Clearance shipment inside the export/email modals. */
export function getShipmentSearchText(shipment, fmt) {
  const parts = [
    shipment.shipmentNumber,
    shipment.certificateNumber,
    fmt.clientName(shipment.clientId),
    C.value(shipment, "acidNumber"),
    C.value(shipment, "mbl"),
    C.value(shipment, "hbl"),
    C.value(shipment, "bookingNumber"),
    C.value(shipment, "commercialInvoiceNumber"),
    C.value(shipment, "shippingLine"),
    C.value(shipment, "pod"),
    C.value(shipment, "pol"),
    C.value(shipment, "terminal"),
    C.value(shipment, "customsArea"),
    C.value(shipment, "commodity"),
    C.value(shipment, "missingDocs"),
    C.value(shipment, "currentStage"),
    shipment.latestUpdate,
    ...C.containerParts(shipment).map((t) => fmt.optionLabel(t)),
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
}

/** Primary display label for a shipment in the modal checklist. */
export function getShipmentChecklistMeta(shipment, fmt) {
  const docRef =
    C.value(shipment, "mbl") ||
    C.value(shipment, "bookingNumber") ||
    shipment.certificateNumber ||
    C.value(shipment, "commercialInvoiceNumber") ||
    shipment.shipmentNumber ||
    "N/A";
  const shipNo = shipment.shipmentNumber && shipment.shipmentNumber !== docRef ? shipment.shipmentNumber : "";
  const clientName = fmt.clientName(shipment.clientId) || "Unknown";
  const dateText = formatChecklistDate(
    shipment.createdAtUtc ||
      C.value(shipment, "etaDate") ||
      C.value(shipment, "loadingDate") ||
      C.value(shipment, "certificateDate"),
  );
  return { docRef, shipNo, clientName, dateText };
}

/**
 * Fetches all shipments for the given Customs Clearance tab (respecting backend MaxPageSize = 100).
 */
export async function fetchAllCustomsShipments({ reportType, status = "Open", search = "", alert = "" }) {
  const pageSize = 100;
  const firstPage = await customsClearanceService.getAll({
    reportType,
    status,
    pageNumber: 1,
    pageSize,
    search,
    alert,
  });

  let allItems = Array.isArray(firstPage?.items) ? [...firstPage.items] : [];
  const totalCount = firstPage?.totalCount || allItems.length;
  const totalPages = Math.ceil(totalCount / pageSize);

  if (totalPages > 1) {
    const pages = [];
    for (let p = 2; p <= totalPages; p++) pages.push(p);
    const results = await Promise.all(
      pages.map((p) =>
        customsClearanceService.getAll({
          reportType,
          status,
          pageNumber: p,
          pageSize,
          search,
          alert,
        }),
      ),
    );
    results.forEach((res) => {
      if (Array.isArray(res?.items)) {
        allItems = allItems.concat(res.items);
      }
    });
  }

  return allItems;
}

/**
 * Smart FCL-style expansion + merge rule for Customs Clearance:
 * - Single value (merged containers, 1 container, Domestic, or split containers that all have the exact same type):
 *   returns 1 single row (1 cell).
 * - Split containers with > 1 distinct container type value (and containerType column is included):
 *   expands into 1 row per container, so containerType unmerges and all other shipment columns merge vertically.
 */
export function expandShipmentForExport(shipment, includeContainerType = true) {
  if (!shipment) return [];
  if (shipment.reportType === "Domestic") {
    return [{ shipment, containerTypeValue: "", rowSpan: 1, subIdx: 0 }];
  }

  const parts = C.containerParts(shipment);
  const split = C.isSplit(shipment);

  if (includeContainerType && split && parts.length > 1) {
    const distinctTypes = new Set(parts.map((p) => String(p || "").trim()));
    if (distinctTypes.size > 1) {
      return parts.map((part, idx) => ({
        shipment,
        containerTypeValue: part,
        rowSpan: parts.length,
        subIdx: idx,
      }));
    }
  }

  return [{ shipment, containerTypeValue: parts[0] || "", rowSpan: 1, subIdx: 0 }];
}

/** Formats a single Customs Clearance cell value cleanly for Excel or HTML email. */
export function formatCustomsCellValue(shipment, containerTypeValue, field, fmt, { forExcel = false } = {}) {
  if (!shipment || !field) return "";

  if (C.inactive(shipment.reportType, field.key, shipment)) return "";

  if (field.key === "containerType") {
    return containerTypeValue ? fmt.optionLabel(containerTypeValue) : "";
  }

  const raw = C.value(shipment, field.key);
  if (raw === null || raw === undefined || raw === "") return "";

  if (field.key === "clientId") return fmt.clientName(raw);
  if (field.key === "clearanceType") return fmt.clearanceName(raw);
  if (field.key === "track") return fmt.trackLabel(String(raw));
  if (["pod", "pol", "terminal", "currentStage"].includes(field.key)) {
    return fmt.optionLabel(String(raw));
  }
  if (field.key === "status") return fmt.statusName(raw);

  if (field.type === "date") {
    return String(raw).slice(0, 10);
  }
  if (field.type === "datetime") {
    return String(raw).replace("T", " ").slice(0, 16);
  }
  if (field.type === "number") {
    if (forExcel) {
      const n = Number(raw);
      return Number.isFinite(n) ? n : String(raw);
    }
    return String(raw);
  }

  if (typeof raw === "object") {
    return raw.name || raw.label || raw.value || raw.text || "";
  }

  return String(raw);
}

/** Generates and downloads an FCL-styled .xlsx workbook using xlsx-js-style. */
export function downloadCustomsExcel({ reportType, status = "Open", shipments, chosenCols, fmt }) {
  const wb = XLSX.utils.book_new();
  const wsData = [];
  const merges = [];

  // 1. Single header row (clean English titles, matching FCL Excel format)
  wsData.push(chosenCols.map((c) => c.en));

  const hasContainerType = chosenCols.some((c) => c.key === "containerType");
  let currentRowIdx = 1;

  shipments.forEach((shipment) => {
    const subRows = expandShipmentForExport(shipment, hasContainerType);
    const rowSpan = subRows.length;
    const startRow = currentRowIdx;

    subRows.forEach(({ shipment: s, containerTypeValue }) => {
      const rowCells = chosenCols.map((c) =>
        formatCustomsCellValue(s, containerTypeValue, c, fmt, { forExcel: true }),
      );
      wsData.push(rowCells);
      currentRowIdx++;
    });

    // Merge all shipment-level columns when split across > 1 differing container rows
    if (rowSpan > 1) {
      chosenCols.forEach((c, cIdx) => {
        if (c.key !== "containerType") {
          merges.push({
            s: { r: startRow, c: cIdx },
            e: { r: startRow + rowSpan - 1, c: cIdx },
          });
        }
      });
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!merges"] = merges;

  // Apply exact FCL styles: solid group fill on both header & data cells
  chosenCols.forEach((c, colIdx) => {
    const gColor = CUSTOMS_EXCEL_GROUP_COLORS[c.group] || CUSTOMS_EXCEL_GROUP_COLORS[4];

    const headerRef = XLSX.utils.encode_cell({ r: 0, c: colIdx });
    if (ws[headerRef]) {
      ws[headerRef].s = {
        fill: { patternType: "solid", fgColor: { rgb: gColor.fill } },
        font: { name: "Calibri", sz: 11, bold: true, color: { rgb: gColor.text } },
        alignment: { horizontal: "center", vertical: "center", wrapText: false },
        border: {
          top: { style: "thin", color: { rgb: gColor.border } },
          bottom: { style: "medium", color: { rgb: "334155" } },
          left: { style: "thin", color: { rgb: gColor.border } },
          right: { style: "thin", color: { rgb: gColor.border } },
        },
      };
    }

    for (let rIdx = 1; rIdx < wsData.length; rIdx++) {
      const cellRef = XLSX.utils.encode_cell({ r: rIdx, c: colIdx });
      if (ws[cellRef]) {
        ws[cellRef].s = {
          fill: { patternType: "solid", fgColor: { rgb: gColor.fill } },
          font: { name: "Calibri", sz: 10, bold: false, color: { rgb: gColor.dataText } },
          alignment: {
            horizontal: "center",
            vertical: "center",
            wrapText: c.type === "note" || c.key === "currentStage",
          },
          border: {
            top: { style: "thin", color: { rgb: gColor.border } },
            bottom: { style: "thin", color: { rgb: gColor.border } },
            left: { style: "thin", color: { rgb: gColor.border } },
            right: { style: "thin", color: { rgb: gColor.border } },
          },
        };
      }
    }
  });

  const rowHeights = [{ hpt: 28, hpx: 28 }];
  for (let rIdx = 1; rIdx < wsData.length; rIdx++) {
    rowHeights.push({ hpt: 20, hpx: 20 });
  }
  ws["!rows"] = rowHeights;

  ws["!cols"] = chosenCols.map((c) => {
    const baseWidth =
      c.type === "note" || c.key === "currentStage"
        ? 34
        : c.key === "acidNumber"
          ? 24
          : ["date", "datetime"].includes(c.type)
            ? 18
            : Math.max(16, Math.round((c.en.length + 5) * 1.15));
    return { wch: baseWidth };
  });

  const sheetTitle = (C.schemas[reportType]?.sheet || reportType || "Customs").slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, sheetTitle);

  const today = new Date().toISOString().slice(0, 10);
  const fileName = `ILS_Customs_${reportType}_${status}_${today}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/** Builds Outlook/Word-safe HTML table, full .eml HTML document, and Copy-for-Reply HTML. */
export function buildCustomsEmailContent({ shipments, chosenCols, subject, message, fmt }) {
  const rawTotalWidth = chosenCols.reduce((sum, c) => sum + (BASE_EMAIL_COL_WIDTHS[c.key] || 95), 0);

  // MS Word / Outlook hard table width limit is ~22in (~2112px). Cap strictly at 1800px.
  const MAX_SAFE_TABLE_WIDTH = 1800;
  const scale = rawTotalWidth > MAX_SAFE_TABLE_WIDTH ? MAX_SAFE_TABLE_WIDTH / rawTotalWidth : 1;

  const colWidthsMap = {};
  chosenCols.forEach((c) => {
    const base = BASE_EMAIL_COL_WIDTHS[c.key] || 95;
    colWidthsMap[c.key] = Math.max(42, Math.round(base * scale));
  });

  const totalTableWidth = chosenCols.reduce((sum, c) => sum + colWidthsMap[c.key], 0);
  const isScaledDown = scale < 0.85;
  const cellFontSize = isScaledDown ? "10px" : "11.5px";
  const cellPadding = isScaledDown ? "3px 4px" : "5px 8px";
  const headerPadding = isScaledDown ? "4px 4px" : "6px 8px";

  const theadHtml = `
    <thead>
      <tr style="height: 40px;">
        ${chosenCols
          .map((c) => {
            const colWidth = colWidthsMap[c.key];
            const gStyle = CUSTOMS_EMAIL_GROUP_STYLES[c.group] || CUSTOMS_EMAIL_GROUP_STYLES[4];
            return `<th width="${colWidth}" style="width: ${colWidth}px; background-color: ${gStyle.bg}; border: 1px solid ${gStyle.border}; color: ${gStyle.color}; font-weight: bold; padding: ${headerPadding}; text-align: center; font-size: ${cellFontSize}; line-height: 1.25; white-space: nowrap;">
              <div style="font-size: ${cellFontSize}; font-weight: bold; margin-bottom: 2px; white-space: nowrap;"><span style="white-space: nowrap;">${escapeHtml(c.en)}</span></div>
              ${c.ar && !isScaledDown ? `<div style="font-size: 9px; opacity: 0.85; font-weight: normal; white-space: nowrap;"><span style="white-space: nowrap;">${escapeHtml(c.ar)}</span></div>` : ""}
            </th>`;
          })
          .join("")}
      </tr>
    </thead>
  `;

  const hasContainerType = chosenCols.some((c) => c.key === "containerType");

  const tbodyHtml = `
    <tbody>
      ${shipments
        .map((shipment, shipIdx) => {
          const subRows = expandShipmentForExport(shipment, hasContainerType);
          const rowSpan = subRows.length;
          const isEvenShip = shipIdx % 2 === 0;
          const shipBg = isEvenShip ? "#ffffff" : "#f8fafc";

          return subRows
            .map(({ shipment: s, containerTypeValue, subIdx }) => {
              const isFirstRow = subIdx === 0;

              const cells = chosenCols
                .map((c) => {
                  const shouldMerge = rowSpan > 1 && c.key !== "containerType";
                  if (shouldMerge && !isFirstRow) return null;

                  const cellVal = formatCustomsCellValue(s, containerTypeValue, c, fmt, { forExcel: false });
                  const colWidth = colWidthsMap[c.key];
                  const spanAttr = shouldMerge ? ` rowspan="${rowSpan}"` : "";
                  const cellBg = shouldMerge ? shipBg : subIdx % 2 === 0 ? shipBg : "#fafafa";
                  const allowWrap = c.type === "note" || c.key === "currentStage";
                  const whiteSpaceStyle = allowWrap ? "normal; word-break: break-word;" : "nowrap;";

                  return `<td width="${colWidth}"${spanAttr} style="width: ${colWidth}px; background-color: ${cellBg}; border: 1px solid #cbd5e1; padding: ${cellPadding}; text-align: center; vertical-align: middle; font-size: ${cellFontSize}; line-height: 1.25; color: #1e293b; white-space: ${whiteSpaceStyle}">
                    <span style="white-space: ${whiteSpaceStyle}">${escapeHtml(cellVal)}</span>
                  </td>`;
                })
                .filter(Boolean)
                .join("");

              return `<tr>${cells}</tr>`;
            })
            .join("");
        })
        .join("")}
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

  const formattedMessage = escapeHtml(message).replace(/\n/g, "<br/>");

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
  <div class="footer-meta">Generated via ILS Customs Clearance Platform on ${new Date().toLocaleString()}</div>
</body>
</html>`;

  // Copy for Reply HTML: NO wrapping div with width:100% so Word/Outlook never squishes columns
  const replyHtml = `
    <div style="font-family: 'Segoe UI', Calibri, -apple-system, Arial, sans-serif; font-size: 13px; color: #1e293b; line-height: 1.5;">
      ${formattedMessage ? `<div style="font-size: 14px; margin-bottom: 16px; color: #0f172a;">${formattedMessage}</div>` : ""}
      <table border="1" cellpadding="4" cellspacing="0" width="${totalTableWidth}" style="border-collapse: collapse; width: ${totalTableWidth}px; border: 1px solid #cbd5e1; font-family: 'Segoe UI', Calibri, -apple-system, Arial, sans-serif; font-size: ${cellFontSize}; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
        ${theadHtml}
        ${tbodyHtml}
      </table>
    </div>
  `;

  return {
    theadHtml,
    tbodyHtml,
    fullTableHtml,
    replyHtml,
    formattedMessage,
    htmlDocument,
    totalTableWidth,
    cellFontSize,
  };
}

/** Encodes an email Subject safely with RFC 2047 UTF-8 Base64 if it contains non-ASCII characters. */
export function encodeEmlSubject(subject) {
  const clean = String(subject || "ILS Customs Clearance Report").replace(/[\r\n]+/g, " ").trim();
  if (/^[\x20-\x7E]*$/.test(clean)) return clean;
  const bytes = new TextEncoder().encode(clean);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return `=?UTF-8?B?${btoa(bin)}?=`;
}
