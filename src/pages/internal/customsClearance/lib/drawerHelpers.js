import C from "./core.js";

// Shared by the shipment details drawers (report pill colors, Cairo stamps, containers, document number).

export const TYPE_BADGE = {
  OceanImport: "bg-sky-50 text-sky-700 border border-sky-200",
  OceanExport: "bg-purple-50 text-purple-700 border border-purple-200",
  Domestic: "bg-amber-50 text-amber-800 border border-amber-200",
};

/** "22-NOV-2026 · 11:06" in Cairo time. API UTC values without a zone are read as UTC. */
export function cairoStamp(value, ar, sep = " · ") {
  if (!value) return "—";
  const s = String(value);
  const d = new Date(/(Z|[+-]\d\d:?\d\d)$/.test(s) ? s : s + "Z");
  if (Number.isNaN(d.getTime())) return s;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Cairo",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  const text = `${parts.day}-${String(parts.month).toUpperCase()}-${parts.year}${sep}${parts.hour}:${parts.minute}`;
  return ar ? text.replace(/\d/g, (n) => "٠١٢٣٤٥٦٧٨٩"[n]) : text;
}

/** Count + types: merged rows have one type for all containers, split rows one type per container. */
export function containerInfo(r) {
  if (r.reportType === "Domestic") return { pieces: Number(C.value(r, "numberOfPieces")) || 0, count: 0, split: false, parts: [] };
  const count = Number(C.value(r, "numberOfContainers")) || 0;
  return { pieces: 0, count, split: C.isSplit(r), parts: C.containerParts(r) };
}

/** The shipment's main document: MB/L, booking, certificate or commercial invoice. */
export const docNumber = (r) =>
  C.value(r, "mbl") || C.value(r, "bookingNumber") || r.certificateNumber || C.value(r, "commercialInvoiceNumber") || "—";
