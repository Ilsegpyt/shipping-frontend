import React, { useState } from 'react';

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

const citiesByCountry = {
    Egypt: ['Cairo', 'Alexandria', 'Giza', 'Port Said', 'Other'],
    'Saudi Arabia': ['Jeddah', 'Riyadh', 'Dammam', 'Other'],
    'United Arab Emirates': ['Dubai', 'Abu Dhabi', 'Sharjah', 'Other'],
    Qatar: ['Doha', 'Other'],
    Kuwait: ['Kuwait City', 'Other'],
    Bahrain: ['Manama', 'Other'],
    Oman: ['Muscat', 'Other'],
    Jordan: ['Amman', 'Other'],
    Other: ['Other'],
};

const inputClass =
    'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100';

const labelClass = 'text-sm font-medium text-slate-700';

export default function AgentOpportunity() {
    const [country, setCountry] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const cities = country ? citiesByCountry[country] ?? ['Other'] : [];

    const handleSubmit = (event) => {
        event.preventDefault();
        setSubmitted(true);
    };

    return (
        <main className="bg-white">
            {/* ==================== Hero ==================== */}
            <section className="relative overflow-hidden bg-slate-950 pt-32 pb-20 sm:pt-36 sm:pb-24">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_40%)]" />
                <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
                <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-sky-400/10 blur-3xl" />

                <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
                            Join ILS
                        </p>

                        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                            Become an Agent
                        </h1>

                        <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                            Join our global network of agents and explore new business
                            opportunities with ILS.
                        </p>
                    </div>
                </div>
            </section>

            {/* ==================== Form ==================== */}
            <section className="bg-slate-50 py-20 sm:py-24">
                <div className="mx-auto max-w-5xl px-6 lg:px-8">
                    <div className="mb-10 max-w-2xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                            Agent Opportunity
                        </p>

                        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                            Tell us about your business
                        </h2>

                        <p className="mt-4 text-base leading-7 text-slate-600">
                            Complete the form below and our team will get back to you
                            with more information.
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
                                    <label htmlFor="country" className={labelClass}>
                                        Country
                                    </label>
                                    <select
                                        id="country"
                                        name="country"
                                        value={country}
                                        onChange={(event) => setCountry(event.target.value)}
                                        required
                                        className={inputClass}
                                    >
                                        <option value="">Select Country</option>
                                        {countries.map((item) => (
                                            <option key={item} value={item}>
                                                {item}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="city" className={labelClass}>
                                        City
                                    </label>
                                    <select
                                        id="city"
                                        name="city"
                                        disabled={!country}
                                        required
                                        className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
                                    >
                                        <option value="">
                                            {country ? 'Select City' : 'Select Country First'}
                                        </option>
                                        {cities.map((city) => (
                                            <option key={city} value={city}>
                                                {city}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="address" className={labelClass}>
                                        Address
                                    </label>
                                    <input
                                        id="address"
                                        name="address"
                                        type="text"
                                        placeholder="Address"
                                        required
                                        className={inputClass}
                                    />
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
                                    <label htmlFor="mainIndustry" className={labelClass}>
                                        Main Industry
                                    </label>
                                    <input
                                        id="mainIndustry"
                                        name="mainIndustry"
                                        type="text"
                                        placeholder="Main Industry"
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
                                    rows={6}
                                    placeholder="Tell us about your business and opportunity..."
                                    required
                                    className={`${inputClass} resize-y`}
                                />
                            </div>

                            <div className="flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-slate-500">
                                    Our team will review your request and contact you.
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
                                    Your request has been submitted successfully.
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </section>
        </main>
    );
}
