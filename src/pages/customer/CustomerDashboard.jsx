import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const initialForm = {
    origin: '',
    destination: '',
    departureDate: '',
    containerSize: '',
};

const containerSizeMap = {
    'Dry 20 Standard': 1,
    'Dry 40 Standard': 2,
    'Dry 40 High': 3,
    'Dry 45 High': 4,
    'Reefer 20 Standard': 5,
    'Reefer 40 High': 6,
    'Open Top 20': 7,
    'Open Top 40': 8,
    'Open Top 40 High': 9,
    'Flat 40 Standard': 10,
    'Flat 40 High': 11,
    'Flat 20': 12,
    'Tank 20': 13,
    'Tank 40': 14,
};

const containerSizes = [
    { value: 'Dry 20 Standard', label: 'Dry 20 Standard' },
    { value: 'Dry 40 Standard', label: 'Dry 40 Standard' },
    { value: 'Dry 40 High', label: 'Dry 40 High' },
    { value: 'Dry 45 High', label: 'Dry 45 High' },
    { value: 'Reefer 20 Standard', label: 'Reefer 20 Standard' },
    { value: 'Reefer 40 High', label: 'Reefer 40 High' },
    { value: 'Open Top 20', label: 'Open Top 20' },
    { value: 'Open Top 40', label: 'Open Top 40' },
    { value: 'Open Top 40 High', label: 'Open Top 40 High' },
    { value: 'Flat 40 Standard', label: 'Flat 40 Standard' },
    { value: 'Flat 40 High', label: 'Flat 40 High' },
    { value: 'Flat 20', label: 'Flat 20' },
    { value: 'Tank 20', label: 'Tank 20' },
    { value: 'Tank 40', label: 'Tank 40' },
];

function normalizeContainerSize(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    if (typeof value === 'number') {
        return value;
    }

    const normalizedValue = String(value).trim();

    if (!Number.isNaN(Number(normalizedValue))) {
        return Number(normalizedValue);
    }

    return containerSizeMap[normalizedValue] ?? null;
}

function normalizeExcelDate(value) {
    if (!value) {
        return '';
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().split('T')[0];
    }

    if (typeof value === 'number') {
        const excelDate = XLSX.SSF.parse_date_code(value);

        if (excelDate) {
            const month = String(excelDate.m).padStart(2, '0');
            const day = String(excelDate.d).padStart(2, '0');

            return `${excelDate.y}-${month}-${day}`;
        }
    }

    const stringValue = String(value).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(stringValue)) {
        return stringValue;
    }

    const parsedDate = new Date(stringValue);

    if (!Number.isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().split('T')[0];
    }

    return stringValue;
}

function formatDate(value) {
    if (!value) {
        return '-';
    }

    return String(value).split('T')[0];
}

export default function CustomerDashboard() {
    const navigate = useNavigate();

    const [form, setForm] = useState(initialForm);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [excelRows, setExcelRows] = useState([]);

    useEffect(() => {
        try {
            const savedState = sessionStorage.getItem('customer-schedules-search');

            if (!savedState) {
                return;
            }

            const parsedState = JSON.parse(savedState);

            if (parsedState.form) {
                setForm(parsedState.form);
            }

            if (Array.isArray(parsedState.results)) {
                setResults(parsedState.results);
            }
        } catch (error) {
            console.error('Failed to restore schedule search state:', error);
        }
    }, []);

    const saveSearchState = (nextForm, nextResults) => {
        sessionStorage.setItem(
            'customer-schedules-search',
            JSON.stringify({
                form: nextForm,
                results: nextResults,
            })
        );
    };

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    };

    const handleReset = () => {
        setForm(initialForm);
        setResults([]);
        setError('');
        setSelectedFile(null);
        setExcelRows([]);
        sessionStorage.removeItem('customer-schedules-search');

        const fileInput = document.getElementById('schedule-excel-file');

        if (fileInput) {
            fileInput.value = '';
        }
    };

    const handleSearch = async () => {
        if (
            !form.origin ||
            !form.destination ||
            !form.departureDate ||
            !form.containerSize
        ) {
            setError('Please fill in all search fields.');
            setResults([]);
            return;
        }

        try {
            setLoading(true);
            setError('');
            setResults([]);

            const response = await api.get('/api/customers/schedules/search', {
                params: {
                    origin: form.origin,
                    destination: form.destination,
                    departureDate: form.departureDate,
                    containerSize: form.containerSize,
                },
            });

            setResults(response.data);
            saveSearchState(form, response.data);
        } catch (error) {
            console.error('Schedule search failed:', error);

            setError(
                error.response?.data?.error ||
                error.response?.data?.message ||
                'Failed to search schedules.'
            );

            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = async (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        setSelectedFile(file);
        setError('');
        setResults([]);
        setExcelRows([]);

        try {
            const fileBuffer = await file.arrayBuffer();

            const workbook = XLSX.read(fileBuffer, {
                type: 'array',
                cellDates: true,
            });

            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            const rows = XLSX.utils.sheet_to_json(worksheet, {
                defval: '',
            });

            if (!rows.length) {
                setError('The selected Excel file is empty.');
                return;
            }

            const mappedRows = rows.map((row, index) => {
                const origin =
                    row.Origin ??
                    row.origin ??
                    row['Origin Port'] ??
                    row['Origin Port Code'] ??
                    '';

                const destination =
                    row.Destination ??
                    row.destination ??
                    row['Destination Port'] ??
                    row['Destination Port Code'] ??
                    '';

                const departureDate =
                    row.DepartureDate ??
                    row.departureDate ??
                    row['Departure Date'] ??
                    '';

                const containerSize =
                    row.ContainerSize ??
                    row.containerSize ??
                    row['Container Size'] ??
                    '';

                return {
                    rowNumber: index + 2,
                    origin: String(origin).trim(),
                    destination: String(destination).trim(),
                    departureDate: normalizeExcelDate(departureDate),
                    containerSize: String(containerSize).trim(),
                };
            });

            const invalidRows = mappedRows.filter(
                (row) =>
                    !row.origin ||
                    !row.destination ||
                    !row.departureDate ||
                    !row.containerSize
            );

            if (invalidRows.length > 0) {
                setError(
                    `Invalid data in Excel row(s): ${invalidRows
                        .map((row) => row.rowNumber)
                        .join(', ')}. Please check the required columns.`
                );

                setExcelRows(mappedRows);
                return;
            }

            setExcelRows(mappedRows);
        } catch (error) {
            console.error('Excel file processing failed:', error);

            setError('Failed to read the Excel file.');
            setExcelRows([]);
        }
    };

    const handleExcelSearch = async () => {
        if (!excelRows.length) {
            setError('Please select a valid Excel file first.');
            return;
        }

        try {
            setLoading(true);
            setError('');
            setResults([]);

            const response = await api.post('/api/schedules/multi-search', {
                routes: excelRows.map((row) => ({
                    origin: row.origin,
                    destination: row.destination,
                    departureDate: row.departureDate,
                    containerSize: row.containerSize,
                })),
            });

            setResults(response.data);
            saveSearchState(form, response.data);
        } catch (error) {
            console.error('Excel schedule search failed:', error);

            setError(
                error.response?.data?.error ||
                error.response?.data?.message ||
                'Failed to search schedules from Excel.'
            );

            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-full bg-gray-50 p-4 sm:p-6">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900">
                            Search Schedules
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                            Search available schedules manually or upload an
                            Excel file.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleReset}
                        className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
                    >
                        Reset
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <input
                        type="text"
                        name="origin"
                        value={form.origin}
                        onChange={handleChange}
                        placeholder="Origin"
                        className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />

                    <input
                        type="text"
                        name="destination"
                        value={form.destination}
                        onChange={handleChange}
                        placeholder="Destination"
                        className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />

                    <input
                        type="date"
                        name="departureDate"
                        value={form.departureDate}
                        onChange={handleChange}
                        className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />

                    <select
                        name="containerSize"
                        value={form.containerSize}
                        onChange={handleChange}
                        className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    >
                        <option value="">Container Size</option>

                        {containerSizes.map((container) => (
                            <option
                                key={container.value}
                                value={container.value}
                            >
                                {container.label}
                            </option>
                        ))}
                    </select>

                    <button
                        type="button"
                        onClick={handleSearch}
                        disabled={loading}
                        className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#111827] px-4 text-sm font-semibold text-white transition hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                </div>

                <div className="my-5 flex items-center gap-3">
                    <div className="h-px flex-1 bg-slate-200" />

                    <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Or
                    </span>

                    <div className="h-px flex-1 bg-slate-200" />
                </div>

                <div className="flex flex-col gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 md:flex-row md:items-end md:justify-between">
                    <div className="flex-1">
                        <label
                            htmlFor="schedule-excel-file"
                            className="mb-2 block text-sm font-medium text-slate-700"
                        >
                            Upload Excel File
                        </label>

                        <input
                            id="schedule-excel-file"
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-100"
                        />

                        <p className="mt-2 text-xs text-slate-500">
                            Required columns: Origin, Destination,
                            DepartureDate, ContainerSize
                        </p>

                        {selectedFile && (
                            <div className="mt-2 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                                <p className="truncate text-xs font-medium text-slate-700">
                                    Selected file: {selectedFile.name}
                                </p>

                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="ml-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                                    aria-label="Remove selected file"
                                    title="Remove file"
                                >
                                    ×
                                </button>
                            </div>
                        )}

                        {excelRows.length > 0 && (
                            <p className="mt-1 text-xs text-emerald-600">
                                {excelRows.length} row(s) ready for search.
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={handleExcelSearch}
                        disabled={loading || !excelRows.length}
                        className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? 'Searching...' : 'Search Excel'}
                    </button>
                </div>

                {error && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}
            </div>

            {results.length > 0 && (
                <div className="mt-6">
                    <div className="mb-4">
                        <h2 className="text-sm font-semibold text-slate-900">
                            Available Schedules
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            {results.length} schedule
                            {results.length !== 1 ? 's' : ''} found
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        {results.map((schedule) => (
                            <div
                                key={schedule.id}
                                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                            Route
                                        </p>

                                        <h3 className="mt-1 text-base font-semibold text-slate-900">
                                            {schedule.origin || '-'}
                                            <span className="mx-2 text-slate-400">
                                                →
                                            </span>
                                            {schedule.destination || '-'}
                                        </h3>
                                    </div>

                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                        {schedule.mode || '-'}
                                    </span>
                                </div>

                                <div className="mt-5 grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-400">
                                            Departure
                                        </p>
                                        <p className="mt-1 text-sm font-medium text-slate-700">
                                            {formatDate(schedule.departureDate)}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-slate-400">
                                            Arrival
                                        </p>
                                        <p className="mt-1 text-sm font-medium text-slate-700">
                                            {formatDate(schedule.arrival)}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-slate-400">
                                            Vessel
                                        </p>
                                        <p className="mt-1 text-sm font-medium text-slate-700">
                                            {schedule.vessel || '-'}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-slate-400">
                                            Carrier
                                        </p>
                                        <p className="mt-1 text-sm font-medium text-slate-700">
                                            {schedule.carrier || '-'}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-slate-400">
                                            Container
                                        </p>
                                        <p className="mt-1 text-sm font-medium text-slate-700">
                                            {schedule.containerSize
                                                ? containerSizes.find(
                                                    (container) =>
                                                        container.value ===
                                                        schedule.containerSize
                                                )?.label ||
                                                schedule.containerSize
                                                : '-'}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-slate-400">
                                            Rate
                                        </p>
                                        <p className="mt-1 text-sm font-semibold text-slate-900">
                                            {schedule.rateAmount ?? '-'}{' '}
                                            {schedule.rateCurrency || ''}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            navigate(
                                                `/customer/schedules/${schedule.id}`
                                            )
                                        }
                                        className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f2937]"
                                    >
                                        View Details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!loading &&
                !error &&
                results.length === 0 &&
                form.origin &&
                form.destination &&
                form.departureDate &&
                form.containerSize && (
                    <div className="mt-6 rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                        No schedules found for the selected criteria.
                    </div>
                )}
        </div>
    );
}