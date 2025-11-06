import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../entities/user.entity';
import { ROLES_KEY } from './roles.decorator';
import { expandRole } from './role.utils';
import { AuthenticatedUser } from './auth.types';

@Injectable()
export class RolesGuard implements CanActivate {
    private readonly logger = new Logger(RolesGuard.name);

    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        const request = context.switchToHttp().getRequest();
        const path = request.url;
        const { user }: { user: AuthenticatedUser } = request;

        this.logger.debug(`Checking roles for ${path}`);
        this.logger.debug(`Required roles: ${requiredRoles ? requiredRoles.join(', ') : 'none'}`);
        this.logger.debug(`User role: ${user?.role || 'no user'}`);

        if (!requiredRoles) {
            this.logger.debug('No roles required - allowing access');
            return true; // No roles required
        }

        if (!user) {
            this.logger.warn('No user found in request - denying access');
            return false;
        }

        const userRoles = new Set<UserRole>(expandRole(user.role as UserRole));
        const hasAccess = requiredRoles.some((role) => userRoles.has(role));

        this.logger.debug(`User has access: ${hasAccess}`);

        return hasAccess;
    }
}
