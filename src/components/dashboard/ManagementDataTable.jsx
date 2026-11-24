import "./management-data-table.css";

/**
 * Presentation-only table shell shared across Management pages.
 * Column markup, row keys, selection, events, loading and pagination
 * remain owned by the caller. Reusable later in Operations without
 * changing any Operations code today.
 */
export default function ManagementDataTable({ className = "", children, ...props }) {
  return (
    <table {...props} className={`ils-management-data-table ${className}`.trim()}>
      {children}
    </table>
  );
}
