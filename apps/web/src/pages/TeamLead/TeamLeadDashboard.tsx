import { useState } from 'react';
import { Card, Table, Form } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { getTeamLeadAgents, updateAgentLeaveStatus } from '@/api/users';
import type { AgentStats } from '@/api/users';
import { useAuthStore } from '@/stores/auth.store';

export default function TeamLeadDashboard() {
    const { session } = useAuthStore();
    const queryClient = useQueryClient();
    const [updatingAgent, setUpdatingAgent] = useState<string | null>(null);

    // Check permission
    if (!session || session.user?.role !== 'team_leader') {
        return (
            <div className="container mt-4">
                <Card>
                    <Card.Body>
                        <h4>Access Denied</h4>
                        <p>You do not have permission to view this page.</p>
                    </Card.Body>
                </Card>
            </div>
        );
    }

    // Fetch agents
    const {
        data: agents = [],
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ['teamLeadAgents'],
        queryFn: getTeamLeadAgents,
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    // Mutation to update leave status
    const leaveStatusMutation = useMutation({
        mutationFn: ({ agentId, isOnLeave }: { agentId: string; isOnLeave: boolean }) =>
            updateAgentLeaveStatus(agentId, isOnLeave),
        onMutate: ({ agentId }) => {
            setUpdatingAgent(agentId);
        },
        onSuccess: (_, variables) => {
            toast.success(
                `Agent leave status updated to ${variables.isOnLeave ? 'On Leave' : 'Active'}`
            );
            queryClient.invalidateQueries({ queryKey: ['teamLeadAgents'] });
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to update agent leave status');
        },
        onSettled: () => {
            setUpdatingAgent(null);
        },
    });

    const handleLeaveToggle = (agent: AgentStats, isOnLeave: boolean) => {
        leaveStatusMutation.mutate({ agentId: agent.id, isOnLeave });
    };

    if (isLoading) {
        return (
            <div className="container mt-4">
                <Card>
                    <Card.Body>
                        <p>Loading agents...</p>
                    </Card.Body>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mt-4">
                <Card>
                    <Card.Body>
                        <h4 className="text-danger">Error</h4>
                        <p>{(error as Error).message}</p>
                        <button className="btn btn-primary" onClick={() => refetch()}>
                            Retry
                        </button>
                    </Card.Body>
                </Card>
            </div>
        );
    }

    return (
        <div className="container-fluid mt-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Team Management Dashboard</h2>
                <button className="btn btn-outline-primary" onClick={() => refetch()}>
                    <i className="bi bi-arrow-clockwise me-2"></i>
                    Refresh
                </button>
            </div>

            <Card>
                <Card.Header>
                    <h5 className="mb-0">My Team Agents</h5>
                </Card.Header>
                <Card.Body>
                    {agents.length === 0 ? (
                        <p className="text-muted">No agents assigned to your team yet.</p>
                    ) : (
                        <div className="table-responsive">
                            <Table striped bordered hover>
                                <thead>
                                    <tr>
                                        <th>Agent Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th className="text-center">Total Leads</th>
                                        <th className="text-center">Hot Leads</th>
                                        <th className="text-center">Busy</th>
                                        <th className="text-center">Call Later</th>
                                        <th className="text-center">Converted Clients</th>
                                        <th className="text-center">Conversion Rate</th>
                                        <th className="text-center">On Leave</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {agents.map((agent) => (
                                        <tr key={agent.id}>
                                            <td>
                                                {agent.firstName} {agent.lastName}
                                            </td>
                                            <td>{agent.email}</td>
                                            <td>
                                                <span className="badge bg-info">
                                                    {agent.role.replace(/_/g, ' ').toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="text-center">{agent.totalLeads}</td>
                                            <td className="text-center">{agent.hotLeads}</td>
                                            <td className="text-center">{agent.busyLeads}</td>
                                            <td className="text-center">{agent.callLaterLeads}</td>
                                            <td className="text-center">
                                                {agent.convertedClients}
                                            </td>
                                            <td className="text-center">
                                                <span
                                                    className={`badge ${agent.conversionRate >= 20 ? 'bg-success' : agent.conversionRate >= 10 ? 'bg-warning' : 'bg-secondary'}`}
                                                >
                                                    {agent.conversionRate.toFixed(2)}%
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <Form.Check
                                                    type="switch"
                                                    id={`leave-switch-${agent.id}`}
                                                    checked={agent.isOnLeave}
                                                    onChange={(e) =>
                                                        handleLeaveToggle(agent, e.target.checked)
                                                    }
                                                    disabled={updatingAgent === agent.id}
                                                    label={agent.isOnLeave ? 'Yes' : 'No'}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </Card.Body>
            </Card>

            {agents.length > 0 && (
                <Card className="mt-4">
                    <Card.Header>
                        <h5 className="mb-0">Team Summary</h5>
                    </Card.Header>
                    <Card.Body>
                        <div className="row">
                            <div className="col-md-3">
                                <div className="text-center">
                                    <h3 className="text-primary">{agents.length}</h3>
                                    <p className="text-muted mb-0">Total Agents</p>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="text-center">
                                    <h3 className="text-success">
                                        {agents.filter((a) => !a.isOnLeave).length}
                                    </h3>
                                    <p className="text-muted mb-0">Active Agents</p>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="text-center">
                                    <h3 className="text-warning">
                                        {agents.filter((a) => a.isOnLeave).length}
                                    </h3>
                                    <p className="text-muted mb-0">On Leave</p>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="text-center">
                                    <h3 className="text-info">
                                        {agents.reduce((sum, a) => sum + a.totalLeads, 0)}
                                    </h3>
                                    <p className="text-muted mb-0">Total Team Leads</p>
                                </div>
                            </div>
                        </div>
                    </Card.Body>
                </Card>
            )}
        </div>
    );
}
