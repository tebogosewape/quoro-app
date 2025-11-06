// src/api/axios.config.ts
import axios from 'axios';
import type { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { appConfig } from '@/config/env';
import { logger } from '@/lib/logging/logger';
import { getCurrentTraceId, setCurrentTraceId } from '@/lib/telemetry/trace';

const traceHeaderKey = appConfig.traceHeader.toLowerCase();

/**
 * Safe UUID v4 generator:
 * 1) crypto.randomUUID (if available)
 * 2) crypto.getRandomValues -> RFC4122 v4
 * 3) Math.random fallback (not crypto-strong, fine for trace IDs)
 */
function safeRandomId(): string {
    try {
        const anyCrypto = (globalThis as any).crypto;
        if (anyCrypto && typeof anyCrypto.randomUUID === 'function') {
            return anyCrypto.randomUUID();
        }
    } catch {
        /* ignore */
    }

    try {
        const anyCrypto = (globalThis as any).crypto;
        if (anyCrypto?.getRandomValues) {
            const buf = new Uint8Array(16);
            anyCrypto.getRandomValues(buf);
            buf[6] = (buf[6] & 0x0f) | 0x40; // version 4
            buf[8] = (buf[8] & 0x3f) | 0x80; // variant RFC4122
            const hex = Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
            return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
        }
    } catch {
        /* ignore */
    }

    const s4 = () =>
        Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .slice(-4);
    return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}

export type NormalizedApiError = Error & {
    status?: number;
    traceId?: string;
    details?: unknown;
};

export const createApiError = (error: AxiosError): NormalizedApiError => {
    const response = error.response;
    const responseTrace = response?.headers?.[traceHeaderKey] as string | undefined;
    const requestTrace =
        (error.config?.headers?.[appConfig.traceHeader] as string) ||
        getCurrentTraceId() ||
        undefined;

    const traceId = responseTrace || requestTrace;
    if (traceId) setCurrentTraceId(traceId);

    const body = response?.data as
        | { message?: string; error?: string; errorMessage?: string }
        | undefined;

    const message =
        body?.message || (body as any)?.errorMessage || error.message || 'Unexpected error';

    const normalizedError = new Error(message) as NormalizedApiError;
    normalizedError.status = response?.status;
    normalizedError.traceId = traceId;
    normalizedError.details = response?.data;

    return normalizedError;
};

export const apiClient: AxiosInstance = axios.create({
    baseURL: appConfig.apiUrl,
    timeout: appConfig.apiTimeout,
    headers: {
        Accept: 'application/json',
    },
    withCredentials: false,
});

// Token refresh state
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

/**
 * Refresh the access token using the refresh token
 */
async function refreshAccessToken(): Promise<string> {
    const { useAuthStore } = await import('@/stores/auth.store');
    const session = useAuthStore.getState().session;

    if (!session?.refresh_token) {
        throw new Error('No refresh token available');
    }

    try {
        const response = await axios.post(`${appConfig.apiUrl}/auth/refresh`, {
            refresh_token: session.refresh_token,
        });

        const newSession = {
            ...session,
            access_token: response.data.access_token,
            expires_in: response.data.expires_in,
            issued_at: Date.now(), // Update issued timestamp
        };

        useAuthStore.getState().setSession(newSession);
        return response.data.access_token;
    } catch (error) {
        // If refresh fails, clear session and throw
        useAuthStore.getState().clearSession();
        throw error;
    }
}

apiClient.interceptors.request.use(async (config) => {
    const traceId = safeRandomId();

    // assign the trace header if headers exist
    if (config.headers) {
        config.headers[appConfig.traceHeader] = traceId;
    }

    setCurrentTraceId(traceId);

    // Check if we need to refresh the token (if not a refresh or login request)
    if (!config.url?.includes('/auth/refresh') && !config.url?.includes('/auth/login')) {
        const { useAuthStore } = await import('@/stores/auth.store');
        const session = useAuthStore.getState().session;

        // If we have a session with token and expiry info
        if (session?.access_token && session?.expires_in && session?.issued_at) {
            const now = Date.now();
            const issuedAt = session.issued_at;
            const expiresIn = session.expires_in * 1000; // Convert to milliseconds
            const expiresAt = issuedAt + expiresIn;
            const timeUntilExpiry = expiresAt - now;

            // Refresh if token expires in less than 5 minutes (300000 ms)
            const REFRESH_THRESHOLD = 5 * 60 * 1000;

            if (timeUntilExpiry < REFRESH_THRESHOLD && timeUntilExpiry > 0) {
                // Token is about to expire, refresh it proactively
                if (!isRefreshing) {
                    isRefreshing = true;
                    refreshPromise = refreshAccessToken();
                }

                try {
                    const newToken = await refreshPromise;
                    isRefreshing = false;
                    refreshPromise = null;

                    // Update the current request with new token
                    if (config.headers) {
                        config.headers.Authorization = `Bearer ${newToken}`;
                    }
                } catch (error) {
                    isRefreshing = false;
                    refreshPromise = null;
                    // Let the request proceed with the old token, response interceptor will handle 401
                }
            } else if (timeUntilExpiry <= 0) {
                // Token has already expired, refresh it
                if (!isRefreshing) {
                    isRefreshing = true;
                    refreshPromise = refreshAccessToken();
                }

                try {
                    const newToken = await refreshPromise;
                    isRefreshing = false;
                    refreshPromise = null;

                    // Update the current request with new token
                    if (config.headers) {
                        config.headers.Authorization = `Bearer ${newToken}`;
                    }
                } catch (error) {
                    isRefreshing = false;
                    refreshPromise = null;
                    // Let the response interceptor handle the redirect
                }
            }
        } else if (isRefreshing && refreshPromise) {
            // Another request triggered a refresh, wait for it
            try {
                const newToken = await refreshPromise;
                if (config.headers) {
                    config.headers.Authorization = `Bearer ${newToken}`;
                }
            } catch {
                // Refresh failed, let the response interceptor handle it
            }
        }
    }

    logger.debug('HTTP request', {
        url: config.url,
        method: config.method,
        traceId,
    });

    return config;
});

apiClient.interceptors.response.use(
    (response: AxiosResponse) => {
        const headerTrace =
            (response.headers?.[traceHeaderKey] as string | undefined) ?? getCurrentTraceId();

        if (headerTrace) {
            setCurrentTraceId(headerTrace);
        }

        logger.debug('HTTP response', {
            url: response.config.url,
            status: response.status,
            traceId: headerTrace,
        });

        return response;
    },
    async (error: AxiosError) => {
        const normalizedError = createApiError(error);

        logger.error('HTTP error', {
            url: error.config?.url,
            status: normalizedError.status,
            traceId: normalizedError.traceId,
        });

        // Handle 401 Unauthorized - try to refresh token
        const skipAuthRedirect = (error.config as any)?.skipAuthRedirect;
        const originalRequest = error.config;

        if (normalizedError.status === 401 && originalRequest && !skipAuthRedirect) {
            // Don't retry refresh or login endpoints
            if (
                originalRequest.url?.includes('/auth/refresh') ||
                originalRequest.url?.includes('/auth/login')
            ) {
                // Clear session and redirect to login
                const { useAuthStore } = await import('@/stores/auth.store');
                useAuthStore.getState().clearSession();
                if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                }
                return Promise.reject(normalizedError);
            }

            // Try to refresh the token
            try {
                // If already refreshing, wait for it
                if (!isRefreshing) {
                    isRefreshing = true;
                    refreshPromise = refreshAccessToken();
                }

                const newToken = await refreshPromise;
                isRefreshing = false;
                refreshPromise = null;

                // Retry the original request with the new token
                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                }

                return apiClient(originalRequest);
            } catch (refreshError) {
                // Refresh failed, clear session and redirect
                isRefreshing = false;
                refreshPromise = null;

                const { useAuthStore } = await import('@/stores/auth.store');
                useAuthStore.getState().clearSession();
                if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                }
                return Promise.reject(normalizedError);
            }
        }

        return Promise.reject(normalizedError);
    }
);
