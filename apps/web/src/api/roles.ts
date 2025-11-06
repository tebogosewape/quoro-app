import { HttpProxy } from './http-proxy.service';
import { useAuthStore } from '@/stores/auth.store';

export type RoleDto = { id: string; slug: string; name: string; description?: string };
export type PermissionDto = { id: string; key: string; name: string; description?: string };

const uuid = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
              const r = (Math.random() * 16) | 0;
              const v = c === 'x' ? r : (r & 0x3) | 0x8;
              return v.toString(16);
          });

// tiny helper to unwrap your API shape { success, data }
function unwrap<T>(resp: { data?: any }): T {
    // backend returns { success, data: ... }
    return (resp?.data?.data ?? resp?.data ?? []) as T;
}

// reuse a single instance (no special state in class)
const http = new HttpProxy();

function getBearer(): string | null {
    const session = useAuthStore.getState().session;
    // adjust if your field name differs (e.g., accessToken)
    return (session?.access_token as string) ?? null;
}

export async function fetchRoles(): Promise<RoleDto[]> {
    const token = getBearer();
    const resp = await http.request('ROLES_LIST', '/roles', 'GET', {}, false, token);
    // your API sends roles as an object keyed by indexes — normalize to array
    const obj = unwrap<Record<string, RoleDto>>(resp);
    return Array.isArray(obj) ? (obj as any) : Object.values(obj ?? {});
}

export async function fetchPermissions(): Promise<PermissionDto[]> {
    const token = getBearer();
    const resp = await http.request('PERMS_LIST', '/permissions', 'GET', {}, false, token);
    return unwrap<PermissionDto[]>(resp);
}

export async function fetchRolePermissions(roleId: string): Promise<string[]> {
    const token = getBearer();
    const resp = await http.request(
        'ROLE_PERMS_GET',
        `/roles/${roleId}/permissions`,
        'GET',
        {},
        false,
        token
    );
    return unwrap<string[]>(resp);
}

export async function updateRolePermissions(roleId: string, keys: string[]) {
    const token = getBearer();
    // your current HttpProxy doesn’t support custom headers, so we’ll just include the trace id in the payload for now
    const traceId = uuid();
    const resp = await http.request(
        'ROLE_PERMS_PUT',
        `/roles/${roleId}/permissions`,
        'PUT',
        { keys, traceId },
        false,
        token
    );
    return unwrap<any>(resp);
}
