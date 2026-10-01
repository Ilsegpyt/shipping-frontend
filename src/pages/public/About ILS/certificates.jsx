import { useState } from 'react';

import iata from '../../../assets/images/certificates/iata.webp';
import afbn from '../../../assets/images/certificates/afbn.webp';
import jctrans from '../../../assets/images/certificates/jctrans.webp';
import fiata from '../../../assets/images/certificates/fiata.webp';
import gla from '../../../assets/images/certificates/gla.webp';
import cgli from '../../../assets/images/certificates/cgli.webp';
import eefa from '../../../assets/images/certificates/eefa.webp';
import ecaa7 from '../../../assets/images/certificates/ecaa7.webp';

const certificates = [
    { name: 'IATA', image: iata },
    { name: 'AFBN', image: afbn },
    { name: 'JCTRANS', image: jctrans },
    { name: 'FIATA', image: fiata },
    { name: 'GLA', image: gla },
    { name: 'CGLI', image: cgli },
    { name: 'EEFA', image: eefa },
    { name: 'ECAA7', image: ecaa7 },
];

export default function Certificates() {
    const [selectedCertificate, setSelectedCertificate] = useState(null);

    return (
        <main className="min-h-screen bg-slate-50">
            <section className="bg-slate-950 px-6 pb-20 pt-32 sm:px-8 lg:px-12">
                <div className="mx-auto max-w-7xl">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
                        About ILS
                    </p>

                    <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                        Certificates
                    </h1>

                    <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                        Our memberships and certifications reflect ILS Egypt’s commitment
                        to professional standards and global logistics networks.
                    </p>
                </div>
            </section>

            <section className="px-6 py-16 sm:px-8 sm:py-20 lg:px-12">
                <div className="mx-auto max-w-7xl">
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {certificates.map((certificate) => (
                            <button
                                key={certificate.name}
                                type="button"
                                onClick={() => setSelectedCertificate(certificate)}
                                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:border-sky-300 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-sky-100"
                            >
                                <div className="aspect-[4/3] overflow-hidden bg-white">
                                    <img
                                        src={certificate.image}
                                        alt={`${certificate.name} certificate`}
                                        className="h-full w-full object-contain p-3 transition duration-500 group-hover:scale-[1.02]"
                                    />
                                </div>

                                <div className="border-t border-slate-100 px-5 py-4">
                                    <p className="text-sm font-semibold text-slate-900">
                                        {certificate.name}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {selectedCertificate && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-5 backdrop-blur-sm"
                    onClick={() => setSelectedCertificate(null)}
                >
                    <div
                        className="relative max-h-[90vh] max-w-5xl overflow-hidden rounded-2xl bg-white p-3 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setSelectedCertificate(null)}
                            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-slate-950/80 text-xl text-white transition hover:bg-slate-950"
                            aria-label="Close certificate preview"
                        >
                            ×
                        </button>

                        <img
                            src={selectedCertificate.image}
                            alt={`${selectedCertificate.name} certificate enlarged`}
                            className="max-h-[84vh] max-w-full rounded-xl object-contain"
                        />
                    </div>
                </div>
            )}
        </main>
    );
}
