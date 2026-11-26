import { LayoutDashboard } from 'lucide-react';
import dashboardHero from '../../assets/branding/dashboard-hero.webp';
import './dashboard-home.css';

export default function DashboardHero({ user, workspace, description, role }) {
    const roleName = user?.roleName || role;

    return (
        <section className="ils-main-hero" style={{ backgroundImage: `url(${dashboardHero})` }}>
            <div className="ils-main-hero-copy">
                <p className="ils-main-eyebrow">
                    {/* <LayoutDashboard size={16} aria-hidden="true" />{workspace}</p> */}
                    <LayoutDashboard size={16} aria-hidden="true" />Your Workspace</p>
                <h2>Welcome back, {user?.name || 'User'}</h2>
                <p>{description}</p>
                {/* {roleName && <span className="ils-main-role">{roleName}</span>} */}
            </div>
        </section>
    );
}
