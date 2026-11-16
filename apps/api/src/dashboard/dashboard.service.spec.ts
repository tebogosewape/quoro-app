import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '@/auth';
import { UserRole } from '@/entities/user.entity';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
    const clientRepository = {
        count: jest.fn(),
        find: jest.fn(),
        createQueryBuilder: jest.fn(),
    };
    const taskRepository = {
        find: jest.fn(),
    };
    const leadRepository = {
        findAndCount: jest.fn(),
    };
    const userRepository = {
        findOne: jest.fn(),
    };
    const queryBuilder = {
        select: jest.fn(),
        where: jest.fn(),
        getRawOne: jest.fn(),
    };

    const agent: AuthenticatedUser = {
        id: '0f1d86dd-604d-44bd-bb06-ff8435205969',
        email: 'agent@example.test',
        firstName: 'Test',
        lastName: 'Agent',
        role: UserRole.AGENT,
        permissions: [],
    };

    let service: DashboardService;

    beforeEach(() => {
        jest.clearAllMocks();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.where.mockReturnValue(queryBuilder);
        clientRepository.createQueryBuilder.mockReturnValue(queryBuilder);
        userRepository.findOne.mockResolvedValue({
            id: agent.id,
            firstName: agent.firstName,
            lastName: agent.lastName,
        });
        leadRepository.findAndCount.mockResolvedValue([[], 0]);
        service = new DashboardService(
            clientRepository as never,
            leadRepository as never,
            taskRepository as never,
            userRepository as never
        );
    });

    it('returns live client and task metrics using the signed-in agent scope', async () => {
        clientRepository.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1);
        taskRepository.find.mockResolvedValue([
            {
                id: 'task-1',
                title: 'Call client',
                status: 'completed',
                priority: 'normal',
                assignedToUserId: agent.id,
                createdAt: new Date('2026-11-01T08:00:00Z'),
                updatedAt: new Date('2026-11-02T08:00:00Z'),
            },
            {
                id: 'task-2',
                title: 'Collect documents',
                status: 'pending',
                priority: 'high',
                assignedToUserId: agent.id,
                dueDate: new Date('2099-11-30T08:00:00Z'),
                createdAt: new Date('2026-11-03T08:00:00Z'),
                updatedAt: new Date('2026-11-04T08:00:00Z'),
            },
        ]);
        clientRepository.find.mockResolvedValue([
            {
                id: 'client-1',
                firstName: 'Jane',
                lastName: 'Doe',
                idNumber: '9001010000000',
                phoneNumber: '0820000000',
                email: 'jane@example.test',
                status: 'active',
                totalDebt: '12500.50',
                updatedAt: new Date('2026-11-05T08:00:00Z'),
            },
        ]);
        queryBuilder.getRawOne.mockResolvedValue({ total: '12500.50' });
        leadRepository.findAndCount.mockResolvedValue([
            [
                {
                    id: 'lead-1',
                    name: 'Lead One',
                    cell: '0820000001',
                    idNumber: null,
                    franchise: 'QFinance',
                    affiliate: null,
                    message: null,
                    leadOutcome: 'Not Processed',
                    timeReceived: new Date('2026-11-06T08:00:00Z'),
                    createdAt: new Date('2026-11-06T08:00:00Z'),
                    updatedAt: new Date('2026-11-06T08:00:00Z'),
                },
            ],
            33,
        ]);

        const result = await service.getAgentDashboard(
            { agentId: 'f4c9da83-1304-4c2c-bf42-16e8578a73cf' },
            agent
        );

        expect(clientRepository.count).toHaveBeenNthCalledWith(1, {
            where: { assignedAgentId: agent.id },
        });
        expect(result).toMatchObject({
            assignedClients: 3,
            assignedLeads: 33,
            newClientsThisMonth: 1,
            activeTasks: 1,
            overdueTasks: 0,
            completionRate: 50,
            totalDebtManaged: 12500.5,
            commissionSummary: { totalEarned: 0 },
        });
        expect(result.recentTasks[0]).toMatchObject({
            status: 'completed',
            priority: 'medium',
            assignedAgentId: agent.id,
        });
        expect(result.recentClients[0]).toMatchObject({
            fullName: 'Jane Doe',
            totalDebt: 12500.5,
        });
        expect(result.recentAssignedLeads[0]).toMatchObject({
            id: 'lead-1',
            name: 'Lead One',
            leadOutcome: 'Not Processed',
        });
        expect(leadRepository.findAndCount).toHaveBeenCalledWith({
            where: { allocatedTo: 'Test Agent' },
            order: { timeReceived: 'DESC' },
            take: 50,
        });
    });

    it('rejects roles outside agent, manager and executive access', async () => {
        await expect(
            service.getAgentDashboard({}, { ...agent, role: UserRole.VIEWER })
        ).rejects.toBeInstanceOf(ForbiddenException);
    });
});
