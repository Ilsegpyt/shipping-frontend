import logo from "../assets/logo.png";
import { useApp } from "../AppState.jsx";
import HelpDialog from "./dialogs/HelpDialog.jsx";

export default function Header() {
  const app = useApp();
  const { fmt, lang, setLang, theme, setTheme, openDialog, setClosedOpen, setUpdatesCtx, closeDialog } = app;
  const { t } = fmt;

  const toggleLang = () => {
    // Like the original: switching language closes any open popup.
    closeDialog();
    setClosedOpen(false);
    setUpdatesCtx(null);
    setLang(lang === "en" ? "ar" : "en");
  };

  return (
    <header>
      <svg id="waves" viewBox="0 0 1200 26" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 21 H1200 V26 H0 Z" fill="#bff0f7" opacity=".85" />
        <path d="M0 13 H1200" stroke="#dff4f8" strokeWidth="2.2" strokeDasharray="30 24" opacity=".7" />
      </svg>
      <div className="logo">
        <img src={logo} alt="ILS Egypt" />
      </div>
      <div className="vdiv" />
      <div className="headtext">
        <div className="h-kicker">
          <svg className="glyph" viewBox="0 0 32 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M6 2h14l6 6v14H6zM20 2v7h6M10 13h12M10 17h8" />
            <path d="m2 14 3 3 5-5" />
          </svg>
          <span>{t("ILS EGYPT · CUSTOMS CLEARANCE", "ILS مصر · التخليص الجمركي")}</span>
        </div>
        <div className="h-title disp">{t("Customs Clearance", "التخليص الجمركي")}</div>
        <div className="h-sub">{t("Ocean import · Domestic import · Ocean export", "وارد بحري · وارد محلي · صادر بحري")}</div>
      </div>
      <div className="spacer" />
      <button className="hbtn" onClick={() => openDialog(<HelpDialog />)}>
        {t("Help Center", "مركز المساعدة")}
      </button>
      <button className="hbtn" id="langBtn" onClick={toggleLang}>
        {lang === "ar" ? "English" : "عربي"}
      </button>
      <button className="hbtn" id="themeBtn" aria-label={t("Change theme", "تغيير المظهر")} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
        ◐
      </button>
    </header>
  );
}
