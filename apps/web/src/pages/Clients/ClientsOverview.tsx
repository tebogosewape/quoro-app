import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faFilter } from '@fortawesome/free-solid-svg-icons';
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

    const statusChipColor: Record<ClientListItem['status'], string> = {
        new: '#6ea8fe',
        active: '#2ecc71',
        awaiting_payment: '#f39c12',
        documents_outstanding: '#ff7675',
        finalised: '#08b494',
    };

    // Simple table headers without client-side sorting for now

    return (
        <div className="container-fluid py-3">
            {/* Error Alert */}
            {error && (
                <div
                    className="alert alert-danger mb-3 d-flex align-items-center justify-content-between"
                    role="alert"
                >
                    <div>{error}</div>
                    <Button
                        variant="link"
                        size="sm"
                        onClick={() => {
                            setError(null);
                            setCurrentPage(1);
                        }}
                        className="ms-2 p-0"
                    >
                        Retry
                    </Button>
                </div>
            )}

            {/* Controls */}
            <div className="panel glass p-3 mb-3">
                <div className="d-flex flex-wrap gap-2 align-items-center">
                    <div className="d-flex align-items-center gap-2">
                        <FontAwesomeIcon icon={faMagnifyingGlass} />
                        <Form.Control
                            value={q}
                            onChange={(e) => setQ(e.currentTarget.value)}
                            placeholder="Search name, ID, phone, product…"
                            style={{ minWidth: 280 }}
                            disabled={loading}
                        />
                    </div>

                    <div className="d-flex align-items-center gap-2">
                        <FontAwesomeIcon icon={faFilter} className="text-muted" />
                        <Form.Select
                            value={status}
                            onChange={(e) =>
                                setStatus(e.currentTarget.value as 'all' | ClientListItem['status'])
                            }
                            disabled={loading}
                        >
                            <option value="all">All statuses</option>
                            <option value="new">New</option>
                            <option value="active">Active</option>
                            <option value="awaiting_payment">Awaiting payment</option>
                            <option value="documents_outstanding">Documents outstanding</option>
                            <option value="finalised">Finalised</option>
                        </Form.Select>

                        <Form.Select disabled={loading || agents.length === 0} onChange={() => {}}>
                            <option value="all">All agents</option>
                            {agents.map((a) => (
                                <option key={a} value={a}>
                                    {a}
                                </option>
                            ))}
                        </Form.Select>
                    </div>

                    <div className="ms-auto text-muted">
                        {loading ? (
                            <Spinner animation="border" size="sm" className="me-2" />
                        ) : (
                            `${all.length} result${all.length === 1 ? '' : 's'}`
                        )}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="panel glass p-0">
                <div className="table-responsive">
                    <table className="table mb-0 align-middle">
                        <thead>
                            <tr>
                                <th>Client</th>
                                <th>File ID</th>
                                <th>Product</th>
                                <th>Status</th>
                                <th>Agent</th>
                                <th>Last activity</th>
                                <th>Balance</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-5">
                                        <Spinner animation="border" role="status">
                                            <span className="visually-hidden">
                                                Loading clients...
                                            </span>
                                        </Spinner>
                                    </td>
                                </tr>
                            ) : all.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center text-muted py-5">
                                        No clients found.
                                    </td>
                                </tr>
                            ) : (
                                all.map((c) => (
                                    <tr key={c.id}>
                                        <td>
                                            <div className="fw-semibold">{c.name}</div>
                                            <div className="text-muted" style={{ fontSize: 12 }}>
                                                {c.phone} • {c.email}
                                            </div>
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{c.id}</td>
                                        <td>{c.product}</td>
                                        <td>
                                            <span
                                                className="badge"
                                                style={{
                                                    borderColor: statusChipColor[c.status],
                                                    color: statusChipColor[c.status],
                                                    background: 'transparent',
                                                    textTransform: 'capitalize',
                                                }}
                                            >
                                                {c.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td>{c.agent}</td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            {new Date(c.lastActivity).toLocaleDateString()}
                                        </td>
                                        <td>{money(c.balance)}</td>
                                        <td className="text-end" style={{ whiteSpace: 'nowrap' }}>
                                            <Button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => navigate(`/clients/${c.id}`)}
                                            >
                                                Open
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div
                    className="d-flex justify-content-between align-items-center p-2 border-top"
                    style={{ borderColor: 'var(--glass-border)' }}
                >
                    <div className="text-muted" style={{ fontSize: 13 }}>
                        Page {currentPage} of {totalPages}
                    </div>
                    <div className="d-flex gap-2">
                        <Button
                            className="btn btn-light btn-sm"
                            disabled={currentPage <= 1 || loading}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            style={{ border: '1px solid var(--glass-border)' }}
                        >
                            Prev
                        </Button>
                        <Button
                            className="btn btn-light btn-sm"
                            disabled={currentPage >= totalPages || loading}
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            style={{ border: '1px solid var(--glass-border)' }}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
