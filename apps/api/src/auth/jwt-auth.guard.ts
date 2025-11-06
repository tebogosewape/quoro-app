import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    private readonly logger = new Logger(JwtAuthGuard.name);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    handleRequest<TUser = any>(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        err: any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        user: any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        info: any,
        context: ExecutionContext
    ): TUser {
        const request = context.switchToHttp().getRequest();

        this.logger.debug(`JWT Guard for ${request.method} ${request.url}`);

        if (info) {
            const infoMessage =
                typeof info === 'object' && info && 'message' in info
                    ? info.message
                    : JSON.stringify(info);
            this.logger.warn(`JWT Auth Info: ${infoMessage}`);
        }

        if (err) {
            this.logger.error(`JWT Auth Error: ${err.message}`, err.stack);
            throw err;
        }

        if (!user) {
            this.logger.warn(`No user found after JWT validation`);
            throw new UnauthorizedException('Invalid or missing authentication token');
        }

        this.logger.debug(`JWT Auth successful for user: ${user.id}`);
        return user as TUser;
    }
}
