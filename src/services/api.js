
import axios from 'axios';

const API_BASE_URL = (
    import.meta.env.VITE_API_BASE_URL ?? ''
).replace(/\/+$/, '');

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

let inMemoryAccessToken = null;

export const setAccessToken = (token) => {
    inMemoryAccessToken = token;
};

export const getAccessToken = () => {
    return inMemoryAccessToken;
};

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (callback) => {
    refreshSubscribers.push(callback);
};

const onRefreshed = (accessToken) => {
    refreshSubscribers.forEach((callback) => callback(accessToken));
    refreshSubscribers = [];
};

export const refreshAccessToken = async (fallbackRefreshToken) => {
    const payload = fallbackRefreshToken ? { refreshToken: fallbackRefreshToken } : {};

    const response = await axios.post(
        `${API_BASE_URL}/api/auth/refresh`,
        payload,
        { withCredentials: true }
    );

    const {
        accessToken,
    } = response.data;

    setAccessToken(accessToken);

    return accessToken;
};

api.interceptors.request.use(
    (config) => {
        const accessToken = getAccessToken();

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

        if (isDeactivatedError) {
            setAccessToken(null);
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
            setAccessToken(null);

            window.location.href = '/login';

            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);

export default api;
