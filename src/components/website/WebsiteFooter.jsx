import { Link } from 'react-router-dom';
import ilsLogo from '../../assets/branding/ils-logo-horizontal.png';


function InstagramIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function YoutubeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.8V8.2l6.4 3.8-6.4 3.8Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.5 21v-8.2h2.8l.4-3.2h-3.2V7.5c0-.9.3-1.5 1.6-1.5h1.7V3.1c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.3H7.3v3.2h2.8V21h3.4Z" />
    </svg>
  );
}

function LinkedinIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M5.2 3.5A2.2 2.2 0 1 1 5.2 8a2.2 2.2 0 0 1 0-4.5ZM3.3 9.7h3.8V21H3.3V9.7ZM9.4 9.7H13v1.55h.05c.5-.95 1.75-1.95 3.6-1.95 3.85 0 4.55 2.53 4.55 5.82V21h-3.8v-5.2c0-1.24-.02-2.83-1.72-2.83-1.72 0-1.98 1.35-1.98 2.74V21H9.4V9.7Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817-5.964 6.817H1.684l7.73-8.835L1.258 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

const socialLinkClass =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition-colors duration-300 hover:border-sky-400/40 hover:bg-sky-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

export default function WebsiteFooter() {
  return (
    <footer className="bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 py-12 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4 lg:gap-10 lg:py-16">
          {/* Brand */}
          <div className="min-w-0 sm:col-span-2 lg:col-span-2">
            <Link to="/" className="inline-block">
              <img src={ilsLogo} alt="ILS Egypt" className="h-11 w-auto" />
            </Link>

            <p className="mt-6 max-w-md text-sm leading-6 text-slate-400">
              Integrated logistics solutions connecting businesses to markets
              across Egypt and around the world.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="https://www.instagram.com/ilsegypt/?next=%2Fglamurabrand%2F"
                target="_blank"
                rel="noreferrer"
                className={socialLinkClass}
                aria-label="Instagram"
              >
                <InstagramIcon />
              </a>

              <a
                href="https://www.youtube.com/@ILS-Egypt"
                target="_blank"
                rel="noreferrer"
                className={socialLinkClass}
                aria-label="YouTube"
              >
                <YoutubeIcon />
              </a>

              <a
                href="https://www.facebook.com/ILSegypt"
                target="_blank"
                rel="noreferrer"
                className={socialLinkClass}
                aria-label="Facebook"
              >
                <FacebookIcon />
              </a>

              <a
                href="https://www.linkedin.com/company/ils-egypt/"
                target="_blank"
                rel="noreferrer"
                className={socialLinkClass}
                aria-label="LinkedIn"
              >
                <LinkedinIcon />
              </a>


              <a
                href="https://x.com/ILS_EGYPT"
                target="_blank"
                rel="noreferrer"
                className={`${socialLinkClass} text-sm font-semibold`}
                aria-label="X"
              >
                <XIcon />
              </a>

            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-sm font-semibold text-white">Navigation</h3>

            <ul className="mt-5 space-y-3">
              <li>
                <a
                  href="/#about"
                  className="text-sm text-slate-400 transition hover:text-white"
                >
                  About ILS
                </a>
              </li>

              <li>
                <a
                  href="/#solutions"
                  className="text-sm text-slate-400 transition hover:text-white"
                >
                  Solutions
                </a>
              </li>

              <li>
                <a
                  href="/#industries"
                  className="text-sm text-slate-400 transition hover:text-white"
                >
                  Industries
                </a>
              </li>

              <li>
                <a
                  href="/#news"
                  className="text-sm text-slate-400 transition hover:text-white"
                >
                  Media Room
                </a>
              </li>

              <li>
                <a
                  href="/#contact"
                  className="text-sm text-slate-400 transition hover:text-white"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-white">Contact</h3>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Email
                </p>
                <p className="mt-1 text-sm text-slate-400">info@ilsegypt.com</p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Phone
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  0222683311 - 0222683312
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  Location
                </p>
                <p className="mt-1 text-sm text-slate-400">Cairo, Egypt</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-slate-500">
            © {new Date().getFullYear()} ILS Egypt. All rights reserved.
          </p>

          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <a href="#" className="text-slate-500 transition hover:text-white">
              Privacy Policy
            </a>
            <a href="#" className="text-slate-500 transition hover:text-white">
              Terms &amp; Conditions
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
