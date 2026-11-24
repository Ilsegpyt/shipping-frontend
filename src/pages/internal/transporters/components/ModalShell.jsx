import { X } from 'lucide-react';

export default function ModalShell({ title, subtitle, onClose, maxWidth = 'max-w-2xl', children }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className={`max-h-[90vh] w-full ${maxWidth} overflow-y-auto rounded-xl bg-white shadow-xl`}>
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <div>
                        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                        {subtitle && (
                            <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {children}
            </div>
        </div>
    );
}
