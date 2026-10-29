import React, { useState, useMemo } from 'react';
import {
  Upload,
  X,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Download,
  Search,
  Filter,
  ShieldAlert,
  ArrowRight,
  Check,
  Layers,
  FileCheck2,
  Database,
} from 'lucide-react';
import { parseExcelFile, exportValidationReport } from '../tptEngine';

export default function UploadModal({ isOpen, onClose, onUploadSuccess, lang = 'ar' }) {
  const [step, setStep] = useState('upload'); // 'upload' | 'review'
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'errors' | 'warnings' | 'import' | 'export'
  const [searchQuery, setSearchQuery] = useState('');

  const handleClose = () => {
    setStep('upload');
    setParsedData(null);
    setFileName('');
    setError('');
    setActiveTab('all');
    setSearchQuery('');
    onClose();
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setError(lang === 'ar' ? 'يرجى رفع ملف إكسيل صالح (.xlsx أو .xls)' : 'Please select an Excel file (.xlsx or .xls)');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const parsed = await parseExcelFile(file);
      const total = (parsed.Import?.length || 0) + (parsed.Export?.length || 0);

      if (total === 0) {
        setError(
          lang === 'ar'
            ? 'لم يتم العثور على أي شيت وارد أو صادر مطابق في الملف. تأكد من وجود كولمز الشحنات الأساسية (Booking أو M/BL).'
            : 'No matching IMPORT or EXPORT sheets found. Check column headers.'
        );
        return;
      }

      setParsedData(parsed);
      setFileName(file.name);
      setStep('review');
    } catch (err) {
      console.error(err);
      setError(err.message || 'فشل في قراءة ومعالجة ملف الإكسيل.');
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = (onlyValid = false, saveDirectlyToDb = true) => {
    if (!parsedData) return;

    let finalImport = parsedData.Import || [];
    let finalExport = parsedData.Export || [];

    if (onlyValid) {
      finalImport = finalImport.filter((r) => !r._hasError);
      finalExport = finalExport.filter((r) => !r._hasError);
    }

    onUploadSuccess &&
      onUploadSuccess(
        {
          ...parsedData,
          Import: finalImport,
          Export: finalExport,
        },
        fileName,
        { saveToDb: saveDirectlyToDb }
      );

    handleClose();
  };

  const handleExportReport = () => {
    if (!parsedData?.issues?.length) return;
    const baseName = fileName.replace(/\.[^/.]+$/, '');
    exportValidationReport(parsedData.issues, `Report_Validation_${baseName}.xlsx`);
  };

  // Filtered issues list for the review table
  const issues = parsedData?.issues || [];
  const stats = parsedData?.stats || {
    totalRows: 0,
    importRows: 0,
    exportRows: 0,
    errorCount: 0,
    warningCount: 0,
    validCount: 0,
    sheetsDetected: [],
  };

  const filteredIssues = useMemo(() => {
    return issues.filter((item) => {
      // Tab filter
      if (activeTab === 'errors' && item.severity !== 'error') return false;
      if (activeTab === 'warnings' && item.severity !== 'warning') return false;
      if (activeTab === 'import' && item.dir !== 'Import') return false;
      if (activeTab === 'export' && item.dir !== 'Export') return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        String(item.rowNumber).includes(q) ||
        (item.ref && item.ref.toLowerCase().includes(q)) ||
        (item.cntr && item.cntr.toLowerCase().includes(q)) ||
        (item.field && item.field.toLowerCase().includes(q)) ||
        (item.message && item.message.toLowerCase().includes(q)) ||
        (item.action && item.action.toLowerCase().includes(q))
      );
    });
  }, [issues, activeTab, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity" onClick={handleClose} />

      {/* Modal Dialog */}
      <div
        className={`relative flex flex-col w-full rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all max-h-[92vh] ${
          step === 'review' ? 'max-w-5xl' : 'max-w-lg'
        }`}
      >
        {/* ================= STEP 1: FILE DROP & UPLOAD ================= */}
        {step === 'upload' && (
          <div className="p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-sm border border-blue-100">
                  <Upload size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {lang === 'ar' ? 'رفع وفحص التقرير (Upload & Validate Report)' : 'Upload & Validate Report'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {lang === 'ar'
                      ? 'التعرف التلقائي الذكي على التابات (وارد/صادر) والتدقيق الفوري للصفوف'
                      : 'Automatic tab detection (Import/Export) & row-by-row validation'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-rose-50 p-3.5 text-xs text-rose-800 border border-rose-200">
                <AlertCircle size={18} className="shrink-0 text-rose-600" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {/* Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`mt-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition ${
                dragActive
                  ? 'border-blue-600 bg-blue-50/60 scale-[0.99]'
                  : 'border-slate-300 bg-slate-50/50 hover:bg-slate-100/60'
              }`}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md border border-slate-100 text-slate-600">
                <FileSpreadsheet size={28} className="text-emerald-600" />
              </div>

              <p className="mt-4 text-sm font-bold text-slate-800">
                {lang === 'ar' ? 'اسحب ملف تقرير الإكسيل هنا أو اختر من جهازك' : 'Drag & drop Excel report here'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {lang === 'ar' ? 'الملفات المدعومة: .xlsx, .xls' : 'Expected formats: .xlsx, .xls'}
              </p>

              <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-95">
                <Upload size={15} />
                {loading
                  ? lang === 'ar'
                    ? 'جاري الفحص والتدقيق...'
                    : 'Validating rows...'
                  : lang === 'ar'
                  ? 'اختيار الملف للفحص'
                  : 'Select Excel File'}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  disabled={loading}
                  onChange={(e) => handleFile(e.target.files?.[0])}
                  className="hidden"
                />
              </label>
            </div>

            {/* Feature Badges */}
            <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 text-xs text-slate-600 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <CheckCircle2 size={15} className="text-blue-600" />
                <span>{lang === 'ar' ? 'آلية العمل الذكية للفحص:' : 'Smart Validation System:'}</span>
              </div>
              <ul className="space-y-1 list-disc list-inside text-slate-600 pr-1 text-[11px] leading-relaxed">
                <li>
                  {lang === 'ar'
                    ? 'التعرف على التابات (وارد / صادر) من الكولمز المميزة دون الاعتماد على اسم الشيت.'
                    : 'Auto-detects sheets by distinctive columns (Booking/POL for Export, M-BL/POD for Import).'}
                </li>
                <li>
                  {lang === 'ar'
                    ? 'دمج الحاويات للشحنة الواحدة (Carry-Forward) حتى وإن كانت الحقول مدمجة أو فارغة.'
                    : 'Automatic forward-fill for multi-container operations with merged rows.'}
                </li>
                <li>
                  {lang === 'ar'
                    ? 'مراجعة رو بروو ومطابقة قواعد قاعدة البيانات (أطوال أرقام الحاويات، الحقول الإجبارية، التواريخ).'
                    : 'Row-by-row audit enforcing backend database constraints before saving.'}
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* ================= STEP 2: VALIDATION & AUDIT REVIEW MODAL ================= */}
        {step === 'review' && (
          <div className="flex flex-col h-full max-h-[92vh] overflow-hidden">
            {/* Review Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-sm border ${
                    stats.errorCount > 0
                      ? 'bg-rose-50 text-rose-600 border-rose-200'
                      : stats.warningCount > 0
                      ? 'bg-amber-50 text-amber-600 border-amber-200'
                      : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  }`}
                >
                  {stats.errorCount > 0 ? (
                    <ShieldAlert size={22} />
                  ) : stats.warningCount > 0 ? (
                    <AlertTriangle size={22} />
                  ) : (
                    <FileCheck2 size={22} />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      {lang === 'ar' ? 'تقرير تدقيق ومراجعة التقرير المرفوع' : 'Report Upload Validation'}
                    </h3>
                    <span className="rounded-md bg-slate-200/80 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      {fileName}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {lang === 'ar'
                      ? `تم فحص ${stats.totalRows} صف عبر التابات المكتشفة: وارد (${stats.importRows} صف) · صادر (${stats.exportRows} صف)`
                      : `Audited ${stats.totalRows} rows: Import (${stats.importRows}) · Export (${stats.exportRows})`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3.5 bg-white border-b border-slate-100 shrink-0">
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <span className="text-[11px] font-medium text-slate-500 block">
                  {lang === 'ar' ? 'إجمالي الصفوف المفحوصة' : 'Total Audited Rows'}
                </span>
                <span className="text-xl font-bold text-slate-900">{stats.totalRows}</span>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                <span className="text-[11px] font-medium text-emerald-700 block">
                  {lang === 'ar' ? 'الصفوف السليمة الجاهزة' : 'Valid Rows Ready'}
                </span>
                <span className="text-xl font-bold text-emerald-800">{stats.validCount}</span>
              </div>

              <div
                className={`rounded-xl border p-3 ${
                  stats.errorCount > 0 ? 'border-rose-200 bg-rose-50/60' : 'border-slate-200 bg-slate-50/40 opacity-70'
                }`}
              >
                <span
                  className={`text-[11px] font-medium block ${
                    stats.errorCount > 0 ? 'text-rose-700 font-bold' : 'text-slate-500'
                  }`}
                >
                  {lang === 'ar' ? 'أخطاء حرجة (تمنع الحفظ)' : 'Fatal Errors'}
                </span>
                <span className={`text-xl font-bold ${stats.errorCount > 0 ? 'text-rose-800' : 'text-slate-600'}`}>
                  {stats.errorCount}
                </span>
              </div>

              <div
                className={`rounded-xl border p-3 ${
                  stats.warningCount > 0
                    ? 'border-amber-200 bg-amber-50/60'
                    : 'border-slate-200 bg-slate-50/40 opacity-70'
                }`}
              >
                <span className="text-[11px] font-medium text-amber-700 block">
                  {lang === 'ar' ? 'تنبيهات وملاحظات' : 'Warnings & Notices'}
                </span>
                <span className="text-xl font-bold text-amber-800">{stats.warningCount}</span>
              </div>
            </div>

            {/* Filter Pills and Search Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-2.5 bg-slate-50/50 border-b border-slate-200 shrink-0">
              {/* Tab Pills */}
              <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                    activeTab === 'all'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {lang === 'ar' ? `كافة الملاحظات (${issues.length})` : `All (${issues.length})`}
                </button>

                {stats.errorCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('errors')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                      activeTab === 'errors'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    {lang === 'ar' ? `الأخطاء فقط (${stats.errorCount})` : `Errors (${stats.errorCount})`}
                  </button>
                )}

                {stats.warningCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('warnings')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                      activeTab === 'warnings'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    {lang === 'ar' ? `التنبيهات فقط (${stats.warningCount})` : `Warnings (${stats.warningCount})`}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveTab('import')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                    activeTab === 'import'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {lang === 'ar' ? 'شيت الوارد' : 'Import'}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('export')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                    activeTab === 'export'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {lang === 'ar' ? 'شيت الصادر' : 'Export'}
                </button>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute right-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    lang === 'ar'
                      ? 'بحث برقم الحاوية أو البوكينج أو الصف...'
                      : 'Search by container, booking, row...'
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white pr-8 pl-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Table of Issues / Audit Results */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {filteredIssues.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-3 border border-emerald-100">
                    <CheckCircle2 size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    {lang === 'ar' ? 'لا توجد ملاحظات أو أخطاء مطابقة للفلتر!' : 'No matching issues found!'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    {lang === 'ar'
                      ? 'كافة الصفوف المفحوصة في هذا التصنيف سليمة وجاهزة للاستيراد المباشر.'
                      : 'All rows in this view are valid and ready to import.'}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">{lang === 'ar' ? 'الشيت' : 'Sheet'}</th>
                        <th className="py-2.5 px-3">{lang === 'ar' ? 'الصف بالإكسيل' : 'Excel Row'}</th>
                        <th className="py-2.5 px-3">{lang === 'ar' ? 'المرجع (Booking / BL)' : 'Reference'}</th>
                        <th className="py-2.5 px-3">{lang === 'ar' ? 'رقم الحاوية' : 'Container'}</th>
                        <th className="py-2.5 px-3">{lang === 'ar' ? 'الحقل' : 'Field'}</th>
                        <th className="py-2.5 px-3">{lang === 'ar' ? 'النوع' : 'Severity'}</th>
                        <th className="py-2.5 px-3">{lang === 'ar' ? 'تفاصيل الملاحظة والإجراء المطلوب' : 'Issue & Action'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredIssues.map((item, idx) => (
                        <tr
                          key={idx}
                          className={`transition ${
                            item.severity === 'error'
                              ? 'bg-rose-50/40 hover:bg-rose-50/70'
                              : 'bg-white hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2 px-3 font-semibold text-slate-700">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.dir === 'Import'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {item.dir === 'Import' ? 'وارد' : 'صادر'}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-800">
                            صف {item.rowNumber}
                          </td>
                          <td className="py-2 px-3 font-mono font-medium text-slate-800">
                            {item.ref || '—'}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-700">
                            {item.cntr ? (
                              <span className="font-semibold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                                {item.cntr}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">غير محدد</span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-800">
                            {item.field}
                          </td>
                          <td className="py-2 px-3">
                            {item.severity === 'error' ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                                <ShieldAlert size={11} />
                                خطأ حرج
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                <AlertTriangle size={11} />
                                تنبيه
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 max-w-md">
                            <div className="font-medium text-slate-900">{item.message}</div>
                            {item.action && (
                              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                <span className="text-blue-600 font-bold">الحل:</span>
                                <span>{item.action}</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer Action Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 px-6 py-3.5 bg-slate-50 shrink-0">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleExportReport}
                  disabled={issues.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-40"
                >
                  <Download size={14} className="text-slate-500" />
                  {lang === 'ar' ? 'تصدير تقرير الملاحظات (Excel)' : 'Export Issues Report (Excel)'}
                </button>

                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
                >
                  {lang === 'ar' ? 'رفع ملف آخر' : 'Upload another file'}
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>

                {/* Option 1: Preview as draft in table */}
                <button
                  type="button"
                  onClick={() => handleConfirmImport(stats.errorCount > 0, false)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                  title={lang === 'ar' ? 'عرض البيانات في الجدول كمسودة للمراجعة والتعديل قبل الحفظ' : 'Preview as draft in table'}
                >
                  <FileSpreadsheet size={14} className="text-slate-500" />
                  <span>{lang === 'ar' ? 'معاينة في الجدول' : 'Preview as Draft'}</span>
                </button>

                {/* Option 2: Save directly to SQL Server Database */}
                <button
                  type="button"
                  onClick={() => handleConfirmImport(stats.errorCount > 0, true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md transition hover:bg-emerald-700 active:scale-95"
                  title={lang === 'ar' ? 'حفظ البيانات مباشرة في جداول قاعدة البيانات SQL Server' : 'Save directly into database'}
                >
                  <Database size={15} />
                  <span>
                    {lang === 'ar'
                      ? `حفظ في قاعدة البيانات (${stats.errorCount > 0 ? stats.validCount : stats.totalRows} صف)`
                      : `Save to Database (${stats.errorCount > 0 ? stats.validCount : stats.totalRows})`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
