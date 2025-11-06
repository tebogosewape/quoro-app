import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { getAgentDashboard } from '../../api/dashboard.api';
import { listTasks } from '@/api/tasks.api';
import { apiClient } from '@/api/axios.config';

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

export default function ClientflowDashboard() {
    const session = useAuthStore((state) => state.session);
    const role = session?.user.role;

    // Determine if user is admin or agent
    const isAdmin = role === 'admin' || role === 'admin_manager';
    const isAgent =
        role === 'agent' ||
        role === 'sales_agent' ||
        role === 'manager' ||
        role === 'team_leader' ||
        role === 'operations_manager';

    // Agent dashboard data queries
    const agentDashboardQuery = useQuery({
        queryKey: ['dashboard', 'agent'],
        queryFn: () => getAgentDashboard({ timeRange: 'month' }),
        enabled: isAgent && Boolean(session?.access_token),
        staleTime: 1000 * 60,
    });

    const tasksQuery = useQuery({
        queryKey: ['tasks', 'my-tasks'],
        queryFn: () => listTasks({ limit: 5 }),
        enabled: isAgent && Boolean(session?.access_token),
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

                console.log('Inbox API response:', response.data);

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
                const emails = Array.isArray(emailData) ? emailData : [];

                console.log('Processed emails:', emails);
                return emails;
            } catch (error) {
                console.error('Error fetching inbox:', error);
                return [];
            }
        },
        enabled: isAgent && Boolean(session?.access_token),
        staleTime: 1000 * 60,
        retry: 1,
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
            <div className="container py-4">
                <h1 className="mb-4">Admin Dashboard</h1>
                {/* Stats cards */}
                <div className="row mb-4">
                    {adminStats.map((s) => (
                        <div className="col-md-3 mb-3" key={s.label}>
                            <div className="card shadow-sm h-100">
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
                <div className="mb-4">
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
                <div className="mb-4">
                    <h5>Client Growth and Communication</h5>
                    <div className="bg-light border rounded p-4 text-center text-muted">
                        {/* TODO: Replace with real chart */}
                        <span>Unable to pull the main client communication channel....</span>
                    </div>
                </div>
                {/* Recent activity */}
                <div className="mb-4">
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
                <div className="mb-4">
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

        if (agentDashboardQuery.isLoading) {
            return (
                <div className="container py-4 text-center">
                    <div className="spinner-border text-primary" role="status" />
                    <p className="mt-3 text-muted">Loading your dashboard…</p>
                </div>
            );
        }

        const agentStats = [
            {
                label: 'My Clients',
                value: agentData?.assignedClients || 0,
                icon: 'bi-people',
            },
            {
                label: 'Commission (Month)',
                value: `R ${(agentData?.commissionSummary.totalEarned || 0).toLocaleString()}`,
                icon: 'bi-currency-dollar',
            },
            {
                label: 'Active Tasks',
                value: agentData?.activeTasks || 0,
                icon: 'bi-list-check',
            },
            {
                label: 'Overdue Tasks',
                value: agentData?.overdueTasks || 0,
                icon: 'bi-exclamation-triangle',
                variant: 'danger',
            },
        ];

        return (
            <div className="container py-4">
                <h1 className="mb-4">Agent Dashboard</h1>
                <p className="text-muted">Welcome back, {session?.user.firstName}!</p>

                {/* Stats cards */}
                <div className="row mb-4">
                    {agentStats.map((s) => (
                        <div className="col-md-3 mb-3" key={s.label}>
                            <div className="card shadow-sm h-100">
                                <div className="card-body d-flex align-items-center">
                                    <i
                                        className={`bi ${s.icon} display-5 me-3 text-${s.variant || 'primary'}`}
                                    />
                                    <div>
                                        <div className="h4 mb-0">{s.value}</div>
                                        <div className="text-muted small">{s.label}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="row">
                    {/* Tasks Section */}
                    <div className="col-md-6 mb-4">
                        <div className="card shadow-sm">
                            <div className="card-header bg-white">
                                <h5 className="mb-0">
                                    <i className="bi bi-list-task me-2"></i>
                                    Outstanding Tasks
                                </h5>
                            </div>
                            <div className="card-body">
                                {tasksQuery.isLoading ? (
                                    <div className="text-center py-3">
                                        <div className="spinner-border spinner-border-sm" />
                                    </div>
                                ) : tasks.length === 0 ? (
                                    <p className="text-muted mb-0">No tasks assigned</p>
                                ) : (
                                    <ul className="list-group list-group-flush">
                                        {tasks.slice(0, 5).map((task: any) => (
                                            <li
                                                key={task.id}
                                                className="list-group-item d-flex justify-content-between align-items-start"
                                            >
                                                <div>
                                                    <strong>{task.title}</strong>
                                                    <br />
                                                    <small className="text-muted">
                                                        {task.description || 'No description'}
                                                    </small>
                                                </div>
                                                <span
                                                    className={`badge bg-${
                                                        task.priority === 'high' ||
                                                        task.priority === 'urgent'
                                                            ? 'danger'
                                                            : task.priority === 'normal'
                                                              ? 'warning'
                                                              : 'secondary'
                                                    }`}
                                                >
                                                    {task.priority}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Inbox Section */}
                    <div className="col-md-6 mb-4">
                        <div className="card shadow-sm">
                            <div className="card-header bg-white">
                                <h5 className="mb-0">
                                    <i className="bi bi-envelope me-2"></i>
                                    Top 5 Inbox Messages
                                </h5>
                            </div>
                            <div className="card-body">
                                {inboxQuery.isLoading ? (
                                    <div className="text-center py-3">
                                        <div className="spinner-border spinner-border-sm" />
                                        <p className="text-muted mt-2 mb-0">Loading messages...</p>
                                    </div>
                                ) : inboxQuery.isError ? (
                                    <div className="alert alert-warning mb-0">
                                        <small>
                                            <i className="bi bi-exclamation-triangle me-1"></i>
                                            Unable to load messages. Check console for details.
                                        </small>
                                    </div>
                                ) : emails.length === 0 ? (
                                    <div className="text-center py-3">
                                        <i className="bi bi-inbox display-4 text-muted"></i>
                                        <p className="text-muted mb-0 mt-2">No messages in inbox</p>
                                    </div>
                                ) : (
                                    <ul className="list-group list-group-flush">
                                        {emails.map((email: any, idx: number) => (
                                            <li
                                                key={email.uid || email.id || idx}
                                                className="list-group-item"
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <div className="d-flex justify-content-between">
                                                    <strong className="text-truncate">
                                                        {email.subject || '(No subject)'}
                                                    </strong>
                                                </div>
                                                <small className="text-muted d-block">
                                                    From:{' '}
                                                    {email.from || email.fromAddress || 'Unknown'}
                                                </small>
                                                <small className="text-muted">
                                                    {email.date
                                                        ? new Date(email.date).toLocaleDateString()
                                                        : 'No date'}
                                                </small>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Additional Stats */}
                {agentData && (
                    <div className="row">
                        <div className="col-md-12">
                            <div className="card shadow-sm">
                                <div className="card-body">
                                    <h5>Performance Metrics</h5>
                                    <div className="row mt-3">
                                        <div className="col-md-3">
                                            <p className="text-muted mb-1">Completion Rate</p>
                                            <h4>{agentData.completionRate.toFixed(1)}%</h4>
                                        </div>
                                        <div className="col-md-3">
                                            <p className="text-muted mb-1">Total Debt Managed</p>
                                            <h4>R {agentData.totalDebtManaged.toLocaleString()}</h4>
                                        </div>
                                        <div className="col-md-3">
                                            <p className="text-muted mb-1">New Clients (Month)</p>
                                            <h4>{agentData.newClientsThisMonth}</h4>
                                        </div>
                                        <div className="col-md-3">
                                            <p className="text-muted mb-1">Target Achievement</p>
                                            <h4>{agentData.targetAchievement.toFixed(1)}%</h4>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Fallback for other roles
    return (
        <div className="container py-4">
            <div className="alert alert-info">
                <h5>Dashboard</h5>
                <p className="mb-0">Your role: {role}</p>
                <p className="mb-0">Dashboard configuration in progress...</p>
            </div>
        </div>
    );
}
