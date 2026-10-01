import { useState } from 'react';

const countries = [
    'Egypt',
    'Saudi Arabia',
    'United Arab Emirates',
    'Qatar',
    'Kuwait',
    'Bahrain',
    'Oman',
    'Jordan',
    'Other',
];

const inputClass =
    'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100';

const labelClass = 'text-sm font-medium text-slate-700';

const optionClass =
    'relative flex min-h-12 cursor-pointer items-center justify-center border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700';

export default function GetAQuote() {
    const [interests, setInterests] = useState([]);
    const [transport, setTransport] = useState([]);
    const [shipments, setShipments] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (event) => {
        event.preventDefault();

        // Frontend only for now.
        // API / database integration will be added later.
        setSubmitted(true);
    };

    const toggleInterest = (item) => {
        setInterests((current) =>
            current.includes(item)
                ? current.filter((value) => value !== item)
                : [...current, item]
        );
    };

    return (
        <main className="bg-white">
            {/* ==================== Hero ==================== */}
            <section className="relative overflow-hidden bg-slate-950 pt-32 pb-20 sm:pt-36 sm:pb-24">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_40%)]" />
                <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
                <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-sky-400/10 blur-3xl" />

                <div className="relative mx-auto max-w-7xl px-6 text-center lg:px-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
                        Contact ILS
                    </p>

                    <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                        Get A Quote
                    </h1>

                    <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                        Fill in the form and our experts will contact you.
                    </p>
                </div>
            </section>

            {/* ==================== Quote Form ==================== */}
            <section className="bg-slate-50 py-20 sm:py-24">
                <div className="mx-auto max-w-5xl px-6 lg:px-8">
                    <div className="mb-10 max-w-2xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                            Quote Request
                        </p>

                        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                            Tell us about your shipment
                        </h2>

                        <p className="mt-4 text-base leading-7 text-slate-600">
                            Share your requirements and our logistics team will get in
                            touch with you.
                        </p>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid gap-5 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="firstName" className={labelClass}>
                                        First Name
                                    </label>
                                    <input
                                        id="firstName"
                                        name="firstName"
                                        type="text"
                                        placeholder="First Name"
                                        required
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="lastName" className={labelClass}>
                                        Last Name
                                    </label>
                                    <input
                                        id="lastName"
                                        name="lastName"
                                        type="text"
                                        placeholder="Last Name"
                                        required
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="company" className={labelClass}>
                                        Company
                                    </label>
                                    <input
                                        id="company"
                                        name="company"
                                        type="text"
                                        placeholder="Company"
                                        required
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="country" className={labelClass}>
                                        Country
                                    </label>
                                    <select
                                        id="country"
                                        name="country"
                                        defaultValue=""
                                        required
                                        className={inputClass}
                                    >
                                        <option value="" disabled>
                                            Select Country
                                        </option>

                                        {countries.map((country) => (
                                            <option key={country} value={country}>
                                                {country}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="cellPhone" className={labelClass}>
                                        Cell Phone
                                    </label>

                                    <div className="mt-2 flex gap-3">
                                        <input
                                            name="countryCode"
                                            type="text"
                                            placeholder="+20"
                                            aria-label="Country code"
                                            className="w-24 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                                        />

                                        <input
                                            id="cellPhone"
                                            name="cellPhone"
                                            type="tel"
                                            placeholder="Cell Phone"
                                            required
                                            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="email" className={labelClass}>
                                        Email
                                    </label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="you@company.com"
                                        required
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="message" className={labelClass}>
                                    Message
                                </label>

                                <textarea
                                    id="message"
                                    name="message"
                                    rows={5}
                                    placeholder="Tell us about your requirements..."
                                    className={`${inputClass} resize-y`}
                                />
                            </div>

                            <div className="grid gap-6 lg:grid-cols-2">
                                <div>
                                    <div className="flex items-end justify-between gap-4">
                                        <p className={labelClass}>What are you interested in?</p>
                                        <span className="text-xs text-slate-400">Select all that apply</span>
                                    </div>

                                    <div className="mt-2 grid grid-cols-3">
                                        {['Import', 'Export', 'Both'].map((item, index) => {
                                            const isSelected =
                                                item === 'Both'
                                                    ? interests.includes('Import') && interests.includes('Export')
                                                    : interests.includes(item);

                                            return (
                                                <button
                                                    key={item}
                                                    type="button"
                                                    onClick={() => {
                                                        if (item === 'Both') {
                                                            setInterests(
                                                                isSelected ? [] : ['Import', 'Export']
                                                            );
                                                            return;
                                                        }

                                                        toggleInterest(item);
                                                    }}
                                                    className={`${optionClass} ${index === 0 ? 'rounded-l-xl' : ''
                                                        } ${index === 2 ? 'rounded-r-xl' : ''
                                                        } ${isSelected
                                                            ? 'z-10 border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                                                            : ''
                                                        }`}
                                                >
                                                    {isSelected && (
                                                        <span className="absolute left-3 flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-[11px] font-bold text-white">
                                                            ✓
                                                        </span>
                                                    )}
                                                    {item}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <p className={labelClass}>
                                        What is your preferred mode of transport?
                                    </p>

                                    <div className="mt-2 grid grid-cols-3">
                                        {['Air', 'Land', 'Sea'].map((item) => {
                                            const isSelected = transport.includes(item);

                                            return (
                                                <button
                                                    key={item}
                                                    type="button"
                                                    onClick={() =>
                                                        setTransport((current) =>
                                                            current.includes(item)
                                                                ? current.filter((value) => value !== item)
                                                                : [...current, item]
                                                        )
                                                    }
                                                    className={`${optionClass} ${item === 'Air' ? 'rounded-l-xl' : ''
                                                        } ${item === 'Sea' ? 'rounded-r-xl' : ''
                                                        } ${isSelected
                                                            ? 'z-10 border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                                                            : ''
                                                        }`}
                                                >
                                                    {isSelected && (
                                                        <span className="absolute left-3 flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-[11px] font-bold text-white">
                                                            ✓
                                                        </span>
                                                    )}
                                                    {item}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <p className={labelClass}>
                                    What is your annual number of shipments?
                                </p>

                                <div className="mt-2 grid grid-cols-3">
                                    {['0-10', '10-100', '100+'].map((item, index) => {
                                        const isSelected = shipments === item;

                                        return (
                                            <button
                                                key={item}
                                                type="button"
                                                onClick={() => setShipments(item)}
                                                className={`${optionClass} ${index === 0 ? 'rounded-l-xl' : ''
                                                    } ${index === 2 ? 'rounded-r-xl' : ''
                                                    } ${isSelected
                                                        ? 'z-10 border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                                                        : ''
                                                    }`}
                                            >
                                                {isSelected && (
                                                    <span className="absolute left-3 flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-[11px] font-bold text-white">
                                                        ✓
                                                    </span>
                                                )}
                                                {item}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-slate-500">
                                    Our experts will review your requirements and contact you.
                                </p>

                                <button
                                    type="submit"
                                    className="inline-flex items-center justify-center rounded-xl bg-sky-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-950/10 transition hover:bg-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-100"
                                >
                                    Submit
                                </button>
                            </div>

                            {submitted && (
                                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                                    Your quote request has been submitted successfully.
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </section>
        </main>
    );
}
