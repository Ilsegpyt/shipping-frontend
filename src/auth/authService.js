import api from '../services/api';

export async function login(email, password) {
    const response = await api.post('/api/auth/login', { email, password });
    return response.data;
}

export async function getMe() {
    const response = await api.get('/api/me');
    return response.data;
}

export async function updateProfile(profileId, name, phone) {
    await api.put(`/api/internal-users/${profileId}`, {
        name,
        phone,
    });
}
export async function updateEmail(profileId, email) {
    await api.put(`/api/internal-users/${profileId}/email`, {
        email,
    });
}