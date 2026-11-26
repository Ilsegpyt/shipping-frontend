import { useEffect } from "react";
import { AppProvider, useApp } from "./AppState.jsx";
import EntryView from "./components/EntryView.jsx";
import Dashboard from "./components/Dashboard.jsx";
import FinanceView from "./components/FinanceView.jsx";
import { ClosedModal, UpdatesModal } from "./components/Archive.jsx";
import { copySelected } from "./components/actions.jsx";
import "./customs-clearance.css";

function Shell() {
  const app = useApp();
  const { lang, theme, setRootEl, view, closedOpen, setClosedOpen, updatesCtx, setUpdatesCtx, dialog, closeDialog, selections, clearSelection, toastState } = app;

  // Keyboard: Esc closes the top popup (or clears selection); Ctrl/⌘+C copies selected rows.
  useEffect(() => {
    const onKey = (e) => {
      const editing = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable;
      if (e.key === "Escape") {
        if (closedOpen && !dialog && !updatesCtx && selections.closed.size) return clearSelection("closed");
        if (updatesCtx) return setUpdatesCtx(null);
        if (dialog) return closeDialog();
        if (closedOpen) return setClosedOpen(false);
        clearSelection("open");
        clearSelection("closed");
        return;
      }
      if (!editing && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        const scope = closedOpen ? "closed" : "open";
        if (selections[scope].size) {
          e.preventDefault();
          copySelected(app, scope);
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  // lang / dir / theme live on this root only; the rest of the platform is untouched.
  return (
    <div ref={setRootEl} className="ccl-root" lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} data-theme={theme}>
      <div className="wrap">
        <main>{view === "dashboard" ? <Dashboard /> : view === "finance" ? <FinanceView /> : <EntryView />}</main>
      </div>
      {closedOpen && <ClosedModal />}
      {dialog}
      {updatesCtx && <UpdatesModal />}
      <div className={"toast" + (toastState.on ? " on" : "")} id="toast" role="status" style={{ borderColor: toastState.error ? "var(--bad)" : "var(--line)", whiteSpace: "pre-line" }}>
        {toastState.msg}
      </div>
    </div>
  );
}

export default function CustomsClearance({ defaultView = "entry" }) {
  return (
    <AppProvider initialView={defaultView}>
      <Shell />
    </AppProvider>
  );
}
