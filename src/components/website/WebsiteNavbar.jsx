import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import ilsLogo from '../../assets/branding/ils-logo-horizontal.png';

const getClientPortalPath = () => {
    const token = localStorage.getItem('accessToken');

    if (!token) {
        return '/login';
    }

    try {
        const payload = token.split('.')[1];

        if (!payload) {
            return '/login';
        }

        const base64 = payload
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const padded = base64.padEnd(
            Math.ceil(base64.length / 4) * 4,
            '='
        );

        const tokenType = JSON.parse(atob(padded)).token_type;

        if (tokenType === 'internal') return '/dashboard';
        if (tokenType === 'customer') return '/customer';
        if (tokenType === 'sub_account') return '/subaccount';

        return '/login';
    } catch {
        return '/login';
    }
};

function NavLink({ to, href, children }) {
    const className =
        'block rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white';

    if (to) {
        return (
            <Link to={to} className={className}>
                {children}
            </Link>
        );
    }

    return (
        <a href={href} className={className}>
            {children}
        </a>
    );
}

function NavDropdown({ label, children }) {
    return (
        <div className="group relative">
            <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-white/85 transition hover:bg-white/10 hover:text-white"
            >
                {label}

                <span className="text-[10px] text-white/60 transition group-hover:rotate-180">
                    ⌄
                </span>
            </button>

            <div className="pointer-events-none absolute left-1/2 top-full z-50 w-64 -translate-x-1/2 translate-y-0 rounded-xl border border-white/10 bg-slate-950/95 p-2 opacity-0 shadow-2xl shadow-slate-950/30 backdrop-blur-xl transition duration-150 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
                <div className="space-y-0.5">
                    {children}
                </div>
            </div>
        </div>
    );
}

export default function WebsiteNavbar() {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 24);
        };

        handleScroll();

        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    return (
        <header className="fixed inset-x-0 top-0 z-50">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div
                    className={`flex h-16 items-center justify-between rounded-2xl border px-4 shadow-lg backdrop-blur-xl transition-all duration-300 sm:px-5 ${
                        isScrolled
                            ? 'mt-3 border-white/10 bg-slate-950/90 shadow-slate-950/20'
                            : 'mt-4 border-white/15 bg-slate-950/45'
                    }`}
                >
                    <Link to="/" className="shrink-0">
                        <img
                            src={ilsLogo}
                            alt="ILS Egypt"
                            className="h-9 w-auto sm:h-10"
                        />
                    </Link>

                    <nav className="hidden items-center gap-1 lg:flex">
                        <NavDropdown label="About ILS">
                            <NavLink to="/about-ils/philosophy">
                                Philosophy
                            </NavLink>
                            <NavLink to="/about-ils/purpose-and-strategy">
                                Purpose and Strategy
                            </NavLink>
                            <NavLink to="/about-ils/values">
                                Values
                            </NavLink>
                            <NavLink to="/about-ils/certificates">
                                Certificates
                            </NavLink>
                        </NavDropdown>

                        <NavDropdown label="ILS Solutions">
                            <NavLink to="/solutions/sea-freight">
                                Sea Freight
                            </NavLink>
                            <NavLink to="/solutions/air-freight">
                                Air Freight
                            </NavLink>
                            <NavLink to="/solutions/consolidations">
                                Consolidations
                            </NavLink>
                            <NavLink to="/solutions/customs-clearance">
                                Customs Clearance
                            </NavLink>
                            <NavLink to="/solutions/road-transportation">
                                Road Transportation
                            </NavLink>
                            <NavLink to="/solutions/cargo-insurance">
                                Cargo Insurance
                            </NavLink>
                            <NavLink to="/solutions/project-transport">
                                ILS Projects Transport
                            </NavLink>
                            <NavLink to="/solutions/warehousing-distribution">
                                Warehousing and Distribution
                            </NavLink>
                        </NavDropdown>

                        <NavDropdown label="ILS Industries">
                            <NavLink to="/industries/automotive">
                                Automotive Logistics
                            </NavLink>
                            <NavLink to="/industries/technology">
                                Technology
                            </NavLink>
                            <NavLink to="/industries/healthcare">
                                Healthcare Logistics
                            </NavLink>
                            <NavLink to="/industries/energy">
                                Energy
                            </NavLink>
                            <NavLink to="/industries/industrial">
                                Industrial Logistics
                            </NavLink>
                            <NavLink to="/industries/retail">
                                Retail Logistics
                            </NavLink>
                        </NavDropdown>

                        <NavDropdown label="Media Room">
                            <NavLink to="/news?category=ILS%20News">
                                ILS News
                            </NavLink>
                            <NavLink to="/news?category=Industry%20News">
                                Industry News
                            </NavLink>
                            <NavLink to="/news?category=Case%20Study">
                                Case Study
                            </NavLink>
                        </NavDropdown>

                        <NavDropdown label="Resources">
                            <NavLink to="/resources/incoterms">
                                Incoterms
                            </NavLink>
                            <NavLink to="/resources/dangerous-goods-labels">
                                Dangerous Goods Labels
                            </NavLink>
                            <NavLink to="/resources/container-types">
                                Container Types
                            </NavLink>
                            <NavLink to="/resources/nafeza-platform">
                                Nafeza Platform
                            </NavLink>
                            <NavLink to="/resources/cbm-calculator">
                                CBM Calculator
                            </NavLink>
                            <NavLink to="/resources/customs-duties-calculator">
                                Customs Duties Calculator
                            </NavLink>
                        </NavDropdown>

                        <NavDropdown label="Join ILS">
                            <NavLink to="/join-ils/agent-opportunity">
                                Agent Opportunity
                            </NavLink>
                            <NavLink to="/join-ils/recruitment">
                                Join Our Team
                            </NavLink>
                        </NavDropdown>

                        <NavDropdown label="Contact ILS">
                            <NavLink href="#contact">
                                Contact Us
                            </NavLink>
                            <NavLink to="/contact-ils/locations">
                                ILS Locations
                            </NavLink>
                            <NavLink to="/contact-ils/get-a-quote">
                                Quotation
                            </NavLink>
                        </NavDropdown>
                    </nav>

                    <Link
                        to={getClientPortalPath()}
                        className="hidden rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 sm:px-5 lg:inline-flex"
                    >
                        Client Portal
                    </Link>
                </div>
            </div>
        </header>
    );
}
