// Dashboard metrics (pure functions).
import C from "./core.js";

  const present = (v) => C.clean(v) !== "";
  function cairoNow() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Cairo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }).formatToParts(new Date()),
      p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
  }
  function dueBucket(value, now = cairoNow()) {
    if (!present(value) || !C.validISO(String(value))) return "unknown";
    const day = String(value).slice(0, 10),
      today = now.slice(0, 10),
      distance = C.days(day, today);
    if (distance < 0 || (String(value).includes("T") && String(value).padEnd(19, ":00") < now)) return "past";
    return distance <= 3 ? "soon" : "later";
  }
  const noDocs = new Set(
    [
      "none",
      "no",
      "n/a",
      "na",
      "nil",
      "لا",
      "لا يوجد",
      "لا توجد",
      "لا يوجد نواقص",
      "لا توجد نواقص",
      "لا مستندات ناقصة",
      "بدون",
      "بدون نواقص",
      "مكتملة",
      "مكتمل",
    ].map(C.norm),
  );
  function docState(k, row, today = C.today()) {
    if (k === "OceanExport") return null;
    if (!present(row.missingDocs)) return "unknown";
    if (noDocs.has(C.norm(row.missingDocs))) return "noneNoted";
    if (k === "Domestic" && C.validISO(String(row.dateOfReceivingMissingDocs)) && row.dateOfReceivingMissingDocs.slice(0, 10) <= today) return "receiptRecorded";
    return "followup";
  }
  function breakdown(rows, key) {
    const map = new Map();
    for (const r of rows) {
      const v = C.clean(r[key]);
      const bucket = v || null;
      const normalized = bucket === null ? "__missing__" : C.id(bucket);
      const old = map.get(normalized);
      if (old) old[1]++;
      else map.set(normalized, [bucket, 1]);
    }
    return [...map.values()].sort((a, b) => b[1] - a[1]);
  }
  function quantity(k, rows) {
    let total = 0,
      known = 0;
    const key = k === "Domestic" ? "numberOfPieces" : "numberOfContainers";
    for (const r of rows) {
      if (present(r[key]) && Number.isSafeInteger(Number(r[key])) && Number(r[key]) >= 0) {
        known++;
        total += Number(r[key]);
      }
    }
    return { total, known, missing: rows.length - known };
  }
  function metrics(k, rows, now = cairoNow()) {
    const today = now.slice(0, 10),
      openRows = rows.filter((r) => r._status !== "Closed"),
      deadline = C.schemas[k].deadline;
    const due = { past: 0, soon: 0, later: 0, unknown: 0 },
      docs = { followup: 0, receiptRecorded: 0, noneNoted: 0, unknown: 0 };
    if (deadline) for (const r of openRows) due[dueBucket(r[deadline], now)]++;
    if (k !== "OceanExport") for (const r of openRows) docs[docState(k, r, today)]++;
    const dated = (key) => rows.filter((r) => C.validISO(String(r[key]))),
      recorded = (key) => dated(key).filter((r) => r[key].slice(0, 10) <= today).length;
    return {
      total: rows.length,
      open: openRows.length,
      closed: rows.length - openRows.length,
      clients: new Set(rows.map((r) => C.id(r.clientId)).filter(Boolean)).size,
      quantity: quantity(k, rows),
      deadline,
      due,
      docs: k === "OceanExport" ? null : docs,
      certificates: rows.filter((r) => present(r.certificateNumber)).length,
      updates: rows.filter((r) => present(r.latestUpdate)).length,
      receiptDates: k === "Domestic" ? recorded("dateOfReceivingMissingDocs") : null,
      futureReceiptDates: k === "Domestic" ? dated("dateOfReceivingMissingDocs").filter((r) => r.dateOfReceivingMissingDocs.slice(0, 10) > today).length : null,
      milestones: k === "OceanExport" ? { certificateDate: recorded("certificateDate"), dateOfCoo: recorded("dateOfCoo"), dateOfReceivingForm13: recorded("dateOfReceivingForm13") } : null,
    };
  }
  function containerTotals(k, rows) {
    const out = new Map();
    for (const r of rows) {
      const n = Number(r.numberOfContainers);
      if (!present(r.numberOfContainers) || !Number.isSafeInteger(n) || n < 0) continue;
      const types = C.containerParts(r);
      if (types.length === n && types.length > 1) {
        for (const type of types) out.set(type || null, (out.get(type || null) || 0) + 1);
      } else {
        const type = types.length === 1 ? types[0] : null;
        out.set(type, (out.get(type) || 0) + n);
      }
    }
    return [...out.entries()].sort((a, b) => b[1] - a[1]);
  }
  const api = { cairoNow, dueBucket, docState, breakdown, quantity, metrics, containerTotals };
  export default api;
