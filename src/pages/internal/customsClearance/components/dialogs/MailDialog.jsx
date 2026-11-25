import { useState } from "react";
import { blobB64, dashboardPDF, emailSnapshot, emlBlob, esc, saveBlob, tableHTML, workbookBuffer, XLSX_MIME } from "../../lib/exporters.js";
import { useApp } from "../../AppState.jsx";
import { Dialog } from "../Modal.jsx";
import { collectDashboard, ExportChoice, exportGroups, initialChoice } from "./ExportDialog.jsx";

/**
 * Prepares an unsent draft. If the host page provides window.ILS_MAIL.compose (company
 * mail integration) a server draft is created; otherwise an .eml file is downloaded.
 */
export default function MailDialog({ scope }) {
  const app = useApp();
  const { fmt, kind, scopeKind, closeDialog, toast } = app;
  const { t, name, lang } = fmt;
  const connected = typeof window.ILS_MAIL?.compose === "function";
  const section = scope === "dashboard" ? name(kind) : name(scopeKind(scope));

  const [to, setTo] = useState("");
  const [subject, setSubject] = useState(t("ILS Customs Clearance · ", "التخليص الجمركي ILS · ") + section);
  const [body, setBody] = useState(
    t(
      "Dear team,\n\nPlease find the customs clearance report attached.\n\nBest regards,\nILS Egypt",
      "مرحبًا،\n\nبرجاء الاطلاع على تقرير التخليص الجمركي المرفق.\n\nمع التحية،\nILS مصر",
    ),
  );
  const [choice, setChoice] = useState(() => initialChoice(scope === "dashboard" ? kind : scopeKind(scope)));
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
      let html = esc(body).replace(/\n/g, "<br>");
      let attachment;
      if (scope === "dashboard") {
        const snap = collectDashboard(app);
        html += emailSnapshot(snap, fmt);
        attachment = { name: "ILS_Customs_Dashboard.pdf", mime: "application/pdf", blob: await dashboardPDF(snap, fmt) };
      } else {
        const groups = exportGroups(app, scope, choice);
        if (!groups.some((g) => g.rows.length) || groups.some((g) => !g.fields.length))
          throw Error(t("Choose fields and at least one shipment.", "اختار حقول وشحنة واحدة على الأقل."));
        groups.forEach((g) => (html += "<h3>" + esc(name(g.k)) + "</h3>" + tableHTML(g.rows, g.fields, fmt)));
        attachment = { name: "ILS_Customs_Report.xlsx", mime: XLSX_MIME, blob: new Blob([await workbookBuffer(groups, fmt)]) };
      }
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
        toast(t("Email draft created. Review and send in your mail app.", "تم إنشاء المسودة. راجعها وابعتها من برنامج البريد."));
      } else {
        saveBlob(await emlBlob(message), "ILS_Customs_Email.eml");
        toast(t("Unsent email draft downloaded with the attachment.", "تم تحميل مسودة غير مرسلة وبداخلها المرفق."));
      }
      closeDialog();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      wide
      title={t("Email · ", "إيميل · ") + (scope === "dashboard" ? t("Dashboard", "لوحة المؤشرات") : name(scopeKind(scope)))}
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
      {scope === "dashboard" ? (
        <p className="modal-note">
          {t(
            "Includes the filtered KPI summary in the message and the full dashboard PDF as an attachment.",
            "يشمل ملخص المؤشرات حسب الفلاتر داخل الرسالة وملف PDF للداشبورد مرفق.",
          )}
        </p>
      ) : (
        <ExportChoice scope={scope} choice={choice} setChoice={setChoice} />
      )}
      <p className="modal-note">
        {connected
          ? t("Creates an unsent draft with the configured company email integration.", "ينشئ مسودة غير مرسلة من خلال ربط البريد الخاص بالشركة.")
          : t(
              "Downloads an unsent EML draft with the report attached. Open it in Outlook or a compatible mail app, review, then send. Direct Outlook composition requires the company email integration.",
              "هيحمّل مسودة EML غير مرسلة وبداخلها التقرير كمرفق. افتحها في Outlook أو برنامج بريد متوافق، راجعها ثم ابعتها. الفتح المباشر داخل Outlook يحتاج ربط بريد الشركة.",
            )}
      </p>
      <div className="errorlist" id="mailError" role="alert">{error}</div>
    </Dialog>
  );
}
