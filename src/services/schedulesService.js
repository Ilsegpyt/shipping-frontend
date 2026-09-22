import api from './api';

export const getSchedules = async (
    pageNumber = 1,
    pageSize = 20
) => {
    const response = await api.get('/api/schedules', {
        params: {
            pageNumber,
            pageSize,
        },
    });

    return response.data;
};

export const getScheduleById = async (id) => {
    const response = await api.get(`/api/schedules/${id}`);

    return response.data;
};

// Super Admin / Internal Users
export const searchSchedules = async ({
    origin,
    destination,
    departureDate,
    containerSize,
}) => {
    const response = await api.get(
        '/api/schedules/search',
        {
            params: {
                origin,
                destination,
                departureDate,
                containerSize,
            },
        }
    );

    return response.data;
};

// Customer Portal
export const searchCustomerSchedules = async ({
    origin,
    destination,
    departureDate,
    containerSize,
}) => {
    const response = await api.get(
        '/api/customers/schedules/search',
        {
            params: {
                origin,
                destination,
                departureDate,
                containerSize,
            },
        }
    );

    return response.data;
};

export const multiRouteSearch = async (routes) => {
    const response = await api.post(
        '/api/schedules/multi-search',
        {
            routes,
        }
    );

    return response.data;
};

export const createSchedule = async (scheduleData) => {
    const response = await api.post(
        '/api/schedules',
        scheduleData
    );

    return response.data;
};

export const updateSchedule = async (
    scheduleId,
    scheduleData
) => {
    const response = await api.patch(
        `/api/schedules/${scheduleId}`,
        scheduleData
    );

    return response.data;
};

export const deleteSchedules = async (scheduleIds) => {
    const response = await api.delete('/api/schedules', {
        data: {
            scheduleIds,
        },
    });

    return response.data;
};

export const importSchedules = async (file) => {
    const formData = new FormData();

    formData.append('file', file);

    const response = await api.post(
        '/api/schedules/import',
        formData,
        {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }
    );

    return response.data;
};

export const exportSchedules = async () => {
    const response = await api.get(
        '/api/schedules/export',
        {
            responseType: 'blob',
        }
    );

    return response.data;
};

export const exportSearchResults = async ({
    origin,
    destination,
    departureDate,
    containerSize,
}) => {
    const response = await api.get(
        '/api/schedules/export/search',
        {
            params: {
                origin,
                destination,
                departureDate,
                containerSize,
            },
            responseType: 'blob',
        }
    );

    return response.data;
};