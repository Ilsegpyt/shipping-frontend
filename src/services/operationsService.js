import api from './api';

/**
 * Operations Lookup Endpoints
 */
export const getOperationCustomers = async () => {
  const response = await api.get('/api/operations/customers');
  return response.data;
};

export const getOperationShippingLines = async () => {
  const response = await api.get('/api/operations/shipping-lines');
  return response.data;
};

export const getOperationPorts = async () => {
  const response = await api.get('/api/operations/ports');
  return response.data;
};

export const getOperationTransporters = async () => {
  const response = await api.get('/api/operations/transporters');
  return response.data;
};

export const getOperationDrivers = async () => {
  const response = await api.get('/api/operations/drivers');
  return response.data;
};

export const getOperationVehicles = async () => {
  const response = await api.get('/api/operations/vehicles');
  return response.data;
};

export const getOperationDestinations = async () => {
  const response = await api.get('/api/operations/destinations');
  return response.data;
};

export const createOperationDestination = async (name) => {
  const response = await api.post('/api/operations/destinations', { name });
  return response.data;
};

/**
 * Operations CRUD & State Endpoints
 */
export const getAllOperations = async () => {
  const response = await api.get('/api/operations');
  return response.data;
};

export const getOperationById = async (id) => {
  const response = await api.get(`/api/operations/${id}`);
  return response.data;
};

export const createOperation = async (operationData) => {
  const response = await api.post('/api/operations', operationData);
  return response.data;
};

export const updateImportOperation = async (id, data) => {
  const response = await api.put(`/api/operations/${id}/import`, data);
  return response.data;
};

export const updateExportOperation = async (id, data) => {
  const response = await api.put(`/api/operations/${id}/export`, data);
  return response.data;
};

export const deliverOperation = async (id) => {
  const response = await api.put(`/api/operations/${id}/deliver`);
  return response.data;
};

export const reopenOperation = async (id, reason) => {
  const response = await api.put(`/api/operations/${id}/reopen`, { reason: reason || 'Reopened from Data Entry' });
  return response.data;
};

export const addContainerUpdate = async (containerId, details) => {
  const response = await api.post(`/api/operations/containers/${containerId}/updates`, { details });
  return response.data;
};

export const importTrips = async (payload) => {
  const response = await api.post('/api/imports', payload);
  return response.data;
};

export const deleteOperation = async (id) => {
  const response = await api.delete(`/api/operations/${id}`);
  return response.data;
};

export const getDeletedOperations = async () => {
  const response = await api.get('/api/operations/deleted');
  return response.data;
};

export const getOperationStatusAudits = async (operationId) => {
  const response = await api.get(`/api/operations/${operationId}/status-audits`);
  return response.data;
};

/**
 * Advanced Operations Search (Rule-based, Sorting, Pagination)
 * POST /api/operations/search
 */
export const searchOperations = async (searchRequest) => {
  const response = await api.post('/api/operations/search', searchRequest);
  return response.data;
};

