import { AppDataSource } from './database/data-source';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

async function debugPassword() {
    console.log('🐛 Debugging password validation...');

    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        const userRepo = AppDataSource.getRepository(User);
        const user = await userRepo.findOne({ where: { email: 'john.manager@quora.com' } });

        if (user) {
            console.log(`\n👤 User: ${user.email}`);
            console.log(`🔒 Password hash: ${user.password}`);
            console.log(`🔒 Hash length: ${user.password?.length}`);

            const testPassword = 'Password123!';
            console.log(`🔑 Test password: "${testPassword}"`);

            // Test bcrypt directly
            const directBcryptResult = await bcrypt.compare(testPassword, user.password || '');
            console.log(`🔐 Direct bcrypt compare result: ${directBcryptResult}`);

            // Test the user method
            const userMethodResult = await user.validatePassword(testPassword);
            console.log(`🔐 User method result: ${userMethodResult}`);

            // Create a new hash for comparison
            const newHash = await bcrypt.hash(testPassword, 10);
            console.log(`🔒 New hash: ${newHash}`);
            const newHashTest = await bcrypt.compare(testPassword, newHash);
            console.log(`🔐 New hash test: ${newHashTest}`);
        } else {
            console.log(`❌ User not found`);
        }

        await AppDataSource.destroy();
    } catch (error) {
        console.error('❌ Error debugging password:', error);
    }
}

debugPassword();
