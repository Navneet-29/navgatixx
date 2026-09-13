import axios from 'axios';

const FALLBACK_URLS = [
    'http://192.168.1.67:5293/api',
    'http://10.0.2.2:5293/api',
    'http://localhost:5293/api',
    'http://172.26.32.159:5293/api',
    'http://10.87.66.191:5293/api',
    'http://172.21.28.50:5293/api'
];

let activeWorkingBaseUrl: string | null = null;

const isNativePlatform = () => {
    return typeof window !== 'undefined' && Boolean((window as any)?.Capacitor?.isNativePlatform?.());
};

export const getEffectiveBaseUrl = () => {
    const storedBase = typeof window !== 'undefined' ? localStorage.getItem('custom_api_base_url') : null;
    if (storedBase && storedBase.trim()) return storedBase.trim();
    if (activeWorkingBaseUrl) return activeWorkingBaseUrl;

    const configuredBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
    if (configuredBase && configuredBase.trim()) return configuredBase.trim();

    // If running in regular Web Browser on laptop / desktop
    if (!isNativePlatform()) {
        if (typeof window !== 'undefined' && window.location) {
            const port = window.location.port;
            const protocol = window.location.protocol;
            if (port === '5173' || port === '3000') {
                return 'http://localhost:5293/api';
            }
            if (protocol === 'http:' && port === '7048') {
                return 'http://localhost:5293/api';
            }
            if (window.location.origin && window.location.origin !== 'null') {
                return `${window.location.origin}/api`;
            }
        }
        return '/api';
    }

    // Native Mobile App on device
    return FALLBACK_URLS[0];
};

// Create an Axios instance with base configuration
const apiClient = axios.create({
    baseURL: getEffectiveBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

// Add a request interceptor to include the JWT token in all authenticated requests
apiClient.interceptors.request.use(
    (config) => {
        config.baseURL = getEffectiveBaseUrl();
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle auto-retry fallback on network errors
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        if (!originalRequest || originalRequest._isRetry) {
            if (error.response && error.response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
            return Promise.reject(error);
        }

        // Check if network error (no response received from server) on native mobile
        const isNetworkError = !error.response && (error.code === 'ERR_NETWORK' || error.message === 'Network Error' || error.code === 'ECONNABORTED');
        if (isNetworkError && isNativePlatform()) {
            originalRequest._isRetry = true;
            for (const candidate of FALLBACK_URLS) {
                if (candidate !== originalRequest.baseURL) {
                    try {
                        originalRequest.baseURL = candidate;
                        const retryResponse = await axios(originalRequest);
                        activeWorkingBaseUrl = candidate;
                        return retryResponse;
                    } catch {
                        // continue to next candidate URL
                    }
                }
            }
        }

        if (error.response && error.response.status === 401) {
            console.error('Unauthorized access. Token might be expired.');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
        return Promise.reject(error);
    }
);

export default apiClient;
