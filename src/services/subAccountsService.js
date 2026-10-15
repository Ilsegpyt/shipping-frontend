
import api from './api';

export const getSubAccounts = async () => {
    const response = await api.get('/api/subaccounts');
    return response.data;
};

export const createSubAccount = async (subAccountData) => {
    const response = await api.post(
        '/api/subaccounts',
        subAccountData
    );

    return response.data;
};

export const deleteSubAccount = async (id) => {
    const response = await api.delete(
        `/api/subaccounts/${id}`
    );

    return response.data;
};

export const activateSubAccount = async (id) => {
    const response = await api.post(
        `/api/subaccounts/${id}/activate`
    );

    return response.data;
};

export const deactivateSubAccount = async (id) => {
    const response = await api.post(
        `/api/subaccounts/${id}/deactivate`
    );

    return response.data;
};

export const updateSubAccountProfile = async (id, name) => {
    const response = await api.put(
        `/api/subaccounts/${id}`,
        {
            name,
        }
    );

    return response.data;
};

export const updateSubAccountEmail = async (id, email) => {
    const response = await api.put(
        `/api/subaccounts/${id}/email`,
        {
            email,
        }
    );

    return response.data;
};

// ========================================
// Scope Management - Existing SubAccounts
// ========================================

export const addSubAccountScope = async (id, scope) => {
    const { category, service, type } = scope;

    const response = await api.post(
        `/api/subaccounts/${id}/scopes`,
        {
            category,
            service,
            type,
        }
    );

    return response.data;
};

export const removeSubAccountScope = async (id, scope) => {
    const { category, service, type } = scope;

    const response = await api.delete(
        `/api/subaccounts/${id}/scopes`,
        {
            params: {
                category,
                service,
                type,
            },
        }
    );

    return response.data;
};

export const setSubAccountFullScope = async (id) => {
    const response = await api.post(
        `/api/subaccounts/${id}/full-scope`
    );

    return response.data;
};

export const setSubAccountCustomScope = async (id) => {
    const response = await api.post(
        `/api/subaccounts/${id}/custom-scope`
    );

    return response.data;
};
