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
    'mt-2 w-full rounded-none border border-[#dce9f2] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#3097BF] focus:ring-2 focus:ring-[#3097BF]/15';

const labelClass = 'text-sm font-medium text-slate-700';

export default function Recruitment() {
    const [submitted, setSubmitted] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [cvError, setCvError] = useState('');

    const handleCvChange = (event) => {
        const file = event.target.files?.[0];

        setCvError('');
        setErrorMessage('');
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

            setErrorMessage(
                typeof error.response?.data === 'string'
                    ? error.response.data
                    : error.response?.data?.message ||
                    error.response?.data?.error ||
                    'Failed to submit your application.'
            );
        }
    };

    return (
        <main className="bg-white">
            {/* Shared public website hero */}
            <SharedCmsPageHero label="Join ILS" title="Recruitment">
                <p>Welcome to our team. Explore opportunities and take the next step in your career with ILS.</p>
            </SharedCmsPageHero>

            {/* ==================== Application Form ==================== */}
            <section className="bg-[#f6fafc] py-14 sm:py-20">
                <div className="mx-auto max-w-5xl px-6 lg:px-8">
                    <div className="mb-10 max-w-2xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                            Careers
                        </p>

                        <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                            Join our team
                        </h2>

                        <p className="mt-4 text-base leading-7 text-slate-600">
                            Select the department you are interested in and upload your
                            CV. You can also leave us a message with any additional
                            information about your application.
                        </p>
                    </div>

                    <div className="rounded-none border border-[#dce9f2] bg-white p-6 shadow-sm sm:p-9">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="department" className={labelClass}>
                                    Department
                                </label>

                                <select
                                    id="department"
                                    name="department"
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
                            </div>

                            <div>
                                <label htmlFor="cv" className={labelClass}>
                                    Upload CV (PDF only)
                                </label>

                                <input
                                    id="cv"
                                    name="cv"
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    required
                                    onChange={handleCvChange}
                                    aria-invalid={Boolean(cvError)}
                                    aria-describedby={cvError ? 'cv-error' : undefined}
                                    className="mt-2 block w-full cursor-pointer rounded-none border border-[#dce9f2] bg-white text-sm text-slate-700 file:mr-4 file:border-0 file:bg-slate-100 file:px-4 file:py-3 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                                />

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
                                    name="message"
                                    rows={6}
                                    placeholder="Tell us anything you'd like us to know about your application..."
                                    className={`${inputClass} resize-y`}
                                />
                            </div>

                            <div className="flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-slate-500">
                                    Please upload your CV in PDF format (maximum 5 MB).
                                </p>

                                <button
                                    type="submit"
                                    className="inline-flex items-center justify-center rounded-none bg-[#1E3672] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-950/10 transition hover:bg-[#3097BF] focus:outline-none focus:ring-2 focus:ring-[#3097BF]/20"
                                >
                                    Submit
                                </button>
                            </div>

                            {submitted && (
                                <div className="rounded-none border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
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
