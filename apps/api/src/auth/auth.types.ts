import { Request } from 'express';
import { UserRole } from '../entities/user.entity';

export interface LoginRequest {
    identifier: string;
    password: string;
}

export interface LoginResponse {
    access_token: string;
    refresh_token: string;
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: UserRole;
        department?: string;
    };
    expires_in: number;
}

export interface RefreshTokenRequest {
    refresh_token: string;
}

export interface RefreshTokenResponse {
    access_token: string;
    expires_in: number;
}

export interface JwtPayload {
    sub: string; // user id
    email: string;
    role: UserRole;
    department?: string;
    iat?: number;
    exp?: number;
    perms?: string[];
}

export interface AuthenticatedUser {
    id: string;
    email: string;
    username?: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    department?: string;
    phoneNumber?: string;
    permissions: string[];
}

export interface AuthenticatedRequest extends Request {
    user: AuthenticatedUser;
}
