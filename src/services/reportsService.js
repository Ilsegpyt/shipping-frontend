import api from './api';

export const getReports = async () => {
    const response = await api.get('/api/reports');

    return response.data;
};

export const downloadReport = async (id) => {
    const response = await api.get(
        `/api/reports/${id}/file`,
        {
            responseType: 'blob',
        }
    );

    return response;
};