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
        return res.data;
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

    async updateShipmentStatus(ref, status, version) {
      const res = await api.put(`/api/v1/ftl/operations/${enc(ref)}/status`, {
        status,
        version,
      });
      return res.data;
    },

    async authorizeDeleteShipment() {
      return permissions.delete_shipments === true;
    },

    async deleteShipment(ref, version) {
      const res = await api.delete(`/api/v1/ftl/operations/${enc(ref)}`, {
        data: { version },
      });
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

    async addTruckUpdate(ref, tripId, note) {
      const res = await api.post(`/api/v1/ftl/operations/${enc(ref)}/truck-updates`, {
        tripId,
        note,
      });
      return res.data;
    },
  };
}

