import DashboardMetricCard from './widgets/DashboardMetricCard';
import './ExecutiveDashboard.css';

type ExecutiveDashboardProps = {
    date: Date;
    clients: {
        total: number;
        active: number;
        leads: number;
        loading: boolean;
    };
    sms: {
        delivered: number;
        sent: number;
        failed: number;
        credits: number;
        loading: boolean;
    };
    tasks: {
        total: number;
        completed: number;
        incomplete: number;
        loading: boolean;
    };
    hasError: boolean;
    onRetry: () => void;
};

const metricValue = (loading: boolean, value: number) => (loading ? '—' : value);

export default function ExecutiveDashboard({
    date,
    clients,
    sms,
    tasks,
    hasError,
    onRetry,
}: ExecutiveDashboardProps) {
    return (
        <div className="dashboard-screen dashboard-screen--executive executive-dashboard">
            <header className="dashboard-page-header executive-dashboard__header">
                <div>
                    <p className="dashboard-eyebrow">Executive workspace</p>
                    <h1>CEO Dashboard</h1>
                    <p>Live business performance across clients, communication, and work.</p>
                </div>
                <time dateTime={date.toISOString()}>
                    {date.toLocaleDateString('en-ZA', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    })}
                </time>
            </header>

            {hasError && (
                <div className="executive-dashboard__error" role="alert">
                    <div>
                        <strong>Some executive metrics could not be loaded.</strong>
                        <span>The available information is still shown below.</span>
                    </div>
                    <button type="button" onClick={onRetry}>
                        Retry
                    </button>
                </div>
            )}

            <section
                className="executive-dashboard__section"
                aria-labelledby="client-metrics-title"
            >
                <div className="executive-dashboard__section-heading">
                    <div>
                        <h2 id="client-metrics-title">Client portfolio</h2>
                        <p>Current client and lead position</p>
                    </div>
                </div>
                <div className="executive-dashboard__metrics executive-dashboard__metrics--three">
                    <DashboardMetricCard
                        label="Total Clients"
                        value={metricValue(clients.loading, clients.total)}
                        helper="All client records"
                        icon="clients"
                        tone="blue"
                    />
                    <DashboardMetricCard
                        label="Active Clients"
                        value={metricValue(clients.loading, clients.active)}
                        helper="Active portfolio"
                        icon="performance"
                        tone="teal"
                    />
                    <DashboardMetricCard
                        label="New Leads"
                        value={metricValue(clients.loading, clients.leads)}
                        helper="Awaiting conversion"
                        icon="clients"
                        tone="violet"
                    />
                </div>
            </section>

            <section className="executive-dashboard__section" aria-labelledby="sms-metrics-title">
                <div className="executive-dashboard__section-heading">
                    <div>
                        <h2 id="sms-metrics-title">SMS performance</h2>
                        <p>Current month delivery activity and available balance</p>
                    </div>
                    <span>This month</span>
                </div>
                <div className="executive-dashboard__metrics executive-dashboard__metrics--four">
                    <DashboardMetricCard
                        label="Delivered"
                        value={metricValue(sms.loading, sms.delivered)}
                        helper="Successfully delivered"
                        icon="performance"
                        tone="teal"
                    />
                    <DashboardMetricCard
                        label="Sent"
                        value={metricValue(sms.loading, sms.sent)}
                        helper="Submitted messages"
                        icon="tasks"
                        tone="blue"
                    />
                    <DashboardMetricCard
                        label="Failed"
                        value={metricValue(sms.loading, sms.failed)}
                        helper="Requires attention"
                        icon="warning"
                        tone="red"
                        attention={!sms.loading && sms.failed > 0}
                    />
                    <DashboardMetricCard
                        label="SMS Credits"
                        value={metricValue(sms.loading, sms.credits)}
                        helper="Available sending balance"
                        icon="performance"
                        tone="violet"
                    />
                </div>
            </section>

            <section className="executive-dashboard__section" aria-labelledby="task-metrics-title">
                <div className="executive-dashboard__section-heading">
                    <div>
                        <h2 id="task-metrics-title">Task management</h2>
                        <p>Organisation-wide workload position</p>
                    </div>
                </div>
                <div className="executive-dashboard__metrics executive-dashboard__metrics--three">
                    <DashboardMetricCard
                        label="Total Tasks"
                        value={metricValue(tasks.loading, tasks.total)}
                        helper="All tracked work"
                        icon="tasks"
                        tone="blue"
                    />
                    <DashboardMetricCard
                        label="Completed"
                        value={metricValue(tasks.loading, tasks.completed)}
                        helper="Finished work items"
                        icon="performance"
                        tone="teal"
                    />
                    <DashboardMetricCard
                        label="Incomplete"
                        value={metricValue(tasks.loading, tasks.incomplete)}
                        helper="Still requiring action"
                        icon="warning"
                        tone="red"
                        attention={!tasks.loading && tasks.incomplete > 0}
                    />
                </div>
            </section>

            <aside className="executive-dashboard__note">
                <strong>Executive overview</strong>
                <p>Metrics refresh from the operational client, ZoomConnect, and task services.</p>
            </aside>
        </div>
    );
}
