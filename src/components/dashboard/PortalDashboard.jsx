import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { DashboardPage, DashboardPageHeader } from './DashboardUI';
import DashboardHero from './DashboardHero';

export default function PortalDashboard({ user, role, description, welcomeDescription, links }) {
    return (
        <DashboardPage className="ils-main-dashboard">
            <DashboardPageHeader title="Dashboard" description={description} />
            <DashboardHero
                user={user}
                workspace={`${role} workspace`}
                description={welcomeDescription}
                role={role}
            />
            <section aria-labelledby="portal-quick-access-title">
                <h2 id="portal-quick-access-title" className="ils-main-section-title">Quick Access</h2>
                <div className="ils-main-overview">
                    {links.map(({ path, label, description: linkDescription, icon: Icon }) => (
                        <Link key={path} to={path} className="ils-main-stat ils-portal-quick-link">
                            <span className="ils-main-stat-icon"><Icon size={22} aria-hidden="true" /></span>
                            <div className="ils-portal-quick-copy">
                                <h3>{label}</h3>
                                <p>{linkDescription}</p>
                            </div>
                            <ArrowRight size={18} aria-hidden="true" className="ils-portal-quick-arrow" />
                        </Link>
                    ))}
                </div>
            </section>
        </DashboardPage>
    );
}
