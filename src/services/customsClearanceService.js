import api from './api';

// Report types and statuses exactly as the API sends them.
export const REPORT_TYPES = ['OceanImport', 'OceanExport', 'Domestic'];
export const SHIPMENT_STATUSES = ['Open', 'Closed'];
export const CONTAINER_TYPES = [
    'DryStandard20',
    'DryStandard40',
    'DryHigh40',
    'DryHigh45',
    'ReeferStandard20',
    'ReeferHigh40',
    'OpenTop20',
    'OpenTop40',
    'OpenTopHigh40',
    'FlatStandard40',
    'FlatHigh40',
    'Flat20',
    'Tank20',
    'Tank40',
];

const customsClearanceService = {
    // Server-side paging & search. status: 'Open' (table) | 'Closed' (archive).
    // alert: EtaSoon | EtaOverdue | FreeTimeSoon | FreeTimeExpired | Any (Open Ocean Import only).
    getAll: async ({ reportType, status = 'Open', pageNumber = 1, pageSize = 20, search = '', alert = '' } = {}) => {
        const params = { reportType, status, pageNumber, pageSize };

        if (search && search.trim()) {
            params.search = search.trim();
        }

        if (alert) {
            params.alert = alert;
        }

        const response = await api.get('/api/customs-clearance/shipments', { params });
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/api/customs-clearance/shipments/${id}`);
        return response.data;
    },

    create: async (payload) => {
        const response = await api.post('/api/customs-clearance/shipments', payload);
        return response.data;
    },

    update: async (id, payload) => {
        const response = await api.put(`/api/customs-clearance/shipments/${id}`, payload);
        return response.data;
    },

    // One-way. There is no reopen and no delete.
    close: async (id) => {
        const response = await api.post(`/api/customs-clearance/shipments/${id}/close`);
        return response.data;
    },

    getUpdates: async (id) => {
        const response = await api.get(`/api/customs-clearance/shipments/${id}/updates`);
        return response.data;
    },

    addUpdate: async (id, updateText) => {
        const response = await api.post(`/api/customs-clearance/shipments/${id}/updates`, { updateText });
        return response.data;
    },

    // { clients: [{id, name}], ports: [{id, name, code}], shippingLines: [{id, name, abbreviation}],
    //   terminals: [{id, name}], containerTypes: string[], clearanceTypes: string[] }
    getLookups: async () => {
        const response = await api.get('/api/customs-clearance/lookups');
        return response.data;
    },

    // Soft delete: moves the shipment to the read-only Inactive archive (no reactivate).
    deactivate: async (id) => {
        const response = await api.delete(`/api/customs-clearance/shipments/${id}`);
        return response.data;
    },

    // Inactive archive page (server-side paging, newest deactivated first). reportType '' = all reports.
    // dateType: 'Inactive' | 'Created'; dateFrom / dateTo: 'YYYY-MM-DD' (Cairo days, inclusive).
    getInactive: async ({ reportType = '', pageNumber = 1, pageSize = 20, search = '', inactiveBy = '', dateType = 'Inactive', dateFrom = '', dateTo = '', signal } = {}) => {
        const params = { isDeleted: true, pageNumber, pageSize, dateType };
        if (reportType) params.reportType = reportType;
        if (search && search.trim()) params.search = search.trim();
        if (inactiveBy) params.inactiveBy = inactiveBy;
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo) params.dateTo = dateTo;

        const response = await api.get('/api/customs-clearance/shipments', { params, signal });
        return response.data;
    },

    // Distinct "Inactive by" names for the archive filter.
    getInactiveBy: async (reportType = '', { signal } = {}) => {
        const response = await api.get('/api/customs-clearance/shipments/inactive-by', {
            params: reportType ? { reportType } : {},
            signal,
        });
        return response.data;
    },

    // { open, closed, inactive } x { oceanImport, oceanExport, domestic, total }: one grouped count, no rows.
    getCounts: async () => {
        const response = await api.get('/api/customs-clearance/counts');
        return response.data;
    },

    // Customs Finance (Open Ocean Import, Cairo dates). tab: Forecast | Request | Approved | Excluded.
    // Answer: { items, totalCount, pageNumber, pageSize, today, totals: { egp, eur, usd } }; amounts are null for now.
    getFinance: async ({ tab = 'Forecast', pageNumber = 1, pageSize = 20, search = '', signal } = {}) => {
        const params = { tab, pageNumber, pageSize };
        if (search && search.trim()) params.search = search.trim();
        const response = await api.get('/api/customs-clearance/finance', { params, signal });
        return response.data;
    },

    // { today, forecast, request, approved, excluded }
    getFinanceCounts: async ({ signal } = {}) => {
        const response = await api.get('/api/customs-clearance/finance/counts', { signal });
        return response.data;
    },

    approveFinance: async (id, note = '') => {
        await api.post(`/api/customs-clearance/finance/${id}/approve`, { note: note.trim() || null });
    },

    // mode: 'Defer' (deferredUntilDate 'YYYY-MM-DD', after today) | 'OnHold'
    excludeFinance: async (id, { mode, deferredUntilDate = null, note = '' }) => {
        await api.post(`/api/customs-clearance/finance/${id}/exclude`, {
            mode,
            deferredUntilDate: mode === 'Defer' ? deferredUntilDate : null,
            note: note.trim() || null,
        });
    },

    restoreFinance: async (id) => {
        await api.post(`/api/customs-clearance/finance/${id}/restore`);
    },

    // { today, etaSoon, etaOverdue, freeTimeSoon, freeTimeExpired, total } over all Open Ocean Import shipments.
    getAlertsSummary: async () => {
        const response = await api.get('/api/customs-clearance/alerts/summary');
        return response.data;
    },
};

export const CUSTOMS_PERMISSIONS = {
    view: 'customsclearance.shipments.view',
    create: 'customsclearance.shipments.create',
    edit: 'customsclearance.shipments.edit',
    close: 'customsclearance.shipments.close',
    delete: 'customsclearance.shipments.delete',
};

// Same rule as transportersService.hasPermission.
export const hasPermission = (user, permission) =>
    Boolean(
        user?.isSuperAdmin ||
        user?.role === 'SuperAdmin' ||
        user?.roleName === 'Super Admin' ||
        user?.permissions?.includes(permission)
    );

export default customsClearanceService;
