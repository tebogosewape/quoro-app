// utils/is-auth-user.ts
import type { AuthSession } from '@/interfaces/AuthUser';

export function isAuthSession(x: any): x is AuthSession {
    return (
        x &&
        typeof x.access_token === 'string' &&
        typeof x.refresh_token === 'string' &&
        typeof x.expires_in === 'number' &&
        x.user &&
        typeof x.user.id === 'string' &&
        typeof x.user.email === 'string' &&
        typeof x.user.firstName === 'string' &&
        typeof x.user.lastName === 'string' &&
        typeof x.user.role === 'string' &&
        Array.isArray(x.user.permissions) // <-- new
    );
}
