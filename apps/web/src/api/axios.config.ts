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

apiClient.interceptors.request.use((config) => {
    const traceId = safeRandomId();

    // assign the trace header if headers exist
    if (config.headers) {
        config.headers[appConfig.traceHeader] = traceId;
    }

    setCurrentTraceId(traceId);

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
    (error: AxiosError) => {
        const normalizedError = createApiError(error);

        logger.error('HTTP error', {
            url: error.config?.url,
            status: normalizedError.status,
            traceId: normalizedError.traceId,
        });

        // Handle 401 Unauthorized - redirect to login
        if (normalizedError.status === 401) {
            // Import auth store dynamically to avoid circular dependency
            import('@/stores/auth.store').then(({ useAuthStore }) => {
                useAuthStore.getState().clearSession();
                // Redirect to login page
                if (typeof window !== 'undefined') {
                    window.location.href = '/login';
                }
            });
        }

        return Promise.reject(normalizedError);
    }
);
