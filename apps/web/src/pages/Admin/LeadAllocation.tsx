import { useEffect, useState } from 'react';
import { Container, Row, Col, Form, Button, Badge, Table, Spinner, Modal } from 'react-bootstrap';
import { getLeads, updateLead, type Lead } from '@/api/leads.api';
import { listUsers, type UserDto } from '@/api/users';
import { createTask } from '@/api/tasks.api';
import { format } from 'date-fns';
import { formatPhoneNumber } from '@/api/leads.api';
import { showToast } from '@/utils/toast';

export default function LeadAllocation() {
    // State
    const [leads, setLeads] = useState<Lead[]>([]);
    const [agents, setAgents] = useState<UserDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [outcomeFilter, setOutcomeFilter] = useState('all');
    const [allocationFilter, setAllocationFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalLeads, setTotalLeads] = useState(0);

    // Assignment modal
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [selectedAgentId, setSelectedAgentId] = useState(''); // Store agent ID
    const [assigning, setAssigning] = useState(false);

    // Fetch agents on mount
    useEffect(() => {
        const fetchAgents = async () => {
            try {
                const response = await listUsers({
                    role: 'agent',
                    status: 'active',
                    all: true,
                });
                setAgents(response.users);
            } catch (err: any) {
                console.error('Failed to fetch agents:', err);
                showToast.error('Failed to fetch agent list. Please refresh the page.');
            }
        };

        fetchAgents();
    }, []);

    // Fetch leads
    useEffect(() => {
        const fetchLeads = async () => {
            setLoading(true);
            setError(null);

            try {
                const query: any = {
                    page: currentPage,
                    limit: 20,
                    search: searchQuery.trim() || undefined,
                    leadOutcome: outcomeFilter !== 'all' ? outcomeFilter : undefined,
                    allocatedTo:
                        allocationFilter === 'unassigned'
                            ? null
                            : allocationFilter !== 'all'
                              ? allocationFilter
                              : undefined,
                    sortBy: 'timeReceived',
                    sortOrder: 'DESC',
                };

                const response = await getLeads(query);
                setLeads(response.leads);
                setTotalLeads(response.total);
                setTotalPages(response.totalPages);
                setError(null); // Clear any previous errors
            } catch (err: any) {
                // Extract user-friendly error message
                let errorMsg = 'Failed to fetch leads';
                if (err.response?.data?.message) {
                    errorMsg = Array.isArray(err.response.data.message)
                        ? err.response.data.message.join(', ')
                        : err.response.data.message;
                } else if (err.message) {
                    errorMsg = err.message;
                }

                setError(errorMsg);
                showToast.error(errorMsg);
            } finally {
                setLoading(false);
            }
        };

        fetchLeads();
    }, [currentPage, searchQuery, outcomeFilter, allocationFilter]);

    // Get unique outcomes
    const uniqueOutcomes = Array.from(new Set(leads.map((l) => l.leadOutcome).filter(Boolean)));

    // Handle assign click
    const handleAssignClick = (lead: Lead) => {
        setSelectedLead(lead);
        // Try to find the agent ID from the allocatedTo name
        const currentAgent = agents.find(
            (a) => `${a.firstName} ${a.lastName}` === lead.allocatedTo
        );
        setSelectedAgentId(currentAgent?.id || '');
        setShowAssignModal(true);
    };

    // Handle assignment
    const handleAssign = async () => {
        if (!selectedLead) return;

        setAssigning(true);
        try {
            // Find the selected agent to get their full name
            const selectedAgent = agents.find((a) => a.id === selectedAgentId);
            const agentFullName = selectedAgent
                ? `${selectedAgent.firstName} ${selectedAgent.lastName}`
                : null;

            // Update lead with agent name (for backward compatibility)
            await updateLead(selectedLead.id, {
                allocatedTo: agentFullName,
            });

            // If assigning (not unassigning), create a task for the agent
            if (selectedAgentId && selectedAgent) {
                await createTask({
                    title: `Convert Lead: ${selectedLead.name || 'Unknown'}`,
                    description: `Follow up with lead and convert to client.\n\nLead Information:\n- Name: ${selectedLead.name || 'N/A'}\n- Phone: ${selectedLead.cell || 'N/A'}\n- ID Number: ${selectedLead.idNumber || 'N/A'}\n- Franchise: ${selectedLead.franchise || 'N/A'}\n- Affiliate: ${selectedLead.affiliate || 'N/A'}`,
                    type: 'follow_up',
                    status: 'assigned',
                    priority: 'normal',
                    assignedToUserId: selectedAgentId,
                    metadata: {
                        leadId: selectedLead.id,
                        leadData: {
                            name: selectedLead.name,
                            cell: selectedLead.cell,
                            idNumber: selectedLead.idNumber,
                            franchise: selectedLead.franchise,
                            affiliate: selectedLead.affiliate,
                            message: selectedLead.message,
                        },
                    },
                });
            }

            // Update local state
            setLeads((prev) =>
                prev.map((l) =>
                    l.id === selectedLead.id ? { ...l, allocatedTo: agentFullName } : l
                )
            );

            // Show success message
            if (selectedAgentId && selectedAgent) {
                showToast.success(
                    `Lead successfully assigned to ${selectedAgent.firstName} ${selectedAgent.lastName}`
                );
            } else {
                showToast.success('Lead unassigned successfully');
            }

            setShowAssignModal(false);
            setSelectedLead(null);
            setSelectedAgentId('');
        } catch (err: any) {
            // Extract user-friendly error message
            let errorMessage = 'Failed to assign lead';

            if (err.response?.data?.message) {
                // API returned structured error
                errorMessage = Array.isArray(err.response.data.message)
                    ? err.response.data.message.join(', ')
                    : err.response.data.message;
            } else if (err.message) {
                // Generic error message
                errorMessage = err.message;
            }

            showToast.error(errorMessage);
            console.error('Lead assignment error:', err);
        } finally {
            setAssigning(false);
        }
    };

    // Stats
    const stats = {
        total: totalLeads,
        unassigned: leads.filter((l) => !l.allocatedTo).length,
        assigned: leads.filter((l) => l.allocatedTo).length,
        pending: leads.filter((l) => l.leadOutcome === 'Pending' || !l.leadOutcome).length,
    };

    return (
        <Container fluid className="py-4">
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
                        <h2 className="mb-1">Lead Allocation</h2>
                        <p className="mb-0 opacity-75">Assign leads to agents for follow-up</p>
                    </div>
                    <div className="d-flex gap-3">
                        <div className="text-center">
                            <div className="fs-4 fw-bold">{stats.total}</div>
                            <div className="small opacity-75">Total Leads</div>
                        </div>
                        <div className="text-center">
                            <div className="fs-4 fw-bold">{stats.unassigned}</div>
                            <div className="small opacity-75">Unassigned</div>
                        </div>
                        <div className="text-center">
                            <div className="fs-4 fw-bold">{stats.assigned}</div>
                            <div className="small opacity-75">Assigned</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <Row className="mb-4">
                <Col md={4}>
                    <Form.Group>
                        <Form.Label>
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ marginRight: '8px' }}
                            >
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                            </svg>
                            Search
                        </Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Search by name, phone, or ID number..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </Form.Group>
                </Col>
                <Col md={3}>
                    <Form.Group>
                        <Form.Label>
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ marginRight: '8px' }}
                            >
                                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                            </svg>
                            Status
                        </Form.Label>
                        <Form.Select
                            value={outcomeFilter}
                            onChange={(e) => {
                                setOutcomeFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                        >
                            <option value="all">All Outcomes</option>
                            {uniqueOutcomes.map((outcome) => (
                                <option key={outcome} value={outcome || ''}>
                                    {outcome || 'Pending'}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col md={3}>
                    <Form.Group>
                        <Form.Label>
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ marginRight: '8px' }}
                            >
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="8.5" cy="7" r="4" />
                                <line x1="20" y1="8" x2="20" y2="14" />
                                <line x1="23" y1="11" x2="17" y2="11" />
                            </svg>
                            Assignment
                        </Form.Label>
                        <Form.Select
                            value={allocationFilter}
                            onChange={(e) => {
                                setAllocationFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                        >
                            <option value="all">All Leads</option>
                            <option value="unassigned">Unassigned Only</option>
                            {agents.map((agent) => (
                                <option
                                    key={agent.id}
                                    value={`${agent.firstName} ${agent.lastName}`}
                                >
                                    {agent.firstName} {agent.lastName}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col md={2} className="d-flex align-items-end">
                    <Button
                        variant="outline-secondary"
                        className="w-100"
                        onClick={() => {
                            setSearchQuery('');
                            setOutcomeFilter('all');
                            setAllocationFilter('all');
                            setCurrentPage(1);
                        }}
                    >
                        Clear Filters
                    </Button>
                </Col>
            </Row>

            {/* Error Alert */}
            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}

            {/* Loading Spinner */}
            {loading && (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-2 text-muted">Loading leads...</p>
                </div>
            )}

            {/* Leads Table */}
            {!loading && leads.length === 0 ? (
                <div className="text-center py-5">
                    <svg
                        width="64"
                        height="64"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mx-auto mb-3 text-muted"
                    >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="8.5" cy="7" r="4" />
                        <line x1="20" y1="8" x2="20" y2="14" />
                        <line x1="23" y1="11" x2="17" y2="11" />
                    </svg>
                    <h5 className="text-muted">No leads found</h5>
                    <p className="text-muted">Try adjusting your filters or search query.</p>
                </div>
            ) : (
                !loading && (
                    <div
                        className="card border-0"
                        style={{ borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                    >
                        <Table responsive hover className="mb-0">
                            <thead style={{ backgroundColor: '#f8f9fa' }}>
                                <tr>
                                    <th>Time Received</th>
                                    <th>Name</th>
                                    <th>Contact</th>
                                    <th>Franchise</th>
                                    <th>Affiliate</th>
                                    <th>Status</th>
                                    <th>Assigned To</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leads.map((lead) => (
                                    <tr key={lead.id}>
                                        <td className="text-nowrap">
                                            {format(
                                                new Date(lead.timeReceived),
                                                'yyyy-MM-dd HH:mm'
                                            )}
                                        </td>
                                        <td>
                                            <div className="fw-medium">{lead.name || 'N/A'}</div>
                                            {lead.idNumber && (
                                                <div className="small text-muted">
                                                    ID: {lead.idNumber}
                                                </div>
                                            )}
                                        </td>
                                        <td className="text-nowrap">
                                            <div>
                                                <svg
                                                    width="14"
                                                    height="14"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    style={{ marginRight: '4px' }}
                                                >
                                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                                </svg>
                                                {formatPhoneNumber(lead.cell)}
                                            </div>
                                        </td>
                                        <td>
                                            <Badge bg="secondary">{lead.franchise || 'N/A'}</Badge>
                                        </td>
                                        <td>{lead.affiliate || 'N/A'}</td>
                                        <td>
                                            <Badge
                                                bg={
                                                    lead.leadOutcome === 'Converted'
                                                        ? 'success'
                                                        : lead.leadOutcome === 'Pending' ||
                                                            !lead.leadOutcome
                                                          ? 'warning'
                                                          : 'secondary'
                                                }
                                            >
                                                {lead.leadOutcome || 'Pending'}
                                            </Badge>
                                        </td>
                                        <td>
                                            {lead.allocatedTo ? (
                                                <Badge bg="info">{lead.allocatedTo}</Badge>
                                            ) : (
                                                <span className="text-muted">Unassigned</span>
                                            )}
                                        </td>
                                        <td>
                                            <Button
                                                variant="outline-primary"
                                                size="sm"
                                                onClick={() => handleAssignClick(lead)}
                                            >
                                                <svg
                                                    width="14"
                                                    height="14"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    style={{ marginRight: '4px' }}
                                                >
                                                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                                    <circle cx="8.5" cy="7" r="4" />
                                                    <line x1="20" y1="8" x2="20" y2="14" />
                                                    <line x1="23" y1="11" x2="17" y2="11" />
                                                </svg>
                                                {lead.allocatedTo ? 'Reassign' : 'Assign'}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                )
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-4">
                    <div className="text-muted">
                        Showing page {currentPage} of {totalPages} ({totalLeads} total leads)
                    </div>
                    <div className="d-flex gap-2">
                        <Button
                            variant="outline-secondary"
                            size="sm"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline-secondary"
                            size="sm"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}

            {/* Assignment Modal */}
            <Modal show={showAssignModal} onHide={() => setShowAssignModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Assign Lead</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedLead && (
                        <>
                            <div className="mb-3">
                                <strong>Lead Information:</strong>
                                <div className="mt-2">
                                    <div>
                                        <strong>Name:</strong> {selectedLead.name || 'N/A'}
                                    </div>
                                    <div>
                                        <strong>Phone:</strong>{' '}
                                        {formatPhoneNumber(selectedLead.cell)}
                                    </div>
                                    {selectedLead.idNumber && (
                                        <div>
                                            <strong>ID:</strong> {selectedLead.idNumber}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Form.Group>
                                <Form.Label>Assign to Agent</Form.Label>
                                <Form.Select
                                    value={selectedAgentId}
                                    onChange={(e) => setSelectedAgentId(e.target.value)}
                                >
                                    <option value="">-- Unassign --</option>
                                    {agents.map((agent) => (
                                        <option key={agent.id} value={agent.id}>
                                            {agent.firstName} {agent.lastName} ({agent.email})
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAssignModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleAssign} disabled={assigning}>
                        {assigning ? (
                            <>
                                <Spinner size="sm" animation="border" className="me-2" />
                                Assigning...
                            </>
                        ) : (
                            'Assign Lead'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}
