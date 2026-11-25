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
  clearLookupsCache();
  const response = await api.post('/api/operations/destinations', { name });
  return response.data;
};

/**
 * Operations Lookups 5-Hour Unified Cache
 */
const LOOKUPS_CACHE_KEY = 'operations_lookups_cache_v6_clean_ports';
const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;

let memoryLookupsCache = null;
let memoryLookupsTimestamp = 0;

export const clearLookupsCache = () => {
  memoryLookupsCache = null;
  memoryLookupsTimestamp = 0;
  try {
    sessionStorage.removeItem(LOOKUPS_CACHE_KEY);
  } catch (e) { }
};

export const getCachedLookups = async (forceRefresh = false) => {
  const now = Date.now();

  // 1. Check in-memory cache first (used during active tab session)
  if (!forceRefresh && memoryLookupsCache && (now - memoryLookupsTimestamp < FIVE_HOURS_MS)) {
    return memoryLookupsCache;
  }

  // 2. Helper to fetch fresh lookups from server
  const fetchFresh = async () => {
    const [
      customers,
      shippingLines,
      ports,
      transporters,
      drivers,
      vehicles,
      destinations,
    ] = await Promise.all([
      getOperationCustomers(),
      getOperationShippingLines(),
      getOperationPorts(),
      getOperationTransporters(),
      getOperationDrivers(),
      getOperationVehicles(),
      getOperationDestinations(),
    ]);

    const freshData = {
      customers: Array.isArray(customers) ? customers : [],
      shippingLines: Array.isArray(shippingLines) ? shippingLines : [],
      ports: Array.isArray(ports) ? ports : [],
      transporters: Array.isArray(transporters) ? transporters : [],
      drivers: Array.isArray(drivers) ? drivers : [],
      vehicles: Array.isArray(vehicles) ? vehicles : [],
      destinations: Array.isArray(destinations) ? destinations : [],
    };

    memoryLookupsCache = freshData;
    memoryLookupsTimestamp = Date.now();

    try {
      sessionStorage.setItem(
        LOOKUPS_CACHE_KEY,
        JSON.stringify({ timestamp: memoryLookupsTimestamp, data: freshData })
      );
    } catch (e) {
      // If quota exceeded, in-memory cache still holds it
    }

    return freshData;
  };

  // If forceRefresh, fetch fresh from server immediately
  if (forceRefresh) {
    return await fetchFresh();
  }

  // 3. Check sessionStorage
  try {
    const stored = sessionStorage.getItem(LOOKUPS_CACHE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.timestamp && (now - parsed.timestamp < FIVE_HOURS_MS) && parsed.data) {
        memoryLookupsCache = parsed.data;
        memoryLookupsTimestamp = parsed.timestamp;
        return parsed.data;
      }
    }
  } catch (e) { }

  // 4. Fallback: Fetch from server
  return await fetchFresh();
};

/**
 * Operations CRUD & State Endpoints
 */
export const getAllOperations = async (onlyActive = false) => {
  const url = onlyActive ? '/api/operations?onlyActive=true' : '/api/operations';
  const response = await api.get(url);
  return response.data;
};

export const getPagedOperations = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.page != null) query.append('page', params.page);
  if (params.pageSize != null) query.append('pageSize', params.pageSize);
  if (params.operationType) query.append('operationType', params.operationType);
  if (params.status) query.append('status', params.status);
  if (params.onlyActive != null) query.append('onlyActive', params.onlyActive);
  if (params.isDeleted != null) query.append('isDeleted', params.isDeleted);
  if (params.search) query.append('search', params.search);
  if (params.client) query.append('client', params.client);
  if (params.line) query.append('line', params.line);
  if (params.port) query.append('port', params.port);
  if (params.transporter) query.append('transporter', params.transporter);
  if (params.containerType) query.append('containerType', params.containerType);
  if (params.destination) query.append('destination', params.destination);
  if (params.clearanceType) query.append('clearanceType', params.clearanceType);
  if (params.missingDocs) query.append('missingDocs', params.missingDocs);
  if (params.createdBy) query.append('createdBy', params.createdBy);
  if (params.customs) query.append('customs', params.customs);
  if (params.dateType) query.append('dateType', params.dateType);
  if (params.dateFrom) query.append('dateFrom', params.dateFrom);
  if (params.dateTo) query.append('dateTo', params.dateTo);

  const qStr = query.toString();
  const response = await api.get(`/api/operations${qStr ? `?${qStr}` : ''}`);
  return response.data;
};

export const getDeliveredOperations = async (type = null) => {
  const url = type ? `/api/operations/delivered?type=${type}` : '/api/operations/delivered';
  const response = await api.get(url);
  return response.data;
};

export const getOperationsCounts = async () => {
  const response = await api.get('/api/operations/counts');
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

export const getFtlStatusAudits = async (reference) => {
  const response = await api.get(`/api/v1/ftl/operations/${encodeURIComponent(reference)}/status-audits`);
  return response.data;
};

/**
 * Concurrency / Soft Lock Endpoints
 */
export const lockOperation = async (id) => {
  const response = await api.post(`/api/operations/${id}/lock`);
  return response.data;
};

export const unlockOperation = async (id, force = false) => {
  const response = await api.post(`/api/operations/${id}/unlock`, { force });
  return response.data;
};

export const takeOverOperation = async (id) => {
  const response = await api.post(`/api/operations/${id}/take-over`);
  return response.data;
};

export const lockFtlOperation = async (ref) => {
  const response = await api.post(`/api/v1/ftl/operations/${encodeURIComponent(ref)}/lock`);
  return response.data;
};

export const unlockFtlOperation = async (ref, force = false) => {
  const response = await api.post(`/api/v1/ftl/operations/${encodeURIComponent(ref)}/unlock`, { force });
  return response.data;
};

export const takeOverFtlOperation = async (ref) => {
  const response = await api.post(`/api/v1/ftl/operations/${encodeURIComponent(ref)}/take-over`);
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
 * Helper to build lookup query string for Super Admin Lookups
 * Supports either legacy boolean (includeInactive) or object params ({ page, pageSize, search, status, includeInactive })
 */
const buildLookupQuery = (params) => {
  if (typeof params === 'boolean') {
    return `?includeInactive=${params}`;
  }
  if (!params || typeof params !== 'object') {
    return '?includeInactive=true';
  }
  const query = new URLSearchParams();
  if (params.page != null) query.append('page', params.page);
  if (params.pageSize != null) query.append('pageSize', params.pageSize);
  if (params.search) query.append('search', params.search);
  if (params.status) query.append('status', params.status);
  if (params.includeInactive != null) query.append('includeInactive', params.includeInactive);
  const qStr = query.toString();
  return qStr ? `?${qStr}` : '';
};

/**
 * Master Data / Lookups Full Management (Super Admin)
 */
export const getPortsFull = (params = true) => api.get(`/api/operations/ports${buildLookupQuery(params)}`).then(r => r.data);
export const getPortById = (id) => api.get(`/api/operations/ports/${id}`).then(r => r.data);
export const createPort = (data) => { clearLookupsCache(); return api.post('/api/operations/ports', data).then(r => r.data); };
export const updatePort = (id, data) => { clearLookupsCache(); return api.put(`/api/operations/ports/${id}`, data).then(r => r.data); };
export const deactivatePort = (id) => { clearLookupsCache(); return api.delete(`/api/operations/ports/${id}`).then(r => r.data); };

export const getDestinationsFull = (params = true) => api.get(`/api/operations/destinations${buildLookupQuery(params)}`).then(r => r.data);
export const getDestinationById = (id) => api.get(`/api/operations/destinations/${id}`).then(r => r.data);
export const createDestinationItem = (data) => { clearLookupsCache(); return api.post('/api/operations/destinations', data).then(r => r.data); };
export const updateDestination = (id, data) => { clearLookupsCache(); return api.put(`/api/operations/destinations/${id}`, data).then(r => r.data); };
export const deactivateDestination = (id) => { clearLookupsCache(); return api.delete(`/api/operations/destinations/${id}`).then(r => r.data); };

export const getDriversFull = (params = true) => api.get(`/api/operations/drivers${buildLookupQuery(params)}`).then(r => r.data);
export const getDriverById = (id) => api.get(`/api/operations/drivers/${id}`).then(r => r.data);
export const createDriver = (data) => { clearLookupsCache(); return api.post('/api/operations/drivers', data).then(r => r.data); };
export const updateDriver = (id, data) => { clearLookupsCache(); return api.put(`/api/operations/drivers/${id}`, data).then(r => r.data); };
export const deactivateDriver = (id) => { clearLookupsCache(); return api.delete(`/api/operations/drivers/${id}`).then(r => r.data); };

export const getShippingLinesFull = (params = true) => api.get(`/api/operations/shipping-lines${buildLookupQuery(params)}`).then(r => r.data);
export const getShippingLineById = (id) => api.get(`/api/operations/shipping-lines/${id}`).then(r => r.data);
export const createShippingLine = (data) => { clearLookupsCache(); return api.post('/api/operations/shipping-lines', data).then(r => r.data); };
export const updateShippingLine = (id, data) => { clearLookupsCache(); return api.put(`/api/operations/shipping-lines/${id}`, data).then(r => r.data); };
export const deactivateShippingLine = (id) => { clearLookupsCache(); return api.delete(`/api/operations/shipping-lines/${id}`).then(r => r.data); };

export const getTransportersFull = (params = true) => api.get(`/api/operations/transporters${buildLookupQuery(params)}`).then(r => r.data);
export const getTransporterById = (id) => api.get(`/api/operations/transporters/${id}`).then(r => r.data);
export const createTransporter = (data) => { clearLookupsCache(); return api.post('/api/operations/transporters', data).then(r => r.data); };
export const updateTransporter = (id, data) => { clearLookupsCache(); return api.put(`/api/operations/transporters/${id}`, data).then(r => r.data); };
export const deactivateTransporter = (id) => { clearLookupsCache(); return api.delete(`/api/operations/transporters/${id}`).then(r => r.data); };

export const getVehiclesFull = (params = true) => api.get(`/api/operations/vehicles${buildLookupQuery(params)}`).then(r => r.data);
export const getVehicleById = (id) => api.get(`/api/operations/vehicles/${id}`).then(r => r.data);
export const createVehicle = (data) => { clearLookupsCache(); return api.post('/api/operations/vehicles', data).then(r => r.data); };
export const updateVehicle = (id, data) => { clearLookupsCache(); return api.put(`/api/operations/vehicles/${id}`, data).then(r => r.data); };
export const deactivateVehicle = (id) => { clearLookupsCache(); return api.delete(`/api/operations/vehicles/${id}`).then(r => r.data); };

/**
 * FTL Lookups Full Management
 */
export const getFtlDriversFull = (params = true) => api.get(`/api/operations/ftl/drivers${buildLookupQuery(params)}`).then(r => r.data);
export const getFtlDriverById = (id) => api.get(`/api/operations/ftl/drivers/${id}`).then(r => r.data);
export const createFtlDriver = (data) => { clearLookupsCache(); return api.post('/api/operations/ftl/drivers', data).then(r => r.data); };
export const updateFtlDriver = (id, data) => { clearLookupsCache(); return api.put(`/api/operations/ftl/drivers/${id}`, data).then(r => r.data); };
export const deactivateFtlDriver = (id) => { clearLookupsCache(); return api.delete(`/api/operations/ftl/drivers/${id}`).then(r => r.data); };

export const getFtlTransportersFull = (params = true) => api.get(`/api/operations/ftl/transporters${buildLookupQuery(params)}`).then(r => r.data);
export const getFtlTransporterById = (id) => api.get(`/api/operations/ftl/transporters/${id}`).then(r => r.data);
export const createFtlTransporter = (data) => { clearLookupsCache(); return api.post('/api/operations/ftl/transporters', data).then(r => r.data); };
export const updateFtlTransporter = (id, data) => { clearLookupsCache(); return api.put(`/api/operations/ftl/transporters/${id}`, data).then(r => r.data); };
export const deactivateFtlTransporter = (id) => { clearLookupsCache(); return api.delete(`/api/operations/ftl/transporters/${id}`).then(r => r.data); };

export const getFtlVehiclesFull = (params = true) => api.get(`/api/operations/ftl/vehicles${buildLookupQuery(params)}`).then(r => r.data);
export const getFtlVehicleById = (id) => api.get(`/api/operations/ftl/vehicles/${id}`).then(r => r.data);
export const createFtlVehicle = (data) => { clearLookupsCache(); return api.post('/api/operations/ftl/vehicles', data).then(r => r.data); };
export const updateFtlVehicle = (id, data) => { clearLookupsCache(); return api.put(`/api/operations/ftl/vehicles/${id}`, data).then(r => r.data); };
export const deactivateFtlVehicle = (id) => { clearLookupsCache(); return api.delete(`/api/operations/ftl/vehicles/${id}`).then(r => r.data); };

export const getFtlAirportsFull = (params = true) => api.get(`/api/operations/ftl/airports${buildLookupQuery(params)}`).then(r => r.data);
export const getFtlAirportById = (id) => api.get(`/api/operations/ftl/airports/${id}`).then(r => r.data);
export const createFtlAirport = (data) => { clearLookupsCache(); return api.post('/api/operations/ftl/airports', data).then(r => r.data); };
export const updateFtlAirport = (id, data) => { clearLookupsCache(); return api.put(`/api/operations/ftl/airports/${id}`, data).then(r => r.data); };
export const deactivateFtlAirport = (id) => { clearLookupsCache(); return api.delete(`/api/operations/ftl/airports/${id}`).then(r => r.data); };

export const getFtlTerminalsFull = (params = true) => api.get(`/api/operations/ftl/terminals${buildLookupQuery(params)}`).then(r => r.data);
export const getFtlTerminalById = (id) => api.get(`/api/operations/ftl/terminals/${id}`).then(r => r.data);
export const createFtlTerminal = (data) => { clearLookupsCache(); return api.post('/api/operations/ftl/terminals', data).then(r => r.data); };
export const updateFtlTerminal = (id, data) => { clearLookupsCache(); return api.put(`/api/operations/ftl/terminals/${id}`, data).then(r => r.data); };
export const deactivateFtlTerminal = (id) => { clearLookupsCache(); return api.delete(`/api/operations/ftl/terminals/${id}`).then(r => r.data); };

/**
 * FTL Operations Endpoints (Counts, Paged Lazy Load, Deliver, Reopen)
 */
export const getFtlOperationsCounts = async () => {
  // 1. Try dedicated counts endpoints
  try {
    const response = await api.get('/api/operations/ftl/counts');
    if (response?.data && (response.data.inactiveCount !== undefined || response.data.InactiveCount !== undefined)) {
      return response.data;
    }
  } catch {
    // continue to fallback
  }

  try {
    const response = await api.get('/api/v1/ftl/counts');
    if (response?.data && (response.data.inactiveCount !== undefined || response.data.InactiveCount !== undefined)) {
      return response.data;
    }
  } catch {
    // continue to fallback
  }

  // 2. Direct fast paged query fallback (guaranteed to match FtlDeliveredArchive and FtlInactiveArchive)
  try {
    const [delRes, inactRes, impRes, expRes] = await Promise.allSettled([
      getPagedFtlOperations({ page: 1, pageSize: 1, status: 'Delivered', onlyActive: false, isDeleted: false }),
      getPagedFtlOperations({ page: 1, pageSize: 1, isDeleted: true }),
      getPagedFtlOperations({ page: 1, pageSize: 1, operationType: 'Import', onlyActive: true, isDeleted: false }),
      getPagedFtlOperations({ page: 1, pageSize: 1, operationType: 'Export', onlyActive: true, isDeleted: false }),
    ]);

    const extractCount = (res) => {
      if (res.status !== 'fulfilled' || !res.value) return 0;
      const data = res.value;
      if (typeof data.totalCount === 'number') return data.totalCount;
      if (typeof data.TotalCount === 'number') return data.TotalCount;
      if (Array.isArray(data)) return data.length;
      if (Array.isArray(data.items)) return data.items.length;
      if (Array.isArray(data.Items)) return data.Items.length;
      return 0;
    };

    return {
      activeImportCount: extractCount(impRes),
      activeExportCount: extractCount(expRes),
      deliveredCount: extractCount(delRes),
      inactiveCount: extractCount(inactRes),
    };
  } catch (err) {
    console.error('[FTL] Failed to fetch operations counts fallback:', err);
    return null;
  }
};

export const getPagedFtlOperations = async (params = {}, config = {}) => {
  const query = new URLSearchParams();
  if (params.page != null) query.append('page', params.page);
  if (params.pageSize != null) query.append('pageSize', params.pageSize);
  if (params.operationType) query.append('operationType', params.operationType);
  if (params.status) query.append('status', params.status);
  if (params.onlyActive != null) query.append('onlyActive', params.onlyActive);
  if (params.isDeleted != null) query.append('isDeleted', params.isDeleted);
  if (params.search) query.append('search', params.search);
  if (params.client) query.append('client', params.client);
  if (params.transporter) query.append('transporter', params.transporter);
  if (params.terminal) query.append('terminal', params.terminal);
  if (params.createdBy) query.append('createdBy', params.createdBy);
  if (params.dateType) query.append('dateType', params.dateType);
  if (params.dateFrom) query.append('dateFrom', params.dateFrom);
  if (params.dateTo) query.append('dateTo', params.dateTo);
  if (params.sortBy) query.append('sortBy', params.sortBy);
  if (params.sortDirection) query.append('sortDirection', params.sortDirection);
  if (params.rulesJson) query.append('rulesJson', params.rulesJson);

  const url = `/api/operations/ftl?${query.toString()}`;
  const response = await api.get(url, config);
  return response.data;
};

export const getFtlFilterOptions = async (params = {}, config = {}) => {
  const query = new URLSearchParams();
  if (params.operationType) query.append('operationType', params.operationType);
  if (params.status) query.append('status', params.status);
  if (params.onlyActive != null) query.append('onlyActive', params.onlyActive);
  if (params.isDeleted != null) query.append('isDeleted', params.isDeleted);

  const url = `/api/operations/ftl/filter-options?${query.toString()}`;
  const response = await api.get(url, config);
  return response.data;
};

export const deliverFtlOperation = async (reference) => {
  const response = await api.put(`/api/operations/ftl/${encodeURIComponent(reference)}/deliver`);
  return response.data;
};

export const reopenFtlOperation = async (reference, reason) => {
  const response = await api.put(`/api/operations/ftl/${encodeURIComponent(reference)}/reopen`, {
    reason: reason || 'Reopened from FTL Data Entry',
  });
  return response.data;
};

