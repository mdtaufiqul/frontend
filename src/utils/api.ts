import axios from 'axios';

// If NEXT_PUBLIC_API_URL is set, use it (Client & Server). 
// Otherwise:
// - Server (SSR): Use API_URL (internal docker net) + '/api', or fallback to localhost
// - Client: Use '/api' (relative, triggering Next.js rewrites)
// Helper to ensure /api suffix
const ensureApiSuffix = (url: string) => url.endsWith('/api') ? url : `${url}/api`;

const API_URL = process.env.NEXT_PUBLIC_API_URL
    ? ensureApiSuffix(process.env.NEXT_PUBLIC_API_URL)
    : (typeof window === 'undefined'
        ? `${process.env.API_URL || 'http://localhost:3001'}/api`
        : '/api');

export const getApiBaseUrl = () => {
    if (typeof window !== 'undefined') {
        // Client-side
        return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    } else {
        // Server-side
        return process.env.API_URL || 'http://localhost:3001';
    }
};

export const getFullUrl = (path: string | null | undefined) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const base = getApiBaseUrl();
    // Remove /api suffix if present in base, though getApiBaseUrl usually returns host
    // Actually getApiBaseUrl returns 'http://localhost:3001' (no /api)
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${cleanPath}`;
};

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Development warning for unguarded API calls
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    api.interceptors.request.use((config) => {
        // Check if the call was made via usePermissionApi (which adds this header)
        // or if it's an internal/auth call explicitly bypassing it (we could add bypass flag if needed)
        // For now, warn on everything else to encourage migration.
        if (!config.headers?.['X-Permission-Checked']) {
            // Use a distinct color/prefix for visibility
            console.warn(`%c[Security Warn] Unguarded API call to: ${config.url}`, 'color: orange; font-weight: bold;');
            console.debug('Use usePermissionApi() to ensure permission checks.');
        } else {
            // Optional: Remove header before sending if backend strictness requires it
            // delete config.headers['X-Permission-Checked'];
        }
        return config;
    });
}

export const setAuthToken = (token: string | null) => {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common['Authorization'];
    }
};

// Initial load check
if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
        setAuthToken(token);
    }
}

export default api;
