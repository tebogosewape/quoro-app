import type { AxiosRequestConfig } from 'axios';
import { isAxiosError } from 'axios';
import { apiClient, createApiError } from './axios.config';

export class HttpProxy {
    async request<T = unknown>(
        logAs: string,
        path: string,
        method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
        requestData: Record<string, unknown> = {},
        isMultipart = false,
        bearerToken: string | null = null
    ): Promise<{ statusCode: number; data?: T; errorType?: string; errorMessage?: string }> {
        const logLabel = `[${logAs.toUpperCase()} ${method} ${path}]`;
        const sanitizedPayload = (() => {
            if (isMultipart) {
                return '[form-data]';
            }

            const clone = { ...requestData };
            if ('password' in clone) {
                clone.password = '***';
            }
            if ('Password' in clone) {
                clone.Password = '***';
            }
            return clone;
        })();

        console.log(`${logLabel} - Sending request`, sanitizedPayload);

        const config: AxiosRequestConfig = {
            method,
            url: path,
            headers: {
                Authorization: bearerToken ? `Bearer ${bearerToken}` : '',
            },
        };

        if (isMultipart) {
            const formData = new FormData();

            for (const key in requestData) {
                const value = requestData[key];
                // Cast value to string or Blob as required by FormData.append
                if (value instanceof Blob) {
                    formData.append(key, value);
                } else if (typeof value === 'string') {
                    formData.append(key, value);
                } else if (value !== undefined && value !== null) {
                    formData.append(key, String(value));
                }
            }

            config.data = formData;
        } else {
            config.data = requestData;
        }

        try {
            const response = await apiClient.request(config);
            console.log(`${logLabel} - SUCCESS`, response.data);
            return {
                statusCode: response.status,
                data: response.data,
            };
        } catch (error) {
            if (!isAxiosError(error)) {
                console.error(`${logLabel} - NON_AXIOS_ERROR`, error);
                return {
                    errorType: 'Unknown Error',
                    errorMessage: error instanceof Error ? error.message : 'Unexpected error',
                    statusCode: 500,
                };
            }

            const normalized = createApiError(error);
            console.log(error);
            const statusCode = normalized.status ?? 500;

            if (normalized.message.toLowerCase().includes('timeout')) {
                console.warn(`${logLabel} - TIMEOUT`, normalized.message);
                return {
                    errorType: 'Connection Timeout',
                    errorMessage: 'Service timeout. Please try again later.',
                    statusCode,
                };
            }

            let errorType = 'Service Error';
            let errorMessage = normalized.message;

            try {
                const errorData = normalized.details as {
                    errorCode?: string;
                    errorMessage?: string;
                    message?: string;
                };
                errorType = errorData?.errorCode ?? errorType;
                errorMessage = errorData?.errorMessage ?? errorData?.message ?? errorMessage;
            } catch {
                // Intentionally left blank: error parsing is optional
            }

            return {
                errorType,
                errorMessage,
                statusCode,
            };
        }
    }
}
