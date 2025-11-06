import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../entities/user.entity';
import { ROLES_KEY } from './roles.decorator';
import { expandRole } from './role.utils';
import { AuthenticatedUser } from './auth.types';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles) {
            return true; // No roles required
        }

        const { user }: { user: AuthenticatedUser } = context.switchToHttp().getRequest();

        if (!user) {
            return false;
        }

        const userRoles = new Set<UserRole>(expandRole(user.role as UserRole));

        return requiredRoles.some((role) => userRoles.has(role));
    }
}
