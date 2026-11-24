import api from './api';

const transportersService = {
    getAll: async ({ pageNumber = 1, pageSize = 20, search = '' } = {}) => {
        const params = { pageNumber, pageSize };

        if (search && search.trim()) {
            params.search = search.trim();
        }

        const response = await api.get('/api/transporters', { params });
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/api/transporters/${id}`);
        return response.data;
    },

    create: async (payload) => {
        const response = await api.post('/api/transporters', payload);
        return response.data;
    },

    update: async (id, payload) => {
        const response = await api.put(`/api/transporters/${id}`, payload);
        return response.data;
    },

    addOrUpdatePort: async (id, payload) => {
        const response = await api.post(`/api/transporters/${id}/ports`, payload);
        return response.data;
    },

    getPortById: async (id, portCoverageId) => {
        const response = await api.get(`/api/transporters/${id}/ports/${portCoverageId}`);
        return response.data;
    },

    approvePortRates: async (portCoverageId) => {
        const response = await api.post(
            `/api/transporters/ports/${portCoverageId}/approve`
        );
        return response.data;
    },

    addClientException: async (id, portCoverageId, payload) => {
        const response = await api.post(
            `/api/transporters/${id}/ports/${portCoverageId}/client-exceptions`,
            payload
        );
        return response.data;
    },
};

export const TRANSPORTER_PERMISSIONS = {
    view: 'transporters.transporters.view',
    create: 'transporters.transporters.create',
    edit: 'transporters.transporters.edit',
    approveRates: 'transporters.rates.approve',
};

// Base matrix columns, always shown first. Other equipment types become extra columns.
export const EQUIPMENT_TYPES = ['1*20', '1*40', '2*20'];

export const COMMON_PORTS = ['Alexandria Port', 'Sokhna Port', 'Damietta Port', 'Port Said Port'];

export const hasPermission = (user, permission) =>
    Boolean(
        user?.isSuperAdmin ||
        user?.role === 'SuperAdmin' ||
        user?.roleName === 'Super Admin' ||
        user?.permissions?.includes(permission)
    );

export const formatEgp = (value) =>
    value === null || value === undefined || value === ''
        ? '—'
        : `${Number(value).toLocaleString('en-US')} EGP`;

export const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString('en-GB') : '—';

export default transportersService;
