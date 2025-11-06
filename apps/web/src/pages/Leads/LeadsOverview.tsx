import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Row,
    Col,
    Form,
    Button,
    Spinner,
    Badge,
    Table,
    Card,
    Pagination,
} from 'react-bootstrap';
import { getLeads, type Lead, type LeadSearchQuery, formatPhoneNumber } from '@/api/leads.api';
import { format } from 'date-fns';

type LeadListItem = {
    id: string;
    timeReceived: string;
    franchise: string;
    name: string;
    cell: string;
    idNumber: string;
    affiliate: string;
    message: string;
    allocatedTo: string;
    leadOutcome: string;
    createdAt: string;
};

/**
 * Convert API Lead response to LeadListItem for display
 */
function mapLeadsToListItems(leads: Lead[]): LeadListItem[] {
    return leads.map((lead) => ({
        id: lead.id,
        timeReceived: lead.timeReceived.toString(),
        franchise: lead.franchise || 'N/A',
        name: lead.name || 'N/A',
        cell: lead.cell,
        idNumber: lead.idNumber || 'N/A',
        affiliate: lead.affiliate || 'N/A',
        message: lead.message || '',
        allocatedTo: lead.allocatedTo || 'Unassigned',
        leadOutcome: lead.leadOutcome || 'Pending',
        createdAt: lead.createdAt.toString(),
    }));
}

export default function LeadsOverview() {
    const navigate = useNavigate();

    // API State
    const [all, setAll] = useState<LeadListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [franchiseFilter, setFranchiseFilter] = useState('all');
    const [affiliateFilter, setAffiliateFilter] = useState('all');
    const [outcomeFilter, setOutcomeFilter] = useState('all');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalLeads, setTotalLeads] = useState(0);

    // Get unique values for filters
    const uniqueFranchises = Array.from(
        new Set(all.map((l) => l.franchise).filter((f) => f !== 'N/A'))
    );
    const uniqueAffiliates = Array.from(
        new Set(all.map((l) => l.affiliate).filter((a) => a !== 'N/A'))
    );
    const uniqueOutcomes = Array.from(
        new Set(all.map((l) => l.leadOutcome).filter((o) => o !== 'Pending'))
    );

    // Calculate stats
    const pendingLeads = all.filter((l) => l.leadOutcome === 'Pending').length;
    const assignedLeads = all.filter((l) => l.allocatedTo !== 'Unassigned').length;

    // Error message helper
    const getErrorMessage = (err: unknown): string => {
        if (err instanceof Error) {
            const message = err.message.toLowerCase();

            if (message.includes('internal server error') || message.includes('500')) {
                return 'The server encountered an error loading leads. Please try again.';
            }
            if (message.includes('not found') || message.includes('404')) {
                return 'The requested leads could not be found.';
            }
            if (message.includes('unauthorized') || message.includes('401')) {
                return 'You do not have permission to view leads.';
            }
            if (message.includes('network error') || message.includes('timeout')) {
                return 'Network connection error. Please check your internet connection and try again.';
            }
            return err.message;
        }
        return 'Failed to fetch leads. Please try again.';
    };

    // Fetch leads from API
    useEffect(() => {
        let isMounted = true;

        const fetchLeads = async () => {
            setLoading(true);
            setError(null);

            try {
                const query: LeadSearchQuery = {
                    page: currentPage,
                    limit: 20,
                    search: searchQuery.trim() || undefined,
                    franchise: franchiseFilter !== 'all' ? franchiseFilter : undefined,
                    affiliate: affiliateFilter !== 'all' ? affiliateFilter : undefined,
                    leadOutcome: outcomeFilter !== 'all' ? outcomeFilter : undefined,
                    sortBy: 'timeReceived',
                    sortOrder: 'DESC',
                };

                const response = await getLeads(query);

                if (isMounted) {
                    setAll(mapLeadsToListItems(response.leads));
                    setTotalPages(response.totalPages);
                    setTotalLeads(response.total);
                }
            } catch (err) {
                if (isMounted) {
                    setError(getErrorMessage(err));
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchLeads();

        return () => {
            isMounted = false;
        };
    }, [currentPage, searchQuery, franchiseFilter, affiliateFilter, outcomeFilter]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1); // Reset to first page on new search
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setFranchiseFilter('all');
        setAffiliateFilter('all');
        setOutcomeFilter('all');
        setCurrentPage(1);
    };

    return (
        <div className="container-fluid px-4 py-4">
            {/* Modern Header Card with Gradient */}
            <div
                className="card border-0 shadow-sm mb-4"
                style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '16px',
                }}
            >
                <div className="card-body p-4">
                    <div className="row align-items-center">
                        <div className="col-md-6">
                            <div className="d-flex align-items-center">
                                <div
                                    className="bg-white bg-opacity-25 rounded-3 p-3 me-3"
                                    style={{ backdropFilter: 'blur(10px)' }}
                                >
                                    <svg
                                        width="32"
                                        height="32"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="white"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="8.5" cy="7" r="4"></circle>
                                        <polyline points="17 11 19 13 23 9"></polyline>
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-white mb-1 fw-bold">Leads Management</h2>
                                    <p className="text-white text-opacity-75 mb-0">
                                        Track and manage all incoming leads
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="row g-3 text-white">
                                <div className="col-4">
                                    <div className="text-center">
                                        <div className="fs-3 fw-bold">{totalLeads}</div>
                                        <div className="small opacity-75">Total Leads</div>
                                    </div>
                                </div>
                                <div className="col-4">
                                    <div className="text-center">
                                        <div className="fs-3 fw-bold">{pendingLeads}</div>
                                        <div className="small opacity-75">Pending</div>
                                    </div>
                                </div>
                                <div className="col-4">
                                    <div className="text-center">
                                        <div className="fs-3 fw-bold">{assignedLeads}</div>
                                        <div className="small opacity-75">Assigned</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search and Filters Card */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '12px' }}>
                <div className="card-body p-4">
                    <Form onSubmit={handleSearch}>
                        <Row className="g-3 align-items-end">
                            {/* Search */}
                            <Col md={12} lg={4}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold mb-2">
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="me-2"
                                            style={{ marginTop: '-3px' }}
                                        >
                                            <circle cx="11" cy="11" r="8"></circle>
                                            <path d="m21 21-4.35-4.35"></path>
                                        </svg>
                                        Search
                                    </Form.Label>
                                    <div className="input-group shadow-sm">
                                        <span
                                            className="input-group-text bg-white border-end-0"
                                            style={{ borderRadius: '8px 0 0 8px' }}
                                        >
                                            <svg
                                                width="18"
                                                height="18"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <circle cx="11" cy="11" r="8"></circle>
                                                <path d="m21 21-4.35-4.35"></path>
                                            </svg>
                                        </span>
                                        <Form.Control
                                            type="text"
                                            placeholder="Search by name, cell, ID..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="border-start-0 border-end-0"
                                        />
                                        <Button
                                            variant="outline-secondary"
                                            type="submit"
                                            style={{ borderRadius: '0 8px 8px 0' }}
                                        >
                                            Search
                                        </Button>
                                    </div>
                                </Form.Group>
                            </Col>

                            {/* Franchise Filter */}
                            <Col md={4} lg={2}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold mb-2">
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="me-2"
                                            style={{ marginTop: '-3px' }}
                                        >
                                            <rect x="3" y="3" width="7" height="7"></rect>
                                            <rect x="14" y="3" width="7" height="7"></rect>
                                            <rect x="14" y="14" width="7" height="7"></rect>
                                            <rect x="3" y="14" width="7" height="7"></rect>
                                        </svg>
                                        Franchise
                                    </Form.Label>
                                    <Form.Select
                                        value={franchiseFilter}
                                        onChange={(e) => {
                                            setFranchiseFilter(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="shadow-sm"
                                        style={{ borderRadius: '8px' }}
                                    >
                                        <option value="all">All Franchises</option>
                                        {uniqueFranchises.map((f) => (
                                            <option key={f} value={f}>
                                                {f}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>

                            {/* Affiliate Filter */}
                            <Col md={4} lg={2}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold mb-2">
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="me-2"
                                            style={{ marginTop: '-3px' }}
                                        >
                                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="9" cy="7" r="4"></circle>
                                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                        </svg>
                                        Affiliate
                                    </Form.Label>
                                    <Form.Select
                                        value={affiliateFilter}
                                        onChange={(e) => {
                                            setAffiliateFilter(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="shadow-sm"
                                        style={{ borderRadius: '8px' }}
                                    >
                                        <option value="all">All Affiliates</option>
                                        {uniqueAffiliates.map((a) => (
                                            <option key={a} value={a}>
                                                {a}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>

                            {/* Outcome Filter */}
                            <Col md={4} lg={2}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold mb-2">
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="me-2"
                                            style={{ marginTop: '-3px' }}
                                        >
                                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                                        </svg>
                                        Outcome
                                    </Form.Label>
                                    <Form.Select
                                        value={outcomeFilter}
                                        onChange={(e) => {
                                            setOutcomeFilter(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="shadow-sm"
                                        style={{ borderRadius: '8px' }}
                                    >
                                        <option value="all">All Outcomes</option>
                                        {uniqueOutcomes.map((o) => (
                                            <option key={o} value={o}>
                                                {o}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>

                            {/* Action Buttons */}
                            <Col md={12} lg={2}>
                                <div className="d-flex gap-2">
                                    <Button
                                        variant="outline-secondary"
                                        onClick={handleClearFilters}
                                        className="flex-grow-1 shadow-sm"
                                        style={{ borderRadius: '8px' }}
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
                                            className="me-1"
                                            style={{ marginTop: '-2px' }}
                                        >
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                        Clear
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={() => navigate('/leads/import')}
                                        className="shadow-sm"
                                        style={{
                                            borderRadius: '8px',
                                            background:
                                                'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            border: 'none',
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
                                            className="me-1"
                                            style={{ marginTop: '-2px' }}
                                        >
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                            <polyline points="17 8 12 3 7 8"></polyline>
                                            <line x1="12" y1="3" x2="12" y2="15"></line>
                                        </svg>
                                        Import
                                    </Button>
                                </div>
                            </Col>
                        </Row>
                    </Form>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <div
                    className="alert alert-danger shadow-sm d-flex align-items-center mb-4"
                    style={{ borderRadius: '12px' }}
                >
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="me-2 flex-shrink-0"
                    >
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                    {error}
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="text-center py-5">
                    <Spinner
                        animation="border"
                        style={{ width: '3rem', height: '3rem', color: '#667eea' }}
                    />
                    <p className="text-muted mt-3 mb-0">Loading leads...</p>
                </div>
            )}

            {/* Data Table */}
            {!loading && all.length > 0 && (
                <>
                    <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <Table hover responsive className="mb-0">
                                <thead
                                    style={{
                                        background: '#f8f9fa',
                                        borderBottom: '2px solid #dee2e6',
                                    }}
                                >
                                    <tr>
                                        <th
                                            style={{
                                                fontWeight: 600,
                                                fontSize: '0.875rem',
                                                color: '#495057',
                                                padding: '1rem 0.75rem',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                            }}
                                        >
                                            Time Received
                                        </th>
                                        <th
                                            style={{
                                                fontWeight: 600,
                                                fontSize: '0.875rem',
                                                color: '#495057',
                                                padding: '1rem 0.75rem',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                            }}
                                        >
                                            Name
                                        </th>
                                        <th
                                            style={{
                                                fontWeight: 600,
                                                fontSize: '0.875rem',
                                                color: '#495057',
                                                padding: '1rem 0.75rem',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                            }}
                                        >
                                            Cell
                                        </th>
                                        <th
                                            style={{
                                                fontWeight: 600,
                                                fontSize: '0.875rem',
                                                color: '#495057',
                                                padding: '1rem 0.75rem',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                            }}
                                        >
                                            Franchise
                                        </th>
                                        <th
                                            style={{
                                                fontWeight: 600,
                                                fontSize: '0.875rem',
                                                color: '#495057',
                                                padding: '1rem 0.75rem',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                            }}
                                        >
                                            Affiliate
                                        </th>
                                        <th
                                            style={{
                                                fontWeight: 600,
                                                fontSize: '0.875rem',
                                                color: '#495057',
                                                padding: '1rem 0.75rem',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                            }}
                                        >
                                            Allocated To
                                        </th>
                                        <th
                                            style={{
                                                fontWeight: 600,
                                                fontSize: '0.875rem',
                                                color: '#495057',
                                                padding: '1rem 0.75rem',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                            }}
                                        >
                                            Outcome
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {all.map((lead) => (
                                        <tr
                                            key={lead.id}
                                            style={{
                                                borderBottom: '1px solid #e9ecef',
                                                transition: 'all 0.2s ease',
                                            }}
                                            className="lead-row"
                                        >
                                            <td
                                                className="text-nowrap"
                                                style={{ padding: '1rem 0.75rem' }}
                                            >
                                                {format(
                                                    new Date(lead.timeReceived),
                                                    'yyyy-MM-dd HH:mm'
                                                )}
                                            </td>
                                            <td
                                                style={{ padding: '1rem 0.75rem', fontWeight: 500 }}
                                            >
                                                {lead.name}
                                                {lead.idNumber !== 'N/A' && (
                                                    <div className="small text-muted mt-1">
                                                        ID: {lead.idNumber}
                                                    </div>
                                                )}
                                            </td>
                                            <td
                                                className="text-nowrap"
                                                style={{ padding: '1rem 0.75rem' }}
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
                                                    className="me-2 text-muted"
                                                    style={{ marginTop: '-2px' }}
                                                >
                                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                                </svg>
                                                {formatPhoneNumber(lead.cell)}
                                            </td>
                                            <td style={{ padding: '1rem 0.75rem' }}>
                                                <Badge bg="secondary" className="px-3 py-2">
                                                    {lead.franchise}
                                                </Badge>
                                            </td>
                                            <td style={{ padding: '1rem 0.75rem' }}>
                                                {lead.affiliate}
                                            </td>
                                            <td style={{ padding: '1rem 0.75rem' }}>
                                                {lead.allocatedTo !== 'Unassigned' ? (
                                                    <Badge bg="info" className="px-3 py-2">
                                                        {lead.allocatedTo}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted">Unassigned</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '1rem 0.75rem' }}>
                                                <Badge
                                                    bg={
                                                        lead.leadOutcome === 'Pending'
                                                            ? 'warning'
                                                            : lead.leadOutcome
                                                                    .toLowerCase()
                                                                    .includes('success') ||
                                                                lead.leadOutcome
                                                                    .toLowerCase()
                                                                    .includes('converted')
                                                              ? 'success'
                                                              : 'secondary'
                                                    }
                                                    className="px-3 py-2"
                                                >
                                                    {lead.leadOutcome}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <style>{`
                                    .lead-row:hover {
                                        background-color: #f8f9fa;
                                        transform: translateY(-1px);
                                        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                                    }
                                `}</style>
                            </Table>
                        </div>

                        {/* Pagination Footer */}
                        {totalPages > 1 && (
                            <div
                                className="d-flex justify-content-between align-items-center px-4 py-3"
                                style={{
                                    borderTop: '1px solid #e9ecef',
                                    background: '#f8f9fa',
                                    borderRadius: '0 0 12px 12px',
                                }}
                            >
                                <div className="text-muted">
                                    Page <span className="fw-semibold">{currentPage}</span> of{' '}
                                    <span className="fw-semibold">{totalPages}</span>
                                </div>
                                <Pagination className="mb-0" size="sm">
                                    <Pagination.First
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(1)}
                                    />
                                    <Pagination.Prev
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(currentPage - 1)}
                                    />
                                    <Pagination.Item active>
                                        {currentPage} / {totalPages}
                                    </Pagination.Item>
                                    <Pagination.Next
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(currentPage + 1)}
                                    />
                                    <Pagination.Last
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(totalPages)}
                                    />
                                </Pagination>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Empty State */}
            {!loading && all.length === 0 && !error && (
                <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                    <div className="card-body text-center py-5">
                        <div
                            className="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                            style={{ width: '80px', height: '80px' }}
                        >
                            <svg
                                width="40"
                                height="40"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#667eea"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="8.5" cy="7" r="4"></circle>
                                <polyline points="17 11 19 13 23 9"></polyline>
                            </svg>
                        </div>
                        <h4 className="mb-2">No Leads Found</h4>
                        <p className="text-muted mb-4">
                            {searchQuery ||
                            franchiseFilter !== 'all' ||
                            affiliateFilter !== 'all' ||
                            outcomeFilter !== 'all'
                                ? 'Try adjusting your filters or search criteria'
                                : 'Import a CSV file to get started'}
                        </p>
                        <Button
                            variant="primary"
                            onClick={() => navigate('/leads/import')}
                            className="shadow-sm"
                            style={{
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                border: 'none',
                            }}
                        >
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="me-2"
                                style={{ marginTop: '-3px' }}
                            >
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="17 8 12 3 7 8"></polyline>
                                <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                            Import Leads
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
