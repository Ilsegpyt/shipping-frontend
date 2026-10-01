import { useMemo, useState } from 'react';
import {
    Calculator,
    Container,
    Package,
    RefreshCcw,
    Scale,
    Weight,
} from 'lucide-react';

const containerTypes = [
    {
        name: "20' Capacity",
        dimensions: '589 × 230 × 230 cm',
        calculation: [589, 230, 230],
    },
    {
        name: "40' Capacity",
        dimensions: '1200 × 230 × 230 cm',
        calculation: [1200, 230, 230],
    },
    {
        name: "40' HC Capacity",
        dimensions: '1200 × 230 × 260 cm',
        calculation: [1200, 230, 260],
    },
    {
        name: "20' Open Top (OT)",
        dimensions: '589 × 230 × 234 cm',
        calculation: [589, 230, 234],
    },
    {
        name: "20' Flat Rack (FR)",
        dimensions: '580 × 224 × 213 cm',
        calculation: [580, 224, 213],
    },
    {
        name: "40' Open Top (OT)",
        dimensions: '1200 × 230 × 234 cm',
        calculation: [1200, 230, 234],
    },
    {
        name: "40' Flat Rack (FR)",
        dimensions: '1200 × 220 × 196 cm',
        calculation: [1200, 220, 196],
    },
];

const initialValues = {
    length: '',
    width: '',
    height: '',
    weight: '',
    quantity: 1,
};

function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
}

function formatNumber(value) {
    return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 2,
    }).format(value);
}

export default function CbmCalculator() {
    const [values, setValues] = useState(initialValues);

    const calculations = useMemo(() => {
        const length = toNumber(values.length);
        const width = toNumber(values.width);
        const height = toNumber(values.height);
        const weight = toNumber(values.weight);
        const quantity = toNumber(values.quantity) || 1;

        const cbm = (length * width * height * quantity) / 1_000_000;
        const totalWeight = weight * quantity;
        const courierVolumetricWeight =
            (length * width * height * quantity) / 5000;
        const airVolumetricWeight =
            (length * width * height * quantity) / 6000;

        return {
            cbm,
            totalWeight,
            courierVolumetricWeight,
            airVolumetricWeight,
            quantity,
        };
    }, [values]);

    const handleChange = (field) => (event) => {
        const { value } = event.target;

        if (field === 'quantity') {
            setValues((current) => ({
                ...current,
                [field]: value === '' ? '' : Math.max(1, Number(value)),
            }));
            return;
        }

        setValues((current) => ({
            ...current,
            [field]: value,
        }));
    };

    const reset = () => {
        setValues(initialValues);
    };

    return (
        <main className="min-h-screen bg-slate-50">
            <section className="bg-slate-950 py-20 sm:py-24">
                <div className="mx-auto max-w-7xl px-6 text-center lg:px-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
                        Resources
                    </p>

                    <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                        CBM Calculator
                    </h1>

                    <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                        Calculate volume, weight and container capacity for your shipments.
                    </p>
                </div>
            </section>

            <section className="py-12 sm:py-16">
                <div className="mx-auto max-w-5xl px-6 lg:px-8">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center gap-2 bg-slate-950 px-5 py-3 text-xs font-medium text-white">
                            <Calculator size={15} />
                            UOM: Centimeters (cm) & Kilograms (kg)
                        </div>

                        <div className="grid lg:grid-cols-2">
                            <div className="border-b border-slate-200 p-6 lg:border-b-0 lg:border-r">
                                <div className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-sky-600">
                                    <Package size={14} />
                                    Inputs
                                </div>

                                <div className="space-y-4">
                                    <InputField label="Length" value={values.length} onChange={handleChange('length')} suffix="CM" />
                                    <InputField label="Width" value={values.width} onChange={handleChange('width')} suffix="CM" />
                                    <InputField label="Height" value={values.height} onChange={handleChange('height')} suffix="CM" />
                                    <InputField label="Weight" value={values.weight} onChange={handleChange('weight')} suffix="KG" />
                                    <InputField
                                        label="Quantity"
                                        type="number"
                                        min="1"
                                        value={values.quantity}
                                        onChange={handleChange('quantity')}
                                        suffix="PCS"
                                    />

                                    <button
                                        type="button"
                                        onClick={reset}
                                        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600"
                                    >
                                        <RefreshCcw size={15} />
                                        Reset
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-sky-600">
                                    <Scale size={14} />
                                    Results
                                </div>

                                <div className="space-y-3">
                                    <ResultCard
                                        icon={<Package size={18} />}
                                        label="Volume (CBM)"
                                        description="Cubic Meter"
                                        value={`${formatNumber(calculations.cbm)} m³`}
                                    />

                                    <ResultCard
                                        icon={<Weight size={18} />}
                                        label="Weight"
                                        description="Gross Weight"
                                        value={`${formatNumber(calculations.totalWeight)} kg`}
                                    />

                                    <ResultCard
                                        icon={<Scale size={18} />}
                                        label="Volumetric Weight Express (Courier)"
                                        description="L × W × H / 5000"
                                        value={`${formatNumber(calculations.courierVolumetricWeight)} kg`}
                                    />

                                    <ResultCard
                                        icon={<Scale size={18} />}
                                        label="Volumetric Weight Air"
                                        description="L × W × H / 6000"
                                        value={`${formatNumber(calculations.airVolumetricWeight)} kg`}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-slate-200 p-6">
                            <div className="mb-6 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-sky-600">
                                <Container size={14} />
                                Container Capacity
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {containerTypes.map((container) => {
                                    const [length, width, height] = container.calculation;

                                    const containerCbm =
                                        ((length * width * height) / 1_000_000) * 4;

                                    const units =
                                        calculations.cbm > 0
                                            ? Math.floor(
                                                containerCbm /
                                                (calculations.cbm /
                                                    calculations.quantity)
                                            )
                                            : 0;

                                    return (
                                        <div
                                            key={container.name}
                                            className="rounded-xl border border-slate-200 bg-white p-5 text-center transition hover:border-sky-200 hover:bg-sky-50/30"
                                        >
                                            <h3 className="text-xs font-semibold text-slate-800">
                                                {container.name}
                                            </h3>

                                            <p className="mt-1 text-[10px] text-slate-400">
                                                {container.dimensions}
                                            </p>

                                            <p className="mt-4 text-2xl font-bold text-sky-600">
                                                {units}
                                            </p>

                                            <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-400">
                                                units
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}

function InputField({
    label,
    value,
    onChange,
    suffix,
    type = 'text',
    min,
}) {
    return (
        <label className="grid grid-cols-[80px_1fr] items-center gap-4">
            <span className="text-sm font-medium text-slate-700">
                {label}
            </span>

            <div className="relative">
                <input
                    type={type}
                    min={min}
                    value={value}
                    onChange={onChange}
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-16 text-sm text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                />

                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[10px] font-medium text-slate-400">
                    {suffix}
                </span>
            </div>
        </label>
    );
}

function ResultCard({ icon, label, description, value }) {
    return (
        <div className="flex items-center gap-3 rounded-xl bg-sky-50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm">
                {icon}
            </div>

            <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800">
                    {label}
                </p>

                <p className="mt-0.5 text-[10px] text-slate-400">
                    {description}
                </p>
            </div>

            <strong className="shrink-0 text-sm font-semibold text-sky-600">
                {value}
            </strong>
        </div>
    );
}
