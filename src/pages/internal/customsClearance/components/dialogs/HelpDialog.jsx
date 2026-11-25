import { useState } from "react";
import C from "../../lib/core.js";
import { useApp } from "../../AppState.jsx";
import { Dialog } from "../Modal.jsx";

/** Each section: { title, blocks: [ string | { list: [[bold, text]] } ] } */
function helpSections(fmt) {
  const { t, name, label } = fmt;
  const keyList = (map) =>
    Object.keys(C.schemas).map((k) => [name(k), map[k].map((key) => label(C.schemas[k].fields.find((f) => f.key === key))).join(t(", ", "، "))]);
  return [
    {
      title: t("Report columns", "أعمدة التقارير"),
      blocks: [
        t(
          "The tables follow the report workbooks in the same field order: Ocean import has 22 report fields, domestic import 8 and ocean export 17. Number of containers is followed immediately by Container type in both ocean reports. Status, Actions and row selection have their own columns at the end.",
          "الجداول تتبع شيتات التقارير بنفس ترتيب الحقول: الوارد البحري 22، والمحلي 8، والصادر البحري 17. عدد الحاويات يليه مقاس الحاوية مباشرة في التقريرين البحريين. الحالة والإجراءات والتحديد في أعمدة مستقلة في آخر الصف.",
        ),
      ],
    },
    {
      title: t("Required entry and locked fields", "الإدخال الإلزامي وقفل الحقول"),
      blocks: [
        t("Red English headers determine the required form inputs:", "الأحمر في العناوين الإنجليزية يحدد مدخلات النموذج الإلزامية:"),
        { list: keyList(C.entryKeys) },
        t(
          "These inputs are locked after creation, except the ETA date in ocean import. Rows are read-only: press Edit in the Actions column to open one row, then Save or Cancel. Enter saves and Esc cancels. Locked fields stay locked while editing. Shipment # is entered in the table; it may stay blank, and a filled value must be unique in the report. HB/L is optional.",
          "هذه المدخلات تُقفل بعد الإنشاء، ماعدا تاريخ الوصول المتوقع في الوارد البحري. الصفوف للقراءة فقط: اضغط تعديل في عمود الإجراءات لفتح صف واحد، ثم حفظ أو إلغاء. Enter للحفظ وEsc للإلغاء. الحقول المقفولة تفضل مقفولة أثناء التعديل. رقم العملية يُدخل من الجدول؛ يمكن تركه فارغًا، ولو اتكتب لازم ما يتكررش في التقرير. البوليصة الفرعية اختيارية.",
        ),
      ],
    },
    {
      title: t("Unique identifiers", "منع تكرار المعرّفات"),
      blocks: [
        t(
          "Each red Arabic-header field is individually unique within its report, including closed shipments. The server checks this when you save:",
          "كل حقل أحمر في العناوين العربية فريد بمفرده داخل تقريره، بما فيه الشحنات المغلقة. السيرفر بيتأكد من ده وقت الحفظ:",
        ),
        { list: keyList(C.uniqueKeys) },
        t(
          "Blank values may repeat. Identifiers are text to preserve leading zeros and the full 19-digit ACID. A format check does not verify an ACID with Nafeza.",
          "الخانات الفارغة مسموح تكرارها. المعرّفات نصوص للحفاظ على الأصفار ورقم ACID الكامل من 19 رقمًا. فحص الصيغة لا يتحقق من صحة ACID لدى نافذة.",
        ),
      ],
    },
    {
      title: t("Clearance and container types", "أنواع البيان ومقاسات الحاويات"),
      blocks: [
        t(
          "Ocean export: Certificate keeps Customs area blank and disabled. Bosla enables Customs area. Ocean import uses Import / Transit.",
          "الصادر البحري: شهادة تخلي مكان التخليص فاضي ومقفول. بوصلة تفتح مكان التخليص. الوارد البحري يستخدم وارد أو ترانزيت.",
        ),
        t(
          "Container types follow the 14 FCL standard types: Dry (20' / 40' Standard, 40' / 45' High), Reefer (20' Standard, 40' High), Open Top (20', 40', 40' High), Flat (20', 40' Standard, 40' High) and Tank (20', 40'). Older shipments may still show 20, 40, 40 HC or 45 HC. In Edit mode, Unmerge shows one numbered dropdown per container; Merge uses one shared type, with a confirmation when types differ. Merge before changing the number of containers of a split shipment. Large split lists are paginated in groups of 20.",
          "أنواع الحاويات هي الـ 14 نوع المعتمدين في FCL: Dry (20' / 40' Standard و 40' / 45' High)، و Reefer (20' Standard و 40' High)، و Open Top (20' و 40' و 40' High)، و Flat (20' و 40' Standard و 40' High)، و Tank (20' و 40'). الشحنات القديمة ممكن تفضل ظاهر عليها 20 أو 40 أو 40 HC أو 45 HC. في وضع التعديل، فك الدمج يعرض قائمة مرقمة لكل حاوية، والدمج يوحّد المقاس مع تأكيد لو المقاسات مختلفة. ادمج المقاسات قبل تغيير عدد حاويات شحنة مفكوكة. القوائم الكبيرة بتتقسم لصفحات من 20 حاوية.",
        ),
      ],
    },
    {
      title: t("Search, pages, selection and closing", "البحث والصفحات والتحديد والإغلاق"),
      blocks: [
        t(
          "Search looks up Shipment #, Certificate #, ACID, MB/L, HB/L, booking number, commercial invoice # and the latest update on the server. The table loads one page at a time; choose 20, 50 or 100 rows per page. Select rows with the checkbox at the end of each row; the header checkbox selects the page. Copy includes report headers. Ctrl+C copies selected rows and Esc clears selection.",
          "البحث بيدور في رقم العملية والشهادة وACID والبوليصة الكلية والفرعية ورقم الحجز ورقم الفاتورة وآخر تحديث على السيرفر. الجدول بيحمّل صفحة واحدة في المرة؛ اختار 20 أو 50 أو 100 صف. حدد الصف بمربع التحديد في آخره، أو الصفحة كلها من مربع العنوان. النسخ يشمل عناوين التقرير. Ctrl+C لنسخ المحدد وEsc لمسح التحديد.",
        ),
        t(
          "Choose Closed in the Status column to close a shipment. After you confirm, it moves to the read-only archive with its own search, copy, export and email. There is no delete or reopen action.",
          "اختار مغلقة من عمود الحالة لإغلاق الشحنة. بعد التأكيد بتتنقل لأرشيف للقراءة فقط، ببحث ونسخ وتصدير وبريد مستقل. لا يوجد حذف أو إعادة فتح.",
        ),
      ],
    },
    {
      title: t("Latest update", "آخر تحديث"),
      blocks: [
        t(
          "The Latest update cell shows the newest note. Click it to see the full history with user and Cairo time, and to add a new update. Closed shipments show their history read-only.",
          "خلية آخر تحديث بتعرض أحدث ملاحظة. اضغط عليها لعرض السجل كامل باسم المستخدم وتوقيت القاهرة، ولإضافة تحديث جديد. الشحنات المغلقة بتعرض السجل للقراءة فقط.",
        ),
      ],
    },
    {
      title: t("Export and email", "التصدير والبريد"),
      blocks: [
        t(
          "Excel export uses the shipments on the current page, or only the selected rows, with the fields you choose. Email prepares an unsent EML draft with the Excel file attached. Direct Outlook composition needs a company email connection.",
          "تصدير إكسيل بيستخدم شحنات الصفحة الحالية أو الصفوف المحددة فقط، بالحقول اللي تختارها. البريد يجهز مسودة EML غير مرسلة ومرفق بيها ملف الإكسيل. الفتح المباشر في Outlook يحتاج ربط بريد الشركة.",
        ),
      ],
    },
    {
      title: t("Saved data", "حفظ البيانات"),
      blocks: [
        t(
          "Shipments, edits, closings and updates are saved on the server as soon as you confirm them, and are shared with your team. Refresh reloads the latest data.",
          "الشحنات والتعديلات والإغلاق والتحديثات بتتحفظ على السيرفر أول ما تأكدها، وبتبقى ظاهرة لفريقك. زرار تحديث بيجيب آخر بيانات.",
        ),
      ],
    },
  ];
}

const sectionText = (s) => s.title + " " + s.blocks.map((b) => (typeof b === "string" ? b : b.list.flat().join(" "))).join(" ");

export default function HelpDialog() {
  const { fmt } = useApp();
  const { t } = fmt;
  const [q, setQ] = useState("");
  const needle = C.norm(q);
  const sections = helpSections(fmt).filter((s) => !needle || C.norm(sectionText(s)).includes(needle));

  return (
    <Dialog wide title={t("Help Center", "مركز المساعدة")}>
      <input
        className="help-search"
        id="helpSearch"
        type="search"
        placeholder={t("Search help…", "ابحث في المساعدة…")}
        aria-label={t("Search help", "البحث في المساعدة")}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div id="helpContent">
        {sections.length ? (
          sections.map((s) => (
            <section key={s.title} className="help-section helptext">
              <h3>{s.title}</h3>
              {s.blocks.map((b, i) =>
                typeof b === "string" ? (
                  <p key={i}>{b}</p>
                ) : (
                  <ul key={i}>
                    {b.list.map(([bold, text]) => (
                      <li key={bold}>
                        <b>{bold}:</b> {text}
                      </li>
                    ))}
                  </ul>
                ),
              )}
            </section>
          ))
        ) : (
          <p className="muted">{t("No matching help topics.", "لا توجد موضوعات مطابقة.")}</p>
        )}
      </div>
    </Dialog>
  );
}
