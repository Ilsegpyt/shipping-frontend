import api from './api';

const contactInquiriesService = {
    getAll: async (pageNumber = 1, pageSize = 10) => {
        const response = await api.get(
            '/api/website/contact-inquiries',
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
            `/api/website/contact-inquiries/${id}`
        );

        return response.data;
    },

    create: async (data) => {
        const response = await api.post(
            '/api/website/contact-inquiries',
            data
        );

        return response.data;
    },
};

export default contactInquiriesService;