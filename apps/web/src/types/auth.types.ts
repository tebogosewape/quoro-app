export type AuthenticatedUser = {
    id: string;
    email: string;
    username?: string;
    firstName: string;
    lastName: string;
    role: string; // or your UserRole enum
    department?: string;
    phoneNumber?: string;
    permissions: string[]; // <-- add this
};

export type JwtPayload = {
    sub: string;
    email: string;
    role: string; // or UserRole
    department?: string;
    perms: string[]; // <-- if you’re embedding perms in the token
};
