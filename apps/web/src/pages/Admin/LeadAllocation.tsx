import { useEffect, useState } from 'react';
import { Container, Row, Col, Form, Button, Badge, Table, Spinner, Modal } from 'react-bootstrap';
import {
    getLeads,
    updateLead,
    getAllUnassignedLeads,
    getAllAssignedLeads,
    type Lead,
} from '@/api/leads.api';
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

    // Bulk assignment modal
    const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
    const [bulkAgentId, setBulkAgentId] = useState('');
    const [bulkAgentSearch, setBulkAgentSearch] = useState('');
    const [bulkSelectedLeadIds, setBulkSelectedLeadIds] = useState<Set<string>>(new Set());
    const [bulkLeadSearch, setBulkLeadSearch] = useState('');
    const [bulkAssigning, setBulkAssigning] = useState(false);
    const [allUnassignedLeads, setAllUnassignedLeads] = useState<Lead[]>([]);
    const [loadingUnassignedLeads, setLoadingUnassignedLeads] = useState(false);
    const [bulkLeadFranchiseFilter, setBulkLeadFranchiseFilter] = useState('all');
    const [bulkLeadOutcomeFilter, setBulkLeadOutcomeFilter] = useState('all');

    // Bulk unassignment modal
    const [showBulkUnassignModal, setShowBulkUnassignModal] = useState(false);
    const [unassignAgentId, setUnassignAgentId] = useState('');
    const [unassignAgentSearch, setUnassignAgentSearch] = useState('');
    const [unassignSelectedLeadIds, setUnassignSelectedLeadIds] = useState<Set<string>>(new Set());
    const [unassignLeadSearch, setUnassignLeadSearch] = useState('');
    const [bulkUnassigning, setBulkUnassigning] = useState(false);
    const [agentAssignedLeads, setAgentAssignedLeads] = useState<Lead[]>([]);
    const [loadingAgentLeads, setLoadingAgentLeads] = useState(false);

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

    // Fetch all unassigned leads for bulk assignment modal
    const fetchAllUnassignedLeads = async () => {
        setLoadingUnassignedLeads(true);
        try {
            const unassigned = await getAllUnassignedLeads();
            setAllUnassignedLeads(unassigned);
        } catch (err: any) {
            console.error('Failed to fetch unassigned leads:', err);
            showToast.error('Failed to load unassigned leads');
        } finally {
            setLoadingUnassignedLeads(false);
        }
    };

    // Fetch leads assigned to a specific agent
    const fetchAgentLeads = async (agentId: string) => {
        if (!agentId) return;

        setLoadingAgentLeads(true);
        try {
            const allAssigned = await getAllAssignedLeads();
            const selectedAgent = agents.find((a) => a.id === agentId);
            const agentFullName = selectedAgent
                ? `${selectedAgent.firstName} ${selectedAgent.lastName}`
                : '';

            // Filter leads assigned to this specific agent
            const agentLeads = allAssigned.filter((lead) => lead.allocatedTo === agentFullName);
            setAgentAssignedLeads(agentLeads);
        } catch (err: any) {
            console.error('Failed to fetch agent leads:', err);
            showToast.error('Failed to load agent leads');
        } finally {
            setLoadingAgentLeads(false);
        }
    };

    // Open bulk assign modal and fetch all unassigned leads
    const openBulkAssignModal = () => {
        setShowBulkAssignModal(true);
        fetchAllUnassignedLeads();
    };

    // Open bulk unassign modal
    const openBulkUnassignModal = () => {
        setShowBulkUnassignModal(true);
        setUnassignAgentId('');
        setUnassignAgentSearch('');
        setAgentAssignedLeads([]);
        setUnassignSelectedLeadIds(new Set());
        setUnassignLeadSearch('');
    };

    // Get unique outcomes
    const uniqueOutcomes = Array.from(new Set(leads.map((l) => l.leadOutcome).filter(Boolean)));

    // Get unique franchises from all unassigned leads
    const uniqueFranchises = Array.from(
        new Set(allUnassignedLeads.map((l) => l.franchise).filter(Boolean))
    );

    // Get unique outcomes from all unassigned leads
    const uniqueUnassignedOutcomes = Array.from(
        new Set(allUnassignedLeads.map((l) => l.leadOutcome).filter(Boolean))
    );

    // Filtered agents for bulk assign modal
    const filteredAgents = agents.filter((agent) => {
        const searchLower = bulkAgentSearch.toLowerCase();
        const fullName = `${agent.firstName} ${agent.lastName}`.toLowerCase();
        return fullName.includes(searchLower) || agent.email.toLowerCase().includes(searchLower);
    });

    // Filtered agents for bulk unassign modal
    const filteredUnassignAgents = agents.filter((agent) => {
        const searchLower = unassignAgentSearch.toLowerCase();
        const fullName = `${agent.firstName} ${agent.lastName}`.toLowerCase();
        return fullName.includes(searchLower) || agent.email.toLowerCase().includes(searchLower);
    });

    // Filtered unassigned leads for bulk assign modal with search and filters
    const filteredUnassignedLeads = allUnassignedLeads.filter((lead) => {
        // Search filter
        const searchLower = bulkLeadSearch.toLowerCase();
        const matchesSearch =
            !bulkLeadSearch ||
            lead.name?.toLowerCase().includes(searchLower) ||
            lead.cell?.toLowerCase().includes(searchLower) ||
            lead.idNumber?.toLowerCase().includes(searchLower);

        // Franchise filter
        const matchesFranchise =
            bulkLeadFranchiseFilter === 'all' || lead.franchise === bulkLeadFranchiseFilter;

        // Outcome filter
        const matchesOutcome =
            bulkLeadOutcomeFilter === 'all' ||
            (!bulkLeadOutcomeFilter && !lead.leadOutcome) ||
            lead.leadOutcome === bulkLeadOutcomeFilter;

        return matchesSearch && matchesFranchise && matchesOutcome;
    });

    // Filtered leads for the selected agent in bulk unassign modal
    const filteredAgentLeads = agentAssignedLeads.filter((lead) => {
        const searchLower = unassignLeadSearch.toLowerCase();
        return (
            !unassignLeadSearch ||
            lead.name?.toLowerCase().includes(searchLower) ||
            lead.cell?.toLowerCase().includes(searchLower) ||
            lead.idNumber?.toLowerCase().includes(searchLower)
        );
    });

    // Toggle lead selection for bulk assign
    const toggleBulkLeadSelection = (leadId: string) => {
        setBulkSelectedLeadIds((prev) => {
            const next = new Set(prev);
            if (next.has(leadId)) {
                next.delete(leadId);
            } else {
                next.add(leadId);
            }
            return next;
        });
    };

    // Toggle lead selection for bulk unassign
    const toggleUnassignLeadSelection = (leadId: string) => {
        setUnassignSelectedLeadIds((prev) => {
            const next = new Set(prev);
            if (next.has(leadId)) {
                next.delete(leadId);
            } else {
                next.add(leadId);
            }
            return next;
        });
    };

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

    // Handle bulk assignment
    const handleBulkAssign = async () => {
        if (bulkSelectedLeadIds.size === 0) {
            showToast.warning('Please select at least one lead to assign');
            return;
        }

        if (!bulkAgentId) {
            showToast.warning('Please select an agent');
            return;
        }

        setBulkAssigning(true);
        try {
            const selectedAgent = agents.find((a) => a.id === bulkAgentId);
            const agentFullName = selectedAgent
                ? `${selectedAgent.firstName} ${selectedAgent.lastName}`
                : null;

            const selectedLeads = allUnassignedLeads.filter((l) => bulkSelectedLeadIds.has(l.id));

            // Update all selected leads
            const updatePromises = selectedLeads.map((lead) =>
                updateLead(lead.id, { allocatedTo: agentFullName })
            );

            // Create tasks for assigned leads
            const taskPromises = selectedLeads.map((lead) =>
                createTask({
                    title: `Convert Lead: ${lead.name || 'Unknown'}`,
                    description: `Follow up with lead and convert to client.\n\nLead Information:\n- Name: ${lead.name || 'N/A'}\n- Phone: ${lead.cell || 'N/A'}\n- ID Number: ${lead.idNumber || 'N/A'}\n- Franchise: ${lead.franchise || 'N/A'}\n- Affiliate: ${lead.affiliate || 'N/A'}`,
                    type: 'follow_up',
                    status: 'assigned',
                    priority: 'normal',
                    assignedToUserId: bulkAgentId,
                    metadata: {
                        leadId: lead.id,
                        leadData: {
                            name: lead.name,
                            cell: lead.cell,
                            idNumber: lead.idNumber,
                            franchise: lead.franchise,
                            affiliate: lead.affiliate,
                            message: lead.message,
                        },
                    },
                })
            );

            await Promise.all([...updatePromises, ...taskPromises]);

            // Update local state
            setLeads((prev) =>
                prev.map((l) =>
                    bulkSelectedLeadIds.has(l.id) ? { ...l, allocatedTo: agentFullName } : l
                )
            );

            // Show success message
            showToast.success(
                `${bulkSelectedLeadIds.size} lead(s) successfully assigned to ${selectedAgent?.firstName} ${selectedAgent?.lastName}`
            );

            // Reset modal state
            setShowBulkAssignModal(false);
            setBulkAgentId('');
            setBulkAgentSearch('');
            setBulkSelectedLeadIds(new Set());
            setBulkLeadSearch('');
            setBulkLeadFranchiseFilter('all');
            setBulkLeadOutcomeFilter('all');
        } catch (err: any) {
            let errorMessage = 'Failed to assign leads';

            if (err.response?.data?.message) {
                errorMessage = Array.isArray(err.response.data.message)
                    ? err.response.data.message.join(', ')
                    : err.response.data.message;
            } else if (err.message) {
                errorMessage = err.message;
            }

            showToast.error(errorMessage);
            console.error('Bulk assignment error:', err);
        } finally {
            setBulkAssigning(false);
        }
    };

    // Handle bulk unassign
    const handleBulkUnassign = async () => {
        if (unassignSelectedLeadIds.size === 0) {
            showToast.warning('Please select at least one lead to unassign');
            return;
        }

        if (!unassignAgentId) {
            showToast.warning('Please select an agent first');
            return;
        }

        setBulkUnassigning(true);
        try {
            const selectedLeads = agentAssignedLeads.filter((l) =>
                unassignSelectedLeadIds.has(l.id)
            );

            // Unassign all selected leads
            const updatePromises = selectedLeads.map((lead) =>
                updateLead(lead.id, { allocatedTo: null })
            );

            await Promise.all(updatePromises);

            // Update local state
            setLeads((prev) =>
                prev.map((l) =>
                    unassignSelectedLeadIds.has(l.id) ? { ...l, allocatedTo: null } : l
                )
            );

            const selectedAgent = agents.find((a) => a.id === unassignAgentId);
            showToast.success(
                `${unassignSelectedLeadIds.size} lead(s) unassigned from ${selectedAgent?.firstName} ${selectedAgent?.lastName}`
            );

            // Reset modal state
            setShowBulkUnassignModal(false);
            setUnassignAgentId('');
            setUnassignAgentSearch('');
            setUnassignSelectedLeadIds(new Set());
            setUnassignLeadSearch('');
            setAgentAssignedLeads([]);
        } catch (err: any) {
            let errorMessage = 'Failed to unassign leads';

            if (err.response?.data?.message) {
                errorMessage = Array.isArray(err.response.data.message)
                    ? err.response.data.message.join(', ')
                    : err.response.data.message;
            } else if (err.message) {
                errorMessage = err.message;
            }

            showToast.error(errorMessage);
            console.error('Bulk unassignment error:', err);
        } finally {
            setBulkUnassigning(false);
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

            {/* Bulk Assignment Buttons */}
            <Row className="mb-4">
                <Col>
                    <div className="d-flex gap-2">
                        <Button
                            variant="primary"
                            onClick={openBulkAssignModal}
                            style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                border: 'none',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            }}
                        >
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
                            Assign Multiple Leads to Agent
                        </Button>
                        <Button
                            variant="outline-danger"
                            onClick={openBulkUnassignModal}
                            style={{
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            }}
                        >
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
                                <line x1="23" y1="11" x2="17" y2="11" />
                            </svg>
                            Unassign leads from agent
                        </Button>
                    </div>
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
                                                className="me-2"
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
                                            {lead.allocatedTo && (
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    onClick={async () => {
                                                        try {
                                                            await updateLead(lead.id, {
                                                                allocatedTo: null,
                                                            });
                                                            setLeads((prev) =>
                                                                prev.map((l) =>
                                                                    l.id === lead.id
                                                                        ? {
                                                                              ...l,
                                                                              allocatedTo: null,
                                                                          }
                                                                        : l
                                                                )
                                                            );
                                                            showToast.success(
                                                                'Lead unassigned successfully'
                                                            );
                                                        } catch (err) {
                                                            showToast.error(
                                                                'Failed to unassign lead'
                                                            );
                                                        }
                                                    }}
                                                    title="Unassign this lead"
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
                                                    >
                                                        <line x1="18" y1="6" x2="6" y2="18" />
                                                        <line x1="6" y1="6" x2="18" y2="18" />
                                                    </svg>
                                                </Button>
                                            )}
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

            {/* Bulk Assignment Modal */}
            <Modal
                show={showBulkAssignModal}
                onHide={() => {
                    setShowBulkAssignModal(false);
                    setBulkAgentId('');
                    setBulkAgentSearch('');
                    setBulkSelectedLeadIds(new Set());
                    setBulkLeadSearch('');
                    setBulkLeadFranchiseFilter('all');
                    setBulkLeadOutcomeFilter('all');
                }}
                size="lg"
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ marginRight: '8px', verticalAlign: 'middle' }}
                        >
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="8.5" cy="7" r="4" />
                            <line x1="20" y1="8" x2="20" y2="14" />
                            <line x1="23" y1="11" x2="17" y2="11" />
                        </svg>
                        Assign Multiple Leads to Agent
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {/* Agent Selection */}
                    <div className="mb-4">
                        <h6 className="mb-3">
                            <Badge bg="primary">Step 1</Badge> Select Agent
                        </h6>
                        <Form.Group className="mb-2">
                            <Form.Control
                                type="text"
                                placeholder="Search agents by name or email..."
                                value={bulkAgentSearch}
                                onChange={(e) => setBulkAgentSearch(e.target.value)}
                                style={{
                                    border: '2px solid #e0e0e0',
                                    borderRadius: '8px',
                                }}
                            />
                        </Form.Group>
                        <div
                            style={{
                                maxHeight: '200px',
                                overflowY: 'auto',
                                border: '1px solid #e0e0e0',
                                borderRadius: '8px',
                                padding: '8px',
                            }}
                        >
                            {filteredAgents.length === 0 ? (
                                <div className="text-center text-muted py-3">No agents found</div>
                            ) : (
                                filteredAgents.map((agent) => (
                                    <div
                                        key={agent.id}
                                        onClick={() => setBulkAgentId(agent.id)}
                                        style={{
                                            padding: '12px',
                                            margin: '4px 0',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            backgroundColor:
                                                bulkAgentId === agent.id ? '#667eea' : '#f8f9fa',
                                            color: bulkAgentId === agent.id ? 'white' : 'inherit',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (bulkAgentId !== agent.id) {
                                                e.currentTarget.style.backgroundColor = '#e9ecef';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (bulkAgentId !== agent.id) {
                                                e.currentTarget.style.backgroundColor = '#f8f9fa';
                                            }
                                        }}
                                    >
                                        <div className="fw-medium">
                                            {agent.firstName} {agent.lastName}
                                        </div>
                                        <div className="small" style={{ opacity: 0.8 }}>
                                            {agent.email}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        {bulkAgentId && (
                            <div className="mt-2">
                                <Badge bg="success">
                                    Selected: {agents.find((a) => a.id === bulkAgentId)?.firstName}{' '}
                                    {agents.find((a) => a.id === bulkAgentId)?.lastName}
                                </Badge>
                            </div>
                        )}
                    </div>

                    {/* Lead Selection */}
                    <div>
                        <h6 className="mb-3">
                            <Badge bg="primary">Step 2</Badge> Select Unassigned Leads (
                            {bulkSelectedLeadIds.size} selected)
                        </h6>

                        {/* Filters Row */}
                        <Row className="mb-2 g-2">
                            <Col md={12}>
                                <Form.Group>
                                    <Form.Control
                                        type="text"
                                        placeholder="Search leads by name, phone, or ID..."
                                        value={bulkLeadSearch}
                                        onChange={(e) => setBulkLeadSearch(e.target.value)}
                                        style={{
                                            border: '2px solid #e0e0e0',
                                            borderRadius: '8px',
                                        }}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Select
                                    value={bulkLeadFranchiseFilter}
                                    onChange={(e) => setBulkLeadFranchiseFilter(e.target.value)}
                                    size="sm"
                                    style={{
                                        border: '1px solid #e0e0e0',
                                        borderRadius: '6px',
                                    }}
                                >
                                    <option value="all">All Franchises</option>
                                    {uniqueFranchises.map((franchise) => (
                                        <option key={franchise} value={franchise || ''}>
                                            {franchise || 'Unknown'}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Col>
                            <Col md={6}>
                                <Form.Select
                                    value={bulkLeadOutcomeFilter}
                                    onChange={(e) => setBulkLeadOutcomeFilter(e.target.value)}
                                    size="sm"
                                    style={{
                                        border: '1px solid #e0e0e0',
                                        borderRadius: '6px',
                                    }}
                                >
                                    <option value="all">All Statuses</option>
                                    {uniqueUnassignedOutcomes.map((outcome) => (
                                        <option key={outcome} value={outcome || ''}>
                                            {outcome || 'Pending'}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Col>
                        </Row>

                        {/* Results Info */}
                        <div className="small text-muted mb-2">
                            Showing {filteredUnassignedLeads.length} of {allUnassignedLeads.length}{' '}
                            unassigned leads
                        </div>

                        <div
                            style={{
                                maxHeight: '300px',
                                overflowY: 'auto',
                                border: '1px solid #e0e0e0',
                                borderRadius: '8px',
                                padding: '8px',
                            }}
                        >
                            {loadingUnassignedLeads ? (
                                <div className="text-center py-5">
                                    <Spinner animation="border" variant="primary" />
                                    <p className="mt-2 text-muted">Loading unassigned leads...</p>
                                </div>
                            ) : filteredUnassignedLeads.length === 0 ? (
                                <div className="text-center text-muted py-3">
                                    {allUnassignedLeads.length === 0
                                        ? 'No unassigned leads available'
                                        : 'No leads match your filters'}
                                </div>
                            ) : (
                                filteredUnassignedLeads.map((lead) => (
                                    <div
                                        key={lead.id}
                                        onClick={() => toggleBulkLeadSelection(lead.id)}
                                        style={{
                                            padding: '12px',
                                            margin: '4px 0',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            backgroundColor: bulkSelectedLeadIds.has(lead.id)
                                                ? '#dcfce7'
                                                : '#f8f9fa',
                                            border: bulkSelectedLeadIds.has(lead.id)
                                                ? '2px solid #22c55e'
                                                : '1px solid #e0e0e0',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!bulkSelectedLeadIds.has(lead.id)) {
                                                e.currentTarget.style.backgroundColor = '#e9ecef';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!bulkSelectedLeadIds.has(lead.id)) {
                                                e.currentTarget.style.backgroundColor = '#f8f9fa';
                                            }
                                        }}
                                    >
                                        <div className="d-flex justify-content-between align-items-start">
                                            <div className="flex-grow-1">
                                                <div className="fw-medium">
                                                    {lead.name || 'N/A'}
                                                </div>
                                                <div className="small text-muted">
                                                    {formatPhoneNumber(lead.cell)}
                                                    {lead.idNumber && ` • ID: ${lead.idNumber}`}
                                                </div>
                                            </div>
                                            {bulkSelectedLeadIds.has(lead.id) && (
                                                <svg
                                                    width="20"
                                                    height="20"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="#22c55e"
                                                    strokeWidth="3"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer className="d-flex justify-content-between">
                    <div className="text-muted small">
                        {bulkSelectedLeadIds.size > 0 && bulkAgentId && (
                            <>
                                Ready to assign {bulkSelectedLeadIds.size} lead(s) to{' '}
                                {agents.find((a) => a.id === bulkAgentId)?.firstName}{' '}
                                {agents.find((a) => a.id === bulkAgentId)?.lastName}
                            </>
                        )}
                    </div>
                    <div className="d-flex gap-2">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setShowBulkAssignModal(false);
                                setBulkAgentId('');
                                setBulkAgentSearch('');
                                setBulkSelectedLeadIds(new Set());
                                setBulkLeadSearch('');
                                setBulkLeadFranchiseFilter('all');
                                setBulkLeadOutcomeFilter('all');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleBulkAssign}
                            disabled={
                                bulkAssigning || !bulkAgentId || bulkSelectedLeadIds.size === 0
                            }
                            style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                border: 'none',
                            }}
                        >
                            {bulkAssigning ? (
                                <>
                                    <Spinner size="sm" animation="border" className="me-2" />
                                    Assigning...
                                </>
                            ) : (
                                `Assign ${bulkSelectedLeadIds.size} Lead${bulkSelectedLeadIds.size !== 1 ? 's' : ''}`
                            )}
                        </Button>
                    </div>
                </Modal.Footer>
            </Modal>

            {/* Bulk Unassignment Modal */}
            <Modal
                show={showBulkUnassignModal}
                onHide={() => {
                    setShowBulkUnassignModal(false);
                    setUnassignAgentId('');
                    setUnassignAgentSearch('');
                    setUnassignSelectedLeadIds(new Set());
                    setUnassignLeadSearch('');
                    setAgentAssignedLeads([]);
                }}
                size="lg"
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ marginRight: '8px', verticalAlign: 'middle' }}
                        >
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="8.5" cy="7" r="4" />
                            <line x1="23" y1="11" x2="17" y2="11" />
                        </svg>
                        Unassign leads from agent
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {/* Agent Selection */}
                    <div className="mb-4">
                        <h6 className="mb-3">
                            <Badge bg="primary">Step 1</Badge> Select Agent
                        </h6>
                        <Form.Group className="mb-2">
                            <Form.Control
                                type="text"
                                placeholder="Search agents by name or email..."
                                value={unassignAgentSearch}
                                onChange={(e) => setUnassignAgentSearch(e.target.value)}
                                style={{
                                    border: '2px solid #e0e0e0',
                                    borderRadius: '8px',
                                }}
                            />
                        </Form.Group>
                        <div
                            style={{
                                maxHeight: '200px',
                                overflowY: 'auto',
                                border: '1px solid #e0e0e0',
                                borderRadius: '8px',
                                padding: '8px',
                            }}
                        >
                            {filteredUnassignAgents.length === 0 ? (
                                <div className="text-center text-muted py-3">No agents found</div>
                            ) : (
                                filteredUnassignAgents.map((agent) => (
                                    <div
                                        key={agent.id}
                                        onClick={() => {
                                            setUnassignAgentId(agent.id);
                                            fetchAgentLeads(agent.id);
                                            setUnassignSelectedLeadIds(new Set());
                                        }}
                                        style={{
                                            padding: '12px',
                                            margin: '4px 0',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            backgroundColor:
                                                unassignAgentId === agent.id
                                                    ? '#ef4444'
                                                    : '#f8f9fa',
                                            color:
                                                unassignAgentId === agent.id ? 'white' : 'inherit',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (unassignAgentId !== agent.id) {
                                                e.currentTarget.style.backgroundColor = '#e9ecef';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (unassignAgentId !== agent.id) {
                                                e.currentTarget.style.backgroundColor = '#f8f9fa';
                                            }
                                        }}
                                    >
                                        <div className="fw-medium">
                                            {agent.firstName} {agent.lastName}
                                        </div>
                                        <div className="small" style={{ opacity: 0.8 }}>
                                            {agent.email}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        {unassignAgentId && (
                            <div className="mt-2">
                                <Badge bg="danger">
                                    Selected:{' '}
                                    {agents.find((a) => a.id === unassignAgentId)?.firstName}{' '}
                                    {agents.find((a) => a.id === unassignAgentId)?.lastName}
                                </Badge>
                            </div>
                        )}
                    </div>

                    {/* Lead Selection - Only show if agent is selected */}
                    {unassignAgentId && (
                        <div>
                            <h6 className="mb-3">
                                <Badge bg="primary">Step 2</Badge> Select Leads to Unassign (
                                {unassignSelectedLeadIds.size} selected)
                            </h6>

                            <Form.Group className="mb-2">
                                <Form.Control
                                    type="text"
                                    placeholder="Search leads by name, phone, or ID..."
                                    value={unassignLeadSearch}
                                    onChange={(e) => setUnassignLeadSearch(e.target.value)}
                                    style={{
                                        border: '2px solid #e0e0e0',
                                        borderRadius: '8px',
                                    }}
                                />
                            </Form.Group>

                            {/* Results Info */}
                            <div className="small text-muted mb-2">
                                Showing {filteredAgentLeads.length} of {agentAssignedLeads.length}{' '}
                                leads assigned to this agent
                            </div>

                            <div
                                style={{
                                    maxHeight: '300px',
                                    overflowY: 'auto',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '8px',
                                    padding: '8px',
                                }}
                            >
                                {loadingAgentLeads ? (
                                    <div className="text-center py-5">
                                        <Spinner animation="border" variant="primary" />
                                        <p className="mt-2 text-muted">Loading agent leads...</p>
                                    </div>
                                ) : filteredAgentLeads.length === 0 ? (
                                    <div className="text-center text-muted py-3">
                                        {agentAssignedLeads.length === 0
                                            ? 'No leads assigned to this agent'
                                            : 'No leads match your search'}
                                    </div>
                                ) : (
                                    filteredAgentLeads.map((lead) => (
                                        <div
                                            key={lead.id}
                                            onClick={() => toggleUnassignLeadSelection(lead.id)}
                                            style={{
                                                padding: '12px',
                                                margin: '4px 0',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                backgroundColor: unassignSelectedLeadIds.has(
                                                    lead.id
                                                )
                                                    ? '#fee2e2'
                                                    : '#f8f9fa',
                                                border: unassignSelectedLeadIds.has(lead.id)
                                                    ? '2px solid #ef4444'
                                                    : '1px solid #e0e0e0',
                                                transition: 'all 0.2s',
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!unassignSelectedLeadIds.has(lead.id)) {
                                                    e.currentTarget.style.backgroundColor =
                                                        '#e9ecef';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!unassignSelectedLeadIds.has(lead.id)) {
                                                    e.currentTarget.style.backgroundColor =
                                                        '#f8f9fa';
                                                }
                                            }}
                                        >
                                            <div className="d-flex justify-content-between align-items-start">
                                                <div className="flex-grow-1">
                                                    <div className="fw-medium">
                                                        {lead.name || 'N/A'}
                                                    </div>
                                                    <div className="small text-muted">
                                                        {formatPhoneNumber(lead.cell)}
                                                        {lead.idNumber && ` • ID: ${lead.idNumber}`}
                                                    </div>
                                                </div>
                                                {unassignSelectedLeadIds.has(lead.id) && (
                                                    <svg
                                                        width="20"
                                                        height="20"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="#ef4444"
                                                        strokeWidth="3"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="d-flex justify-content-between">
                    <div className="text-muted small">
                        {unassignSelectedLeadIds.size > 0 && unassignAgentId && (
                            <>
                                Ready to unassign {unassignSelectedLeadIds.size} lead(s) from{' '}
                                {agents.find((a) => a.id === unassignAgentId)?.firstName}{' '}
                                {agents.find((a) => a.id === unassignAgentId)?.lastName}
                            </>
                        )}
                    </div>
                    <div className="d-flex gap-2">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setShowBulkUnassignModal(false);
                                setUnassignAgentId('');
                                setUnassignAgentSearch('');
                                setUnassignSelectedLeadIds(new Set());
                                setUnassignLeadSearch('');
                                setAgentAssignedLeads([]);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleBulkUnassign}
                            disabled={
                                bulkUnassigning ||
                                !unassignAgentId ||
                                unassignSelectedLeadIds.size === 0
                            }
                        >
                            {bulkUnassigning ? (
                                <>
                                    <Spinner size="sm" animation="border" className="me-2" />
                                    Removing...
                                </>
                            ) : (
                                `Unassign ${unassignSelectedLeadIds.size} Lead${unassignSelectedLeadIds.size !== 1 ? 's' : ''}`
                            )}
                        </Button>
                    </div>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}
