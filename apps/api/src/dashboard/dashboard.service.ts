import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { AuthenticatedUser } from '@/auth';
import { isAgentRole, isManagerRole } from '@/auth/role.utils';
import { Client } from '@/entities/client.entity';
import { Lead } from '@/entities/lead.entity';
import { Task } from '@/entities/task.entity';
import { User, UserRole } from '@/entities/user.entity';
import { DashboardFiltersDto } from './dashboard.dto';

type DashboardTaskStatus = 'pending' | 'in-progress' | 'completed' | 'overdue';
type DashboardTaskPriority = 'low' | 'medium' | 'high' | 'urgent';

@Injectable()
export class DashboardService {
    constructor(
        @InjectRepository(Client)
        private readonly clientRepository: Repository<Client>,
        @InjectRepository(Lead)
        private readonly leadRepository: Repository<Lead>,
        @InjectRepository(Task)
        private readonly taskRepository: Repository<Task>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>
    ) {}

    async getAgentDashboard(filters: DashboardFiltersDto, user: AuthenticatedUser) {
        const agentId = this.resolveAgentId(filters, user);
        const selectedAgent = await this.userRepository.findOne({
            where: { id: agentId },
            select: ['id', 'firstName', 'lastName'],
        });
        const agentName = selectedAgent
            ? `${selectedAgent.firstName} ${selectedAgent.lastName}`.trim()
            : agentId === user.id
                ? `${user.firstName} ${user.lastName}`.trim()
                : '';
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const [
            assignedClients,
            newClientsThisMonth,
            assignedLeadResult,
            tasks,
            recentClients,
            debtResult,
        ] = await Promise.all([
            this.clientRepository.count({ where: { assignedAgentId: agentId } }),
            this.clientRepository.count({
                where: {
                    assignedAgentId: agentId,
                    createdAt: MoreThanOrEqual(startOfMonth),
                },
            }),
            agentName
                ? this.leadRepository.findAndCount({
                    where: { allocatedTo: agentName },
                    order: { timeReceived: 'DESC' },
                    take: 50,
                })
                : Promise.resolve([[], 0] as [Lead[], number]),
            this.taskRepository.find({
                where: { assignedToUserId: agentId },
                relations: ['client'],
                order: { updatedAt: 'DESC' },
            }),
            this.clientRepository.find({
                where: { assignedAgentId: agentId },
                order: { createdAt: 'DESC' },
                take: 8,
            }),
            this.clientRepository
                .createQueryBuilder('client')
                .select('COALESCE(SUM(client.totalDebt), 0)', 'total')
                .where('client.assignedAgentId = :agentId', { agentId })
                .getRawOne<{ total: string | number }>(),
        ]);

        const [recentAssignedLeads, assignedLeads] = assignedLeadResult;

        const now = new Date();
        const completedTasks = tasks.filter((task) => task.status === 'completed').length;
        const activeTasks = tasks.filter((task) =>
            ['pending', 'assigned', 'in_progress', 'on_hold'].includes(task.status)
        ).length;
        const overdueTasks = tasks.filter(
            (task) =>
                task.status === 'overdue' ||
                (task.status !== 'completed' && Boolean(task.dueDate && task.dueDate < now))
        ).length;

        return {
            commissionSummary: {
                totalEarned: 0,
                totalPaid: 0,
                totalPending: 0,
                completedTransactions: 0,
                averageCommission: 0,
                percentageChange: 0,
                recentEarnings: [],
            },
            assignedClients,
            assignedLeads,
            newClientsThisMonth,
            activeTasks,
            overdueTasks,
            completionRate:
                tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 10000) / 100 : 0,
            clientSatisfaction: 0,
            totalDebtManaged: Number(debtResult?.total ?? 0),
            targetAchievement: 0,
            recentTasks: tasks.slice(0, 10).map((task) => ({
                id: task.id,
                title: task.title,
                description: task.description ?? null,
                status: this.mapTaskStatus(task, now),
                priority: this.mapTaskPriority(task.priority),
                clientId: task.clientId ?? null,
                clientName: task.client
                    ? `${task.client.firstName} ${task.client.lastName}`.trim()
                    : null,
                assignedAgentId: agentId,
                assignedAgentName: `${user.firstName} ${user.lastName}`.trim(),
                dueDate: task.dueDate ?? task.updatedAt,
                createdAt: task.createdAt,
                updatedAt: task.updatedAt,
            })),
            recentClients: recentClients.map((client) => ({
                id: client.id,
                fullName: `${client.firstName} ${client.lastName}`.trim(),
                saIdNumber: client.idNumber,
                contactNumber: client.phoneNumber,
                email: client.email,
                status: client.status,
                totalDebt: Number(client.totalDebt ?? 0),
                assignedAgentName: null,
                lastContactDate: client.updatedAt,
            })),
            recentAssignedLeads: recentAssignedLeads.map((lead) => ({
                id: lead.id,
                name: lead.name,
                cell: lead.cell,
                idNumber: lead.idNumber,
                franchise: lead.franchise,
                affiliate: lead.affiliate,
                message: lead.message,
                leadOutcome: lead.leadOutcome,
                timeReceived: lead.timeReceived,
                createdAt: lead.createdAt,
                updatedAt: lead.updatedAt,
            })),
        };
    }

    private resolveAgentId(filters: DashboardFiltersDto, user: AuthenticatedUser): string {
        const role = user.role as UserRole;

        if (isAgentRole(role)) {
            return user.id;
        }

        if (isManagerRole(role)) {
            return filters.agentId ?? user.id;
        }

        throw new ForbiddenException('Insufficient permissions to access the agent dashboard');
    }

    private mapTaskStatus(task: Task, now: Date): DashboardTaskStatus {
        if (task.status === 'completed') return 'completed';
        if (task.status === 'overdue' || (task.dueDate && task.dueDate < now)) return 'overdue';
        if (task.status === 'in_progress') return 'in-progress';
        return 'pending';
    }

    private mapTaskPriority(priority: Task['priority']): DashboardTaskPriority {
        if (priority === 'normal') return 'medium';
        return priority;
    }
}
