import { useEffect, useMemo, useState } from 'react';
import type { TaskResponse } from '@/api/tasks.api';

const PAGE_SIZE = 5;

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
            <span className="dashboard-task-item__title-row">
                <strong className="dashboard-task-item__title">{task.title}</strong>
                <span className="dashboard-task-item__badges">
                    {task.metadata?.leadId && (
                        <span className="dashboard-badge dashboard-badge--lead">Lead</span>
                    )}
                    <span
                        className={`dashboard-badge dashboard-badge--${priorityTone(task.priority)}`}
                    >
                        {task.priority}
                    </span>
                </span>
            </span>

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
    const activeTasks = useMemo(() => tasks.filter((task) => task.status !== 'completed'), [tasks]);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const filteredTasks = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return activeTasks;

        return activeTasks.filter((task) => {
            const leadData = task.metadata?.leadData as
                | { name?: string; cell?: string; idNumber?: string }
                | undefined;
            const clientName = task.client
                ? `${task.client.firstName} ${task.client.lastName}`
                : '';
            return [
                task.title,
                task.description,
                leadData?.name,
                leadData?.cell,
                leadData?.idNumber,
                clientName,
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query));
        });
    }, [activeTasks, searchQuery]);
    const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE));
    const pageStart = (currentPage - 1) * PAGE_SIZE;
    const visibleTasks = filteredTasks.slice(pageStart, pageStart + PAGE_SIZE);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, tasks]);

    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [currentPage, totalPages]);

    return (
        <section className="dashboard-tasks-panel" aria-labelledby="dashboard-tasks-title">
            <header className="dashboard-tasks-panel__header">
                <div>
                    <h2 id="dashboard-tasks-title">My Work Queue</h2>
                    <p>Assigned leads and tasks requiring your attention</p>
                </div>
                <span
                    className={`dashboard-tasks-panel__count${isError ? ' dashboard-tasks-panel__count--error' : ''}`}
                >
                    {isError
                        ? 'Unavailable'
                        : `${activeTasks.length} active${tasks.length > 0 ? ` / ${tasks.length} total` : ''}`}
                </span>
            </header>

            {!isLoading && !isError && activeTasks.length > 0 && (
                <div className="dashboard-tasks-panel__toolbar">
                    <label>
                        <span className="visually-hidden">Search work queue</span>
                        <input
                            type="search"
                            value={searchQuery}
                            placeholder="Search lead, client or phone"
                            onChange={(event) => setSearchQuery(event.target.value)}
                        />
                    </label>
                    <span>{filteredTasks.length} matching</span>
                </div>
            )}

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
                            <p>You don&apos;t have any assigned leads or active tasks right now.</p>
                        </div>
                    </div>
                ) : filteredTasks.length === 0 ? (
                    <div className="dashboard-tasks-state dashboard-tasks-state--empty">
                        <span className="dashboard-tasks-state__icon" aria-hidden="true">
                            <i className="bi bi-search" />
                        </span>
                        <div>
                            <strong>No matching work</strong>
                            <p>Try a lead name, client name, phone number or ID number.</p>
                        </div>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => setSearchQuery('')}
                        >
                            Clear search
                        </button>
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

            {!isLoading && !isError && filteredTasks.length > 0 && (
                <footer className="dashboard-tasks-panel__footer">
                    <span>
                        Showing {pageStart + 1}-
                        {Math.min(pageStart + PAGE_SIZE, filteredTasks.length)} of{' '}
                        {filteredTasks.length}
                    </span>
                    <span>
                        Page {currentPage} of {totalPages}
                    </span>
                    <div>
                        <button
                            type="button"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((page) => page - 1)}
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage((page) => page + 1)}
                        >
                            Next
                        </button>
                    </div>
                </footer>
            )}
        </section>
    );
}
