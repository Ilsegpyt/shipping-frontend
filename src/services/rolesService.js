import api from './api';

const rolesService = {
    getAll: async () => {
        const response = await api.get('/api/roles/');
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/api/roles/', data);
        return response.data;
    },

    getPermissions: async (roleId) => {
        const response = await api.get(
            `/api/roles/${roleId}/permissions`
        );
        return response.data;
    },

    grantPermission: async (roleId, permissionKey) => {
        const response = await api.post(
            `/api/roles/${roleId}/permissions`,
            { permissionKey }
        );
        return response.data;
    },

    revokePermission: async (roleId, permissionKey) => {
        const response = await api.delete(
            `/api/roles/${roleId}/permissions/${encodeURIComponent(permissionKey)}`
        );
        return response.data;
    },

    deactivate: async (roleId) => {
        const response = await api.delete(
            `/api/roles/${roleId}`
        );
        return response.data;
    },

    activate: async (roleId) => {
        const response = await api.post(
            `/api/roles/${roleId}/activate`
        );
        return response.data;
    },
};

export default rolesService;