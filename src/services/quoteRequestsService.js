import api from './api';

const quoteRequestsService = {
    create: async (data) => {
        const response = await api.post(
            '/api/website/quote-requests',
            data
        );

        return response.data;
    },
};

export default quoteRequestsService;