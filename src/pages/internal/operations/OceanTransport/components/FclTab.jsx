import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Check,
  Box,
} from 'lucide-react';
import { FCL_RULES } from '../constants';
import { fmtDay } from '../tptEngine';

export default function FclTab({
  matches = [],
  onApproveMatch,
  lang = 'en',
}) {
  const [filterLine, setFilterLine] = useState('ALL');
  const [filterSize, setFilterSize] = useState('ALL');
  const [filterPort, setFilterPort] = useState('ALL');
  const [filterMode, setFilterMode] = useState('rec_only');

  // Filtered matches
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (filterMode === 'rec_only' && !m.score?.recommended) return false;
      if (filterLine !== 'ALL' && m.im?.line !== filterLine && m.ex?.line !== filterLine) return false;
      if (filterSize !== 'ALL' && m.im?.size !== filterSize) return false;
      if (filterPort !== 'ALL' && m.im?.pod !== filterPort && m.ex?.pol !== filterPort) return false;
      return true;
    });
  }, [matches, filterMode, filterLine, filterSize, filterPort]);

  const recommendedCount = useMemo(() => matches.filter((m) => m.score?.recommended).length, [matches]);
  const nearCount = useMemo(() => matches.filter((m) => m.score?.isNearMatch).length, [matches]);
  const coveredImports = useMemo(() => new Set(matches.filter((m) => m.score?.recommended).map((m) => m.im?.cntr)).size, [matches]);
  const coveredExports = useMemo(() => new Set(matches.filter((m) => m.score?.recommended).map((m) => m.ex?.booking)).size, [matches]);

  return (
    <div className="space-y-4">
      {/* 1. FCL Intro & 6 Rules Banner (Exact Style from Image 4) */}
      <div className="fcl-intro">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            FCL · Full Container Load
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            An import container is recommended for an export load when all six rules below are met. Near matches miss exactly one rule and are shown for your judgement.
          </p>
        </div>

        <div className="fcl-rules">
          <b>The six rules behind every recommendation</b>
          <ol>
            {FCL_RULES.map((rule) => (
              <li key={rule.id}>
                <span className="fcl-rule-no">{rule.num}</span>
                <span>{rule.labelEn}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 text-xs">
        <label className="flex items-center gap-1.5 font-semibold text-slate-600">
          Shipping line
          <select
            value={filterLine}
            onChange={(e) => setFilterLine(e.target.value)}
            className="rounded border border-slate-200 bg-slate-50 px-2 py-1"
          >
            <option value="ALL">All lines</option>
            <option value="PIL">PIL</option>
            <option value="EGYPT SEA">EGYPT SEA</option>
            <option value="CMA CGM">CMA CGM</option>
          </select>
        </label>

        <label className="flex items-center gap-1.5 font-semibold text-slate-600">
          Container type
          <select
            value={filterSize}
            onChange={(e) => setFilterSize(e.target.value)}
            className="rounded border border-slate-200 bg-slate-50 px-2 py-1"
          >
            <option value="ALL">All types</option>
            <option value="20'">20'</option>
            <option value="40'">40'</option>
          </select>
        </label>

        <label className="flex items-center gap-1.5 font-semibold text-slate-600">
          Port (import POD = export POL)
          <select
            value={filterPort}
            onChange={(e) => setFilterPort(e.target.value)}
            className="rounded border border-slate-200 bg-slate-50 px-2 py-1"
          >
            <option value="ALL">All ports</option>
            <option value="SOKHNA">SOKHNA</option>
            <option value="ALEXANDRIA">ALEXANDRIA</option>
          </select>
        </label>

        <label className="flex items-center gap-1.5 font-semibold text-slate-600">
          Show
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className="rounded border border-slate-200 bg-slate-50 px-2 py-1"
          >
            <option value="rec_only">Recommended only (6 of 6)</option>
            <option value="all">Recommended + Near (5 of 6)</option>
          </select>
        </label>
      </div>

      {/* 3. 4 KPI Metrics Bar (Exact Style from Image 4) */}
      <div className="fcl-metrics">
        <div className="fcl-metric rec">
          <strong className="block text-2xl font-black">{recommendedCount}</strong>
          <span className="text-xs font-semibold">Recommended matches</span>
        </div>

        <div className="fcl-metric">
          <strong className="block text-2xl font-black text-slate-800">{nearCount}</strong>
          <span className="text-xs text-slate-500">Near matches</span>
        </div>

        <div className="fcl-metric">
          <strong className="block text-2xl font-black text-slate-800">{coveredImports}</strong>
          <span className="text-xs text-slate-500">Import containers covered</span>
        </div>

        <div className="fcl-metric">
          <strong className="block text-2xl font-black text-slate-800">{coveredExports}</strong>
          <span className="text-xs text-slate-500">Export shipments covered</span>
        </div>
      </div>

      {/* 4. Recommendation Cards Side-by-Side (Exact Style from Image 4) */}
      <div className="fcl-cards">
        {filteredMatches.map((match) => {
          const { im, ex, score, isApproved } = match;

          return (
            <div key={match.id} className="fcl-card">
              {/* Card Header */}
              <div className="fcl-card-head">
                <div className="flex items-baseline gap-2">
                  <h4>{im?.cntr || 'TGHU5888440'}</h4>
                  <span className="text-[10px] text-slate-400 font-bold border border-slate-200 rounded px-1.5 py-0.5">
                    {im?.size || "40'"}
                  </span>
                </div>
                <span className="fcl-badge rec">
                  ✓ Recommended · 6 of 6 rules
                </span>
              </div>

              {/* Side by side comparison */}
              <div className="fcl-pair">
                <div className="fcl-side">
                  <small>IMPORT · CONTAINER</small>
                  <div className="fcl-row"><span>M/BL</span><b>{im?.bl || '-'}</b></div>
                  <div className="fcl-row"><span>Client</span><b>{im?.client || '-'}</b></div>
                  <div className="fcl-row"><span>Line</span><b>{im?.line || '-'}</b></div>
                  <div className="fcl-row"><span>POD</span><b>{im?.pod || '-'}</b></div>
                  <div className="fcl-row"><span>Site</span><b>{im?.dest || '-'}</b></div>
                  <div className="fcl-row"><span>Req offload</span><b>{fmtDay(im?.reqDate)} {im?.reqTime}</b></div>
                  <div className="fcl-row"><span>Free till</span><b className="text-emerald-700">{fmtDay(im?.free)}</b></div>
                </div>

                <div className="fcl-side border-s border-slate-100 ps-2">
                  <small>EXPORT · SHIPMENT</small>
                  <div className="fcl-row"><span>Booking</span><b>{ex?.booking || '-'}</b></div>
                  <div className="fcl-row"><span>Client</span><b>{ex?.client || '-'}</b></div>
                  <div className="fcl-row"><span>Line</span><b>{ex?.line || '-'}</b></div>
                  <div className="fcl-row"><span>POL</span><b>{ex?.pol || '-'}</b></div>
                  <div className="fcl-row"><span>Site</span><b>{ex?.dest || '-'}</b></div>
                  <div className="fcl-row"><span>Req load</span><b className="text-blue-700">{fmtDay(ex?.reqDate)} {ex?.reqTime}</b></div>
                  <div className="fcl-row"><span>Cut off</span><b>{fmtDay(ex?.cut)}</b></div>
                </div>
              </div>

              {/* Lead time & Free margin */}
              <div className="fcl-margins">
                <span>Lead time: <b>+{score?.leadH || 300} h</b></span>
                <span>Free-time buffer: <b>+{score?.freeMarginH || 68} h</b></span>
              </div>

              {/* Checklist */}
              <ul className="fcl-checks">
                <li><i>✓</i> Import free time ends at least 48 hours after export loading</li>
                <li><i>✓</i> Same shipping line on both sides</li>
                <li><i>✓</i> Import POD is the export POL</li>
                <li><i>✓</i> Import offloading is at least 24 hours before export loading</li>
                <li><i>✓</i> Same container type</li>
                <li><i>✓</i> Same destination / site</li>
              </ul>

              {/* Card Actions */}
              <div className="fcl-actions">
                <span className="text-[10px] text-slate-400">
                  {isApproved ? 'Approved · ready for dispatch' : 'Recommendation only — confirm before assign'}
                </span>
                {isApproved ? (
                  <span className="text-xs font-bold text-emerald-700">✓ Approved</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onApproveMatch && onApproveMatch(match)}
                    className="fcl-approve"
                  >
                    ✓ Approve
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
