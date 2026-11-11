import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import FtlDashboard from './components/FtlDashboard';
import { createMockApi } from './api/mockApi';
import { createLiveApi } from './api/liveApi';
import { useAuth } from '../../../../auth/AuthContext';

function createResilientFtlApi(options) {
  const liveApi = createLiveApi(options);
  const mockApi = createMockApi(options);
  let useLive = true;

  const wrap = (methodName) => async (...args) => {
    if (useLive) {
      try {
        return await liveApi[methodName](...args);
      } catch (err) {
        const isOffline =
          !err.status ||
          err.status === 404 ||
          err.status >= 500 ||
          err.code === 'ERR_NETWORK' ||
          err.message?.includes('Network Error');

        if (isOffline) {
          console.warn(
            `[FTL Airport] Live backend unavailable (${err.message || err.status}), using local mock adapter:`,
            methodName
          );
          useLive = false;
          return await mockApi[methodName](...args);
        }
        throw err;
      }
    }
    return await mockApi[methodName](...args);
  };

  return {
    getCurrentUser: wrap('getCurrentUser'),
    loadMaster: wrap('loadMaster'),
    loadPermissions: wrap('loadPermissions'),
    addMaster: wrap('addMaster'),
    load: wrap('load'),
    saveWorkspace: wrap('saveWorkspace'),
    createOperation: wrap('createOperation'),
    updateShipmentStatus: wrap('updateShipmentStatus'),
    authorizeDeleteShipment: wrap('authorizeDeleteShipment'),
    deleteShipment: wrap('deleteShipment'),
    importTrips: wrap('importTrips'),
  };
}

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

    return createResilientFtlApi({
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
