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

/**
 * FCL Approvals Endpoints
 */
export const getAllFclApprovals = async () => {
  const response = await api.get('/api/fcl-approvals');
  return response.data;
};

export const approveFclSuggestion = async (importContainerId) => {
  const response = await api.post(`/api/fcl-suggestions/${importContainerId}/approve`);
  return response.data;
};

export const unapproveFclSuggestion = async (approvalIdOrContainerId) => {
  try {
    const response = await api.delete(`/api/fcl-approvals/${approvalIdOrContainerId}`);
    return response.data;
  } catch (err) {
    // If backend doesn't support DELETE endpoint, log note and continue client-side revoke
    console.warn('Backend FCL unapprove note:', err?.response?.data?.error || err.message);
    return null;
  }
};



/**
 * Master Data / Lookups Full Management (Super Admin)
 */
export const getPortsFull = (includeInactive = true) => api.get(`/api/operations/ports?includeInactive=${includeInactive}`).then(r => r.data);
export const getPortById = (id) => api.get(`/api/operations/ports/${id}`).then(r => r.data);
export const createPort = (data) => api.post('/api/operations/ports', data).then(r => r.data);
export const updatePort = (id, data) => api.put(`/api/operations/ports/${id}`, data).then(r => r.data);
export const deactivatePort = (id) => api.delete(`/api/operations/ports/${id}`).then(r => r.data);

export const getDestinationsFull = (includeInactive = true) => api.get(`/api/operations/destinations?includeInactive=${includeInactive}`).then(r => r.data);
export const getDestinationById = (id) => api.get(`/api/operations/destinations/${id}`).then(r => r.data);
export const createDestinationItem = (data) => api.post('/api/operations/destinations', data).then(r => r.data);
export const updateDestination = (id, data) => api.put(`/api/operations/destinations/${id}`, data).then(r => r.data);
export const deactivateDestination = (id) => api.delete(`/api/operations/destinations/${id}`).then(r => r.data);

export const getDriversFull = (includeInactive = true) => api.get(`/api/operations/drivers?includeInactive=${includeInactive}`).then(r => r.data);
export const getDriverById = (id) => api.get(`/api/operations/drivers/${id}`).then(r => r.data);
export const createDriver = (data) => api.post('/api/operations/drivers', data).then(r => r.data);
export const updateDriver = (id, data) => api.put(`/api/operations/drivers/${id}`, data).then(r => r.data);
export const deactivateDriver = (id) => api.delete(`/api/operations/drivers/${id}`).then(r => r.data);

export const getShippingLinesFull = (includeInactive = true) => api.get(`/api/operations/shipping-lines?includeInactive=${includeInactive}`).then(r => r.data);
export const getShippingLineById = (id) => api.get(`/api/operations/shipping-lines/${id}`).then(r => r.data);
export const createShippingLine = (data) => api.post('/api/operations/shipping-lines', data).then(r => r.data);
export const updateShippingLine = (id, data) => api.put(`/api/operations/shipping-lines/${id}`, data).then(r => r.data);
export const deactivateShippingLine = (id) => api.delete(`/api/operations/shipping-lines/${id}`).then(r => r.data);

export const getTransportersFull = (includeInactive = true) => api.get(`/api/operations/transporters?includeInactive=${includeInactive}`).then(r => r.data);
export const getTransporterById = (id) => api.get(`/api/operations/transporters/${id}`).then(r => r.data);
export const createTransporter = (data) => api.post('/api/operations/transporters', data).then(r => r.data);
export const updateTransporter = (id, data) => api.put(`/api/operations/transporters/${id}`, data).then(r => r.data);
export const deactivateTransporter = (id) => api.delete(`/api/operations/transporters/${id}`).then(r => r.data);

export const getVehiclesFull = (includeInactive = true) => api.get(`/api/operations/vehicles?includeInactive=${includeInactive}`).then(r => r.data);
export const getVehicleById = (id) => api.get(`/api/operations/vehicles/${id}`).then(r => r.data);
export const createVehicle = (data) => api.post('/api/operations/vehicles', data).then(r => r.data);
export const updateVehicle = (id, data) => api.put(`/api/operations/vehicles/${id}`, data).then(r => r.data);
export const deactivateVehicle = (id) => api.delete(`/api/operations/vehicles/${id}`).then(r => r.data);
