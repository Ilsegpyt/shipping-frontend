import C from "./core.js";

export const uid = () =>
  globalThis.crypto?.randomUUID?.() || "row-" + Date.now() + "-" + Math.random().toString(36).slice(2);

export const statusField = () => ({ key: "status", en: "Status", ar: "حالة الشحنة", type: "text", group: 3 });
export const allFields = (k) => [...C.reportFields(k), statusField()];
export const reportExportFields = (k) => [...C.reportFields(k)];

export const fieldColor = (f) => ["#9BBB59", "#4BACC6", "#C0504D", "#FF66FF"][f.group] || "#8FA3B4";
export const fieldWidth = (f) =>
  f.key === "acidNumber" ? 200 : f.type === "note" ? 240 : ["date", "datetime"].includes(f.type) ? 190 : 160;
export const inputType = (f) => (f?.type === "date" ? "date" : f?.type === "datetime" ? "datetime-local" : "text");

const OPTION_LABELS = {
  DryStandard20: ["20' Dry Standard", "20' Dry Standard"],
  DryStandard40: ["40' Dry Standard", "40' Dry Standard"],
  DryHigh40: ["40' Dry High", "40' Dry High"],
  DryHigh45: ["45' Dry High", "45' Dry High"],
  ReeferStandard20: ["20' Reefer Standard", "20' Reefer Standard"],
  ReeferHigh40: ["40' Reefer High", "40' Reefer High"],
  OpenTop20: ["20' Open Top", "20' Open Top"],
  OpenTop40: ["40' Open Top", "40' Open Top"],
  OpenTopHigh40: ["40' Open Top High", "40' Open Top High"],
  FlatStandard40: ["40' Flat Standard", "40' Flat Standard"],
  FlatHigh40: ["40' Flat High", "40' Flat High"],
  Flat20: ["20' Flat", "20' Flat"],
  Tank20: ["20' Tank", "20' Tank"],
  Tank40: ["40' Tank", "40' Tank"],
  // Legacy values for existing records
  20: ["20 ft", "20 قدم"],
  40: ["40 ft", "40 قدم"],
  "40 HC": ["40 HC", "40 HC"],
  "45 HC": ["45 HC", "45 HC"],
  Dubai: ["Dubai", "دبي"],
  "Red Sea": ["Red Sea", "بحر أحمر"],
  دبي: ["Dubai", "دبي"],
  "بحر احمر": ["Red Sea", "بحر أحمر"],
  Import: ["Import", "وارد"],
  Transit: ["Transit", "ترانزيت"],
  وارد: ["Import", "وارد"],
  ترانزيت: ["Transit", "ترانزيت"],
};

// Ocean Import customs track (API value -> [English, Arabic]).
const TRACK_LABELS = {
  Blue: ["Blue track", "مسار أزرق"],
  Yellow: ["Yellow track", "مسار أصفر"],
  Green: ["Green track", "مسار أخضر"],
  Red: ["Red track", "مسار أحمر"],
  GreenImports: ["Green imports track", "مسار أخضر واردات"],
};

/** Builds every language-dependent helper once per language (and lookup load). */
export function makeFmt(lang, lookups = {}) {
  const ar = lang === "ar";
  const t = (en, arText) => (ar ? arText : en);
  const label = (f) => (f ? (ar ? f.ar : f.en) : "");
  const name = (k) => t(C.schemas[k].name, C.schemas[k].ar);
  const fmtN = (n) => Number(n).toLocaleString(ar ? "ar-EG" : "en-US");
  const statusName = (s) => (s === "Closed" ? t("Closed", "مغلقة") : t("Open", "مفتوحة"));
  const clearanceName = (v) => {
    const c = C.clearanceType(v);
    if (c === "Certificate") return t("Certificate", "شهادة");
    if (c === "Bosla") return t("Bosla", "بوصلة");
    if (c === "Import") return t("Import", "وارد");
    if (c === "Transit") return t("Transit", "ترانزيت");
    return v;
  };
  const optionLabel = (v) => (OPTION_LABELS[v] ? t(...OPTION_LABELS[v]) : v);
  const trackLabel = (v) => (TRACK_LABELS[v] ? t(...TRACK_LABELS[v]) : v);
  // Rows store the client GUID; the table, copy, email and Excel show the client name.
  const clientNames = new Map((lookups.clients || []).map((c) => [String(c.id).toLowerCase(), c.name]));
  const clientName = (id) => clientNames.get(String(id ?? "").toLowerCase()) || (id ? t("Unknown client", "عميل غير معروف") : "");

  function display(v, f) {
    if (v === "" || v == null) return "—";
    if (f.key === "clientId") return clientName(v);
    if (f.key === "clearanceType") return clearanceName(v);
    if (f.key === "track") return trackLabel(String(v));
    if (["pod", "pol", "terminal", "currentStage", "containerType"].includes(f.key)) return optionLabel(String(v));
    if (f.key === "status") return statusName(v);
    if (["date", "datetime"].includes(f.type)) {
      if (!C.validISO(String(v))) return String(v);
      const d = new Date(String(v).slice(0, 10) + "T00:00:00Z");
      const opts = { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" };
      const date = ar
        ? new Intl.DateTimeFormat("ar-EG", opts).format(d)
        : new Intl.DateTimeFormat("en-GB", opts).format(d).toUpperCase().replace(/ /g, "-");
      return date + (String(v).includes("T") ? " " + String(v).slice(11, 16) : "");
    }
    return f.type === "number" ? fmtN(v) : String(v);
  }

  const typeLabel = (f) =>
    ["date", "datetime"].includes(f.type)
      ? t("Date", "تاريخ")
      : f.type === "number"
        ? t("Number", "عدد")
        : ["shipmentNumber", "certificateNumber", "acidNumber", "mbl", "hbl", "bookingNumber", "commercialInvoiceNumber"].includes(f.key)
          ? t("Number / ID", "رقم / معرّف")
          : t("Text", "نص");

  function stamp(at) {
    if (!at) return "—";
    // The API sends UTC times without an offset; read them as UTC, then show Cairo time.
    const utc = typeof at === "string" && at.includes("T") && !/(Z|[+-]\d{2}:\d{2})$/.test(at) ? at + "Z" : at;
    const d = new Date(utc);
    return isNaN(d)
      ? at
      : new Intl.DateTimeFormat(ar ? "ar-EG" : "en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Africa/Cairo",
        }).format(d);
  }

  const opName = (op) =>
    ({
      contains: t("contains", "يحتوي"),
      notContains: t("does not contain", "لا يحتوي"),
      eq: "=",
      ne: "≠",
      gt: ">",
      gte: "≥",
      lt: "<",
      lte: "≤",
      empty: t("is empty", "فارغ"),
      filled: t("is filled", "غير فارغ"),
    })[op] || op;

  function message(e, k) {
    const l = label(allFields(k).find((f) => f.key === e.key));
    switch (e.code) {
      case "required": return l + t(" is required.", " مطلوب.");
      case "duplicate": return l + t(" already exists in this report.", " موجود بالفعل في القسم ده.");
      case "acidNumber": return t("ACID must contain exactly 19 digits.", "رقم ACID لازم يكون 19 رقم بالضبط.");
      case "inactive": return l + t(" must be blank for this clearance type.", " لازم يكون فاضي لنوع البيان المختار.");
      case "choice": return t("Choose Certificate or Bosla.", "اختار شهادة أو بوصلة.");
      case "containers": return t("Enter one type for each container.", "أدخل مقاسًا لكل حاوية.");
      case "positive": return l + t(" must be a whole number of at least 1.", " لازم يكون عدد صحيح لا يقل عن 1.");
      case "guid": return t("Choose a valid client.", "اختار عميل صحيح.");
      case "needsAta": return t("Enter the ATA date before ", "أدخل تاريخ وصول المركب (ATA) قبل ") + l + t(".", ".");
      case "needsFreeTime": return t("Free time must be at least 1 day before entering ", "مدة السماح لازم تكون يوم واحد على الأقل قبل إدخال ") + l + ".";
      case "freeTimeEnd":
        return t(
          `Date of free time end must be ${e.expected} (ATA ${e.ata} + ${e.free} free days).`,
          `تاريخ انتهاء السماح لازم يكون ${e.expected} (ATA ${e.ata} + ${e.free} يوم سماح).`,
        );
      case "beforeAta": return t(`D/O date cannot be before the ATA date (${e.ata}).`, `تاريخ دفع التفريغ ماينفعش يكون قبل تاريخ وصول المركب (${e.ata}).`);
      default: return l + t(" has an invalid value or date.", " فيه قيمة أو تاريخ غير صحيح.");
    }
  }

  return { lang, ar, t, label, name, fmtN, statusName, clearanceName, clientName, optionLabel, trackLabel, display, typeLabel, stamp, opName, message };
}

/* ---------- dropdown options ---------- */
// Options come from GET /api/customs-clearance/lookups. Each option is { value, label }:
// clients save their GUID; ports, shipping lines and terminals save their name (the API stores text).
export function dropdownOptions(key, k, lookups, fmt, current = "", context = {}) {
  const names = (list) => (list || []).map((x) => ({ value: x.name, label: x.name }));
  let options;
  if (key === "clientId") options = (lookups.clients || []).map((c) => ({ value: String(c.id), label: c.name }));
  else if (key === "pod" || key === "pol") options = (lookups.ports || []).map((p) => ({ value: p.name, label: p.code ? p.name + " (" + p.code + ")" : p.name }));
  else if (key === "shippingLine") options = names(lookups.shippingLines);
  else if (key === "terminal") {
    const podVal = String(context?.pod || "").trim().toLowerCase();
    const allTerminals = lookups.terminals || [];
    const matched = podVal
      ? allTerminals.filter((t) => {
          const pn = String(t.portName || "").trim().toLowerCase();
          const pc = String(t.portCode || "").trim().toLowerCase();
          return pn === podVal || pc === podVal || (pc && podVal === `${pn} (${pc})`);
        })
      : allTerminals;
    options = matched.map((x) => ({
      value: x.name,
      label: x.code ? `${x.name} (${x.code})` : x.name,
    }));
  }
  else if (key === "containerType")
    options = (lookups.containerTypes?.length ? lookups.containerTypes : C.containerOptions).map((v) => ({ value: v, label: fmt.optionLabel(v) }));
  else if (key === "currentStage") options = C.stageOptions.map((v) => ({ value: v, label: v }));
  else if (key === "track") options = C.trackOptions.map((v) => ({ value: v, label: fmt.trackLabel(v) }));
  else if (key === "clearanceType")
    options = (k === "OceanExport" ? ["Certificate", "Bosla"] : ["Import", "Transit"]).map((v) => ({ value: v, label: fmt.clearanceName(v) }));
  else options = [];
  // Keep a saved value that is no longer in the list (e.g. a deactivated port) so it still shows.
  if (current && !options.some((o) => o.value.toLowerCase() === String(current).toLowerCase()))
    options = [...options, { value: String(current), label: key === "clientId" ? fmt.clientName(current) : String(current) }];
  return options;
}

/* ---------- table state (paging & search run on the server) ---------- */
export const PAGE_SIZES = [20, 50, 100];
export const makeFilter = () => ({ q: "", quickKey: "shipmentNumber", sort: "shipmentNumber", dir: "asc", page: 0, size: 20, columns: null });
export const emptyDashFilter = () => ({ clientId: "", status: "", clearanceType: "", port: "", shippingLine: "", basis: "", from: "", to: "" });
