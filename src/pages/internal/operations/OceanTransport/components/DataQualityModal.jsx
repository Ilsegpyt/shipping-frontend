import React from 'react';
import { CheckCircle2, AlertTriangle, X, ShieldCheck, FileText } from 'lucide-react';

export default function DataQualityModal({ isOpen, onClose, report = [], lang = 'en' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {lang === 'ar' ? 'تقرير جودة البيانات' : 'Data Quality Report'}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'ar' ? 'فحص اكتمال الحقول وصحة البيانات' : 'Validation & completeness inspection'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
          {report.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-800">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <div>
                <p className="font-semibold">{lang === 'ar' ? 'البيانات سليمة ومكتملة' : 'All Data Valid'}</p>
                <p className="mt-0.5 text-slate-600">
                  {lang === 'ar'
                    ? 'جميع العمليات والحاويات تحتوي على الحقول الإلزامية وتواريخ صالحة.'
                    : 'All records have valid required operation references, lines, ports, and dates.'}
                </p>
              </div>
            </div>
          ) : (
            report.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700"
              >
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="text-slate-500">{item.message}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-5 flex justify-end border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
