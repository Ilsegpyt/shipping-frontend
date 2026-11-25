import ExcelJS from "exceljs";
import { PDFDocument } from "pdf-lib";
import C from "./core.js";
import { uid } from "./format.js";

const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const groupColors = ["0B4F7A", "0B4F7A", "0B4F7A", "0B4F7A"];
/** Cell value for an API row: same field names; split containers are listed as "20 | 40 | 40 HC". */
export const cellValue = (r, f) => (f.key === "containerType" ? C.containerParts(r).join(" | ") : C.value(r, f.key));

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function saveBlob(blob, file) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

/** groups: [{ k, rows, fields }] */
export async function workbookBuffer(groups, fmt) {
  const { t } = fmt;
  const wb = new ExcelJS.Workbook();
  wb.creator = "ILS Egypt";
  wb.created = new Date();
  for (const { k, rows, fields } of groups) {
    const ws = wb.addWorksheet(C.schemas[k].sheet);
    ws.views = [{ state: "frozen", ySplit: 5, xSplit: 1 }];
    ws.getCell("A1").value = t("ILS Egypt · Customs Clearance", "ILS مصر · التخليص الجمركي");
    ws.getCell("A1").font = { bold: true, size: 16, color: { argb: "0B4F7A" } };
    ws.getCell("A2").value = t(C.schemas[k].sheet, C.schemas[k].ar);
    ws.getCell("A3").value = t("Shipment records · " + C.today(), "سجل الشحنات · " + C.today());
    ws.getRow(4).values = fields.map((f) => f.sourceEn || f.en);
    ws.getRow(5).values = fields.map((f) => (f.sourceAr === null ? "" : f.sourceAr || f.ar));
    ws.getRow(4).height = 32;
    ws.getRow(5).height = 30;
    fields.forEach((f, i) => {
      ws.getColumn(i + 1).width =
        f.type === "note" ? 38 : f.type === "date" || f.type === "datetime" ? 24 : Math.min(30, Math.max(18, f.en.length + 3));
      for (const n of [4, 5]) {
        const c = ws.getCell(n, i + 1);
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: groupColors[f.group] } };
        c.font = { bold: true, color: { argb: (n === 4 ? C.entryKeys[k] : C.uniqueKeys[k]).includes(f.key) ? "FFFF0000" : "FFFFFFFF" }, size: 10 };
        c.alignment = { wrapText: true, vertical: "middle", horizontal: "center" };
      }
    });
    rows.forEach((r) => {
      const vals = fields.map((f) => {
        const v = f.key === "clientId" ? fmt.clientName(r.clientId) : cellValue(r, f);
        if (v == null || v === "") return null;
        if (f.key === "status") return r.status;
        if (f.type === "date" || f.type === "datetime") return new Date(v + (v.includes("T") ? "Z" : "T00:00:00Z"));
        return f.type === "number" && typeof v !== "string" ? Number(v) : String(v);
      });
      const er = ws.addRow(vals);
      er.height = 26;
      fields.forEach((f, i) => {
        const c = er.getCell(i + 1);
        c.font = { name: "Arial", size: 10 };
        c.alignment = { vertical: "middle", horizontal: f.type === "number" ? "right" : "left" };
        c.numFmt =
          f.type === "date" ? "dd-mmm-yyyy"
          : f.type === "datetime" ? (String(cellValue(r, f)).includes("T") ? "dd-mmm-yyyy hh:mm" : "dd-mmm-yyyy")
          : f.type === "number" ? "0" : "@";
        if (er.number % 2 === 0) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F2F7FA" } };
      });
    });
    ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: rows.length + 5, column: fields.length } };
  }
  return wb.xlsx.writeBuffer();
}

/**
 * snapshot: { title, meta, active, kpis: [{label, value}], insights: [string], charts: [{ title, chart }] }
 * Pages are drawn on a canvas, then embedded as JPEG into an A4-landscape PDF.
 */
export async function dashboardPDF(snapshot, fmt) {
  const { t, lang } = fmt;
  const pdf = await PDFDocument.create();
  const W = 1600, H = 1132, margin = 80, rtl = lang === "ar";
  let canvas, ctx, y, pageNo = 0;
  const write = (text, x, yy, size = 25, color = "#16324a", bold = false) => {
    ctx.font = (bold ? "bold " : "") + size + "px Segoe UI,Arial,sans-serif";
    ctx.fillStyle = color;
    ctx.direction = rtl ? "rtl" : "ltr";
    ctx.textAlign = rtl ? "right" : "left";
    ctx.fillText(String(text), x, yy);
  };
  const wrap = (text, width, size = 24) => {
    ctx.font = size + "px Segoe UI,Arial,sans-serif";
    const out = [];
    let line = "";
    for (const word of String(text).split(/\s+/)) {
      const next = line ? line + " " + word : word;
      if (ctx.measureText(next).width > width && line) {
        out.push(line);
        line = word;
      } else line = next;
    }
    if (line) out.push(line);
    return out;
  };
  const x = () => (rtl ? W - margin : margin);
  const newPage = () => {
    canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#062a4a";
    ctx.fillRect(0, 0, W, 108);
    write(t("ILS Egypt · Customs Clearance", "ILS مصر · التخليص الجمركي"), x(), 65, 31, "#fff", true);
    y = 160;
    pageNo++;
  };
  const finish = async () => {
    write(pageNo, rtl ? margin : W - margin, H - 35, 18, "#66788c");
    const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.9));
    const image = await pdf.embedJpg(await blob.arrayBuffer());
    const p = pdf.addPage([841.89, 595.28]);
    p.drawImage(image, { x: 0, y: 0, width: 841.89, height: 595.28 });
  };
  const ensure = async (h) => {
    if (y + h > H - 70) {
      await finish();
      newPage();
    }
  };

  newPage();
  write(snapshot.title, x(), y, 33, "#0b4f7a", true);
  y += 48;
  for (const line of wrap(snapshot.meta, W - margin * 2, 21)) { write(line, x(), y, 21, "#66788c"); y += 29; }
  for (const line of wrap(snapshot.active, W - margin * 2, 20)) { write(line, x(), y, 20, "#66788c"); y += 28; }
  y += 20;
  for (const kpi of snapshot.kpis) {
    await ensure(55);
    write(kpi.label + " : " + kpi.value, x(), y, 25, "#16324a", true);
    y += 45;
  }
  y += 15;
  for (const text of snapshot.insights)
    for (const line of wrap(text, W - margin * 2, 22)) {
      await ensure(35);
      write(line, x(), y, 22);
      y += 33;
    }
  for (const { title, chart } of snapshot.charts) {
    await ensure(550);
    write(title, x(), y, 27, "#0b4f7a", true);
    y += 45;
    const img = new Image();
    img.src = chart.toBase64Image();
    await img.decode();
    const h = Math.min(450, (img.height * (W - margin * 2)) / img.width);
    ctx.drawImage(img, margin, y, W - margin * 2, h);
    y += h + 35;
  }
  await finish();
  return new Blob([await pdf.save()], { type: "application/pdf" });
}

export function tableHTML(rows, fields, fmt) {
  const { label, display } = fmt;
  return (
    '<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px"><thead><tr>' +
    fields.map((f) => '<th style="background:#' + groupColors[f.group] + ';color:white;padding:8px;border:1px solid #d8e3ea">' + esc(label(f)) + "</th>").join("") +
    "</tr></thead><tbody>" +
    rows
      .map((r, i) =>
        "<tr>" +
        fields.map((f) => '<td style="border:1px solid #d8e3ea;padding:7px;background:' + (i % 2 ? "#f2f7fa" : "white") + '">' + esc(display(cellValue(r, f), f)) + "</td>").join("") +
        "</tr>")
      .join("") +
    "</tbody></table>"
  );
}

export function emailSnapshot(snapshot, fmt) {
  return (
    "<h2>" + esc(fmt.t("ILS Egypt · Customs Clearance", "ILS مصر · التخليص الجمركي")) + "</h2><p>" + esc(snapshot.meta) +
    '</p><table style="font:13px Arial;border-collapse:collapse">' +
    snapshot.kpis
      .map((k) =>
        '<tr><td style="padding:7px;border-bottom:1px solid #eee">' + esc(k.label) +
        '</td><td style="padding:7px;font-weight:bold;border-bottom:1px solid #eee">' + esc(k.value) + "</td></tr>")
      .join("") +
    "</table><ul>" + snapshot.insights.map((x) => "<li>" + esc(x) + "</li>").join("") + "</ul>"
  );
}
export { esc };

export async function blobB64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let str = "";
  for (let i = 0; i < bytes.length; i += 32768) str += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(str);
}

/** Builds an unsent .eml draft (X-Unsent: 1) with text, html and attachments. */
export async function emlBlob(m) {
  const boundary = "ILS-" + uid();
  const alt = "ALT-" + uid();
  const utf = (v) => btoa(String.fromCharCode(...new TextEncoder().encode(v)));
  const fold = (v) => v.match(/.{1,76}/g)?.join("\r\n") || "";
  let s =
    "To: " + m.to.join(", ") +
    "\r\nSubject: =?UTF-8?B?" + utf(m.subject) +
    "?=\r\nDate: " + new Date().toUTCString() +
    '\r\nMIME-Version: 1.0\r\nX-Unsent: 1\r\nContent-Type: multipart/mixed; boundary="' + boundary +
    '"\r\n\r\n--' + boundary +
    '\r\nContent-Type: multipart/alternative; boundary="' + alt + '"\r\n\r\n';
  for (const [mime, value] of [["text/plain", m.text], ["text/html", m.html]])
    s += "--" + alt + "\r\nContent-Type: " + mime + "; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" + fold(await blobB64(new Blob([value]))) + "\r\n";
  s += "--" + alt + "--\r\n";
  for (const a of m.attachments)
    s +=
      "--" + boundary + "\r\nContent-Type: " + a.mime + '; name="' + a.name +
      '"\r\nContent-Disposition: attachment; filename="' + a.name +
      '"\r\nContent-Transfer-Encoding: base64\r\n\r\n' + fold(await blobB64(a.blob)) + "\r\n";
  return new Blob([s + "--" + boundary + "--\r\n"], { type: "message/rfc822" });
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.append(ta);
  ta.select();
  const ok = document.execCommand("copy");
  ta.remove();
  if (!ok) throw Error("copy failed");
}
