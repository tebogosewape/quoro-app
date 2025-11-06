// src/api/users.ts
import { HttpProxy } from './http-proxy.service';
import { useAuthStore } from '@/stores/auth.store';

export type UserRole =
    | 'admin'
    | 'admin_manager'
    | 'manager'
    | 'team_leader'
    | 'operations_manager'
    | 'agent'
    | 'sales_agent'
    | 'debt_review_specialist'
    | 'lead_provider'
    | 'chief_executive_officer'
    | 'viewer';

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export type UserDto = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    username?: string;
    employeeNumber: string;
    role: UserRole;
    status: UserStatus;
    department?: string;
    phoneNumber?: string;
    title?: string;
    managerId?: string;
    lastLoginAt?: string | Date | null;
    emailVerifiedAt?: string | Date | null;
    createdAt?: string | Date;
    updatedAt?: string | Date;
};

export type CreateUserDto = {
    firstName: string;
    lastName: string;
    email: string;
    username?: string;
    password: string;
    employeeNumber: string;
    role: UserRole;
    status?: UserStatus; // defaulted server-side to ACTIVE if omitted
    department?: string;
    phoneNumber?: string;
    title?: string;
};

export type UpdateUserDto = Partial<
    Omit<CreateUserDto, 'password' | 'employeeNumber'> & { employeeNumber: string }
>;

export type UsersListResponse = {
    users: UserDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
};

type Envelope<T> = { success: boolean; data: T; meta?: Record<string, unknown> };

const http = new HttpProxy();
const getBearer = () => useAuthStore.getState().session?.access_token ?? null;

export async function listUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRole;
    status?: UserStatus;
    department?: string;
    all?: boolean;
}): Promise<UsersListResponse> {
    const token = getBearer();
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.search) q.set('search', params.search);
    if (params.role) q.set('role', params.role);
    if (params.status) q.set('status', params.status);
    if (params.department) q.set('department', params.department);
    if (params.all) q.set('all', '1');

    const resp = await http.request<Envelope<UsersListResponse>>(
        'USERS_LIST',
        `/users${q.toString() ? `?${q.toString()}` : ''}`,
        'GET',
        {},
        false,
        token
    );

    if (resp.statusCode >= 200 && resp.statusCode < 300 && resp.data?.success) {
        return resp.data.data;
    }
    throw new Error(resp.errorMessage || 'Failed to fetch users');
}

export async function createUser(payload: CreateUserDto): Promise<UserDto> {
    const token = getBearer();
    const resp = await http.request<Envelope<UserDto>>(
        'USER_CREATE',
        '/users',
        'POST',
        payload,
        false,
        token
    );
    if (resp.statusCode >= 200 && resp.statusCode < 300 && resp.data?.success) {
        return resp.data.data;
    }
    throw new Error(resp.errorMessage || 'Failed to create user');
}

export async function updateUser(id: string, payload: UpdateUserDto): Promise<UserDto> {
    const token = getBearer();
    const resp = await http.request<Envelope<UserDto>>(
        'USER_UPDATE',
        `/users/${id}`,
        'PUT',
        payload,
        false,
        token
    );
    if (resp.statusCode >= 200 && resp.statusCode < 300 && resp.data?.success) {
        return resp.data.data;
    }
    throw new Error(resp.errorMessage || 'Failed to update user');
}

export async function deleteUser(id: string): Promise<void> {
    const token = getBearer();
    const resp = await http.request<Envelope<{ message: string }>>(
        'USER_DELETE',
        `/users/${id}`,
        'DELETE',
        {},
        false,
        token
    );
    if (resp.statusCode >= 200 && resp.statusCode < 300 && resp.data?.success) {
        return;
    }
    throw new Error(resp.errorMessage || 'Failed to delete user');
}
