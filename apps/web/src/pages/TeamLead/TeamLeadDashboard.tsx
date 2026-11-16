import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { getTeamLeadAgents, updateAgentLeaveStatus } from '@/api/users';
import type { AgentStats } from '@/api/users';
import { useAuthStore } from '@/stores/auth.store';
import './TeamLeadDashboard.css';

const roleLabel = (role: AgentStats['role']) =>
    role
        .split('_')
        .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
        .join(' ');

const rateTone = (rate: number) => {
    if (rate >= 20) return 'strong';
    if (rate >= 10) return 'steady';
    return 'starting';
};

export default function TeamLeadDashboard() {
    const session = useAuthStore((state) => state.session);
    const queryClient = useQueryClient();
    const [updatingAgent, setUpdatingAgent] = useState<string | null>(null);
    const isTeamLeader = session?.user?.role === 'team_leader';
    const agentsQuery = useQuery({
        queryKey: ['teamLeadAgents'],
        queryFn: getTeamLeadAgents,
        enabled: isTeamLeader,
        refetchInterval: 30000,
    });
    const agents = useMemo(() => agentsQuery.data ?? [], [agentsQuery.data]);

    const leaveStatusMutation = useMutation({
        mutationFn: ({ agentId, isOnLeave }: { agentId: string; isOnLeave: boolean }) =>
            updateAgentLeaveStatus(agentId, isOnLeave),
        onMutate: ({ agentId }) => setUpdatingAgent(agentId),
        onSuccess: (_, variables) => {
            queryClient.setQueryData<AgentStats[]>(['teamLeadAgents'], (current = []) =>
                current.map((agent) =>
                    agent.id === variables.agentId
                        ? { ...agent, isOnLeave: variables.isOnLeave }
                        : agent
                )
            );
            toast.success(`Agent status changed to ${variables.isOnLeave ? 'On leave' : 'Active'}`);
        },
        onError: (error: unknown) => {
            toast.error(error instanceof Error ? error.message : 'Failed to update agent status');
        },
        onSettled: () => setUpdatingAgent(null),
    });

    const summary = useMemo(
        () => ({
            total: agents.length,
            active: agents.filter((agent) => !agent.isOnLeave).length,
            onLeave: agents.filter((agent) => agent.isOnLeave).length,
            leads: agents.reduce((total, agent) => total + agent.totalLeads, 0),
        }),
        [agents]
    );

    if (!isTeamLeader) {
        return (
            <main className="team-dashboard team-dashboard-state">
                <div role="alert">
                    <strong>Access denied</strong>
                    <span>This workspace is available to team leaders only.</span>
                </div>
            </main>
        );
    }

    return (
        <main className="team-dashboard">
            <header className="team-dashboard-header">
                <div>
                    <p>Team management</p>
                    <h1>Team workspace</h1>
                    <span>Monitor agent workload, outcomes and availability.</span>
                </div>
                <button
                    type="button"
                    onClick={() => void agentsQuery.refetch()}
                    disabled={agentsQuery.isFetching}
                >
                    {agentsQuery.isFetching ? 'Refreshing...' : 'Refresh'}
                </button>
            </header>

            <section className="team-dashboard-summary" aria-label="Team summary">
                <SummaryItem
                    className="agents"
                    label="Team agents"
                    value={summary.total}
                    note="Assigned to your team"
                />
                <SummaryItem
                    className="active"
                    label="Active"
                    value={summary.active}
                    note="Available for work"
                />
                <SummaryItem
                    className="leave"
                    label="On leave"
                    value={summary.onLeave}
                    note="Temporarily unavailable"
                />
                <SummaryItem
                    className="leads"
                    label="Assigned leads"
                    value={summary.leads}
                    note="Across the team"
                />
            </section>

            {agentsQuery.isLoading ? (
                <section className="team-dashboard-state" aria-busy="true">
                    <span className="team-dashboard-spinner" aria-hidden="true" />
                    <strong>Loading team performance</strong>
                    <span>Retrieving your assigned agents.</span>
                </section>
            ) : agentsQuery.isError ? (
                <section className="team-dashboard-state team-dashboard-state--error" role="alert">
                    <strong>Unable to load your team</strong>
                    <span>
                        {agentsQuery.error instanceof Error
                            ? agentsQuery.error.message
                            : 'Please try again.'}
                    </span>
                    <button type="button" onClick={() => void agentsQuery.refetch()}>
                        Retry
                    </button>
                </section>
            ) : agents.length === 0 ? (
                <section className="team-dashboard-state">
                    <strong>No agents assigned</strong>
                    <span>Agents linked to your team will appear here.</span>
                </section>
            ) : (
                <section className="team-dashboard-panel" aria-labelledby="team-agents-title">
                    <header>
                        <div>
                            <h2 id="team-agents-title">Agent performance</h2>
                            <p>Live workload and lead outcomes for your team.</p>
                        </div>
                        <span>{agents.length} agents</span>
                    </header>
                    <div className="team-dashboard-table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Agent</th>
                                    <th>Role</th>
                                    <th>Assigned</th>
                                    <th>Hot</th>
                                    <th>Busy</th>
                                    <th>Call later</th>
                                    <th>Converted</th>
                                    <th>Conversion</th>
                                    <th>Availability</th>
                                </tr>
                            </thead>
                            <tbody>
                                {agents.map((agent) => (
                                    <AgentRow
                                        key={agent.id}
                                        agent={agent}
                                        updating={updatingAgent === agent.id}
                                        onLeaveChange={(isOnLeave) =>
                                            leaveStatusMutation.mutate({
                                                agentId: agent.id,
                                                isOnLeave,
                                            })
                                        }
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="team-dashboard-mobile-list">
                        {agents.map((agent) => (
                            <AgentCard
                                key={agent.id}
                                agent={agent}
                                updating={updatingAgent === agent.id}
                                onLeaveChange={(isOnLeave) =>
                                    leaveStatusMutation.mutate({ agentId: agent.id, isOnLeave })
                                }
                            />
                        ))}
                    </div>
                </section>
            )}
        </main>
    );
}

function SummaryItem({
    className,
    label,
    value,
    note,
}: {
    className: string;
    label: string;
    value: number;
    note: string;
}) {
    return (
        <div className={`team-dashboard-summary__${className}`}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{note}</small>
        </div>
    );
}

function AgentRow({
    agent,
    updating,
    onLeaveChange,
}: {
    agent: AgentStats;
    updating: boolean;
    onLeaveChange: (value: boolean) => void;
}) {
    return (
        <tr>
            <td>
                <strong>
                    {agent.firstName} {agent.lastName}
                </strong>
                <span>{agent.email}</span>
            </td>
            <td>
                <span className="team-dashboard-role">{roleLabel(agent.role)}</span>
            </td>
            <td>{agent.totalLeads}</td>
            <td>{agent.hotLeads}</td>
            <td>{agent.busyLeads}</td>
            <td>{agent.callLaterLeads}</td>
            <td>{agent.convertedClients}</td>
            <td>
                <span
                    className={`team-dashboard-rate team-dashboard-rate--${rateTone(agent.conversionRate)}`}
                >
                    {agent.conversionRate.toFixed(1)}%
                </span>
            </td>
            <td>
                <LeaveControl agent={agent} updating={updating} onChange={onLeaveChange} />
            </td>
        </tr>
    );
}

function AgentCard({
    agent,
    updating,
    onLeaveChange,
}: {
    agent: AgentStats;
    updating: boolean;
    onLeaveChange: (value: boolean) => void;
}) {
    const stats = [
        ['Assigned', agent.totalLeads],
        ['Hot', agent.hotLeads],
        ['Busy', agent.busyLeads],
        ['Call later', agent.callLaterLeads],
        ['Converted', agent.convertedClients],
        ['Conversion', `${agent.conversionRate.toFixed(1)}%`],
    ];
    return (
        <article>
            <header>
                <div>
                    <strong>
                        {agent.firstName} {agent.lastName}
                    </strong>
                    <span>{agent.email}</span>
                </div>
                <span className="team-dashboard-role">{roleLabel(agent.role)}</span>
            </header>
            <dl>
                {stats.map(([label, value]) => (
                    <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                    </div>
                ))}
            </dl>
            <footer>
                <span>Availability</span>
                <LeaveControl agent={agent} updating={updating} onChange={onLeaveChange} />
            </footer>
        </article>
    );
}

function LeaveControl({
    agent,
    updating,
    onChange,
}: {
    agent: AgentStats;
    updating: boolean;
    onChange: (value: boolean) => void;
}) {
    return (
        <label className="team-dashboard-leave">
            <input
                type="checkbox"
                role="switch"
                aria-label={`${agent.firstName} ${agent.lastName} leave status`}
                checked={agent.isOnLeave}
                disabled={updating}
                onChange={(event) => onChange(event.target.checked)}
            />
            <span aria-hidden="true" />
            <strong>{updating ? 'Updating' : agent.isOnLeave ? 'On leave' : 'Active'}</strong>
        </label>
    );
}
