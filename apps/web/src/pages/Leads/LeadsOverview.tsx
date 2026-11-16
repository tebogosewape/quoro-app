import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Spinner } from 'react-bootstrap';
import { getLeads, type Lead, type LeadSearchQuery, formatPhoneNumber } from '@/api/leads.api';
import { format } from 'date-fns';
import './LeadsOverview.css';

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

function getOutcomeTone(outcome: string) {
    const normalized = outcome.toLowerCase();

    if (normalized === 'pending') return 'pending';
    if (normalized.includes('success') || normalized.includes('converted')) return 'success';
    if (
        normalized.includes('failed') ||
        normalized.includes('rejected') ||
        normalized.includes('declined')
    ) {
        return 'danger';
    }
    return 'neutral';
}

function isPendingOutcome(outcome: string) {
    const normalized = outcome.trim().toLowerCase();
    return normalized === 'pending' || normalized === 'not processed';
}

export default function LeadsOverview() {
    const navigate = useNavigate();

    // API State
    const [all, setAll] = useState<LeadListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter State
    const [searchInput, setSearchInput] = useState('');
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
    const pendingLeads = all.filter((lead) => isPendingOutcome(lead.leadOutcome)).length;
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
        setSearchQuery(searchInput.trim());
        setCurrentPage(1);
    };

    const handleClearFilters = () => {
        setSearchInput('');
        setSearchQuery('');
        setFranchiseFilter('all');
        setAffiliateFilter('all');
        setOutcomeFilter('all');
        setCurrentPage(1);
    };

    return (
        <main className="leads-overview-screen">
            <header className="leads-overview-header">
                <div className="leads-overview-header__title">
                    <span className="leads-overview-header__icon" aria-hidden="true">
                        <i className="fa-solid fa-user-group" />
                    </span>
                    <div>
                        <h1>Leads Management</h1>
                        <p>Track, filter and manage incoming leads</p>
                    </div>
                </div>
                <Button
                    type="button"
                    className="leads-overview-primary-action"
                    onClick={() => navigate('/leads/import')}
                >
                    <i className="fa-solid fa-file-import" aria-hidden="true" />
                    Import leads
                </Button>
            </header>

            <section className="leads-overview-stats" aria-label="Lead summary">
                <article className="leads-overview-stat leads-overview-stat--total">
                    <span className="leads-overview-stat__icon" aria-hidden="true">
                        <i className="fa-solid fa-layer-group" />
                    </span>
                    <div>
                        <span>Total leads</span>
                        <strong>{totalLeads}</strong>
                    </div>
                </article>
                <article className="leads-overview-stat leads-overview-stat--pending">
                    <span className="leads-overview-stat__icon" aria-hidden="true">
                        <i className="fa-regular fa-clock" />
                    </span>
                    <div>
                        <span>Pending on page</span>
                        <strong>{pendingLeads}</strong>
                    </div>
                </article>
                <article className="leads-overview-stat leads-overview-stat--assigned">
                    <span className="leads-overview-stat__icon" aria-hidden="true">
                        <i className="fa-solid fa-user-check" />
                    </span>
                    <div>
                        <span>Assigned on page</span>
                        <strong>{assignedLeads}</strong>
                    </div>
                </article>
            </section>

            <section className="leads-overview-workspace" aria-label="Lead directory">
                <Form className="leads-overview-toolbar" onSubmit={handleSearch}>
                    <Form.Group className="leads-overview-search" controlId="lead-search">
                        <Form.Label>Search leads</Form.Label>
                        <span className="leads-overview-search__control">
                            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                            <Form.Control
                                type="search"
                                placeholder="Name, cell or ID number"
                                value={searchInput}
                                onChange={(event) => setSearchInput(event.target.value)}
                            />
                        </span>
                    </Form.Group>

                    <Form.Group className="leads-overview-filter" controlId="lead-franchise">
                        <Form.Label>Franchise</Form.Label>
                        <Form.Select
                            value={franchiseFilter}
                            onChange={(event) => {
                                setFranchiseFilter(event.target.value);
                                setCurrentPage(1);
                            }}
                        >
                            <option value="all">All franchises</option>
                            {uniqueFranchises.map((franchise) => (
                                <option key={franchise} value={franchise}>
                                    {franchise}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>

                    <Form.Group className="leads-overview-filter" controlId="lead-affiliate">
                        <Form.Label>Affiliate</Form.Label>
                        <Form.Select
                            value={affiliateFilter}
                            onChange={(event) => {
                                setAffiliateFilter(event.target.value);
                                setCurrentPage(1);
                            }}
                        >
                            <option value="all">All affiliates</option>
                            {uniqueAffiliates.map((affiliate) => (
                                <option key={affiliate} value={affiliate}>
                                    {affiliate}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>

                    <Form.Group className="leads-overview-filter" controlId="lead-outcome">
                        <Form.Label>Outcome</Form.Label>
                        <Form.Select
                            value={outcomeFilter}
                            onChange={(event) => {
                                setOutcomeFilter(event.target.value);
                                setCurrentPage(1);
                            }}
                        >
                            <option value="all">All outcomes</option>
                            {uniqueOutcomes.map((outcome) => (
                                <option key={outcome} value={outcome}>
                                    {outcome}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>

                    <div className="leads-overview-toolbar__actions">
                        <Button type="submit" className="leads-overview-search-button">
                            Search
                        </Button>
                        <Button
                            type="button"
                            variant="outline-secondary"
                            className="leads-overview-clear-button"
                            onClick={handleClearFilters}
                        >
                            Clear
                        </Button>
                    </div>
                </Form>

                {error && (
                    <div className="leads-overview-alert" role="alert">
                        <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
                        <span>{error}</span>
                    </div>
                )}

                {loading && (
                    <div className="leads-overview-state" aria-label="Loading leads">
                        <Spinner animation="border" size="sm" />
                        <span>Loading leads...</span>
                    </div>
                )}

                {!loading && all.length > 0 && (
                    <>
                        <div className="leads-overview-table-scroll">
                            <table className="leads-overview-table">
                                <thead>
                                    <tr>
                                        <th scope="col">Received</th>
                                        <th scope="col">Lead</th>
                                        <th scope="col">Cell</th>
                                        <th scope="col">Source</th>
                                        <th scope="col">Allocated to</th>
                                        <th scope="col">Outcome</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {all.map((lead) => (
                                        <tr key={lead.id}>
                                            <td className="leads-overview-date">
                                                {format(
                                                    new Date(lead.timeReceived),
                                                    'dd MMM yyyy, HH:mm'
                                                )}
                                            </td>
                                            <td>
                                                <strong className="leads-overview-name">
                                                    {lead.name}
                                                </strong>
                                                {lead.idNumber !== 'N/A' && (
                                                    <span className="leads-overview-secondary">
                                                        ID {lead.idNumber}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="leads-overview-cell">
                                                {formatPhoneNumber(lead.cell)}
                                            </td>
                                            <td>
                                                <span className="leads-overview-source">
                                                    {lead.franchise}
                                                </span>
                                                <span className="leads-overview-secondary">
                                                    {lead.affiliate}
                                                </span>
                                            </td>
                                            <td>
                                                <span
                                                    className={
                                                        'leads-overview-status ' +
                                                        (lead.allocatedTo === 'Unassigned'
                                                            ? 'leads-overview-status--unassigned'
                                                            : 'leads-overview-status--assigned')
                                                    }
                                                >
                                                    {lead.allocatedTo}
                                                </span>
                                            </td>
                                            <td>
                                                <span
                                                    className={
                                                        'leads-overview-status leads-overview-status--' +
                                                        getOutcomeTone(lead.leadOutcome)
                                                    }
                                                >
                                                    {lead.leadOutcome}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="leads-overview-mobile-list" aria-label="Lead results">
                            {all.map((lead) => (
                                <article className="leads-overview-mobile-card" key={lead.id}>
                                    <div className="leads-overview-mobile-card__header">
                                        <div>
                                            <strong>{lead.name}</strong>
                                            <span>
                                                {format(
                                                    new Date(lead.timeReceived),
                                                    'dd MMM yyyy, HH:mm'
                                                )}
                                            </span>
                                        </div>
                                        <span
                                            className={
                                                'leads-overview-status leads-overview-status--' +
                                                getOutcomeTone(lead.leadOutcome)
                                            }
                                        >
                                            {lead.leadOutcome}
                                        </span>
                                    </div>
                                    <dl className="leads-overview-mobile-card__details">
                                        <div>
                                            <dt>Cell</dt>
                                            <dd>{formatPhoneNumber(lead.cell)}</dd>
                                        </div>
                                        <div>
                                            <dt>Source</dt>
                                            <dd>
                                                {lead.franchise} · {lead.affiliate}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt>Allocated to</dt>
                                            <dd>{lead.allocatedTo}</dd>
                                        </div>
                                        {lead.idNumber !== 'N/A' && (
                                            <div>
                                                <dt>ID number</dt>
                                                <dd>{lead.idNumber}</dd>
                                            </div>
                                        )}
                                    </dl>
                                </article>
                            ))}
                        </div>

                        <footer className="leads-overview-pagination">
                            <span>
                                Page <strong>{currentPage}</strong> of{' '}
                                <strong>{Math.max(totalPages, 1)}</strong>
                            </span>
                            <div aria-label="Lead pagination">
                                <Button
                                    type="button"
                                    variant="outline-secondary"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(1)}
                                    aria-label="First page"
                                >
                                    <i className="fa-solid fa-angles-left" aria-hidden="true" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline-secondary"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage((page) => page - 1)}
                                    aria-label="Previous page"
                                >
                                    <i className="fa-solid fa-angle-left" aria-hidden="true" />
                                </Button>
                                <span className="leads-overview-pagination__current">
                                    {currentPage}
                                </span>
                                <Button
                                    type="button"
                                    variant="outline-secondary"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage((page) => page + 1)}
                                    aria-label="Next page"
                                >
                                    <i className="fa-solid fa-angle-right" aria-hidden="true" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline-secondary"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(totalPages)}
                                    aria-label="Last page"
                                >
                                    <i className="fa-solid fa-angles-right" aria-hidden="true" />
                                </Button>
                            </div>
                        </footer>
                    </>
                )}

                {!loading && all.length === 0 && !error && (
                    <div className="leads-overview-state leads-overview-empty">
                        <span className="leads-overview-empty__icon" aria-hidden="true">
                            <i className="fa-solid fa-user-group" />
                        </span>
                        <h2>No leads found</h2>
                        <p>
                            {searchQuery ||
                            franchiseFilter !== 'all' ||
                            affiliateFilter !== 'all' ||
                            outcomeFilter !== 'all'
                                ? 'No records match the current search and filters.'
                                : 'Import a lead file to create the first records.'}
                        </p>
                        <Button
                            type="button"
                            className="leads-overview-primary-action"
                            onClick={() => navigate('/leads/import')}
                        >
                            Import leads
                        </Button>
                    </div>
                )}
            </section>
        </main>
    );
}
