import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Calculator,
    RotateCcw,
    FileText,
    Coins,
    Ship,
    ShieldCheck,
    Percent,
    ReceiptText,
} from 'lucide-react';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'KWD', 'QAR', 'EGP'];
const GOODS_TYPES = ['Raw Materials', 'Production Lines', 'Others'];

const INITIAL_FORM = {
    invoiceValue: '',
    thc: '',
    insuranceValue: '',
    freight: '',
    hsCode: '',
    taxRate: '',
    vatRate: '',
};

function toNumber(value) {
    const number = Number.parseFloat(value);
    return Number.isFinite(number) && number >= 0 ? number : 0;
}

function formatNumber(value) {
    return Number.isFinite(value)
        ? value.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })
        : '0.00';
}

export default function CustomsDutiesCalculator() {
    const [incoterm, setIncoterm] = useState('FOB');
    const [currency, setCurrency] = useState('USD');
    const [goodsType, setGoodsType] = useState('Raw Materials');
    const [nationalAgreement, setNationalAgreement] = useState(false);

    const [exchangeRate, setExchangeRate] = useState(1);
    const [isLoadingRate, setIsLoadingRate] = useState(false);
    const [rateError, setRateError] = useState('');

    const [form, setForm] = useState(INITIAL_FORM);
    const [isLookingUpHs, setIsLookingUpHs] = useState(false);
    const [hsLookupError, setHsLookupError] = useState('');
    const [commodityName, setCommodityName] = useState('');

    useEffect(() => {
        let cancelled = false;

        const loadExchangeRate = async () => {
            if (currency === 'EGP') {
                setExchangeRate(1);
                setRateError('');
                return;
            }

            setIsLoadingRate(true);
            setRateError('');

            try {
                const response = await fetch(
                    `https://open.er-api.com/v6/latest/${currency}`
                );

                if (!response.ok) {
                    throw new Error('Failed to load exchange rate.');
                }

                const data = await response.json();
                const rate = Number(data?.rates?.EGP);

                if (!Number.isFinite(rate) || rate <= 0) {
                    throw new Error('Invalid exchange rate received.');
                }

                if (!cancelled) {
                    setExchangeRate(rate);
                }
            } catch (error) {
                if (!cancelled) {
                    setExchangeRate(1);
                    setRateError(
                        error.message || 'Failed to load exchange rate.'
                    );
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingRate(false);
                }
            }
        };

        loadExchangeRate();

        return () => {
            cancelled = true;
        };
    }, [currency]);

    const updateField = (field, value) => {
        if (field !== 'hsCode' && value !== '' && !/^\d*\.?\d*$/.test(value)) {
            return;
        }

        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    };

    const lookupHsCode = async () => {
        const hsCode = form.hsCode.replace(/\D/g, '');

        if (hsCode.length < 4) {
            setHsLookupError('Enter at least 4 digits.');
            return;
        }

        setIsLookingUpHs(true);
        setHsLookupError('');
        setCommodityName('');

        try {
            // Frontend-only temporary lookup through Gomruky tariff pages.
            // r.jina.ai is used as a read-only text proxy so the browser does
            // not depend on Gomruky's CORS configuration.
            const url = `https://r.jina.ai/https://www.gomruky.com/tariff/${hsCode}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Unable to load HS Code data.');
            }

            const text = await response.text();

            const taxMatch = text.match(/ضريبة الوارد[\s\S]{0,120}?([0-9]+(?:\.[0-9]+)?)\s*%/i);
            const vatMatch = text.match(/ضريبة قيمه مضافه[\s\S]{0,120}?([0-9]+(?:\.[0-9]+)?)\s*%/i);

            if (!taxMatch && !vatMatch) {
                throw new Error('HS Code was not found.');
            }

            const titleMatch = text.match(/#\s*التعريفه الجمركيه لـ\s*([^\n]+)/i);

            setForm((current) => ({
                ...current,
                hsCode,
                taxRate: taxMatch ? taxMatch[1] : current.taxRate,
                vatRate: vatMatch ? vatMatch[1] : current.vatRate,
            }));

            if (titleMatch?.[1]) {
                setCommodityName(titleMatch[1].trim());
            }
        } catch (error) {
            setHsLookupError(error.message || 'Unable to lookup HS Code.');
        } finally {
            setIsLookingUpHs(false);
        }
    };

    const calculations = (() => {
        const rate = exchangeRate || 0;

        const invoiceValue = toNumber(form.invoiceValue);
        const thcValue = toNumber(form.thc);
        const insuranceValue =
            incoterm === 'FOB' || incoterm === 'C&F'
                ? toNumber(form.insuranceValue)
                : 0;
        const freightValue = toNumber(form.freight);

        // Exact calculation flow from the original calculator.
        const invoiceEGP = invoiceValue * rate;
        const thcEGP = thcValue * rate;
        const insuranceEGP = insuranceValue * rate;
        const freightEGP = freightValue * rate;

        const base =
            invoiceEGP +
            thcEGP +
            insuranceEGP +
            (incoterm === 'FOB' ? freightEGP : 0);

        const importTax = nationalAgreement
            ? 0
            : base * (toNumber(form.taxRate) / 100);

        const vat =
            goodsType === 'Others'
                ? (base + importTax) * (toNumber(form.vatRate) / 100)
                : 0;

        const commercialProfits =
            goodsType === 'Production Lines' ? 0 : base * 0.01;

        const freightVAT = 0.14 * freightEGP;

        const totalDuties =
            importTax + vat + commercialProfits + freightVAT;

        return {
            invoiceEGP,
            thcEGP,
            insuranceEGP,
            freightEGP,
            importTax,
            vat,
            commercialProfits,
            freightVAT,
            totalDuties,
        };
    })();

    const reset = () => {
        setIncoterm('FOB');
        setCurrency('USD');
        setGoodsType('Raw Materials');
        setNationalAgreement(false);
        setForm(INITIAL_FORM);
    };

    return (
        <main className="min-h-screen bg-slate-50 text-slate-900">
            <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(14,165,233,0.18),transparent_38%)]" />

                <div className="relative mx-auto max-w-7xl px-6 pb-14 pt-8 lg:px-8">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-white/80 backdrop-blur-md transition hover:border-sky-400/40 hover:bg-white/15 hover:text-white"
                    >
                        <span aria-hidden="true">←</span>
                        Back to Home
                    </Link>

                    <div className="mx-auto mt-12 max-w-3xl text-center">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-300 backdrop-blur-md">
                            <Calculator size={14} />
                            ILS Resources
                        </span>

                        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                            Customs Duties Calculator
                        </h1>

                        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                            Estimate import taxes, VAT &amp; duties for shipments to Egypt.
                        </p>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="bg-slate-950 px-5 py-3 text-xs font-semibold text-sky-300">
                        All monetary values converted to EGP
                    </div>

                    <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
                        <SectionTitle icon={<Ship size={14} />}>
                            Incoterms
                        </SectionTitle>

                        <div className="grid grid-cols-3 gap-2 sm:max-w-md">
                            {['FOB', 'CIF', 'C&F'].map((item) => (
                                <button
                                    key={item}
                                    type="button"
                                    onClick={() => setIncoterm(item)}
                                    className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${incoterm === item
                                        ? 'border-sky-500 bg-sky-500 text-white shadow-sm'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50'
                                        }`}
                                >
                                    {item}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-2">
                        <div className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-r sm:p-6">
                            <section>
                                <SectionTitle icon={<FileText size={14} />}>
                                    Invoice &amp; Costs
                                </SectionTitle>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Field label="Currency">
                                        <select
                                            value={currency}
                                            onChange={(e) => setCurrency(e.target.value)}
                                            className={inputClass}
                                        >
                                            {CURRENCIES.map((item) => (
                                                <option key={item} value={item}>
                                                    {item}
                                                </option>
                                            ))}
                                        </select>

                                        {isLoadingRate && (
                                            <span className="mt-1 block text-[10px] text-sky-600">
                                                Loading exchange rate...
                                            </span>
                                        )}

                                        {!isLoadingRate && !rateError && (
                                            <span className="mt-1 block text-[10px] text-slate-400">
                                                1 {currency} = {formatNumber(exchangeRate)} EGP
                                            </span>
                                        )}

                                        {rateError && (
                                            <span className="mt-1 block text-[10px] text-red-500">
                                                {rateError}
                                            </span>
                                        )}
                                    </Field>

                                    <Field label="Invoice Value" suffix={currency}>
                                        <input
                                            type="number"
                                            min="0"
                                            value={form.invoiceValue}
                                            onChange={(e) =>
                                                updateField('invoiceValue', e.target.value)
                                            }
                                            placeholder="0.00"
                                            className={inputClass}
                                        />
                                    </Field>

                                    <Field label="THC" suffix={currency}>
                                        <input
                                            type="number"
                                            min="0"
                                            value={form.thc}
                                            onChange={(e) =>
                                                updateField('thc', e.target.value)
                                            }
                                            placeholder="0.00"
                                            className={inputClass}
                                        />
                                    </Field>

                                    <Field label="Insurance Value" suffix={currency}>
                                        <input
                                            type="number"
                                            min="0"
                                            value={form.insuranceValue}
                                            onChange={(e) =>
                                                updateField('insuranceValue', e.target.value)
                                            }
                                            placeholder="0.00"
                                            className={inputClass}
                                        />
                                    </Field>

                                    <Field label="Freight" suffix={currency}>
                                        <input
                                            type="number"
                                            min="0"
                                            value={form.freight}
                                            onChange={(e) =>
                                                updateField('freight', e.target.value)
                                            }
                                            placeholder="0.00"
                                            className={inputClass}
                                        />
                                    </Field>
                                </div>
                            </section>

                            <section className="mt-7">
                                <SectionTitle icon={<BoxIcon />}>
                                    Goods Type
                                </SectionTitle>

                                <div className="grid gap-2 sm:grid-cols-3">
                                    {GOODS_TYPES.map((item) => (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => setGoodsType(item)}
                                            className={`rounded-lg border px-3 py-2.5 text-xs font-semibold transition ${goodsType === item
                                                ? 'border-sky-500 bg-sky-50 text-sky-700'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300'
                                                }`}
                                        >
                                            {item}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section className="mt-7">
                                <SectionTitle icon={<ShieldCheck size={14} />}>
                                    Is there a national agreement?
                                </SectionTitle>

                                <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
                                    {[true, false].map((value) => (
                                        <button
                                            key={String(value)}
                                            type="button"
                                            onClick={() => setNationalAgreement(value)}
                                            className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${nationalAgreement === value
                                                ? 'border-sky-500 bg-sky-500 text-white'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50'
                                                }`}
                                        >
                                            {value ? 'Yes' : 'No'}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section className="mt-7">
                                <SectionTitle icon={<Percent size={14} />}>
                                    Tariff Rates
                                </SectionTitle>

                                <div className="grid gap-4 sm:grid-cols-3">
                                    <Field label="HS Code">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={form.hsCode}
                                            onChange={(e) => {
                                                setHsLookupError('');
                                                updateField('hsCode', e.target.value);
                                            }}
                                            onBlur={lookupHsCode}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') lookupHsCode();
                                            }}
                                            placeholder="Enter HS Code"
                                            className={inputClass}
                                        />
                                        {isLookingUpHs && (
                                            <span className="mt-1 block text-[10px] text-sky-600">
                                                Looking up HS Code...
                                            </span>
                                        )}
                                        {!isLookingUpHs && commodityName && (
                                            <span className="mt-1 block text-[10px] text-slate-500">
                                                {commodityName}
                                            </span>
                                        )}
                                        {hsLookupError && (
                                            <span className="mt-1 block text-[10px] text-red-500">
                                                {hsLookupError}
                                            </span>
                                        )}
                                    </Field>

                                    <Field label="Tax Rate" suffix="%">
                                        <input
                                            type="number"
                                            min="0"
                                            value={form.taxRate}
                                            onChange={(e) =>
                                                updateField('taxRate', e.target.value)
                                            }
                                            placeholder="0.00"
                                            className={inputClass}
                                        />
                                    </Field>

                                    <Field label="VAT Rate" suffix="%">
                                        <input
                                            type="number"
                                            min="0"
                                            value={form.vatRate}
                                            onChange={(e) =>
                                                updateField('vatRate', e.target.value)
                                            }
                                            placeholder="0.00"
                                            className={inputClass}
                                        />
                                    </Field>
                                </div>

                                <button
                                    type="button"
                                    onClick={reset}
                                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                                >
                                    <RotateCcw size={13} />
                                    Reset
                                </button>
                            </section>
                        </div>

                        <div className="bg-slate-50/60 p-5 sm:p-6">
                            <SectionTitle icon={<ReceiptText size={14} />}>
                                Calculation Results
                            </SectionTitle>

                            <div className="space-y-3">
                                <ResultCard
                                    icon={<FileText size={17} />}
                                    title="Invoice Value"
                                    subtitle="Converted Invoice Value"
                                    value={`${formatNumber(calculations.invoiceEGP)} EGP`}
                                    iconClass="bg-blue-500"
                                />

                                <ResultCard
                                    icon={<Coins size={17} />}
                                    title="THC"
                                    subtitle="Terminal Handling Charges"
                                    value={`${formatNumber(calculations.thcEGP)} EGP`}
                                    iconClass="bg-amber-500"
                                />

                                <ResultCard
                                    icon={<ShieldCheck size={17} />}
                                    title="Insurance Value"
                                    subtitle="Insurance Premium"
                                    value={`${formatNumber(calculations.insuranceEGP)} EGP`}
                                    iconClass="bg-cyan-500"
                                />

                                <ResultCard
                                    icon={<Ship size={17} />}
                                    title="Freight"
                                    subtitle="Shipping Cost"
                                    value={`${formatNumber(calculations.freightEGP)} EGP`}
                                    iconClass="bg-emerald-500"
                                />
                            </div>

                            <div className="my-7 h-px bg-slate-200" />

                            <SectionTitle icon={<Percent size={14} />}>
                                Duties &amp; Taxes Breakdown
                            </SectionTitle>

                            <div className="space-y-2.5">
                                <BreakdownRow
                                    label="Import Tax"
                                    value={`${formatNumber(calculations.importTax)} EGP`}
                                />
                                <BreakdownRow
                                    label="VAT"
                                    value={`${formatNumber(calculations.vat)} EGP`}
                                />
                                <BreakdownRow
                                    label="Commercial & Industrial Profits"
                                    value={`${formatNumber(calculations.commercialProfits)} EGP`}
                                />
                                <BreakdownRow
                                    label="Freight VAT"
                                    value={`${formatNumber(calculations.freightVAT)} EGP`}
                                />
                            </div>

                            <div className="mt-5 rounded-xl bg-gradient-to-r from-slate-950 to-sky-950 p-5 text-white shadow-sm">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">
                                    Total Estimated Duties
                                </div>
                                <div className="mt-2 text-3xl font-semibold tracking-tight">
                                    {formatNumber(calculations.totalDuties)} EGP
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}

function SectionTitle({ icon, children }) {
    return (
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-sky-600">
            {icon}
            {children}
        </div>
    );
}

function Field({ label, suffix, children }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-600">
                {label}
            </span>
            <div className="relative">
                {children}
                {suffix && (
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-400">
                        {suffix}
                    </span>
                )}
            </div>
        </label>
    );
}

function ResultCard({ icon, title, subtitle, value, iconClass }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
            <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white ${iconClass}`}
            >
                {icon}
            </div>

            <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-800">
                    {title}
                </div>
                <div className="mt-0.5 text-[10px] text-slate-400">
                    {subtitle}
                </div>
            </div>

            <div className="text-right text-xs font-semibold text-blue-600">
                {value}
            </div>
        </div>
    );
}

function BreakdownRow({ label, value }) {
    return (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3.5 py-3">
            <span className="text-xs text-slate-600">{label}</span>
            <span className="text-xs font-semibold text-slate-800">{value}</span>
        </div>
    );
}

function BoxIcon() {
    return (
        <span className="inline-flex h-[14px] w-[14px] items-center justify-center rounded-sm border border-current text-[8px]">
            □
        </span>
    );
}

const inputClass =
    'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-100';
