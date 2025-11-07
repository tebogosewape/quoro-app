import { Module } from '@nestjs/common';
// import { ScheduleModule } from '@nestjs/schedule';
import { CoreProvidersModule } from './common/core-providers.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// Configuration
import { DatabaseConfig } from './config/database.config';
import { AppConfig } from './config/app.config';
import { AuthConfig } from './config/auth.config';
import { envValidationSchema } from './config/config.validation';

// Modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

// Controllers
import { AppController } from './app.controller';
import { HealthController } from './health.controller';

// Services
import { AppService } from './app.service';
import { RolesModule } from './roles/roles.module';
import { ProductsModule } from './products/products.module';
import { CommissionModule } from './commission/commission.module';
import { SmsModule } from './sms/sms.module';
import { CreditModule } from './credit/credit.module';
import { MailModule } from './mail/mail.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { LeadsModule } from './leads/leads.module';
import { ClientsModule } from './clients/clients.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
    imports: [
        // Configuration
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '.env.development', '.env.qa', '.env.production'],
            load: [AppConfig, DatabaseConfig, AuthConfig],
            validationSchema: envValidationSchema,
            validationOptions: {
                allowUnknown: true,
                abortEarly: false,
            },
        }),

        // Database
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => {
                const dbConfig = configService.get('database');
                return {
                    ...dbConfig,
                    entities: [__dirname + '/**/*.entity{.ts,.js}'],
                    migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
                    subscribers: [__dirname + '/database/subscribers/*{.ts,.js}'],
                };
            },
            inject: [ConfigService],
        }),

        // Core providers (Reflector) must be available to ScheduleModule
        CoreProvidersModule,

        // Rate limiting
        ThrottlerModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                ttl: configService.get('RATE_LIMIT_WINDOW_MS', 60000),
                limit: configService.get('RATE_LIMIT_MAX_REQUESTS', 100),
            }),
            inject: [ConfigService],
        }),

        // Feature modules
        AuthModule,
        UsersModule,
        RolesModule,
        ProductsModule,
        CommissionModule,
        SmsModule,
        CreditModule,
        MailModule,
        WhatsappModule,
        LeadsModule,
        ClientsModule,
        TasksModule,
    ],
    controllers: [AppController, HealthController],
    providers: [
        AppService,
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule {}
