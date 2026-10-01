import React from "react";

export default function CustomsDutiesCalculator() {
    return (
        <div className="min-h-screen bg-slate-50 px-4 py-10">
            <div className="mx-auto max-w-4xl">
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold text-slate-900">
                        Customs Duties Calculator
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Estimate import taxes, VAT & duties for shipments to Egypt
                    </p>
                </div>

                <div className="overflow-hidden rounded-xl bg-white shadow-lg">
                    <div className="bg-slate-900 px-5 py-3 text-xs text-slate-300">
                        All monetary values converted to EGP
                    </div>

                    <div className="grid md:grid-cols-2">
                        {/* LEFT */}
                        <div className="border-r border-slate-200 p-5">
                            <h2 className="mb-4 text-sm font-semibold text-blue-600">
                                ◻ INCOTERMS
                            </h2>

                            <div className="mb-6 grid grid-cols-3 gap-2">
                                {["FOB", "CIF", "C&F"].map((item, index) => (
                                    <button
                                        key={item}
                                        className={`rounded-md border px-3 py-2 text-xs font-semibold ${index === 0
                                            ? "border-slate-800 bg-slate-800 text-white"
                                            : "border-slate-200 text-slate-600"
                                            }`}
                                    >
                                        {item}
                                    </button>
                                ))}
                            </div>

                            <div className="mb-6 border-t pt-5">
                                <h2 className="mb-4 text-sm font-semibold text-blue-600">
                                    ⚙ INVOICE & COSTS
                                </h2>

                                {[
                                    "Currency",
                                    "Invoice Value",
                                    "THC",
                                    "Insurance Value",
                                    "Freight",
                                ].map((label) => (
                                    <div
                                        key={label}
                                        className="mb-3 flex items-center gap-3"
                                    >
                                        <label className="w-28 text-xs text-slate-600">
                                            {label}
                                        </label>

                                        <input
                                            type="text"
                                            placeholder={
                                                label === "Currency"
                                                    ? "Select currency"
                                                    : "0"
                                            }
                                            className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="mb-6 border-t pt-5">
                                <h2 className="mb-4 text-sm font-semibold text-blue-600">
                                    ◻ Goods Type
                                </h2>

                                <div className="grid grid-cols-3 gap-2">
                                    {["Raw Materials", "Production Lines", "Others"].map(
                                        (item, index) => (
                                            <button
                                                key={item}
                                                className={`rounded-md border px-2 py-2 text-xs ${index === 0
                                                    ? "border-slate-800 bg-slate-800 text-white"
                                                    : "border-slate-200 text-slate-600"
                                                    }`}
                                            >
                                                {item}
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>

                            <div className="mb-6 border-t pt-5">
                                <h2 className="mb-4 text-sm font-semibold text-blue-600">
                                    ⚑ Is there a national agreement?
                                </h2>

                                <div className="grid grid-cols-2 gap-2">
                                    <button className="rounded-md border border-slate-200 py-2 text-xs">
                                        Yes
                                    </button>

                                    <button className="rounded-md bg-slate-800 py-2 text-xs text-white">
                                        No
                                    </button>
                                </div>
                            </div>

                            <div className="border-t pt-5">
                                <h2 className="mb-4 text-sm font-semibold text-blue-600">
                                    % TARIFF RATES
                                </h2>

                                {["HS Code", "Tax Rate", "VAT Rate"].map((label) => (
                                    <div
                                        key={label}
                                        className="mb-3 flex items-center gap-3"
                                    >
                                        <label className="w-28 text-xs text-slate-600">
                                            {label}
                                        </label>

                                        <input
                                            type="text"
                                            placeholder={label === "VAT Rate" ? "14" : "0"}
                                            className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm outline-none"
                                        />
                                    </div>
                                ))}

                                <button className="mt-2 w-full rounded-md border border-slate-200 py-2 text-sm text-slate-600">
                                    ↻ Reset
                                </button>
                            </div>
                        </div>

                        {/* RIGHT */}
                        <div className="p-5">
                            <h2 className="mb-5 text-sm font-semibold text-blue-600">
                                ▥ CALCULATION RESULTS
                            </h2>

                            <div className="mb-6 space-y-4">
                                {[
                                    ["Invoice Value", "Invoice Value"],
                                    ["THC", "Terminal Handling Charges"],
                                    ["Insurance Value", "Insurance Premium"],
                                    ["Freight", "Shipping Cost"],
                                ].map(([title, subtitle]) => (
                                    <div
                                        key={title}
                                        className="flex items-center justify-between"
                                    >
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">
                                                {title}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                {subtitle}
                                            </p>
                                        </div>

                                        <span className="text-sm font-semibold text-slate-800">
                                            0.00 <span className="text-xs">EGP</span>
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t pt-5">
                                <h2 className="mb-5 text-sm font-semibold text-blue-600">
                                    ▣ Duties & Taxes Breakdown
                                </h2>

                                {[
                                    "Import Tax",
                                    "VAT",
                                    "Commercial & Industrial Profits",
                                    "Freight VAT",
                                ].map((item) => (
                                    <div
                                        key={item}
                                        className="mb-4 flex items-center justify-between"
                                    >
                                        <span className="text-sm font-medium text-slate-700">
                                            {item}
                                        </span>

                                        <span className="text-sm font-semibold">
                                            0.00 EGP
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 flex items-center justify-between rounded-lg bg-slate-900 px-5 py-4 text-white">
                                <span className="text-sm font-semibold">
                                    TOTAL ESTIMATED DUTIES
                                </span>

                                <span className="text-xl font-bold">
                                    0.00{" "}
                                    <span className="text-xs font-normal">EGP</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}