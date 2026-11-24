import api, { refreshAccessToken } from '../services/api';

export async function login(email, password) {
    const response = await api.post('/api/auth/login', {
        email,
        password,
    });

    return response.data;
}

export async function refresh(fallbackRefreshToken) {
    return await refreshAccessToken(fallbackRefreshToken);
}

export async function logout() {
    try {
        await api.post('/api/auth/logout');
    } catch (e) {
        console.error('Logout error:', e);
    }
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

export async function activateAccount(
    userId,
    activationToken,
    newPassword
) {
    const response = await api.post('/api/auth/activate', {
        userId,
        activationToken,
        newPassword,
    });

    return response.data;
}
