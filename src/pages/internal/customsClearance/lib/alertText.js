import C from "./core.js";

function dayDistance(date, today) {
  if (!date) return null;
  const d = C.days(String(date).slice(0, 10), today || C.today());
  return Number.isFinite(d) ? d : null;
}

function inDaysEn(d) {
  return d === 1 ? "tomorrow" : `in ${d} days`;
}

function inDaysAr(d) {
  if (d === 1) return "بكرة";
  if (d === 2) return "بعد يومين";
  return d <= 10 ? `بعد ${d} أيام` : `بعد ${d} يوم`;
}

// Short badge text for Alerts 1 & 4, by field, level (from the API), and actual remaining days.
export function alertBadge(t, field, level, date, today) {
  if (!level) return "";
  const d = dayDistance(date, today);

  if (field === "etaDate") {
    if (level === "soon") {
      if (d === 1) return t("Tomorrow", "بكرة");
      if (d >= 2) return t(`In ${d} days`, inDaysAr(d));
      return t("Arriving soon", "وصول قريب");
    }
    if (level === "today") return t("Arrives today", "النهارده");
    if (level === "overdue") {
      const late = d !== null && d < 0 ? Math.abs(d) : null;
      return late ? t(`Late ${late}d, no ATA`, `متأخر ${late}ي بدون ATA`) : t("Late, no ATA", "متأخر بدون ATA");
    }
  }

  if (field === "dateOfFreeTimeEnd") {
    if (level === "soon") {
      if (d === 1) return t("Ends tomorrow", "السماح ينتهي بكرة");
      if (d >= 2) return t(`Ends in ${d} days`, `السماح ينتهي ${inDaysAr(d)}`);
      return t("Ending soon", "السماح قرب ينتهي");
    }
    if (level === "today") return t("Ends today", "السماح بينتهي النهارده");
    if (level === "expired") {
      const late = d !== null && d < 0 ? Math.abs(d) : null;
      return late ? t(`Ended ${late}d ago`, `انتهى من ${late}ي`) : t("Free time ended", "السماح انتهى");
    }
  }

  return "";
}

export function alertTooltip(t, field, level, date, today) {
  if (!level) return "";
  const d = dayDistance(date, today);

  if (field === "etaDate") {
    if (level === "soon") {
      return d !== null && d >= 1
        ? t(`Vessel arrives ${inDaysEn(d)}.`, `المركب واصلة ${inDaysAr(d)}.`)
        : t("Vessel arrives soon.", "المركب واصلة قريب.");
    }
    if (level === "today") return t("Vessel arrives today. Enter the ATA date once it arrives.", "المركب واصلة النهارده. سجّل ATA أول ما توصل.");
    if (level === "overdue") return t("ETA has passed and no ATA date is entered.", "تاريخ الوصول المتوقع عدّى ومفيش ATA متسجل.");
  }

  if (field === "dateOfFreeTimeEnd") {
    if (level === "soon") {
      return d !== null && d >= 1
        ? t(`Free time ends ${inDaysEn(d)}.`, `مدة السماح بتنتهي ${inDaysAr(d)}.`)
        : t("Free time ends soon.", "مدة السماح بتنتهي قريب.");
    }
    if (level === "today") return t("Free time ends today.", "مدة السماح بتنتهي النهارده.");
    if (level === "expired") return t("Free time has ended.", "مدة السماح انتهت.");
  }

  return "";
}

export const alertTone = (level) => (level === "overdue" || level === "expired" ? "bad" : "warn");

// Asks the open table to bring one shipment into view (sent by the alerts briefing).
export const FOCUS_ROW_EVENT = "ccl:focus-row";
