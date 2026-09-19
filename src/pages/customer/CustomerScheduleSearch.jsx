import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchSchedules } from '../../services/schedulesService';

const initialForm = {
    origin: '',
    destination: '',
    departureDate: '',
    containerSize: '',
};

const getSchedulesFromResponse = (response) => {
    if (Array.isArray(response)) {
        return response;
    }

    if (Array.isArray(response?.items)) {
        return response.items;
    }

    if (Array.isArray(response?.data)) {
        return response.data;
    }

    if (Array.isArray(response?.results)) {
        return response.results;
    }

    return [];
};

const getValue = (schedule, ...keys) => {
    for (const key of keys) {
        const value = schedule?.[key];

        if (value !== undefined && value !== null && value !== '') {
            return value;
        }
    }

    return 'N/A';
};

const formatDateTime = (value) => {
    if (!value || value === 'N/A') {
        return 'N/A';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
};

const formatDate = (value) => {
    if (!value || value === 'N/A') {
        return 'N/A';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString('en-GB');
};

const formatRate = (currency, amount) => {
    if (amount === 'N/A') {
        return 'N/A';
    }

    const numericAmount = Number(amount);

    if (Number.isNaN(numericAmount)) {
        return `${currency} ${amount}`;
    }

    return `${currency} ${numericAmount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

export default function CustomerScheduleSearch() {
    const navigate = useNavigate();

    const [form, setForm] = useState(initialForm);
    const [schedules, setSchedules] = useState([]);
    const [quantities, setQuantities] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setIsLoading(true);
        setError('');

        try {
            const response = await searchSchedules({
                origin: form.origin || undefined,
                destination: form.destination || undefined,
                departureDate: form.departureDate || undefined,
                containerSize: form.containerSize || undefined,
            });

            const results = getSchedulesFromResponse(response);

            setSchedules(results);

            setQuantities((current) => {
                const next = { ...current };

                results.forEach((schedule) => {
                    const id = schedule.id ?? schedule.scheduleId;
                    if (id && !next[id]) {
                        next[id] = 1;
                    }
                });

                return next;
            });
        } catch (requestError) {
            setSchedules([]);

            setError(
                requestError.response?.data?.message ||
                requestError.response?.data?.error ||
                'Failed to load available schedules.'
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setForm(initialForm);
        setSchedules([]);
        setQuantities({});
        setError('');
    };

    const handleQuantityChange = (scheduleId, value) => {
        const quantity = Math.max(1, Number(value) || 1);

        setQuantities((current) => ({
            ...current,
            [scheduleId]: quantity,
        }));
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                    Schedule Search
                </h1>

                <p className="mt-2 text-sm text-gray-500">
                    Find available schedules based on your shipping
                    requirements.
                </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <form
                    onSubmit={handleSubmit}
                    className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
                >
                    <div>
                        <label
                            htmlFor="origin"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            Origin
                        </label>

                        <input
                            id="origin"
                            name="origin"
                            value={form.origin}
                            onChange={handleChange}
                            placeholder="Enter origin"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="destination"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            Destination
                        </label>

                        <input
                            id="destination"
                            name="destination"
                            value={form.destination}
                            onChange={handleChange}
                            placeholder="Enter destination"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="departureDate"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            Departure Date
                        </label>

                        <input
                            id="departureDate"
                            name="departureDate"
                            type="date"
                            value={form.departureDate}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="containerSize"
                            className="mb-1 block text-sm font-medium text-gray-700"
                        >
                            Container Size
                        </label>

                        <select
                            id="containerSize"
                            name="containerSize"
                            value={form.containerSize}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        >
                            <option value="">Select size</option>
                            <option value="20FT">20FT</option>
                            <option value="40FT">40FT</option>
                            <option value="40HC">40HC</option>
                        </select>
                    </div>

                    <div className="flex items-end gap-3 md:col-span-2 lg:col-span-4">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="rounded-lg bg-[#111827] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isLoading ? 'Searching...' : 'Search'}
                        </button>

                        <button
                            type="button"
                            onClick={handleReset}
                            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                        >
                            Reset
                        </button>
                    </div>
                </form>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                        Available Schedules
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                        {schedules.length} schedule
                        {schedules.length !== 1 ? 's' : ''} found
                    </p>
                </div>
            </div>

            {isLoading ? (
                <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
                    <p className="text-sm text-gray-500">
                        Loading available schedules...
                    </p>
                </div>
            ) : schedules.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
                    <h3 className="text-base font-semibold text-gray-900">
                        No schedules found
                    </h3>

                    <p className="mt-2 text-sm text-gray-500">
                        Enter your search criteria and click Search.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    {schedules.map((schedule) => {
                        const scheduleId =
                            schedule.id ?? schedule.scheduleId;

                        const quantity = quantities[scheduleId] ?? 1;

                        const currency = getValue(
                            schedule,
                            'rateCurrency',
                            'currency'
                        );

                        const rateAmount = getValue(
                            schedule,
                            'rateAmount',
                            'rate',
                            'price'
                        );

                        const totalAmount =
                            rateAmount === 'N/A'
                                ? 'N/A'
                                : Number(rateAmount) * quantity;

                        const origin = getValue(
                            schedule,
                            'origin',
                            'departure',
                            'departurePort',
                            'originPort'
                        );

                        const destination = getValue(
                            schedule,
                            'destination',
                            'arrival',
                            'arrivalPort',
                            'destinationPort'
                        );

                        const departureDate = getValue(
                            schedule,
                            'departureDate',
                            'departureAt',
                            'departureDateTime'
                        );

                        const arrivalDate = getValue(
                            schedule,
                            'arrivalDate',
                            'arrivalAt',
                            'arrivalDateTime'
                        );

                        return (
                            <div
                                key={scheduleId}
                                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                            {getValue(
                                                schedule,
                                                'mode',
                                                'transportMode'
                                            )}{' '}
                                            Schedule
                                        </p>

                                        <h3 className="mt-2 text-lg font-semibold text-gray-900">
                                            {origin}

                                            <span className="mx-2 text-gray-400">
                                                →
                                            </span>

                                            {destination}
                                        </h3>

                                        <p className="mt-1 text-sm font-medium text-gray-700">
                                            {getValue(
                                                schedule,
                                                'carrier',
                                                'carrierName'
                                            )}
                                        </p>

                                        <p className="text-sm text-gray-500">
                                            {getValue(
                                                schedule,
                                                'vessel',
                                                'vesselName'
                                            )}
                                        </p>
                                    </div>

                                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                                        Available
                                    </span>
                                </div>

                                <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-500">
                                            Transit Time
                                        </p>

                                        <p className="mt-1 font-medium text-gray-900">
                                            {getValue(
                                                schedule,
                                                'transitTime',
                                                'duration'
                                            )}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-gray-500">Rate</p>

                                        <p className="mt-1 font-medium text-gray-900">
                                            {formatRate(currency, rateAmount)}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-gray-500">
                                            Departure
                                        </p>

                                        <p className="mt-1 font-medium text-gray-900">
                                            {origin}
                                        </p>

                                        <p className="text-xs text-gray-500">
                                            {formatDateTime(departureDate)}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-gray-500">Arrival</p>

                                        <p className="mt-1 font-medium text-gray-900">
                                            {destination}
                                        </p>

                                        <p className="text-xs text-gray-500">
                                            {formatDateTime(arrivalDate)}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-gray-500">
                                            Container Size
                                        </p>

                                        <p className="mt-1 font-medium text-gray-900">
                                            {getValue(
                                                schedule,
                                                'containerSize',
                                                'containerType'
                                            )}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-gray-500">
                                            Valid Until
                                        </p>

                                        <p className="mt-1 font-medium text-gray-900">
                                            {formatDate(
                                                getValue(
                                                    schedule,
                                                    'validityDate',
                                                    'validUntil'
                                                )
                                            )}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-gray-500">
                                            Free Time
                                        </p>

                                        <p className="mt-1 font-medium text-gray-900">
                                            {getValue(
                                                schedule,
                                                'freeTimeAtPOD',
                                                'freeTime',
                                                'freeTimeDays'
                                            )}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-gray-500">
                                            Voyage Number
                                        </p>

                                        <p className="mt-1 font-medium text-gray-900">
                                            {getValue(
                                                schedule,
                                                'voyageNumber',
                                                'voyage'
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 border-t border-gray-100 pt-5">
                                    <div className="flex flex-wrap items-end justify-between gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500">
                                                Number of Containers
                                            </p>

                                            <input
                                                type="number"
                                                min="1"
                                                value={quantity}
                                                onChange={(event) =>
                                                    handleQuantityChange(
                                                        scheduleId,
                                                        event.target.value
                                                    )
                                                }
                                                className="mt-1 w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                            />
                                        </div>

                                        <div>
                                            <p className="text-xs text-gray-500">
                                                Total Amount
                                            </p>

                                            <p className="mt-1 text-lg font-semibold text-gray-900">
                                                {formatRate(
                                                    currency,
                                                    totalAmount
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                navigate(
                                                    `/customer/schedules/${scheduleId}`
                                                )
                                            }
                                            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                                        >
                                            View Details
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                navigate(
                                                    `/customer/schedules/${scheduleId}?booking=true`,
                                                    {
                                                        state: {
                                                            schedule,
                                                            quantity,
                                                        },
                                                    }
                                                )
                                            }
                                            className="rounded-lg bg-[#111827] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f2937]"
                                        >
                                            Book Shipment
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
