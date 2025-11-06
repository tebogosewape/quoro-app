// utils/permissions.ts
import { useAuthStore } from '../stores/auth.store';
import type { UserRole } from '../interfaces/AuthUser';

/** Canonical backend permissions (must match DB exactly) */
export type BackendPermission =
    | 'clients.create'
    | 'sales.verify'
    | 'sales.edit'
    | 'sales.cancel'
    | 'sales.commit'
    | 'payments.cancel'
    | 'reports.sales.view'
    | 'reports.commission.view'
    | 'leads.upload'
    | 'debicheck.send'
    | 'roles.manage';

/** Legacy UI aliases you already use around the app */
export type UiPermission =
    | 'view-dashboard'
    | 'view-clients'
    | 'create-clients'
    | 'manage-clients'
    | 'view-commissions'
    | 'manage-commissions'
    | 'manage-users'
    | 'upload-leads'
    | 'manage-payments'
    | 'view-reports'
    | 'view-audit-log';

/** Unified type accepted by hasPermission() */
export type AppPermission = BackendPermission | UiPermission;

/** Map UI aliases → one or more backend permissions that satisfy that need */
const UI_TO_BACKEND_MAP: Record<UiPermission, BackendPermission[]> = {
    'view-dashboard': ['reports.sales.view', 'reports.commission.view'], // allow if they can see any report
    'view-clients': [
        'clients.create',
        'sales.verify',
        'sales.edit',
        'sales.commit',
        'sales.cancel',
    ],
    'create-clients': ['clients.create'],
    'manage-clients': ['sales.verify', 'sales.edit', 'sales.commit', 'sales.cancel'],
    'view-commissions': ['reports.commission.view'],
    'manage-commissions': ['reports.commission.view'], // if you later add a write perm, include it here
    'manage-users': ['roles.manage'],
    'upload-leads': ['leads.upload'],
    'manage-payments': ['payments.cancel'],
    'view-reports': ['reports.sales.view', 'reports.commission.view'],
    'view-audit-log': ['roles.manage'], // adjust when you add an explicit audit perm
};

/** Optional legacy role → default backend permissions (fallback only) */
const ROLE_DEFAULT_BACKEND_PERMS: Record<UserRole, BackendPermission[]> = {
    admin: [
        'roles.manage',
        'clients.create',
        'sales.verify',
        'sales.edit',
        'sales.commit',
        'sales.cancel',
        'payments.cancel',
        'reports.sales.view',
        'reports.commission.view',
        'leads.upload',
        'debicheck.send',
    ],
    admin_manager: [
        'roles.manage',
        'clients.create',
        'sales.verify',
        'sales.edit',
        'sales.commit',
        'sales.cancel',
        'payments.cancel',
        'reports.sales.view',
        'reports.commission.view',
        'leads.upload',
        'debicheck.send',
    ],
    manager: [
        'clients.create',
        'sales.verify',
        'sales.edit',
        'sales.commit',
        'sales.cancel',
        'payments.cancel',
        'reports.sales.view',
        'reports.commission.view',
    ],
    team_leader: [
        'clients.create',
        'sales.verify',
        'sales.edit',
        'sales.commit',
        'reports.sales.view',
        'reports.commission.view',
    ],
    operations_manager: [
        'roles.manage',
        'sales.verify',
        'sales.edit',
        'sales.commit',
        'sales.cancel',
        'payments.cancel',
        'reports.sales.view',
        'reports.commission.view',
    ],
    chief_executive_officer: [
        'roles.manage',
        'clients.create',
        'sales.verify',
        'sales.edit',
        'sales.commit',
        'sales.cancel',
        'payments.cancel',
        'reports.sales.view',
        'reports.commission.view',
        'leads.upload',
        'debicheck.send',
    ],
    agent: ['clients.create', 'sales.verify', 'reports.sales.view', 'reports.commission.view'],
    sales_agent: [
        'clients.create',
        'sales.verify',
        'reports.sales.view',
        'reports.commission.view',
    ],
    lead_provider: ['leads.upload', 'reports.sales.view', 'reports.commission.view'],
    debt_review_specialist: ['clients.create', 'sales.verify', 'sales.edit'],
    viewer: ['reports.sales.view', 'reports.commission.view'],
};

/** Default routes by role (unchanged) */
const ROLE_DEFAULT_ROUTE: Record<UserRole, string> = {
    admin: '/dashboard',
    admin_manager: '/dashboard',
    manager: '/dashboard',
    team_leader: '/dashboard',
    operations_manager: '/dashboard',
    chief_executive_officer: '/dashboard',
    agent: '/dashboard',
    sales_agent: '/dashboard',
    lead_provider: '/dashboard',
    debt_review_specialist: '/dashboard',
    viewer: '/dashboard',
};

export const getDefaultRouteForRole = (role: UserRole): string =>
    ROLE_DEFAULT_ROUTE[role] ?? '/dashboard';

/** Resolve an AppPermission to the list of backend keys it represents */
function toBackendKeys(p: AppPermission): BackendPermission[] {
    // If already a backend key, return it
    const backend = p as BackendPermission;
    if (
        [
            'clients.create',
            'sales.verify',
            'sales.edit',
            'sales.cancel',
            'sales.commit',
            'payments.cancel',
            'reports.sales.view',
            'reports.commission.view',
            'leads.upload',
            'debicheck.send',
            'roles.manage',
        ].includes(backend)
    ) {
        return [backend];
    }
    // Otherwise it’s a UI alias
    return UI_TO_BACKEND_MAP[p as UiPermission] ?? [];
}

/** Get the effective backend permissions for the current user */
export function getEffectiveBackendPermissions(): BackendPermission[] {
    const session = useAuthStore.getState().session;
    if (!session) return [];

    const fromServer = (session.user?.permissions ?? []) as string[];

    // Prefer server-provided permissions
    if (fromServer.length) return fromServer as BackendPermission[];

    // Fallback to legacy role-derived defaults
    const role = session.user?.role as UserRole | undefined;
    if (role && ROLE_DEFAULT_BACKEND_PERMS[role]) {
        return ROLE_DEFAULT_BACKEND_PERMS[role];
    }
    return [];
}

/**
 * Check if the current user has (any of) the given permission(s).
 * Accepts either a single permission or an array (any-match).
 */
export function hasPermission(required: AppPermission | AppPermission[]): boolean {
    const effective = new Set(getEffectiveBackendPermissions().map((k) => k.toLowerCase()));
    const requiredList = Array.isArray(required) ? required : [required];

    // Expand each required item to backend keys, pass if ANY matches
    return requiredList.some((req) =>
        toBackendKeys(req).some((bk) => effective.has(bk.toLowerCase()))
    );
}
