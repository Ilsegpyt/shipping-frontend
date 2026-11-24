import { CheckCircle2 } from 'lucide-react';

const STATUS_STYLES = {
    Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Draft: 'bg-amber-50 text-amber-700 border-amber-200',
    Rejected: 'bg-red-50 text-red-700 border-red-200',
};

export function PortStatusBadge({ status }) {
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                STATUS_STYLES[status] ?? 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
        >
            {status === 'Approved' && <CheckCircle2 className="h-3.5 w-3.5" />}
            {status}
        </span>
    );
}
