import { UserRole } from '../entities/user.entity';

export const AGENT_ROLES: readonly UserRole[] = [
    UserRole.AGENT,
    UserRole.SALES_AGENT,
    UserRole.DEBT_REVIEW_SPECIALIST,
];

export const MANAGER_ROLES: readonly UserRole[] = [
    UserRole.MANAGER,
    UserRole.TEAM_LEADER,
    UserRole.OPERATIONS_MANAGER,
    UserRole.ADMIN_MANAGER,
];

export const EXECUTIVE_ROLES: readonly UserRole[] = [
    UserRole.ADMIN,
    UserRole.CHIEF_EXECUTIVE_OFFICER,
];

export const SUPPORT_ROLES: readonly UserRole[] = [UserRole.LEAD_PROVIDER, UserRole.VIEWER];

const ROLE_SYNONYMS: Record<UserRole, UserRole[]> = {
    [UserRole.ADMIN]: [],
    [UserRole.ADMIN_MANAGER]: [UserRole.ADMIN, UserRole.MANAGER],
    [UserRole.MANAGER]: [],
    [UserRole.TEAM_LEADER]: [UserRole.MANAGER],
    [UserRole.OPERATIONS_MANAGER]: [UserRole.MANAGER],
    [UserRole.AGENT]: [],
    [UserRole.SALES_AGENT]: [UserRole.AGENT],
    [UserRole.DEBT_REVIEW_SPECIALIST]: [UserRole.AGENT],
    [UserRole.LEAD_PROVIDER]: [],
    [UserRole.CHIEF_EXECUTIVE_OFFICER]: [UserRole.ADMIN, UserRole.MANAGER],
    [UserRole.VIEWER]: [],
};

export function isAgentRole(role: UserRole): boolean {
    return AGENT_ROLES.includes(role as UserRole);
}

export function isManagerRole(role: UserRole): boolean {
    return MANAGER_ROLES.includes(role as UserRole) || EXECUTIVE_ROLES.includes(role as UserRole);
}

export function expandRole(role: UserRole): UserRole[] {
    return [role, ...(ROLE_SYNONYMS[role] ?? [])];
}
