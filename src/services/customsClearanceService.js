import api from './api';

// Report types and statuses exactly as the API sends them.
export const REPORT_TYPES = ['OceanImport', 'OceanExport', 'Domestic'];
export const SHIPMENT_STATUSES = ['Open', 'Closed'];
export const CONTAINER_TYPES = [
    'DryStandard20',
    'DryStandard40',
    'DryHigh40',
    'DryHigh45',
    'ReeferStandard20',
    'ReeferHigh40',
    'OpenTop20',
    'OpenTop40',
    'OpenTopHigh40',
    'FlatStandard40',
    'FlatHigh40',
    'Flat20',
    'Tank20',
    'Tank40',
];

const customsClearanceService = {
    // Server-side paging & search. status: 'Open' (table) | 'Closed' (archive).
    getAll: async ({ reportType, status = 'Open', pageNumber = 1, pageSize = 20, search = '' } = {}) => {
        const params = { reportType, status, pageNumber, pageSize };

        if (search && search.trim()) {
            params.search = search.trim();
        }

        const response = await api.get('/api/customs-clearance/shipments', { params });
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/api/customs-clearance/shipments/${id}`);
        return response.data;
    },

    create: async (payload) => {
        const response = await api.post('/api/customs-clearance/shipments', payload);
        return response.data;
    },

    update: async (id, payload) => {
        const response = await api.put(`/api/customs-clearance/shipments/${id}`, payload);
        return response.data;
    },

    // One-way. There is no reopen and no delete.
    close: async (id) => {
        const response = await api.post(`/api/customs-clearance/shipments/${id}/close`);
        return response.data;
    },

    getUpdates: async (id) => {
        const response = await api.get(`/api/customs-clearance/shipments/${id}/updates`);
        return response.data;
    },

    addUpdate: async (id, updateText) => {
        const response = await api.post(`/api/customs-clearance/shipments/${id}/updates`, { updateText });
        return response.data;
    },

    // { clients: [{id, name}], ports: [{id, name, code}], shippingLines: [{id, name, abbreviation}],
    //   terminals: [{id, name}], containerTypes: string[], clearanceTypes: string[] }
    getLookups: async () => {
        const response = await api.get('/api/customs-clearance/lookups');
        return response.data;
    },
};

export const CUSTOMS_PERMISSIONS = {
    view: 'customsclearance.shipments.view',
    create: 'customsclearance.shipments.create',
    edit: 'customsclearance.shipments.edit',
    close: 'customsclearance.shipments.close',
};

// Same rule as transportersService.hasPermission.
export const hasPermission = (user, permission) =>
    Boolean(
        user?.isSuperAdmin ||
        user?.role === 'SuperAdmin' ||
        user?.roleName === 'Super Admin' ||
        user?.permissions?.includes(permission)
    );

export default customsClearanceService;
