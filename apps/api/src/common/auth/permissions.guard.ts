import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMS_KEY } from './permissions.decorator';

// By default: require at least ONE of the listed permissions.
// Switch to "every" if you prefer all-of.
@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(ctx: ExecutionContext): boolean {
        const required = this.reflector.getAllAndOverride<string[]>(PERMS_KEY, [
            ctx.getHandler(),
            ctx.getClass(),
        ]);
        if (!required || required.length === 0) return true;

        const req = ctx.switchToHttp().getRequest();
        const user = req.user as { permissions?: string[] } | undefined;

        if (!user?.permissions?.length) return false;

        const userPerms = new Set(user.permissions.map((p) => p.toLowerCase()));
        // any-match (change to every if needed)
        return required.some((perm) => userPerms.has(perm.toLowerCase()));
    }
}
