import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { getAgentDashboard } from '../../api/dashboard.api';
import { listTasks } from '@/api/tasks.api';
import { apiClient } from '@/api/axios.config';
import { useNavigate } from 'react-router-dom';

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

        // Debug logging
        console.log('Agent Dashboard Debug:', {
            userId: session?.user?.id,
            tasksQueryData: tasksQuery.data,
            tasksCount: tasks.length,
            tasksQueryError: tasksQuery.error,
            tasksQueryIsLoading: tasksQuery.isLoading,
            tasks: tasks,
        });

        // Handle task click - if it's a lead conversion task, navigate to onboarding with lead data
        const handleTaskClick = (task: any) => {
            if (task.metadata?.leadId && task.metadata?.leadData) {
                navigate('/clients/new', {
                    state: { leadData: task.metadata.leadData },
                });
            } else if (task.client?.id) {
                navigate(`/clients/${task.client.id}`);
            }
        };

        if (agentDashboardQuery.isLoading) {
            return (
                <div className="container py-4 text-center">
                    <div className="spinner-border text-primary" role="status" />
                    <p className="mt-3 text-muted">Loading your dashboard…</p>
                </div>
            );
        }

        // Calculate task counts from actual task data
        const activeTasks = tasks.filter(
            (t: any) => t.status !== 'completed' && t.status !== 'cancelled'
        ).length;
        const overdueTasks = tasks.filter(
            (t: any) =>
                t.status === 'overdue' ||
                (t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed')
        ).length;

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
                value: activeTasks,
                icon: 'bi-list-check',
            },
            {
                label: 'Overdue Tasks',
                value: overdueTasks,
                icon: 'bi-exclamation-triangle',
                variant: 'danger',
            },
        ];

        return (
            <div className="container-fluid py-4" style={{ minHeight: '100vh' }}>
                {/* Header Section */}
                <div className="row mb-4">
                    <div className="col-12">
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <h1 className="mb-1" style={{ fontWeight: 700, fontSize: '2rem' }}>
                                    Welcome back, {session?.user.firstName}! 👋
                                </h1>
                                <p className="text-muted mb-0" style={{ fontSize: '1rem' }}>
                                    Here's what's happening with your work today
                                </p>
                            </div>
                            <div className="text-end">
                                <div className="text-muted" style={{ fontSize: '0.9rem' }}>
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
                <div className="row mb-4">
                    {agentStats.map((s, idx) => (
                        <div className="col-lg-3 col-md-6 mb-3" key={s.label}>
                            <div
                                className="card border-0 h-100 shadow-sm"
                                style={{
                                    borderRadius: '12px',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                }}
                            >
                                <div className="card-body p-4">
                                    <div className="d-flex align-items-center">
                                        <div
                                            className={`rounded-circle d-flex align-items-center justify-content-center me-3`}
                                            style={{
                                                width: '48px',
                                                height: '48px',
                                                backgroundColor:
                                                    s.variant === 'danger'
                                                        ? '#dc3545'
                                                        : idx === 0
                                                          ? '#667eea'
                                                          : idx === 1
                                                            ? '#28a745'
                                                            : idx === 2
                                                              ? '#17a2b8'
                                                              : '#ffc107',
                                            }}
                                        >
                                            <i className={`bi ${s.icon} fs-5 text-white`}></i>
                                        </div>
                                        <div className="flex-grow-1">
                                            <div
                                                className="text-muted small mb-1"
                                                style={{ fontSize: '0.85rem' }}
                                            >
                                                {s.label}
                                            </div>
                                            <div className="h4 mb-0" style={{ fontWeight: 600 }}>
                                                {s.value}
                                            </div>
                                        </div>
                                    </div>
                                    {s.variant === 'danger' && s.value > 0 && (
                                        <div
                                            className="alert alert-danger py-2 px-3 mb-0 mt-3"
                                            style={{ fontSize: '0.8rem', borderRadius: '8px' }}
                                        >
                                            <i className="bi bi-exclamation-triangle-fill me-1"></i>
                                            Needs attention
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="row">
                    {/* Tasks Section */}
                    <div className="col-lg-8 mb-4">
                        <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                            <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h5
                                        className="mb-0"
                                        style={{ fontWeight: 600, fontSize: '1.2rem' }}
                                    >
                                        <i className="bi bi-list-check me-2 text-primary"></i>
                                        My Tasks
                                    </h5>
                                    {tasksQuery.isError ? (
                                        <span
                                            className="badge bg-danger"
                                            style={{
                                                fontSize: '0.85rem',
                                                padding: '0.4rem 0.9rem',
                                                borderRadius: '20px',
                                            }}
                                        >
                                            Error Loading
                                        </span>
                                    ) : (
                                        <span
                                            className="badge bg-primary"
                                            style={{
                                                fontSize: '0.85rem',
                                                padding: '0.4rem 0.9rem',
                                                borderRadius: '20px',
                                            }}
                                        >
                                            {
                                                tasks.filter((t: any) => t.status !== 'completed')
                                                    .length
                                            }{' '}
                                            Active {tasks.length > 0 && `/ ${tasks.length} Total`}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="card-body px-4 pb-4">
                                {tasksQuery.isLoading ? (
                                    <div className="text-center py-5">
                                        <div
                                            className="spinner-border text-primary"
                                            style={{ width: '3rem', height: '3rem' }}
                                        />
                                        <p className="text-muted mt-3 mb-0">
                                            Loading your tasks...
                                        </p>
                                    </div>
                                ) : tasksQuery.isError ? (
                                    <div className="text-center py-5">
                                        <i className="bi bi-exclamation-triangle display-1 text-danger mb-3"></i>
                                        <h5 className="text-muted mb-2">Error Loading Tasks</h5>
                                        <p className="text-muted mb-3">
                                            {tasksQuery.error instanceof Error
                                                ? tasksQuery.error.message
                                                : 'Unable to load tasks. Please try refreshing the page.'}
                                        </p>
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => tasksQuery.refetch()}
                                        >
                                            <i className="bi bi-arrow-clockwise me-2"></i>
                                            Retry
                                        </button>
                                    </div>
                                ) : tasks.length === 0 ? (
                                    <div className="text-center py-5">
                                        <i className="bi bi-check-circle display-1 text-success mb-3"></i>
                                        <h5 className="text-muted mb-2">All caught up!</h5>
                                        <p className="text-muted mb-0">
                                            You don't have any tasks assigned right now.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="list-group list-group-flush">
                                        {tasks
                                            .filter((t: any) => t.status !== 'completed')
                                            .slice(0, 10)
                                            .map((task: any) => (
                                                <div
                                                    key={task.id}
                                                    className="list-group-item border-0 px-0 py-3"
                                                    onClick={() => handleTaskClick(task)}
                                                    style={{
                                                        cursor:
                                                            task.metadata?.leadId || task.client?.id
                                                                ? 'pointer'
                                                                : 'default',
                                                        borderBottom: '1px solid rgba(0,0,0,0.05)',
                                                        transition: 'all 0.2s ease',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (
                                                            task.metadata?.leadId ||
                                                            task.client?.id
                                                        ) {
                                                            e.currentTarget.style.background =
                                                                'rgba(102, 126, 234, 0.05)';
                                                            e.currentTarget.style.borderRadius =
                                                                '12px';
                                                            e.currentTarget.style.padding = '1rem';
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background =
                                                            'transparent';
                                                        e.currentTarget.style.padding = '0.75rem 0';
                                                    }}
                                                >
                                                    <div className="d-flex justify-content-between align-items-start">
                                                        <div className="flex-grow-1">
                                                            <div className="d-flex align-items-center mb-2">
                                                                {task.metadata?.leadId && (
                                                                    <span
                                                                        className="badge me-2"
                                                                        style={{
                                                                            background:
                                                                                'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                                                                            fontSize: '0.75rem',
                                                                            padding:
                                                                                '0.35rem 0.75rem',
                                                                            borderRadius: '12px',
                                                                            fontWeight: 600,
                                                                        }}
                                                                    >
                                                                        <i className="bi bi-person-plus-fill me-1"></i>
                                                                        New Lead
                                                                    </span>
                                                                )}
                                                                <span
                                                                    className={`badge`}
                                                                    style={{
                                                                        background:
                                                                            task.priority ===
                                                                                'high' ||
                                                                            task.priority ===
                                                                                'urgent'
                                                                                ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                                                                                : task.priority ===
                                                                                    'normal'
                                                                                  ? 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
                                                                                  : 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                                                                        fontSize: '0.75rem',
                                                                        padding: '0.35rem 0.75rem',
                                                                        borderRadius: '12px',
                                                                        fontWeight: 600,
                                                                        textTransform: 'capitalize',
                                                                    }}
                                                                >
                                                                    {task.priority}
                                                                </span>
                                                            </div>
                                                            <h6
                                                                className="mb-2"
                                                                style={{
                                                                    fontWeight: 600,
                                                                    fontSize: '1.05rem',
                                                                }}
                                                            >
                                                                {task.title}
                                                            </h6>
                                                            <p
                                                                className="text-muted mb-2"
                                                                style={{ fontSize: '0.9rem' }}
                                                            >
                                                                {task.metadata?.leadId ? (
                                                                    <>
                                                                        <strong>Lead:</strong>{' '}
                                                                        {task.metadata.leadData
                                                                            ?.name || 'Unknown'}
                                                                        {task.metadata.leadData
                                                                            ?.cell &&
                                                                            ` • ${task.metadata.leadData.cell}`}
                                                                    </>
                                                                ) : (
                                                                    task.description ||
                                                                    'No description'
                                                                )}
                                                            </p>
                                                            {task.metadata?.leadId && (
                                                                <div
                                                                    className="d-inline-flex align-items-center"
                                                                    style={{
                                                                        color: '#667eea',
                                                                        fontSize: '0.9rem',
                                                                        fontWeight: 600,
                                                                    }}
                                                                >
                                                                    <i className="bi bi-arrow-right-circle-fill me-2"></i>
                                                                    Click to convert to client
                                                                </div>
                                                            )}
                                                            {task.dueDate && (
                                                                <div className="mt-2">
                                                                    <small className="text-muted">
                                                                        <i className="bi bi-calendar-event me-1"></i>
                                                                        Due:{' '}
                                                                        {new Date(
                                                                            task.dueDate
                                                                        ).toLocaleDateString()}
                                                                    </small>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        {tasks.filter((t: any) => t.status !== 'completed').length >
                                            10 && (
                                            <div className="text-center pt-3">
                                                <button
                                                    className="btn btn-link text-decoration-none"
                                                    style={{ color: '#667eea', fontWeight: 600 }}
                                                >
                                                    View all{' '}
                                                    {
                                                        tasks.filter(
                                                            (t: any) => t.status !== 'completed'
                                                        ).length
                                                    }{' '}
                                                    tasks →
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar - Recent Activity & Quick Stats */}
                    <div className="col-lg-4 mb-4">
                        {/* Inbox Section */}
                        <div
                            className="card border-0 shadow-sm mb-4"
                            style={{ borderRadius: '12px' }}
                        >
                            <div className="card-header bg-white border-0 pt-4 px-4 pb-0">
                                <h5
                                    className="mb-3"
                                    style={{ fontWeight: 600, fontSize: '1.2rem' }}
                                >
                                    <i className="bi bi-envelope me-2 text-primary"></i>
                                    Recent Messages
                                </h5>
                            </div>
                            <div className="card-body px-4 pb-4">
                                {inboxQuery.isLoading ? (
                                    <div className="text-center py-4">
                                        <div className="spinner-border spinner-border-sm text-primary" />
                                        <p className="text-muted mt-2 mb-0 small">Loading...</p>
                                    </div>
                                ) : inboxQuery.isError ? (
                                    <div
                                        className="alert alert-warning py-2 px-3 mb-0"
                                        style={{ borderRadius: '12px', fontSize: '0.85rem' }}
                                    >
                                        <i className="bi bi-exclamation-triangle me-1"></i>
                                        Unable to load messages
                                    </div>
                                ) : emails.length === 0 ? (
                                    <div className="text-center py-4">
                                        <i className="bi bi-inbox display-4 text-muted mb-2"></i>
                                        <p className="text-muted mb-0 small">No messages</p>
                                    </div>
                                ) : (
                                    <div className="list-group list-group-flush">
                                        {emails.slice(0, 5).map((email: any, idx: number) => (
                                            <div
                                                key={email.uid || email.id || idx}
                                                className="list-group-item border-0 px-3 py-3"
                                                style={{
                                                    cursor: 'pointer',
                                                    borderBottom:
                                                        idx < 4
                                                            ? '1px solid rgba(0,0,0,0.08)'
                                                            : 'none',
                                                    transition: 'all 0.2s ease',
                                                    borderRadius: '8px',
                                                    marginBottom: idx < 4 ? '0.5rem' : '0',
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = '#f8f9fa';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background =
                                                        'transparent';
                                                }}
                                            >
                                                <div
                                                    className="d-flex align-items-center gap-3"
                                                    style={{ overflow: 'hidden' }}
                                                >
                                                    <div
                                                        className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                                        style={{
                                                            width: '44px',
                                                            height: '44px',
                                                            background: '#667eea',
                                                            fontSize: '1rem',
                                                            color: 'white',
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {(email.from || email.fromAddress || 'U')
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </div>
                                                    <div
                                                        className="flex-grow-1"
                                                        style={{ minWidth: 0, overflow: 'hidden' }}
                                                    >
                                                        <div
                                                            className="fw-semibold mb-1"
                                                            style={{
                                                                fontSize: '0.95rem',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                            title={email.subject || '(No subject)'}
                                                        >
                                                            {email.subject || '(No subject)'}
                                                        </div>
                                                        <div
                                                            className="text-muted small mb-1"
                                                            style={{
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                            title={
                                                                email.from ||
                                                                email.fromAddress ||
                                                                'Unknown'
                                                            }
                                                        >
                                                            {email.from ||
                                                                email.fromAddress ||
                                                                'Unknown'}
                                                        </div>
                                                        <div
                                                            className="text-muted"
                                                            style={{ fontSize: '0.75rem' }}
                                                        >
                                                            {email.date
                                                                ? new Date(
                                                                      email.date
                                                                  ).toLocaleDateString()
                                                                : 'No date'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Performance Metrics */}
                        {agentData && (
                            <div
                                className="card border-0 shadow-sm"
                                style={{ borderRadius: '12px' }}
                            >
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
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        const thisWeekStart = new Date(today);
        thisWeekStart.setDate(today.getDate() - today.getDay());
        const thisWeekStartStr = thisWeekStart.toISOString().split('T')[0];

        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const thisMonthStartStr = thisMonthStart.toISOString().split('T')[0];

        // Fetch client stats
        const clientStatsQuery = useQuery({
            queryKey: ['client-stats'],
            queryFn: async () => {
                const token = session?.access_token;
                const response = await apiClient.get('/clients/stats', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                return response.data?.data || response.data || {};
            },
            staleTime: 1000 * 60 * 5,
        });

        // Fetch ZoomConnect SMS stats
        const smsStatsQuery = useQuery({
            queryKey: ['zoomconnect-stats', thisMonthStartStr, todayStr],
            queryFn: async () => {
                const token = session?.access_token;
                const response = await apiClient.get('/zoomconnect/stats', {
                    params: { from: thisMonthStartStr, to: todayStr },
                    headers: { Authorization: `Bearer ${token}` },
                });
                console.log('ZoomConnect API Response:', response.data);
                console.log('Response structure:', JSON.stringify(response.data, null, 2));
                // Extract data from envelope: {success: true, data: {...}}
                return response.data?.data || response.data || {};
            },
            staleTime: 1000 * 60 * 5,
        });

        // Fetch commission settings
        const commissionQuery = useQuery({
            queryKey: ['commission-settings'],
            queryFn: async () => {
                const token = session?.access_token;
                const response = await apiClient.get('/commission', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = response.data?.data || response.data || {};
                return { percentage: data.percentage || 10 };
            },
            staleTime: 1000 * 60 * 5,
        });

        // Fetch task stats
        const taskStatsQuery = useQuery({
            queryKey: ['task-stats'],
            queryFn: async () => {
                const token = session?.access_token;
                const response = await apiClient.get('/tasks', {
                    params: { limit: 1000 },
                    headers: { Authorization: `Bearer ${token}` },
                });
                const tasks = response.data?.data || response.data || [];
                const total = Array.isArray(tasks) ? tasks.length : 0;
                const completed = Array.isArray(tasks)
                    ? tasks.filter((t: any) => t.status === 'completed').length
                    : 0;
                const incomplete = total - completed;
                return { total, completed, incomplete };
            },
            staleTime: 1000 * 60 * 5,
        });

        const clientStats = clientStatsQuery.data || {};
        const smsStats = smsStatsQuery.data || {};
        const commission = commissionQuery.data || { percentage: 10 };
        const taskStats = taskStatsQuery.data || { total: 0, completed: 0, incomplete: 0 };

        // Extract SMS statistics from nested structure
        console.log('SMS Stats Data:', smsStats);
        const smsTotal = smsStats.grandTotal || smsStats.total || {};
        console.log('SMS Total:', smsTotal);
        const smsDelivered = smsTotal.delivered || 0;
        const smsSent = smsTotal.sent || 0;
        const smsFailed = smsTotal.failed || 0;

        // Extract credit balance from user data
        const smsUsers = smsStats.users || [];
        console.log('SMS Users:', smsUsers);
        const creditBalance = smsUsers.length > 0 ? smsUsers[0]?.user?.creditBalance || 0 : 0;
        console.log('Credit Balance:', creditBalance);

        return (
            <div className="container-fluid py-4">
                {/* Modern Gradient Header */}
                <div
                    className="mb-4 p-4 text-white"
                    style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    }}
                >
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h2 className="mb-1">CEO Dashboard</h2>
                            <p className="mb-0 opacity-75">
                                Executive overview and business intelligence
                            </p>
                        </div>
                        <div className="text-end">
                            <div className="fs-5 fw-bold">
                                {today.toLocaleDateString('en-ZA', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Client Statistics */}
                <div className="mb-4">
                    <h5 className="mb-3">Client Statistics</h5>
                    <div className="row">
                        <div className="col-md-4 mb-3">
                            <div
                                className="card border-0 h-100"
                                style={{
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                }}
                            >
                                <div className="card-body d-flex align-items-center">
                                    <svg
                                        width="48"
                                        height="48"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#667eea"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="me-3"
                                    >
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                    </svg>
                                    <div>
                                        <div className="h3 mb-0">
                                            {clientStatsQuery.isLoading
                                                ? '...'
                                                : clientStats.total || 0}
                                        </div>
                                        <div className="text-muted small">Total Clients</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-4 mb-3">
                            <div
                                className="card border-0 h-100"
                                style={{
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                }}
                            >
                                <div className="card-body d-flex align-items-center">
                                    <svg
                                        width="48"
                                        height="48"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#10b981"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="me-3"
                                    >
                                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                        <circle cx="8.5" cy="7" r="4" />
                                        <polyline points="17 11 19 13 23 9" />
                                    </svg>
                                    <div>
                                        <div className="h3 mb-0">
                                            {clientStatsQuery.isLoading
                                                ? '...'
                                                : clientStats.byStatus?.active || 0}
                                        </div>
                                        <div className="text-muted small">Active Clients</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-4 mb-3">
                            <div
                                className="card border-0 h-100"
                                style={{
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                }}
                            >
                                <div className="card-body d-flex align-items-center">
                                    <svg
                                        width="48"
                                        height="48"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#f59e0b"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="me-3"
                                    >
                                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                        <circle cx="8.5" cy="7" r="4" />
                                        <line x1="23" y1="11" x2="17" y2="11" />
                                    </svg>
                                    <div>
                                        <div className="h3 mb-0">
                                            {clientStatsQuery.isLoading
                                                ? '...'
                                                : clientStats.byStatus?.lead || 0}
                                        </div>
                                        <div className="text-muted small">New Leads</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SMS Statistics */}
                <div className="mb-4">
                    <h5 className="mb-3">SMS Statistics (This Month)</h5>
                    <div className="row">
                        <div className="col-md-3 mb-3">
                            <div
                                className="card border-0 h-100"
                                style={{
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                }}
                            >
                                <div className="card-body d-flex align-items-center">
                                    <svg
                                        width="48"
                                        height="48"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#10b981"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="me-3"
                                    >
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                        <polyline points="9 10 12 13 16 9" />
                                    </svg>
                                    <div>
                                        <div className="h3 mb-0">
                                            {smsStatsQuery.isLoading ? '...' : smsDelivered}
                                        </div>
                                        <div className="text-muted small">Delivered</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <div
                                className="card border-0 h-100"
                                style={{
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                }}
                            >
                                <div className="card-body d-flex align-items-center">
                                    <svg
                                        width="48"
                                        height="48"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#3b82f6"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="me-3"
                                    >
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                        <path d="M8 10h.01M12 10h.01M16 10h.01" />
                                    </svg>
                                    <div>
                                        <div className="h3 mb-0">
                                            {smsStatsQuery.isLoading ? '...' : smsSent}
                                        </div>
                                        <div className="text-muted small">Sent</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <div
                                className="card border-0 h-100"
                                style={{
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                }}
                            >
                                <div className="card-body d-flex align-items-center">
                                    <svg
                                        width="48"
                                        height="48"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#ef4444"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="me-3"
                                    >
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                        <line x1="9" y1="9" x2="15" y2="15" />
                                        <line x1="15" y1="9" x2="9" y2="15" />
                                    </svg>
                                    <div>
                                        <div className="h3 mb-0">
                                            {smsStatsQuery.isLoading ? '...' : smsFailed}
                                        </div>
                                        <div className="text-muted small">Failed</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-3 mb-3">
                            <div
                                className="card border-0 h-100"
                                style={{
                                    borderRadius: '12px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                }}
                            >
                                <div className="card-body d-flex align-items-center text-white">
                                    <svg
                                        width="48"
                                        height="48"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="white"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="me-3"
                                    >
                                        <text
                                            x="12"
                                            y="18"
                                            fontSize="18"
                                            fontWeight="bold"
                                            textAnchor="middle"
                                            fill="white"
                                        >
                                            R
                                        </text>
                                    </svg>
                                    <div>
                                        <div className="h3 mb-0">
                                            {smsStatsQuery.isLoading ? '...' : creditBalance}
                                        </div>
                                        <div className="opacity-75 small">SMS Credits</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Commission & Tasks */}
                <div className="row">
                    <div className="col-md-6 mb-4">
                        <h5 className="mb-3">Commission Settings</h5>
                        <div
                            className="card border-0"
                            style={{ borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                        >
                            <div className="card-body">
                                <div className="d-flex align-items-center mb-3">
                                    <svg
                                        width="48"
                                        height="48"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#667eea"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="me-3"
                                    >
                                        <text
                                            x="12"
                                            y="18"
                                            fontSize="18"
                                            fontWeight="bold"
                                            textAnchor="middle"
                                            fill="#667eea"
                                        >
                                            R
                                        </text>
                                    </svg>
                                    <div>
                                        <div className="h2 mb-0">
                                            {commissionQuery.isLoading
                                                ? '...'
                                                : `${commission.percentage}%`}
                                        </div>
                                        <div className="text-muted small">
                                            Global Agent Commission Rate
                                        </div>
                                    </div>
                                </div>
                                <div className="text-muted small">
                                    This is the default commission percentage applied to all agent
                                    transactions. Update this value in Commission Settings.
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-6 mb-4">
                        <h5 className="mb-3">Task Management</h5>
                        <div className="row">
                            <div className="col-md-4 mb-3">
                                <div
                                    className="card border-0 h-100"
                                    style={{
                                        borderRadius: '12px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                    }}
                                >
                                    <div className="card-body text-center">
                                        <svg
                                            width="32"
                                            height="32"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="#667eea"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="mx-auto mb-2"
                                        >
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                            <polyline points="14 2 14 8 20 8" />
                                            <line x1="9" y1="15" x2="15" y2="15" />
                                        </svg>
                                        <div className="h4 mb-0">
                                            {taskStatsQuery.isLoading ? '...' : taskStats.total}
                                        </div>
                                        <div className="text-muted small">Total</div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-md-4 mb-3">
                                <div
                                    className="card border-0 h-100"
                                    style={{
                                        borderRadius: '12px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                    }}
                                >
                                    <div className="card-body text-center">
                                        <svg
                                            width="32"
                                            height="32"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="#10b981"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="mx-auto mb-2"
                                        >
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                            <polyline points="14 2 14 8 20 8" />
                                            <polyline points="9 15 11 17 15 13" />
                                        </svg>
                                        <div className="h4 mb-0">
                                            {taskStatsQuery.isLoading ? '...' : taskStats.completed}
                                        </div>
                                        <div className="text-muted small">Complete</div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-md-4 mb-3">
                                <div
                                    className="card border-0 h-100"
                                    style={{
                                        borderRadius: '12px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                    }}
                                >
                                    <div className="card-body text-center">
                                        <svg
                                            width="32"
                                            height="32"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="#f59e0b"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="mx-auto mb-2"
                                        >
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                            <polyline points="14 2 14 8 20 8" />
                                            <circle cx="12" cy="15" r="1" />
                                        </svg>
                                        <div className="h4 mb-0">
                                            {taskStatsQuery.isLoading
                                                ? '...'
                                                : taskStats.incomplete}
                                        </div>
                                        <div className="text-muted small">Incomplete</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Info */}
                <div className="row">
                    <div className="col-12">
                        <div
                            className="alert alert-info border-0"
                            style={{ borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                        >
                            <div className="d-flex align-items-start">
                                <svg
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="me-3 mt-1"
                                >
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="16" x2="12" y2="12" />
                                    <line x1="12" y1="8" x2="12.01" y2="8" />
                                </svg>
                                <div>
                                    <h6 className="mb-2">Executive Dashboard</h6>
                                    <p className="mb-0 small">
                                        This dashboard provides a comprehensive overview of business
                                        operations including client statistics, SMS communication
                                        metrics, commission settings, and task management. All data
                                        is updated in real-time and reflects current business
                                        performance.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
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
