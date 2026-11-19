import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import FtlDashboard from './components/FtlDashboard';
import FtlDashboardView from './components/FtlDashboardView';
import FtlDeliveredArchive from './components/FtlDeliveredArchive';
import FtlInactiveArchive from './components/FtlInactiveArchive';
import { FtlConfirmDeleteModal, FtlStatusHistoryModal } from './components/FtlArchiveShared';
import { createLiveApi } from './api/liveApi';
import { getFtlOperationsCounts } from '../../../../services/operationsService';
import { useAuth } from '../../../../auth/AuthContext';

export default function FtlAirportPage({ defaultView = 'dashboard' }) {
  const { user } = useAuth();
  const dashboardRef = useRef(null);
  const isReadyRef = useRef(false);

  // Active Tab state: 'Import' | 'Export' | 'Delivered' | 'Inactive'
  const [currentTab, setCurrentTab] = useState('Import');

  // Lightweight Counts: populated on mount via GET /api/operations/ftl/counts
  const [counts, setCounts] = useState({
    activeImportCount: 0,
    activeExportCount: 0,
    deliveredCount: 0,
    inactiveCount: 0,
  });

  // Default language is English ('en') on open and refresh; user can freely switch to Arabic
  const [language, setLanguage] = useState('en');
  const [theme, setTheme] = useState('light');
  const [activeHistoryOp, setActiveHistoryOp] = useState(null);

  // Listen to unified history events triggered from Active Grid (ftlEngine)
  useEffect(() => {
    const handleOpenHistory = (e) => {
      if (e.detail) {
        setActiveHistoryOp(e.detail);
      }
    };
    window.addEventListener('ftl:open-status-history', handleOpenHistory);
    return () => window.removeEventListener('ftl:open-status-history', handleOpenHistory);
  }, []);

  const isSuperAdmin = Boolean(
    user?.isSuperAdmin ||
    user?.role === 'SuperAdmin' ||
    user?.roleName === 'Super Admin' ||
    user?.roleName?.toLowerCase()?.includes('admin')
  );

  const isFtlExec = Boolean(
    user?.roleName === 'FTL Operation Executive' ||
    user?.role === 'FTL Operation Executive'
  );

  const canReopen = Boolean(
    isSuperAdmin ||
    isFtlExec ||
    user?.roleName === 'Supervisor Maritime Transportation' ||
    user?.roleName === 'Ocean Operations Manager' ||
    user?.permissions?.includes('operations.ftl.reopen') ||
    user?.permissions?.includes('operations.reopen')
  );

  const canDelete = Boolean(
    isSuperAdmin ||
    isFtlExec ||
    user?.permissions?.includes('operations.ftl.delete') ||
    user?.permissions?.includes('operations.delete')
  );

  const canDeliver = Boolean(
    isSuperAdmin ||
    isFtlExec ||
    user?.roleName === 'Supervisor Maritime Transportation' ||
    user?.roleName === 'Ocean Operations Manager' ||
    user?.permissions?.includes('operations.ftl.deliver') ||
    user?.permissions?.includes('operations.deliver')
  );

  const api = useMemo(() => {
    const displayName =
      user?.fullName ||
      user?.displayName ||
      user?.name ||
      user?.userName ||
      user?.email ||
      'ILS Operator';

    const userId = user?.id || 'u-ops-1';

    return createLiveApi({
      user: { id: userId, displayName },
      permissions: {
        reopen_shipments: canReopen,
        delete_shipments: canDelete,
        deliver_shipments: canDeliver,
      },
    });
  }, [user, canReopen, canDelete, canDeliver]);

  // Initial lightweight counts load
  const fetchCounts = useCallback(async () => {
    try {
      const data = await getFtlOperationsCounts();
      if (data) {
        setCounts({
          activeImportCount: data.activeImportCount ?? data.ActiveImportCount ?? 0,
          activeExportCount: data.activeExportCount ?? data.ActiveExportCount ?? 0,
          deliveredCount: data.deliveredCount ?? data.DeliveredCount ?? 0,
          inactiveCount: data.inactiveCount ?? data.InactiveCount ?? 0,
        });
      }
    } catch (err) {
      console.error('[FTL] Failed to fetch operations counts:', err);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

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
  }, []);

  const handleTabClick = (tab) => {
    try {
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch {
      // ignore
    }
    setCurrentTab(tab);
    if (tab === 'Import' || tab === 'Export') {
      dashboardRef.current?.switchDir?.(tab);
      dashboardRef.current?.showDataEntry?.();
    } else {
      dashboardRef.current?.setTab?.(tab);
    }
  };

  const handleDashboardTabChange = useCallback((dir) => {
    if (dir === 'Delivered' || dir === 'Inactive' || dir === 'Import' || dir === 'Export') {
      try {
        window.scrollTo({ top: 0, behavior: 'instant' });
      } catch {
        // ignore
      }
      setCurrentTab(dir);
    }
  }, []);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.ref) return;
    setIsDeleting(true);
    setDeleteError(null);
    const targetRef = deleteTarget.ref;
    const targetDir = deleteTarget.dir;
    try {
      // Optimistically remove from grid so row disappears immediately
      dashboardRef.current?.removeShipmentLocally?.(targetRef, targetDir);
      await api.deleteShipment(targetRef);
      dashboardRef.current?.toast?.(language === 'ar' ? 'تم نقل العملية إلى سجل المحذوفات بنجاح' : 'Operation moved to Inactive Archive');
      await fetchCounts();
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete operation:', err);
      const isAlreadyDeleted =
        err?.message?.toLowerCase().includes('not found') ||
        err?.response?.data?.error?.toLowerCase?.().includes('not found') ||
        err?.response?.status === 400 ||
        err?.status === 400;

      if (isAlreadyDeleted) {
        dashboardRef.current?.removeShipmentLocally?.(targetRef, targetDir);
        dashboardRef.current?.toast?.(
          language === 'ar'
            ? 'تم إزالة العملية (تم حذفها مسبقاً)'
            : 'Operation already deleted, table updated',
          'info'
        );
        await fetchCounts();
        setDeleteTarget(null);
      } else {
        const errMsg = err.message || (language === 'ar' ? 'فشل حذف العملية' : 'Failed to delete operation');
        setDeleteError(errMsg);
        dashboardRef.current?.toast?.(errMsg, 'error');
        dashboardRef.current?.reload?.();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  if (defaultView === 'dashboard') {
    return (
      <div className="min-h-full space-y-6 flex flex-col" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="w-full flex-1">
          <FtlDashboardView
            language={language}
            theme={theme}
            onLanguageChange={setLanguage}
            onThemeChange={setTheme}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-6 flex flex-col" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Main View Content: opForm & ebar are permanently mounted inside FtlDashboard, archives portal into entryArchiveSlot */}
      <div className="w-full flex-1">
        <FtlDashboard
          ref={dashboardRef}
          api={api}
          language={language}
          theme={theme}
          currentTab={currentTab}
          counts={counts}
          onCountsRefresh={fetchCounts}
          onReady={handleReady}
          onLanguageChange={handleLanguageChange}
          onThemeChange={setTheme}
          onTabChange={handleDashboardTabChange}
          onRequestDelete={(detail) => {
            setDeleteTarget(detail);
            setDeleteError(null);
          }}
          className="w-full min-h-[calc(100vh-8rem)]"
        >
          {currentTab === 'Delivered' && (
            <FtlDeliveredArchive
              counts={counts}
              onCountsRefresh={fetchCounts}
              onTotalCountChange={(cnt) => {
                setCounts(prev => ({ ...prev, deliveredCount: cnt }));
              }}
              onBackToActive={() => handleTabClick('Import')}
              lang={language}
              canReopen={canReopen}
              onOperationsLoaded={(ops, dir, totalCount) => dashboardRef.current?.setArchiveOperations?.('Delivered', ops, dir, totalCount)}
            />
          )}
          {currentTab === 'Inactive' && (
            <FtlInactiveArchive
              counts={counts}
              onCountsRefresh={fetchCounts}
              onTotalCountChange={(cnt) => {
                setCounts(prev => ({ ...prev, inactiveCount: cnt }));
              }}
              onBackToActive={() => handleTabClick('Import')}
              lang={language}
              canReopen={canReopen}
              onOperationsLoaded={(ops, dir, totalCount) => dashboardRef.current?.setArchiveOperations?.('Inactive', ops, dir, totalCount)}
            />
          )}
        </FtlDashboard>
      </div>

      {/* Confirm Delete Operation Modal (Matching FCL) */}
      <FtlConfirmDeleteModal
        target={deleteTarget}
        isOpen={Boolean(deleteTarget)}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        error={deleteError}
        lang={language}
        currentUserName={user?.name || user?.userName || user?.email?.split('@')[0] || 'User'}
      />

      {/* Active Grid Status History Slide-over Drawer (Matching FCL 1:1) */}
      <FtlStatusHistoryModal
        op={activeHistoryOp}
        onClose={() => setActiveHistoryOp(null)}
        lang={language}
      />
    </div>
  );
}
