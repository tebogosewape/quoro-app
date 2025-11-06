import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Form, Button, Spinner, Badge, Table, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faMagnifyingGlass,
    faFilter,
    faFileImport,
    faPhone,
    faBuilding,
    faUserTie,
} from '@fortawesome/free-solid-svg-icons';
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
        <Container fluid className="py-4">
            {/* Header */}
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h2 className="mb-1">Leads Management</h2>
                            <p className="text-muted">
                                {totalLeads} total lead{totalLeads !== 1 ? 's' : ''}
                            </p>
                        </div>
                        <Button variant="primary" onClick={() => navigate('/leads/import')}>
                            <FontAwesomeIcon icon={faFileImport} className="me-2" />
                            Import Leads
                        </Button>
                    </div>
                </Col>
            </Row>

            {/* Search and Filters */}
            <Row className="mb-4">
                <Col>
                    <Card>
                        <Card.Body>
                            <Form onSubmit={handleSearch}>
                                <Row className="g-3">
                                    {/* Search */}
                                    <Col md={12} lg={4}>
                                        <Form.Group>
                                            <Form.Label className="small">Search</Form.Label>
                                            <div className="input-group">
                                                <Form.Control
                                                    type="text"
                                                    placeholder="Search by name, cell, ID..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                />
                                                <Button variant="outline-secondary" type="submit">
                                                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                                                </Button>
                                            </div>
                                        </Form.Group>
                                    </Col>

                                    {/* Franchise Filter */}
                                    <Col md={4} lg={2}>
                                        <Form.Group>
                                            <Form.Label className="small">
                                                <FontAwesomeIcon
                                                    icon={faBuilding}
                                                    className="me-1"
                                                />
                                                Franchise
                                            </Form.Label>
                                            <Form.Select
                                                value={franchiseFilter}
                                                onChange={(e) => {
                                                    setFranchiseFilter(e.target.value);
                                                    setCurrentPage(1);
                                                }}
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
                                            <Form.Label className="small">
                                                <FontAwesomeIcon
                                                    icon={faUserTie}
                                                    className="me-1"
                                                />
                                                Affiliate
                                            </Form.Label>
                                            <Form.Select
                                                value={affiliateFilter}
                                                onChange={(e) => {
                                                    setAffiliateFilter(e.target.value);
                                                    setCurrentPage(1);
                                                }}
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
                                            <Form.Label className="small">
                                                <FontAwesomeIcon icon={faFilter} className="me-1" />
                                                Outcome
                                            </Form.Label>
                                            <Form.Select
                                                value={outcomeFilter}
                                                onChange={(e) => {
                                                    setOutcomeFilter(e.target.value);
                                                    setCurrentPage(1);
                                                }}
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

                                    {/* Clear Filters */}
                                    <Col md={12} lg={2} className="d-flex align-items-end">
                                        <Button
                                            variant="outline-secondary"
                                            onClick={handleClearFilters}
                                            className="w-100"
                                        >
                                            Clear Filters
                                        </Button>
                                    </Col>
                                </Row>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Error State */}
            {error && (
                <Row className="mb-3">
                    <Col>
                        <div className="alert alert-danger">{error}</div>
                    </Col>
                </Row>
            )}

            {/* Loading State */}
            {loading && (
                <Row>
                    <Col className="text-center py-5">
                        <Spinner animation="border" variant="primary" />
                        <p className="mt-3 text-muted">Loading leads...</p>
                    </Col>
                </Row>
            )}

            {/* Data Table */}
            {!loading && all.length > 0 && (
                <>
                    <Row>
                        <Col>
                            <Card>
                                <Table responsive hover className="mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Time Received</th>
                                            <th>Name</th>
                                            <th>Cell</th>
                                            <th>Franchise</th>
                                            <th>Affiliate</th>
                                            <th>Allocated To</th>
                                            <th>Outcome</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {all.map((lead) => (
                                            <tr key={lead.id}>
                                                <td className="text-nowrap">
                                                    {format(
                                                        new Date(lead.timeReceived),
                                                        'yyyy-MM-dd HH:mm'
                                                    )}
                                                </td>
                                                <td>
                                                    {lead.name}
                                                    {lead.idNumber !== 'N/A' && (
                                                        <div className="small text-muted">
                                                            ID: {lead.idNumber}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="text-nowrap">
                                                    <FontAwesomeIcon
                                                        icon={faPhone}
                                                        className="me-2 text-muted"
                                                    />
                                                    {formatPhoneNumber(lead.cell)}
                                                </td>
                                                <td>
                                                    <Badge bg="secondary">{lead.franchise}</Badge>
                                                </td>
                                                <td>{lead.affiliate}</td>
                                                <td>
                                                    {lead.allocatedTo !== 'Unassigned' ? (
                                                        <Badge bg="info">{lead.allocatedTo}</Badge>
                                                    ) : (
                                                        <span className="text-muted">
                                                            Unassigned
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
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
                                                    >
                                                        {lead.leadOutcome}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </Card>
                        </Col>
                    </Row>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <Row className="mt-3">
                            <Col className="d-flex justify-content-center">
                                <nav>
                                    <ul className="pagination">
                                        <li
                                            className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}
                                        >
                                            <button
                                                className="page-link"
                                                onClick={() => setCurrentPage(currentPage - 1)}
                                                disabled={currentPage === 1}
                                            >
                                                Previous
                                            </button>
                                        </li>
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                                            (page) => (
                                                <li
                                                    key={page}
                                                    className={`page-item ${currentPage === page ? 'active' : ''}`}
                                                >
                                                    <button
                                                        className="page-link"
                                                        onClick={() => setCurrentPage(page)}
                                                    >
                                                        {page}
                                                    </button>
                                                </li>
                                            )
                                        )}
                                        <li
                                            className={`page-item ${
                                                currentPage === totalPages ? 'disabled' : ''
                                            }`}
                                        >
                                            <button
                                                className="page-link"
                                                onClick={() => setCurrentPage(currentPage + 1)}
                                                disabled={currentPage === totalPages}
                                            >
                                                Next
                                            </button>
                                        </li>
                                    </ul>
                                </nav>
                            </Col>
                        </Row>
                    )}
                </>
            )}

            {/* Empty State */}
            {!loading && all.length === 0 && !error && (
                <Row>
                    <Col className="text-center py-5">
                        <FontAwesomeIcon
                            icon={faFileImport}
                            size="3x"
                            className="text-muted mb-3"
                        />
                        <h4>No Leads Found</h4>
                        <p className="text-muted">
                            {searchQuery ||
                            franchiseFilter !== 'all' ||
                            affiliateFilter !== 'all' ||
                            outcomeFilter !== 'all'
                                ? 'Try adjusting your filters or search criteria'
                                : 'Import a CSV file to get started'}
                        </p>
                        <Button variant="primary" onClick={() => navigate('/leads/import')}>
                            <FontAwesomeIcon icon={faFileImport} className="me-2" />
                            Import Leads
                        </Button>
                    </Col>
                </Row>
            )}
        </Container>
    );
}
