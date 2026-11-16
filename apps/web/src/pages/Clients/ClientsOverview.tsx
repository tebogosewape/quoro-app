import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Pagination, Spinner } from 'react-bootstrap';
import {
    getClients,
    type Client,
    type ClientSearchQuery,
    clientStatusEnum,
} from '@/api/clients.api';
import type { z } from 'zod';
import { hasPermission } from '@/utils/permissions';
import './ClientsOverview.css';

const money = (value: number) =>
    new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: 'ZAR',
        maximumFractionDigits: 0,
    }).format(Number.isFinite(value) ? value : 0);

type ClientListItem = {
    id: string;
    fileReference: string;
    name: string;
    phone: string;
    email: string;
    status: 'new' | 'active' | 'awaiting_payment' | 'documents_outstanding' | 'finalised';
    product: string;
    lastActivity: string;
    agent: string;
    balance: number;
};

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

function mapClientsToListItems(clients: Client[]): ClientListItem[] {
    return clients.map((client) => {
        const productNames = (client.clientProducts ?? [])
            .map((entry) => entry.productName || entry.product?.name)
            .filter((name): name is string => Boolean(name));
        const hasStoredProduct = Boolean(client.selectedProducts?.length);
        const product = productNames.length
            ? productNames.join(', ')
            : hasStoredProduct
                ? 'Product details unavailable'
                : 'No product selected';
        const agent = client.assignedAgent
            ? `${client.assignedAgent.firstName} ${client.assignedAgent.lastName ?? ''}`.trim()
            : client.assignedAgentId
                ? 'Assigned agent unavailable'
                : 'Unassigned';

        return {
            id: client.id,
            fileReference: client.fileReference || 'Pending reference',
            name: `${client.firstName} ${client.lastName}`.trim(),
            phone: client.phoneNumber,
            email: client.email,
            status: mapBackendStatusToFrontend(client.status as z.infer<typeof clientStatusEnum>),
            product,
            lastActivity: client.updatedAt,
            agent,
            balance: client.totalDebt || 0,
        };
    });
}

const statusLabels: Record<ClientListItem['status'], string> = {
    new: 'New',
    active: 'Active',
    awaiting_payment: 'Awaiting payment',
    documents_outstanding: 'Documents outstanding',
    finalised: 'Finalised',
};

export default function ClientsOverview() {
    const navigate = useNavigate();
    const [clients, setClients] = useState<ClientListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retryRequest, setRetryRequest] = useState(0);
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState<'all' | ClientListItem['status']>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalClients, setTotalClients] = useState(0);

    const getErrorMessage = (err: unknown): string => {
        if (!(err instanceof Error)) return 'Failed to fetch clients. Please try again.';
        const message = err.message.toLowerCase();
        if (message.includes('internal server error') || message.includes('500')) {
            return 'The server encountered an error loading clients. Please try again.';
        }
        if (message.includes('unauthorized') || message.includes('401')) {
            return 'You do not have permission to view clients.';
        }
        if (message.includes('network error') || message.includes('timeout')) {
            return 'Network connection error. Check the connection and try again.';
        }
        return err.message;
    };

    useEffect(() => {
        let isMounted = true;

        const fetchClients = async () => {
            setLoading(true);
            setError(null);
            try {
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

                const request: ClientSearchQuery = {
                    page: currentPage,
                    limit: 12,
                    search: query.trim() || undefined,
                    status: backendStatus,
                };
                const response = await getClients(request);

                if (isMounted) {
                    setClients(mapClientsToListItems(response.data));
                    setTotalPages(response.meta.totalPages);
                    setTotalClients(response.meta.total);
                }
            } catch (err) {
                if (isMounted) {
                    setError(getErrorMessage(err));
                    console.error('[ClientsOverview] Fetch error:', err);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        void fetchClients();
        return () => {
            isMounted = false;
        };
    }, [currentPage, query, retryRequest, status]);

    useEffect(() => {
        setCurrentPage(1);
    }, [query, status]);

    const canCreateClients = hasPermission('create-clients') || hasPermission('manage-clients');

    return (
        <div className="clients-overview-screen">
            <header className="clients-overview-header">
                <div className="clients-overview-header__title">
                    <span className="clients-overview-header__icon" aria-hidden="true">
                        <i className="bi bi-people" />
                    </span>
                    <div>
                        <h1>Clients Overview</h1>
                        <p>Search, review and manage client accounts</p>
                    </div>
                </div>

                <div className="clients-overview-header__meta">
                    <span>
                        <strong>{totalClients}</strong> total clients
                    </span>
                    {canCreateClients && (
                        <Button
                            type="button"
                            size="sm"
                            className="clients-overview-header__action"
                            onClick={() => navigate('/clients/new')}
                        >
                            <i className="bi bi-plus-lg" aria-hidden="true" />
                            New client
                        </Button>
                    )}
                </div>
            </header>

            {error && (
                <div className="clients-overview-alert" role="alert">
                    <i className="bi bi-exclamation-circle" aria-hidden="true" />
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={() => {
                            setError(null);
                            setCurrentPage(1);
                            setRetryRequest((request) => request + 1);
                        }}
                    >
                        Retry
                    </button>
                </div>
            )}

            <section className="clients-overview-workspace" aria-label="Client directory">
                <div className="clients-overview-toolbar">
                    <label className="clients-overview-search">
                        <span className="visually-hidden">Search clients</span>
                        <i className="bi bi-search" aria-hidden="true" />
                        <input
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.currentTarget.value)}
                            placeholder="Search name, file no., ID, phone or email"
                            disabled={loading}
                        />
                    </label>

                    <label className="clients-overview-filter">
                        <span>Status</span>
                        <select
                            value={status}
                            onChange={(event) =>
                                setStatus(
                                    event.currentTarget.value as 'all' | ClientListItem['status']
                                )
                            }
                            disabled={loading}
                        >
                            <option value="all">All statuses</option>
                            <option value="new">New</option>
                            <option value="active">Active</option>
                            <option value="awaiting_payment">Awaiting payment</option>
                            <option value="documents_outstanding">Documents outstanding</option>
                            <option value="finalised">Finalised</option>
                        </select>
                    </label>

                    <span className="clients-overview-results" aria-live="polite">
                        {loading ? 'Loading…' : `${clients.length} shown`}
                    </span>
                </div>

                <p className="clients-overview-table-hint">
                    Swipe horizontally to view every column.
                </p>

                <div className="clients-overview-table-scroll">
                    <table className="clients-overview-table">
                        <thead>
                            <tr>
                                <th>Client</th>
                                <th>File no.</th>
                                <th>Product</th>
                                <th>Status</th>
                                <th>Assigned to</th>
                                <th>Updated</th>
                                <th className="clients-overview-table__money">Debt</th>
                                <th aria-label="Actions" />
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8}>
                                        <div className="clients-overview-state" role="status">
                                            <Spinner
                                                animation="border"
                                                size="sm"
                                                aria-label="Loading clients"
                                            />
                                            <span>Loading clients…</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : clients.length === 0 ? (
                                <tr>
                                    <td colSpan={8}>
                                        <div className="clients-overview-state">
                                            <span
                                                className="clients-overview-state__icon"
                                                aria-hidden="true"
                                            >
                                                <i className="bi bi-person-x" />
                                            </span>
                                            <div>
                                                <strong>No clients found</strong>
                                                <p>Adjust the search or status filter.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                clients.map((client) => (
                                    <tr key={client.id}>
                                        <td>
                                            <strong className="clients-overview-client-name">
                                                {client.name}
                                            </strong>
                                            <span className="clients-overview-client-contact">
                                                {client.phone} · {client.email}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="clients-overview-file-reference">
                                                {client.fileReference}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="clients-overview-product">
                                                {client.product}
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={`clients-overview-status clients-overview-status--${client.status}`}
                                            >
                                                {statusLabels[client.status]}
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={
                                                    client.agent === 'Unassigned'
                                                        ? 'clients-overview-agent clients-overview-agent--unassigned'
                                                        : 'clients-overview-agent'
                                                }
                                            >
                                                {client.agent}
                                            </span>
                                        </td>
                                        <td className="clients-overview-date">
                                            {new Date(client.lastActivity).toLocaleDateString(
                                                'en-ZA'
                                            )}
                                        </td>
                                        <td className="clients-overview-table__money">
                                            {money(client.balance)}
                                        </td>
                                        <td className="clients-overview-table__action">
                                            <Button
                                                size="sm"
                                                variant="outline-primary"
                                                onClick={() => navigate(`/clients/${client.id}`)}
                                                className="clients-overview-open"
                                            >
                                                Open
                                                <i
                                                    className="bi bi-arrow-right"
                                                    aria-hidden="true"
                                                />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <footer className="clients-overview-pagination">
                        <span>
                            Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                        </span>
                        <Pagination size="sm">
                            <Pagination.First
                                disabled={currentPage <= 1 || loading}
                                onClick={() => setCurrentPage(1)}
                            />
                            <Pagination.Prev
                                disabled={currentPage <= 1 || loading}
                                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                            />
                            <Pagination.Next
                                disabled={currentPage >= totalPages || loading}
                                onClick={() =>
                                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                                }
                            />
                            <Pagination.Last
                                disabled={currentPage >= totalPages || loading}
                                onClick={() => setCurrentPage(totalPages)}
                            />
                        </Pagination>
                    </footer>
                )}
            </section>
        </div>
    );
}
