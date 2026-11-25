import { countryCodes, sanitizeCountryCode, sanitizeNationalPhoneInput } from "../../../utils/phoneInput.js";
import ApiFieldError from '../../../components/common/ApiFieldError';
import { extractApiErrorMessage, extractApiFieldErrors } from '../../../utils/errorUtils.js';
import SharedCmsPageHero from "../../../components/common/SharedCmsPageHero";
import { useState } from 'react';
import quoteRequestsService from '../../../services/quoteRequestsService';

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
    'mt-2 w-full rounded-none border border-brand-primary-hover bg-brand-surface px-4 py-3 text-sm text-brand-text outline-none transition placeholder:text-brand-muted focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/15';

const labelClass = 'text-sm font-medium text-brand-text';

const optionClass =
    'relative flex min-h-12 cursor-pointer items-center justify-center border border-brand-primary-hover bg-brand-surface px-4 py-3 text-center text-sm font-semibold text-brand-text transition hover:border-brand-accent hover:bg-brand-bg hover:text-brand-accent';

export default function GetAQuote() {
    const [countryCode, setCountryCode] = useState('');
    const [interests, setInterests] = useState([]);
    const [transport, setTransport] = useState([]);
    const [shipments, setShipments] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [submissionError, setSubmissionError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});

    const handleSubmit = async (event) => {
        event.preventDefault();

        const form = event.currentTarget;
        const formData = new FormData(form);

        setSubmitted(false);
        setSubmissionError('');
        setFieldErrors({});

        const interestType =
            interests.includes('Import') && interests.includes('Export')
                ? 3
                : interests.includes('Import')
                    ? 1
                    : interests.includes('Export')
                        ? 2
                        : 0;

        const transportModeMap = {
            Air: 1,
            Land: 2,
            Sea: 3,
        };

        const annualShipmentsMap = {
            '0-10': 1,
            '10-100': 2,
            '100+': 3,
        };

        const data = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            company: formData.get('company'),
            country: formData.get('country'),
            countryCode: formData.get('countryCode'),
            phone: formData.get('cellPhone'),
            email: formData.get('email'),
            message: formData.get('message'),

            interestType,

            transportModes: transport.map(
                (mode) => transportModeMap[mode]
            ),

            annualShipments:
                annualShipmentsMap[shipments] || 0,
        };

        try {
            await quoteRequestsService.create(data);

            setSubmitted(true);

            form.reset();
            setCountryCode('');
            setInterests([]);
            setTransport([]);
            setShipments('');
        } catch (error) {
            console.error(
                'Failed to submit quote request:',
                error
            );

            console.error(
                'Backend error:',
                error.response?.data
            );

            setSubmitted(false);
            setFieldErrors(extractApiFieldErrors(error));
            setSubmissionError(extractApiErrorMessage(error, 'Failed to submit your quote request.'));
        }
    };

    const toggleInterest = (item) => {
        setInterests((current) =>
            current.includes(item)
                ? current.filter((value) => value !== item)
                : [...current, item]
        );
    };

    return (
        <main className="bg-brand-surface">
            {/* Shared public website hero */}
            <SharedCmsPageHero label="Contact ILS" title="Get A Quote">
                <p>Fill in the form and our experts will contact you.</p>
            </SharedCmsPageHero>

            {/* ==================== Quote Form ==================== */}
            <section className="bg-brand-bg py-14 sm:py-20">
                <div className="mx-auto max-w-5xl px-6 lg:px-8">
                    <div className="mb-10 max-w-2xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent">
                            Quote Request
                        </p>

                        <h2 className="mt-3 text-xl font-semibold tracking-tight text-brand-text sm:text-2xl">
                            Tell us about your shipment
                        </h2>

                        <p className="mt-4 text-base leading-7 text-brand-muted">
                            Share your requirements and our logistics team will get in
                            touch with you.
                        </p>
                    </div>

                    <div className="rounded-none border border-brand-primary-hover bg-brand-surface p-4 shadow-sm sm:p-9">
                        <form onSubmit={handleSubmit} onChange={(event) => {
                            const name = event.target.name?.toLowerCase();
                            const field = name === "cellphone" ? "phone" : name;
                            if (field) setFieldErrors(current => { const next = { ...current }; delete next[field]; return next; });
                        }} className="space-y-6">
                            <div className="grid gap-5 sm:grid-cols-2">
                                <div>
                                    <label
                                        htmlFor="firstName"
                                        className={labelClass}
                                    >
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
                                    <label
                                        htmlFor="lastName"
                                        className={labelClass}
                                    >
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
                                    <label
                                        htmlFor="company"
                                        className={labelClass}
                                    >
                                        Company
                                    </label>

                                    <input
                                        id="company"
                                        name="company" aria-invalid={Boolean(fieldErrors["company"]?.length)}
                                        type="text"
                                        placeholder="Company"
                                        required
                                        className={inputClass}
                                    />
                                    <ApiFieldError errors={fieldErrors} field="company" />
                                </div>

                                <div>
                                    <label
                                        htmlFor="country"
                                        className={labelClass}
                                    >
                                        Country
                                    </label>

                                    <select
                                        id="country"
                                        name="country" aria-invalid={Boolean(fieldErrors["country"]?.length)}
                                        defaultValue=""
                                        onChange={(event) => setCountryCode(countryCodes[event.target.value] ?? '')}
                                        required
                                        className={inputClass}
                                    >
                                        <option value="" disabled>
                                            Select Country
                                        </option>

                                        {countries.map((country) => (
                                            <option
                                                key={country}
                                                value={country}
                                            >
                                                {country}
                                            </option>
                                        ))}
                                    </select>
                                    <ApiFieldError errors={fieldErrors} field="country" />
                                </div>

                                <div>
                                    <label
                                        htmlFor="cellPhone"
                                        className={labelClass}
                                    >
                                        Cell Phone
                                    </label>

                                    <div className="mt-2 flex gap-3">
                                        <input
                                            name="countryCode" required pattern="[+]?[1-9][0-9]{0,2}" inputMode="tel" aria-invalid={Boolean(fieldErrors["countrycode"]?.length)}
                                            type="text"
                                            placeholder="+20"
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
                                            name="cellPhone" aria-invalid={Boolean(fieldErrors["phone"]?.length)}
                                            type="tel"
                                            placeholder="Cell Phone"
                                            required
                                            className="min-w-0 flex-1 rounded-none border border-brand-primary-hover bg-brand-surface px-4 py-3 text-sm text-brand-text outline-none transition placeholder:text-brand-muted focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/15"
                                        />
                                    </div>
                                    <div className="mt-1 min-w-0 break-words">
                                        <ApiFieldError errors={fieldErrors} field="countryCode" />
                                        <ApiFieldError errors={fieldErrors} field="phone" />
                                    </div>
                                </div>

                                <div>
                                    <label
                                        htmlFor="email"
                                        className={labelClass}
                                    >
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
                            </div>

                            <div>
                                <label
                                    htmlFor="message"
                                    className={labelClass}
                                >
                                    Message
                                </label>

                                <textarea
                                    id="message"
                                    name="message" aria-invalid={Boolean(fieldErrors["message"]?.length)}
                                    rows={5}
                                    placeholder="Tell us about your requirements..."
                                    className={`${inputClass} resize-y`}
                                />
                                    <ApiFieldError errors={fieldErrors} field="message" />
                            </div>

                            <div className="grid gap-6 lg:grid-cols-2">
                                <div>
                                    <div className="flex items-end justify-between gap-4">
                                        <p className={labelClass}>
                                            What are you interested in?
                                        </p>

                                        <span className="text-xs text-brand-muted">
                                            Select all that apply
                                        </span>
                                    </div>

                                    <div className="mt-2 grid grid-cols-3">
                                        {['Import', 'Export', 'Both'].map(
                                            (item, index) => {
                                                const isSelected =
                                                    item === 'Both'
                                                        ? interests.includes(
                                                            'Import'
                                                        ) &&
                                                        interests.includes(
                                                            'Export'
                                                        )
                                                        : interests.includes(
                                                            item
                                                        );

                                                return (
                                                    <button
                                                        key={item}
                                                        type="button"
                                                        onClick={() => {
                                                            if (
                                                                item === 'Both'
                                                            ) {
                                                                setInterests(
                                                                    isSelected
                                                                        ? []
                                                                        : [
                                                                            'Import',
                                                                            'Export',
                                                                        ]
                                                                );
                                                                return;
                                                            }

                                                            toggleInterest(item);
                                                        }}
                                                        className={`${optionClass} ${index === 0
                                                                ? 'rounded-l-xl'
                                                                : ''
                                                            } ${index === 2
                                                                ? 'rounded-r-xl'
                                                                : ''
                                                            } ${isSelected
                                                                ? 'z-10 border-brand-accent bg-brand-bg text-brand-accent shadow-sm'
                                                                : ''
                                                            }`}
                                                    >
                                                        {isSelected && (
                                                            <span className="absolute left-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand-accent text-[11px] font-bold text-brand-surface">
                                                                ✓
                                                            </span>
                                                        )}

                                                        {item}
                                                    </button>
                                                );
                                            }
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <p className={labelClass}>
                                        What is your preferred mode of transport?
                                    </p>

                                    <div className="mt-2 grid grid-cols-3">
                                        {['Air', 'Land', 'Sea'].map((item) => {
                                            const isSelected =
                                                transport.includes(item);

                                            return (
                                                <button
                                                    key={item}
                                                    type="button"
                                                    onClick={() =>
                                                        setTransport((current) =>
                                                            current.includes(
                                                                item
                                                            )
                                                                ? current.filter(
                                                                    (value) =>
                                                                        value !==
                                                                        item
                                                                )
                                                                : [
                                                                    ...current,
                                                                    item,
                                                                ]
                                                        )
                                                    }
                                                    className={`${optionClass} ${item === 'Air'
                                                            ? 'rounded-l-xl'
                                                            : ''
                                                        } ${item === 'Sea'
                                                            ? 'rounded-r-xl'
                                                            : ''
                                                        } ${isSelected
                                                            ? 'z-10 border-brand-accent bg-brand-bg text-brand-accent shadow-sm'
                                                            : ''
                                                        }`}
                                                >
                                                    {isSelected && (
                                                        <span className="absolute left-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand-accent text-[11px] font-bold text-brand-surface">
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
                                    {['0-10', '10-100', '100+'].map(
                                        (item, index) => {
                                            const isSelected =
                                                shipments === item;

                                            return (
                                                <button
                                                    key={item}
                                                    type="button"
                                                    onClick={() =>
                                                        setShipments(item)
                                                    }
                                                    className={`${optionClass} ${index === 0
                                                            ? 'rounded-l-xl'
                                                            : ''
                                                        } ${index === 2
                                                            ? 'rounded-r-xl'
                                                            : ''
                                                        } ${isSelected
                                                            ? 'z-10 border-brand-accent bg-brand-bg text-brand-accent shadow-sm'
                                                            : ''
                                                        }`}
                                                >
                                                    {isSelected && (
                                                        <span className="absolute left-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand-accent text-[11px] font-bold text-brand-surface">
                                                            ✓
                                                        </span>
                                                    )}

                                                    {item}
                                                </button>
                                            );
                                        }
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 border-t border-brand-surface pt-6 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-brand-muted">
                                    Our experts will review your requirements and contact you.
                                </p>

                                <button
                                    type="submit"
                                    className="inline-flex items-center justify-center rounded-none bg-brand-accent px-7 py-3.5 text-sm font-semibold text-brand-surface shadow-lg shadow-sky-950/10 transition hover:bg-brand-accent focus:outline-none focus:ring-4 focus:ring-brand-bg"
                                >
                                    Submit
                                </button>
                            </div>

                            {submissionError && (
                                <div role="alert" className="border border-brand-danger-border bg-brand-danger-soft px-4 py-3 text-sm text-brand-danger">
                                    {submissionError}
                                </div>
                            )}
                            {submitted && (
                                <div className="rounded-none border border-brand-accent bg-brand-bg px-4 py-3 text-sm font-medium text-brand-accent">
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