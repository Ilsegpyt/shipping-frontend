import { useMemo, useState } from 'react';
import {
    Box,
    Calculator,
    Plane,
    RotateCcw,
    Send,
    Weight,
} from 'lucide-react';

const CONTAINERS = [
    {
        name: "20' Capacity",
        dimensions: '589 × 235 × 239 cm',
        length: 5.89,
        width: 2.35,
        height: 2.39,
        accent: 'text-blue-600',
    },
    {
        name: "40' Capacity",
        dimensions: '1203 × 235 × 239 cm',
        length: 12.03,
        width: 2.35,
        height: 2.39,
        accent: 'text-blue-600',
    },
    {
        name: "40' HC Capacity",
        dimensions: '1203 × 235 × 269 cm',
        length: 12.03,
        width: 2.35,
        height: 2.69,
        accent: 'text-cyan-600',
    },
    {
        name: "20' Open Top (OT)",
        dimensions: '589 × 235 × 234 cm',
        length: 5.89,
        width: 2.35,
        height: 2.34,
        accent: 'text-amber-500',
    },
    {
        name: "20' Flat Rack (FR)",
        dimensions: '591 × 224 × 221 cm',
        length: 5.91,
        width: 2.24,
        height: 2.21,
        accent: 'text-emerald-500',
    },
    {
        name: "40' Open Top (OT)",
        dimensions: '1203 × 235 × 234 cm',
        length: 12.03,
        width: 2.35,
        height: 2.34,
        accent: 'text-rose-500',
    },
    {
        name: "40' Flat Rack (FR)",
        dimensions: '1208 × 224 × 196 cm',
        length: 12.08,
        width: 2.24,
        height: 1.96,
        accent: 'text-pink-500',
    },
];

const INITIAL_VALUES = {
    length: '',
    width: '',
    height: '',
    weight: '',
    quantity: '1',
};

function toNumber(value) {
    const number = Number.parseFloat(value);
    return Number.isFinite(number) && number >= 0 ? number : 0;
}

function formatNumber(value, digits = 2) {
    if (!Number.isFinite(value)) return '0';
    return value.toLocaleString('en-US', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });
}

export default function CbmCalculator() {
    const [values, setValues] = useState(INITIAL_VALUES);

    const calculation = useMemo(() => {
        const length = toNumber(values.length);
        const width = toNumber(values.width);
        const height = toNumber(values.height);
        const weight = toNumber(values.weight);
        const quantity = Math.max(0, toNumber(values.quantity));

        const cubicCentimeters = length * width * height * quantity;
        const cbm = cubicCentimeters / 1_000_000;

        return {
            cbm,
            grossWeight: weight * quantity,
            courierVolumetricWeight: cubicCentimeters / 5000,
            airVolumetricWeight: cubicCentimeters / 6000,
            containers: CONTAINERS.map((container) => {
                const capacity =
                    container.length *
                    container.width *
                    container.height;

                return {
                    ...container,
                    capacity,
                    units: cbm > 0 ? Math.ceil(cbm / capacity) : 0,
                };
            }),
        };
    }, [values]);

    const updateValue = (field, value) => {
        if (value === '') {
            setValues((current) => ({ ...current, [field]: '' }));
            return;
        }

        if (!/^\d*\.?\d*$/.test(value)) return;

        setValues((current) => ({
            ...current,
            [field]: value,
        }));
    };

    const reset = () => setValues(INITIAL_VALUES);

    return (
        <main className="min-h-screen bg-slate-50 text-slate-900">
            <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(14,165,233,0.18),transparent_38%)]" />

                <div className="relative mx-auto max-w-7xl px-6 pb-14 pt-28 lg:px-8">
                    <div className="mx-auto max-w-3xl text-center">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-300 backdrop-blur-md">
                            <Calculator size={14} />
                            ILS Resources
                        </span>

                        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                            CBM Calculator
                        </h1>

                        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                            Calculate cargo volume, gross weight and volumetric
                            weight for your shipment.
                        </p>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
                    <div className="border-b border-slate-200 bg-slate-950 px-5 py-3 text-xs font-medium text-slate-300 sm:px-7">
                        <span className="text-sky-400">UOM:</span>{' '}
                        Centimeters (cm) & Kilograms (kg)
                    </div>

                    <div className="grid lg:grid-cols-2">
                        <div className="border-b border-slate-200 bg-slate-50 p-5 sm:p-7 lg:border-b-0 lg:border-r">
                            <div className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-600">
                                <Calculator size={14} />
                                Inputs
                            </div>

                            <div className="space-y-4">
                                <InputRow
                                    label="Length"
                                    value={values.length}
                                    unit="CM"
                                    onChange={(value) =>
                                        updateValue('length', value)
                                    }
                                />

                                <InputRow
                                    label="Width"
                                    value={values.width}
                                    unit="CM"
                                    onChange={(value) =>
                                        updateValue('width', value)
                                    }
                                />

                                <InputRow
                                    label="Height"
                                    value={values.height}
                                    unit="CM"
                                    onChange={(value) =>
                                        updateValue('height', value)
                                    }
                                />

                                <InputRow
                                    label="Weight"
                                    value={values.weight}
                                    unit="KG"
                                    onChange={(value) =>
                                        updateValue('weight', value)
                                    }
                                />

                                <InputRow
                                    label="Quantity"
                                    value={values.quantity}
                                    unit="PCS"
                                    onChange={(value) =>
                                        updateValue('quantity', value)
                                    }
                                />
                            </div>

                            <button
                                type="button"
                                onClick={reset}
                                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-sky-200 hover:text-sky-600"
                            >
                                <RotateCcw size={15} />
                                Reset
                            </button>
                        </div>

                        <div className="p-5 sm:p-7">
                            <div className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-600">
                                <Calculator size={14} />
                                Results
                            </div>

                            <div className="space-y-3">
                                <ResultRow
                                    icon={<Box size={18} />}
                                    iconClass="bg-blue-500"
                                    title="Volume (CBM)"
                                    subtitle="Cubic Meter"
                                    value={formatNumber(calculation.cbm)}
                                    unit="m³"
                                />

                                <ResultRow
                                    icon={<Weight size={18} />}
                                    iconClass="bg-amber-500"
                                    title="Weight"
                                    subtitle="Gross Weight"
                                    value={formatNumber(
                                        calculation.grossWeight
                                    )}
                                    unit="kg"
                                />

                                <ResultRow
                                    icon={<Send size={18} />}
                                    iconClass="bg-cyan-500"
                                    title="Volumetric Weight Express (Courier)"
                                    subtitle="L × W × H / 5,000"
                                    value={formatNumber(
                                        calculation.courierVolumetricWeight
                                    )}
                                    unit="kg"
                                />

                                <ResultRow
                                    icon={<Plane size={18} />}
                                    iconClass="bg-emerald-500"
                                    title="Volumetric Weight Air"
                                    subtitle="L × W × H / 6,000"
                                    value={formatNumber(
                                        calculation.airVolumetricWeight
                                    )}
                                    unit="kg"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 p-5 sm:p-7">
                        <div className="mb-6 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-600">
                            <Box size={14} />
                            Container Capacity
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {calculation.containers.map((container) => (
                                <div
                                    key={container.name}
                                    className="rounded-xl border border-slate-200 bg-white p-4 text-center transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
                                >
                                    <h3 className="text-xs font-semibold text-slate-800">
                                        {container.name}
                                    </h3>

                                    <p className="mt-1 text-[9px] text-slate-400">
                                        {container.dimensions}
                                    </p>

                                    <div
                                        className={`mt-2 text-2xl font-bold ${container.accent}`}
                                    >
                                        {container.units}
                                    </div>

                                    <p className="text-[10px] text-slate-400">
                                        units
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}

function InputRow({ label, value, unit, onChange }) {
    return (
        <label className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-sm font-medium text-slate-700">
                {label}
            </span>

            <div className="relative flex-1">
                <input
                    type="text"
                    inputMode="decimal"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-14 text-sm text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                />

                <span className="absolute inset-y-0 right-3 flex items-center text-[10px] font-semibold uppercase text-slate-400">
                    {unit}
                </span>
            </div>
        </label>
    );
}

function ResultRow({ icon, iconClass, title, subtitle, value, unit }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${iconClass}`}
            >
                {icon}
            </div>

            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">
                    {title}
                </p>

                <p className="mt-0.5 text-[9px] text-slate-400">
                    {subtitle}
                </p>
            </div>

            <div className="shrink-0 text-right">
                <span className="text-sm font-semibold text-blue-600">
                    {value}
                </span>
                <span className="ml-1 text-[10px] text-slate-400">
                    {unit}
                </span>
            </div>
        </div>
    );
}
