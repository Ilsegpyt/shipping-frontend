import { countryCodes, sanitizeCountryCode, sanitizeNationalPhoneInput } from "../../../utils/phoneInput.js";
import ApiFieldError from '../../../components/common/ApiFieldError';
import { extractApiErrorMessage, extractApiFieldErrors } from '../../../utils/errorUtils.js';
import SharedCmsPageHero from "../../../components/common/SharedCmsPageHero";
import React, { useState } from 'react';
import agentApplicationsService from '../../../services/agentApplicationsService';

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
    'mt-2 w-full rounded-none border border-brand-primary-hover bg-brand-surface px-4 py-3 text-sm text-brand-text outline-none transition placeholder:text-brand-muted focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/15';

const labelClass = 'text-sm font-medium text-brand-text';

export default function AgentOpportunity() {
    const [country, setCountry] = useState('');
    const [countryCode, setCountryCode] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [phoneError, setPhoneError] = useState('');
    const [submissionError, setSubmissionError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});

    const cities = country ? citiesByCountry[country] ?? ['Other'] : [];

    const handleSubmit = async (event) => {
        event.preventDefault();

        const form = event.currentTarget;
        setSubmissionError('');
        setFieldErrors({});
        const formData = new FormData(form);

        const data = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            country: formData.get('country'),
            city: formData.get('city'),
            address: formData.get('address'),
            email: formData.get('email'),
            countryCode: formData.get('countryCode'),
            phone: formData.get('cellPhone'),
            mainIndustry: formData.get('mainIndustry'),
            message: formData.get('message'),
        };

        try {
            await agentApplicationsService.create(data);

            setSubmitted(true);

            form.reset();
            setCountry('');
            setCountryCode('');
        } catch (error) {
            console.error(
                'Failed to submit agent application:',
                error
            );

            setSubmitted(false);
            setFieldErrors(extractApiFieldErrors(error));
            setSubmissionError(extractApiErrorMessage(error, 'Your request could not be submitted. Please check your information and try again.'));
        }
    };

    return (
        <main className="bg-brand-surface">
            {/* Shared public website hero */}
            <SharedCmsPageHero label="Join ILS" title="Become an Agent">
                <p>Join our global network of agents and explore new business opportunities with ILS.</p>
            </SharedCmsPageHero>

            {/* ==================== Form ==================== */}
            <section className="bg-brand-bg py-14 sm:py-20">
                <div className="mx-auto max-w-5xl px-6 lg:px-8">
                    <div className="mb-10 max-w-2xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent">
                            Agent Opportunity
                        </p>

                        <h2 className="mt-3 text-xl font-semibold tracking-tight text-brand-text sm:text-2xl">
                            Tell us about your business
                        </h2>

                        <p className="mt-4 text-base leading-7 text-brand-muted">
                            Complete the form below and our team will get back to you
                            with more information.
                        </p>
                    </div>

                    <div className="rounded-none border border-brand-primary-hover bg-brand-surface p-3 shadow-sm sm:p-9">
                        <form onSubmit={handleSubmit} onChange={(event) => {
                            const name = event.target.name?.toLowerCase();
                            const field = name === "cellphone" ? "phone" : name;
                            if (field) setFieldErrors(current => { const next = { ...current }; delete next[field]; return next; });
                        }} className="space-y-6">
                            <div className="grid gap-5 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="firstName" className={labelClass}>
                                        First Name
                                    </label>
                                    <input
                                        id="firstName"
                                        name="firstName" aria-invalid={Boolean(fieldErrors["firstname"]?.length)}
                                        type="text"
                                        placeholder="First Name"
                                        required
                                        className={inputClass}
                                    />
                                    <ApiFieldError errors={fieldErrors} field="firstName" />
                                </div>

                                <div>
                                    <label htmlFor="lastName" className={labelClass}>
                                        Last Name
                                    </label>
                                    <input
                                        id="lastName"
                                        name="lastName" aria-invalid={Boolean(fieldErrors["lastname"]?.length)}
                                        type="text"
                                        placeholder="Last Name"
                                        required
                                        className={inputClass}
                                    />
                                    <ApiFieldError errors={fieldErrors} field="lastName" />
                                </div>

                                <div>
                                    <label htmlFor="country" className={labelClass}>
                                        Country
                                    </label>
                                    <select
                                        id="country"
                                        name="country" aria-invalid={Boolean(fieldErrors["country"]?.length)}
                                        value={country}
                                        onChange={(event) => {
                                            const selectedCountry = event.target.value;
                                            setCountry(selectedCountry);
                                            setCountryCode(countryCodes[selectedCountry] ?? '');
                                        }}
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
                                    <ApiFieldError errors={fieldErrors} field="country" />
                                </div>

                                <div>
                                    <label htmlFor="city" className={labelClass}>
                                        City
                                    </label>
                                    <select
                                        id="city"
                                        name="city" aria-invalid={Boolean(fieldErrors["city"]?.length)}
                                        disabled={!country}
                                        required
                                        className={`${inputClass} disabled:cursor-not-allowed disabled:bg-brand-surface disabled:text-brand-muted`}
                                    >
                                        <option value="">
                                            {country
                                                ? 'Select City'
                                                : 'Select Country First'}
                                        </option>

                                        {cities.map((city) => (
                                            <option key={city} value={city}>
                                                {city}
                                            </option>
                                        ))}
                                    </select>
                                    <ApiFieldError errors={fieldErrors} field="city" />
                                </div>

                                <div>
                                    <label htmlFor="address" className={labelClass}>
                                        Address
                                    </label>
                                    <input
                                        id="address"
                                        name="address" aria-invalid={Boolean(fieldErrors["address"]?.length)}
                                        type="text"
                                        placeholder="Address"
                                        required
                                        className={inputClass}
                                    />
                                    <ApiFieldError errors={fieldErrors} field="address" />
                                </div>

                                <div>
                                    <label htmlFor="email" className={labelClass}>
                                        Email
                                    </label>
                                    <input
                                        id="email"
                                        name="email" aria-invalid={Boolean(fieldErrors["email"]?.length)}
                                        type="email"
                                        placeholder="you@company.com"
                                        required
                                        className={inputClass}
                                    />
                                    <ApiFieldError errors={fieldErrors} field="email" />
                                </div>

                                <div>
                                    <label htmlFor="cellPhone" className={labelClass}>
                                        Cell Phone
                                    </label>

                                    <div className="mt-2 flex gap-3">
                                        <input
                                            name="countryCode" required pattern="[+]?[1-9][0-9]{0,2}" inputMode="tel" aria-invalid={Boolean(fieldErrors["countrycode"]?.length)}
                                            type="text"
                                            value={countryCode}
                                            onChange={(event) => setCountryCode(sanitizeCountryCode(event.target.value))}
                                            autoComplete="tel-country-code"
                                            aria-label="Country code"
                                            className="w-24 rounded-none border border-brand-primary-hover bg-brand-surface px-4 py-3 text-sm text-brand-text outline-none transition placeholder:text-brand-muted focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/15"
                                        />

                                        <input
                                            onInput={sanitizeNationalPhoneInput}
                                            inputMode="numeric" pattern="[0-9]+"
                                            id="cellPhone"
                                            name="cellPhone" aria-invalid={Boolean(fieldErrors["phone"]?.length || phoneError)}
                                            type="tel"
                                            placeholder="Cell Phone"
                                            autoComplete="tel-national"
                                            required
                                            
                                            aria-describedby={phoneError ? 'cellPhone-error' : undefined}
                                            onInvalid={() => setPhoneError('Please enter your cell phone number.')}
                                            onChange={() => setPhoneError('')}
                                            className="min-w-0 flex-1 rounded-none border border-brand-primary-hover bg-brand-surface px-4 py-3 text-sm text-brand-text outline-none transition placeholder:text-brand-muted focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/15"
                                        />
                                    </div>
                                    <div className="mt-1 min-w-0 break-words">
                                        <ApiFieldError errors={fieldErrors} field="countryCode" />
                                        <ApiFieldError errors={fieldErrors} field="phone" />
                                    </div>
                                    {phoneError && (
                                        <p id="cellPhone-error" role="alert" className="mt-2 text-sm text-red-600">
                                            {phoneError}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="mainIndustry" className={labelClass}>
                                        Main Industry
                                    </label>
                                    <input
                                        id="mainIndustry"
                                        name="mainIndustry" aria-invalid={Boolean(fieldErrors["mainindustry"]?.length)}
                                        type="text"
                                        placeholder="Main Industry"
                                        required
                                        className={inputClass}
                                    />
                                    <ApiFieldError errors={fieldErrors} field="mainIndustry" />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="message" className={labelClass}>
                                    Message
                                </label>

                                <textarea
                                    id="message"
                                    name="message" aria-invalid={Boolean(fieldErrors["message"]?.length)}
                                    rows={6}
                                    placeholder="Tell us about your business and opportunity..."
                                    required
                                    className={`${inputClass} resize-y`}
                                />
                                    <ApiFieldError errors={fieldErrors} field="message" />
                            </div>

                            <div className="flex flex-col gap-4 border-t border-brand-surface pt-6 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-brand-muted">
                                    Our team will review your request and contact you.
                                </p>

                                <button
                                    type="submit"
                                    className="inline-flex items-center justify-center rounded-none bg-brand-primary px-7 py-3.5 text-sm font-semibold text-brand-surface shadow-lg shadow-sky-950/10 transition hover:bg-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/20"
                                >
                                    Submit
                                </button>
                            </div>

                            {submissionError && (
                                <div role="alert" className="rounded-none border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                    {submissionError}
                                </div>
                            )}

                            {submitted && (
                                <div className="rounded-none border border-brand-accent bg-brand-bg px-4 py-3 text-sm font-medium text-brand-accent">
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