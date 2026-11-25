import ApiFieldError from '../../../components/common/ApiFieldError';
import { extractApiErrorMessage, extractApiFieldErrors } from '../../../utils/errorUtils.js';
import SharedCmsPageHero from "../../../components/common/SharedCmsPageHero";
import React, { useState } from 'react';
import recruitmentApplicationsService from '../../../services/recruitmentApplicationsService';

const departments = [
    'Sales',
    'Operations',
    'Finance',
    'Customer Service',
    'IT',
    'Human Resources',
    'Other',
];

const MAX_CV_SIZE = 5 * 1024 * 1024; // 5 MB

const inputClass =
    'mt-2 w-full rounded-none border border-brand-primary-hover bg-brand-surface px-4 py-3 text-sm text-brand-text outline-none transition placeholder:text-brand-muted focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/15';

const labelClass = 'text-sm font-medium text-brand-text';

export default function Recruitment() {
    const [submitted, setSubmitted] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [cvError, setCvError] = useState('');

    const handleCvChange = (event) => {
        const file = event.target.files?.[0];

        setCvError('');
        setErrorMessage('');
        setFieldErrors({});
        setSubmitted(false);

        if (file && file.size > MAX_CV_SIZE) {
            setCvError('CV file size must not exceed 5 MB.');
            event.target.value = '';
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const form = event.currentTarget;
        const cvInput = form.elements.namedItem('cv');
        const cvFile = cvInput?.files?.[0];

        setErrorMessage('');
        setFieldErrors({});
        setSubmitted(false);

        if (cvFile && cvFile.size > MAX_CV_SIZE) {
            setCvError('CV file size must not exceed 5 MB.');
            cvInput.focus();
            return;
        }

        setCvError('');

        const formData = new FormData(form);

        try {
            await recruitmentApplicationsService.create(formData);

            setSubmitted(true);
            form.reset();
            setCvError('');
        } catch (error) {
            console.error(
                'Failed to submit recruitment application:',
                error
            );

            console.error(
                'Backend error:',
                error.response?.data
            );

            setFieldErrors(extractApiFieldErrors(error));
            setErrorMessage(extractApiErrorMessage(error, 'Failed to submit your application.'));
        }
    };

    return (
        <main className="bg-brand-surface">
            {/* Shared public website hero */}
            <SharedCmsPageHero label="Join ILS" title="Recruitment">
                <p>Welcome to our team. Explore opportunities and take the next step in your career with ILS.</p>
            </SharedCmsPageHero>

            {/* ==================== Application Form ==================== */}
            <section className="bg-brand-bg py-14 sm:py-20">
                <div className="mx-auto max-w-5xl px-6 lg:px-8">
                    <div className="mb-10 max-w-2xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent">
                            Careers
                        </p>

                        <h2 className="mt-3 text-xl font-semibold tracking-tight text-brand-text sm:text-2xl">
                            Join our team
                        </h2>

                        <p className="mt-4 text-base leading-7 text-brand-muted">
                            Select the department you are interested in and upload your
                            CV. You can also leave us a message with any additional
                            information about your application.
                        </p>
                    </div>

                    <div className="rounded-none border border-brand-primary-hover bg-brand-surface p-6 shadow-sm sm:p-9">
                        <form onSubmit={handleSubmit} onChange={(event) => {
                            const name = event.target.name?.toLowerCase();
                            const field = name === "cellphone" ? "phone" : name;
                            if (field) setFieldErrors(current => { const next = { ...current }; delete next[field]; return next; });
                        }} className="space-y-6">
                            <div>
                                <label htmlFor="department" className={labelClass}>
                                    Department
                                </label>

                                <select
                                    id="department"
                                    name="department" aria-invalid={Boolean(fieldErrors["department"]?.length)}
                                    required
                                    defaultValue=""
                                    className={inputClass}
                                >
                                    <option value="" disabled>
                                        Select Department
                                    </option>

                                    {departments.map((department) => (
                                        <option key={department} value={department}>
                                            {department}
                                        </option>
                                    ))}
                                </select>
                                    <ApiFieldError errors={fieldErrors} field="department" />
                            </div>

                            <div>
                                <label htmlFor="cv" className={labelClass}>
                                    Upload CV (PDF only)
                                </label>

                                <input
                                    id="cv"
                                    name="cv" aria-invalid={Boolean(fieldErrors["cv"]?.length)}
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    required
                                    onChange={handleCvChange}
                                    aria-invalid={Boolean(cvError)}
                                    aria-describedby={cvError ? 'cv-error' : undefined}
                                    className="mt-2 block w-full cursor-pointer rounded-none border border-brand-primary-hover bg-brand-surface text-sm text-brand-text file:mr-4 file:border-0 file:bg-brand-surface file:px-4 file:py-3 file:text-sm file:font-medium file:text-brand-text hover:file:bg-brand-border"
                                />
                                    <ApiFieldError errors={fieldErrors} field="cv" />

                                {cvError && (
                                    <p
                                        id="cv-error"
                                        role="alert"
                                        className="mt-2 text-sm text-red-600"
                                    >
                                        {cvError}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="message" className={labelClass}>
                                    Message
                                </label>

                                <textarea
                                    id="message"
                                    name="message" aria-invalid={Boolean(fieldErrors["message"]?.length)}
                                    rows={6}
                                    placeholder="Tell us anything you'd like us to know about your application..."
                                    className={`${inputClass} resize-y`}
                                />
                                    <ApiFieldError errors={fieldErrors} field="message" />
                            </div>

                            <div className="flex flex-col gap-4 border-t border-brand-surface pt-6 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-brand-muted">
                                    Please upload your CV in PDF format (maximum 5 MB).
                                </p>

                                <button
                                    type="submit"
                                    className="inline-flex items-center justify-center rounded-none bg-brand-primary px-7 py-3.5 text-sm font-semibold text-brand-surface shadow-lg shadow-sky-950/10 transition hover:bg-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/20"
                                >
                                    Submit
                                </button>
                            </div>

                            {submitted && (
                                <div className="rounded-none border border-brand-accent bg-brand-bg px-4 py-3 text-sm font-medium text-brand-accent">
                                    Your application has been submitted successfully.
                                </div>
                            )}

                            {errorMessage && (
                                <div className="rounded-none border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                    {errorMessage}
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </section>
        </main>
    );
}
