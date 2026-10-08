import api from './api';

const agentApplicationsService = {
    create: async (data) => {
        const response = await api.post(
            '/api/website/agent-applications',
            data
        );

        return response.data;
    },
};

export default agentApplicationsService;