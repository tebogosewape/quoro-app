import { apiClient } from '@/api/axios.config';
import { useAuthStore } from '@/stores/auth.store';
import type { AxiosRequestConfig } from 'axios';
import {
    agentDashboardSchema,
    clientQuickSearchResponseSchema,
    dashboardFiltersSchema,
    dashboardOverviewSchema,
    taskBoardSchema,
    taskResponseSchema,
    taskEntityStatusSchema,
    type AgentDashboard,
    type ClientQuickSearchResponse,
    type DashboardFilters,
    type DashboardOverview,
    type TaskBoard,
    type TaskEntityStatus,
    type TaskResponse,
} from './schemas';

type ApiEnvelope<T> = {
    success: boolean;
    data: T;
    message?: string;
    meta?: unknown;
};

const unwrapApiResponse = <T>(payload: unknown): T => {
    if (
        payload &&
        typeof payload === 'object' &&
        'success' in (payload as Record<string, unknown>)
    ) {
        const envelope = payload as ApiEnvelope<T>;
        if ('data' in envelope) {
            return envelope.data;
        }
    }

    return payload as T;
};

const getAuthHeaders = () => {
    const token = useAuthStore.getState().session?.access_token;
    if (!token) {
        throw new Error('Authentication required before calling dashboard APIs.');
    }

    return {
        Authorization: `Bearer ${token}`,
    } as AxiosRequestConfig['headers'];
};

const sanitizeFilters = (filters?: DashboardFilters) => {
    if (!filters) return undefined;
    const parsed = dashboardFiltersSchema.safeParse(filters);
    if (!parsed.success) {
        console.warn('Ignoring invalid dashboard filter payload', parsed.error.flatten());
        return undefined;
    }

    return parsed.data;
};

export const getDashboardOverview = async (
    filters?: DashboardFilters
): Promise<DashboardOverview> => {
    const response = await apiClient.get('/dashboard/overview', {
        params: sanitizeFilters(filters),
        headers: getAuthHeaders(),
    });

    return dashboardOverviewSchema.parse(unwrapApiResponse(response.data));
};

export const getTaskBoard = async (filters?: DashboardFilters): Promise<TaskBoard> => {
    const response = await apiClient.get('/dashboard/task-board', {
        params: sanitizeFilters(filters),
        headers: getAuthHeaders(),
    });

    return taskBoardSchema.parse(unwrapApiResponse(response.data));
};

export type DashboardClientSearchParams = {
    query?: string;
    file?: string;
    fileNumber?: string;
    name?: string;
    fullName?: string;
    id?: string;
    idNumber?: string;
    phone?: string;
    phoneNumber?: string;
    limit?: number;
};

const sanitizeSearchParams = ({ limit, ...rest }: DashboardClientSearchParams) => {
    const payload = Object.entries(rest).reduce<Record<string, string>>((acc, [key, value]) => {
        if (!value) return acc;
        const trimmed = value.trim();
        if (trimmed.length === 0) return acc;
        acc[key] = trimmed;
        return acc;
    }, {});

    const numericLimit = typeof limit === 'number' && Number.isFinite(limit) ? limit : undefined;

    return numericLimit ? { ...payload, limit: numericLimit } : payload;
};

export const searchDashboardClients = async (
    params: DashboardClientSearchParams
): Promise<ClientQuickSearchResponse> => {
    const response = await apiClient.get('/dashboard/search-clients', {
        params: sanitizeSearchParams(params),
        headers: getAuthHeaders(),
    });

    return clientQuickSearchResponseSchema.parse(unwrapApiResponse(response.data));
};

export const getAgentDashboard = async (filters?: DashboardFilters): Promise<AgentDashboard> => {
    const response = await apiClient.get('/dashboard/agent', {
        params: sanitizeFilters(filters),
        headers: getAuthHeaders(),
    });

    return agentDashboardSchema.parse(unwrapApiResponse(response.data));
};

export const updateTaskStatus = async (
    taskId: string,
    status: TaskEntityStatus
): Promise<TaskResponse> => {
    const response = await apiClient.patch(
        `/tasks/${taskId}`,
        { status: taskEntityStatusSchema.parse(status) },
        {
            headers: getAuthHeaders(),
        }
    );

    return taskResponseSchema.parse(unwrapApiResponse(response.data));
};
