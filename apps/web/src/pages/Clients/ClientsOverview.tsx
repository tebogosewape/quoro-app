import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Spinner, Badge, Table, Pagination } from 'react-bootstrap';
import {
    getClients,
    type Client,
    type ClientSearchQuery,
    clientStatusEnum,
} from '@/api/clients.api';
import type { z } from 'zod';

/** Simple money helper (kept local so this file is drop-in) */
const money = (n: number) =>
    new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: 'ZAR',
        maximumFractionDigits: 0,
    }).format(Number.isFinite(n) ? n : 0);

type ClientListItem = {
    id: string; // e.g. KH12919
    name: string; // e.g. Mr KT PHALATSE
    phone: string;
    email: string;
    nationalId: string;
    status: 'new' | 'active' | 'awaiting_payment' | 'documents_outstanding' | 'finalised';
    product: string; // primary product label
    createdAt: string; // ISO
    lastActivity: string; // ISO
    agent: string; // assigned agent
    balance: number; // outstanding balance
};

/**
 * Map backend ClientStatus to frontend ClientListItem status
 */
function mapBackendStatusToFrontend(
    status: z.infer<typeof clientStatusEnum>
): ClientListItem['status'] {
    const map: Record<string, ClientListItem['status']> = {
        lead: 'new',
        consultation_scheduled: 'new',
        documentation_pending: 'documents_outstanding',
        under_review: 'new',
        approved: 'active',
        rejected: 'new',
        active: 'active',
        completed: 'finalised',
        withdrawn: 'finalised',
    };
    return map[status] || 'new';
}

/**
 * Convert API Client response to ClientListItem for display
 */
function mapClientsToListItems(clients: Client[]): ClientListItem[] {
    return clients.map((c) => {
        const product = c.clientProducts?.[0]?.productName ?? 'N/A';
        const agentName = c.assignedAgent
            ? `${c.assignedAgent.firstName} ${c.assignedAgent.lastName ?? ''}`.trim()
            : 'Unassigned';
        return {
            id: c.id,
            name: `${c.firstName} ${c.lastName}`,
            phone: c.phoneNumber,
            email: c.email,
            nationalId: c.idNumber,
            status: mapBackendStatusToFrontend(c.status as z.infer<typeof clientStatusEnum>),
            product,
            createdAt: c.createdAt,
            lastActivity: c.updatedAt,
            agent: agentName,
            balance: c.totalDebt || 0,
        };
    });
}

// removed unused seedDirectory

// Note: server-side sorting, local SortKey type removed

export default function ClientsOverview() {
    const navigate = useNavigate();

    // API State
    const [all, setAll] = useState<ClientListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter State
    const [q, setQ] = useState('');
    const [status, setStatus] = useState<'all' | ClientListItem['status']>('all');
    // Note: server-side sorting for now

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalClients, setTotalClients] = useState(0);

    // Calculate stats
    const activeClients = all.filter((c) => c.status === 'active').length;
    const newClients = all.filter((c) => c.status === 'new').length;

    // Error message helper function for user-friendly messages
    const getErrorMessage = (err: unknown): string => {
        if (err instanceof Error) {
            const message = err.message.toLowerCase();

            // Check for specific error patterns
            if (message.includes('internal server error') || message.includes('500')) {
                return 'The server encountered an error loading clients. Please try again.';
            }
            if (message.includes('not found') || message.includes('404')) {
                return 'The requested clients could not be found.';
            }
            if (message.includes('unauthorized') || message.includes('401')) {
                return 'You do not have permission to view clients.';
            }
            if (message.includes('network error') || message.includes('timeout')) {
                return 'Network connection error. Please check your internet connection and try again.';
            }
            return err.message;
        }
        return 'Failed to fetch clients. Please try again.';
    };

    // Fetch clients from API
    useEffect(() => {
        let isMounted = true;

        const fetchClients = async () => {
            setLoading(true);
            setError(null);
            try {
                // Map frontend status to backend status enum if needed
                let backendStatus: z.infer<typeof clientStatusEnum> | undefined;
                if (status !== 'all') {
                    const statusMap: Record<ClientListItem['status'], string> = {
                        new: 'lead',
                        active: 'active',
                        awaiting_payment: 'lead',
                        documents_outstanding: 'documentation_pending',
                        finalised: 'completed',
                    };
                    backendStatus = statusMap[status] as z.infer<typeof clientStatusEnum>;
                }

                const query: ClientSearchQuery = {
                    page: currentPage,
                    limit: 12,
                    search: q.trim() || undefined,
                    status: backendStatus,
                };

                const response = await getClients(query);

                if (isMounted) {
                    setAll(mapClientsToListItems(response.data));
                    setTotalPages(response.meta.totalPages);
                    setTotalClients(response.meta.total);
                }
            } catch (err) {
                if (isMounted) {
                    setError(getErrorMessage(err));
                    console.error('[ClientsOverview] Fetch error:', err);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchClients();

        return () => {
            isMounted = false;
        };
    }, [currentPage, q, status]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [q, status]);

    const agents = useMemo(() => Array.from(new Set(all.map((c) => c.agent))).sort(), [all]);

    // Note: list is already filtered/sorted by API

    const statusBadgeVariant: Record<ClientListItem['status'], string> = {
        new: 'primary',
        active: 'success',
        awaiting_payment: 'warning',
        documents_outstanding: 'danger',
        finalised: 'info',
    };

    // Simple table headers without client-side sorting for now

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
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="8.5" cy="7" r="4"></circle>
                                        <line x1="17" y1="11" x2="23" y2="11"></line>
                                        <line x1="20" y1="8" x2="20" y2="14"></line>
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-white mb-1 fw-bold">Clients Overview</h2>
                                    <p className="text-white text-opacity-75 mb-0">
                                        Manage all your clients and their accounts
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="row g-3 text-white">
                                <div className="col-4">
                                    <div className="text-center">
                                        <div className="fs-3 fw-bold">{totalClients}</div>
                                        <div className="small opacity-75">Total Clients</div>
                                    </div>
                                </div>
                                <div className="col-4">
                                    <div className="text-center">
                                        <div className="fs-3 fw-bold">{activeClients}</div>
                                        <div className="small opacity-75">Active</div>
                                    </div>
                                </div>
                                <div className="col-4">
                                    <div className="text-center">
                                        <div className="fs-3 fw-bold">{newClients}</div>
                                        <div className="small opacity-75">New</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <div
                    className="alert alert-danger shadow-sm d-flex align-items-center justify-content-between mb-4"
                    style={{ borderRadius: '12px' }}
                >
                    <div className="d-flex align-items-center">
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
                    <Button
                        variant="link"
                        size="sm"
                        onClick={() => {
                            setError(null);
                            setCurrentPage(1);
                        }}
                        className="ms-2"
                    >
                        Retry
                    </Button>
                </div>
            )}

            {/* Search and Filters Card */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '12px' }}>
                <div className="card-body p-4">
                    <div className="row g-3 align-items-end">
                        {/* Search */}
                        <div className="col-md-4">
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
                                    value={q}
                                    onChange={(e) => setQ(e.currentTarget.value)}
                                    placeholder="Search name, ID, phone, product..."
                                    disabled={loading}
                                    className="border-start-0"
                                    style={{ borderRadius: '0 8px 8px 0' }}
                                />
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div className="col-md-3">
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
                                Status
                            </Form.Label>
                            <Form.Select
                                value={status}
                                onChange={(e) =>
                                    setStatus(
                                        e.currentTarget.value as 'all' | ClientListItem['status']
                                    )
                                }
                                disabled={loading}
                                className="shadow-sm"
                                style={{ borderRadius: '8px' }}
                            >
                                <option value="all">All statuses</option>
                                <option value="new">New</option>
                                <option value="active">Active</option>
                                <option value="awaiting_payment">Awaiting payment</option>
                                <option value="documents_outstanding">Documents outstanding</option>
                                <option value="finalised">Finalised</option>
                            </Form.Select>
                        </div>

                        {/* Agent Filter */}
                        <div className="col-md-3">
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
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="8.5" cy="7" r="4"></circle>
                                    <line x1="20" y1="8" x2="20" y2="14"></line>
                                    <line x1="23" y1="11" x2="17" y2="11"></line>
                                </svg>
                                Agent
                            </Form.Label>
                            <Form.Select
                                disabled={loading || agents.length === 0}
                                onChange={() => {}}
                                className="shadow-sm"
                                style={{ borderRadius: '8px' }}
                            >
                                <option value="all">All agents</option>
                                {agents.map((a) => (
                                    <option key={a} value={a}>
                                        {a}
                                    </option>
                                ))}
                            </Form.Select>
                        </div>

                        {/* Results Count */}
                        <div className="col-md-2 text-end">
                            <div className="text-muted small mb-2">Results</div>
                            <div className="fs-5 fw-semibold">
                                {loading ? (
                                    <Spinner animation="border" size="sm" />
                                ) : (
                                    `${all.length}`
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                <div style={{ overflowX: 'auto' }}>
                    <Table hover responsive className="mb-0">
                        <thead style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
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
                                    Client
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
                                    File ID
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
                                    Product
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
                                    Status
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
                                    Agent
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
                                    Last Activity
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
                                    Balance
                                </th>
                                <th
                                    style={{
                                        fontWeight: 600,
                                        fontSize: '0.875rem',
                                        color: '#495057',
                                        padding: '1rem 0.75rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        width: '100px',
                                    }}
                                />
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-5">
                                        <Spinner
                                            animation="border"
                                            style={{
                                                width: '3rem',
                                                height: '3rem',
                                                color: '#667eea',
                                            }}
                                        />
                                        <p className="text-muted mt-3 mb-0">Loading clients...</p>
                                    </td>
                                </tr>
                            ) : all.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-5">
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
                                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                                <circle cx="8.5" cy="7" r="4"></circle>
                                                <line x1="17" y1="11" x2="23" y2="11"></line>
                                                <line x1="20" y1="8" x2="20" y2="14"></line>
                                            </svg>
                                        </div>
                                        <h5 className="mb-2">No clients found</h5>
                                        <p className="text-muted mb-0">
                                            Try adjusting your search or filters
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                all.map((c) => (
                                    <tr
                                        key={c.id}
                                        style={{
                                            borderBottom: '1px solid #e9ecef',
                                            transition: 'all 0.2s ease',
                                        }}
                                        className="client-row"
                                    >
                                        <td style={{ padding: '1rem 0.75rem' }}>
                                            <div className="fw-semibold">{c.name}</div>
                                            <div className="small text-muted mt-1">
                                                <svg
                                                    width="12"
                                                    height="12"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    className="me-1"
                                                    style={{ marginTop: '-2px' }}
                                                >
                                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                                </svg>
                                                {c.phone}
                                                <span className="mx-1">•</span>
                                                <svg
                                                    width="12"
                                                    height="12"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    className="me-1"
                                                    style={{ marginTop: '-2px' }}
                                                >
                                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                                    <polyline points="22,6 12,13 2,6"></polyline>
                                                </svg>
                                                {c.email}
                                            </div>
                                        </td>
                                        <td
                                            style={{
                                                padding: '1rem 0.75rem',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            <code className="bg-light px-2 py-1 rounded">
                                                {c.id}
                                            </code>
                                        </td>
                                        <td style={{ padding: '1rem 0.75rem' }}>{c.product}</td>
                                        <td style={{ padding: '1rem 0.75rem' }}>
                                            <Badge
                                                bg={statusBadgeVariant[c.status]}
                                                className="px-3 py-2"
                                                style={{ textTransform: 'capitalize' }}
                                            >
                                                {c.status.replace('_', ' ')}
                                            </Badge>
                                        </td>
                                        <td style={{ padding: '1rem 0.75rem' }}>{c.agent}</td>
                                        <td
                                            style={{
                                                padding: '1rem 0.75rem',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {new Date(c.lastActivity).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '1rem 0.75rem', fontWeight: 500 }}>
                                            {money(c.balance)}
                                        </td>
                                        <td
                                            className="text-end"
                                            style={{
                                                padding: '1rem 0.75rem',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            <Button
                                                size="sm"
                                                onClick={() => navigate(`/clients/${c.id}`)}
                                                className="shadow-sm"
                                                style={{
                                                    borderRadius: '8px',
                                                    background:
                                                        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                    border: 'none',
                                                }}
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
                                                    className="me-1"
                                                    style={{ marginTop: '-2px' }}
                                                >
                                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                                    <polyline points="15 3 21 3 21 9"></polyline>
                                                    <line x1="10" y1="14" x2="21" y2="3"></line>
                                                </svg>
                                                Open
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        <style>{`
                            .client-row:hover {
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
                                disabled={currentPage <= 1 || loading}
                                onClick={() => setCurrentPage(1)}
                            />
                            <Pagination.Prev
                                disabled={currentPage <= 1 || loading}
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            />
                            <Pagination.Item active>
                                {currentPage} / {totalPages}
                            </Pagination.Item>
                            <Pagination.Next
                                disabled={currentPage >= totalPages || loading}
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            />
                            <Pagination.Last
                                disabled={currentPage >= totalPages || loading}
                                onClick={() => setCurrentPage(totalPages)}
                            />
                        </Pagination>
                    </div>
                )}
            </div>
        </div>
    );
}
