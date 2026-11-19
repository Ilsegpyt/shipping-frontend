import { useEffect, useRef, useState, useCallback } from 'react';
import { createFtlDashboardEngine } from '../engine/ftlDashboardEngine.js';
import api from '../../../../../services/api';
import '../styles/ftl-dashboard.css';

export default function FtlDashboardView({
  language = 'en',
  theme = 'light',
  onLanguageChange,
  onThemeChange,
  className = '',
  style = {}
}) {
  const hostRef = useRef(null);
  const engineRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRealData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let shipments = [];

      // 1. Try /api/v1/ftl/workspace (canonical workspace endpoint)
      try {
        const res = await api.get('/api/v1/ftl/workspace');
        if (res?.data?.shipments && Array.isArray(res.data.shipments)) {
          shipments = res.data.shipments;
        } else if (Array.isArray(res?.data)) {
          shipments = res.data;
        }
      } catch (err) {
        console.warn('[FTL Dashboard] /api/v1/ftl/workspace failed, trying fallback...', err);
        // 2. Fallback to /api/operations/ftl
        const res = await api.get('/api/operations/ftl');
        if (res?.data?.shipments && Array.isArray(res.data.shipments)) {
          shipments = res.data.shipments;
        } else if (Array.isArray(res?.data)) {
          shipments = res.data;
        }
      }

      if (engineRef.current) {
        engineRef.current.loadShipments(shipments);
      }
    } catch (err) {
      console.error('[FTL Dashboard] Failed to load operations data:', err);
      setError(err?.message || (language === 'ar' ? 'فشل تحميل بيانات العمليات' : 'Failed to load operations data'));
    } finally {
      setLoading(false);
    }
  }, [language]);

  // Mount engine on container
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const root = document.createElement('div');
    host.appendChild(root);

    let engine;
    try {
      engine = createFtlDashboardEngine(root, {
        language,
        theme,
        onEvent(type, detail) {
          if (type === 'language') {
            onLanguageChange?.(detail);
          } else if (type === 'theme') {
            onThemeChange?.(detail);
          } else if (type === 'reload') {
            fetchRealData();
          }
        }
      });
      engineRef.current = engine;
    } catch (err) {
      console.error('[FTL Dashboard] Engine initialization failed:', err);
      setError(err?.message || 'Failed to initialize dashboard engine');
      return;
    }

    // Initial data fetch
    fetchRealData();

    return () => {
      if (engine) {
        try { engine.destroy(); } catch (e) { console.error(e); }
      }
      engineRef.current = null;
      root.remove();
    };
  }, []);

  // Update language when prop changes
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setLanguage(language);
    }
  }, [language]);

  // Update theme when prop changes
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setTheme(theme);
    }
  }, [theme]);

  return (
    <div className={`ftl-dashboard-view-wrapper w-full relative ${className}`} style={style}>
      {loading && (
        <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm z-30 flex items-center justify-center min-h-[300px] transition-all">
          <div className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="w-9 h-9 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {language === 'ar' ? 'جاري تحميل وحساب بيانات الداشبورد...' : 'Loading and calculating live dashboard data...'}
            </span>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 mb-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300 text-sm font-medium">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button
            onClick={fetchRealData}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition"
          >
            {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      )}

      <div ref={hostRef} className="w-full" />
    </div>
  );
}
