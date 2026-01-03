import { apiClient } from '@/api/axios.config';
import { useAuthStore } from '@/stores/auth.store';
import { z } from 'zod';

// ============================================================================
// Helper Functions
// ============================================================================

const getAuthHeaders = () => {
    const token = useAuthStore.getState().session?.access_token;
    if (!token) {
        throw new Error('Authentication required');
    }
    return { Authorization: `Bearer ${token}` };
};

// ============================================================================
// Zod Schemas
// ============================================================================

export const userRoleSchema = z.enum([
    'admin',
    'admin_manager',
    'manager',
    'team_leader',
    'operations_manager',
    'agent',
    'sales_agent',
    'debt_review_specialist',
    'lead_provider',
    'chief_executive_officer',
    'viewer',
]);

export type UserRole = z.infer<typeof userRoleSchema>;

export const userSchema = z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    username: z.string().nullable(),
    role: userRoleSchema,
    employeeNumber: z.string().nullable(),
    phoneNumber: z.string().nullable(),
    status: z.enum(['active', 'inactive', 'suspended', 'pending']),
    createdAt: z.string().or(z.date()),
    updatedAt: z.string().or(z.date()),
});

export type User = z.infer<typeof userSchema>;

export const userListResponseSchema = z.object({
    users: z.array(userSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
});

export type UserListResponse = z.infer<typeof userListResponseSchema>;

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get list of users with optional role filtering
 * @param role - Optional role filter
 * @param page - Page number (default 1)
 * @param limit - Items per page (default 100)
 * @returns List of users
 */
export const getUsers = async (params?: {
    role?: UserRole;
    page?: number;
    limit?: number;
}): Promise<UserListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.role) queryParams.append('role', params.role);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await apiClient.get(`/users?${queryParams.toString()}`, {
        headers: getAuthHeaders(),
    });

    return userListResponseSchema.parse(response.data.data);
};

/**
 * Get all agents (users with 'agent' role)
 * @returns List of agent users
 */
export const getAgents = async (): Promise<User[]> => {
    const response = await getUsers({ role: 'agent', limit: 1000 });
    return response.users;
};
