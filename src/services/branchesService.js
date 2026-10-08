import api from './api';

const branchesService = {
    getAll: async () => {
        const response = await api.get('/api/website/branches');
        return response.data;
    },
};

export default branchesService;