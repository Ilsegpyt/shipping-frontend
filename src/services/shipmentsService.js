import api from './api';

export const getShipments = async (
    pageNumber = 1,
    pageSize = 20
) => {
    const response = await api.get('/api/shipments', {
        params: { pageNumber, pageSize },
    });

    return response.data;
};

export const getShipmentById = async (id) => {
    const response = await api.get(`/api/shipments/${id}`);

    return response.data;
};

export const updateShipment = async (id, shipmentData) => {
    const response = await api.put(
        `/api/shipments/${id}`,
        shipmentData
    );

    return response.data;
};

export const createShipment = async (shipmentData) => {
    const response = await api.post(
        '/api/shipments',
        shipmentData,
        {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }
    );

    return response.data;
};

export const deleteShipments = async (shipmentIds) => {
    const response = await api.delete('/api/shipments', {
        data: {
            shipmentIds,
        },
    });

    return response.data;
};
export const getDeclarationFilesByShipmentId = async (shipmentId) => {
    const response = await api.get(
        `/api/shipments/${shipmentId}/declaration-files`
    );

    return response.data;
};