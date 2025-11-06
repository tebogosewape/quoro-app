import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../data-source';
import { User, UserRole, UserStatus } from '../../entities/user.entity';

async function upsertAgent() {
    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        const userRepository = AppDataSource.getRepository(User);

        const email = 'sewapetj@gmail.com';
        const username = 'sewapetj';
        const phoneNumber = '0833532301';
        const employeeNumber = 'EMP-SEWAPETJ';
        const password = 'Password123!';

        let user = await userRepository.findOne({ where: [{ email }, { username }] });

        if (!user) {
            user = userRepository.create({
                firstName: 'Sewapetj',
                lastName: 'Agent',
                email,
                username,
                employeeNumber,
                phoneNumber,
                role: UserRole.AGENT,
                status: UserStatus.ACTIVE,
                department: 'Client Services',
                title: 'Agent',
                createdBy: 'system-script',
                updatedBy: 'system-script',
            });
        } else {
            user.phoneNumber = phoneNumber;
            user.role = UserRole.AGENT;
            user.status = UserStatus.ACTIVE;
            user.updatedBy = 'system-script';
        }

        user.password = await bcrypt.hash(
            password,
            parseInt(process.env.BCRYPT_ROUNDS || '10', 10)
        );
        user.emailVerifiedAt = new Date();

        const saved = await userRepository.save(user);
        console.log('✅ Agent user ready for testing:', {
            id: saved.id,
            email: saved.email,
            username: saved.username,
            phoneNumber: saved.phoneNumber,
        });
    } catch (error) {
        console.error('❌ Failed to create agent user:', error);
        process.exitCode = 1;
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
    }
}

void upsertAgent();
