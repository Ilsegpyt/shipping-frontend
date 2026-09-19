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

    return response;
};

export const uploadDeclarationFile = async (
    shipmentId,
    file
) => {
    const formData = new FormData();

    formData.append('File', file);

    const response = await api.post(
        `/api/shipments/${shipmentId}/declaration-files`,
        formData
    );

    return response.data;
};

const shipmentsService = {
    createShipment: async ({
        scheduleId,
        quantity,
        declarationFiles = [],
    }) => {
        const formData = new FormData();

        formData.append('ScheduleId', scheduleId);
        formData.append('Quantity', quantity);

        declarationFiles.forEach((file) => {
            formData.append('DeclarationFiles', file);
        });

        const response = await api.post(
            '/api/shipments',
            formData
        );

        return response.data;
    },
};

export default shipmentsService;