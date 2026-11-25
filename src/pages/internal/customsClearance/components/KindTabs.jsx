import C from "../lib/core.js";
import { useApp } from "../AppState.jsx";

const ICON = { OceanImport: "↓", Domestic: "⇄", OceanExport: "↑" };

/** Report tabs. The active tab shows the server's total for the current table. */
export default function KindTabs({ id, scope = "open", dashboard = false }) {
  const { tables, kind, closedKind, switchKind, fmt } = useApp();
  const current = scope === "closed" ? closedKind : kind;
  const table = tables[scope === "closed" ? "closed" : "open"];
  return (
    <div className={dashboard ? "dtabs" : "etabs"} id={id}>
      {Object.keys(C.schemas).map((k) => (
        <button key={k} className={(dashboard ? "dtab" : "etab") + (k === current ? " on" : "")} onClick={() => switchKind(k, scope)}>
          <span className="ico">{ICON[k]}</span>
          <span className="lbl">{fmt.name(k)}</span>
          {k === current && !table.loading && <span className="cnt">{fmt.fmtN(table.totalCount)}</span>}
        </button>
      ))}
    </div>
  );
}
