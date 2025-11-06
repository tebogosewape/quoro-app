import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

import { UsersService } from './users.service';
import { User } from '../entities/user.entity';
import { AuditService } from '../modules/audit/audit.service';

const RESPONSE_MESSAGE = 'If the email exists, a password reset link has been sent';

describe('UsersService password reset flow', () => {
    let service: UsersService;
    let userRepository: {
        findOne: jest.Mock;
        save: jest.Mock;
        createQueryBuilder: jest.Mock;
    };
    let configGet: jest.Mock;
    let emailService: {
        sendPasswordResetEmail: jest.Mock;
    };
    let auditService: {
        logPasswordResetRequested: jest.Mock;
        logPasswordResetCompleted: jest.Mock;
    };

    beforeEach(async () => {
        userRepository = {
            findOne: jest.fn(),
            save: jest.fn(async (user) => user),
            createQueryBuilder: jest.fn(),
        };

        configGet = jest.fn((key: string, defaultValue?: unknown) => {
            switch (key) {
                case 'PASSWORD_RESET_TTL_MINUTES':
                    return 30;
                case 'WEB_APP_URL':
                    return 'https://app.example.com';
                case 'app.webAppUrl':
                    return defaultValue ?? 'https://fallback.example.com';
                default:
                    return defaultValue;
            }
        });

        emailService = {
            sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
        };

        auditService = {
            logPasswordResetRequested: jest.fn().mockResolvedValue(undefined),
            logPasswordResetCompleted: jest.fn().mockResolvedValue(undefined),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                {
                    provide: getRepositoryToken(User),
                    useValue: userRepository,
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: configGet,
                    },
                },
                {
                    provide: AuditService,
                    useValue: auditService,
                },
            ],
        }).compile();

        service = module.get(UsersService);
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    it('dispatches password reset email for existing user', async () => {
        const staticToken = 'deterministic-token';
        const randomBytesSpy = jest
            .spyOn(crypto, 'randomBytes')
            .mockImplementation(() => Buffer.from(staticToken, 'utf8'));

        const user = {
            id: 'user-123',
            email: 'sarah.agent@quora.com',
            firstName: 'Sarah',
            lastName: 'Agent',
            fullName: 'Sarah Agent',
            resetFailedAttempts: jest.fn(),
        } as unknown as User;

        userRepository.findOne.mockResolvedValue(user);

        const result = await service.requestPasswordReset({ email: 'sarah.agent@quora.com' });

        expect(result).toEqual({ message: RESPONSE_MESSAGE });
        expect(user.resetFailedAttempts).toHaveBeenCalled();
        expect(userRepository.save).toHaveBeenCalledWith(user);

        const generatedToken = Buffer.from(staticToken, 'utf8').toString('hex');
        const expectedHash = crypto.createHash('sha256').update(generatedToken).digest('hex');
        expect(user.resetToken).toBe(expectedHash);
        expect(user.resetTokenExpiresAt).toBeInstanceOf(Date);
        expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
            user.email,
            user.fullName,
            expect.stringContaining('https://app.example.com/reset-password?')
        );
        expect(auditService.logPasswordResetRequested).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: user.id,
                tokenExpiresAt: expect.any(Date),
                metadata: expect.objectContaining({ email: user.email }),
            })
        );

        randomBytesSpy.mockRestore();
    });

    it('returns success message without signalling attackers when email is unknown', async () => {
        userRepository.findOne.mockResolvedValue(null);

        const result = await service.requestPasswordReset({ email: 'unknown@quora.com' });

        expect(result).toEqual({ message: RESPONSE_MESSAGE });
        expect(userRepository.save).not.toHaveBeenCalled();
        expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
        expect(auditService.logPasswordResetRequested).not.toHaveBeenCalled();
    });

    it('resets password when token is valid', async () => {
        const token = 'valid-token';
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const compareSpy = jest.spyOn(bcrypt, 'compare').mockImplementation(async () => false);

        const existingHash = '$2b$10$existing-hash';

        const user = {
            id: 'user-123',
            email: 'sarah.agent@quora.com',
            password: existingHash,
            resetToken: hashedToken,
            resetTokenExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
            refreshTokenHash: 'old-refresh-token',
            resetFailedAttempts: jest.fn(),
        } as unknown as User;

        const queryBuilder = {
            addSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(user),
        };

        userRepository.createQueryBuilder.mockReturnValue(queryBuilder);

        const result = await service.resetPassword({
            email: user.email,
            token,
            newPassword: 'NewSecure123!',
            confirmPassword: 'NewSecure123!',
        });
        expect(result).toEqual({ message: 'Password has been reset successfully' });
        expect(compareSpy).toHaveBeenCalledWith('NewSecure123!', existingHash);
        expect(user.password).toBe('NewSecure123!');
        expect(user.resetToken).toBeUndefined();
        expect(user.resetTokenExpiresAt).toBeUndefined();
        expect(user.refreshTokenHash).toBeUndefined();
        expect(user.resetFailedAttempts).toHaveBeenCalled();
        expect(userRepository.save).toHaveBeenCalledWith(user);
        expect(auditService.logPasswordResetCompleted).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: user.id,
                metadata: expect.objectContaining({ email: user.email }),
            })
        );

        compareSpy.mockRestore();
    });
});
