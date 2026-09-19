import api from './api';

export const getNotifications = async () => {
    const response = await api.get('/api/notifications');

    return response.data;
};

export const markNotificationAsRead = async (
    notificationId
) => {
    await api.patch(
        `/api/notifications/${notificationId}/read`
    );
};

const notificationsService = {
    getNotifications,
    markNotificationAsRead,
};

export default notificationsService;