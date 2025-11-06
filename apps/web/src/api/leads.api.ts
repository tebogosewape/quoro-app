import { apiClient } from '@/api/axios.config';
import { useAuthStore } from '@/stores/auth.store';
import { z } from 'zod';
import type { AxiosRequestConfig } from 'axios';

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

/**
 * Schema for a Lead entity
 * Matches backend Lead entity
 */
export const leadSchema = z.object({
    id: z.string(),
    timeReceived: z.string().or(z.date()),
    franchise: z.string().nullable(),
    name: z.string().nullable(),
    cell: z.string(),
    idNumber: z.string().nullable(),
    affiliate: z.string().nullable(),
    message: z.string().nullable(),
    allocatedTo: z.string().nullable(),
    leadOutcome: z.string().nullable(),
    createdAt: z.string().or(z.date()),
    updatedAt: z.string().or(z.date()),
});

export type Lead = z.infer<typeof leadSchema>;

/**
 * Schema for creating a new lead
 * Matches backend CreateLeadDto
 */
export const createLeadDtoSchema = z.object({
    timeReceived: z.string().or(z.date()),
    franchise: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    cell: z.string(),
    idNumber: z.string().nullable().optional(),
    affiliate: z.string().nullable().optional(),
    message: z.string().nullable().optional(),
    allocatedTo: z.string().nullable().optional(),
    leadOutcome: z.string().nullable().optional(),
});

export type CreateLeadDto = z.infer<typeof createLeadDtoSchema>;

/**
 * Schema for lead import response
 */
export const leadImportResponseSchema = z.object({
    success: z.boolean(),
    inserted: z.number(),
    updated: z.number(),
});

export type LeadImportResponse = z.infer<typeof leadImportResponseSchema>;

/**
 * Schema for lead list query parameters
 */
export const leadSearchQuerySchema = z.object({
    page: z.number().min(1).optional(),
    limit: z.number().min(1).max(100).optional(),
    search: z.string().optional(),
    franchise: z.string().optional(),
    affiliate: z.string().optional(),
    allocatedTo: z.string().optional(),
    leadOutcome: z.string().optional(),
    startDate: z.string().optional(), // YYYY-MM-DD
    endDate: z.string().optional(), // YYYY-MM-DD
    sortBy: z.enum(['timeReceived', 'name', 'cell', 'createdAt']).optional(),
    sortOrder: z.enum(['ASC', 'DESC']).optional(),
});

export type LeadSearchQuery = z.infer<typeof leadSearchQuerySchema>;

/**
 * Schema for paginated lead list response
 */
export const leadListResponseSchema = z.object({
    leads: z.array(leadSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
});

export type LeadListResponse = z.infer<typeof leadListResponseSchema>;

// ============================================================================
// API Response Envelope
// ============================================================================

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
        throw new Error('Authentication required before calling lead APIs.');
    }

    return {
        Authorization: `Bearer ${token}`,
    } as AxiosRequestConfig['headers'];
};

// ============================================================================
// API Functions
// ============================================================================

/**
 * Import leads from CSV file upload
 * @param file - CSV file to upload
 * @returns Import results with inserted/updated counts
 */
export const importLeadsFromFile = async (file: File): Promise<LeadImportResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/leads/import', formData, {
        headers: {
            ...getAuthHeaders(),
            'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutes for large file uploads
    });

    return leadImportResponseSchema.parse(unwrapApiResponse(response.data));
};

/**
 * Import leads from server file path (admin/ops use)
 * @param filePath - Absolute path to CSV file on server
 * @returns Import results with inserted/updated counts
 */
export const importLeadsFromPath = async (filePath: string): Promise<LeadImportResponse> => {
    const response = await apiClient.post(
        '/leads/import/path',
        { path: filePath },
        {
            headers: getAuthHeaders(),
            timeout: 120000, // 2 minutes for large file processing
        }
    );

    return leadImportResponseSchema.parse(unwrapApiResponse(response.data));
};

/**
 * Get a paginated list of leads with optional filtering and search
 * @param query - Search and filter parameters
 * @returns Paginated list of leads
 */
export const getLeads = async (query?: LeadSearchQuery): Promise<LeadListResponse> => {
    const validatedQuery = leadSearchQuerySchema.parse(query || {});

    const params = Object.entries(validatedQuery).reduce<Record<string, unknown>>(
        (acc, [key, value]) => {
            if (value !== undefined && value !== null) {
                acc[key] = value;
            }
            return acc;
        },
        {}
    );

    const response = await apiClient.get('/leads', {
        params,
        headers: getAuthHeaders(),
    });

    return leadListResponseSchema.parse(unwrapApiResponse(response.data));
};

/**
 * Get a single lead by ID
 * @param leadId - Lead UUID
 * @returns Lead details
 */
export const getLeadById = async (leadId: string): Promise<Lead> => {
    const response = await apiClient.get(`/leads/${leadId}`, {
        headers: getAuthHeaders(),
    });

    return leadSchema.parse(unwrapApiResponse(response.data));
};

/**
 * Create a new lead manually
 * @param leadData - Lead creation data
 * @returns Created lead object
 */
export const createLead = async (leadData: CreateLeadDto): Promise<Lead> => {
    const validatedData = createLeadDtoSchema.parse(leadData);

    const response = await apiClient.post('/leads', validatedData, {
        headers: getAuthHeaders(),
    });

    return leadSchema.parse(unwrapApiResponse(response.data));
};

/**
 * Update a lead
 * @param leadId - Lead UUID
 * @param leadData - Updated lead data
 * @returns Updated lead object
 */
export const updateLead = async (
    leadId: string,
    leadData: Partial<CreateLeadDto>
): Promise<Lead> => {
    const response = await apiClient.patch(`/leads/${leadId}`, leadData, {
        headers: getAuthHeaders(),
    });

    return leadSchema.parse(unwrapApiResponse(response.data));
};

/**
 * Delete a lead
 * @param leadId - Lead UUID
 */
export const deleteLead = async (leadId: string): Promise<void> => {
    await apiClient.delete(`/leads/${leadId}`, {
        headers: getAuthHeaders(),
    });
};

/**
 * Get lead statistics
 * @returns Stats including totals by franchise, affiliate, outcome
 */
export const getLeadStats = async () => {
    const response = await apiClient.get('/leads/stats', {
        headers: getAuthHeaders(),
    });

    return unwrapApiResponse(response.data);
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format a date for API submission (YYYY-MM-DD)
 * @param date - Date object or string
 * @returns Formatted date string in YYYY-MM-DD format
 */
export const formatDateForApi = (date: Date | string): string => {
    if (typeof date === 'string') {
        return date;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Format phone number for display
 * @param phone - Raw phone number
 * @returns Formatted phone number (e.g., 082 123 4567)
 */
export const formatPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    }
    return phone;
};
