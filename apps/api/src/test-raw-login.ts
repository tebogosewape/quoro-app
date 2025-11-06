import { AppDataSource } from './database/data-source';
import * as bcrypt from 'bcrypt';

async function testRawLogin() {
    console.log('🔑 Testing raw SQL login...');

    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        const email = 'john.manager@quora.com';
        const password = 'Password123!';

        // Get user data with raw SQL
        const users = await AppDataSource.query(
            `SELECT id, email, firstName, lastName, role, status, password
             FROM users
             WHERE email = ? AND status = 'active'`,
            [email.toLowerCase()]
        );

        console.log(`Found ${users.length} users for email: ${email}`);

        if (users.length > 0) {
            const user = users[0];
            console.log(`\n👤 User data:`);
            console.log(`ID: ${user.id}`);
            console.log(`Email: ${user.email}`);
            console.log(`Name: ${user.firstName} ${user.lastName}`);
            console.log(`Role: ${user.role}`);
            console.log(`Status: ${user.status}`);
            console.log(`Password hash exists: ${!!user.password}`);
            console.log(`Password hash length: ${user.password ? user.password.length : 'N/A'}`);

            if (user.password) {
                console.log(`Password hash: ${user.password.substring(0, 30)}...`);

                // Test password
                const isValid = await bcrypt.compare(password, user.password);
                console.log(`\n🔐 Password "${password}" is valid: ${isValid}`);

                if (isValid) {
                    console.log('✅ Login should work!');
                } else {
                    console.log('❌ Password does not match');

                    // Test with a new hash
                    const newHash = await bcrypt.hash(password, 10);
                    console.log(`\n🔄 Creating new hash: ${newHash.substring(0, 30)}...`);
                    const newTest = await bcrypt.compare(password, newHash);
                    console.log(`🔐 New hash test: ${newTest}`);
                }
            } else {
                console.log('❌ No password hash found');
            }
        } else {
            console.log('❌ No user found');
        }

        await AppDataSource.destroy();
    } catch (error) {
        console.error('❌ Error during raw login test:', error);
    }
}

testRawLogin();
