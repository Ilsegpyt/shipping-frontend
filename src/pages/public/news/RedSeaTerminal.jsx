import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';

import newsImage from '../../../assets/website/news/06deaf3c-354a-4853-a3d6-9a2e79884141.jpg';

export default function RedSeaTerminal() {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
      <main className="ئmin-h-screen bg-brand-surface">
        {/* ==================== Hero ==================== */}
        <section className="relative overflow-hidden bg-brand-surface-tint">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(14,165,233,0.22),transparent_35%)]" />
          <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-brand-accent/10 to-transparent" />

          <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-10 lg:px-8 lg:pb-20">
            <Link
              to="/news"
              className="inline-flex items-center gap-2 text-sm font-medium text-brand-border transition hover:text-brand-surface"
            >
              <ArrowLeft size={17} />
              Back to News
            </Link>

            <div className="mt-14 max-w-5xl">
              <div className="inline-flex items-center gap-3 rounded-full border border-brand-accent/20 bg-brand-accent/10 px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-brand-accent" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">
                  Industry News
                </span>
              </div>

              <p className="mt-6 text-sm font-medium text-brand-muted">
                29-Dec-2025
              </p>

              <h1 className="mt-4 max-w-5xl text-2xl font-semibold leading-tight tracking-tight text-brand-surface sm:text-3xl lg:text-4xl">
                Red Sea Container Terminal No. 1 in Ain Sokhna Port Begins Trial
                Operations
              </h1>
            </div>
          </div>
        </section>

        {/* ==================== Article ==================== */}
        <section className="bg-brand-surface py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="overflow-hidden rounded-3xl border border-brand-border bg-brand-surface shadow-sm">
              <div className="aspect-[16/9] overflow-hidden bg-brand-surface">
                <img
                  src={newsImage}
                  alt="Red Sea Container Terminal No. 1 in Ain Sokhna Port Begins Trial Operations"
                  className="h-full w-full object-cover"
                />
              </div>

              <article className="px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
                <div className="max-w-3xl">
                  <p className="text-base font-semibold leading-8 text-brand-text sm:text-lg sm:leading-9">
                    Egypt has officially begun trial operations at the Red Sea
                    Container Terminal No. 1 at Sokhna Port, marking a major
                    step in its bid to become a leading logistics and
                    transshipment hub connecting the Red Sea with the
                    Mediterranean.
                  </p>

                  <div className="mt-10">
                    <Link
                      to="/news"
                      className="inline-flex items-center gap-2 rounded-xl bg-brand-accent px-6 py-3.5 text-sm font-semibold text-brand-surface transition hover:bg-brand-accent"
                    >
                      Back to News
                      <ArrowUpRight size={17} />
                    </Link>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>
      </main>
    );
}
