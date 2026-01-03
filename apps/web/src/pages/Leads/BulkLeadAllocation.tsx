import { useEffect, useState } from 'react';
import {
    Container,
    Row,
    Col,
    Card,
    Form,
    Button,
    Alert,
    Spinner,
    Table,
    Badge,
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus, faUserMinus, faUsers, faChartLine } from '@fortawesome/free-solid-svg-icons';
import { getAgents, type User } from '@/api/users.api';
import { bulkAllocateLeads, bulkUnallocateLeads, getLeads } from '@/api/leads.api';
import { toast } from 'react-toastify';

type AgentWithAllocation = User & {
    currentLeadCount: number;
    allocateCount: number;
    unallocateCount: number;
};

export default function BulkLeadAllocation() {
    const [agents, setAgents] = useState<AgentWithAllocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load agents and their current lead counts
    useEffect(() => {
        loadAgentsWithLeadCounts();
    }, []);

    const loadAgentsWithLeadCounts = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch all agents
            const agentList = await getAgents();

            // Fetch lead counts for each agent
            const agentsWithCounts = await Promise.all(
                agentList.map(async (agent) => {
                    const fullName = `${agent.firstName} ${agent.lastName}`;
                    try {
                        const leadsResponse = await getLeads({
                            allocatedTo: fullName,
                            limit: 1, // We only need the count
                        });
                        return {
                            ...agent,
                            currentLeadCount: leadsResponse.total,
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
    };

    const handleAllocateCountChange = (agentId: string, value: string) => {
        const count = parseInt(value) || 0;
        setAgents((prev) =>
            prev.map((agent) =>
                agent.id === agentId ? { ...agent, allocateCount: Math.max(0, count) } : agent
            )
        );
    };

    const handleUnallocateCountChange = (agentId: string, value: string) => {
        const count = parseInt(value) || 0;
        setAgents((prev) =>
            prev.map((agent) =>
                agent.id === agentId
                    ? {
                          ...agent,
                          unallocateCount: Math.max(0, Math.min(count, agent.currentLeadCount)),
                      }
                    : agent
            )
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
                // Reload to get updated counts
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
                // Reload to get updated counts
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
    const totalPendingAllocations = agents.reduce((sum, agent) => sum + agent.allocateCount, 0);
    const totalPendingUnallocations = agents.reduce((sum, agent) => sum + agent.unallocateCount, 0);

    if (loading) {
        return (
            <Container className="mt-4">
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3 text-muted">Loading agents...</p>
                </div>
            </Container>
        );
    }

    return (
        <Container fluid className="mt-4">
            <Row className="mb-4">
                <Col>
                    <h2>
                        <FontAwesomeIcon icon={faUsers} className="me-2" />
                        Bulk Lead Allocation
                    </h2>
                    <p className="text-muted">
                        Allocate or unallocate leads to agents in bulk. Enter the number of leads
                        next to each agent and click the action button.
                    </p>
                </Col>
            </Row>

            {error && (
                <Alert variant="danger" dismissible onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            <Row className="mb-4">
                <Col md={4}>
                    <Card>
                        <Card.Body>
                            <div className="d-flex align-items-center">
                                <FontAwesomeIcon
                                    icon={faUsers}
                                    className="text-primary me-3"
                                    size="2x"
                                />
                                <div>
                                    <h6 className="mb-0 text-muted">Total Agents</h6>
                                    <h4 className="mb-0">{agents.length}</h4>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card>
                        <Card.Body>
                            <div className="d-flex align-items-center">
                                <FontAwesomeIcon
                                    icon={faChartLine}
                                    className="text-success me-3"
                                    size="2x"
                                />
                                <div>
                                    <h6 className="mb-0 text-muted">Total Allocated Leads</h6>
                                    <h4 className="mb-0">{totalLeads}</h4>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card>
                        <Card.Body>
                            <div className="d-flex align-items-center">
                                <FontAwesomeIcon
                                    icon={faUserPlus}
                                    className="text-info me-3"
                                    size="2x"
                                />
                                <div>
                                    <h6 className="mb-0 text-muted">Pending Changes</h6>
                                    <h4 className="mb-0">
                                        <Badge bg="success" className="me-2">
                                            +{totalPendingAllocations}
                                        </Badge>
                                        <Badge bg="danger">-{totalPendingUnallocations}</Badge>
                                    </h4>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row>
                <Col>
                    <Card>
                        <Card.Header>
                            <h5 className="mb-0">Agents</h5>
                        </Card.Header>
                        <Card.Body className="p-0">
                            <Table responsive hover className="mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>Agent</th>
                                        <th>Email</th>
                                        <th>Employee #</th>
                                        <th className="text-center">Current Leads</th>
                                        <th className="text-center">Allocate</th>
                                        <th className="text-center">Unallocate</th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {agents.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center text-muted py-4">
                                                No agents found
                                            </td>
                                        </tr>
                                    ) : (
                                        agents.map((agent) => (
                                            <tr key={agent.id}>
                                                <td>
                                                    <strong>
                                                        {agent.firstName} {agent.lastName}
                                                    </strong>
                                                </td>
                                                <td>{agent.email}</td>
                                                <td>
                                                    <Badge bg="secondary">
                                                        {agent.employeeNumber || 'N/A'}
                                                    </Badge>
                                                </td>
                                                <td className="text-center">
                                                    <Badge bg="info" pill>
                                                        {agent.currentLeadCount}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    <Form.Control
                                                        type="number"
                                                        min="0"
                                                        value={agent.allocateCount || ''}
                                                        onChange={(e) =>
                                                            handleAllocateCountChange(
                                                                agent.id,
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder="0"
                                                        disabled={processing}
                                                        style={{ width: '100px' }}
                                                    />
                                                </td>
                                                <td>
                                                    <Form.Control
                                                        type="number"
                                                        min="0"
                                                        max={agent.currentLeadCount}
                                                        value={agent.unallocateCount || ''}
                                                        onChange={(e) =>
                                                            handleUnallocateCountChange(
                                                                agent.id,
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder="0"
                                                        disabled={processing}
                                                        style={{ width: '100px' }}
                                                    />
                                                </td>
                                                <td className="text-center">
                                                    <Button
                                                        variant="success"
                                                        size="sm"
                                                        className="me-2"
                                                        onClick={() => handleAllocate(agent)}
                                                        disabled={
                                                            processing || agent.allocateCount <= 0
                                                        }
                                                    >
                                                        <FontAwesomeIcon
                                                            icon={faUserPlus}
                                                            className="me-1"
                                                        />
                                                        Allocate
                                                    </Button>
                                                    <Button
                                                        variant="danger"
                                                        size="sm"
                                                        onClick={() => handleUnallocate(agent)}
                                                        disabled={
                                                            processing ||
                                                            agent.unallocateCount <= 0 ||
                                                            agent.currentLeadCount === 0
                                                        }
                                                    >
                                                        <FontAwesomeIcon
                                                            icon={faUserMinus}
                                                            className="me-1"
                                                        />
                                                        Unallocate
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row className="mt-3">
                <Col>
                    <Alert variant="info">
                        <strong>How it works:</strong>
                        <ul className="mb-0 mt-2">
                            <li>
                                <strong>Allocate:</strong> Enter a number and click "Allocate" to
                                automatically assign that many unallocated leads to the agent
                                (oldest leads first).
                            </li>
                            <li>
                                <strong>Unallocate:</strong> Enter a number and click "Unallocate"
                                to remove that many leads from the agent (oldest leads first).
                            </li>
                            <li>
                                Changes are applied immediately and the page will refresh to show
                                updated counts.
                            </li>
                        </ul>
                    </Alert>
                </Col>
            </Row>
        </Container>
    );
}
