import api from './api';

export const impersonateCustomer = async (customerUserId, reason = null) => {
    const response = await api.post(
        '/api/identity/impersonation/customer',
        {
            customerUserId,
            reason,
        }
    );

    return response.data;
};

export const endImpersonation = async (auditLogId) => {
    const response = await api.post(
        '/api/identity/impersonation/end',
        {
            auditLogId,
        }
    );

    return response.data;
};