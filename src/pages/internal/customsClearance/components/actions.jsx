import C from "../lib/core.js";
import { reportExportFields } from "../lib/format.js";
import { copyText } from "../lib/exporters.js";
import { CopyFallbackDialog } from "./dialogs/TableDialogs.jsx";

/** Tab-separated selection with report headers (pastes cleanly into Excel). */
export function clipboardText(app, scope) {
  const { tables, selections, scopeKind, fmt } = app;
  const k = scopeKind(scope);
  const fs = reportExportFields(k);
  const rows = tables[scope].items.filter((r) => selections[scope].has(r.id));
  const clean = (v) => String(v).replace(/[\t\r\n]+/g, " ");
  const cell = (r, f) => (f.key === "containerType" ? C.containerParts(r).join(" | ") : C.value(r, f.key));
  return [fs.map((f) => fmt.label(f)).join("\t"), ...rows.map((r) => fs.map((f) => clean(fmt.display(cell(r, f), f))).join("\t"))].join("\n");
}

export async function copySelected(app, scope) {
  if (!app.selections[scope].size) return;
  const text = clipboardText(app, scope);
  try {
    await copyText(text);
    app.toast(app.fmt.t("Copied with column headers.", "تم النسخ بعناوين الأعمدة."));
  } catch {
    app.openDialog(<CopyFallbackDialog text={text} />);
  }
}
