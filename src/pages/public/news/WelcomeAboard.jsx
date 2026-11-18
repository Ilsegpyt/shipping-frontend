import SharedCmsPageHero from "../../../components/common/SharedCmsPageHero";
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
        accent: 'text-brand-primary-hover',
    },
    {
        name: "40' Capacity",
        dimensions: '1203 × 235 × 239 cm',
        length: 12.03,
        width: 2.35,
        height: 2.39,
        accent: 'text-brand-primary-hover',
    },
    {
        name: "40' HC Capacity",
        dimensions: '1203 × 235 × 269 cm',
        length: 12.03,
        width: 2.35,
        height: 2.69,
        accent: 'text-brand-accent',
    },
    {
        name: "20' Open Top (OT)",
        dimensions: '589 × 235 × 234 cm',
        length: 5.89,
        width: 2.35,
        height: 2.34,
        accent: 'text-brand-accent',
    },
    {
        name: "20' Flat Rack (FR)",
        dimensions: '591 × 224 × 221 cm',
        length: 5.91,
        width: 2.24,
        height: 2.21,
        accent: 'text-brand-accent',
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
        <main className="min-h-screen bg-brand-surface text-brand-text">
            <SharedCmsPageHero label="ILS Resources" title="CBM Calculator">
                <p className="text-base leading-7 text-brand-primary-hover sm:text-lg sm:leading-8">Calculate cargo volume, gross weight and volumetric weight for your shipment.</p>
            </SharedCmsPageHero>

            <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
                <div className="overflow-hidden rounded-none border border-brand-border bg-brand-surface shadow-sm">
                    <div className="border-b border-brand-border bg-brand-primary px-5 py-3 text-xs font-medium text-brand-surface sm:px-7">
                        <span className="text-brand-accent">UOM:</span>{' '}
                        Centimeters (cm) & Kilograms (kg)
                    </div>

                    <div className="grid lg:grid-cols-2">
                        <div className="border-b border-brand-border bg-brand-surface p-5 sm:p-7 lg:border-b-0 lg:border-r">
                            <div className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-accent">
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
                                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-none border border-brand-border bg-brand-surface px-4 py-3 text-sm font-medium text-brand-muted transition hover:border-brand-accent hover:text-brand-accent"
                            >
                                <RotateCcw size={15} />
                                Reset
                            </button>
                        </div>

                        <div className="p-5 sm:p-7">
                            <div className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-accent">
                                <Calculator size={14} />
                                Results
                            </div>

                            <div className="space-y-3">
                                <ResultRow
                                    icon={<Box size={18} />}
                                    iconClass="bg-brand-primary-hover"
                                    title="Volume (CBM)"
                                    subtitle="Cubic Meter"
                                    value={formatNumber(calculation.cbm)}
                                    unit="m³"
                                />

                                <ResultRow
                                    icon={<Weight size={18} />}
                                    iconClass="bg-brand-accent"
                                    title="Weight"
                                    subtitle="Gross Weight"
                                    value={formatNumber(
                                        calculation.grossWeight
                                    )}
                                    unit="kg"
                                />

                                <ResultRow
                                    icon={<Send size={18} />}
                                    iconClass="bg-brand-accent"
                                    title="Volumetric Weight Express (Courier)"
                                    subtitle="L × W × H / 5,000"
                                    value={formatNumber(
                                        calculation.courierVolumetricWeight
                                    )}
                                    unit="kg"
                                />

                                <ResultRow
                                    icon={<Plane size={18} />}
                                    iconClass="bg-brand-accent"
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

                    <div className="border-t border-brand-border p-5 sm:p-7">
                        <div className="mb-6 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-accent">
                            <Box size={14} />
                            Container Capacity
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {calculation.containers.map((container) => (
                                <div
                                    key={container.name}
                                    className="rounded-none border border-brand-border bg-brand-surface p-4 text-center transition hover:-translate-y-0.5 hover:border-brand-accent hover:shadow-md"
                                >
                                    <h3 className="text-xs font-semibold text-brand-text">
                                        {container.name}
                                    </h3>

                                    <p className="mt-1 text-[9px] text-brand-muted">
                                        {container.dimensions}
                                    </p>

                                    <div
                                        className={`mt-2 text-lg font-bold ${container.accent}`}
                                    >
                                        {container.units}
                                    </div>

                                    <p className="text-[10px] text-brand-muted">
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
            <span className="w-20 shrink-0 text-sm font-medium text-brand-text">
                {label}
            </span>

            <div className="relative flex-1">
                <input
                    type="text"
                    inputMode="decimal"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder="0"
                    className="w-full rounded-none border border-brand-border bg-brand-surface px-4 py-3 pr-14 text-sm text-brand-text outline-none transition placeholder:text-brand-border focus:border-brand-accent focus:ring-4 focus:ring-brand-bg"
                />

                <span className="absolute inset-y-0 right-3 flex items-center text-[10px] font-semibold uppercase text-brand-muted">
                    {unit}
                </span>
            </div>
        </label>
    );
}

function ResultRow({ icon, iconClass, title, subtitle, value, unit }) {
    return (
        <div className="flex items-center gap-3 rounded-none border border-brand-surface bg-brand-surface p-3">
            <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-none text-brand-surface ${iconClass}`}
            >
                {icon}
            </div>

            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-brand-text">
                    {title}
                </p>

                <p className="mt-0.5 text-[9px] text-brand-muted">
                    {subtitle}
                </p>
            </div>

            <div className="shrink-0 text-right">
                <span className="text-sm font-semibold text-brand-primary-hover">
                    {value}
                </span>
                <span className="ml-1 text-[10px] text-brand-muted">
                    {unit}
                </span>
            </div>
        </div>
    );
}
