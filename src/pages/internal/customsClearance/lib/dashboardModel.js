import C from "./core.js";
import A from "./analytics.js";

export function dashboardRows(rows, d) {
  return rows.filter(
    (r) =>
      (!d.clientId || r.clientId === d.clientId) &&
      (!d.status || r._status === d.status) &&
      (!d.clearanceType || r.clearanceType === d.clearanceType) &&
      (!d.port || r.pod === d.port) &&
      (!d.shippingLine || r.shippingLine === d.shippingLine) &&
      (!(d.from || d.to) ||
        (r[d.basis] && (!d.from || r[d.basis].slice(0, 10) >= d.from) && (!d.to || r[d.basis].slice(0, 10) <= d.to))),
  );
}

/** Returns { metrics: [{label, value, sub, ico, color}], specs: [...], insights: [string] } */
export function dashboardModel(k, rows, fmt) {
  const { t, label, fmtN: num, optionLabel, clearanceName, statusName } = fmt;
  const m = A.metrics(k, rows);
  const s = C.schemas[k];
  const notRecorded = t("Not recorded", "غير مسجل");
  const labelKey = (key) => label(s.fields.find((f) => f.key === key));
  const distribution = (key, pretty = optionLabel) =>
    A.breakdown(rows, key).map(([v, n]) => [v === null ? notRecorded : pretty(v), n]);
  const card = (en, ar, value, subEn, subAr, ico = "▤", color = "") => ({ label: t(en, ar), value, sub: t(subEn, subAr), ico, color });

  const quantitySub = m.quantity.missing
    ? t("Known quantity in ", "عدد مسجل في ") + num(m.quantity.known) + t(" of ", " من ") + num(rows.length) +
      t(" shipments; other quantities are unknown.", " شحنة؛ باقي الكميات غير مسجلة.")
    : t("Sum of recorded quantities", "مجموع الأعداد المسجلة");

  const metrics = [
    card("Shipments", "الشحنات", m.total, "Current filtered records", "السجلات ضمن الفلاتر الحالية"),
    card("Open", "مفتوحة", m.open, "Explicit administrative status", "حسب الحالة الإدارية المسجلة", "◷", "aqua"),
    card("Closed", "مغلقة", m.closed, "Explicit administrative status", "حسب الحالة الإدارية المسجلة", "✓", "good"),
    card("Clients", "العملاء", m.clients, "Distinct recorded client names", "عدد أسماء العملاء المختلفة"),
    {
      label: k === "Domestic" ? t("Recorded pieces", "القطع المسجلة") : t("Recorded containers", "الحاويات المسجلة"),
      value: m.quantity.known ? m.quantity.total : "—",
      sub: quantitySub,
      ico: "▦",
      color: "sand",
    },
  ];
  if (m.docs)
    metrics.push(card("Document follow-up", "متابعة المستندات", m.docs.followup,
      "Open records with a missing-docs note and no elapsed receipt date", "مفتوحة بها نص نواقص وبدون تاريخ استلام مضى", "▧", "warn"));
  else
    metrics.push(card("Certificate # recorded", "رقم شهادة مسجل", m.certificates,
      "Nonblank certificate number; not a release count", "رقم شهادة غير فارغ؛ لا يدل على الإفراج", "▤", ""));
  if (m.deadline) {
    metrics.push(card("Dates within 3 days", "مواعيد خلال 3 أيام", m.due.soon,
      "Open records; recorded date/time has not passed", "مفتوحة؛ التاريخ أو الوقت المسجل لم يمضِ", "◷", "warn"));
    metrics.push(card("Recorded deadline passed", "الموعد المسجل مضى", m.due.past,
      "Review recorded dates; no inferred penalty or delay", "مراجعة المواعيد المسجلة؛ لا تعني غرامة أو تأخيرًا", "!", "bad"));
  } else {
    metrics.push(card("Receipt date recorded", "تاريخ استلام مسجل", m.receiptDates,
      "Recorded receipt dates through today", "تواريخ الاستلام المسجلة حتى اليوم", "✓", "good"));
    metrics.push(card("Updates recorded", "تحديثات مسجلة", m.updates, "Rows with latest-update text", "شحنات بها نص آخر تحديث", "≡", ""));
  }

  const specs = [
    {
      id: "status",
      title: t("Shipment status", "حالة الشحنات"),
      sub: t("Administrative Open / Closed; independent of customs text", "مفتوحة ومغلقة إداريًا؛ مستقلة عن نص التحديث الجمركي"),
      type: "doughnut",
      data: [[statusName("Open"), m.open], [statusName("Closed"), m.closed]],
      span: 4,
    },
    {
      id: "clients",
      title: t("Shipments by client", "الشحنات حسب العميل"),
      sub: t("Shipment count; top 10 plus others", "عدد الشحنات؛ أكبر 10 والباقي"),
      type: "bar",
      data: distribution("clientId", (v) => v),
      span: 8,
    },
  ];
  if (k !== "Domestic") {
    specs.push({
      id: "clearanceType",
      title: t("Recorded clearance type", "نوع البيان المسجل"),
      sub: t("Shipment count for the recorded type", "عدد الشحنات حسب نوع البيان المسجل"),
      type: "doughnut",
      data: distribution("clearanceType", clearanceName),
      span: 4,
    });
    specs.push({
      id: "ports",
      title: t("Shipments by POD", "الشحنات حسب POD"),
      sub: t("Recorded port; unknown values shown separately", "الميناء المسجل؛ القيم غير المسجلة منفصلة"),
      type: "bar",
      data: distribution("pod"),
      span: 8,
    });
  }
  if (k === "OceanImport") {
    const placeholder = ["droplist", "select", "اختر"].map(C.norm);
    specs.push({
      id: "currentStage",
      title: t("Recorded current stage", "المرحلة الحالية المسجلة"),
      sub: t("Entered stage only; no inferred customs progression", "المرحلة المُدخلة فقط؛ بدون استنتاج مراحل التخليص"),
      type: "bar",
      data: A.breakdown(rows.map((r) => ({ ...r, currentStage: placeholder.includes(C.norm(r.currentStage)) ? "" : r.currentStage })), "currentStage")
        .map(([v, n]) => [v === null ? notRecorded : v, n]),
      span: 6,
    });
    specs.push({
      id: "lines",
      title: t("Shipments by shipping line", "الشحنات حسب التوكيل الملاحي"),
      sub: t("Shipment count, not container count", "عدد الشحنات، وليس عدد الحاويات"),
      type: "bar",
      data: distribution("shippingLine", (v) => v),
      span: 6,
    });
  }
  if (k !== "Domestic")
    specs.push({
      id: "sizes",
      title: t("Recorded containers by type", "الحاويات المسجلة حسب المقاس"),
      sub: t("Recorded quantities only; mixed types counted individually", "الكميات المسجلة فقط؛ كل مقاس مختلط يُحسب مستقلًا"),
      type: "bar",
      data: A.containerTotals(k, rows).map(([v, n]) => [v === null ? notRecorded : optionLabel(v), n]),
      span: 6,
    });
  if (m.deadline)
    specs.push({
      id: "dates",
      title: t("Open-shipment deadline dates", "مواعيد الشحنات المفتوحة"),
      sub: labelKey(m.deadline) + t(" · Cairo time · today to +3 calendar days", " · توقيت القاهرة · اليوم حتى 3 أيام تقويمية"),
      type: "bar",
      data: [
        [t("Recorded deadline passed", "الموعد المسجل مضى"), m.due.past],
        [t("Today to +3 days", "اليوم حتى 3 أيام"), m.due.soon],
        [t("Later", "لاحقًا"), m.due.later],
        [notRecorded, m.due.unknown],
      ],
      span: 6,
    });

  const dateKey = k === "Domestic" ? "dateOfReceivingMissingDocs" : k === "OceanImport" ? "ataDate" : "loadingDate";
  const dated = rows.filter((r) => C.validISO(String(r[dateKey])) && (k !== "Domestic" || r[dateKey].slice(0, 10) <= C.today()));
  specs.push({
    id: "months",
    title:
      k === "Domestic"
        ? t("Shipments by recorded receipt month", "الشحنات حسب شهر الاستلام المسجل")
        : k === "OceanImport"
          ? t("Shipments by recorded arrival month", "الشحنات حسب شهر الوصول المسجل")
          : t("Shipments by recorded loading month", "الشحنات حسب شهر التحميل المسجل"),
    sub:
      labelKey(dateKey) +
      t(" · rows without this date are excluded", " · تُستبعد الصفوف بدون هذا التاريخ") +
      (k === "Domestic"
        ? t(" · future receipt dates excluded", " · تُستبعد تواريخ الاستلام المستقبلية")
        : t(" · includes entered future dates", " · يشمل التواريخ المستقبلية المُدخلة")),
    type: "bar",
    data: A.breakdown(dated.map((r) => ({ ...r, month: r[dateKey].slice(0, 7) })), "month").sort((a, b) => a[0].localeCompare(b[0])),
    span: 6,
  });

  if (m.docs) {
    const d = m.docs;
    specs.push({
      id: "docs",
      title: t("Open-shipment document notes", "ملاحظات مستندات الشحنات المفتوحة"),
      sub: t("Blank notes mean unknown completeness", "الملاحظات الفارغة لا تثبت اكتمال المستندات"),
      type: "doughnut",
      data: [
        [t("Missing-docs note; no elapsed receipt date", "نص نواقص؛ بدون تاريخ استلام مضى"), d.followup],
        [t("Missing-docs note and receipt date recorded", "نص نواقص وتاريخ استلام مسجل"), d.receiptRecorded],
        [t("Explicitly marked no missing docs", "مذكور صراحة عدم وجود نواقص"), d.noneNoted],
        [t("No document note", "بدون ملاحظات مستندات"), d.unknown],
      ],
      span: 6,
    });
  } else
    specs.push({
      id: "milestones",
      title: t("Export dates recorded through today", "تواريخ الصادر المسجلة حتى اليوم"),
      sub: t("Overlapping counts; recording a date does not prove clearance completion", "الأعداد قد تتداخل؛ تسجيل التاريخ لا يثبت اكتمال التخليص"),
      type: "bar",
      data: ["certificateDate", "dateOfCoo", "dateOfReceivingForm13"].map((key) => [labelKey(key), m.milestones[key]]),
      span: 6,
    });

  const insights = [];
  if (rows.length) {
    const top = A.breakdown(rows, "clientId").filter(([v]) => v !== null)[0];
    if (top)
      insights.push(
        t("Largest client by shipment count: ", "أكبر عميل حسب عدد الشحنات: ") + top[0] + " — " + num(top[1]) + " / " + num(rows.length) +
          " (" + num(Math.round((top[1] / rows.length) * 100)) + t("% of filtered shipments).", "٪ من الشحنات المطابقة للفلاتر)."),
      );
    insights.push(t("Open / closed: ", "مفتوحة / مغلقة: ") + num(m.open) + " / " + num(m.closed) + t(". Status is chosen explicitly.", ". الحالة تُحدد باختيار صريح."));
    if (m.quantity.missing)
      insights.push(num(m.quantity.missing) + t(" shipment(s) have no recorded quantity; they are not counted as zero.", " شحنة بدون عدد مسجل؛ لا تُحسب كصفر."));
  } else insights.push(t("No shipments match the current filters.", "لا توجد شحنات مطابقة للفلاتر الحالية."));
  if (m.docs) {
    insights.push(num(m.docs.followup) + t(" open shipment(s) have a missing-docs note without an elapsed receipt date.", " شحنة مفتوحة بها نص نواقص وبدون تاريخ استلام مضى."));
    if (m.docs.unknown)
      insights.push(num(m.docs.unknown) + t(" open shipment(s) have no document note; completeness is unknown.", " شحنة مفتوحة بدون ملاحظات مستندات؛ اكتمالها غير معلوم."));
  }
  if (k === "Domestic" && m.futureReceiptDates)
    insights.push(num(m.futureReceiptDates) + t(" future receipt date(s) are excluded from received counts.", " تاريخ استلام مستقبلي مستبعد من أعداد الاستلام حتى اليوم."));
  if (m.deadline)
    insights.push(
      t("Reminders use only the entered ", "التذكيرات تعتمد فقط على ") + labelKey(m.deadline) +
        t(". Missing dates are shown separately; no fines or clearance completion are inferred.",
          ". المواعيد غير المسجلة تظهر منفصلة؛ لا تُستنتج غرامات أو اكتمال التخليص."),
    );
  if (k === "OceanExport")
    insights.push(
      t("Certificate, COO and FORM13 counts show recorded fields only. The report has no missing-docs field or confirmed release date.",
        "أعداد الشهادة والمنشأ وFORM13 تُظهر البيانات المسجلة فقط. التقرير لا يحتوي حقل نواقص أو تاريخ إفراج مؤكد."),
    );

  return { m, metrics, specs, insights };
}
