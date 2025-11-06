import { AppDataSource } from './database/data-source';
import * as bcrypt from 'bcrypt';

async function updateUserPassword() {
    console.log('🔄 Updating user password with correct hash...');

    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        const password = 'Password123!';
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        console.log(`New password hash: ${hashedPassword}`);

        // Update all users with the correct password hash
        const updateResult = await AppDataSource.query(
            `UPDATE users SET password = ? WHERE email IN (?, ?, ?, ?)`,
            [
                hashedPassword,
                'john.manager@quora.com',
                'sarah.agent@quora.com',
                'mike.smith@quora.com',
                'admin@quora.com',
            ]
        );

        console.log('Update result:', updateResult);

        // Test the password for john.manager
        const users = await AppDataSource.query(
            `SELECT id, email, password FROM users WHERE email = ?`,
            ['john.manager@quora.com']
        );

        if (users.length > 0) {
            const user = users[0];
            const isValid = await bcrypt.compare(password, user.password);
            console.log(`\n✅ Password test for ${user.email}: ${isValid}`);
        }

        await AppDataSource.destroy();
        console.log('\n🎉 Password update completed!');
    } catch (error) {
        console.error('❌ Error updating password:', error);
    }
}

updateUserPassword();
