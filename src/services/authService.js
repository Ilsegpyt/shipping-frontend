import api from './api';

export const activateAccount = async (
    userId,
    activationToken,
    newPassword
) => {
    const response = await api.post('/api/auth/activate', {
        userId,
        activationToken,
        newPassword,
    });

    return response.data;
};