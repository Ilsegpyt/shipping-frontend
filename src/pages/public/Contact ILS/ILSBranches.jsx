import { useState } from 'react';

const branches = [
    {
        id: 'head-office',
        name: 'Head Quarter Office',
        address:
            'ILS | (Egypt) Ltd. | Plot No. 5, Square 1258W, Behind Sun City Mall – Al Nozha – Sheraton - Heliopolis - Cairo, Egypt',
        managers: [
            { role: 'CEO', name: 'Mr. Ahmed Shalaby', email: 'ahmed.shalaby@ilsegypt.com' },
            { role: 'GM', name: 'Mr. Karim Raafat', email: 'karim.raafat@ilsegypt.com' },
        ],
        mapQuery:
            'ILS Egypt Plot No. 5 Square 1258W Behind Sun City Mall Al Nozha Sheraton Heliopolis Cairo Egypt',
    },
    {
        id: 'cairo-airport',
        name: 'Cairo Airport Office',
        address:
            'ILS | (Egypt) Ltd.| Cairo Airport, Office 224, CACC Lufthansa old building, opposite to Smash Club',
        managers: [
            {
                role: 'Branch Manager',
                name: 'Mr. Ahmed Raafat',
                email: 'ahmed.raafat@ilsegypt.com',
            },
        ],
        mapQuery:
            'ILS Cairo Airport Office 224 CACC Lufthansa old building',
    },
    {
        id: 'alexandria',
        name: 'Alexandria Office',
        address:
            'ILS | (Egypt) Ltd.| Road no.6, Bldg.no.13, from El Moaskar El Romany St. Roushdy, Alexandria, Egypt',
        managers: [
            {
                role: 'Branch Manager',
                name: 'Mr. Mohamed Shalaby',
                email: 'mohamed.shalaby@ilsegypt.com',
            },
        ],
        mapQuery:
            'ILS Egypt Road no.6 Building no.13 El Moaskar El Romany Roushdy Alexandria Egypt',
    },
    {
        id: 'sokhna',
        name: 'Sokhna Office',
        address:
            'ILS | (Egypt) Ltd.| Plot No. 16 A next elwadi village port of Sokhna, Egypt',
        managers: [
            {
                role: 'Branch Manager',
                name: 'Mr. Basem Fadel',
                email: 'Basem.Fadel@ilsegypt.com',
            },
        ],
        mapQuery:
            'ILS Egypt Plot No. 16 A Port of Sokhna Egypt',
    },
    {
        id: 'october-dry-port',
        name: '6th Oct ODP dry port Office',
        address:
            'ILS | (Egypt) Ltd.| October Dry Port 6th of October City – Wahat Road- Egypt',
        managers: [
            {
                role: 'Managing Partner',
                name: 'Mr. Mohamed Shalaby',
                email: 'Mohamed.Shalaby@ilsegypt.com',
            },
        ],
        mapQuery:
            'ILS October Dry Port 6th of October City Wahat Road Egypt',
    },
    {
        id: 'teda-sokhna',
        name: 'TEDA Office Sokna',
        address:
            '3rd Floor, Office No. 304 TEDA Building, Suez Economic Zone, Ain El Sokhna, Suez Governorate',
        managers: [
            {
                role: 'Business Development Manager',
                name: 'Mr. Mohamed Alshabassy',
                email: 'Mohamed.Alshabassy@ilsegypt.com',
            },
        ],
        mapQuery:
            'TEDA Building Office 304 Suez Economic Zone Ain El Sokhna Suez Egypt',
    },
];

export default function ILSBranches() {
    const [selectedBranchId, setSelectedBranchId] = useState(branches[0].id);

    const selectedBranch =
        branches.find((branch) => branch.id === selectedBranchId) ?? branches[0];

    const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(
        selectedBranch.mapQuery
    )}&output=embed`;

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
                        ILS Branches
                    </h1>

                    <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                        Find our offices and contact the team at your nearest ILS branch.
                    </p>
                </div>
            </section>

            {/* ==================== Branches ==================== */}
            <section className="bg-slate-50 py-16 sm:py-20">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="flex gap-3 overflow-x-auto pb-3">
                        {branches.map((branch) => {
                            const isActive = branch.id === selectedBranch.id;

                            return (
                                <button
                                    key={branch.id}
                                    type="button"
                                    onClick={() => setSelectedBranchId(branch.id)}
                                    className={`flex min-h-24 min-w-[190px] shrink-0 items-center justify-center rounded-2xl border px-5 py-4 text-center text-sm font-medium transition ${isActive
                                        ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                                        : 'border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:text-sky-600'
                                        }`}
                                >
                                    {branch.name}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="px-6 py-7 text-center sm:px-8">
                            <h2 className="text-xl font-semibold text-slate-900">
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
                            {selectedBranch.managers.map((manager) => (
                                <div
                                    key={`${manager.role}-${manager.email}`}
                                    className="flex flex-col gap-2 border-b border-slate-100 pb-5 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">
                                            {manager.role} -{' '}
                                            <span className="font-normal">
                                                {manager.name}
                                            </span>
                                        </p>
                                    </div>

                                    <a
                                        href={`mailto:${manager.email}`}
                                        className="text-sm font-medium text-sky-600 transition hover:text-sky-500"
                                    >
                                        {manager.email}
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
