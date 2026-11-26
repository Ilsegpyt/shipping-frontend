import { Eye, EyeOff, UserRound } from 'lucide-react';
import ApiFieldError from '../common/ApiFieldError';
import './profile-dashboard.css';

export function ProfileSummary({ name, email, role }) {
    return (
        <div className="ils-profile-summary">
            <span className="ils-profile-avatar"><UserRound size={30} aria-hidden="true" /></span>
            <div className="min-w-0 break-words">
                <h2>{name || 'User'}</h2>
                <p>{email || '—'}</p>
            </div>
            {role && <span className="ils-profile-role">{role}</span>}
        </div>
    );
}

export function PasswordField({ id, label, value, onChange, visible, onToggle, placeholder, disabled, errors, field, minLength }) {
    const Icon = visible ? EyeOff : Eye;
    return (
        <div>
            <label htmlFor={id} className="text-xs font-medium uppercase tracking-wide text-brand-muted">{label}</label>
            <div className="relative mt-2">
                <input id={id} type={visible ? 'text' : 'password'} value={value} onChange={onChange}
                    placeholder={placeholder} disabled={disabled} required minLength={minLength}
                    autoComplete={field === 'currentPassword' ? 'current-password' : 'new-password'}
                    className="ils-dashboard-field ils-dashboard-field--password" />
                <button type="button" onClick={onToggle} className="ils-dashboard-password-toggle"
                    aria-label={visible ? 'Hide password' : 'Show password'}>
                    <Icon size={20} aria-hidden="true" />
                </button>
            </div>
            <ApiFieldError errors={errors} field={field} />
        </div>
    );
}
