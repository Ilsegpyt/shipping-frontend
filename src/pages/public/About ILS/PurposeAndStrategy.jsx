import React from 'react';

export default function PurposeAndStrategy() {
    return (
        <main className="min-h-screen bg-slate-50">
            {/* Hero */}
            <section className="bg-slate-950 px-6 py-20 sm:px-10 lg:px-16">
                <div className="mx-auto max-w-6xl">
                    <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
                        About ILS
                    </p>

                    <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
                        Purpose and Strategy
                    </h1>

                    <p className="mt-6 max-w-3xl text-xl font-medium leading-8 text-slate-300">
                        Keeping supply chains flowing in a world of change
                    </p>
                </div>
            </section>

            {/* Introduction */}
            <section className="px-6 py-14 sm:px-10 lg:px-16">
                <div className="mx-auto max-w-5xl">
                    <article className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10 lg:p-12">
                        <div className="space-y-6 text-base leading-8 text-slate-600 sm:text-lg">
                            <p>
                                At ILS – Global Transport and Logistics, we provide and manage supply chain solutions for thousands of companies every day – from the small family run business to the large global corporation. Our reach is global, yet our presence is local and close to our customers. All employees in more than 80 countries work passionately to deliver great customer experiences and high-quality services. We believe world trade drives world prosperity, but seamless trade is not a given.
                            </p>
                        </div>
                    </article>
                </div>
            </section>

            {/* Purpose */}
            <section className="bg-white px-6 py-16 sm:px-10 lg:px-16">
                <div className="mx-auto max-w-5xl">
                    <SectionHeading title="Our purpose" subtitle="Keeping supply chains flowing in a world of change" />

                    <div className="mt-8 space-y-6 text-base leading-8 text-slate-600 sm:text-lg">
                        <p>
                            We acknowledge our role as part of the critical infrastructure driving world trade and as a key enabler for the sustainable growth of all our stakeholders, including customers, shareholders and societies at large.
                        </p>

                        <p>
                            We conduct our business with integrity, respecting different cultures and the dignity and rights of individuals. We believe in contributing our fair share to the societies and local communities in which we operate while reducing the environmental footprint from our operations.
                        </p>

                        <p>
                            We take advantage of technology and digitalization. Our workflows are highly digitalized and our IT systems are integrated with both customers and suppliers. In a world of change, this enables us to continuously optimize our customers’ supply chains and supports efficient workflows for our employees.
                        </p>
                    </div>
                </div>
            </section>

            {/* Vision */}
            <section className="bg-slate-50 px-6 py-16 sm:px-10 lg:px-16">
                <div className="mx-auto max-w-5xl">
                    <SectionHeading title="Our vision" subtitle="Sustainable growth" />

                    <div className="mt-8 space-y-6 text-base leading-8 text-slate-600 sm:text-lg">
                        <p>
                            We help our customers grow by keeping their supply chains flowing. We create efficient solutions for all businesses with focus on reliability, environmental impact and cost – regardless of industry and size.
                        </p>

                        <p>
                            We provide equal growth opportunities for all employees. People drive the success of our company, so the more we provide healthy and safe workplaces – as well as strong growth opportunities – the greater is our chance of achieving our ambitious growth targets.
                        </p>

                        <p>
                            We help societies grow. We conduct our business with integrity, respecting different cultures and the dignity and rights of individuals in all countries. We grow shareholder value. We want to continue to be a leading global supplier, fulfilling the customer needs for transport and logistics services. We target extensive growth - organic and through acquisitions - and aim to be among the most profitable in our industry.
                        </p>
                    </div>
                </div>
            </section>

            {/* Mission */}
            <section className="bg-white px-6 py-16 sm:px-10 lg:px-16">
                <div className="mx-auto max-w-5xl">
                    <SectionHeading title="Our mission" subtitle="Operational excellence" />

                    <div className="mt-8 space-y-6 text-base leading-8 text-slate-600 sm:text-lg">
                        <p>
                            World trade drives world prosperity, but seamless trade is not a given.
                        </p>

                        <p>
                            Through our persistent focus on transparency, productivity and scalability, we create more efficient global trade flows for all business.
                        </p>

                        <p>
                            We design our infrastructure – physical and digital – to support high service levels and efficient workflows.
                        </p>

                        <p>
                            Operational excellence goes hand in hand with sustainability. A well-planned supply chain is also a greener supply chain.
                        </p>

                        <p>
                            We are forwarders. People who get things done. We take ownership and show initiative. We always seek to find the better and rational solutions to the challenges we face.
                        </p>
                    </div>
                </div>
            </section>
        </main>
    );
}

function SectionHeading({ title, subtitle }) {
    return (
        <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">
                {title}
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                {subtitle}
            </h2>

            <div className="mt-5 h-1 w-16 rounded-full bg-sky-500" />
        </div>
    );
}
