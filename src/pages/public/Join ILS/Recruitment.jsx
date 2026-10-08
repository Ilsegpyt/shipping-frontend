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

const inputClass =
    'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100';

const labelClass = 'text-sm font-medium text-slate-700';

export default function Recruitment() {
    const [submitted, setSubmitted] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();

        const form = event.currentTarget;
        const formData = new FormData(form);

        setErrorMessage('');
        setSubmitted(false);

        try {
            await recruitmentApplicationsService.create(formData);

            setSubmitted(true);
            form.reset();
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
                            Recruitment
                        </h1>

                        <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                            Welcome to our team. Explore opportunities and take the next
                            step in your career with ILS.
                        </p>
                    </div>
                </div>
            </section>

            {/* ==================== Application Form ==================== */}
            <section className="bg-slate-50 py-20 sm:py-24">
                <div className="mx-auto max-w-5xl px-6 lg:px-8">
                    <div className="mb-10 max-w-2xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                            Careers
                        </p>

                        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                            Join our team
                        </h2>

                        <p className="mt-4 text-base leading-7 text-slate-600">
                            Select the department you are interested in and upload your
                            CV. You can also leave us a message with any additional
                            information about your application.
                        </p>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
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
                                    className="mt-2 block w-full cursor-pointer rounded-xl border border-slate-200 bg-white text-sm text-slate-700 file:mr-4 file:border-0 file:bg-slate-100 file:px-4 file:py-3 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                                />
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
                                    Please upload your CV in PDF format.
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
                                    Your application has been submitted successfully.
                                </div>
                            )}

                            {errorMessage && (
                                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
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