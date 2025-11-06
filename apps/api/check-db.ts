import { AppDataSource } from './src/database/data-source';
import { User } from './src/entities/user.entity';
import { Client } from './src/entities/client.entity';
import { Communication } from './src/entities/communication.entity';

async function checkDatabase() {
    try {
        // Initialize data source
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        console.log('📊 Database Overview\n');

        // Check users
        const userRepo = AppDataSource.getRepository(User);
        const users = await userRepo.find();

        console.log('👥 USERS:');
        users.forEach((user) => {
            console.log(`   ${user.fullName} (${user.email})`);
            console.log(`   Role: ${user.role} | Status: ${user.status}`);
            console.log(`   Employee: ${user.employeeNumber} | Dept: ${user.department}\n`);
        });

        // Check clients
        const clientRepo = AppDataSource.getRepository(Client);
        const clients = await clientRepo.find();

        console.log('🏢 CLIENTS:');
        clients.forEach((client) => {
            console.log(`   ${client.fullName} (${client.email})`);
            console.log(`   Status: ${client.status} | Type: ${client.clientType}`);
            console.log(`   Agent ID: ${client.assignedAgentId}\n`);
        });

        // Check communications
        const commRepo = AppDataSource.getRepository(Communication);
        const communications = await commRepo.find();

        console.log('📞 COMMUNICATIONS:');
        communications.forEach((comm) => {
            console.log(`   ${comm.subject} (${comm.type})`);
            console.log(`   Direction: ${comm.direction} | Status: ${comm.status}`);
            console.log(`   From: ${comm.fromAddress} | To: ${comm.toAddress}\n`);
        });

        console.log('✅ Database check completed');
    } catch (error) {
        console.error('❌ Error checking database:', error);
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
    }
}

checkDatabase();
