import api from './api';

export async function getInternalUsers(pageNumber = 1, pageSize = 20) {
    const response = await api.get('/api/internal-users/', {
        params: {
            pageNumber,
            pageSize,
        },
    });

    return response.data;
}

export async function updateInternalUserProfile(id, name, phone) {
    await api.put(`/api/internal-users/${id}`, {
        name,
        phone: phone || null,
    });
}

export async function updateInternalUserEmail(id, email) {
    await api.put(`/api/internal-users/${id}/email`, {
        email,
    });
}

export async function activateInternalUser(id) {
    await api.put(`/api/internal-users/${id}/activate`);
}

export async function deactivateInternalUser(id) {
    await api.put(`/api/internal-users/${id}/deactivate`);
}

export async function deleteInternalUsers(ids) {
    await api.delete('/api/internal-users/', {
        data: {
            internalUserIds: ids,
        },
    });
}

export async function createInternalUser(user) {
    const response = await api.post('/api/internal-users/', user);
    return response.data;
}

export async function getRoles() {
    const response = await api.get('/api/roles/');
    return response.data;
}