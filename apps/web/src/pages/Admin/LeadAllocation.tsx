import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { format } from 'date-fns';
import {
    formatPhoneNumber,
    getAllAssignedLeads,
    getAllUnassignedLeads,
    getLeads,
    updateLead,
    type Lead,
} from '@/api/leads.api';
import { listUsers, type UserDto } from '@/api/users';
import { createTask } from '@/api/tasks.api';
import { showToast } from '@/utils/toast';
import './LeadAllocation.css';

const errorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error) return error.message;
    const response = (error as { response?: { data?: { message?: string | string[] } } })?.response;
    const message = response?.data?.message;
    return Array.isArray(message) ? message.join(', ') : message || fallback;
};

const fullName = (agent?: UserDto) => (agent ? `${agent.firstName} ${agent.lastName}` : '');

const taskForLead = (lead: Lead, agentId: string) => ({
    title: `Convert Lead: ${lead.name || 'Unknown'}`,
    description: `Follow up with lead and convert to client.\n\nLead Information:\n- Name: ${lead.name || 'N/A'}\n- Phone: ${lead.cell || 'N/A'}\n- ID Number: ${lead.idNumber || 'N/A'}\n- Franchise: ${lead.franchise || 'N/A'}\n- Affiliate: ${lead.affiliate || 'N/A'}`,
    type: 'follow_up' as const,
    status: 'assigned' as const,
    priority: 'normal' as const,
    assignedToUserId: agentId,
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
});

export default function LeadAllocation() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [agents, setAgents] = useState<UserDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [outcomeFilter, setOutcomeFilter] = useState('all');
    const [allocationFilter, setAllocationFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalLeads, setTotalLeads] = useState(0);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [selectedAgentId, setSelectedAgentId] = useState('');
    const [assigning, setAssigning] = useState(false);
    const [bulkMode, setBulkMode] = useState<'assign' | 'unassign' | null>(null);
    const [bulkAgentId, setBulkAgentId] = useState('');
    const [agentSearch, setAgentSearch] = useState('');
    const [bulkLeads, setBulkLeads] = useState<Lead[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [leadSearch, setLeadSearch] = useState('');
    const [franchiseFilter, setFranchiseFilter] = useState('all');
    const [bulkOutcomeFilter, setBulkOutcomeFilter] = useState('all');
    const [loadingBulkLeads, setLoadingBulkLeads] = useState(false);
    const [bulkProcessing, setBulkProcessing] = useState(false);

    useEffect(() => {
        void listUsers({ role: 'agent', status: 'active', all: true })
            .then((response) => setAgents(response.users))
            .catch((err) => {
                console.error('Failed to fetch agents:', err);
                showToast.error('Failed to fetch agent list. Please refresh the page.');
            });
    }, []);

    const fetchLeads = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            let allocatedTo: string | null | undefined;
            if (allocationFilter === 'unassigned') allocatedTo = null;
            else if (allocationFilter !== 'all') allocatedTo = allocationFilter;
            const response = await getLeads({
                page: currentPage,
                limit: 50,
                search: searchQuery.trim() || undefined,
                leadOutcome: outcomeFilter !== 'all' ? outcomeFilter : undefined,
                allocatedTo,
                sortBy: 'timeReceived',
                sortOrder: 'DESC',
            });
            setLeads(response.leads);
            setTotalLeads(response.total);
            setTotalPages(response.totalPages);
        } catch (err) {
            const message = errorMessage(err, 'Failed to fetch leads');
            setError(message);
            showToast.error(message);
        } finally {
            setLoading(false);
        }
    }, [allocationFilter, currentPage, outcomeFilter, searchQuery]);

    useEffect(() => {
        void fetchLeads();
    }, [fetchLeads]);

    const openSingleAssign = (lead: Lead) => {
        setSelectedLead(lead);
        setSelectedAgentId(agents.find((agent) => fullName(agent) === lead.allocatedTo)?.id || '');
    };

    const closeBulk = () => {
        setBulkMode(null);
        setBulkAgentId('');
        setAgentSearch('');
        setBulkLeads([]);
        setSelectedIds(new Set());
        setLeadSearch('');
        setFranchiseFilter('all');
        setBulkOutcomeFilter('all');
    };

    const openBulk = async (mode: 'assign' | 'unassign') => {
        setBulkMode(mode);
        setLoadingBulkLeads(mode === 'assign');
        if (mode === 'assign') {
            try {
                setBulkLeads(await getAllUnassignedLeads());
            } catch (err) {
                showToast.error(errorMessage(err, 'Failed to load unassigned leads'));
            } finally {
                setLoadingBulkLeads(false);
            }
        }
    };

    const selectUnassignAgent = async (agentId: string) => {
        setBulkAgentId(agentId);
        setSelectedIds(new Set());
        setLoadingBulkLeads(true);
        try {
            const assigned = await getAllAssignedLeads();
            const name = fullName(agents.find((agent) => agent.id === agentId));
            setBulkLeads(assigned.filter((lead) => lead.allocatedTo === name));
        } catch (err) {
            showToast.error(errorMessage(err, 'Failed to load agent leads'));
        } finally {
            setLoadingBulkLeads(false);
        }
    };

    const toggleLead = (id: string) => {
        setSelectedIds((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleAssign = async () => {
        if (!selectedLead) return;
        setAssigning(true);
        try {
            const agent = agents.find((item) => item.id === selectedAgentId);
            const allocatedTo = agent ? fullName(agent) : null;
            await updateLead(selectedLead.id, { allocatedTo });
            if (agent) await createTask(taskForLead(selectedLead, agent.id));
            setLeads((current) =>
                current.map((lead) =>
                    lead.id === selectedLead.id ? { ...lead, allocatedTo } : lead
                )
            );
            showToast.success(
                agent
                    ? `Lead successfully assigned to ${fullName(agent)}`
                    : 'Lead unassigned successfully'
            );
            setSelectedLead(null);
            setSelectedAgentId('');
        } catch (err) {
            showToast.error(errorMessage(err, 'Failed to assign lead'));
        } finally {
            setAssigning(false);
        }
    };

    const directUnassign = async (lead: Lead) => {
        try {
            await updateLead(lead.id, { allocatedTo: null });
            setLeads((current) =>
                current.map((item) => (item.id === lead.id ? { ...item, allocatedTo: null } : item))
            );
            showToast.success('Lead unassigned successfully');
        } catch (err) {
            showToast.error(errorMessage(err, 'Failed to unassign lead'));
        }
    };

    const handleBulk = async () => {
        if (!bulkAgentId || selectedIds.size === 0 || !bulkMode) return;
        setBulkProcessing(true);
        const agent = agents.find((item) => item.id === bulkAgentId);
        const selected = bulkLeads.filter((lead) => selectedIds.has(lead.id));
        try {
            if (bulkMode === 'assign') {
                await Promise.all([
                    ...selected.map((lead) =>
                        updateLead(lead.id, { allocatedTo: fullName(agent) || null })
                    ),
                    ...selected.map((lead) => createTask(taskForLead(lead, bulkAgentId))),
                ]);
                showToast.success(
                    `${selected.length} lead(s) successfully assigned to ${fullName(agent)}`
                );
            } else {
                await Promise.all(
                    selected.map((lead) => updateLead(lead.id, { allocatedTo: null }))
                );
                showToast.success(`${selected.length} lead(s) unassigned from ${fullName(agent)}`);
            }
            closeBulk();
            await fetchLeads();
        } catch (err) {
            showToast.error(
                errorMessage(
                    err,
                    bulkMode === 'assign' ? 'Failed to assign leads' : 'Failed to unassign leads'
                )
            );
        } finally {
            setBulkProcessing(false);
        }
    };

    const outcomes = useMemo(
        () => [...new Set(leads.map((lead) => lead.leadOutcome).filter(Boolean))],
        [leads]
    );
    const franchises = useMemo(
        () => [...new Set(bulkLeads.map((lead) => lead.franchise).filter(Boolean))],
        [bulkLeads]
    );
    const bulkOutcomes = useMemo(
        () => [...new Set(bulkLeads.map((lead) => lead.leadOutcome).filter(Boolean))],
        [bulkLeads]
    );
    const filteredAgents = agents.filter((agent) =>
        `${fullName(agent)} ${agent.email}`.toLowerCase().includes(agentSearch.toLowerCase())
    );
    const filteredBulkLeads = bulkLeads.filter((lead) => {
        const text = `${lead.name || ''} ${lead.cell || ''} ${lead.idNumber || ''}`.toLowerCase();
        return (
            text.includes(leadSearch.toLowerCase()) &&
            (franchiseFilter === 'all' || lead.franchise === franchiseFilter) &&
            (bulkOutcomeFilter === 'all' || lead.leadOutcome === bulkOutcomeFilter)
        );
    });
    const stats = {
        total: totalLeads,
        assigned: leads.filter((lead) => lead.allocatedTo).length,
        unassigned: leads.filter((lead) => !lead.allocatedTo).length,
        pending: leads.filter(
            (lead) =>
                !lead.leadOutcome ||
                lead.leadOutcome === 'Pending' ||
                lead.leadOutcome === 'Not Processed'
        ).length,
    };

    return (
        <main className="lead-allocation">
            <header className="lead-allocation-header">
                <div>
                    <p className="lead-allocation-eyebrow">Lead management</p>
                    <h1>Lead allocation</h1>
                    <p>Review ownership and assign leads to active agents.</p>
                </div>
                <div className="lead-allocation-actions">
                    <button
                        type="button"
                        className="lead-allocation-action"
                        onClick={() => void openBulk('assign')}
                    >
                        Assign multiple
                    </button>
                    <button
                        type="button"
                        className="lead-allocation-action lead-allocation-action--danger"
                        onClick={() => void openBulk('unassign')}
                    >
                        Bulk unassign
                    </button>
                </div>
            </header>

            <section className="lead-allocation-stats" aria-label="Lead allocation summary">
                <div>
                    <span>Total leads</span>
                    <strong>{stats.total}</strong>
                </div>
                <div className="assigned">
                    <span>Assigned on page</span>
                    <strong>{stats.assigned}</strong>
                </div>
                <div className="unassigned">
                    <span>Unassigned on page</span>
                    <strong>{stats.unassigned}</strong>
                </div>
                <div className="pending">
                    <span>Pending on page</span>
                    <strong>{stats.pending}</strong>
                </div>
            </section>

            <section className="lead-allocation-toolbar" aria-label="Lead filters">
                <label>
                    <span>Search</span>
                    <input
                        type="search"
                        value={searchQuery}
                        placeholder="Name, phone or ID"
                        onChange={(event) => {
                            setSearchQuery(event.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </label>
                <label>
                    <span>Outcome</span>
                    <select
                        value={outcomeFilter}
                        onChange={(event) => {
                            setOutcomeFilter(event.target.value);
                            setCurrentPage(1);
                        }}
                    >
                        <option value="all">All outcomes</option>
                        {outcomes.map((outcome) => (
                            <option key={outcome} value={outcome || ''}>
                                {outcome || 'Pending'}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    <span>Assignment</span>
                    <select
                        value={allocationFilter}
                        onChange={(event) => {
                            setAllocationFilter(event.target.value);
                            setCurrentPage(1);
                        }}
                    >
                        <option value="all">All leads</option>
                        <option value="unassigned">Unassigned only</option>
                        {agents.map((agent) => (
                            <option key={agent.id} value={fullName(agent)}>
                                {fullName(agent)}
                            </option>
                        ))}
                    </select>
                </label>
                <button
                    type="button"
                    onClick={() => {
                        setSearchQuery('');
                        setOutcomeFilter('all');
                        setAllocationFilter('all');
                        setCurrentPage(1);
                    }}
                >
                    Clear
                </button>
            </section>

            {error && (
                <div className="lead-allocation-alert" role="alert">
                    <span>{error}</span>
                    <button type="button" onClick={() => void fetchLeads()}>
                        Retry
                    </button>
                </div>
            )}
            {loading ? (
                <div className="lead-allocation-state" aria-busy="true">
                    <span className="lead-allocation-spinner" />
                    <strong>Loading leads</strong>
                </div>
            ) : leads.length === 0 ? (
                <div className="lead-allocation-state">
                    <strong>No leads found</strong>
                    <span>Adjust the filters or search query.</span>
                </div>
            ) : (
                <section className="lead-allocation-panel">
                    <div className="lead-allocation-table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Received</th>
                                    <th>Lead</th>
                                    <th>Contact</th>
                                    <th>Source</th>
                                    <th>Outcome</th>
                                    <th>Assigned to</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leads.map((lead) => (
                                    <tr key={lead.id}>
                                        <td>
                                            {format(
                                                new Date(lead.timeReceived),
                                                'yyyy-MM-dd HH:mm'
                                            )}
                                        </td>
                                        <td>
                                            <strong>{lead.name || 'N/A'}</strong>
                                            {lead.idNumber && <span>ID: {lead.idNumber}</span>}
                                        </td>
                                        <td>{formatPhoneNumber(lead.cell)}</td>
                                        <td>{lead.franchise || lead.affiliate || 'N/A'}</td>
                                        <td>
                                            <span
                                                className={`lead-allocation-badge ${lead.leadOutcome === 'Converted' ? 'success' : 'neutral'}`}
                                            >
                                                {lead.leadOutcome || 'Pending'}
                                            </span>
                                        </td>
                                        <td>
                                            {lead.allocatedTo || (
                                                <span className="muted">Unassigned</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="lead-allocation-row-actions">
                                                <button
                                                    type="button"
                                                    onClick={() => openSingleAssign(lead)}
                                                >
                                                    {lead.allocatedTo ? 'Reassign' : 'Assign'}
                                                </button>
                                                {lead.allocatedTo && (
                                                    <button
                                                        type="button"
                                                        className="danger"
                                                        onClick={() => void directUnassign(lead)}
                                                    >
                                                        Unassign
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="lead-allocation-mobile-list">
                        {leads.map((lead) => (
                            <article key={lead.id}>
                                <div className="lead-allocation-card-heading">
                                    <div>
                                        <strong>{lead.name || 'N/A'}</strong>
                                        <span>{formatPhoneNumber(lead.cell)}</span>
                                    </div>
                                    <span className="lead-allocation-badge neutral">
                                        {lead.leadOutcome || 'Pending'}
                                    </span>
                                </div>
                                <dl>
                                    <div>
                                        <dt>Received</dt>
                                        <dd>
                                            {format(
                                                new Date(lead.timeReceived),
                                                'dd MMM yyyy HH:mm'
                                            )}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt>Source</dt>
                                        <dd>{lead.franchise || lead.affiliate || 'N/A'}</dd>
                                    </div>
                                    <div>
                                        <dt>Assigned to</dt>
                                        <dd>{lead.allocatedTo || 'Unassigned'}</dd>
                                    </div>
                                </dl>
                                <div className="lead-allocation-row-actions">
                                    <button type="button" onClick={() => openSingleAssign(lead)}>
                                        {lead.allocatedTo ? 'Reassign' : 'Assign'}
                                    </button>
                                    {lead.allocatedTo && (
                                        <button
                                            type="button"
                                            className="danger"
                                            onClick={() => void directUnassign(lead)}
                                        >
                                            Unassign
                                        </button>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {!loading && totalPages > 1 && (
                <nav className="lead-allocation-pagination" aria-label="Lead pages">
                    <span>
                        Page {currentPage} of {totalPages} · {totalLeads} leads
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
                </nav>
            )}

            <Modal
                show={Boolean(selectedLead)}
                onHide={() => setSelectedLead(null)}
                centered
                dialogClassName="lead-allocation-modal"
            >
                <Modal.Header closeButton>
                    <Modal.Title>Assign lead</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedLead && (
                        <>
                            <div className="lead-allocation-summary">
                                <strong>{selectedLead.name || 'N/A'}</strong>
                                <span>
                                    {formatPhoneNumber(selectedLead.cell)}
                                    {selectedLead.idNumber ? ` · ID ${selectedLead.idNumber}` : ''}
                                </span>
                            </div>
                            <label className="lead-allocation-field">
                                <span>Assign to agent</span>
                                <select
                                    value={selectedAgentId}
                                    onChange={(event) => setSelectedAgentId(event.target.value)}
                                >
                                    <option value="">Unassigned</option>
                                    {agents.map((agent) => (
                                        <option key={agent.id} value={agent.id}>
                                            {fullName(agent)} ({agent.email})
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <button
                        type="button"
                        className="modal-secondary"
                        onClick={() => setSelectedLead(null)}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="modal-primary"
                        onClick={() => void handleAssign()}
                        disabled={assigning}
                    >
                        {assigning ? 'Saving…' : 'Save assignment'}
                    </button>
                </Modal.Footer>
            </Modal>

            <Modal
                show={Boolean(bulkMode)}
                onHide={closeBulk}
                size="lg"
                centered
                scrollable
                dialogClassName="lead-allocation-modal lead-allocation-modal--bulk"
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        {bulkMode === 'assign'
                            ? 'Assign multiple leads'
                            : 'Unassign leads from agent'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <section className="lead-allocation-step">
                        <div className="lead-allocation-step-title">
                            <span>1</span>
                            <div>
                                <strong>Select agent</strong>
                                <small>
                                    {bulkMode === 'assign'
                                        ? 'Choose the receiving agent.'
                                        : 'Choose the agent whose leads must be returned.'}
                                </small>
                            </div>
                        </div>
                        <input
                            className="lead-allocation-modal-search"
                            type="search"
                            placeholder="Search agents"
                            value={agentSearch}
                            onChange={(event) => setAgentSearch(event.target.value)}
                        />
                        <div className="lead-allocation-agent-list">
                            {filteredAgents.length === 0 ? (
                                <p>No agents found</p>
                            ) : (
                                filteredAgents.map((agent) => (
                                    <button
                                        type="button"
                                        key={agent.id}
                                        className={bulkAgentId === agent.id ? 'selected' : ''}
                                        onClick={() =>
                                            bulkMode === 'assign'
                                                ? setBulkAgentId(agent.id)
                                                : void selectUnassignAgent(agent.id)
                                        }
                                    >
                                        <strong>{fullName(agent)}</strong>
                                        <span>{agent.email}</span>
                                    </button>
                                ))
                            )}
                        </div>
                    </section>
                    <section className="lead-allocation-step">
                        <div className="lead-allocation-step-title">
                            <span>2</span>
                            <div>
                                <strong>Select leads</strong>
                                <small>
                                    {selectedIds.size} selected · {filteredBulkLeads.length} shown
                                </small>
                            </div>
                        </div>
                        <div className="lead-allocation-modal-filters">
                            <input
                                type="search"
                                placeholder="Search leads"
                                value={leadSearch}
                                onChange={(event) => setLeadSearch(event.target.value)}
                            />
                            {bulkMode === 'assign' && (
                                <>
                                    <select
                                        value={franchiseFilter}
                                        onChange={(event) => setFranchiseFilter(event.target.value)}
                                    >
                                        <option value="all">All franchises</option>
                                        {franchises.map((value) => (
                                            <option key={value} value={value || ''}>
                                                {value}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={bulkOutcomeFilter}
                                        onChange={(event) =>
                                            setBulkOutcomeFilter(event.target.value)
                                        }
                                    >
                                        <option value="all">All outcomes</option>
                                        {bulkOutcomes.map((value) => (
                                            <option key={value} value={value || ''}>
                                                {value}
                                            </option>
                                        ))}
                                    </select>
                                </>
                            )}
                        </div>
                        <div className="lead-allocation-selection-list">
                            {loadingBulkLeads ? (
                                <p>Loading leads…</p>
                            ) : bulkMode === 'unassign' && !bulkAgentId ? (
                                <p>Select an agent to load assigned leads.</p>
                            ) : filteredBulkLeads.length === 0 ? (
                                <p>No matching leads found.</p>
                            ) : (
                                filteredBulkLeads.map((lead) => (
                                    <label
                                        key={lead.id}
                                        className={selectedIds.has(lead.id) ? 'selected' : ''}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(lead.id)}
                                            onChange={() => toggleLead(lead.id)}
                                        />
                                        <span>
                                            <strong>{lead.name || 'N/A'}</strong>
                                            <small>
                                                {formatPhoneNumber(lead.cell)}
                                                {lead.idNumber ? ` · ID ${lead.idNumber}` : ''}
                                            </small>
                                        </span>
                                    </label>
                                ))
                            )}
                        </div>
                    </section>
                </Modal.Body>
                <Modal.Footer>
                    <span className="lead-allocation-modal-status">
                        {selectedIds.size > 0 && bulkAgentId
                            ? `${selectedIds.size} lead(s) ready for ${bulkMode === 'assign' ? 'assignment' : 'unassignment'}`
                            : 'Select an agent and at least one lead'}
                    </span>
                    <button type="button" className="modal-secondary" onClick={closeBulk}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className={bulkMode === 'assign' ? 'modal-primary' : 'modal-danger'}
                        disabled={bulkProcessing || !bulkAgentId || selectedIds.size === 0}
                        onClick={() => void handleBulk()}
                    >
                        {bulkProcessing
                            ? 'Applying…'
                            : `${bulkMode === 'assign' ? 'Assign' : 'Unassign'} ${selectedIds.size}`}
                    </button>
                </Modal.Footer>
            </Modal>
        </main>
    );
}
