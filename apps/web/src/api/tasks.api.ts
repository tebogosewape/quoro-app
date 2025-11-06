import { apiClient } from '@/api/axios.config';
import { useAuthStore } from '@/stores/auth.store';
import { z } from 'zod';
import type { AxiosRequestConfig } from 'axios';

// Schemas aligned with backend Task enums/entities
export const taskStatusSchema = z.enum([
    'pending',
    'assigned',
    'in_progress',
    'completed',
    'cancelled',
    'overdue',
    'on_hold',
]);
export const taskPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);
export const taskTypeSchema = z.enum([
    'consultation',
    'document_collection',
    'verification',
    'credit_check',
    'follow_up',
    'review',
    'approval',
    'communication',
    'internal',
    'other',
]);

const safeNumber = z.union([z.number(), z.string()]).transform((v) => Number(v));

export const taskResponseSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullish(),
    type: taskTypeSchema,
    status: taskStatusSchema,
    priority: taskPrioritySchema,
    dueDate: z.string().or(z.date()).nullish(),
    completedAt: z.string().or(z.date()).nullish(),
    estimatedHours: safeNumber.nullish(),
    actualHours: safeNumber.nullish(),
    completionNotes: z.string().nullish(),
    metadata: z.record(z.any()).nullish(),
    createdAt: z.string().or(z.date()),
    updatedAt: z.string().or(z.date()),
    assignedToUser: z
        .object({ id: z.string(), firstName: z.string(), lastName: z.string(), email: z.string() })
        .nullish(),
    client: z
        .object({
            id: z.string(),
            firstName: z.string(),
            lastName: z.string(),
            email: z.string().nullish(),
        })
        .nullish(),
    createdByUser: z.object({
        id: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        email: z.string(),
    }),
});

export type TaskResponse = z.infer<typeof taskResponseSchema>;

export const taskListResponseSchema = z.object({
    tasks: z.array(taskResponseSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
});

export type TaskListResponse = z.infer<typeof taskListResponseSchema>;

export const createTaskDtoSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    type: taskTypeSchema,
    status: taskStatusSchema.default('pending'),
    priority: taskPrioritySchema.default('normal'),
    dueDate: z.string().optional(),
    estimatedHours: z.number().optional(),
    assignedToUserId: z.string().uuid().optional(),
    clientId: z.string().uuid().optional(),
    metadata: z.record(z.any()).optional(),
});
export type CreateTaskDto = z.infer<typeof createTaskDtoSchema>;

export const updateTaskDtoSchema = createTaskDtoSchema.partial().extend({
    actualHours: z.number().optional(),
    completionNotes: z.string().optional(),
});
export type UpdateTaskDto = z.infer<typeof updateTaskDtoSchema>;

type ApiEnvelope<T> = { success: boolean; data: T };
const unwrap = <T>(payload: unknown): T => {
    if (
        payload &&
        typeof payload === 'object' &&
        'success' in (payload as Record<string, unknown>)
    ) {
        return (payload as ApiEnvelope<T>).data;
    }
    return payload as T;
};

const getAuthHeaders = () => {
    const token = useAuthStore.getState().session?.access_token;
    if (!token) throw new Error('Authentication required before calling task APIs.');
    return { Authorization: `Bearer ${token}` } as AxiosRequestConfig['headers'];
};

export const listTasks = async (query?: { clientId?: string; page?: number; limit?: number }) => {
    const response = await apiClient.get('/tasks', { params: query, headers: getAuthHeaders() });
    return taskListResponseSchema.parse(unwrap(response.data));
};

export const createTask = async (payload: CreateTaskDto) => {
    const response = await apiClient.post('/tasks', createTaskDtoSchema.parse(payload), {
        headers: getAuthHeaders(),
    });
    return taskResponseSchema.parse(unwrap(response.data));
};

export const updateTask = async (taskId: string, payload: UpdateTaskDto) => {
    const response = await apiClient.patch(`/tasks/${taskId}`, updateTaskDtoSchema.parse(payload), {
        headers: getAuthHeaders(),
    });
    return taskResponseSchema.parse(unwrap(response.data));
};
