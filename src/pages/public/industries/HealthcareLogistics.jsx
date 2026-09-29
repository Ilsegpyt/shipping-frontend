import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    ArrowUpRight,
    ChevronDown,
    HeartPulse,
    ShieldCheck,
    Truck,
    Warehouse,
} from 'lucide-react';

import IndustryHeroVisual from '../../../components/public/IndustryHeroVisual';

const sections = [
    {
        title: 'Biopharma',
        icon: HeartPulse,
        text: [
            'Our innovative supply chain and transport solutions support your business to get your products where they need to be.',
            'Our GMP and GDP warehouse and distribution services include FEFO picking, clinical trial management, repacking and display configuration, all controlled by our in-house pharmacists.',
            'Delivery services eliminate costs and inefficiencies, and include next-day delivery, direct-to-hospital department deliveries, 24/7 standby service and recall management – all available in condition-controlled environments.',
            'We work with biologicals, pharmaceutical products (prescription drugs, generics, controlled drugs and over-the-counter (OTC) products), vaccines, active pharmaceutical ingredients (APIs) and clinical trial materials.',
        ],
    },
    {
        title: 'Medical devices and diagnostics',
        icon: ShieldCheck,
        text: [
            'We have been providing tailored supply chain solutions and healthcare logistics services to the medical devices and diagnostics market for more than 20 years.',
            'Our services include orthopaedic loaner kit management, consignment stock management, preparation of procedure-based trolleys, sterile picking, clean rooms, technical repair and rework centres, 24/7 standby service, in-hospital replenishments, white-glove deliveries and spare parts management.',
            'Our broad base of medical device customers comprises all classes of devices (I, IIa, IIb, III).',
        ],
    },
    {
        title: 'Medical products and personal care',
        icon: Truck,
        text: [
            'ILS is experienced in creating lean, flexible supply chain and transport solutions for many different destinations: from pharmacies to retail outlets, as well as direct to patients.',
            'We operate dedicated and multi-user warehouse operations and manage regional distribution centres with ‘control towers’, some of which manage over 1,000 shipments a day.',
            'Our services include packaging and repackaging, labelling and kitting, managing waste, returns and stock levels, restacking based on expiration date, and swapping products.',
        ],
    },
    {
        title: 'Hospitals and care homes',
        icon: Warehouse,
        text: [
            'Our efficient supply chain solutions improve visibility and reduce costs, which helps improve patient care in hospitals, clinics, and nursing homes.',
            'Our services include direct delivery to hospital wards, sterile goods logistics, drug management, operational procurement, laboratory logistics management of medical goods, disposal of hazardous waste, stock reduction programmes, inventory management, warehousing, external and internal distribution, replenishment at ward level and much more.',
        ],
    },
];

const faqs = [
    {
        question: 'Can you deliver my products to diverse locations?',
        answer: 'Yes, we can. Our diverse fleet of distribution vehicles provides flexibility and ensures we can handle ambient, refrigerated, frozen and hazardous goods. Read more about our healthcare transport solutions.',
    },
    {
        question: 'Can you meet my environmental concerns without compromising the quality or efficiency of my healthcare logistics delivery?',
        answer: 'Our services meet global environmental transport objectives, and we adapt modalities to suit changing conditions and circumstances. For example, we can shift from airfreight to sea freight in order to cut carbon emissions and costs.',
    },
    {
        question: 'Does ILS meet my need for dedicated healthcare warehouses?',
        answer: 'Yes. Our specialised healthcare sites are secure and specially equipped for healthcare products. Certain locations also offer condition-controlled environments.',
    },
    {
        question: 'What healthcare logistics support do you offer?',
        answer: 'We support your supply chain by acting as 3PL, 3½PL or 4PL as required. Each specific role offers different models for distribution and supply chain collaboration. Our state-of-the-art freight management system sets the standard for healthcare distribution. We base our distribution solutions on your requirements, taking into account the needs of each of your customers. And we handle the entire process from planning through execution and administration.',
    },
];

function HealthcareLogistics() {
    const [openFaq, setOpenFaq] = useState(0);

    return (
        <main className="min-h-screen bg-white text-slate-900">
            {/* Hero */}
            <section className="relative overflow-hidden bg-slate-950">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(14,165,233,0.22),transparent_35%)]" />
                <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-sky-500/10 to-transparent" />

                <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-32 lg:px-8 lg:pb-32">
                    <Link
                        to="/"
                        className="mb-12 inline-flex items-center gap-2 text-sm font-medium text-white/70 transition hover:text-white"
                    >
                        <ArrowLeft size={16} />
                        Back to Home
                    </Link>

                    <div className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">
                        <div>
                            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-md">
                                <span className="h-2 w-2 rounded-full bg-sky-400" />
                                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/85">
                                    Industry
                                </span>
                            </div>

                            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
                                Healthcare logistics
                            </h1>

                            <p className="mt-7 max-w-2xl text-2xl font-medium leading-tight text-sky-400 sm:text-3xl">
                                Logistics that make the world a better place
                            </p>

                            <p className="mt-7 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
                                Rising costs from research and development, complex supply chains and stringent regulations are just a few of the challenges you need to overcome when working with healthcare transport and logistics.
                            </p>
                        </div>

                        <IndustryHeroVisual industry="healthcare" />
                    </div>
                </div>
            </section>

            {/* Intro */}
            <section className="bg-slate-50 py-24 sm:py-28">
                <div className="mx-auto max-w-4xl px-6 lg:px-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                        Healthcare logistics
                    </p>

                    <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
                        We can help you make a difference
                    </h2>

                    <p className="mt-7 text-lg leading-8 text-slate-600">
                        Our services, facilities and transport networks comply with all relevant healthcare quality standards and regulations. Furthermore, our tailor-made, integrated supply chain solutions cover everything from transport to storage as well as cold chain services.
                    </p>
                </div>
            </section>

            {/* Specialist solutions */}
            <section className="py-24 sm:py-32">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                            Our capabilities
                        </p>

                        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
                            Specialist healthcare solutions
                        </h2>
                    </div>

                    <div className="mt-16 space-y-8">
                        {sections.map((section, index) => {
                            const Icon = section.icon;
                            const reverse = index % 2 === 1;

                            return (
                                <article
                                    key={section.title}
                                    className="grid overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 lg:grid-cols-2"
                                >
                                    <div
                                        className={`min-h-[320px] bg-gradient-to-br from-sky-100 via-white to-slate-100 p-8 sm:p-12 ${reverse ? 'lg:order-2' : ''
                                            }`}
                                    >
                                        <div className="flex h-full flex-col justify-between">
                                            <div>
                                                <div className="inline-flex rounded-2xl bg-white p-3 text-sky-600 shadow-sm">
                                                    <Icon size={26} strokeWidth={1.8} />
                                                </div>

                                                <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">
                                                    Healthcare solution
                                                </p>

                                                <h3 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                                                    {section.title}
                                                </h3>
                                            </div>

                                            <div className="mt-10 flex items-center gap-3 text-sm font-medium text-slate-500">
                                                <span className="h-px w-10 bg-sky-400" />
                                                Tailored supply chain support
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        className={`bg-white p-8 sm:p-12 ${reverse ? 'lg:order-1' : ''
                                            }`}
                                    >
                                        <div className="space-y-5 text-base leading-7 text-slate-600">
                                            {section.text.map((paragraph) => (
                                                <p key={paragraph}>{paragraph}</p>
                                            ))}
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="bg-slate-950 py-24 sm:py-32">
                <div className="mx-auto max-w-5xl px-6 lg:px-8">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
                        Frequently asked questions
                    </p>

                    <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                        Healthcare logistics, answered.
                    </h2>

                    <div className="mt-12 divide-y divide-white/10 rounded-3xl border border-white/10 bg-white/[0.03] px-6 sm:px-8">
                        {faqs.map((faq, index) => {
                            const isOpen = openFaq === index;

                            return (
                                <div key={faq.question}>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setOpenFaq(isOpen ? -1 : index)
                                        }
                                        className="flex w-full items-center justify-between gap-6 py-7 text-left"
                                    >
                                        <span className="text-base font-semibold text-white sm:text-lg">
                                            {faq.question}
                                        </span>

                                        <ChevronDown
                                            size={20}
                                            className={`shrink-0 text-sky-400 transition-transform ${isOpen ? 'rotate-180' : ''
                                                }`}
                                        />
                                    </button>

                                    {isOpen && (
                                        <div className="pb-7 pr-8 text-base leading-7 text-white/65">
                                            {faq.answer}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-12 flex flex-wrap gap-4">
                        <Link
                            to="/"
                            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
                        >
                            Back to Home
                        </Link>

                        <a
                            href="/#contact"
                            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-400"
                        >
                            Discuss your requirements
                            <ArrowUpRight size={17} />
                        </a>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default HealthcareLogistics;