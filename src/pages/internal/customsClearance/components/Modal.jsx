import { useEffect, useRef } from "react";
import { useApp } from "../AppState.jsx";

const FOCUSABLE = 'button,input,select,textarea,a[href],[tabindex="0"]';

/** Backdrop + box. Traps Tab, focuses the first control, restores focus on close. */
export function Modal({ id, titleId, onClose, boxClass = "box", boxId, title, children }) {
  const { fmt } = useApp();
  const ref = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.querySelector(FOCUSABLE)?.focus();
    return () => previous?.focus?.();
  }, []);

  const onKeyDown = (e) => {
    if (e.key !== "Tab") return;
    const items = [...ref.current.querySelectorAll(FOCUSABLE)].filter((el) => !el.disabled && el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="modal open"
      id={id}
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={onKeyDown}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={boxClass} id={boxId}>
        <h2>
          <span id={titleId}>{title}</span>
          <button onClick={onClose} aria-label={fmt.t("Close", "إغلاق")}>×</button>
        </h2>
        {children}
      </div>
    </div>
  );
}

/**
 * Generic dialog used by every confirmation / form popup.
 * buttons: [{ text, primary, onClick, disabled }]
 */
export function Dialog({ title, wide = false, buttons = [], children }) {
  const { closeDialog } = useApp();
  return (
    <Modal id="dialog" titleId="dialogTitle" boxId="dialogBox" boxClass={"box" + (wide ? " wide" : "")} title={title} onClose={closeDialog}>
      <div id="dialogBody">{children}</div>
      <div id="dialogFoot" className="dialog-foot">
        {buttons.map((b) => (
          <button key={b.text} className={"ebtn" + (b.primary ? " go" : "")} onClick={b.onClick} disabled={b.disabled}>
            {b.text}
          </button>
        ))}
      </div>
    </Modal>
  );
}
