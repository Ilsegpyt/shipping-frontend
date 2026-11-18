import api from '../../../../../services/api';

/**
 * Live API client for FTL Airport Dashboard connected to ShippingPlatform backend.
 * Conforms to the ILS_API contract.
 */
export function createLiveApi({
  user = { id: 'u-1', displayName: 'Operations Team' },
  permissions = { reopen_shipments: true, delete_shipments: true },
} = {}) {
  const enc = encodeURIComponent;

  return {
    async getCurrentUser() {
      try {
        const res = await api.get('/api/v1/ftl/user/me');
        return res.data;
      } catch {
        return user;
      }
    },

    async loadMaster() {
      try {
        const res = await api.get('/api/v1/ftl/master');
        const data = res.data || {};
        return {
          ...data,
          client: data.client || data.clients || [],
          line: data.line || data.lines || [],
          dest: data.dest || data.destinations || [],
          aod: data.aod || data.pod || data.pods || [],
          pol: data.pol || data.pod || data.pods || data.aod || [],
          trucker: data.trucker || data.truckers || [],
        };
      } catch (e) {
        console.warn('[FTL Airport] loadMaster fallback:', e);
        return { clients: [], lines: [], truckers: [], destinations: [], drivers: [], vehicles: [] };
      }
    },

    async loadPermissions() {
      try {
        const res = await api.get('/api/v1/ftl/permissions');
        return res.data;
      } catch {
        return permissions;
      }
    },

    async addMaster(list, value) {
      const res = await api.post(`/api/v1/ftl/master/${enc(list)}`, { value });
      return res.data;
    },

    async load() {
      const res = await api.get('/api/v1/ftl/workspace');
      return res.data;
    },

    async updateOperation(ref, payload) {
      const res = await api.put(`/api/v1/ftl/operations/${enc(ref)}`, payload);
      return res.data;
    },

    async createOperation(payload) {
      const res = await api.post('/api/v1/ftl/operations', payload);
      return res.data;
    },

    async updateShipmentStatus(ref, status) {
      const res = await api.put(`/api/v1/ftl/operations/${enc(ref)}/status`, {
        status,
      });
      return res.data;
    },

    async authorizeDeleteShipment() {
      return permissions.delete_shipments === true;
    },

    async deleteShipment(ref) {
      const res = await api.delete(`/api/v1/ftl/operations/${enc(ref)}`);
      return res.data;
    },

    async lockOperation(ref) {
      const res = await api.post(`/api/v1/ftl/operations/${enc(ref)}/lock`);
      return res.data;
    },

    async unlockOperation(ref) {
      const res = await api.post(`/api/v1/ftl/operations/${enc(ref)}/unlock`);
      return res.data;
    },

    async importTrips(payload) {
      const res = await api.post('/api/v1/ftl/trips/import', payload);
      return res.data;
    },

    async getStatusAudits(ref) {
      const res = await api.get(`/api/v1/ftl/operations/${enc(ref)}/status-audits`);
      return res.data;
    },

    async getCounts() {
      const res = await api.get('/api/operations/ftl/counts');
      return res.data;
    },

    async getPagedOperations(params = {}) {
      const query = new URLSearchParams();
      if (params.page != null) query.append('page', params.page);
      if (params.pageSize != null) query.append('pageSize', params.pageSize);
      if (params.operationType) query.append('operationType', params.operationType);
      if (params.status) query.append('status', params.status);
      if (params.onlyActive != null) query.append('onlyActive', params.onlyActive);
      if (params.isDeleted != null) query.append('isDeleted', params.isDeleted);
      if (params.search) query.append('search', params.search);
      if (params.client) query.append('client', params.client);
      if (params.transporter) query.append('transporter', params.transporter);
      if (params.terminal) query.append('terminal', params.terminal);
      if (params.createdBy) query.append('createdBy', params.createdBy);
      if (params.dateType) query.append('dateType', params.dateType);
      if (params.dateFrom) query.append('dateFrom', params.dateFrom);
      if (params.dateTo) query.append('dateTo', params.dateTo);
      if (params.sortBy) query.append('sortBy', params.sortBy);
      if (params.sortDirection) query.append('sortDirection', params.sortDirection);

      const res = await api.get(`/api/operations/ftl?${query.toString()}`);
      return res.data;
    },

    async deliverShipment(ref) {
      const res = await api.put(`/api/operations/ftl/${enc(ref)}/deliver`);
      return res.data;
    },

    async reopenShipment(ref, reason) {
      const res = await api.put(`/api/operations/ftl/${enc(ref)}/reopen`, {
        reason: reason || 'Reopened from FTL Data Entry',
      });
      return res.data;
    },

    async addTruckUpdate(ref, tripId, note) {
      const res = await api.post(`/api/v1/ftl/operations/${enc(ref)}/truck-updates`, {
        tripId,
        note,
      });
      return res.data;
    },
  };
}

