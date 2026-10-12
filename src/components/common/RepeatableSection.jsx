export default function RepeatableSection({
    title,
    description,
    items = [],
    onChange,
    createItem,
    renderItem,
    addLabel = "Add Item",
    emptyMessage = "No items yet.",
}) {
    const safeItems = Array.isArray(items) ? items : [];

    const moveItem = (index, direction) => {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= safeItems.length) return;
        const next = [...safeItems];
        [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
        onChange(next);
    };

    const removeItem = (index) => onChange(safeItems.filter((_, itemIndex) => itemIndex !== index));

    return (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    {title && <h3 className="text-base font-semibold text-slate-900">{title}</h3>}
                    {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
                </div>
                <button type="button" onClick={() => onChange([...safeItems, createItem()])} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                    + {addLabel}
                </button>
            </div>

            {safeItems.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">{emptyMessage}</p>
            ) : (
                <div className="space-y-4">
                    {safeItems.map((item, index) => (
                        <div key={item?.id || index} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-slate-800">{title?.includes("Card") ? `Card ${index + 1}` : `Item ${index + 1}`}</span>
                                <div className="flex items-center gap-1">
                                    <button type="button" disabled={index === 0} onClick={() => moveItem(index, -1)} className="rounded border border-slate-200 bg-white px-2 py-1 text-xs disabled:opacity-30">↑ Up</button>
                                    <button type="button" disabled={index === safeItems.length - 1} onClick={() => moveItem(index, 1)} className="rounded border border-slate-200 bg-white px-2 py-1 text-xs disabled:opacity-30">↓ Down</button>
                                    <button type="button" onClick={() => removeItem(index)} className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Remove</button>
                                </div>
                            </div>
                            {renderItem(item, index)}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
