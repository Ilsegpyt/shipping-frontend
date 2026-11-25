import { dropdownOptions } from "../lib/format.js";
import { useApp } from "../AppState.jsx";

/** Dropdown for client / POD / POL / shipping line / terminal / stage / clearance / container type. Platform values only. */
export default function OptionSelect({ id, className, k, fieldKey, value, required, disabled, onChange, onKeyDown, autoFocus }) {
  const { fmt, lookups } = useApp();
  const { t } = fmt;
  const options = dropdownOptions(fieldKey, k, lookups, fmt, value);

  return (
    <select
      id={id}
      className={className}
      required={required}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      autoFocus={autoFocus}
    >
      {required ? (
        // Required (create form): placeholder only, not a choice in the list.
        <option value="" disabled hidden>{lookups.loaded || !["clientId", "pod", "pol", "shippingLine", "terminal"].includes(fieldKey) ? t("Select", "اختر") : t("Loading…", "جاري التحميل…")}</option>
      ) : (
        // Optional (table Edit): a choice that clears the field.
        <option value="">—</option>
      )}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
