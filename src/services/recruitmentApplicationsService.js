import api from './api';

const recruitmentApplicationsService = {
    create: async (formData) => {
        const response = await api.post(
            '/api/website/recruitment-applications',
            formData
        );

        return response.data;
    },

    getAll: async (pageNumber = 1, pageSize = 10) => {
        const response = await api.get(
            '/api/website/recruitment-applications',
            {
                params: {
                    PageNumber: pageNumber,
                    PageSize: pageSize,
                },
            }
        );

        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(
            `/api/website/recruitment-applications/${id}`
        );

        return response.data;
    },

    downloadCv: async (id) => {
        const response = await api.get(
            `/api/website/recruitment-applications/${id}/cv`,
            {
                responseType: 'blob',
            }
        );

        return response;
    },
};

export default recruitmentApplicationsService;