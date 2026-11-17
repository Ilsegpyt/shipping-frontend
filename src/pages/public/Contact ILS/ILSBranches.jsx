import SharedCmsPageHero from "../../../components/common/SharedCmsPageHero";
import { useEffect, useState } from 'react';
import branchesService from '../../../services/branchesService';

export default function ILSBranches() {
    const [branches, setBranches] = useState([]);
    const [selectedBranchId, setSelectedBranchId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadBranches = async () => {
            try {
                setLoading(true);
                setError('');

                const data = await branchesService.getAll();

                setBranches(data);

                if (data.length > 0) {
                    setSelectedBranchId(data[0].id);
                }
            } catch (error) {
                console.error('Failed to load branches:', error);

                setError(
                    error.response?.data?.message ||
                    error.response?.data?.error ||
                    'Failed to load branches.'
                );
            } finally {
                setLoading(false);
            }
        };

        loadBranches();
    }, []);

    const selectedBranch =
        branches.find(
            (branch) => branch.id === selectedBranchId
        ) ?? branches[0];

    const mapUrl = selectedBranch
        ? `https://www.google.com/maps?q=${selectedBranch.latitude},${selectedBranch.longitude}&z=15&output=embed`
        : '';

    return (
        <main className="bg-white">
            {/* Shared public website hero */}
            <SharedCmsPageHero label="Contact ILS" title="ILS Branches">
                <p>Find our offices and contact the team at your nearest ILS branch.</p>
            </SharedCmsPageHero>

            {/* ==================== Branches ==================== */}
            <section className="bg-[#f6fafc] py-14 sm:py-20">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    {loading && (
                        <div className="rounded-none border border-[#dce9f2] bg-white p-8 text-center text-sm text-slate-600">
                            Loading branches...
                        </div>
                    )}

                    {!loading && error && (
                        <div className="rounded-none border border-red-200 bg-red-50 p-8 text-center text-sm font-medium text-red-700">
                            {error}
                        </div>
                    )}

                    {!loading && !error && branches.length === 0 && (
                        <div className="rounded-none border border-[#dce9f2] bg-white p-8 text-center text-sm text-slate-600">
                            No branches available.
                        </div>
                    )}

                    {!loading && !error && branches.length > 0 && (
                        <>
                            <div className="flex gap-3 overflow-x-auto pb-3">
                                {branches.map((branch) => {
                                    const isActive =
                                        branch.id === selectedBranch.id;

                                    return (
                                        <button
                                            key={branch.id}
                                            type="button"
                                            onClick={() =>
                                                setSelectedBranchId(
                                                    branch.id
                                                )
                                            }
                                            className={`flex min-h-14 min-w-[120px] shrink-0 items-center justify-center rounded-none border px-3 py-2 text-center text-xs font-medium transition sm:min-h-16 sm:min-w-[145px] sm:px-4 sm:py-3 sm:text-sm lg:min-h-24 lg:min-w-[190px] lg:px-5 lg:py-4 ${isActive
                                                    ? 'border-[#1E3672] bg-[#1E3672] text-white shadow-lg shadow-slate-900/10'
                                                    : 'border-[#dce9f2] bg-white text-slate-700 hover:border-sky-200 hover:text-sky-600'
                                                }`}
                                        >
                                            {branch.name}
                                        </button>
                                    );
                                })}
                            </div>

                            {selectedBranch && (
                                <div className="mt-8 overflow-hidden rounded-none border border-[#dce9f2] bg-white shadow-sm">
                                    <div className="px-6 py-7 text-center sm:px-8">
                                        <h2 className="text-base font-semibold text-slate-900">
                                            {selectedBranch.name}
                                        </h2>

                                        <p className="mx-auto mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                                            {selectedBranch.address}
                                        </p>
                                    </div>

                                    <div className="border-y border-slate-200 bg-slate-100">
                                        <iframe
                                            title={`${selectedBranch.name} map`}
                                            src={mapUrl}
                                            className="h-[360px] w-full border-0 sm:h-[420px]"
                                            loading="lazy"
                                            referrerPolicy="no-referrer-when-downgrade"
                                        />
                                    </div>

                                    <div className="grid gap-5 p-6 sm:p-8">
                                        {selectedBranch.ceoName &&
                                            selectedBranch.ceoEmail && (
                                                <div className="flex flex-col gap-2 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-900">
                                                            CEO -{' '}
                                                            <span className="font-normal">
                                                                {
                                                                    selectedBranch.ceoName
                                                                }
                                                            </span>
                                                        </p>
                                                    </div>

                                                    <a
                                                        href={`mailto:${selectedBranch.ceoEmail}`}
                                                        className="text-sm font-medium text-sky-600 transition hover:text-sky-500"
                                                    >
                                                        {
                                                            selectedBranch.ceoEmail
                                                        }
                                                    </a>
                                                </div>
                                            )}

                                        {selectedBranch.gmName &&
                                            selectedBranch.gmEmail && (
                                                <div className="flex flex-col gap-2 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-900">
                                                            GM -{' '}
                                                            <span className="font-normal">
                                                                {
                                                                    selectedBranch.gmName
                                                                }
                                                            </span>
                                                        </p>
                                                    </div>

                                                    <a
                                                        href={`mailto:${selectedBranch.gmEmail}`}
                                                        className="text-sm font-medium text-sky-600 transition hover:text-sky-500"
                                                    >
                                                        {
                                                            selectedBranch.gmEmail
                                                        }
                                                    </a>
                                                </div>
                                            )}

                                        {selectedBranch.branchManagerName &&
                                            selectedBranch.branchManagerEmail && (
                                                <div className="flex flex-col gap-2 border-b border-slate-100 pb-5 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-900">
                                                            Branch Manager -{' '}
                                                            <span className="font-normal">
                                                                {
                                                                    selectedBranch.branchManagerName
                                                                }
                                                            </span>
                                                        </p>
                                                    </div>

                                                    <a
                                                        href={`mailto:${selectedBranch.branchManagerEmail}`}
                                                        className="text-sm font-medium text-sky-600 transition hover:text-sky-500"
                                                    >
                                                        {
                                                            selectedBranch.branchManagerEmail
                                                        }
                                                    </a>
                                                </div>
                                            )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>
        </main>
    );
}