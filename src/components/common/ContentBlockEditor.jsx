import RichTextEditor from "./RichTextEditor";

const createId = (prefix = "block") =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const blockTypes = ["text", "highlight", "closing"];

function getBlockLabel(type) {
    if (type === "highlight") return "Highlight Text";
    if (type === "closing") return "Closing Text";
    return "Card Text";
}

function getBlockClasses(type) {
    if (type === "highlight") return "border-amber-200";
    if (type === "closing") return "border-sky-200";
    return "border-slate-200";
}

/**
 * Reusable ordered editor for rich-text blocks.
 * Keeps at least one Card Text block so every card always has its main text field.
 */
export default function ContentBlockEditor({ blocks = [], onChange }) {
    const safeBlocks = Array.isArray(blocks) ? blocks : [];

    const addBlock = (type) => {
        if (!blockTypes.includes(type)) return;
        onChange([
            ...safeBlocks,
            { id: createId(type), type, text: "" },
        ]);
    };

    const updateBlock = (index, updates) => {
        onChange(safeBlocks.map((block, blockIndex) =>
            blockIndex === index ? { ...block, ...updates } : block
        ));
    };

    const moveBlock = (index, direction) => {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= safeBlocks.length) return;
        const next = [...safeBlocks];
        [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
        onChange(next);
    };

    const removeBlock = (index) => {
        const block = safeBlocks[index];
        const textBlockCount = safeBlocks.filter((item) => item.type === "text").length;

        // Every card must retain at least one Card Text block.
        if (block?.type === "text" && textBlockCount <= 1) return;
        onChange(safeBlocks.filter((_, blockIndex) => blockIndex !== index));
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => addBlock("highlight")} className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50">
                    + Add Highlight Text
                </button>
                <button type="button" onClick={() => addBlock("closing")} className="rounded-lg border border-sky-300 bg-white px-3 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-50">
                    + Add Closing Text
                </button>
                <button type="button" onClick={() => addBlock("text")} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                    + Add Card Text
                </button>
            </div>

            {safeBlocks.length === 0 && (
                <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-5 text-sm text-slate-500">
                    No content blocks yet. Add Card Text, Highlight Text, or Closing Text above.
                </p>
            )}

            {safeBlocks.map((block, index) => {
                const textBlockCount = safeBlocks.filter((item) => item.type === "text").length;
                const cannotRemove = block.type === "text" && textBlockCount <= 1;

                return (
                    <section key={block.id || index} className={`rounded-xl border bg-white p-3 ${getBlockClasses(block.type)}`}>
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-slate-700">{index + 1}. {getBlockLabel(block.type)}</span>
                            <div className="flex items-center gap-1">
                                <button type="button" disabled={index === 0} onClick={() => moveBlock(index, -1)} className="rounded border border-slate-200 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-30" aria-label="Move content up">↑ Up</button>
                                <button type="button" disabled={index === safeBlocks.length - 1} onClick={() => moveBlock(index, 1)} className="rounded border border-slate-200 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-30" aria-label="Move content down">↓ Down</button>
                                <button type="button" disabled={cannotRemove} onClick={() => removeBlock(index)} className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30">Remove</button>
                            </div>
                        </div>
                        <RichTextEditor value={block.text || ""} onChange={(value) => updateBlock(index, { text: value })} />
                    </section>
                );
            })}
        </div>
    );
}
