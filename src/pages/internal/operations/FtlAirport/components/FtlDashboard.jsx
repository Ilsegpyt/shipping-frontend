import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { createFtlEngine } from '../engine/ftlEngine.js';
import '../styles/ftl-dashboard.css';

/**
 * <FtlDashboard /> — the ILS Egypt FTL Airport Dashboard as a React component.
 *
 * Offline (one-time) mode: render it with no `api`. Data comes from Excel uploads or
 * `initialWorkspace`, and every change is reported through `onSave`.
 *
 * Live mode: pass an `api` object that implements the ILS_API contract
 * (see src/api/httpApi.js for a ready fetch implementation and src/api/contract.js
 * for the full method list). The dashboard then loads the signed-in user, master
 * lists and workspace from your backend and saves through it.
 *
 * Props
 *  api               ILS_API implementation (changing it remounts the engine)
 *  language          'en' | 'ar'                  (controlled, default 'en')
 *  theme             'light' | 'dark'             (controlled, default 'light')
 *  initialWorkspace  {version, shipments[]}       offline preload (GET /workspace shape)
 *  onSave            (exportPayload, workspace) => void|Promise   offline autosave
 *  mail              { compose(message) => Promise<{url}> }      server-side Outlook drafts
 *  outlook           { getAccessToken() => Promise<string> }      Graph drafts from the browser
 *  onReady           ({live}) => void
 *  onChange          () => void                   any edit in the data-entry grid
 *  onLanguageChange  (lang) => void               user pressed the language button
 *  onThemeChange     (theme) => void              user pressed the theme button
 *  className, style  applied to the outer wrapper
 *
 * Ref (useRef + ref={...}): setLanguage, setTheme, showDashboard, showDataEntry,
 * importFiles(files), loadWorkspace(payload), getWorkspace(), getExportPayload(),
 * getTrips(), getSchema(dir), flush(), reload(), openExport(), openHelp(),
 * openDeveloperPanel(), clear(), toast(msg), isLive(), isDirty(), apiSpec.
 */
const FtlDashboard = forwardRef(function FtlDashboard(props, ref) {
  const { api = null, language = 'en', theme = 'light', className, style } = props;
  const hostRef = useRef(null);
  const engineRef = useRef(null);

  // Always read the latest callbacks without re-mounting the engine.
  const latest = useRef(props);
  latest.current = props;

  useEffect(() => {
    const host = hostRef.current;
    const root = document.createElement('div');
    host.appendChild(root);

    // Live view of the integration hooks; the engine reads these on every use.
    const hostHooks = {
      get api() { return api || null; },
      get save() { return latest.current.onSave || null; },
      get mail() { return latest.current.mail || null; },
      get outlook() { return latest.current.outlook || null; },
    };

    let engine;
    try {
      engine = createFtlEngine(root, {
        host: hostHooks,
        language: latest.current.language,
        theme: latest.current.theme,
        initialWorkspace: latest.current.initialWorkspace,
        onEvent(type, detail) {
          const p = latest.current;
          if (type === 'ready') p.onReady?.(detail);
          else if (type === 'change') p.onChange?.();
          else if (type === 'language') p.onLanguageChange?.(detail);
          else if (type === 'theme') p.onThemeChange?.(detail);
        },
      });
    } catch (err) {
      console.error(err);
      root.remove();
      latest.current.onError?.(err);
      return undefined;
    }
    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
      root.remove();
    };
    // initialWorkspace is only read on mount; a new api means a new backend, so remount.
  }, [api]);

  useEffect(() => { engineRef.current?.setLanguage(language); }, [language]);
  useEffect(() => { engineRef.current?.setTheme(theme); }, [theme]);

  useImperativeHandle(ref, () => {
    const call = (name) => (...args) => {
      const e = engineRef.current;
      if (!e) throw new Error('FTL dashboard is not mounted');
      return e[name](...args);
    };
    return {
      setLanguage: call('setLanguage'),
      setTheme: call('setTheme'),
      getLanguage: call('getLanguage'),
      getTheme: call('getTheme'),
      showDashboard: call('showDashboard'),
      showDataEntry: call('showDataEntry'),
      importFiles: call('importFiles'),
      loadWorkspace: call('loadWorkspace'),
      getWorkspace: call('getWorkspace'),
      getExportPayload: call('getExportPayload'),
      getTrips: call('getTrips'),
      getSchema: call('getSchema'),
      flush: call('flush'),
      reload: call('reload'),
      openExport: call('openExport'),
      openHelp: call('openHelp'),
      openDeveloperPanel: call('openDeveloperPanel'),
      clear: call('clear'),
      toast: call('toast'),
      isLive: call('isLive'),
      isDirty: call('isDirty'),
      get apiSpec() { return engineRef.current?.apiSpec; },
      get ready() { return engineRef.current?.ready; },
    };
  }, []);

  return <div ref={hostRef} className={className} style={style} data-ftl-dashboard="" />;
});

export default FtlDashboard;
