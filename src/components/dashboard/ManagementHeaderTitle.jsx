/** Shared management heading. Presentation only; page actions and logic stay in their owners. */
export default function ManagementHeaderTitle({ title, description, symbol }) {
  return (
    <div className="ils-management-heading">
      <span className="ils-management-heading-icon" aria-hidden="true">{symbol || title?.charAt(0)}</span>
      <div className="ils-management-heading-copy">
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
    </div>
  );
}
