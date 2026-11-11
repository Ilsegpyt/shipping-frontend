import { useCallback, useRef, useState } from 'react';

/**
 * Convenience hook for hosts:
 *   const ftl = useFtlDashboard();
 *   <FtlDashboard ref={ftl.ref} onReady={ftl.onReady} onChange={ftl.onChange} />
 *   ftl.ref.current.getWorkspace()
 */
export function useFtlDashboard() {
  const ref = useRef(null);
  const [state, setState] = useState({ ready: false, live: false, dirty: false });
  const onReady = useCallback(({ live }) => setState((s) => ({ ...s, ready: true, live })), []);
  const onChange = useCallback(() => setState((s) => (s.dirty ? s : { ...s, dirty: true })), []);
  const markSaved = useCallback(() => setState((s) => ({ ...s, dirty: false })), []);
  return { ref, ...state, onReady, onChange, markSaved };
}
