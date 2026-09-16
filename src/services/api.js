import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5250',
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export const downloadDeclarationFile = async (
    shipmentId,
    fileId
) => {
    const response = await api.get(
        `/api/shipments/${shipmentId}/declaration-files/${fileId}/download`,
        {
            responseType: 'blob',
        }
    );

    const blobUrl = window.URL.createObjectURL(response.data);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = 'declaration-file';

    document.body.appendChild(link);
    link.click();

    link.remove();
    window.URL.revokeObjectURL(blobUrl);
};

export default api;