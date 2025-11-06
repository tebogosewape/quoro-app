import { AppDataSource } from './database/data-source';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

async function fixUserPasswords() {
    console.log('🔧 Fixing user passwords...');

    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        const userRepo = AppDataSource.getRepository(User);

        // Update each user with a proper password
        const usersToUpdate = [
            { email: 'john.manager@quora.com', password: 'Password123!' },
            { email: 'sarah.agent@quora.com', password: 'Password123!' },
            { email: 'mike.smith@quora.com', password: 'Password123!' },
            { email: 'admin@quora.com', password: 'Password123!' },
        ];

        for (const userData of usersToUpdate) {
            const user = await userRepo.findOne({ where: { email: userData.email } });

            if (user) {
                console.log(`\n🔄 Updating password for ${user.email}...`);

                // Hash the password
                const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
                const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

                user.password = hashedPassword;
                user.emailVerifiedAt = new Date();

                await userRepo.save(user);
                console.log(`✅ Password updated for ${user.email}`);

                // Test the password
                const isValid = await user.validatePassword(userData.password);
                console.log(`🔐 Password validation test: ${isValid}`);
            } else {
                console.log(`❌ User not found: ${userData.email}`);
            }
        }

        await AppDataSource.destroy();
        console.log('\n✨ All passwords updated successfully!');
    } catch (error) {
        console.error('❌ Error fixing passwords:', error);
    }
}

fixUserPasswords();
