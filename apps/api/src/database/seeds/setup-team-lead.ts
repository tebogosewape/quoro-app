import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../data-source';
import { User, UserRole, UserStatus } from '../../entities/user.entity';

async function setupTeamLead() {
    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        const userRepository = AppDataSource.getRepository(User);

        // Find or create a team leader
        let teamLead = await userRepository.findOne({ where: { role: UserRole.TEAM_LEADER } });

        if (!teamLead) {
            console.log('No team leader found. Creating one...');
            const password = await bcrypt.hash(
                'Password123!',
                parseInt(process.env.BCRYPT_ROUNDS || '10', 10)
            );

            teamLead = userRepository.create({
                firstName: 'Team',
                lastName: 'Leader',
                email: 'teamlead@qmapi.com',
                username: 'teamlead001',
                employeeNumber: 'EMP-TL001',
                phoneNumber: '0821234567',
                role: UserRole.TEAM_LEADER,
                status: UserStatus.ACTIVE,
                department: 'Sales',
                title: 'Team Leader',
                password,
                emailVerifiedAt: new Date(),
                createdBy: 'system-script',
                updatedBy: 'system-script',
            });

            teamLead = await userRepository.save(teamLead);
            console.log('✅ Team Leader created:', {
                id: teamLead.id,
                name: `${teamLead.firstName} ${teamLead.lastName}`,
                email: teamLead.email,
            });
        } else {
            console.log('✅ Team Leader found:', {
                id: teamLead.id,
                name: `${teamLead.firstName} ${teamLead.lastName}`,
                email: teamLead.email,
            });
        }

        // Find all agents
        const agents = await userRepository.find({
            where: [{ role: UserRole.AGENT }, { role: UserRole.SALES_AGENT }],
        });

        console.log(`\nFound ${agents.length} agents to assign to team leader...`);

        // Assign all agents to this team leader
        let assignedCount = 0;
        for (const agent of agents) {
            if (agent.managerId !== teamLead.id) {
                agent.managerId = teamLead.id;
                await userRepository.save(agent);
                console.log(`  ✓ Assigned ${agent.firstName} ${agent.lastName} to team leader`);
                assignedCount++;
            } else {
                console.log(`  - ${agent.firstName} ${agent.lastName} already assigned`);
            }
        }

        console.log(`\n✅ Complete! ${assignedCount} agents assigned to team leader.`);
        console.log(`\n📊 Summary:`);
        console.log(
            `   Team Leader: ${teamLead.firstName} ${teamLead.lastName} (${teamLead.email})`
        );
        console.log(`   Total Agents: ${agents.length}`);
        console.log(`   Newly Assigned: ${assignedCount}`);
    } catch (error) {
        console.error('❌ Failed to setup team lead:', error);
        process.exitCode = 1;
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
    }
}

void setupTeamLead();
