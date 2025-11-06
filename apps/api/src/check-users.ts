import { AppDataSource } from './database/data-source';
import { User } from './entities/user.entity';

async function checkUsers() {
    console.log('🔍 Checking existing users in database...');

    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        const userRepo = AppDataSource.getRepository(User);
        const users = await userRepo.find();

        console.log(`Found ${users.length} users:`);

        for (const user of users) {
            console.log(`\n📧 Email: ${user.email}`);
            console.log(`👤 Name: ${user.firstName} ${user.lastName}`);
            console.log(`🏷️ Role: ${user.role}`);
            console.log(`📊 Status: ${user.status}`);
            console.log(`🔑 Employee Number: ${user.employeeNumber}`);

            // Check if password exists
            console.log(`🔒 Password exists: ${!!user.password}`);
            console.log(`🔒 Password length: ${user.password ? user.password.length : 'N/A'}`);

            if (user.password) {
                // Show password hash for debugging
                console.log(`🔒 Password hash: ${user.password.substring(0, 20)}...`);

                // Test password verification with the known password
                const testPassword = 'Password123!';
                try {
                    const isValid = await user.validatePassword(testPassword);
                    console.log(`🔐 Password '${testPassword}' is valid: ${isValid}`);
                } catch (error) {
                    console.log(
                        `❌ Password validation error: ${error instanceof Error ? error.message : String(error)}`
                    );
                }
            } else {
                console.log(`❌ No password hash found for user`);
            }
        }

        await AppDataSource.destroy();
    } catch (error) {
        console.error('❌ Error checking users:', error);
    }
}

checkUsers();
