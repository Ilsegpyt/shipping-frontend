import { allFields, PAGE_SIZES } from "../lib/format.js";
import { useApp } from "../AppState.jsx";
import { copySelected } from "./actions.jsx";
import { ColumnsDialog } from "./dialogs/TableDialogs.jsx";

/**
 * Original toolbar layout: column + value, + Rule, Clear, Sort by, direction, Fields, Copy selected.
 * The value goes to the server search (q, debounced in AppState); sorting orders the rows of the current page.
 */
export function TableTools({ scope }) {
  const app = useApp();
  const { fmt, scopeKind, filters, setFilter, resetFilter, clearSelection, selections, openDialog, toast } = app;
  const { t, label, typeLabel, fmtN } = fmt;
  const k = scopeKind(scope);
  const state = filters[scope];
  const fs = allFields(k);
  const p = scope === "closed" ? "c" : "o";
  const f = fs.find((x) => x.key === state.quickKey) || fs[0];
  const selected = selections[scope].size;

  return (
    <div id={scope + "Tools"}>
      <div className="triptools">
        <div className="tripsearch">
          <div className="triprule">
            <select id={p + "field"} aria-label={t("Column", "العمود")} value={f.key} onChange={(e) => setFilter(scope, { quickKey: e.target.value })}>
              {fs.map((x) => <option key={x.key} value={x.key}>{label(x)}</option>)}
            </select>
            <span className="triptype">{typeLabel(f)}</span>
            <input
              className="tripvalue"
              id={p + "q"}
              type="text"
              value={state.q}
              maxLength={100}
              placeholder={t("Value", "القيمة")}
              aria-label={t("Search value", "قيمة البحث")}
              onChange={(e) => {
                setFilter(scope, { q: e.target.value, page: 0 });
                clearSelection(scope);
              }}
            />
          </div>
          <button
            className="tripadd"
            onClick={() =>
              toast(t(
                "Search runs on the server across shipment #, certificate, ACID, MB/L, HB/L, booking, invoice and latest update.",
                "البحث بيتم على السيرفر في رقم العملية والشهادة و ACID والبوليصة والحجز والفاتورة وآخر تحديث.",
              ))
            }
          >
            ＋ {t("Rule", "شرط")}
          </button>
          <button className="tripclear" onClick={() => resetFilter(scope)}>{t("Clear", "مسح")}</button>
        </div>
        <label htmlFor={p + "sort"}>{t("Sort by", "الترتيب حسب")}</label>
        <select id={p + "sort"} value={state.sort} onChange={(e) => setFilter(scope, { sort: e.target.value })}>
          {fs.map((x) => <option key={x.key} value={x.key}>{label(x)}</option>)}
        </select>
        <select id={p + "dir"} aria-label={t("Sort direction", "اتجاه الترتيب")} value={state.dir} onChange={(e) => setFilter(scope, { dir: e.target.value })}>
          <option value="asc">{t("Ascending ↑", "تصاعدي ↑")}</option>
          <option value="desc">{t("Descending ↓", "تنازلي ↓")}</option>
        </select>
        <span className="espacer" />
        <button className="ebtn" onClick={() => openDialog(<ColumnsDialog scope={scope} />)}>{t("Fields", "الحقول")}</button>
        <button className="ebtn" id={p + "copy"} disabled={!selected} onClick={() => copySelected(app, scope)}>
          {t("Copy selected", "نسخ المحدد")}
          {selected ? " (" + fmtN(selected) + ")" : ""}
        </button>
      </div>
    </div>
  );
}

/** Server-side paging: the API returns one page and the total count. */
export function TablePager({ scope }) {
  const { fmt, tables, filters, setFilter, clearSelection } = useApp();
  const { t, fmtN } = fmt;
  const s = filters[scope];
  const total = tables[scope].totalCount;
  const pages = Math.max(1, Math.ceil(total / s.size));
  const page = Math.min(s.page, pages - 1);
  const p = scope === "closed" ? "c" : "o";
  const go = (n) => {
    setFilter(scope, { page: n });
    clearSelection(scope);
  };
  return (
    <div className="trip-page" id={scope + "Pager"}>
      <span>
        {fmtN(total)} {t("shipments", "شحنة")}
        {tables[scope].loading ? " · " + t("loading…", "جاري التحميل…") : ""}
      </span>
      <span className="toolspacer" />
      <label htmlFor={p + "size"}>{t("Rows", "الصفوف")}</label>
      <select id={p + "size"} value={s.size} onChange={(e) => setFilter(scope, { size: +e.target.value, page: 0 })}>
        {PAGE_SIZES.map((n) => <option key={n}>{n}</option>)}
      </select>
      <button id={p + "prev"} disabled={!page} onClick={() => go(page - 1)}>‹</button>
      <span>{fmtN(page + 1)} / {fmtN(pages)}</span>
      <button id={p + "next"} disabled={page + 1 >= pages} onClick={() => go(page + 1)}>›</button>
    </div>
  );
}
