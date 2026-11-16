import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { getAgentDashboard } from '../../api/dashboard.api';
import { listTasks, type TaskResponse } from '@/api/tasks.api';
import { getLeads } from '@/api/leads.api';
import { apiClient } from '@/api/axios.config';
import { useNavigate } from 'react-router-dom';
import DashboardMetricCard, {
    type DashboardMetricIcon,
    type DashboardMetricTone,
} from './widgets/DashboardMetricCard';
import DashboardMessagesPanel, { type DashboardEmail } from './widgets/DashboardMessagesPanel';
import DashboardTasksPanel from './widgets/DashboardTasksPanel';
import ExecutiveDashboard from './ExecutiveDashboard';

// Mock data for admin dashboard placeholder
const adminStats = [
    { label: 'Total Users', value: 1280, icon: 'bi-people' },
    { label: 'Active Clients', value: 342, icon: 'bi-person-check' },
    { label: 'Pending Approvals', value: 17, icon: 'bi-hourglass-split' },
    { label: 'System Uptime', value: '99.99%', icon: 'bi-activity' },
];

const adminRecentActivity = [
    { user: 'Alice', action: 'approved a client', time: '2 min ago' },
    { user: 'Bob', action: 'added a new user', time: '10 min ago' },
    { user: 'Carol', action: 'viewed reports', time: '30 min ago' },
    { user: 'Dave', action: 'updated system settings', time: '1 hour ago' },
];

type ClientStats = {
    total?: number;
    byStatus?: {
        active?: number;
        lead?: number;
    };
};

type SmsTotals = {
    delivered?: number;
    sent?: number;
    failed?: number;
};

type SmsStats = {
    grandTotal?: SmsTotals;
    total?: SmsTotals;
    users?: Array<{ user?: { creditBalance?: number } }>;
};

export default function ClientflowDashboard() {
    const session = useAuthStore((state) => state.session);
    const role = session?.user?.role || 'viewer';
    const navigate = useNavigate();

    const isAdmin = role === 'admin' || role === 'admin_manager';
    const isAgent =
        role === 'agent' ||
        role === 'sales_agent' ||
        role === 'manager' ||
        role === 'team_leader' ||
        role === 'operations_manager';
    const isCEO = role === 'chief_executive_officer';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisMonthStartStr = thisMonthStart.toISOString().split('T')[0];

    // Agent dashboard data queries
    const agentDashboardQuery = useQuery({
        queryKey: ['dashboard', 'agent'],
        queryFn: () => getAgentDashboard({ timeRange: 'month' }),
        enabled: isAgent && Boolean(session?.access_token),
        staleTime: 1000 * 60,
    });

    const tasksQuery = useQuery({
        queryKey: ['tasks', 'my-tasks', session?.user?.id],
        queryFn: () =>
            listTasks({
                assignedToUserId: session?.user?.id,
                limit: 50,
            }),
        enabled: isAgent && Boolean(session?.access_token) && Boolean(session?.user?.id),
        staleTime: 1000 * 30,
    });

    const assignedLeadsQuery = useQuery({
        queryKey: ['leads', 'assigned-dashboard', session?.user?.id],
        queryFn: () =>
            getLeads({
                allocatedTo:
                    `${session?.user?.firstName || ''} ${session?.user?.lastName || ''}`.trim(),
                limit: 50,
                sortBy: 'timeReceived',
                sortOrder: 'DESC',
            }),
        enabled: isAgent && Boolean(session?.access_token) && Boolean(session?.user?.id),
        staleTime: 1000 * 30,
    });

    const inboxQuery = useQuery({
        queryKey: ['inbox', 'recent'],
        queryFn: async () => {
            try {
                const token = session?.access_token;
                const response = await apiClient.get('/mail/list', {
                    params: { limit: 5 },
                    headers: { Authorization: `Bearer ${token}` },
                });

                // Handle different response formats
                let emailData = response.data;

                // If wrapped in success/data envelope
                if (emailData?.success && emailData?.data) {
                    emailData = emailData.data;
                }

                // Convert object with numeric keys to array
                if (emailData && typeof emailData === 'object' && !Array.isArray(emailData)) {
                    emailData = Object.values(emailData);
                }

                // Ensure it's an array
                const emails: DashboardEmail[] = Array.isArray(emailData) ? emailData : [];

                return emails;
            } catch (error) {
                console.error('Error fetching inbox:', error);
                throw error;
            }
        },
        enabled: isAgent && Boolean(session?.access_token),
        staleTime: 1000 * 60,
        retry: 1,
    });

    const clientStatsQuery = useQuery<ClientStats>({
        queryKey: ['client-stats'],
        queryFn: async () => {
            const token = session?.access_token;
            const response = await apiClient.get('/clients/stats', {
                headers: { Authorization: `Bearer ${token}` },
            });
            return response.data?.data || response.data || {};
        },
        enabled: isCEO && Boolean(session?.access_token),
        staleTime: 1000 * 60 * 5,
    });

    const smsStatsQuery = useQuery<SmsStats>({
        queryKey: ['zoomconnect-stats', thisMonthStartStr, todayStr],
        queryFn: async () => {
            const token = session?.access_token;
            const response = await apiClient.get('/zoomconnect/stats', {
                params: { from: thisMonthStartStr, to: todayStr },
                headers: { Authorization: `Bearer ${token}` },
            });
            return response.data?.data || response.data || {};
        },
        enabled: isCEO && Boolean(session?.access_token),
        staleTime: 1000 * 60 * 5,
    });

    const taskStatsQuery = useQuery({
        queryKey: ['task-stats'],
        queryFn: async () => {
            const token = session?.access_token;
            const response = await apiClient.get('/tasks', {
                params: { limit: 1000 },
                headers: { Authorization: `Bearer ${token}` },
            });
            const responsePayload = response.data?.data || response.data || {};
            let taskItems: Array<{ status?: string }> = [];
            if (Array.isArray(responsePayload)) taskItems = responsePayload;
            else if (Array.isArray(responsePayload.tasks)) taskItems = responsePayload.tasks;
            const total =
                typeof responsePayload.total === 'number'
                    ? responsePayload.total
                    : taskItems.length;
            const completed = taskItems.filter((task) => task.status === 'completed').length;
            return { total, completed, incomplete: total - completed };
        },
        enabled: isCEO && Boolean(session?.access_token),
        staleTime: 1000 * 60 * 5,
    });

    // Admin dashboard handlers
    const handleAddUser = () => {
        alert('Add User - This will open a user creation form');
        // TODO: Navigate to user creation page or open modal
    };

    const handleApproveClient = () => {
        alert('Approve Client - This will show pending client approvals');
        // TODO: Navigate to client approval page or open modal
    };

    const handleViewReports = () => {
        alert('View Reports - This will display system reports');
        // TODO: Navigate to reports page
    };

    // Render Admin Dashboard
    if (isAdmin) {
        return (
            <div className="dashboard-screen dashboard-screen--admin">
                <header className="dashboard-page-header">
                    <div>
                        <p className="dashboard-eyebrow">Administration</p>
                        <h1>Admin Dashboard</h1>
                        <p>Monitor users, clients, approvals, and system activity.</p>
                    </div>
                </header>
                {/* Stats cards */}
                <div className="row mb-4">
                    {adminStats.map((s) => (
                        <div className="col-md-3 mb-3" key={s.label}>
                            <div className="card h-100 dashboard-stat-card">
                                <div className="card-body d-flex align-items-center">
                                    <i className={`bi ${s.icon} display-5 me-3 text-primary`} />
                                    <div>
                                        <div className="h4 mb-0">{s.value}</div>
                                        <div className="text-muted small">{s.label}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {/* Quick actions */}
                <div className="dashboard-section dashboard-quick-actions">
                    <h5>Quick Actions</h5>
                    <button className="btn btn-primary me-2" onClick={handleAddUser}>
                        Add User
                    </button>
                    <button
                        className="btn btn-outline-secondary me-2"
                        onClick={handleApproveClient}
                    >
                        Approve Client
                    </button>
                    <button className="btn btn-outline-info" onClick={handleViewReports}>
                        View Reports
                    </button>
                </div>
                {/* Placeholder chart */}
                <div className="dashboard-section">
                    <h5>Client Growth and Communication</h5>
                    <div className="bg-light border rounded p-4 text-center text-muted">
                        {/* TODO: Replace with real chart */}
                        <span>Unable to pull the main client communication channel....</span>
                    </div>
                </div>
                {/* Recent activity */}
                <div className="dashboard-section">
                    <h5>Recent Activity</h5>
                    <ul className="list-group">
                        {adminRecentActivity.map((a, i) => (
                            <li
                                className="list-group-item d-flex justify-content-between align-items-center"
                                key={i}
                            >
                                <span>
                                    <strong>{a.user}</strong> {a.action}
                                </span>
                                <span className="text-muted small">{a.time}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                {/* System health */}
                <div className="dashboard-section">
                    <h5>System Health</h5>
                    <div className="bg-light border rounded p-3">
                        <span className="text-success">All systems operational</span>
                        {/* TODO: Wire to real system health API */}
                    </div>
                </div>
            </div>
        );
    }

    // Render Agent Dashboard
    if (isAgent) {
        const agentData = agentDashboardQuery.data;
        const tasks = tasksQuery.data?.tasks ?? [];
        const emails = inboxQuery.data || [];
        const assignedLeadRecords =
            assignedLeadsQuery.data?.leads ?? agentData?.recentAssignedLeads ?? [];
        const assignedLeadCount = assignedLeadsQuery.data?.total ?? agentData?.assignedLeads ?? 0;
        const taskLeadIds = new Set(
            tasks
                .filter((task) => task.status !== 'completed' && task.status !== 'cancelled')
                .map((task) => task.metadata?.leadId)
                .filter((leadId): leadId is string => typeof leadId === 'string')
        );
        const allocatedLeadWork: TaskResponse[] = assignedLeadRecords
            .filter((lead) => lead.leadOutcome !== 'Converted' && !taskLeadIds.has(lead.id))
            .map((lead) => ({
                id: `allocated-lead-${lead.id}`,
                title: `Convert Lead: ${lead.name || 'Unknown'}`,
                description: lead.message || 'Follow up with this allocated lead.',
                type: 'follow_up',
                status: 'assigned',
                priority: 'normal',
                dueDate: null,
                completedAt: null,
                estimatedHours: null,
                actualHours: null,
                completionNotes: null,
                metadata: {
                    leadId: lead.id,
                    leadData: {
                        name: lead.name,
                        cell: lead.cell,
                        idNumber: lead.idNumber,
                        franchise: lead.franchise,
                        affiliate: lead.affiliate,
                        message: lead.message,
                    },
                },
                createdAt: lead.createdAt,
                updatedAt: lead.updatedAt,
                assignedToUser: null,
                client: null,
                createdByUser: null,
            }));
        const workItems = [...tasks, ...allocatedLeadWork];

        // Handle task click - if it's a lead conversion task, navigate to onboarding with lead data
        const handleTaskClick = async (task: TaskResponse) => {
            // Log lead view if this is a lead conversion task
            if (task.metadata?.leadId) {
                try {
                    const { logLeadView } = await import('@/api/leads.api');
                    await logLeadView(task.metadata.leadId);
                } catch (error) {
                    console.error('Failed to log lead view:', error);
                    // Don't block navigation on logging failure
                }
            }

            // Navigate to appropriate page
            if (task.metadata?.leadId && task.metadata?.leadData) {
                navigate('/clients/new', {
                    state: {
                        leadData: task.metadata.leadData,
                        leadId: task.metadata.leadId, // Pass leadId for tracking
                    },
                });
            } else if (task.client?.id) {
                navigate(`/clients/${task.client.id}`);
            }
        };

        if (agentDashboardQuery.isLoading) {
            return (
                <div className="dashboard-screen dashboard-state text-center">
                    <div className="spinner-border text-primary" role="status" />
                    <p className="mt-3 text-muted">Loading your dashboard.</p>
                </div>
            );
        }

        if (agentDashboardQuery.isError) {
            return (
                <div className="dashboard-screen dashboard-state">
                    <div className="alert alert-danger" role="alert">
                        <h5 className="alert-heading">Unable to load your dashboard</h5>
                        <p className="mb-3">
                            {agentDashboardQuery.error instanceof Error
                                ? agentDashboardQuery.error.message
                                : 'Please try again.'}
                        </p>
                        <button
                            className="btn btn-primary"
                            type="button"
                            onClick={() => agentDashboardQuery.refetch()}
                        >
                            Retry
                        </button>
                    </div>
                </div>
            );
        }

        // Calculate task counts from actual task data
        const activeTasks = workItems.filter(
            (task) => task.status !== 'completed' && task.status !== 'cancelled'
        ).length;
        const overdueTasks = workItems.filter(
            (task) =>
                task.status === 'overdue' ||
                (task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed')
        ).length;

        const agentStats = [
            {
                label: 'Assigned Leads',
                value: assignedLeadCount,
                icon: 'tasks' as DashboardMetricIcon,
                helper: 'Current allocation',
                tone: 'blue' as DashboardMetricTone,
            },
            {
                label: 'My Clients',
                value: agentData?.assignedClients || 0,
                icon: 'clients' as DashboardMetricIcon,
                helper: 'Assigned portfolio',
                tone: 'teal' as DashboardMetricTone,
            },
            {
                label: 'Open Work',
                value: activeTasks,
                icon: 'performance' as DashboardMetricIcon,
                helper: 'Leads and tasks',
                tone: 'violet' as DashboardMetricTone,
            },
            {
                label: 'Overdue Work',
                value: overdueTasks,
                icon: 'warning' as DashboardMetricIcon,
                helper: overdueTasks > 0 ? 'Requires follow-up' : 'Nothing overdue',
                tone: 'red' as DashboardMetricTone,
                attention: overdueTasks > 0,
            },
        ];

        return (
            <div className="dashboard-screen dashboard-screen--agent">
                {/* Header Section */}
                <div className="row mb-4 dashboard-page-header">
                    <div className="col-12">
                        <div className="d-flex justify-content-between align-items-center dashboard-page-header__content">
                            <div>
                                <p className="dashboard-eyebrow">My workspace</p>
                                <h1 className="mb-1">Welcome back, {session?.user.firstName}</h1>
                                <p className="text-muted mb-0">
                                    Here's what's happening with your work today
                                </p>
                            </div>
                            <div className="text-end dashboard-page-header__date">
                                <div className="text-muted">
                                    {new Date().toLocaleDateString('en-ZA', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats cards */}
                <div className="row g-3 mb-4 dashboard-metric-grid">
                    {agentStats.map((stat) => (
                        <div className="col-lg-3 col-md-6" key={stat.label}>
                            <DashboardMetricCard {...stat} />
                        </div>
                    ))}
                </div>

                <div className="row">
                    {/* Tasks Section */}
                    <div className="col-lg-8 mb-4">
                        <DashboardTasksPanel
                            tasks={workItems}
                            isLoading={tasksQuery.isLoading}
                            isError={tasksQuery.isError}
                            error={tasksQuery.error}
                            onRetry={() => tasksQuery.refetch()}
                            onTaskClick={handleTaskClick}
                        />
                    </div>

                    {/* Sidebar - Recent Activity & Quick Stats */}
                    <div className="col-lg-4 mb-4">
                        <div className="mb-4">
                            <DashboardMessagesPanel
                                emails={emails}
                                isLoading={inboxQuery.isLoading}
                                isError={inboxQuery.isError}
                            />
                        </div>

                        {/* Performance Metrics */}
                        {agentData && (
                            <div className="card dashboard-panel">
                                <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
                                    <h5
                                        className="mb-3"
                                        style={{ fontWeight: 600, fontSize: '1.2rem' }}
                                    >
                                        <i className="bi bi-graph-up me-2 text-primary"></i>
                                        Performance
                                    </h5>
                                </div>
                                <div className="card-body px-4 pb-4">
                                    <div className="mb-4">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <span className="text-muted small">
                                                Completion Rate
                                            </span>
                                            <span className="fw-bold text-primary">
                                                {agentData.completionRate.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div
                                            className="progress"
                                            style={{ height: '8px', borderRadius: '10px' }}
                                        >
                                            <div
                                                className="progress-bar bg-primary"
                                                style={{
                                                    width: `${agentData.completionRate}%`,
                                                    borderRadius: '10px',
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <span className="text-muted small">
                                                Target Achievement
                                            </span>
                                            <span className="fw-bold text-info">
                                                {agentData.targetAchievement.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div
                                            className="progress"
                                            style={{ height: '8px', borderRadius: '10px' }}
                                        >
                                            <div
                                                className="progress-bar bg-info"
                                                style={{
                                                    width: `${agentData.targetAchievement}%`,
                                                    borderRadius: '10px',
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="border-top pt-3">
                                        <div className="row text-center">
                                            <div className="col-6 mb-3">
                                                <div className="text-muted small mb-1">
                                                    Debt Managed
                                                </div>
                                                <div
                                                    className="h6 mb-0"
                                                    style={{ fontWeight: 700 }}
                                                >
                                                    R{' '}
                                                    {(agentData.totalDebtManaged / 1000).toFixed(0)}
                                                    K
                                                </div>
                                            </div>
                                            <div className="col-6 mb-3">
                                                <div className="text-muted small mb-1">
                                                    New Clients
                                                </div>
                                                <div
                                                    className="h6 mb-0"
                                                    style={{ fontWeight: 700 }}
                                                >
                                                    {agentData.newClientsThisMonth}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // CEO Dashboard
    if (isCEO) {
        const clientStats = clientStatsQuery.data || {};
        const smsStats = smsStatsQuery.data || {};
        const taskStats = taskStatsQuery.data || { total: 0, completed: 0, incomplete: 0 };
        const smsTotal = smsStats.grandTotal || smsStats.total || {};
        const smsUsers = smsStats.users || [];
        const creditBalance = smsUsers.length > 0 ? smsUsers[0]?.user?.creditBalance || 0 : 0;

        return (
            <ExecutiveDashboard
                date={today}
                clients={{
                    total: clientStats.total || 0,
                    active: clientStats.byStatus?.active || 0,
                    leads: clientStats.byStatus?.lead || 0,
                    loading: clientStatsQuery.isLoading,
                }}
                sms={{
                    delivered: smsTotal.delivered || 0,
                    sent: smsTotal.sent || 0,
                    failed: smsTotal.failed || 0,
                    credits: creditBalance,
                    loading: smsStatsQuery.isLoading,
                }}
                tasks={{
                    total: taskStats.total,
                    completed: taskStats.completed,
                    incomplete: taskStats.incomplete,
                    loading: taskStatsQuery.isLoading,
                }}
                hasError={
                    clientStatsQuery.isError || smsStatsQuery.isError || taskStatsQuery.isError
                }
                onRetry={() => {
                    void clientStatsQuery.refetch();
                    void smsStatsQuery.refetch();
                    void taskStatsQuery.refetch();
                }}
            />
        );
    }

    // Fallback for other roles
    return (
        <div className="dashboard-screen dashboard-state">
            <div className="alert alert-info">
                <h5>Dashboard</h5>
                <p className="mb-0">Your role: {role}</p>
                <p className="mb-0">Dashboard configuration in progress...</p>
            </div>
        </div>
    );
}
