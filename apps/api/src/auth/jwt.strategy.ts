import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { JwtPayload, AuthenticatedUser } from './auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    private readonly logger = new Logger(JwtStrategy.name);

    constructor(
        private authService: AuthService,
        configService: ConfigService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET', 'your-secret-key'),
        });
    }

    async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
        this.logger.debug(`Validating JWT payload for user: ${payload.sub}`);

        const user = await this.authService.verifyPayload(payload);

        if (!user) {
            this.logger.warn(
                `JWT validation failed: User not found or inactive for userId: ${payload.sub}`
            );
            throw new UnauthorizedException('Invalid token - user not found or inactive');
        }

        this.logger.debug(`JWT validation successful for user: ${user.id} (${user.email})`);
        return user;
    }
}
