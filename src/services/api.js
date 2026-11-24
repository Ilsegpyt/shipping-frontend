
import axios from 'axios';


const API_BASE_URL = (
    import.meta.env.VITE_API_BASE_URL ?? ''
).replace(/\/+$/, '');


const api = axios.create({
    baseURL: API_BASE_URL,
});

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (callback) => {
    refreshSubscribers.push(callback);
};

const onRefreshed = (accessToken) => {
    refreshSubscribers.forEach((callback) => callback(accessToken));
    refreshSubscribers = [];
};

const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
        throw new Error('No refresh token available.');
    }

    const response = await axios.post(
        `${API_BASE_URL}/api/auth/refresh`,
        { refreshToken }
    );

    const {
        accessToken,
        refreshToken: newRefreshToken,
        accessTokenExpiresAtUtc,
    } = response.data;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', newRefreshToken);
    localStorage.setItem(
        'accessTokenExpiresAtUtc',
        accessTokenExpiresAtUtc
    );

    return accessToken;
};

api.interceptors.request.use(
    (config) => {
        const accessToken = localStorage.getItem('accessToken');

        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,

    async (error) => {
        const originalRequest = error.config;

        // Handle rate limiting (429) with automatic graceful retry
        if (error.response?.status === 429 && originalRequest && !originalRequest._rateLimitRetried) {
            originalRequest._rateLimitRetried = true;
            const retryAfterHeader = error.response.headers?.['retry-after'];
            const delayMs = retryAfterHeader && !isNaN(Number(retryAfterHeader))
                ? Number(retryAfterHeader) * 1000
                : 2000;

            console.warn(`[RateLimit] 429 received for ${originalRequest.url}. Retrying automatically in ${delayMs}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));

            return api(originalRequest);
        }

        // Handle rate limiting rejection if retry already failed or no config
        if (error.response?.status === 429) {
            error.message =
                error.response.data?.message ||
                'You have exceeded the allowed number of requests. Please try again in a few seconds.';

            return Promise.reject(error);
        }

        const isDeactivatedError =
            error.response?.status === 403 ||
            (error.response?.status === 400 &&
                typeof error.response?.data === 'string' &&
                error.response.data.toLowerCase().includes('deactivated'));

        if (isDeactivatedError && localStorage.getItem('accessToken')) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('accessTokenExpiresAtUtc');
            window.location.href = '/login';
            return Promise.reject(error);
        }

        if (
            error.response?.status !== 401 ||
            !originalRequest ||
            originalRequest._retry ||
            originalRequest.url?.includes('/api/auth/refresh')
        ) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                subscribeTokenRefresh((accessToken) => {
                    if (!accessToken) {
                        reject(error);
                        return;
                    }

                    originalRequest.headers.Authorization =
                        `Bearer ${accessToken}`;

                    resolve(api(originalRequest));
                });
            });
        }

        isRefreshing = true;

        try {
            const newAccessToken = await refreshAccessToken();

            onRefreshed(newAccessToken);

            originalRequest.headers.Authorization =
                `Bearer ${newAccessToken}`;

            return api(originalRequest);
        } catch (refreshError) {
            refreshSubscribers = [];

            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('accessTokenExpiresAtUtc');

            window.location.href = '/login';

            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);

export default api;
