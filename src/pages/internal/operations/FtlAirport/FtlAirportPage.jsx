import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import FtlDashboard from './components/FtlDashboard';
import { createLiveApi } from './api/liveApi';
import { useAuth } from '../../../../auth/AuthContext';

export default function FtlAirportPage({ defaultView = 'dashboard' }) {
  const { user } = useAuth();
  const dashboardRef = useRef(null);
  const isReadyRef = useRef(false);

  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem('operations_lang') || 'en';
    } catch {
      return 'en';
    }
  });
  const [theme, setTheme] = useState('light');

  const api = useMemo(() => {
    const displayName =
      user?.fullName ||
      user?.displayName ||
      user?.name ||
      user?.userName ||
      user?.email ||
      'ILS Operator';

    const userId = user?.id || 'u-ops-1';

    const canReopen = Boolean(
      user?.isSuperAdmin ||
      user?.role === 'SuperAdmin' ||
      user?.roleName === 'Super Admin' ||
      user?.roleName === 'Ocean Operations Manager' ||
      user?.permissions?.includes('operations.reopen')
    );

    const canDelete = Boolean(
      user?.isSuperAdmin ||
      user?.role === 'SuperAdmin' ||
      user?.roleName === 'Super Admin' ||
      user?.permissions?.includes('operations.delete')
    );

    return createLiveApi({
      user: { id: userId, displayName },
      permissions: {
        reopen_shipments: canReopen,
        delete_shipments: canDelete,
      },
    });
  }, [user]);

  // Handle switching views when URL route changes (/ftl/dashboard vs /ftl/entry)
  useEffect(() => {
    if (!isReadyRef.current || !dashboardRef.current) return;

    if (defaultView === 'entry') {
      dashboardRef.current.showDataEntry();
    } else if (defaultView === 'dashboard') {
      dashboardRef.current.showDashboard();
    }
  }, [defaultView]);

  const handleReady = useCallback(() => {
    isReadyRef.current = true;
    if (defaultView === 'entry') {
      dashboardRef.current?.showDataEntry();
    } else if (defaultView === 'dashboard') {
      dashboardRef.current?.showDashboard();
    }
  }, [defaultView]);

  const handleLanguageChange = useCallback((newLang) => {
    setLanguage(newLang);
    try {
      localStorage.setItem('operations_lang', newLang);
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="-m-4 sm:-m-6 lg:-m-8 min-h-[calc(100vh-5rem)] bg-slate-50">
      <FtlDashboard
        ref={dashboardRef}
        api={api}
        language={language}
        theme={theme}
        onReady={handleReady}
        onLanguageChange={handleLanguageChange}
        onThemeChange={setTheme}
        className="w-full min-h-[calc(100vh-5rem)]"
      />
    </div>
  );
}
