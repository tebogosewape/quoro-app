import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { User } from '../entities/user.entity';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../modules/audit/audit.module';
import { Role } from '@/entities/roles.entity';
import { Permission } from '@/entities/permissions.entity';
import { RolePermission } from '@/entities/role-permission.entity';
import { PermissionsGuard } from '@/common/auth/permissions.guard';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, Role, Permission, RolePermission]),
        UsersModule,
        AuditModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => {
                const expiresIn = configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
                return {
                    secret: configService.get<string>('JWT_SECRET', 'your-secret-key'),
                    signOptions: {
                        expiresIn: expiresIn, // string value like '15m'
                    },
                };
            },
            inject: [ConfigService],
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy, PermissionsGuard],
    exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
