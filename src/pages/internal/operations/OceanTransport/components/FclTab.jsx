import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Check,
  Box,
  RotateCcw,
  Search,
  Lock,
  Sparkles,
  Layers,
  Container,
} from 'lucide-react';
import { FCL_RULES, MASTER_DEFAULTS, CONTAINER_TYPES } from '../constants';
import { fmtDay } from '../tptEngine';

// Helper to get user-friendly container type label from CONTAINER_TYPES
export const getContainerSizeLabel = (val) => {
  if (!val) return '';
  const found = CONTAINER_TYPES.find(
    (c) => c.value.toLowerCase() === String(val).toLowerCase() ||
           c.label.toLowerCase() === String(val).toLowerCase()
  );
  return found ? found.label : String(val);
};

// Visual themes for distinguishing different import container groups
const GROUP_THEMES = [
  {
    border: 'border-blue-300 shadow-blue-500/10',
    accentBorder: 'border-s-4 border-s-blue-600',
    headerBg: 'bg-gradient-to-r from-blue-50/90 via-sky-50/50 to-white',
    numberBadge: 'bg-blue-600 text-white shadow-blue-500/25',
    countBadge: 'bg-blue-100 text-blue-900 border-blue-200',
    containerTag: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  {
    border: 'border-emerald-300 shadow-emerald-500/10',
    accentBorder: 'border-s-4 border-s-emerald-600',
    headerBg: 'bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-white',
    numberBadge: 'bg-emerald-600 text-white shadow-emerald-500/25',
    countBadge: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    containerTag: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  {
    border: 'border-purple-300 shadow-purple-500/10',
    accentBorder: 'border-s-4 border-s-purple-600',
    headerBg: 'bg-gradient-to-r from-purple-50/90 via-indigo-50/50 to-white',
    numberBadge: 'bg-purple-600 text-white shadow-purple-500/25',
    countBadge: 'bg-purple-100 text-purple-900 border-purple-200',
    containerTag: 'bg-purple-50 text-purple-800 border-purple-200',
  },
  {
    border: 'border-amber-300 shadow-amber-500/10',
    accentBorder: 'border-s-4 border-s-amber-600',
    headerBg: 'bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-white',
    numberBadge: 'bg-amber-600 text-white shadow-amber-500/25',
    countBadge: 'bg-amber-100 text-amber-900 border-amber-200',
    containerTag: 'bg-amber-50 text-amber-800 border-amber-200',
  },
];

export default function FclTab({
  matches = [],
  allData = [],
  lookups = {},
  approvedList = [],
  onApproveMatch,
  lang = 'en',
}) {
  // Navigation: 'pending' (Recommendations) vs 'approved' (Approved Allocations)
  const [subView, setSubView] = useState('pending');

  // Animation state for approval focus and fade-out
  // approvingState = { matchId: string, groupKey: string, isFading: boolean, isSaving: boolean }
  const [approvingState, setApprovingState] = useState(null);

  const handleApproveClick = async (match, groupKey) => {
    // 1. Immediately hide all other matches for this container group, focus on this match!
    setApprovingState({
      matchId: match.id,
      groupKey: groupKey,
      isFading: false,
      isSaving: true,
    });

    try {
      if (onApproveMatch) {
        await onApproveMatch(match);
      }
    } catch (e) {
      console.error('Approve error:', e);
    }

    setApprovingState((prev) => (prev ? { ...prev, isSaving: false } : null));

    // 2. Keep focused for 1.5 seconds, then trigger fade-out transition
    setTimeout(() => {
      setApprovingState((prev) => (prev ? { ...prev, isFading: true } : null));
    }, 1500);

    // 3. Clear approving state after fade-out transition (2.1s total)
    setTimeout(() => {
      setApprovingState(null);
    }, 2100);
  };

  // Filters for Pending Recommendations
  const [filterLine, setFilterLine] = useState('ALL');
  const [filterSize, setFilterSize] = useState('ALL');
  const [filterPort, setFilterPort] = useState('ALL');
  const [filterMode, setFilterMode] = useState('rec_only');
  const [selectedImportKey, setSelectedImportKey] = useState('ALL');

  // Filters for Approved Allocations
  const [apprSearch, setApprSearch] = useState('');

  // Dynamic & comprehensive filter options extracted exclusively across available candidate matches
  const options = useMemo(() => {
    const lines = new Set();
    const ports = new Set();
    const sizeMap = new Map();

    (matches || []).forEach((m) => {
      if (m.im?.line?.trim()) lines.add(m.im.line.trim());
      if (m.ex?.line?.trim()) lines.add(m.ex.line.trim());

      const imSize = m.im?.size?.trim();
      const exSize = m.ex?.size?.trim();
      [imSize, exSize].forEach((sz) => {
        if (sz && sz.toUpperCase() !== 'LCL') {
          const label = getContainerSizeLabel(sz);
          if (!sizeMap.has(sz)) {
            sizeMap.set(sz, { value: sz, label });
          }
        }
      });

      if (m.im?.pod?.trim()) ports.add(m.im.pod.trim());
      if (m.ex?.pol?.trim()) ports.add(m.ex.pol.trim());
    });

    const sizes = Array.from(sizeMap.values()).sort((a, b) => a.label.localeCompare(b.label));

    return {
      lines: Array.from(lines).filter(Boolean).sort((a, b) => a.localeCompare(b)),
      sizes,
      ports: Array.from(ports).filter(Boolean).sort((a, b) => a.localeCompare(b)),
    };
  }, [matches]);

  // Matching helper functions
  const portMatches = (rowPort, target) => {
    if (!target || target === 'ALL') return true;
    if (!rowPort) return false;
    return rowPort.trim().toLowerCase() === target.trim().toLowerCase();
  };

  const sizeMatches = (rowSize, target) => {
    if (!target || target === 'ALL') return true;
    if (!rowSize) return false;
    if (rowSize === target) return true;
    const l1 = getContainerSizeLabel(rowSize).toLowerCase();
    const l2 = getContainerSizeLabel(target).toLowerCase();
    return l1 === l2;
  };

  // 1. Filtered Matches for Pending Recommendations
  const filteredMatches = useMemo(() => {
    return (matches || []).filter((m) => {
      if (filterMode === 'rec_only' && !m.score?.recommended) return false;
      if (filterLine !== 'ALL' && m.im?.line !== filterLine && m.ex?.line !== filterLine) return false;
      if (!sizeMatches(m.im?.size, filterSize)) return false;
      if (filterPort !== 'ALL') {
        const imPod = portMatches(m.im?.pod, filterPort);
        const exPol = portMatches(m.ex?.pol, filterPort);
        if (!imPod && !exPol) return false;
      }
      return true;
    });
  }, [matches, filterLine, filterSize, filterPort, filterMode]);

  // Group Matches by Import Container so each import container has a dedicated group
  const matchesByImportContainer = useMemo(() => {
    const groups = [];
    const map = new Map();

    (filteredMatches || []).forEach((m) => {
      const im = m.im;
      const key = `${im?.cntr || 'NO_CNTR'}|${im?.bl || 'NO_BL'}`;
      if (!map.has(key)) {
        const group = {
          key,
          im,
          matches: [],
        };
        map.set(key, group);
        groups.push(group);
      }
      map.get(key).matches.push(m);
    });

    return groups;
  }, [filteredMatches]);

  // Filter groups by selected import container if specified
  const displayedGroups = useMemo(() => {
    if (selectedImportKey === 'ALL') return matchesByImportContainer;
    return matchesByImportContainer.filter((g) => g.key === selectedImportKey);
  }, [matchesByImportContainer, selectedImportKey]);

  // Count near matches for smart guidance
  const nearCountForFilter = useMemo(() => {
    return (matches || []).filter((m) => {
      if (!m.score?.isNearMatch) return false;
      if (filterLine !== 'ALL' && m.im?.line !== filterLine && m.ex?.line !== filterLine) return false;
      if (!sizeMatches(m.im?.size, filterSize)) return false;
      if (filterPort !== 'ALL') {
        const imPod = portMatches(m.im?.pod, filterPort);
        const exPol = portMatches(m.ex?.pol, filterPort);
        if (!imPod && !exPol) return false;
      }
      return true;
    }).length;
  }, [matches, filterLine, filterSize, filterPort]);

  const hasActiveFilters =
    filterLine !== 'ALL' ||
    filterSize !== 'ALL' ||
    filterPort !== 'ALL' ||
    filterMode !== 'rec_only' ||
    selectedImportKey !== 'ALL';

  const resetFilters = () => {
    setFilterLine('ALL');
    setFilterSize('ALL');
    setFilterPort('ALL');
    setFilterMode('rec_only');
    setSelectedImportKey('ALL');
  };

  // Metrics for Pending
  const recommendedCount = useMemo(() => filteredMatches.filter((m) => m.score?.recommended).length, [filteredMatches]);
  const nearCount = useMemo(() => filteredMatches.filter((m) => m.score?.isNearMatch).length, [filteredMatches]);
  const coveredImports = useMemo(() => new Set(filteredMatches.map((m) => m.im?.cntr)).size, [filteredMatches]);
  const coveredExports = useMemo(() => new Set(filteredMatches.map((m) => m.ex?.booking)).size, [filteredMatches]);

  // 2. Filtered Approved Allocations
  const filteredApprovedList = useMemo(() => {
    return (approvedList || []).filter((item) => {
      if (apprSearch && apprSearch.trim()) {
        const q = apprSearch.trim().toLowerCase();
        const cntr = (item.im?.cntr || '').toLowerCase();
        const bk = (item.ex?.booking || '').toLowerCase();
        const bl = (item.im?.bl || '').toLowerCase();
        const cl = (item.im?.client || item.ex?.client || '').toLowerCase();
        const line = (item.im?.line || item.ex?.line || '').toLowerCase();
        if (!cntr.includes(q) && !bk.includes(q) && !bl.includes(q) && !cl.includes(q) && !line.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [approvedList, apprSearch]);

  const totalApproved = approvedList.length;
  const coveredApprovedPorts = new Set(approvedList.map((a) => a.im?.pod || a.ex?.pol).filter(Boolean)).size;

  return (
    <div className="space-y-4">
      {/* 1. FCL Intro & 6 Rules Banner */}
      <div className="fcl-intro">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {lang === 'ar' ? 'إعادة تدوير الحاويات (FCL)' : 'FCL · Full Container Load'}
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            {lang === 'ar'
              ? 'تظهر جميع شحنات الصادر المطابقة لكل حاوية وارد في مجموعة مستقلة. اختر شحنة الصادر الأنسب لتخصيص الحاوية لها واعتمادها مباشرة في تفاصيل العمليات.'
              : 'All eligible export matches for each import container are grouped below. Select the best match to permanently assign the container to that shipment.'}
          </p>
        </div>

        <div className="fcl-rules">
          <b>{lang === 'ar' ? 'القواعد الستة خلف كل ترشيح' : 'The six rules behind every recommendation'}</b>
          <ol>
            {FCL_RULES.map((rule) => (
              <li key={rule.id}>
                <span className="fcl-rule-no">{rule.num}</span>
                <span>{lang === 'ar' ? rule.labelAr : rule.labelEn}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* 2. Sub-View Switcher Tabs (Pending vs Approved) */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setSubView('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
            subView === 'pending'
              ? 'bg-blue-600 text-white shadow-blue-500/20'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Sparkles size={14} />
          <span>{lang === 'ar' ? 'الترشيحات المقترحة' : 'Pending Recommendations'}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              subView === 'pending' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {filteredMatches.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubView('approved')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
            subView === 'approved'
              ? 'bg-emerald-600 text-white shadow-emerald-500/20'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <CheckCircle2 size={14} />
          <span>{lang === 'ar' ? 'الترشيحات المعتمدة' : 'Approved Allocations'}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              subView === 'approved' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {approvedList.length}
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* VIEW A: PENDING RECOMMENDATIONS (GROUPED BY IMPORT CONTAINER) */}
      {/* ========================================================= */}
      {subView === 'pending' && (
        <>
          {/* Main Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200 text-xs shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1.5 font-semibold text-slate-600">
                {lang === 'ar' ? 'الخط الملاحي' : 'Shipping line'}
                <select
                  value={filterLine}
                  onChange={(e) => setFilterLine(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">{lang === 'ar' ? 'كل الخطوط' : 'All lines'}</option>
                  {options.lines.map((line) => (
                    <option key={line} value={line}>{line}</option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-1.5 font-semibold text-slate-600">
                {lang === 'ar' ? 'نوع الحاوية' : 'Container type'}
                <select
                  value={filterSize}
                  onChange={(e) => setFilterSize(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">{lang === 'ar' ? 'كل المقاسات' : 'All types'}</option>
                  {options.sizes.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-1.5 font-semibold text-slate-600">
                {lang === 'ar' ? 'الميناء (وصول الوارد = شحن الصادر)' : 'Port (import POD = export POL)'}
                <select
                  value={filterPort}
                  onChange={(e) => setFilterPort(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">{lang === 'ar' ? 'كل الموانئ' : 'All ports'}</option>
                  {options.ports.map((port) => (
                    <option key={port} value={port}>{port}</option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-1.5 font-semibold text-slate-600">
                {lang === 'ar' ? 'عرض' : 'Show'}
                <select
                  value={filterMode}
                  onChange={(e) => setFilterMode(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="rec_only">{lang === 'ar' ? 'المطابق بالكامل فقط (6 من 6)' : 'Recommended only (6 of 6)'}</option>
                  <option value="all">{lang === 'ar' ? 'المطابق وشبه المطابق (5 أو 6 من 6)' : 'Recommended + Near (5 of 6)'}</option>
                </select>
              </label>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
              >
                <RotateCcw size={13} />
                <span>{lang === 'ar' ? 'إعادة ضبط الفلاتر' : 'Clear filters'}</span>
              </button>
            )}
          </div>

          {/* Quick Container Selection Pills (Tabs to filter by a specific import container) */}
          {matchesByImportContainer.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80 text-xs">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <Box size={13} />
                <span>{lang === 'ar' ? 'تحديد حاوية وارد:' : 'Filter by import container:'}</span>
              </span>

              <button
                type="button"
                onClick={() => setSelectedImportKey('ALL')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                  selectedImportKey === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {lang === 'ar'
                  ? `عرض كل الحاويات (${matchesByImportContainer.length})`
                  : `All containers (${matchesByImportContainer.length})`}
              </button>

              {matchesByImportContainer.map((group) => {
                const isActive = selectedImportKey === group.key;
                return (
                  <button
                    key={group.key}
                    type="button"
                    onClick={() => setSelectedImportKey(group.key)}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{group.im?.cntr || 'CNTR'}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        isActive ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {group.matches.length}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 4 KPI Metrics Bar */}
          <div className="fcl-metrics">
            <div className="fcl-metric rec">
              <strong className="block text-2xl font-black">{recommendedCount}</strong>
              <span className="text-xs font-semibold">
                {lang === 'ar' ? 'إجمالي الترشيحات المطابقة' : 'Recommended matches'}
              </span>
            </div>

            <div className="fcl-metric">
              <strong className="block text-2xl font-black text-slate-800">{nearCount}</strong>
              <span className="text-xs text-slate-500">
                {lang === 'ar' ? 'ترشيحات شبه مطابقة' : 'Near matches'}
              </span>
            </div>

            <div className="fcl-metric">
              <strong className="block text-2xl font-black text-emerald-700">{coveredImports}</strong>
              <span className="text-xs text-slate-500">
                {lang === 'ar' ? 'حاويات الوارد الجاهزة للتدوير' : 'Import containers available'}
              </span>
            </div>

            <div className="fcl-metric">
              <strong className="block text-2xl font-black text-blue-700">{coveredExports}</strong>
              <span className="text-xs text-slate-500">
                {lang === 'ar' ? 'شحنات الصادر المستفيدة' : 'Export shipments matched'}
              </span>
            </div>
          </div>

          {/* Empty State */}
          {displayedGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 text-center col-span-full w-full shadow-sm">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3 text-xl">
                🔍
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                {lang === 'ar' ? 'لا توجد ترشيحات مطابقة للفلاتر المحددة' : 'No recommendations match the selected filters'}
              </h3>

              {hasActiveFilters && (
                <p className="text-xs text-slate-500 mt-1.5 max-w-md">
                  {lang === 'ar' ? 'الفلاتر النشطة: ' : 'Active filters: '}
                  {[
                    filterLine !== 'ALL' && `${lang === 'ar' ? 'الخط' : 'Line'}: ${filterLine}`,
                    filterSize !== 'ALL' && `${lang === 'ar' ? 'المقاس' : 'Size'}: ${getContainerSizeLabel(filterSize)}`,
                    filterPort !== 'ALL' && `${lang === 'ar' ? 'الميناء' : 'Port'}: ${filterPort}`,
                    selectedImportKey !== 'ALL' && `${lang === 'ar' ? 'الحاوية المحددة' : 'Container'}: ${selectedImportKey}`,
                  ].filter(Boolean).join(' · ')}
                </p>
              )}

              {filterMode === 'rec_only' && nearCountForFilter > 0 ? (
                <div className="mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 max-w-md text-amber-900 text-xs">
                  <p className="font-semibold mb-2">
                    {lang === 'ar'
                      ? `💡 يوجد ${nearCountForFilter} ترشيح شبه مطابق (حقق 5 قواعد من 6) لهذه المعايير!`
                      : `💡 There are ${nearCountForFilter} near matches (met 5 of 6 rules) matching this criteria!`}
                  </p>
                  <button
                    type="button"
                    onClick={() => setFilterMode('all')}
                    className="px-3.5 py-1.5 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 shadow-sm transition"
                  >
                    {lang === 'ar' ? 'عرض الترشيحات شبه المطابقة' : 'View Near Matches'}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-400 mt-2">
                  {lang === 'ar'
                    ? 'يمكنك إعادة تعيين الفلاتر لعرض كافة الترشيحات المتاحة.'
                    : 'You can reset filters to view all available recommendations.'}
                </p>
              )}

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-4 px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  {lang === 'ar' ? 'إعادة ضبط الفلاتر (عرض الكل)' : 'Reset filters (Show all)'}
                </button>
              )}
            </div>
          ) : (
            /* Groups of Import Containers */
            <div className="space-y-6">
              {displayedGroups.map((group, groupIndex) => {
                const { im, matches: groupMatches } = group;
                const theme = GROUP_THEMES[groupIndex % GROUP_THEMES.length];
                const isThisGroupApproving = approvingState && approvingState.groupKey === group.key;

                // When approving, immediately hide all other matching cards for this import container!
                const visibleMatches = isThisGroupApproving
                  ? groupMatches.filter((m) => m.id === approvingState.matchId)
                  : groupMatches;

                return (
                  <div
                    key={group.key}
                    className={`fcl-group border-2 ${theme.border} ${theme.accentBorder} rounded-2xl p-4 transition-all duration-300 shadow-sm bg-white mb-6`}
                  >
                    {/* Header Banner for this Specific Import Container */}
                    <div className={`fcl-group-head ${theme.headerBg} rounded-xl p-3.5 border border-slate-200/80 flex items-center justify-between flex-wrap gap-4`}>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm shadow-sm ${theme.numberBadge}`}>
                          {groupIndex + 1}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                              {lang === 'ar' ? 'حاوية الوارد:' : 'Import Container:'}
                            </span>
                            <h3 className="text-base font-black text-slate-900 tracking-tight">
                              {im?.cntr || 'UNKNOWN_CONTAINER'}
                            </h3>
                            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded px-2 py-0.5">
                              {getContainerSizeLabel(im?.size) || "40'"}
                            </span>
                            <span className={`text-xs font-bold rounded-md px-2 py-0.5 border ${theme.containerTag}`}>
                              {im?.line || '-'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                            <span>
                              <b className="text-slate-600">M/BL:</b> {im?.bl || '-'}
                            </span>
                            <span>•</span>
                            <span>
                              <b className="text-slate-600">POD:</b> {im?.pod || '-'}
                            </span>
                            <span>•</span>
                            <span>
                              <b className="text-slate-600">{lang === 'ar' ? 'الموقع:' : 'Site:'}</b> {im?.dest || '-'}
                            </span>
                            <span>•</span>
                            <span>
                              <b className="text-emerald-700">{lang === 'ar' ? 'سماح حتى:' : 'Free till:'}</b>{' '}
                              {fmtDay(im?.free) || '-'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Matching Export Options Badge */}
                      <div className="flex flex-col items-end">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-xs ${theme.countBadge}`}>
                          <Sparkles size={14} className="animate-spin-slow" />
                          <span>
                            {lang === 'ar'
                              ? `متاح ${groupMatches.length} شحنة صادر مطابقة للاختيار`
                              : `${groupMatches.length} export matches available`}
                          </span>
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1">
                          {lang === 'ar'
                            ? 'اختر شحنة صادر واحدة لاعتمادها وتخصيص الحاوية لها'
                            : 'Select one export match to assign this container'}
                        </span>
                      </div>
                    </div>

                    {/* Grid of Matching Cards for this Container */}
                    <div className="fcl-cards mt-4">
                      {visibleMatches.map((match) => {
                        const { ex, score } = match;
                        const isRec = score?.recommended;
                        const isFocused = isThisGroupApproving && match.id === approvingState.matchId;
                        const isFading = isFocused && approvingState.isFading;

                        return (
                          <div
                            key={match.id}
                            className={`fcl-card transition-all duration-500 relative ${
                              isFading
                                ? 'opacity-0 scale-95 -translate-y-4 pointer-events-none'
                                : isFocused
                                ? 'ring-4 ring-emerald-500/70 ring-offset-2 border-emerald-500 bg-emerald-50/50 shadow-2xl scale-[1.02]'
                                : ''
                            }`}
                          >
                            {/* Focus Banner if this card was chosen */}
                            {isFocused && (
                              <div className="mb-3 px-3 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 shadow-sm animate-pulse">
                                <CheckCircle2 size={16} />
                                <span>
                                  {approvingState.isSaving
                                    ? (lang === 'ar' ? 'جاري تخصيص واعتماد الحاوية في قاعدة البيانات...' : 'Assigning & saving container...')
                                    : (lang === 'ar' ? '🎉 تم اختيار واعتماد هذا الاقتراح بنجاح! سيتم إغلاقه...' : '🎉 Approved & Assigned successfully!')}
                                </span>
                              </div>
                            )}

                            {/* Card Header */}
                            <div className="fcl-card-head">
                              <div className="flex items-baseline gap-2">
                                <h4>{im?.cntr || 'CNTR'}</h4>
                                <span className="text-[10px] text-slate-400 font-bold border border-slate-200 rounded px-1.5 py-0.5">
                                  {getContainerSizeLabel(im?.size) || "40'"}
                                </span>
                              </div>
                              {isRec ? (
                                <span className="fcl-badge rec">
                                  {lang === 'ar' ? '✓ مطابق · 6 من 6 قواعد' : '✓ Recommended · 6 of 6'}
                                </span>
                              ) : (
                                <span className="fcl-badge near">
                                  {lang === 'ar'
                                    ? `⚠ شبه مطابق · ${score?.passed || 5} من 6`
                                    : `⚠ Near match · ${score?.passed || 5} of 6`}
                                </span>
                              )}
                            </div>

                            {/* Side by side comparison (Import vs Export) */}
                            <div className="fcl-pair">
                              <div className="fcl-side">
                                <small>{lang === 'ar' ? 'الوارد · الحاوية' : 'IMPORT · CONTAINER'}</small>
                                <div className="fcl-row">
                                  <span>M/BL</span>
                                  <b className="truncate max-w-[175px]" title={im?.bl}>
                                    {im?.bl || '-'}
                                  </b>
                                </div>
                                <div className="fcl-row">
                                  <span>{lang === 'ar' ? 'العميل' : 'Client'}</span>
                                  <b className="truncate max-w-[175px]" title={im?.client}>
                                    {im?.client || '-'}
                                  </b>
                                </div>
                                <div className="fcl-row">
                                  <span>{lang === 'ar' ? 'الخط' : 'Line'}</span>
                                  <b>{im?.line || '-'}</b>
                                </div>
                                <div className="fcl-row">
                                  <span>POD</span>
                                  <b>{im?.pod || '-'}</b>
                                </div>
                                <div className="fcl-row">
                                  <span>{lang === 'ar' ? 'الموقع' : 'Site'}</span>
                                  <b>{im?.dest || '-'}</b>
                                </div>
                                <div className="fcl-row">
                                  <span>{lang === 'ar' ? 'تعتيق مطلوب' : 'Req offload'}</span>
                                  <div className="text-end leading-tight">
                                    <b className="block">{fmtDay(im?.reqDate)}</b>
                                    {im?.reqTime && (
                                      <span className="text-[10px] text-slate-400 block font-normal">
                                        {im.reqTime}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="fcl-row">
                                  <span>{lang === 'ar' ? 'سماح حتى' : 'Free till'}</span>
                                  <b className="text-emerald-700">{fmtDay(im?.free) || '-'}</b>
                                </div>
                              </div>

                              <div className="fcl-side border-s border-slate-200 ps-5">
                                <small>{lang === 'ar' ? 'الصادر · الشحنة' : 'EXPORT · SHIPMENT'}</small>
                                <div className="fcl-row">
                                  <span>Booking</span>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <b className="truncate max-w-[175px] text-blue-700 font-black" title={ex?.booking}>
                                      {ex?.booking || '-'}
                                    </b>
                                    {(ex?.ordinal || ex?._ordinal) && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold border border-blue-200">
                                        {lang === 'ar' ? `حاوية #${ex.ordinal || ex._ordinal}` : `Slot #${ex.ordinal || ex._ordinal}`}
                                        {ex?.vol ? ` / ${ex.vol}` : ''}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="fcl-row">
                                  <span>{lang === 'ar' ? 'العميل' : 'Client'}</span>
                                  <b className="truncate max-w-[175px]" title={ex?.client}>
                                    {ex?.client || '-'}
                                  </b>
                                </div>
                                <div className="fcl-row">
                                  <span>{lang === 'ar' ? 'الخط' : 'Line'}</span>
                                  <b>{ex?.line || '-'}</b>
                                </div>
                                <div className="fcl-row">
                                  <span>POL</span>
                                  <b>{ex?.pol || '-'}</b>
                                </div>
                                <div className="fcl-row">
                                  <span>{lang === 'ar' ? 'الموقع' : 'Site'}</span>
                                  <b>{ex?.dest || '-'}</b>
                                </div>
                                <div className="fcl-row">
                                  <span>{lang === 'ar' ? 'تحميل مطلوب' : 'Req load'}</span>
                                  <div className="text-end leading-tight">
                                    <b className="text-blue-700 block">{fmtDay(ex?.reqDate)}</b>
                                    {ex?.reqTime && (
                                      <span className="text-[10px] text-slate-400 block font-normal">
                                        {ex.reqTime}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="fcl-row">
                                  <span>Cut off</span>
                                  <b>{fmtDay(ex?.cut) || '-'}</b>
                                </div>
                              </div>
                            </div>

                            {/* Margins */}
                            <div className="fcl-margins">
                              <span>
                                {lang === 'ar' ? 'فارق التعتيق: ' : 'Lead time: '}
                                <b>+{score?.leadH ?? 0} h</b>
                              </span>
                              <span>
                                {lang === 'ar' ? 'هامش فترة السماح: ' : 'Free-time buffer: '}
                                <b>+{score?.freeMarginH ?? 0} h</b>
                              </span>
                            </div>

                            {/* Checklist */}
                            <ul className="fcl-checks">
                              {FCL_RULES.map((rule) => {
                                const passed = score?.checks ? !!score.checks[rule.id] : true;
                                return (
                                  <li key={rule.id} className={passed ? '' : 'fail'}>
                                    <i>{passed ? '✓' : '✕'}</i>
                                    <span className={passed ? '' : 'line-through opacity-75'}>
                                      {lang === 'ar' ? rule.labelAr : rule.labelEn}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>

                            {/* Card Action: Single Approve Button */}
                            <div className="fcl-actions flex items-center justify-between gap-3">
                              <span className="text-[10px] text-slate-400">
                                {lang === 'ar'
                                  ? 'اعتماد وتخصيص رسمي للشحنة (سيتم استهلاك الحاوية)'
                                  : 'Permanent assignment to this booking'}
                              </span>

                              <button
                                type="button"
                                disabled={isFocused}
                                onClick={() => handleApproveClick(match, group.key)}
                                className={`px-5 py-2 text-xs font-bold rounded-xl transition shadow-sm whitespace-nowrap flex items-center gap-1.5 ${
                                  isFocused
                                    ? 'bg-emerald-800 text-white cursor-default'
                                    : 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer active:scale-95'
                                }`}
                                title={
                                  lang === 'ar'
                                    ? 'اعتماد وتخصيص نهائي للحاوية لشحنة الصادر دي'
                                    : 'Approve and assign container to this export shipment'
                                }
                              >
                                <Check size={14} className={isFocused ? 'animate-bounce' : ''} />
                                <span>
                                  {isFocused
                                    ? (lang === 'ar' ? 'تم الاعتماد ✓' : 'Approved ✓')
                                    : (lang === 'ar' ? 'اعتماد (Approve)' : 'Approve')}
                                </span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ========================================================= */}
      {/* VIEW B: APPROVED ALLOCATIONS (السجل الدائم للمعتمدات)      */}
      {/* ========================================================= */}
      {subView === 'approved' && (
        <>
          {/* Filter & Search Bar for Approved */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200 text-xs shadow-sm">
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative w-full max-w-lg">
                <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={apprSearch}
                  onChange={(e) => setApprSearch(e.target.value)}
                  placeholder={lang === 'ar' ? 'بحث بالحاوية، البوكينج، البوليصة...' : 'Search container, booking, M/BL...'}
                  className="w-full ps-9 pe-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm"
                />
              </div>

              {apprSearch && (
                <button
                  type="button"
                  onClick={() => setApprSearch('')}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition"
                >
                  {lang === 'ar' ? 'مسح البحث' : 'Clear search'}
                </button>
              )}
            </div>

            <span className="text-xs text-slate-400">
              {lang === 'ar' ? 'سجل العمليات المعتمدة والمخصصة نهائياً' : 'Audited record of all committed container allocations'}
            </span>
          </div>

          {/* Metrics */}
          <div className="fcl-metrics">
            <div className="fcl-metric rec">
              <strong className="block text-2xl font-black">{totalApproved}</strong>
              <span className="text-xs font-semibold">
                {lang === 'ar' ? 'إجمالي الحاويات المعتمدة' : 'Total containers approved'}
              </span>
            </div>

            <div className="fcl-metric">
              <strong className="block text-2xl font-black text-blue-700">{totalApproved}</strong>
              <span className="text-xs text-slate-500">
                {lang === 'ar' ? 'تخصيص نهائي في العمليات' : 'Assigned in operations'}
              </span>
            </div>

            <div className="fcl-metric">
              <strong className="block text-2xl font-black text-slate-800">{coveredApprovedPorts}</strong>
              <span className="text-xs text-slate-500">
                {lang === 'ar' ? 'موانئ التدوير المغطاة' : 'Ports covered'}
              </span>
            </div>

            <div className="fcl-metric">
              <strong className="block text-2xl font-black text-emerald-700">100%</strong>
              <span className="text-xs text-slate-500">
                {lang === 'ar' ? 'كفاءة الربط' : 'Allocation efficiency'}
              </span>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="fcl-cards">
            {filteredApprovedList.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 text-center col-span-full w-full shadow-sm">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3 text-xl">
                  ✓
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  {lang === 'ar' ? 'لا توجد ترشيحات معتمدة بعد' : 'No approved allocations yet'}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  {lang === 'ar'
                    ? 'عندما تضغط على Approve لأي ترشيح، سيتم تخصيص الحاوية وحفظها نهائياً وسيظهر السجل هنا.'
                    : 'When you approve a recommendation, it will be saved permanently and logged here.'}
                </p>
                <button
                  type="button"
                  onClick={() => setSubView('pending')}
                  className="mt-4 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
                >
                  {lang === 'ar' ? 'الذهاب للترشيحات المقترحة' : 'Go to Recommendations'}
                </button>
              </div>
            ) : (
              filteredApprovedList.map((item) => {
                const formattedDate = item.approvedAt ? new Date(item.approvedAt).toLocaleString() : '';

                return (
                  <div key={item.id || item.pairKey} className="fcl-card !border-blue-600">
                    {/* Header */}
                    <div className="fcl-card-head">
                      <div className="flex items-baseline gap-2">
                        <h4>{item.im?.cntr || 'CNTR'}</h4>
                        <span className="text-[10px] text-slate-400 font-bold border border-slate-200 rounded px-1.5 py-0.5">
                          {getContainerSizeLabel(item.im?.size) || "40'"}
                        </span>
                      </div>

                      <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                        <Lock size={11} />
                        <span>{lang === 'ar' ? 'معتمد ومخصص (Assigned)' : 'Committed & Assigned'}</span>
                      </span>
                    </div>

                    {/* Side by side pairing */}
                    <div className="fcl-pair">
                      <div className="fcl-side">
                        <small>{lang === 'ar' ? 'الوارد · الحاوية' : 'IMPORT · CONTAINER'}</small>
                        <div className="fcl-row">
                          <span>M/BL</span>
                          <b className="truncate max-w-[175px]" title={item.im?.bl}>
                            {item.im?.bl || '-'}
                          </b>
                        </div>
                        <div className="fcl-row">
                          <span>{lang === 'ar' ? 'العميل' : 'Client'}</span>
                          <b className="truncate max-w-[175px]" title={item.im?.client}>
                            {item.im?.client || '-'}
                          </b>
                        </div>
                        <div className="fcl-row">
                          <span>{lang === 'ar' ? 'الخط' : 'Line'}</span>
                          <b>{item.im?.line || '-'}</b>
                        </div>
                        <div className="fcl-row">
                          <span>POD</span>
                          <b>{item.im?.pod || '-'}</b>
                        </div>
                        <div className="fcl-row">
                          <span>{lang === 'ar' ? 'الموقع' : 'Site'}</span>
                          <b>{item.im?.dest || '-'}</b>
                        </div>
                        <div className="fcl-row">
                          <span>{lang === 'ar' ? 'تعتيق مطلوب' : 'Req offload'}</span>
                          <div className="text-end leading-tight">
                            <b className="block">{fmtDay(item.im?.reqDate)}</b>
                            {item.im?.reqTime && (
                              <span className="text-[10px] text-slate-400 block font-normal">
                                {item.im.reqTime}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="fcl-row">
                          <span>{lang === 'ar' ? 'سماح حتى' : 'Free till'}</span>
                          <b className="text-emerald-700">{fmtDay(item.im?.free) || '-'}</b>
                        </div>
                      </div>

                      <div className="fcl-side border-s border-slate-200 ps-5">
                        <small>{lang === 'ar' ? 'الصادر · الشحنة' : 'EXPORT · SHIPMENT'}</small>
                        <div className="fcl-row">
                          <span>Booking</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <b className="truncate max-w-[175px] text-blue-700 font-black" title={item.ex?.booking}>
                              {item.ex?.booking || '-'}
                            </b>
                            {(item.ex?.ordinal || item.ex?._ordinal) && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold border border-blue-200">
                                {lang === 'ar' ? `حاوية #${item.ex.ordinal || item.ex._ordinal}` : `Slot #${item.ex.ordinal || item.ex._ordinal}`}
                                {item.ex?.vol ? ` / ${item.ex.vol}` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="fcl-row">
                          <span>{lang === 'ar' ? 'العميل' : 'Client'}</span>
                          <b className="truncate max-w-[175px]" title={item.ex?.client}>
                            {item.ex?.client || '-'}
                          </b>
                        </div>
                        <div className="fcl-row">
                          <span>{lang === 'ar' ? 'الخط' : 'Line'}</span>
                          <b>{item.ex?.line || '-'}</b>
                        </div>
                        <div className="fcl-row">
                          <span>POL</span>
                          <b>{item.ex?.pol || '-'}</b>
                        </div>
                        <div className="fcl-row">
                          <span>{lang === 'ar' ? 'الموقع' : 'Site'}</span>
                          <b>{item.ex?.dest || '-'}</b>
                        </div>
                        <div className="fcl-row">
                          <span>{lang === 'ar' ? 'تحميل مطلوب' : 'Req load'}</span>
                          <div className="text-end leading-tight">
                            <b className="text-blue-700 block">{fmtDay(item.ex?.reqDate)}</b>
                            {item.ex?.reqTime && (
                              <span className="text-[10px] text-slate-400 block font-normal">
                                {item.ex.reqTime}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="fcl-row">
                          <span>Cut off</span>
                          <b>{fmtDay(item.ex?.cut) || '-'}</b>
                        </div>
                      </div>
                    </div>

                    {/* Margins */}
                    <div className="fcl-margins">
                      <span>
                        {lang === 'ar' ? 'فارق التعتيق: ' : 'Lead time: '}
                        <b>+{item.score?.leadH ?? 0} h</b>
                      </span>
                      <span>
                        {lang === 'ar' ? 'هامش فترة السماح: ' : 'Free-time buffer: '}
                        <b>+{item.score?.freeMarginH ?? 0} h</b>
                      </span>
                    </div>

                    {/* Footer without Unapprove button (Permanent Assignment) */}
                    <div className="fcl-actions flex items-center justify-between gap-3">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-blue-700 flex items-center gap-1">
                          <Lock size={12} />
                          <span>{lang === 'ar' ? 'تم التخصيص النهائي للشحنة في العمليات' : 'Permanently Assigned'}</span>
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {lang === 'ar'
                            ? `مرتبط رسمياً بالبوكينج (${item.ex?.booking || '-'}) · ${formattedDate}`
                            : `Bound to booking (${item.ex?.booking || '-'}) · ${formattedDate}`}
                        </span>
                      </div>

                      <span className="px-3 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                        {lang === 'ar' ? '✓ تم التخصيص' : 'Assigned'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
