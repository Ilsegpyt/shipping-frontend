/**
 * Fetch implementation of the ILS_API contract against the REST endpoints
 * listed in the dashboard's developer panel (GET /me, GET/PUT /workspace, ...).
 *
 *   const api = createHttpApi({ baseUrl: 'https://erp.example.com/api/ftl',
 *                               getToken: () => auth.accessToken });
 *   <FtlDashboard api={api} />
 *
 * Create the object once (useMemo / module scope): a new object remounts the dashboard.
 */
export function createHttpApi({
  baseUrl = '/api',
  getToken,                 // optional () => string | Promise<string>  → Authorization: Bearer
  headers = {},             // extra static headers (tenant id, CSRF token, ...)
  credentials = 'include',  // send cookies for session auth
  fetchImpl = (...a) => fetch(...a),
} = {}) {
  const root = baseUrl.replace(/\/+$/, '');

  async function request(method, path, body) {
    const h = { Accept: 'application/json', ...headers };
    if (body !== undefined) h['Content-Type'] = 'application/json';
    if (getToken) {
      const token = await getToken();
      if (token) h.Authorization = 'Bearer ' + token;
    }
    const res = await fetchImpl(root + path, {
      method,
      credentials,
      headers: h,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      const info = await res.json().catch(() => ({}));
      const err = new Error(info.message || res.statusText || 'Request failed');
      err.status = res.status;
      err.details = info;
      throw err;
    }
    return res.status === 204 ? {} : res.json();
  }

  const enc = encodeURIComponent;
  return {
    getCurrentUser: () => request('GET', '/me'),
    load: () => request('GET', '/workspace'),
    saveWorkspace: (payload) => request('PUT', '/workspace', payload),
    createOperation: (payload) => request('POST', '/operations', payload),
    importTrips: (payload) => request('POST', '/imports', payload),
    loadMaster: () => request('GET', '/master'),
    addMaster: (list, value) => request('POST', '/master/' + enc(list), { value }),
    loadPermissions: () => request('GET', '/permissions'),
    updateShipmentStatus: (ref, status, version) =>
      request('PATCH', '/shipments/' + enc(ref) + '/status', { status, version }),
    authorizeDeleteShipment: async (ref) =>
      (await request('GET', '/shipments/' + enc(ref) + '/permissions')).delete_shipments === true,
    deleteShipment: (ref, version) => request('DELETE', '/shipments/' + enc(ref), { version }),
  };
}

/** Server-side Outlook drafts: POST /mail/drafts → {url}. Pass as <FtlDashboard mail={...} />. */
export function createHttpMail({ baseUrl = '/api', getToken, headers = {}, credentials = 'include' } = {}) {
  const root = baseUrl.replace(/\/+$/, '');
  return {
    async compose(message) {
      const h = { 'Content-Type': 'application/json', Accept: 'application/json', ...headers };
      if (getToken) { const t = await getToken(); if (t) h.Authorization = 'Bearer ' + t; }
      const res = await fetch(root + '/mail/drafts', { method: 'POST', credentials, headers: h, body: JSON.stringify(message) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || res.statusText);
      return res.json();
    },
  };
}
