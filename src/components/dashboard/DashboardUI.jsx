import ManagementHeaderTitle from "./ManagementHeaderTitle";
import "./management-heading.css";
/**
 * Presentation-only building blocks for dashboard screens.
 * These components own no API calls, permissions, filtering, or form state.
 * They can be adopted by Operations later without rewriting that business logic.
 */
import { Search, Pencil, ShieldCheck, ShieldOff, UserPlus, Trash2, CheckCircle2, XCircle, UserMinus, Eye } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useLayoutEffect, useRef, useState } from 'react';
import './dashboard-ui.css';

export function DashboardPage({ children, className = '' }) {
    return <div className={`ils-dashboard-page space-y-6 ${className}`.trim()}>{children}</div>;
}

export function DashboardPageHeader({ title, description, actions, eyebrow }) {
    return (
        <header className="ils-dashboard-header">
            <ManagementHeaderTitle title={title} description={description} />
            {actions && <div className="ils-dashboard-header-actions">{actions}</div>}
        </header>
    );
}

export function DashboardButton({ children, variant = 'secondary', icon: Icon, className = '', ...props }) {
    return (
        <button
            type="button"
            className={`ils-dashboard-button ils-dashboard-button--${variant} ${className}`.trim()}
            {...props}
        >
            {Icon && <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />}
            {children}
        </button>
    );
}

export function DashboardToolbar({ children, actions }) {
    return (
        <section className="ils-dashboard-toolbar" aria-label="Table controls">
            <div className="ils-dashboard-toolbar-search">{children}</div>
            {actions && <div className="ils-dashboard-toolbar-actions">{actions}</div>}
        </section>
    );
}

export function DashboardSearchField({ className = '', title, placeholder, ...props }) {
    return (
        <label className={`ils-dashboard-search ${className}`.trim()}>
            <span className="sr-only">{title || placeholder || 'Search'}</span>
            <Search aria-hidden="true" className="ils-dashboard-search-icon" />
            <input type="search" title={title} placeholder={placeholder} {...props} />
        </label>
    );
}

/** Wraps the original table, its paging and its empty/loading rows without touching them. */
export function DashboardTableSurface({ children }) {
    return <section className="ils-dashboard-table-surface" aria-label="Management data">{children}</section>;
}

export function DashboardStatusBadge({ children, tone = 'neutral' }) {
    const positive = tone === 'positive' || tone === 'success';
    const negative = tone === 'negative' || tone === 'danger';
    const Icon = positive ? CheckCircle2 : negative ? XCircle : null;
    return (
        <span className={`ils-dashboard-status ils-dashboard-status--${positive ? 'positive' : negative ? 'negative' : 'neutral'}`}>
            {Icon && <Icon size={14} strokeWidth={2} aria-hidden="true" />}
            {children}
        </span>
    );
}

/**
 * Render row actions outside scrolling/clipped table containers.
 * The trigger remains inside its original table cell and keeps its own handlers.
 */
export function DashboardActionMenu({ anchorId, width = 248, children }) {
    const menuRef = useRef(null);
    const [position, setPosition] = useState(null);

    useLayoutEffect(() => {
        const anchor = document.getElementById(anchorId);
        if (!anchor) return;

        const updatePosition = () => {
            const rect = anchor.getBoundingClientRect();
            const menuHeight = menuRef.current?.offsetHeight ?? 160;
            const menuWidth = Math.min(width, window.innerWidth - 16);
            const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));
            const belowSpace = window.innerHeight - rect.bottom;
            const aboveSpace = rect.top;
            const openAbove = belowSpace < menuHeight + 8 && aboveSpace > belowSpace;
            const top = openAbove
                ? Math.max(8, rect.top - menuHeight - 6)
                : Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - menuHeight - 8));

            setPosition({ left, top, width: menuWidth });
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [anchorId, width]);

    return createPortal(
        <div
            ref={menuRef}
            className="ils-dashboard-action-menu border border-brand-border bg-brand-surface p-1 text-left shadow-lg"
            style={{ position: 'fixed', zIndex: 1000, ...(position ?? { left: -9999, top: -9999, width }) }}
            role="menu"
        >
            {children}
        </div>,
        document.body
    );
}

/**
 * Standardized, semantic dashboard action. Each action owns its label, icon,
 * tone and hover style; the consuming page still owns its click handler.
 * Safe to reuse in Management now and Operations later.
 */
const ACTION_PRESENTATION = {
    edit: { label: 'Edit', Icon: Pencil, tone: 'neutral' },
    view: { label: 'View Details', Icon: Eye, tone: 'neutral' },
    remove: { label: 'Remove', Icon: UserMinus, tone: 'danger' },
    'change-manager': { label: 'Change Manager', Icon: UserPlus, tone: 'neutral' },
    permissions: { label: 'Permissions', Icon: ShieldCheck, tone: 'neutral' },
    activate: { label: 'Activate', Icon: ShieldCheck, tone: 'success' },
    deactivate: { label: 'Deactivate', Icon: ShieldOff, tone: 'danger' },
    delete: { label: 'Delete', Icon: Trash2, tone: 'danger' },
};

export function DashboardActionItem({ action, onClick, className = '', ...props }) {
    const presentation = ACTION_PRESENTATION[action];
    if (!presentation) return null;
    const { label, Icon, tone } = presentation;
    return (
        <button
            type="button"
            role="menuitem"
            onClick={onClick}
            className={`ils-dashboard-action-item ils-dashboard-action-item--${tone} ${className}`.trim()}
            {...props}
        >
            <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span>{label}</span>
        </button>
    );
}
