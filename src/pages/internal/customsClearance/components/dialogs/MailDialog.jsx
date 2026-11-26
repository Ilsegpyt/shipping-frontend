import { useEffect, useState } from "react";
import { AlertCircle, Check, Copy, Download, Mail, X } from "lucide-react";
import {
  buildCustomsEmailContent,
  encodeEmlSubject,
} from "../../lib/fclExportHelper.js";
import { blobB64, dashboardPDF, emailSnapshot, emlBlob, esc, saveBlob } from "../../lib/exporters.js";
import { useApp } from "../../AppState.jsx";
import { useCustomsPickerState } from "../../hooks/useCustomsPickerState.js";
import { Dialog } from "../Modal.jsx";
import { CustomsColumnsPicker, CustomsShipmentsPicker } from "./CustomsExportPickers.jsx";

function collectDashboard(app) {
  const snap = app.dashSnapshot.current;
  if (!snap) throw Error("Dashboard not rendered");
  return { ...snap, charts: snap.chartList.map((c) => ({ title: c.title, chart: app.charts.current.get(c.id) })).filter((c) => c.chart) };
}

function DashboardMailDialog() {
  const app = useApp();
  const { fmt, kind, closeDialog, toast } = app;
  const { t, name, lang } = fmt;
  const connected = typeof window.ILS_MAIL?.compose === "function";

  const [to, setTo] = useState("");
  const [subject, setSubject] = useState(t("ILS Customs Clearance · ", "التخليص الجمركي ILS · ") + name(kind));
  const [body, setBody] = useState(
    t(
      "Dear team,\n\nPlease find the customs clearance dashboard report attached.\n\nBest regards,\nILS Egypt",
      "مرحبًا،\n\nبرجاء الاطلاع على تقرير لوحة مؤشرات التخليص الجمركي المرفق.\n\nمع التحية،\nILS مصر",
    ),
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setError("");
    try {
      const recipients = to.split(/[;,]/).map((v) => v.trim()).filter(Boolean);
      if (!recipients.length || recipients.some((v) => !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(v)))
        throw Error(t("Enter complete, valid email addresses.", "أدخل عناوين بريد كاملة وصحيحة."));
      const subj = subject.trim();
      if (!subj || /[\r\n]/.test(subj)) throw Error(t("Enter a valid subject.", "أدخل موضوعًا صحيحًا."));
      setBusy(true);
      const snap = collectDashboard(app);
      const html = esc(body).replace(/\n/g, "<br>") + emailSnapshot(snap, fmt);
      const attachment = { name: "ILS_Customs_Dashboard.pdf", mime: "application/pdf", blob: await dashboardPDF(snap, fmt) };
      const message = {
        to: recipients,
        subject: subj,
        text: body,
        html: '<!doctype html><html dir="' + (lang === "ar" ? "rtl" : "ltr") + '"><body style="font:14px Segoe UI,Arial;color:#12263a">' + html + "</body></html>",
        attachments: [attachment],
      };
      if (connected) {
        const wire = { ...message, attachments: [{ name: attachment.name, mime: attachment.mime, contentBytes: await blobB64(attachment.blob) }] };
        const result = await window.ILS_MAIL.compose(wire);
        if (!result?.url) throw Error(t("Email integration did not return a draft URL.", "ربط البريد لم يرجع رابط المسودة."));
        const u = new URL(result.url);
        if (u.protocol !== "https:") throw Error(t("Invalid email draft link.", "رابط مسودة غير صحيح."));
        window.open(u.href, "_blank", "noopener");
      } else {
        saveBlob(await emlBlob(message), "ILS_Customs_Dashboard.eml");
      }
      closeDialog();
    } catch (e) {
      setError(e.message);
      if (toast) toast(e.message, true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      wide
      title={t("Email · Dashboard", "إيميل · لوحة المؤشرات")}
      buttons={[
        { text: t("Cancel", "إلغاء"), onClick: closeDialog },
        { text: connected ? t("Create email draft", "إنشاء مسودة إيميل") : t("Download email draft", "تحميل مسودة الإيميل"), primary: true, onClick: send, disabled: busy },
      ]}
    >
      <div className="dialog-body-grid">
        <div className="field">
          <label htmlFor="mailTo">{t("To", "إلى")}</label>
          <input id="mailTo" type="text" placeholder="name@company.com" autoComplete="email" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="mailSubject">{t("Subject", "الموضوع")}</label>
          <input id="mailSubject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="mailBody">{t("Message", "الرسالة")}</label>
          <textarea id="mailBody" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
      </div>
      <div className="errorlist" id="mailError" role="alert">{error}</div>
    </Dialog>
  );
}

function ShipmentsMailDialog({
  scope = "open",
  reportType: propReportType,
  status: propStatus,
  initialRows,
  preSelectedIds,
  search = "",
  alert = "",
  onClose: propOnClose,
}) {
  const app = useApp();
  const { fmt, scopeKind, tables, selections, closeDialog, toast, lang } = app;
  const { t, name } = fmt;

  const activeKind = propReportType || scopeKind(scope);
  const activeStatus = propStatus || (scope === "closed" ? "Closed" : "Open");
  const rows = initialRows ?? tables[scope]?.items ?? [];
  const selectedList = preSelectedIds ?? [...(selections[scope] || [])];
  const handleClose = propOnClose || closeDialog;

  const picker = useCustomsPickerState({
    reportType: activeKind,
    status: activeStatus,
    initialRows: rows,
    preSelectedIds: selectedList,
    search,
    alert,
    fmt,
  });

  const [to, setTo] = useState("");
  const [toError, setToError] = useState(false);
  const [toAlertOpen, setToAlertOpen] = useState(false);
  const [subject, setSubject] = useState(() => `ILS Customs Clearance report — ${name(activeKind)}`);
  const [message, setMessage] = useState("Dear team,\n\nPlease find the shipment details below.\n\nBest regards.");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (toAlertOpen) setToAlertOpen(false);
        else handleClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose, toAlertOpen]);

  const generateEmailContent = () => {
    if (picker.chosenCols.length === 0) {
      toast(t("Please select at least one column.", "يرجى اختيار عمود واحد على الأقل."), true);
      return null;
    }
    if (picker.chosenShipments.length === 0) {
      toast(t("Please select at least one shipment.", "يرجى اختيار شحنة واحدة على الأقل."), true);
      return null;
    }

    return buildCustomsEmailContent({
      shipments: picker.chosenShipments,
      chosenCols: picker.chosenCols,
      subject,
      message,
      fmt,
    });
  };

  const handleDownloadEml = () => {
    if (!to || !to.trim()) {
      setToError(true);
      setToAlertOpen(true);
      return;
    }

    const content = generateEmailContent();
    if (!content) return;

    const emlHeaders = [
      "X-Unsent: 1",
      `To: ${to.replace(/[\r\n]+/g, " ").trim()}`,
      `Subject: ${encodeEmlSubject(subject)}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=utf-8",
      "Content-Transfer-Encoding: 8bit",
    ];

    const emlData = `${emlHeaders.join("\r\n")}\r\n\r\n${content.htmlDocument}`;
    const blob = new Blob([emlData], { type: "message/rfc822;charset=utf-8" });
    const safeSub = (subject || "Customs_Clearance_Report").replace(/[^a-zA-Z0-9_\-\u0600-\u06FF]/g, "_");
    saveBlob(blob, `${safeSub}.eml`);
    handleClose();
  };

  const handleCopyForReply = async () => {
    const content = generateEmailContent();
    if (!content) return;

    const plainText = message ? `${message}\n\n[Table content copied]` : "[Table content copied]";

    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const htmlBlob = new Blob([content.replyHtml], { type: "text/html" });
        const textBlob = new Blob([plainText], { type: "text/plain" });
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": htmlBlob,
            "text/plain": textBlob,
          }),
        ]);
      } else {
        const listener = (e) => {
          e.clipboardData.setData("text/html", content.replyHtml);
          e.clipboardData.setData("text/plain", plainText);
          e.preventDefault();
        };
        document.addEventListener("copy", listener);
        document.execCommand("copy");
        document.removeEventListener("copy", listener);
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      toast(
        t(
          "Copied! Open Outlook, click Reply, and paste (Ctrl + V).",
          "تم نسخ الجدول بنجاح! افتح الآوتلوك واضغط Reply ثم الصق (Ctrl + V).",
        ),
      );
    } catch {
      toast(t("Failed to copy to clipboard.", "تعذر نسخ الجدول."), true);
    }
  };

  return (
    <div className="ccl-tw">
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={handleClose} />

        <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Mail size={18} className="text-sky-600" />
                <span>{t("Download email draft (.eml)", "تحميل مسودة إيميل (.eml)")}</span>
              </h3>
              <p className="text-xs text-teal-600 font-medium mt-0.5">
                {name(activeKind)} · {activeStatus === "Closed" ? t("Closed", "مغلقة") : t("Open", "مفتوحة")} ·{" "}
                {t("Table embedded in the email", "الجدول مدمج داخل الإيميل")}
              </p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              aria-label={t("Close", "إغلاق")}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto pe-1 mt-4 space-y-4">
            {/* To Field */}
            <div>
              <label htmlFor="ccl-email-draft-to" className="block text-xs font-semibold text-slate-700 mb-1">
                {t("To", "إلى")} <span className="text-rose-500">*</span>
              </label>
              <input
                id="ccl-email-draft-to"
                type="text"
                dir="ltr"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  if (toError && e.target.value.trim()) setToError(false);
                }}
                placeholder="name@company.com; other@company.com"
                className={`w-full text-xs rounded-lg border px-3 py-2 text-slate-800 outline-none transition ${
                  toError
                    ? "border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                    : "border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                }`}
              />
              {toError && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium">
                  {t("Please enter recipient email address (To)", "يرجى إدخال البريد الإلكتروني (To) هنا")}
                </p>
              )}
            </div>

            {/* Subject Field */}
            <div>
              <label htmlFor="ccl-email-draft-subject" className="block text-xs font-semibold text-slate-700 mb-1">
                {t("Subject", "الموضوع")}
              </label>
              <input
                id="ccl-email-draft-subject"
                type="text"
                dir="auto"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-medium"
              />
            </div>

            {/* Message Field */}
            <div>
              <label htmlFor="ccl-email-draft-message" className="block text-xs font-semibold text-slate-700 mb-1">
                {t("Message", "الرسالة")}
              </label>
              <textarea
                id="ccl-email-draft-message"
                rows={4}
                dir="auto"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 leading-relaxed resize-y"
              />
            </div>

            <CustomsColumnsPicker picker={picker} fmt={fmt} />
            <CustomsShipmentsPicker picker={picker} fmt={fmt} />
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 pt-3 mt-3">
            <p className="text-[11.5px] text-slate-500 mb-3">
              {lang === "ar"
                ? "يمكنك تحميل مسودة (.eml) لفتح إيميل جديد، أو نسخ المحتوى والجدول للرد مباشرة في سكونس مفتوح بالآوتلوك."
                : "Download an unsent .eml draft to open a new email, or copy formatted table to reply directly in an existing Outlook thread."}
            </p>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition cursor-pointer"
              >
                {t("Cancel", "إلغاء")}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyForReply}
                  disabled={picker.loadingShipments}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-sm border transition active:scale-95 cursor-pointer disabled:opacity-50 ${
                    copied
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                      : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400"
                  }`}
                  title={t("Copy formatted table to reply into an existing Outlook thread", "انسخ الجدول للرد في سكونس مفتوح بالآوتلوك")}
                >
                  {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} className="text-slate-500" />}
                  <span>
                    {copied
                      ? t("Copied!", "تم النسخ!")
                      : t("Copy for Reply", "نسخ للرد في سكونس (Copy)")}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadEml}
                  disabled={picker.loadingShipments}
                  className="flex items-center gap-2 rounded-xl bg-[#0f4c81] hover:bg-[#0c3d68] disabled:opacity-50 text-white px-5 py-2.5 text-xs font-semibold shadow-md transition active:scale-95 cursor-pointer"
                >
                  <Download size={14} />
                  <span>{t("Download email draft (.eml)", "تحميل مسودة الإيميل (.eml)")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* To Validation Alert Popup */}
        {toAlertOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
              onClick={() => setToAlertOpen(false)}
            />
            <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-3">
                <AlertCircle size={26} />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-1">
                {t("Recipient Email (To) Required", "البريد الإلكتروني (To) مطلوب")}
              </h4>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                {t(
                  'Please enter the recipient email address in the "To" field before downloading the draft.',
                  "يرجى كتابة البريد الإلكتروني للمستلم في خانة (To) أولاً لتتمكن من تنزيل مسودة الإيميل.",
                )}
              </p>
              <button
                type="button"
                onClick={() => {
                  setToAlertOpen(false);
                  setTimeout(() => {
                    document.getElementById("ccl-email-draft-to")?.focus();
                  }, 50);
                }}
                className="w-full rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 text-xs transition shadow-sm cursor-pointer"
              >
                {t("OK, Got it", "حسناً، فهمت")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * FCL-style Email Draft (.eml) + Copy for Reply modal for Customs Clearance (Open & Closed shipments).
 * Embeds the styled HTML table directly in the email body (matching FCL behavior, no Excel attachment).
 */
export default function MailDialog(props) {
  if (props.scope === "dashboard") {
    return <DashboardMailDialog />;
  }
  return <ShipmentsMailDialog {...props} />;
}
