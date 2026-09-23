import api from './api';

export const getCustomerVoices = async () => {
    const response = await api.get('/api/customers/customer-voices');
    return response.data;
};

export const createCustomerVoice = async (voiceData) => {
    const response = await api.post('/api/customers/customer-voices', voiceData);
    return response.data;
};

export const updateCustomerVoiceStatus = async (voiceId, status) => {
    const response = await api.patch(
        `/api/customers/customer-voices/${voiceId}/status`,
        { status }
    );

    return response.data;
};