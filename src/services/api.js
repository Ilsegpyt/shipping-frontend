import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5250',
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
        'http://localhost:5250/api/auth/refresh',
        {
            refreshToken,
        }
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

        if (
            error.response?.status !== 401 ||
            originalRequest?._retry ||
            originalRequest?.url?.includes('/api/auth/refresh')
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