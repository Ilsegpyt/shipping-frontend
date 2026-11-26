export function LoadingSpinner({ label = "Loading...", small = false, inverse = false, showLabel = true }) {
    return (
        <span role="status" className={`flex flex-col items-center justify-center ${small ? "gap-2" : "gap-4"} ${inverse ? "text-brand-inverse" : "text-brand-muted"}`}>
            <span
                aria-hidden="true"
                className={`${small ? "h-6 w-6 border-2" : "h-10 w-10 border-4"} motion-safe:animate-spin rounded-full ${inverse ? "border-brand-inverse/35 border-t-brand-inverse" : "border-brand-border border-t-brand-primary"}`}
            />
            <span className={showLabel ? "text-sm font-medium" : "sr-only"}>{label}</span>
        </span>
    );
}

export default function LoadingScreen({ compact = false, label = "Loading..." }) {
    return (
        <div className={`flex ${compact ? "min-h-[40vh]" : "min-h-screen"} items-center justify-center bg-brand-surface`}>
            <LoadingSpinner label={label} />
        </div>
    );
}
