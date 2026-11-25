import { useState } from "react";
import C from "../lib/core.js";
import { useApp } from "../AppState.jsx";
import { ConfirmDialog } from "./dialogs/TableDialogs.jsx";

const PAGE = 20;

/**
 * Merged: one shared type for every container.
 * Split: one numbered dropdown per container (paged by 20), kept in `containers` (one type per container, like the API).
 * Read-only unless the row is in Edit mode; changes go to the row draft (saved with the row).
 */
export default function ContainerCell({ row, editing, onChange }) {
  const { fmt, openDialog, closeDialog, lookups } = useApp();
  const { t, fmtN, optionLabel } = fmt;
  const [page, setPage] = useState(0);
  const parts = C.containerParts(row);
  const split = C.isSplit(row);
  const count = Number(C.value(row, "numberOfContainers")) || 0;

  if (!editing)
    return (
      <div className="container-types">
        {split ? (
          parts.map((v, i) => (
            <span className="container-part" key={i}>
              <small>{fmtN(i + 1)}</small>
              {v ? optionLabel(v) : "—"}
            </span>
          ))
        ) : (
          <span>{parts[0] ? optionLabel(parts[0]) : "—"}</span>
        )}
      </div>
    );

  const setType = (index, value) => {
    if (index < 0) onChange({ containerType: value, containers: [] });
    else {
      const values = Array.from({ length: count }, (_, i) => parts[i] || "");
      values[index] = value;
      onChange({ containerType: "", containers: values });
    }
  };

  const choices = (value, i) => {
    const opts = lookups?.containerTypes?.length ? lookups.containerTypes : C.containerOptions;
    return (
      <select
        value={value}
        aria-label={t("Container type ", "مقاس الحاوية ") + (i < 0 ? t("shared", "الموحد") : fmtN(i + 1))}
        onChange={(e) => setType(i, e.target.value)}
      >
        <option value="">—</option>
        {[...new Set([...opts, ...(value ? [value] : [])])].map((v) => (
          <option key={v} value={v}>{optionLabel(v)}</option>
        ))}
      </select>
    );
  };

  const toggle = () => {
    if (!split) {
      if (!Number.isSafeInteger(count) || count < 1 || count > 10000) return;
      onChange({ containerType: "", containers: Array.from({ length: count }, () => parts[0] || "") });
      return;
    }
    const merge = () => onChange({ containerType: parts[0] || "", containers: [] });
    if (new Set(parts).size > 1)
      openDialog(
        <ConfirmDialog
          title={t("Merge container types", "دمج مقاسات الحاويات")}
          text={t("Use the first container type for all containers?", "استخدام مقاس الحاوية الأولى لكل الحاويات؟")}
          confirmText={t("Merge", "دمج")}
          onConfirm={() => {
            merge();
            closeDialog();
          }}
        />,
      );
    else merge();
  };

  const current = Math.max(0, Math.min(page, Math.ceil(count / PAGE) - 1));
  const start = current * PAGE;

  return (
    <div className="container-types">
      {split
        ? Array.from({ length: Math.max(0, Math.min(PAGE, count - start)) }, (_, offset) => {
            const i = start + offset;
            return (
              <div className="container-part" key={i}>
                <small>{fmtN(i + 1)}</small>
                {choices(parts[i] || "", i)}
              </div>
            );
          })
        : choices(parts[0] || "", -1)}
      {split && count > PAGE && (
        <div className="container-pager">
          <button type="button" disabled={!current} onClick={() => setPage(current - 1)}>‹</button>
          <small>{fmtN(start + 1)}–{fmtN(Math.min(count, start + PAGE))} / {fmtN(count)}</small>
          <button type="button" disabled={start + PAGE >= count} onClick={() => setPage(current + 1)}>›</button>
        </div>
      )}
      <button type="button" className="merge-toggle" disabled={!count} onClick={toggle}>
        {split ? t("Merge", "دمج") : t("Unmerge", "فك الدمج")}
      </button>
      {!count && <small className="muted">{t("Enter the container count first", "أدخل عدد الحاويات أولًا")}</small>}
    </div>
  );
}
