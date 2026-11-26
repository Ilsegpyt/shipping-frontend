// Pure clearance domain logic: schemas, validation, filtering.
// Field keys and report kinds match the Customs Clearance API 1:1 (camelCase / ReportType).
  const f = (key, en, ar, type = "text", group = 0) => ({ key, en, ar, type, group });
  const common = {
    shipmentNumber: f("shipmentNumber", "Shipment #", "رقم العملية", "text", 0),
    clientId: f("clientId", "Client", "اسم العميل", "text", 0),
    certificateNumber: f("certificateNumber", "Certificate #", "رقم الشهادة", "text", 0),
    clearanceType: f("clearanceType", "Clearance type", "نوع البيان", "text", 0),
    numberOfContainers: f("numberOfContainers", "Number of containers", "عدد الحاويات", "number", 1),
    latestUpdate: f("latestUpdate", "Latest update", "الحالة الجمركية / آخر تحديث", "note", 3),
    missingDocs: f("missingDocs", "Missing docs", "المستندات الناقصة", "note", 3),
    commercialInvoiceNumber: f("commercialInvoiceNumber", "Commercial invoice #", "رقم الفاتورة", "text", 0),
  };
  const schemas = {
    OceanImport: {
      name: "Ocean import",
      ar: "وارد بحري",
      sheet: "CCL OCEAN Import Shipments",
      deadline: "dateOfFreeTimeEnd",
      fields: [
        common.shipmentNumber,
        common.clientId,
        common.certificateNumber,
        f("track", "Track", "المسار", "text", 0),
        f("customsDeclarations", "Customs declarations", "عروض الشهادة", "text", 0),
        f("acidNumber", "ACID #", "ACID#", "text", 0),
        common.clearanceType,
        common.numberOfContainers,
        f("containerType", "Container type", "مقاس الحاوية", "text", 1),
        f("mbl", "MB/L", "البوليصة الكلية", "text", 1),
        f("hbl", "HB/L", "البوليصة الفرعية", "text", 1),
        f("shippingLine", "Shipping line", "التوكيل الملاحي", "text", 1),
        f("commodity", "Commodity", "صنف البضاعة", "text", 1),
        f("pod", "POD", "الميناء", "text", 1),
        f("terminal", "Terminal", "الساحة", "text", 1),
        f("etaDate", "ETA Date", "تاريخ الوصول المتوقع", "date", 2),
        f("ataDate", "ATA Date", "تاريخ وصول المركب", "date", 2),
        f("freeTime", "Free time", "مدة السماح", "number", 2),
        f("dateOfFreeTimeEnd", "Date of free time end", "تاريخ انتهاء السماح", "date", 2),
        f("doDate", "D/O Date", "تاريخ دفع التفريغ", "date", 2),
        common.missingDocs,
        f("inspectionDate", "Inspection date", "التاريخ الفعلي للكشف", "date", 2),
        f("currentStage", "Current stage", "المرحلة الحالية", "text", 3),
        common.latestUpdate,
      ],
    },
    Domestic: {
      name: "Domestic import",
      ar: "وارد محلي",
      sheet: "Import CCL Domestics",
      deadline: null,
      fields: [
        common.clientId,
        common.shipmentNumber,
        common.commercialInvoiceNumber,
        common.certificateNumber,
        f("numberOfPieces", "Number of pieces", "عدد القطع", "number", 1),
        common.missingDocs,
        f("dateOfReceivingMissingDocs", "Date of receiving missing docs", "تاريخ استلام المستندات الناقصة", "date", 2),
        common.latestUpdate,
      ],
    },
    OceanExport: {
      name: "Ocean export",
      ar: "صادر بحري",
      sheet: "CCL OCEAN Export Shipments",
      deadline: "cutoff",
      fields: [
        common.shipmentNumber,
        common.clientId,
        common.clearanceType,
        f("customsArea", "Customs area", "مكان التخليص", "text", 0),
        common.certificateNumber,
        f("pol", "POL", "ميناء التحميل", "text", 1),
        f("pod", "POD", "ميناء الوصول", "text", 1),
        f("bookingNumber", "Booking number", "رقم الحجز", "text", 1),
        common.commercialInvoiceNumber,
        f("cutoff", "Cut-off", "آخر ميعاد لتقفيل الشهادة", "datetime", 2),
        f("loadingDate", "Loading date", "تاريخ التحميل", "date", 2),
        f("certificateDate", "Certificate date", "تاريخ فتح الشهادة", "date", 2),
        f("containerType", "Container type", "مقاس الحاوية", "text", 1),
        common.numberOfContainers,
        common.latestUpdate,
        f("dateOfCoo", "Date of COO", "تاريخ عمل المنشأ", "date", 2),
        f("dateOfReceivingForm13", "Date of receiving FORM13", "تاريخ استلام الصور الضوئية", "date", 2),
      ],
    },
  };

  const sourceColumns = {
    OceanImport: [
      { key: "shipmentNumber", en: "Shipment#", ar: "رقم العمليه" },
      { key: "clientId", en: "Cleint", ar: "إسم العميل" },
      { key: "certificateNumber", en: "CERT#", ar: "الشهادة " },
      { key: "track", en: "Track", ar: "المسار" },
      { key: "customsDeclarations", en: "Customs Declarations", ar: "عروض الشهادة" },
      { key: "acidNumber", en: "ACID#", ar: "ACID#" },
      { key: "clearanceType", en: "clearance Type", ar: "نوع البيان" },
      { key: "numberOfContainers", en: "Number of containers", ar: "عدد الحاويات" },
      { key: "mbl", en: "MB/L", ar: "البوليصة الكليه" },
      { key: "hbl", en: "HB/L", ar: "البوليصة الفرعيه" },
      { key: "shippingLine", en: "Shipping Line", ar: "التوكيل الملاحي" },
      { key: "commodity", en: "commodity ", ar: "صنف البضاعه" },
      { key: "pod", en: "POD", ar: "الميناء" },
      { key: "terminal", en: "Terminal", ar: "الساحه" },
      { key: "etaDate", en: "ETA Date", ar: "تاريخ الوصول المتوقع" },
      { key: "ataDate", en: "ATA Date", ar: "تاريخ وصول المركب" },
      { key: "freeTime", en: "free time", ar: "مدة السماح" },
      { key: "dateOfFreeTimeEnd", en: "Date of Free Time End", ar: "تاريخ انتهاء السماح" },
      { key: "doDate", en: "D/O Date", ar: "تاريخ دفع التفريغ" },
      { key: "missingDocs", en: "Missing Docs", ar: "مستندات غير مستلمه" },
      { key: "inspectionDate", en: "Inspection Date", ar: "التاريخ الفعلي للكشف" },
      { key: "currentStage", en: "current stage", ar: null },
      { key: "latestUpdate", en: "Latest Update", ar: "الحالة الجمركية للشهادة" },
    ],
    Domestic: [
      { key: "clientId", en: "Cleint", ar: "اسم  العميل" },
      { key: "shipmentNumber", en: "Shipment#", ar: "رقم العمليه" },
      { key: "commercialInvoiceNumber", en: "commercial invoice #", ar: "رقم الفاتورة" },
      { key: "certificateNumber", en: "CERTIFICATE#", ar: "رقــــم الشهادة" },
      { key: "numberOfPieces", en: "no# of Pieces", ar: "عـدد القطع" },
      { key: "missingDocs", en: "Missing Docs", ar: "المستندات الناقصه " },
      { key: "dateOfReceivingMissingDocs", en: "Date of receive Missing Docs", ar: "تاريخ استلام المستندات الناقصه" },
      { key: "latestUpdate", en: "Latest update", ar: "الحالة" },
    ],
    OceanExport: [
      { key: "shipmentNumber", en: "Shipment#", ar: "رقم العمليه" },
      { key: "clientId", en: "Cleint", ar: "اسم  العميل" },
      { key: "clearanceType", en: "clearance Type", ar: "نوع البيان" },
      { key: "customsArea", en: "Customs Area", ar: "مكان التخليص" },
      { key: "certificateNumber", en: "Certificate#", ar: "رقــــم الشهادة" },
      { key: "pol", en: "POL", ar: "ميناء التحميل" },
      { key: "pod", en: "POD", ar: "ميناء الوصول" },
      { key: "bookingNumber", en: "booking number", ar: "رقم الحجز" },
      { key: "commercialInvoiceNumber", en: "commercial INV#", ar: "رقم الفاتورة" },
      { key: "cutoff", en: "cutoff", ar: "اخر ميعاد لتقفيل الشهاده" },
      { key: "loadingDate", en: "Loading Date ", ar: "تاريخ التحميل" },
      { key: "certificateDate", en: "Certificate Date", ar: "تاريخ فتح الشهاده" },
      { key: "containerType", en: "tybe for containers", ar: "مقاس الحاويه" },
      { key: "numberOfContainers", en: "number of containers", ar: "عـدد الحاويات" },
      { key: "latestUpdate", en: "Latest Update", ar: "الحالة" },
      { key: "dateOfCoo", en: "Date of COO", ar: "تاريخ عمل المنشأ" },
      { key: "dateOfReceivingForm13", en: "Date of receiving FORM13", ar: "تاريخ استلام الصور الضوئيه" },
    ],
  };
  function reportFields(k) {
    const columns = sourceColumns[k].map((c) => ({ ...schemas[k].fields.find((f) => f.key === c.key), sourceEn: c.en, sourceAr: c.ar }));
    if (k === "OceanImport")
      columns.splice(columns.findIndex((f) => f.key === "numberOfContainers") + 1, 0, {
        ...schemas[k].fields.find((f) => f.key === "containerType"),
        sourceEn: "Container type",
        sourceAr: "مقاس الحاوية",
      });
    if (k === "OceanExport") {
      const type = columns.splice(
        columns.findIndex((f) => f.key === "containerType"),
        1,
      )[0];
      columns.splice(columns.findIndex((f) => f.key === "numberOfContainers") + 1, 0, type);
    }
    return columns;
  }
  // English red headers define entry requirements; Arabic red headers define individual unique values.
  const entryKeys = {
    OceanImport: ["clientId", "acidNumber", "clearanceType", "mbl", "etaDate"],
    Domestic: ["clientId", "commercialInvoiceNumber", "numberOfPieces"],
    OceanExport: ["clientId", "clearanceType", "pol", "pod", "bookingNumber", "commercialInvoiceNumber", "numberOfContainers"],
  };
  const uniqueKeys = {
    OceanImport: ["shipmentNumber", "certificateNumber", "acidNumber", "mbl", "hbl"],
    Domestic: ["shipmentNumber", "commercialInvoiceNumber", "certificateNumber"],
    OceanExport: ["shipmentNumber", "certificateNumber", "bookingNumber", "commercialInvoiceNumber"],
  };
  const dropdownKeys = ["clientId", "clearanceType", "containerType", "pod", "pol", "shippingLine", "terminal", "currentStage", "track"];
  // Ocean Import customs track (API values). Inspection date exists only for Red and GreenImports.
  const trackOptions = ["Blue", "Yellow", "Green", "Red", "GreenImports"];
  const inspectionTracks = ["Red", "GreenImports"];
  const allowsInspection = (track) => inspectionTracks.includes(clean(track));
  const containerOptions = [
    "DryStandard20",
    "DryStandard40",
    "DryHigh40",
    "DryHigh45",
    "ReeferStandard20",
    "ReeferHigh40",
    "OpenTop20",
    "OpenTop40",
    "OpenTopHigh40",
    "FlatStandard40",
    "FlatHigh40",
    "Flat20",
    "Tank20",
    "Tank40",
  ];
  const stageOptions = [
    "Waiting for Vessel Arrival",
    "Awaiting for Release Letter",
    "Waiting For Orginal BL",
    "Awaiting Original SC Zone",
    "Vessel Arrived & Waiting for Pay THC",
    "THC has been Paid and Waiting for Withdrow D/O",
    "Withdraw D/O and waiting for Link D/O to be able Open Customs Certificate",
    "Awaiting for Form 4",
    "Awaiting for Insurance Policy",
    "Awaiting for Freight Invoice",
    "Certificate has been Opened & The inspection date has been scheduled.",
    "Inspection has been completed, and we are waiting for the inspection report to be Approved",
    "Under Customs Pricing Procedures",
    "Customs Pricing has been completed, and customs duties are pending approval.",
    "Awaiting Client's Confirmation of Customs Duties",
    "The Duties have been Paid & Waiting for Release the Cargo",
    "Storage charges have been paid, and the shipment is currently pending port release",
  ];
  function clearanceType(v) {
    const n = norm(v);
    if (["certificate", "شهادة", "شهاده"].map(norm).includes(n)) return "Certificate";
    if (["bosla", "bosala", "بوصلة", "بوصله", "بصلة"].map(norm).includes(n)) return "Bosla";
    if (["import", "وارد"].map(norm).includes(n)) return "Import";
    if (["transit", "ترانزيت"].map(norm).includes(n)) return "Transit";
    return clean(v);
  }
  function inactive(kind, key, row) {
    if (kind === "OceanImport" && key === "inspectionDate") return !allowsInspection(value(row, "track"));
    return kind === "OceanExport" && key === "customsArea" && clearanceType(row.clearanceType) !== "Bosla";
  }
  function activeKeys(kind, row) {
    return entryKeys[kind].filter((k) => !inactive(kind, k, row));
  }
  function locked(kind, key) {
    return entryKeys[kind].includes(key) && !(kind === "OceanImport" && key === "etaDate");
  }
  // Split shipments carry one type per container in `containers`
  // (API rows: [{ ordinal, containerType }], edit drafts: ["20", "40"]). Merged ones use `containerType`.
  function containerParts(row) {
    const list = Array.isArray(row.containers) ? row.containers : [];
    if (list.length)
      return [...list]
        .sort((a, b) => (a?.ordinal ?? 0) - (b?.ordinal ?? 0))
        .map((c) => clean(typeof c === "string" ? c : c.containerType));
    const v = clean(value(row, "containerType"));
    return v ? [v] : [];
  }
  const isSplit = (row) => Array.isArray(row.containers) && row.containers.length > 0;

  // API rows keep report-specific fields in their details object, under the same names.
  const DETAILS = { OceanImport: "oceanImportDetails", OceanExport: "oceanExportDetails", Domestic: "domesticImportDetails" };
  function value(row, key) {
    if (row == null) return undefined;
    if (key in row) return row[key];
    return row[DETAILS[row.reportType]]?.[key];
  }

  // Table-editable fields per report: exactly the Update*Details records of the API.
  const updateKeys = {
    OceanImport: [
      "hbl", "customsDeclarations", "numberOfContainers", "containerType", "containers", "shippingLine", "commodity", "pod", "terminal",
      "etaDate", "ataDate", "freeTime", "dateOfFreeTimeEnd", "doDate", "missingDocs", "track", "inspectionDate", "currentStage",
    ],
    OceanExport: ["customsArea", "containerType", "containers", "cutoff", "loadingDate", "certificateDate", "dateOfCoo", "dateOfReceivingForm13"],
    Domestic: ["missingDocs", "dateOfReceivingMissingDocs"],
  };
  const isGuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean(v));
  function issues(kind, row, existing = [], ignoreId) {
    const errors = basicValidateRow(kind, row, existing, ignoreId);
    for (const key of activeKeys(kind, row)) {
      if (!clean(row[key]) && !errors.some((e) => e.key === key)) errors.push({ key, code: "required", message: key + " is required" });
    }
    if (kind === "OceanExport") {
      const v = clearanceType(row.clearanceType);
      if (!["Certificate", "Bosla"].includes(v)) errors.push({ key: "clearanceType", code: "choice", message: "Select Certificate or Bosla" });
      if (inactive(kind, "customsArea", row) && clean(row.customsArea))
        errors.push({ key: "customsArea", code: "inactive", message: "Customs area must be blank for Certificate" });
    }
    if (clean(row.acidNumber) && !/^\d{19}$/.test(row.acidNumber)) errors.push({ key: "acidNumber", code: "acidNumber", message: "ACID must contain exactly 19 digits" });
    for (const key of uniqueKeys[kind])
      if (
        clean(row[key]) &&
        existing.some((x) => x.id !== ignoreId && id(x[key]) === id(row[key])) &&
        !errors.some((e) => e.key === key && /exists/.test(e.message))
      )
        errors.push({ key, code: "duplicate", message: key + " already exists in this report" });
    if (clean(row.numberOfContainers) && Number(row.numberOfContainers) > 10000) errors.push({ key: "numberOfContainers", code: "containers", message: "Maximum 10000 containers" });
    for (const key of ["numberOfContainers", "numberOfPieces"])
      if (clean(row[key]) && Number(row[key]) < 1) errors.push({ key, code: "positive", message: "Quantity must be at least 1" });
    if (kind !== "Domestic" && isSplit(row) && containerParts(row).length !== Number(row.numberOfContainers))
      errors.push({ key: "containerType", code: "containers", message: "One type is needed for every container" });
    if (kind === "OceanImport") errors.push(...arrivalIssues(row, errors));
    return errors.map((e) => ({ ...e, code: e.code || (/exists/.test(e.message) ? "duplicate" : /required/.test(e.message) ? "required" : "invalid") }));
  }
  // Same rules as UpdateCustomsShipmentCommandValidator (Alerts 2 and 3). Dates are "YYYY-MM-DD".
  const addDays = (date, n) => new Date(Date.parse(date + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
  function arrivalIssues(row, prior = []) {
    const bad = (key) => prior.some((e) => e.key === key);
    if (["ataDate", "freeTime", "dateOfFreeTimeEnd", "doDate"].some(bad)) return [];
    const out = [];
    const ata = clean(row.ataDate);
    const end = clean(row.dateOfFreeTimeEnd);
    const doDate = clean(row.doDate);
    const free = clean(row.freeTime) === "" ? null : Number(row.freeTime);
    if (end) {
      if (!ata) out.push({ key: "dateOfFreeTimeEnd", code: "needsAta" });
      else if (free == null || free < 1) out.push({ key: "dateOfFreeTimeEnd", code: "needsFreeTime" });
      else {
        const expected = addDays(ata, free - 1);
        if (end !== expected) out.push({ key: "dateOfFreeTimeEnd", code: "freeTimeEnd", expected, ata, free });
      }
    }
    if (doDate) {
      if (!ata) out.push({ key: "doDate", code: "needsAta" });
      else if (doDate < ata) out.push({ key: "doDate", code: "beforeAta", ata });
    }
    return out.map((e) => ({ message: e.code, ...e }));
  }

  // Alerts 1 and 4: a row's alert levels as sent by the API (null when the row has none).
  function alertsOf(row) {
    const a = row?.alerts;
    return { eta: a?.eta || null, freeTime: a?.freeTime || null };
  }
  const alertFilters = ["EtaSoon", "EtaOverdue", "FreeTimeSoon", "FreeTimeExpired"];

  const blank = () => ({ OceanImport: [], Domestic: [], OceanExport: [] });
  const clean = (v) => (v == null ? "" : String(v).trim());
  const norm = (v) =>
    clean(v)
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[\u0640\u064b-\u065f]/g, "")
      .replace(/[أإآ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/[^\p{L}\p{N}]/gu, "");
  const id = (v) => clean(v).normalize("NFKC").toLocaleLowerCase();
  function validISO(v) {
    if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/.test(v)) return false;
    let d = new Date(v.slice(0, 10) + "T00:00:00Z");
    return (
      !isNaN(d) &&
      d.toISOString().slice(0, 10) === v.slice(0, 10) &&
      (!v.includes("T") || (+v.slice(11, 13) < 24 && +v.slice(14, 16) < 60 && (!v.slice(17) || +v.slice(17, 19) < 60)))
    );
  }
  function basicValidateRow(kind, row, existing = [], ignoreId) {
    const errors = [];
    for (const f of schemas[kind].fields) {
      const v = row[f.key];
      if (f.key === "clientId" && !clean(v)) errors.push({ key: f.key, message: f.en + " is required" });
      else if (f.key === "clientId" && !isGuid(v)) errors.push({ key: f.key, code: "guid", message: "Client must be a valid id" });
      if (clean(v) && f.type === "number" && (!Number.isSafeInteger(Number(v)) || Number(v) < 0))
        errors.push({ key: f.key, message: f.en + " must be a non-negative whole number" });
      if (clean(v) && ["date", "datetime"].includes(f.type) && (!validISO(String(v)) || (f.type === "date" && String(v).includes("T"))))
        errors.push({ key: f.key, message: f.en + " has an invalid date" });
    }
    if (clean(row.shipmentNumber) && existing.some((x) => x.id !== ignoreId && id(x.shipmentNumber) === id(row.shipmentNumber)))
      errors.push({ key: "shipmentNumber", message: "Shipment # already exists in " + schemas[kind].name });
    return errors;
  }
  function today() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  }
  function days(date, asOf = today()) {
    return date ? Math.round((Date.parse(date.slice(0, 10) + "T00:00:00Z") - Date.parse(asOf + "T00:00:00Z")) / 864e5) : null;
  }
  function stats(kind, rows, asOf = today()) {
    const s = schemas[kind],
      dk = s.deadline,
      dated = dk ? rows.filter((r) => r[dk]) : [];
    return {
      total: rows.length,
      clients: new Set(rows.map((r) => id(r.clientId)).filter(Boolean)).size,
      quantity: rows.reduce((v, r) => v + (Number(r[kind === "Domestic" ? "numberOfPieces" : "numberOfContainers"]) || 0), 0),
      knownQuantity: rows.filter((r) => clean(r[kind === "Domestic" ? "numberOfPieces" : "numberOfContainers"]) !== "").length,
      dated: dated.length,
      past: dated.filter((r) => days(r[dk], asOf) < 0).length,
      soon: dated.filter((r) => days(r[dk], asOf) >= 0 && days(r[dk], asOf) <= 3).length,
      docs: rows.filter((r) => clean(r.missingDocs)).length,
    };
  }
  const api = {
    schemas,
    sourceColumns,
    reportFields,
    entryKeys,
    uniqueKeys,
    dropdownKeys,
    containerOptions,
    stageOptions,
    trackOptions,
    allowsInspection,
    inactive,
    locked,
    containerParts,
    isSplit,
    value,
    DETAILS,
    updateKeys,
    isGuid,
    activeKeys,
    clearanceType,
    issues,
    arrivalIssues,
    alertsOf,
    alertFilters,
    blank,
    clean,
    norm,
    id,
    validISO,
    today,
    days,
    stats,
  };
  export default api;
