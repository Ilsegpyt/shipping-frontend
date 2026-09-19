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