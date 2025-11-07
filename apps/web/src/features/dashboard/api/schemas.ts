import { z } from 'zod';

export const timeRangeSchema = z.enum(['today', 'week', 'month', 'quarter', 'year', 'custom']);

export const dashboardFiltersSchema = z
    .object({
        timeRange: timeRangeSchema.optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        agentId: z.string().optional(),
    })
    .partial();

const safeNumber = z.union([z.number(), z.string()]).transform((value) => {
    const parsed = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(parsed)) {
        throw new Error('Invalid number');
    }
    return parsed;
});

export const kpiStatsSchema = z.object({
    totalClients: safeNumber,
    newClients: safeNumber,
    newClientsChange: safeNumber,
    totalDebtUnderManagement: safeNumber,
    totalDebtChange: safeNumber,
    averageDebtPerClient: safeNumber,
    completedReviews: safeNumber,
    completedReviewsChange: safeNumber,
    pendingTasks: safeNumber,
    overdueTasks: safeNumber,
    clientSatisfactionScore: safeNumber,
});

export const leadPipelineStageSchema = z.object({
    stage: z.string(),
    count: safeNumber,
    totalValue: safeNumber,
    conversionRate: safeNumber,
    averageTimeInStage: safeNumber,
});

export const leadPipelineSchema = z.object({
    stages: z.array(leadPipelineStageSchema),
    overallConversionRate: safeNumber,
    averagePipelineVelocity: safeNumber,
});

export const dashboardCommunicationSchema = z
    .object({
        id: z.string().optional(),
        channel: z.string().nullish(),
        medium: z.string().nullish(),
        direction: z.string().nullish(),
        unread: z.boolean().optional(),
        unreadCount: safeNumber.nullish().optional(),
        clientName: z.string().nullish(),
        clientId: z.string().nullish(),
        contactName: z.string().nullish(),
        subject: z.string().nullish(),
        summary: z.string().nullish(),
        lastMessage: z.string().nullish(),
        lastInteractionAt: z.string().or(z.date()).nullish(),
        createdAt: z.string().or(z.date()).nullish(),
        updatedAt: z.string().or(z.date()).nullish(),
    })
    .passthrough();

export const taskStatusSchema = z.enum(['pending', 'in-progress', 'completed', 'overdue']);
export const taskEntityStatusSchema = z.enum([
    'pending',
    'assigned',
    'in_progress',
    'completed',
    'cancelled',
    'overdue',
    'on_hold',
]);
export const taskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

export const taskBoardItemSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullish(),
    status: taskStatusSchema,
    priority: taskPrioritySchema,
    clientId: z.string().nullish(),
    clientName: z.string().nullish(),
    assignedAgentId: z.string().nullish(),
    assignedAgentName: z.string().nullish(),
    dueDate: z.string().or(z.date()),
    createdAt: z.string().or(z.date()),
    updatedAt: z.string().or(z.date()),
});

export const taskBoardSchema = z.object({
    pending: z.array(taskBoardItemSchema),
    inProgress: z.array(taskBoardItemSchema),
    completed: z.array(taskBoardItemSchema),
    overdue: z.array(taskBoardItemSchema),
    totalTasks: safeNumber,
});

export const taskResponseSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullish(),
    type: z.string(),
    status: taskEntityStatusSchema,
    priority: z.string(),
    dueDate: z.string().or(z.date()).nullish(),
    completedAt: z.string().or(z.date()).nullish(),
    estimatedHours: safeNumber.nullish(),
    actualHours: safeNumber.nullish(),
    completionNotes: z.string().nullish(),
    metadata: z.record(z.any()).nullish(),
    createdAt: z.string().or(z.date()),
    updatedAt: z.string().or(z.date()),
    assignedToUser: z
        .object({
            id: z.string(),
            firstName: z.string(),
            lastName: z.string(),
            email: z.string(),
        })
        .nullish(),
    client: z
        .object({
            id: z.string(),
            firstName: z.string(),
            lastName: z.string(),
            email: z.string().nullish(),
        })
        .nullish(),
    createdByUser: z
        .object({
            id: z.string(),
            firstName: z.string(),
            lastName: z.string(),
            email: z.string(),
        })
        .nullish(),
});

export const dashboardOverviewSchema = z.object({
    kpiStats: kpiStatsSchema,
    leadPipeline: leadPipelineSchema,
    taskBoard: taskBoardSchema,
    generatedAt: z.string().or(z.date()),
    cacheValidityMinutes: safeNumber,
    communications: z.array(dashboardCommunicationSchema).default([]),
});

export const commissionEarningSchema = z.object({
    id: z.string(),
    clientId: z.string(),
    clientName: z.string(),
    type: z.string(),
    amount: safeNumber,
    rate: safeNumber,
    baseAmount: safeNumber,
    status: z.string(),
    earnedDate: z.string().or(z.date()),
    paidDate: z.string().or(z.date()).nullish(),
});

export const commissionSummarySchema = z.object({
    totalEarned: safeNumber,
    totalPaid: safeNumber,
    totalPending: safeNumber,
    completedTransactions: safeNumber,
    averageCommission: safeNumber,
    percentageChange: safeNumber,
    recentEarnings: z.array(commissionEarningSchema),
});

export const clientQuickSearchResultSchema = z.object({
    id: z.string(),
    fullName: z.string(),
    saIdNumber: z.string().nullish(),
    contactNumber: z.string().nullish(),
    email: z.string().nullish(),
    status: z.string().nullish(),
    totalDebt: safeNumber.nullish(),
    assignedAgentName: z.string().nullish(),
    lastContactDate: z.string().or(z.date()).nullish(),
});

export const clientQuickSearchResponseSchema = z.object({
    results: z.array(clientQuickSearchResultSchema),
    total: safeNumber,
    query: z.string(),
    executionTime: safeNumber,
});

export const agentDashboardSchema = z.object({
    commissionSummary: commissionSummarySchema,
    assignedClients: safeNumber,
    newClientsThisMonth: safeNumber,
    activeTasks: safeNumber,
    overdueTasks: safeNumber,
    completionRate: safeNumber,
    clientSatisfaction: safeNumber,
    totalDebtManaged: safeNumber,
    targetAchievement: safeNumber,
    recentTasks: z.array(taskBoardItemSchema),
    recentClients: z.array(clientQuickSearchResultSchema),
});

export type TimeRange = z.infer<typeof timeRangeSchema>;
export type DashboardFilters = z.infer<typeof dashboardFiltersSchema>;
export type KpiStats = z.infer<typeof kpiStatsSchema>;
export type LeadPipeline = z.infer<typeof leadPipelineSchema>;
export type LeadPipelineStage = z.infer<typeof leadPipelineStageSchema>;
export type TaskBoard = z.infer<typeof taskBoardSchema>;
export type TaskBoardItem = z.infer<typeof taskBoardItemSchema>;
export type TaskEntityStatus = z.infer<typeof taskEntityStatusSchema>;
export type DashboardOverview = z.infer<typeof dashboardOverviewSchema>;
export type DashboardCommunication = z.infer<typeof dashboardCommunicationSchema>;
export type ClientQuickSearchResult = z.infer<typeof clientQuickSearchResultSchema>;
export type ClientQuickSearchResponse = z.infer<typeof clientQuickSearchResponseSchema>;
export type AgentDashboard = z.infer<typeof agentDashboardSchema>;
export type TaskResponse = z.infer<typeof taskResponseSchema>;
