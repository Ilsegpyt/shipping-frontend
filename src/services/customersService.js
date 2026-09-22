import api from './api';

export const getCustomers = async (
    pageNumber = 1,
    pageSize = 10,
    recordStatus = 'notDeleted'
) => {
    let response;

    if (recordStatus === 'notDeleted') {
        response = await api.get('/api/customers/', {
            params: {
                pageNumber,
                pageSize,
            },
        });
    } else {
        response = await api.get('/api/customers/all', {
            params: {
                deletedOnly: recordStatus === 'deleted',
                pageNumber,
                pageSize,
            },
        });
    }

    return response.data;
};

export const registerCustomer = async (customerData) => {
    const response = await api.post('/api/customers/', customerData);
    return response.data;
};

export const getCustomerById = async (customerId) => {
    const response = await api.get(`/api/customers/${customerId}`);
    return response.data;
};

export const getCustomerOwner = async (customerId) => {
    const response = await api.get(`/api/customers/${customerId}/owner`);
    return response.data;
};

export const impersonateCustomer = async (customerUserId, reason = null) => {
    const response = await api.post('/api/identity/impersonation/customer', {
        customerUserId,
        reason,
    });
    return response.data;
};

export const updateCustomerProfile = async (customerId, customerData) => {
    const response = await api.put(`/api/customers/${customerId}`, customerData);
    return response.data;
};

export const updateCustomerEmail = async (customerId, email) => {
    const response = await api.put(`/api/customers/${customerId}/email`, { email });
    return response.data;
};

export const deleteCustomers = async (customerIds) => {
    const response = await api.delete('/api/customers', { data: { customerIds } });
    return response.data;
};

export const activateCustomer = async (customerId) => {
    const response = await api.post(`/api/customers/${customerId}/activate`);
    return response.data;
};

export const suspendCustomer = async (customerId) => {
    const response = await api.post(`/api/customers/${customerId}/suspend`);
    return response.data;
};
