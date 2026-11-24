import { useLocation } from "react-router-dom";
import { getInternalNavigation } from "../navigation/internalNavigation";
import "./management-heading.css";

// Use the exact icon component configured for each route in the internal sidebar.
// The navigation builder includes Super Admin management routes for this lookup;
// it does not affect access control or the items actually shown in the sidebar.
const navigationIconByPath = new Map(
  getInternalNavigation({ roleName: "Super Admin" }).flatMap((section) =>
    (section.items ?? []).flatMap((item) => [
      ...(item.path ? [[item.path, item.icon]] : []),
      ...(item.subItems ?? []).filter((subItem) => subItem.path).map((subItem) => [subItem.path, subItem.icon]),
    ]),
  ),
);

/** Shared management heading. Presentation only; actions and business logic stay in each page. */
export default function ManagementHeaderTitle({ title, description, symbol }) {
  const { pathname } = useLocation();
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  const Icon = navigationIconByPath.get(normalizedPath);

  return (
    <div className="ils-management-heading">
      <span className="ils-management-heading-icon" aria-hidden="true">
        {Icon ? <Icon size={21} strokeWidth={2} /> : (symbol || title?.charAt(0))}
      </span>
      <div className="ils-management-heading-copy">
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
    </div>
  );
}
