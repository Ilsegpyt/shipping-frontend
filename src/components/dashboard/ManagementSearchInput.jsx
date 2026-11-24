/**
 * Management search control. Presentation only: the page owns its value,
 * onChange, filtering, loading and API behavior.
 */
export default function ManagementSearchInput({ className = "", ...props }) {
    return (
        <input
            type="search"
            className={`ils-management-search-input ${className}`.trim()}
            {...props}
        />
    );
}
