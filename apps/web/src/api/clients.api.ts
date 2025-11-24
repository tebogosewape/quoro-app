import { apiClient } from '@/api/axios.config';
import { useAuthStore } from '@/stores/auth.store';
import { z } from 'zod';
import type { AxiosRequestConfig } from 'axios';

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

const maritalStatusEnum = z.enum(['single', 'married', 'divorced', 'widowed']);
const clientTypeEnum = z.enum(['individual', 'joint', 'business']);
export const clientStatusEnum = z.enum([
    'lead',
    'consultation_scheduled',
    'documentation_pending',
    'under_review',
    'approved',
    'rejected',
    'active',
    'completed',
    'withdrawn',
]);

/**
 * Schema for creating a new client
 * Matches backend CreateClientDto requirements
 */
export const createClientDtoSchema = z.object({
    // Required personal information
    idNumber: z.string().regex(/^\d{13}$/, { message: 'ID number must be exactly 13 digits' }),
    firstName: z
        .string()
        .min(2, { message: 'First name must be at least 2 characters' })
        .max(100, { message: 'First name must not exceed 100 characters' }),
    lastName: z
        .string()
        .min(2, { message: 'Last name must be at least 2 characters' })
        .max(100, { message: 'Last name must not exceed 100 characters' }),
    email: z
        .string()
        .email({ message: 'Invalid email address' })
        .transform((v) => v.toLowerCase()),
    phoneNumber: z.string().regex(/^(\+27|0)[6-8]\d{8}$/, {
        message: 'Invalid South African phone number format (e.g., 0821234567)',
    }),
    alternatePhone: z
        .string()
        .regex(/^(\+27|0)[1-8]\d{8}$/, { message: 'Invalid South African phone number format' })
        .optional(),

    // Date of birth in YYYY-MM-DD format
    dateOfBirth: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateOfBirth must be in YYYY-MM-DD format' }),

    // Status and type
    maritalStatus: maritalStatusEnum,
    clientType: clientTypeEnum,

    // Financial information
    physicalAddress: z
        .string()
        .max(500, { message: 'Physical address must not exceed 500 characters' }),
    monthlyIncome: z
        .number()
        .min(0, { message: 'Monthly income must be non-negative' })
        .max(10000000, { message: 'Monthly income must not exceed 10,000,000' }),
    monthlyExpenses: z
        .number()
        .min(0, { message: 'Monthly expenses must be non-negative' })
        .max(10000000, { message: 'Monthly expenses must not exceed 10,000,000' }),
    totalDebt: z
        .number()
        .min(0, { message: 'Total debt must be non-negative' })
        .max(100000000, { message: 'Total debt must not exceed 100,000,000' }),

    // Optional fields
    creditScore: z
        .number()
        .min(300, { message: 'Credit score must be at least 300' })
        .max(850, { message: 'Credit score must not exceed 850' })
        .optional(),
    employer: z
        .string()
        .max(200, { message: 'Employer name must not exceed 200 characters' })
        .optional(),
    jobTitle: z
        .string()
        .max(100, { message: 'Job title must not exceed 100 characters' })
        .optional(),
    postalAddress: z
        .string()
        .max(500, { message: 'Postal address must not exceed 500 characters' })
        .optional(),
    assignedAgentId: z.string().uuid({ message: 'Invalid agent ID format' }).optional(),
    documentsRequired: z.array(z.string()).optional(),
    documentsReceived: z.array(z.string()).optional(),
    // Banking Information
    bankName: z
        .string()
        .max(100, { message: 'Bank name must not exceed 100 characters' })
        .optional(),
    accountType: z
        .string()
        .max(50, { message: 'Account type must not exceed 50 characters' })
        .optional(),
    accountHolder: z
        .string()
        .max(100, { message: 'Account holder must not exceed 100 characters' })
        .optional(),
    accountNumber: z
        .string()
        .max(50, { message: 'Account number must not exceed 50 characters' })
        .optional(),
    branchCode: z
        .string()
        .max(20, { message: 'Branch code must not exceed 20 characters' })
        .optional(),
    // Product Information
    selectedProducts: z
        .array(
            z.object({
                productId: z.string(),
                paymentOptionId: z.string(),
                cirAccounts: z.array(z.string()).optional(),
            })
        )
        .optional(),
    // Payment Information
    paymentInfo: z
        .object({
            firstPaymentMonth: z.string().optional(),
            selectedPaymentOptions: z.record(z.string()).optional(),
        })
        .optional(),
    // Additional Information
    title: z.string().max(50, { message: 'Title must not exceed 50 characters' }).optional(),
    language: z.string().max(50, { message: 'Language must not exceed 50 characters' }).optional(),
    gender: z.string().max(10, { message: 'Gender must not exceed 10 characters' }).optional(),
    // Lead Reference (if this client is being created from a lead)
    leadId: z.string().uuid({ message: 'Invalid lead ID format' }).optional(),
});

export type CreateClientDto = z.infer<typeof createClientDtoSchema>;

/**
 * Schema for updating a client (all fields optional)
 */
export const updateClientDtoSchema = createClientDtoSchema.partial();
export type UpdateClientDto = z.infer<typeof updateClientDtoSchema>;

/**
 * Schema for client response
 * Note: API may return null for optional fields or strings for numbers,
 * so we use coercion and nullable handling
 */
export const clientSchema = z
    .object({
        id: z.string().uuid(),
        fileReference: z.string().optional().nullable(),
        idNumber: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        email: z.string(),
        phoneNumber: z.string(),
        alternatePhone: z.string().or(z.null()).optional(),
        dateOfBirth: z.string(),
        // Handle empty strings from legacy data by transforming to null or a default value
        maritalStatus: z
            .string()
            .transform((val) => (val === '' ? null : val))
            .pipe(maritalStatusEnum.nullable())
            .catch(null),
        clientType: z
            .string()
            .transform((val) => (val === '' ? 'individual' : val))
            .pipe(clientTypeEnum)
            .catch('individual' as const),
        physicalAddress: z.string(),
        postalAddress: z.string().or(z.null()).optional(),
        // Coerce strings to numbers (API may return strings)
        monthlyIncome: z.union([z.number(), z.string()]).pipe(z.coerce.number()),
        monthlyExpenses: z.union([z.number(), z.string()]).pipe(z.coerce.number()),
        totalDebt: z.union([z.number(), z.string()]).pipe(z.coerce.number()),
        creditScore: z
            .union([z.number(), z.string(), z.null()])
            .transform((val) =>
                val === null ? undefined : typeof val === 'string' ? parseFloat(val) : val
            )
            .optional(),
        employer: z.string().nullable().optional(),
        jobTitle: z.string().nullable().optional(),
        status: clientStatusEnum,
        documentsRequired: z.array(z.string()).nullable().default([]),
        documentsReceived: z.array(z.string()).nullable().default([]),
        createdAt: z.string(),
        updatedAt: z.string(),
        createdBy: z.string().or(z.null()).optional(),
        updatedBy: z.string().or(z.null()).optional(),
        assignedAgentId: z.string().uuid().nullable().optional(),
        // Banking fields
        bankName: z.string().optional().nullable(),
        accountType: z.string().optional().nullable(),
        accountHolder: z.string().optional().nullable(),
        accountNumber: z.string().optional().nullable(),
        branchCode: z.string().optional().nullable(),
        // JSON fields for product selection and payment info
        selectedProducts: z
            .array(
                z.object({
                    productId: z.string(),
                    paymentOptionId: z.string(),
                    cirAccounts: z.array(z.string()).optional(),
                })
            )
            .nullable()
            .optional()
            .default([]),
        paymentInfo: z
            .object({
                firstPaymentMonth: z.string().optional(),
                selectedPaymentOptions: z.record(z.string()).optional(),
            })
            .nullable()
            .optional(),
        // Personal fields
        title: z.string().optional().nullable(),
        language: z.string().optional().nullable(),
        gender: z.string().optional().nullable(),
        // Credit report tracking
        creditReportViewedAt: z.string().or(z.null()).optional(),
        creditReportViewedBy: z.string().or(z.null()).optional(),
        // Optional nested fields sometimes included by backend
        assignedAgent: z
            .object({
                firstName: z.string(),
                lastName: z.string().nullable().optional(),
            })
            .optional(),
        clientProducts: z
            .array(
                z
                    .object({
                        // Some responses may include a flat productName string
                        productName: z.string().optional(),
                        // When relations are loaded, we get a nested product object
                        product: z
                            .object({
                                id: z.string().optional(),
                                code: z.string().optional(),
                                name: z.string(),
                                description: z.string().optional(),
                            })
                            .optional(),
                    })
                    .passthrough()
            )
            .optional(),
        // Optional relations when loaded by backend
        auditLogs: z
            .array(
                z
                    .object({
                        id: z.string(),
                        createdAt: z.string(),
                        action: z.string().optional(),
                        entityType: z.string().optional(),
                        entityId: z.string().optional(),
                        actorType: z.string().optional(),
                        changes: z.record(z.unknown()).nullable().optional(),
                        metadata: z.record(z.unknown()).nullable().optional(),
                        actor: z
                            .object({
                                firstName: z.string().optional(),
                                lastName: z.string().optional(),
                                email: z.string().optional(),
                            })
                            .optional(),
                    })
                    .passthrough()
            )
            .optional(),
        financialRecords: z
            .array(
                z
                    .object({
                        id: z.string(),
                        recordedAt: z.string().optional(),
                        createdAt: z.string().optional(),
                        type: z.string().optional(),
                        amount: z
                            .union([z.number(), z.string()])
                            .pipe(z.coerce.number())
                            .optional(),
                        description: z.string().optional(),
                    })
                    .passthrough()
            )
            .optional(),
    })
    .passthrough();

export type Client = z.infer<typeof clientSchema>;

/**
 * Schema for list/search response
 * Backend returns { success, data: Client[], meta: { total, page, limit, totalPages } }
 * After unwrapApiResponse, we need to handle both data and meta
 */
export const clientListResponseSchema = z.object({
    data: z.array(clientSchema),
    meta: z.object({
        total: z.number(),
        page: z.number(),
        limit: z.number(),
        totalPages: z.number(),
        timestamp: z.string().optional(),
    }),
});

export type ClientListResponse = z.infer<typeof clientListResponseSchema>;

/**
 * Schema for search query parameters
 */
export const clientSearchQuerySchema = z.object({
    page: z.number().min(1).default(1).optional(),
    limit: z.number().min(1).max(100).default(10).optional(),
    search: z.string().optional(),
    status: clientStatusEnum.optional(),
    clientType: clientTypeEnum.optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['ASC', 'DESC']).optional(),
});

export type ClientSearchQuery = z.infer<typeof clientSearchQuerySchema>;

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
        throw new Error('Authentication required before calling client APIs.');
    }

    return {
        Authorization: `Bearer ${token}`,
    } as AxiosRequestConfig['headers'];
};

// ============================================================================
// API Functions
// ============================================================================

/**
 * Create a new client
 * @param clientData - Client creation data
 * @returns Created client object
 * @throws {Error} If validation fails or API returns error
 */
export const createClient = async (clientData: CreateClientDto): Promise<Client> => {
    // Validate input
    const validatedData = createClientDtoSchema.parse(clientData);

    const response = await apiClient.post('/clients/onboard', validatedData, {
        headers: getAuthHeaders(),
        skipAuthRedirect: true, // Don't auto-redirect on 401, let the component handle it
    } as any);

    return clientSchema.parse(unwrapApiResponse(response.data));
};

/**
 * Get a paginated list of clients with optional filtering and search
 * @param query - Search and filter parameters
 * @returns Paginated list of clients
 */
export const getClients = async (query?: ClientSearchQuery): Promise<ClientListResponse> => {
    const validatedQuery = clientSearchQuerySchema.parse(query || {});

    const params = Object.entries(validatedQuery).reduce<Record<string, unknown>>(
        (acc, [key, value]) => {
            if (value !== undefined && value !== null) {
                acc[key] = value;
            }
            return acc;
        },
        {}
    );

    const response = await apiClient.get('/clients', {
        params,
        headers: getAuthHeaders(),
    });

    // Backend returns { success, data: Client[], meta: {...} }
    // We need both data and meta, so don't use unwrapApiResponse
    const apiResponse = response.data;
    return clientListResponseSchema.parse({
        data: apiResponse.data,
        meta: apiResponse.meta,
    });
};

/**
 * Get a single client by ID
 * @param clientId - Client UUID
 * @returns Client object
 */
export const getClientById = async (clientId: string): Promise<Client> => {
    const response = await apiClient.get(`/clients/${clientId}`, {
        headers: getAuthHeaders(),
    });

    return clientSchema.parse(unwrapApiResponse(response.data));
};

/**
 * Update a client
 * @param clientId - Client UUID
 * @param updates - Fields to update (all optional)
 * @returns Updated client object
 */
export const updateClient = async (clientId: string, updates: UpdateClientDto): Promise<Client> => {
    const validatedData = updateClientDtoSchema.parse(updates);

    const response = await apiClient.put(`/clients/${clientId}`, validatedData, {
        headers: getAuthHeaders(),
    });

    return clientSchema.parse(unwrapApiResponse(response.data));
};

/**
 * Delete a client
 * @param clientId - Client UUID
 */
export const deleteClient = async (clientId: string): Promise<void> => {
    await apiClient.delete(`/clients/${clientId}`, {
        headers: getAuthHeaders(),
    });
};

/**
 * Search for clients (simplified search)
 * @param searchTerm - Search term (name, email, ID, phone)
 * @param limit - Max results (default: 10)
 * @returns List of matching clients
 */
export const searchClients = async (searchTerm: string, limit = 10): Promise<Client[]> => {
    const response = await getClients({
        search: searchTerm,
        limit,
        page: 1,
    });

    return response.data;
};

/**
 * Get client statistics
 * @returns Stats including totals by status, type, and agent
 */
export const getClientStats = async () => {
    const response = await apiClient.get('/clients/stats', {
        headers: getAuthHeaders(),
    });

    return unwrapApiResponse(response.data);
};

/**
 * Assign client to an agent
 * @param clientId - Client UUID
 * @param agentId - Agent UUID
 * @returns Updated client
 */
export const assignClientToAgent = async (clientId: string, agentId: string): Promise<Client> => {
    return updateClient(clientId, {
        assignedAgentId: agentId,
    } as UpdateClientDto);
};

/**
 * Update client status
 * @param clientId - Client UUID
 * @param status - New status
 * @returns Updated client
 */
export const updateClientStatus = async (
    clientId: string,
    status: z.infer<typeof clientStatusEnum>
): Promise<Client> => {
    return updateClient(clientId, {
        status: status as unknown as z.infer<typeof clientStatusEnum>,
    } as UpdateClientDto);
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
    return date.toISOString().split('T')[0];
};

/**
 * Parse API date string to Date object
 * @param dateString - ISO 8601 date string
 * @returns Date object
 */
export const parseApiDate = (dateString: string): Date => {
    return new Date(dateString);
};

/**
 * Format date for display (locale-specific)
 * @param dateString - ISO 8601 date string
 * @param locale - Locale code (default: 'en-ZA')
 * @returns Formatted date string
 */
export const formatDateForDisplay = (dateString: string, locale = 'en-ZA'): string => {
    return new Date(dateString).toLocaleDateString(locale);
};

/**
 * Validate phone number format for South Africa
 * @param phone - Phone number to validate
 * @returns true if valid, false otherwise
 */
export const isValidSAPhoneNumber = (phone: string): boolean => {
    return /^(\+27|0)[6-8]\d{8}$/.test(phone);
};

/**
 * Validate SA ID number
 * @param idNumber - ID number to validate
 * @returns true if valid, false otherwise
 */
export const isValidSAIdNumber = (idNumber: string): boolean => {
    return /^\d{13}$/.test(idNumber);
};

/**
 * Get communication history for a client
 * @param clientId - Client ID
 * @returns Array of communication logs
 */
export const getClientCommunications = async (clientId: string) => {
    const response = await apiClient.get(`/clients/${clientId}/communications`, {
        headers: getAuthHeaders(),
    });
    return response.data.data;
};

/**
 * Log onboarding step completion (for audit tracking)
 * @param step - Step name (e.g., 'personal', 'products', 'banking')
 * @param clientId - Optional client ID if already created
 * @param metadata - Optional additional metadata
 */
export const logOnboardingStep = async (
    step: string,
    clientId?: string,
    metadata?: Record<string, unknown>
): Promise<void> => {
    await apiClient.post(
        '/audit/onboarding-step',
        {
            step,
            clientId,
            metadata,
        },
        {
            headers: getAuthHeaders(),
        }
    );
};

/**
 * Send email to a client
 * @param clientId - Client ID
 * @param subject - Email subject
 * @param message - Email message (will be converted to HTML)
 * @returns Success status
 */
export const sendEmailToClient = async (clientId: string, subject: string, message: string) => {
    const response = await apiClient.post(
        `/clients/${clientId}/send-email`,
        { subject, message },
        { headers: getAuthHeaders() }
    );
    return response.data;
};

/**
 * Send SMS to a client
 * @param clientId - Client ID
 * @param message - SMS message
 * @returns Success status
 */
export const sendSmsToClient = async (clientId: string, message: string) => {
    const response = await apiClient.post(
        `/clients/${clientId}/send-sms`,
        { message },
        { headers: getAuthHeaders() }
    );
    return response.data;
};

/**
 * Download Experian credit report PDF for a client
 * @param clientId - Client ID
 * @returns PDF blob
 */
export const downloadCreditReport = async (clientId: string): Promise<Blob> => {
    const response = await apiClient.get(`/clients/${clientId}/credit-report`, {
        headers: getAuthHeaders(),
        responseType: 'blob',
    });
    return response.data;
};
