import type { TaskResponse } from '@/api/tasks.api';

type DashboardTasksPanelProps = {
    tasks: TaskResponse[];
    isLoading: boolean;
    isError: boolean;
    error?: unknown;
    onRetry: () => void;
    onTaskClick: (task: TaskResponse) => void;
};

const priorityTone = (priority: TaskResponse['priority']) => {
    if (priority === 'high' || priority === 'urgent') return 'danger';
    if (priority === 'normal') return 'warning';
    return 'neutral';
};

const taskCanOpen = (task: TaskResponse) => Boolean(task.metadata?.leadId || task.client?.id);

const TaskContent = ({ task }: { task: TaskResponse }) => (
    <>
        <span className="dashboard-task-item__icon" aria-hidden="true">
            <i className={`bi ${task.metadata?.leadId ? 'bi-person-plus' : 'bi-check2-square'}`} />
        </span>

        <span className="dashboard-task-item__content">
            <span className="dashboard-task-item__badges">
                {task.metadata?.leadId && (
                    <span className="dashboard-badge dashboard-badge--lead">New lead</span>
                )}
                <span className={`dashboard-badge dashboard-badge--${priorityTone(task.priority)}`}>
                    {task.priority}
                </span>
            </span>

            <strong className="dashboard-task-item__title">{task.title}</strong>

            <span className="dashboard-task-item__description">
                {task.metadata?.leadId ? (
                    <>
                        <span className="dashboard-task-item__label">Lead</span>
                        {task.metadata.leadData?.name || 'Unknown'}
                        {task.metadata.leadData?.cell && (
                            <span className="dashboard-task-item__secondary">
                                {' '}
                                • {task.metadata.leadData.cell}
                            </span>
                        )}
                    </>
                ) : (
                    task.description || 'No description provided'
                )}
            </span>

            {task.dueDate && (
                <span className="dashboard-task-item__due">
                    <i className="bi bi-calendar3" aria-hidden="true" />
                    Due {new Date(task.dueDate).toLocaleDateString('en-ZA')}
                </span>
            )}
        </span>

        {taskCanOpen(task) && (
            <span className="dashboard-task-item__action" aria-hidden="true">
                <span>{task.metadata?.leadId ? 'Convert lead' : 'Open client'}</span>
                <i className="bi bi-arrow-right" />
            </span>
        )}
    </>
);

export default function DashboardTasksPanel({
    tasks,
    isLoading,
    isError,
    error,
    onRetry,
    onTaskClick,
}: DashboardTasksPanelProps) {
    const activeTasks = tasks.filter((task) => task.status !== 'completed');
    const visibleTasks = activeTasks.slice(0, 10);

    return (
        <section className="dashboard-tasks-panel" aria-labelledby="dashboard-tasks-title">
            <header className="dashboard-tasks-panel__header">
                <div>
                    <h2 id="dashboard-tasks-title">My Tasks</h2>
                    <p>Assigned work requiring your attention</p>
                </div>
                <span
                    className={`dashboard-tasks-panel__count${isError ? ' dashboard-tasks-panel__count--error' : ''}`}
                >
                    {isError
                        ? 'Unavailable'
                        : `${activeTasks.length} active${tasks.length > 0 ? ` / ${tasks.length} total` : ''}`}
                </span>
            </header>

            <div className="dashboard-tasks-panel__body">
                {isLoading ? (
                    <div className="dashboard-tasks-state" role="status">
                        <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                        <span>Loading tasks…</span>
                    </div>
                ) : isError ? (
                    <div
                        className="dashboard-tasks-state dashboard-tasks-state--error"
                        role="alert"
                    >
                        <span className="dashboard-tasks-state__icon" aria-hidden="true">
                            <i className="bi bi-exclamation-triangle" />
                        </span>
                        <div>
                            <strong>Error Loading Tasks</strong>
                            <p>
                                {error instanceof Error
                                    ? error.message
                                    : 'Unable to load tasks. Please try again.'}
                            </p>
                        </div>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={onRetry}
                        >
                            Retry
                        </button>
                    </div>
                ) : activeTasks.length === 0 ? (
                    <div className="dashboard-tasks-state dashboard-tasks-state--empty">
                        <span className="dashboard-tasks-state__icon" aria-hidden="true">
                            <i className="bi bi-check2-circle" />
                        </span>
                        <div>
                            <strong>All caught up!</strong>
                            <p>You don&apos;t have any active tasks assigned right now.</p>
                        </div>
                    </div>
                ) : (
                    <div className="dashboard-task-list">
                        {visibleTasks.map((task) =>
                            taskCanOpen(task) ? (
                                <button
                                    key={task.id}
                                    type="button"
                                    className="dashboard-task-item dashboard-task-item--actionable"
                                    onClick={() => onTaskClick(task)}
                                    aria-label={`${task.title}. ${
                                        task.metadata?.leadId ? 'Convert lead' : 'Open client'
                                    }`}
                                >
                                    <TaskContent task={task} />
                                </button>
                            ) : (
                                <div key={task.id} className="dashboard-task-item">
                                    <TaskContent task={task} />
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>

            {!isLoading && !isError && activeTasks.length > 10 && (
                <footer className="dashboard-tasks-panel__footer">
                    Showing 10 of {activeTasks.length} active tasks
                </footer>
            )}
        </section>
    );
}
