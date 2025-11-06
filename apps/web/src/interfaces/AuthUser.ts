export type UserRole =
    | 'admin'
    | 'admin_manager'
    | 'manager'
    | 'team_leader'
    | 'operations_manager'
    | 'chief_executive_officer'
    | 'agent'
    | 'sales_agent'
    | 'lead_provider'
    | 'debt_review_specialist'
    | 'viewer';

export type AuthUser = {
    id: string;
    email: string;
    username?: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    department?: string;
    phoneNumber?: string;
    permissions: string[]; // <-- add this
};

export type AuthSession = {
    access_token?: string; // or accessToken depending on your shape
    refresh_token?: string;
    user: AuthUser;
    expires_in?: number;
};
