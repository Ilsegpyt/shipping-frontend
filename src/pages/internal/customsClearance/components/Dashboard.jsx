import { useEffect, useMemo, useRef } from "react";
import Chart from "chart.js/auto";
import C from "../lib/core.js";
import { emptyDashFilter } from "../lib/format.js";
import { dashboardModel, dashboardRows } from "../lib/dashboardModel.js";
import { useApp } from "../AppState.jsx";
import KindTabs from "./KindTabs.jsx";

const PALETTE = ["#0b4f7a", "#22b8cf", "#d8a84a", "#0e7c86", "#7a5ea8", "#66788c", "#8ec9a5", "#e7a384", "#5477b4", "#c1a1ca", "#9caaa5"];

function DashFilters() {
  const { fmt, data, kind, dashFilter, setDashFilter, toast } = useApp();
  const { t, label, statusName, clearanceName } = fmt;
  const dates = C.schemas[kind].fields.filter((f) => ["date", "datetime"].includes(f.type));
  const basis = dates.some((f) => f.key === dashFilter.basis) ? dashFilter.basis : dates[0]?.key || "";
  const vals = (key) => [...new Set(data[kind].map((r) => r[key]).filter(Boolean))].sort();

  const change = (key) => (e) => {
    const next = { ...dashFilter, basis, [key]: e.target.value };
    if (next.from && next.to && next.from > next.to) {
      toast(t("End date cannot precede start date.", "تاريخ النهاية مينفعش يسبق البداية."), true);
      return;
    }
    setDashFilter(next);
  };

  const select = (id, values, lab, pretty = (v) => v) => (
    <div className="fld" key={id}>
      <label htmlFor={"df-" + id}>{lab}</label>
      <select id={"df-" + id} value={dashFilter[id]} onChange={change(id)}>
        <option value="">{t("All", "الكل")}</option>
        {values.map((v) => <option key={v} value={v}>{pretty(v)}</option>)}
      </select>
    </div>
  );

  return (
    <div className="rail" id="dashFilters">
      <div className="rrow">
        <div className="fld">
          <label htmlFor="df-basis">{t("Date basis", "أساس التاريخ")}</label>
          <select id="df-basis" value={basis} onChange={change("basis")}>
            {dates.map((f) => <option key={f.key} value={f.key}>{label(f)}</option>)}
          </select>
        </div>
        <div className="fld">
          <label htmlFor="df-from">{t("From", "من")}</label>
          <input id="df-from" type="date" value={dashFilter.from} onChange={change("from")} />
        </div>
        <div className="fld">
          <label htmlFor="df-to">{t("To", "إلى")}</label>
          <input id="df-to" type="date" value={dashFilter.to} onChange={change("to")} />
        </div>
        {select("status", ["Open", "Closed"], t("Status", "حالة الشحنة"), statusName)}
        {select("clientId", vals("clientId"), t("Client", "العميل"))}
        {kind !== "Domestic" && select("clearanceType", vals("clearanceType"), t("Clearance type", "نوع البيان"), clearanceName)}
        {kind !== "Domestic" && select("port", vals("pod"), "POD")}
        {kind === "OceanImport" && select("shippingLine", vals("shippingLine"), t("Shipping line", "التوكيل الملاحي"))}
        <button className="reset" id="df-reset" onClick={() => setDashFilter(emptyDashFilter())}>{t("Clear filters", "مسح الفلاتر")}</button>
      </div>
    </div>
  );
}

function ChartCard({ spec }) {
  const { fmt, theme, charts } = useApp();
  const { t, lang } = fmt;
  const canvas = useRef(null);
  let entries = spec.data;
  if (entries.length > 10 && spec.id !== "months")
    entries = [...entries.slice(0, 10), [t("Other", "أخرى"), entries.slice(10).reduce((s, x) => s + x[1], 0)]];
  const empty = !entries.length || !entries.some((x) => x[1]);
  const signature = JSON.stringify([spec.type, entries, lang, theme]);

  useEffect(() => {
    if (empty || !canvas.current) return;
    const dark = theme === "dark";
    const chart = new Chart(canvas.current, {
      type: spec.type,
      data: {
        labels: entries.map((x) => x[0]),
        datasets: [
          {
            label: t("Count", "العدد"),
            data: entries.map((x) => x[1]),
            backgroundColor: PALETTE,
            borderColor: dark ? "#12202e" : "#fff",
            borderWidth: spec.type === "doughnut" ? 3 : 1,
            borderRadius: spec.type === "bar" ? 5 : 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        locale: lang === "ar" ? "ar-EG" : "en-US",
        plugins: {
          legend: {
            display: spec.type === "doughnut",
            position: "bottom",
            labels: { color: dark ? "#e6eef4" : "#66788c", font: { family: "Segoe UI", size: 11 } },
          },
          tooltip: { rtl: lang === "ar" },
        },
        ...(spec.type !== "doughnut"
          ? {
              scales: {
                x: { ticks: { color: dark ? "#8fa3b4" : "#66788c", font: { size: 10 } }, grid: { display: false } },
                y: { beginAtZero: true, ticks: { precision: 0, color: dark ? "#8fa3b4" : "#66788c" }, grid: { color: dark ? "#243646" : "#edf3f6" } },
              },
            }
          : { cutout: "64%" }),
      },
    });
    charts.current.set(spec.id, chart);
    return () => {
      chart.destroy();
      if (charts.current.get(spec.id) === chart) charts.current.delete(spec.id);
    };
    // signature captures every input that changes the drawing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, empty]);

  return (
    <div className={"card s" + spec.span}>
      <h3>{spec.title}</h3>
      <div className="sub">{spec.sub}</div>
      <div className="ch" id={"wrap-" + spec.id}>
        {empty ? (
          <div className="chart-empty">{t("No recorded data in the current filters.", "لا توجد بيانات مسجلة ضمن الفلاتر الحالية.")}</div>
        ) : (
          <canvas ref={canvas} id={"chart-" + spec.id} aria-label={spec.title} role="img" />
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { fmt, data, kind, dashFilter, dashSnapshot } = useApp();
  const { t, name, label, fmtN, statusName, clearanceName } = fmt;
  const rows = useMemo(() => dashboardRows(data[kind], dashFilter), [data, kind, dashFilter]);
  const { metrics, specs, insights } = useMemo(() => dashboardModel(kind, rows, fmt), [kind, rows, fmt]);

  const dates = C.schemas[kind].fields.filter((f) => ["date", "datetime"].includes(f.type));
  const basis = dates.find((f) => f.key === dashFilter.basis) || dates[0];
  const meta =
    name(kind) + " · " + fmtN(rows.length) + " " + t("shipments", "شحنة") + " · " +
    t("All cards and charts use these filters.", "كل المؤشرات والرسوم تستخدم نفس الفلاتر.") +
    (dashFilter.from || dashFilter.to ? " · " + label(basis) + " " + (dashFilter.from || "…") + " — " + (dashFilter.to || "…") : "");

  const filterNames = { from: t("From", "من"), to: t("To", "إلى"), clientId: t("Client", "العميل"), status: t("Status", "الحالة"), clearanceType: t("Clearance type", "نوع البيان"), port: "POD", shippingLine: t("Shipping line", "التوكيل الملاحي") };
  const active = Object.entries(dashFilter)
    .filter(([k, v]) => v && k !== "basis")
    .map(([k, v]) => filterNames[k] + ": " + (k === "status" ? statusName(v) : k === "clearanceType" ? clearanceName(v) : v))
    .join(" · ");
  const kpiValue = (v) => (v === "—" ? "—" : fmtN(v));

  // Snapshot for the PDF / email exporters (they run outside this component).
  dashSnapshot.current = {
    title: name(kind),
    meta,
    active,
    kpis: metrics.map((m) => ({ label: m.label, value: kpiValue(m.value) })),
    insights,
    chartList: specs.map((s) => ({ id: s.id, title: s.title })),
  };

  return (
    <section id="dash">
      <KindTabs id="dashTabs" scope="open" dashboard />
      <DashFilters />
      <div className="active-note" id="dashMeta">{meta}</div>
      <div className="kpis" id="kpis">
        {metrics.map((m) => (
          <div className={"kpi " + m.color} key={m.label}>
            <div className="k-top">
              <span className="k-ico">{m.ico}</span>
              <span className="k-label">{m.label}</span>
            </div>
            <div className="k-val">{kpiValue(m.value)}</div>
            <div className="k-sub">{m.sub}</div>
          </div>
        ))}
      </div>
      <div className="card insights">
        <h3>{t("Clearance insights", "قراءات التخليص")}</h3>
        <div className="sub">{t("Based on recorded values in the current filters", "حسب القيم المسجلة ضمن الفلاتر الحالية")}</div>
        <ul id="insightList">
          {insights.map((x) => <li key={x}>{x}</li>)}
        </ul>
      </div>
      <div className="grid" id="chartGrid">
        {specs.map((spec) => <ChartCard key={kind + spec.id} spec={spec} />)}
      </div>
    </section>
  );
}
