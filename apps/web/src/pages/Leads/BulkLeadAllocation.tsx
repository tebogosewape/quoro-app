import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { getAgents, type User } from '@/api/users.api';
import { bulkAllocateLeads, bulkUnallocateLeads, getLeads } from '@/api/leads.api';
import './BulkLeadAllocation.css';

type AgentWithAllocation = User & {
    currentLeadCount: number;
    allocateCount: number;
    unallocateCount: number;
};

type AllocationControlsProps = {
    agent: AgentWithAllocation;
    processing: boolean;
    onAllocateChange: (agentId: string, value: string) => void;
    onUnallocateChange: (agentId: string, value: string) => void;
    onAllocate: (agent: AgentWithAllocation) => void;
    onUnallocate: (agent: AgentWithAllocation) => void;
    compact?: boolean;
};

function AllocationControls({
    agent,
    processing,
    onAllocateChange,
    onUnallocateChange,
    onAllocate,
    onUnallocate,
    compact = false,
}: AllocationControlsProps) {
    return (
        <div
            className={
                compact
                    ? 'bulk-allocation-controls bulk-allocation-controls--mobile'
                    : 'bulk-allocation-controls'
            }
        >
            <div className="bulk-allocation-control">
                {compact && <label htmlFor={`allocate-mobile-${agent.id}`}>Allocate</label>}
                <input
                    id={compact ? `allocate-mobile-${agent.id}` : `allocate-${agent.id}`}
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={agent.allocateCount || ''}
                    onChange={(event) => onAllocateChange(agent.id, event.target.value)}
                    placeholder="0"
                    aria-label={`Leads to allocate to ${agent.firstName} ${agent.lastName}`}
                    disabled={processing}
                />
                <button
                    type="button"
                    className="bulk-allocation-button bulk-allocation-button--allocate"
                    onClick={() => onAllocate(agent)}
                    disabled={processing || agent.allocateCount <= 0}
                >
                    Allocate
                </button>
            </div>
            <div className="bulk-allocation-control">
                {compact && <label htmlFor={`unallocate-mobile-${agent.id}`}>Unallocate</label>}
                <input
                    id={compact ? `unallocate-mobile-${agent.id}` : `unallocate-${agent.id}`}
                    type="number"
                    min="0"
                    max={agent.currentLeadCount}
                    inputMode="numeric"
                    value={agent.unallocateCount || ''}
                    onChange={(event) => onUnallocateChange(agent.id, event.target.value)}
                    placeholder="0"
                    aria-label={`Leads to unallocate from ${agent.firstName} ${agent.lastName}`}
                    disabled={processing || agent.currentLeadCount === 0}
                />
                <button
                    type="button"
                    className="bulk-allocation-button bulk-allocation-button--unallocate"
                    onClick={() => onUnallocate(agent)}
                    disabled={
                        processing || agent.unallocateCount <= 0 || agent.currentLeadCount === 0
                    }
                >
                    Unallocate
                </button>
            </div>
        </div>
    );
}

export default function BulkLeadAllocation() {
    const [agents, setAgents] = useState<AgentWithAllocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadAgentsWithLeadCounts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const agentList = await getAgents();
            const agentsWithCounts = await Promise.all(
                agentList.map(async (agent) => {
                    const fullName = `${agent.firstName} ${agent.lastName}`;
                    try {
                        const response = await getLeads({ allocatedTo: fullName, limit: 1 });
                        return {
                            ...agent,
                            currentLeadCount: response.total,
                            allocateCount: 0,
                            unallocateCount: 0,
                        };
                    } catch (err) {
                        console.error(`Failed to get lead count for ${fullName}:`, err);
                        return {
                            ...agent,
                            currentLeadCount: 0,
                            allocateCount: 0,
                            unallocateCount: 0,
                        };
                    }
                })
            );
            setAgents(agentsWithCounts);
        } catch (err) {
            console.error('Failed to load agents:', err);
            setError('Failed to load agents. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadAgentsWithLeadCounts();
    }, [loadAgentsWithLeadCounts]);

    const handleAllocateCountChange = (agentId: string, value: string) => {
        const count = Number.parseInt(value, 10) || 0;
        setAgents((current) =>
            current.map((agent) =>
                agent.id === agentId ? { ...agent, allocateCount: Math.max(0, count) } : agent
            )
        );
    };

    const handleUnallocateCountChange = (agentId: string, value: string) => {
        const count = Number.parseInt(value, 10) || 0;
        setAgents((current) =>
            current.map((agent) => {
                if (agent.id !== agentId) return agent;
                return {
                    ...agent,
                    unallocateCount: Math.max(0, Math.min(count, agent.currentLeadCount)),
                };
            })
        );
    };

    const handleAllocate = async (agent: AgentWithAllocation) => {
        if (agent.allocateCount <= 0) {
            toast.warn('Please enter a number greater than 0');
            return;
        }
        try {
            setProcessing(true);
            const fullName = `${agent.firstName} ${agent.lastName}`;
            const result = await bulkAllocateLeads(agent.id, fullName, agent.allocateCount);
            if (result.success) {
                toast.success(`Successfully allocated ${result.allocated} leads to ${fullName}`);
                await loadAgentsWithLeadCounts();
            }
        } catch (err) {
            console.error('Allocation failed:', err);
            toast.error('Failed to allocate leads. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    const handleUnallocate = async (agent: AgentWithAllocation) => {
        if (agent.unallocateCount <= 0) {
            toast.warn('Please enter a number greater than 0');
            return;
        }
        if (agent.unallocateCount > agent.currentLeadCount) {
            toast.warn(`Cannot unallocate more than ${agent.currentLeadCount} leads`);
            return;
        }
        try {
            setProcessing(true);
            const fullName = `${agent.firstName} ${agent.lastName}`;
            const result = await bulkUnallocateLeads(agent.id, fullName, agent.unallocateCount);
            if (result.success) {
                toast.success(
                    `Successfully unallocated ${result.unallocated} leads from ${fullName}`
                );
                await loadAgentsWithLeadCounts();
            }
        } catch (err) {
            console.error('Unallocation failed:', err);
            toast.error('Failed to unallocate leads. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    const totalLeads = agents.reduce((sum, agent) => sum + agent.currentLeadCount, 0);
    const pendingAllocations = agents.reduce((sum, agent) => sum + agent.allocateCount, 0);
    const pendingUnallocations = agents.reduce((sum, agent) => sum + agent.unallocateCount, 0);

    if (loading) {
        return (
            <main className="bulk-allocation bulk-allocation--loading" aria-busy="true">
                <span className="bulk-allocation-spinner" aria-hidden="true" />
                <strong>Loading agent allocations</strong>
                <span>Retrieving current lead counts…</span>
            </main>
        );
    }

    return (
        <main className="bulk-allocation">
            <header className="bulk-allocation-header">
                <div>
                    <p className="bulk-allocation-eyebrow">Lead management</p>
                    <h1>Bulk lead allocation</h1>
                    <p>Assign available leads or return allocated leads to the unassigned queue.</p>
                </div>
                {processing && (
                    <span className="bulk-allocation-processing" role="status">
                        Applying changes…
                    </span>
                )}
            </header>

            {error && (
                <div className="bulk-allocation-alert" role="alert">
                    <div>
                        <strong>Agent allocations could not load</strong>
                        <span>{error}</span>
                    </div>
                    <button type="button" onClick={() => void loadAgentsWithLeadCounts()}>
                        Retry
                    </button>
                </div>
            )}

            <section className="bulk-allocation-summary" aria-label="Allocation summary">
                <div className="bulk-allocation-stat bulk-allocation-stat--agents">
                    <span>Active agents</span>
                    <strong>{agents.length}</strong>
                </div>
                <div className="bulk-allocation-stat bulk-allocation-stat--leads">
                    <span>Allocated leads</span>
                    <strong>{totalLeads}</strong>
                </div>
                <div className="bulk-allocation-stat bulk-allocation-stat--pending">
                    <span>Pending changes</span>
                    <strong>
                        <em>+{pendingAllocations}</em>
                        <i>−{pendingUnallocations}</i>
                    </strong>
                </div>
            </section>

            <section className="bulk-allocation-panel" aria-labelledby="agents-allocation-title">
                <div className="bulk-allocation-panel-heading">
                    <div>
                        <h2 id="agents-allocation-title">Agent allocation</h2>
                        <p>Changes are applied immediately per agent.</p>
                    </div>
                    <span>
                        {agents.length} {agents.length === 1 ? 'agent' : 'agents'}
                    </span>
                </div>

                {agents.length === 0 ? (
                    <div className="bulk-allocation-empty">
                        <strong>No agents found</strong>
                        <span>There are no active agents available for allocation.</span>
                    </div>
                ) : (
                    <>
                        <div className="bulk-allocation-table-wrap">
                            <table className="bulk-allocation-table">
                                <thead>
                                    <tr>
                                        <th>Agent</th>
                                        <th>Employee no.</th>
                                        <th className="numeric">Current leads</th>
                                        <th>Allocate</th>
                                        <th>Unallocate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {agents.map((agent) => (
                                        <tr key={agent.id}>
                                            <td>
                                                <strong>
                                                    {agent.firstName} {agent.lastName}
                                                </strong>
                                                <span>{agent.email}</span>
                                            </td>
                                            <td>
                                                <span className="bulk-allocation-code">
                                                    {agent.employeeNumber || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="numeric">
                                                <span className="bulk-allocation-count">
                                                    {agent.currentLeadCount}
                                                </span>
                                            </td>
                                            <td colSpan={2}>
                                                <AllocationControls
                                                    agent={agent}
                                                    processing={processing}
                                                    onAllocateChange={handleAllocateCountChange}
                                                    onUnallocateChange={handleUnallocateCountChange}
                                                    onAllocate={handleAllocate}
                                                    onUnallocate={handleUnallocate}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="bulk-allocation-mobile-list">
                            {agents.map((agent) => (
                                <article className="bulk-allocation-agent" key={agent.id}>
                                    <div className="bulk-allocation-agent-heading">
                                        <div>
                                            <strong>
                                                {agent.firstName} {agent.lastName}
                                            </strong>
                                            <span>{agent.email}</span>
                                        </div>
                                        <div>
                                            <span>Current</span>
                                            <strong>{agent.currentLeadCount}</strong>
                                        </div>
                                    </div>
                                    <div className="bulk-allocation-agent-meta">
                                        <span>Employee no.</span>
                                        <strong>{agent.employeeNumber || 'N/A'}</strong>
                                    </div>
                                    <AllocationControls
                                        compact
                                        agent={agent}
                                        processing={processing}
                                        onAllocateChange={handleAllocateCountChange}
                                        onUnallocateChange={handleUnallocateCountChange}
                                        onAllocate={handleAllocate}
                                        onUnallocate={handleUnallocate}
                                    />
                                </article>
                            ))}
                        </div>
                    </>
                )}
            </section>

            <aside className="bulk-allocation-help">
                <strong>Allocation rules</strong>
                <span>
                    Allocate uses the oldest unassigned leads first. Unallocate returns the oldest
                    assigned leads to the queue. Counts refresh after every successful change.
                </span>
            </aside>
        </main>
    );
}
