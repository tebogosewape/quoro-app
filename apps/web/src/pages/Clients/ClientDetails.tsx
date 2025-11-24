import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Dropdown, Form, Nav, Tab, Modal, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPlus,
    faEllipsisH,
    faCheckCircle,
    faClock,
    faTriangleExclamation,
    faMagnifyingGlass,
    faPaperPlane,
    faDownload,
    faEye,
    faFilePdf,
    faTimes,
} from '@fortawesome/free-solid-svg-icons';

import { money } from '../../utils/currency';
import { getClientById, updateClient, type Client } from '../../api/clients.api';
import { listTasks, createTask, updateTask } from '@/api/tasks.api';
import { listInboxEmails } from '@/api/communications.api';
import { listProducts } from '@/api/products';
import type { WhatsAppMessage } from '@/api/whatsapp.api';
import type { Product as BackendProduct } from '@/interfaces/Product';
import type {
    ClientDetailPayload,
    Product,
    MoneyRow,
    IncomeExpense,
    Correspondence,
} from '../../api/mockClientApi';
import { useAuthStore } from '@/stores/auth.store';

// Narrow types for optional relations returned by the API when relations are loaded
type Comm = {
    id: string;
    type: 'email' | 'sms' | 'whatsapp';
    direction?: 'inbound' | 'outbound';
    subject?: string | null;
    content?: string | null;
    status?: 'sent' | 'delivered' | 'read' | string;
    sentAt?: string;
    createdAt?: string;
};

type ClientNoteEntity = {
    id: string;
    createdAt: string;
    title?: string | null;
    content?: string | null;
    createdByUser?: { firstName?: string | null } | null;
};

type AuditEntity = {
    id: string;
    createdAt: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    actorId?: string;
    actorType?: string;
    actor?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null;
    changes?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
};

type FinancialRecordEntity = {
    id: string;
    createdAt?: string;
    recordedAt?: string;
    type?: string;
    amount?: number | string | null;
    description?: string | null;
};

type ClientProductLite = {
    id: string;
    status?: string;
    customFields?: Record<string, string> | null;
    productName?: string;
    product?: { name?: string } | null;
};

// -----------------------------------------------
// Helpers
// -----------------------------------------------

/**
 * Map backend Client to frontend ClientDetailPayload
 */
async function mapClientToDetailPayload(client: Client): Promise<ClientDetailPayload> {
    const cClient = client as Client & {
        communications?: Comm[];
        clientNotes?: ClientNoteEntity[];
        auditLogs?: AuditEntity[];
        financialRecords?: FinancialRecordEntity[];
        clientProducts?: ClientProductLite[];
        selectedProducts?: Array<{
            productId: string;
            paymentOptionId: string;
            cirAccounts?: number;
        }>;
    };
    const meta = [
        client.maritalStatus
            ? client.maritalStatus[0].toUpperCase() + client.maritalStatus.slice(1)
            : undefined,
        client.clientType
            ? client.clientType[0].toUpperCase() + client.clientType.slice(1)
            : undefined,
    ]
        .filter(Boolean)
        .join(' • ');

    const emailLog: Array<{ id: string; time: string; by: string; text: string }> = [];
    const smsLog: Array<{ id: string; time: string; by: string; text: string }> = [];
    const whatsapp: Array<{
        id: string;
        from: 'agent' | 'client' | 'system';
        time: string;
        text: string;
        status?: 'sent' | 'delivered' | 'read';
    }> = [];

    const comms = cClient.communications || [];
    for (const c of comms) {
        const by = c.direction === 'outbound' ? 'Agent' : 'Client';
        const when: string = c.sentAt || c.createdAt || new Date().toISOString();
        const text: string = c.subject ? `${c.subject} — ${c.content ?? ''}` : (c.content ?? '');
        if (c.type === 'email') {
            emailLog.push({ id: c.id, time: when, by, text });
        }
        if (c.type === 'sms') {
            smsLog.push({ id: c.id, time: when, by, text });
            whatsapp.push({
                id: c.id,
                from: c.direction === 'outbound' ? 'agent' : 'client',
                time: when,
                text: c.content ?? '',
                status:
                    c.status === 'read' ? 'read' : c.status === 'delivered' ? 'delivered' : 'sent',
            });
        }
    }

    // Map Audit Logs -> systemLog (keep full details)
    const systemLog: Array<{
        id: string;
        time: string;
        by: string;
        text: string;
        action?: string;
        entityType?: string;
        changes?: Record<string, unknown>;
        metadata?: Record<string, unknown>;
        actorType?: string;
    }> = [];
    const audits = cClient.auditLogs || [];
    for (const a of audits) {
        const actorName = a.actor?.firstName
            ? `${a.actor.firstName}${a.actor.lastName ? ' ' + a.actor.lastName : ''}`
            : a.actorId
              ? 'User'
              : 'System';
        const actionLabel = String(a.action).replace(/_/g, ' ');
        const summary = `${actionLabel} on ${a.entityType}${a.entityId ? ` (${a.entityId})` : ''}`;
        systemLog.push({
            id: a.id,
            time: a.createdAt,
            by: actorName,
            text: summary,
            action: a.action,
            entityType: a.entityType,
            changes: a.changes,
            metadata: a.metadata,
            actorType: a.actorType,
        });
    }

    // Map Financial Records -> financialLog
    const financialLog: Array<{ id: string; time: string; by: string; text: string }> = [];
    const records = cClient.financialRecords || [];
    for (const fr of records) {
        const amount = typeof fr.amount === 'number' ? fr.amount : Number(fr.amount ?? 0);
        const type = String(fr.type).replace(/_/g, ' ');
        const desc = fr.description ? ` — ${fr.description}` : '';
        financialLog.push({
            id: fr.id,
            time: fr.recordedAt || fr.createdAt || new Date().toISOString(),
            by: 'System',
            text: `${type}: R ${amount.toLocaleString('en-ZA', { maximumFractionDigits: 2 })}${desc}`,
        });
    }

    return {
        id: client.id,
        fileReference: client.fileReference,
        name: `${client.firstName} ${client.lastName}`,
        phone: client.phoneNumber,
        email: client.email,
        nationalId: client.idNumber,
        meta,
        lastUpdate: client.updatedAt ? new Date(client.updatedAt).toLocaleDateString() : '',
        lastPhone: '',
        headerChips: [
            { label: 'File Ref', value: client.fileReference || 'N/A' },
            { label: 'ID', value: client.idNumber },
            {
                label: 'Last update',
                value: client.updatedAt ? new Date(client.updatedAt).toLocaleDateString() : '',
            },
        ],
        maritalStatus: client.maritalStatus ?? undefined,
        dateOfBirth: client.dateOfBirth,
        physicalAddress: client.physicalAddress,
        postalAddress: client.postalAddress || '',
        monthlyIncome: client.monthlyIncome || 0,
        monthlyExpenses: client.monthlyExpenses || 0,
        totalDebt: client.totalDebt || 0,
        creditScore: client.creditScore,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
        bankName: client.bankName,
        accountType: client.accountType,
        accountHolder: client.accountHolder,
        accountNumber: client.accountNumber,
        branchCode: client.branchCode,
        creditReportViewedAt: client.creditReportViewedAt,
        creditReportViewedBy: client.creditReportViewedBy,
        products: await (async () => {
            // If backend has populated clientProducts relation, use that
            if (cClient.clientProducts && cClient.clientProducts.length > 0) {
                return cClient.clientProducts.map((cp: ClientProductLite) => ({
                    id: cp.id,
                    name: cp.product?.name || cp.productName || 'Product',
                    status: (cp.status || '') as string,
                    fields: (cp.customFields || undefined) as Product['fields'],
                }));
            }

            // Otherwise, use selectedProducts JSON field and fetch product details
            if (cClient.selectedProducts && cClient.selectedProducts.length > 0) {
                try {
                    const response = await listProducts({ limit: 100, status: 'active' as const });
                    const allProducts = response.products;

                    return cClient.selectedProducts.map((sp) => {
                        const product = allProducts.find((p) => p.id === sp.productId);
                        return {
                            id: sp.productId,
                            name: product?.name || 'Product',
                            status: 'active',
                            fields: {},
                        };
                    });
                } catch (err) {
                    console.error('Failed to fetch product details:', err);
                    // Fallback to showing just IDs
                    return cClient.selectedProducts.map((sp) => ({
                        id: sp.productId,
                        name: `Product ${sp.productId}`,
                        status: 'active',
                        fields: {},
                    }));
                }
            }

            return [];
        })(),
        todos: [],
        notes: (cClient.clientNotes || []).map((n) => ({
            id: n.id,
            time: n.createdAt,
            by: n.createdByUser?.firstName || 'Agent',
            text: n.title ? `${n.title}: ${n.content ?? ''}` : (n.content ?? ''),
        })),
        onboardingLocked: false,
        incomeExpense: {
            income: client.monthlyIncome
                ? [{ id: 'A1', label: 'Income', amount: client.monthlyIncome }]
                : [],
            deductions: [],
            expenses: client.monthlyExpenses
                ? [{ id: 'C1', label: 'Expenses', amount: client.monthlyExpenses }]
                : [],
        },
        systemLog,
        financialLog,
        correspondence: { emailLog, smsLog, whatsapp } as Correspondence,
    };
}

/**
 * Map backend status to frontend status
 */
// (Removed unused mapStatus)

// -----------------------------------------------
// Page
// -----------------------------------------------
export default function ClientDetails() {
    const { id } = useParams();
    const cid = id || 'KH12919';
    const navigate = useNavigate();

    const [data, setData] = useState<ClientDetailPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    /**
     * Fetch client data
     */
    const fetchClient = async () => {
        setLoading(true);
        setError(null);
        try {
            const client = await getClientById(cid);
            const payload = await mapClientToDetailPayload(client);
            setData(payload);
            setLoading(false);
        } catch (err) {
            setError(getErrorMessage(err));
            setLoading(false);
        }
    };

    /**
     * Refetch client data (for refreshing after updates)
     */
    const refetchClient = () => {
        fetchClient();
    };

    /**
     * Convert API error to user-friendly message
     */
    const getErrorMessage = (err: unknown): string => {
        if (err instanceof Error) {
            const message = err.message.toLowerCase();

            // Check for specific error patterns
            if (message.includes('internal server error') || message.includes('500')) {
                return 'The server encountered an error loading this client. Please try again.';
            }
            if (message.includes('not found') || message.includes('404')) {
                return 'This client could not be found. It may have been deleted.';
            }
            if (message.includes('network error') || message.includes('timeout')) {
                return 'Network connection error. Please check your internet connection and try again.';
            }

            // Return original message if it's already user-friendly
            return err.message;
        }
        return 'Failed to load client. Please try again.';
    };

    useEffect(() => {
        fetchClient();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cid]);

    // Show loading state only if still loading and no error
    if (loading && !error) return <div className="container-fluid py-3">Loading…</div>;

    // Show error state if error exists and no data loaded
    if (error && !data) {
        return (
            <div className="container-fluid py-3">
                <div className="alert alert-danger" role="alert">
                    <h4 className="alert-heading">Unable to Load Client</h4>
                    <p>{error}</p>
                    <hr />
                    <button className="btn btn-outline-danger btn-sm" onClick={() => fetchClient()}>
                        Try Again
                    </button>
                    <button
                        className="btn btn-outline-secondary btn-sm ms-2"
                        onClick={() => navigate('/clients')}
                    >
                        Back to Clients
                    </button>
                </div>
            </div>
        );
    }

    // If still no data (shouldn't happen, but safety check)
    if (!data) return <div className="container-fluid py-3">Loading…</div>;

    const handleClientUpdate = async (field: string, value: string) => {
        try {
            const updates: Record<string, unknown> = {
                [field]: value,
            };
            const updated = await updateClient(data.id, updates);
            const payload = await mapClientToDetailPayload(updated);
            setData(payload);
        } catch (err) {
            setError(getErrorMessage(err));
            throw err;
        }
    };

    return (
        <div className="container-fluid py-3">
            {/* Error Banner */}
            {error && (
                <div className="alert alert-danger mb-3 d-flex justify-content-between align-items-center">
                    <div>
                        <strong>Error:</strong> {error}
                    </div>
                    <Button
                        variant="link"
                        size="sm"
                        onClick={() => {
                            setError(null);
                            setLoading(true);
                            getClientById(cid)
                                .then(async (client) => {
                                    const payload = await mapClientToDetailPayload(client);
                                    setData(payload);
                                    setError(null);
                                })
                                .catch((err) => {
                                    setError(
                                        err instanceof Error ? err.message : 'Failed to load client'
                                    );
                                });
                        }}
                        className="p-0 text-danger"
                    >
                        Retry
                    </Button>
                </div>
            )}

            {/* Onboarding banner */}
            {data.onboardingLocked && (
                <div
                    className="alert alert-warning mb-3 d-flex align-items-center gap-2"
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
                    >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <strong>New onboarding is LOCKED</strong>
                    <span className="text-muted">— verification required before actions.</span>
                </div>
            )}

            {/* Identity Header */}
            <HeaderBlock
                data={data}
                onEdit={() => navigate(`/clients/${data.id}/edit`)}
                onRefetch={refetchClient}
            />

            <div className="row g-3">
                {/* LEFT */}
                <div className="col-12 col-lg-8">
                    <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                        <Tab.Container defaultActiveKey="products">
                            <Nav
                                variant="tabs"
                                className="px-3 pt-3"
                                style={{ borderBottom: '2px solid #f0f0f0' }}
                            >
                                <Nav.Item>
                                    <Nav.Link
                                        eventKey="products"
                                        style={{
                                            borderRadius: '8px 8px 0 0',
                                            fontWeight: 500,
                                            border: 'none',
                                        }}
                                    >
                                        Products
                                    </Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link
                                        eventKey="client"
                                        style={{
                                            borderRadius: '8px 8px 0 0',
                                            fontWeight: 500,
                                            border: 'none',
                                        }}
                                    >
                                        Client
                                    </Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link
                                        eventKey="income"
                                        style={{
                                            borderRadius: '8px 8px 0 0',
                                            fontWeight: 500,
                                            border: 'none',
                                        }}
                                    >
                                        Income/Expense
                                    </Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link
                                        eventKey="creditors"
                                        style={{
                                            borderRadius: '8px 8px 0 0',
                                            fontWeight: 500,
                                            border: 'none',
                                        }}
                                    >
                                        Creditors
                                    </Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link
                                        eventKey="reports"
                                        style={{
                                            borderRadius: '8px 8px 0 0',
                                            fontWeight: 500,
                                            border: 'none',
                                        }}
                                    >
                                        Credit Reports
                                    </Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link
                                        eventKey="corres"
                                        style={{
                                            borderRadius: '8px 8px 0 0',
                                            fontWeight: 500,
                                            border: 'none',
                                        }}
                                    >
                                        Correspondence
                                    </Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link
                                        eventKey="payments"
                                        style={{
                                            borderRadius: '8px 8px 0 0',
                                            fontWeight: 500,
                                            border: 'none',
                                        }}
                                    >
                                        Payments
                                    </Nav.Link>
                                </Nav.Item>
                            </Nav>

                            <div className="p-3">
                                <Tab.Content>
                                    <Tab.Pane eventKey="products">
                                        <ProductsPanel
                                            products={data.products}
                                            clientId={cid}
                                            onProductAdded={refetchClient}
                                            creditReportViewedAt={data.creditReportViewedAt}
                                        />
                                    </Tab.Pane>

                                    <Tab.Pane eventKey="client">
                                        <ClientMini data={data} onUpdate={handleClientUpdate} />
                                    </Tab.Pane>

                                    <Tab.Pane eventKey="income">
                                        <IncomeExpenseForm
                                            clientId={cid}
                                            initial={data.incomeExpense}
                                            onSaved={(ie) =>
                                                setData((p) =>
                                                    p ? { ...p, incomeExpense: ie } : p
                                                )
                                            }
                                        />
                                    </Tab.Pane>

                                    <Tab.Pane eventKey="creditors">
                                        <Section title="Creditors">
                                            <div className="panel glass p-2">
                                                <i className="text-muted">
                                                    Mock table — no entries.
                                                </i>
                                            </div>
                                        </Section>
                                    </Tab.Pane>

                                    <Tab.Pane eventKey="reports">
                                        <Section title="Credit Reports">
                                            <CreditReportViewer clientId={cid} />
                                        </Section>
                                    </Tab.Pane>

                                    <Tab.Pane eventKey="corres">
                                        <CorrespondencePanel clientId={cid} />
                                    </Tab.Pane>

                                    <Tab.Pane eventKey="payments">
                                        <Section title="Payment History">
                                            <div className="panel glass p-2">
                                                <i className="text-muted">Mock schedule table.</i>
                                            </div>
                                        </Section>
                                    </Tab.Pane>
                                </Tab.Content>
                            </div>
                        </Tab.Container>
                    </div>
                </div>

                {/* RIGHT */}
                <div className="col-12 col-lg-4">
                    <TodoPanel clientId={cid} />
                    <NotesPanel clientId={cid} />
                </div>
            </div>
        </div>
    );
}

// -----------------------------------------------
// Helper: Mask sensitive data for agents
// -----------------------------------------------
function maskSensitiveDataForAgents(value: string, isAgent: boolean): string {
    if (!value || !isAgent) return value;
    if (value.length <= 4) return value;
    const masked = '*'.repeat(value.length - 4);
    const last4 = value.slice(-4);
    return `${masked}${last4}`;
}

// -----------------------------------------------
// Header
// -----------------------------------------------
function HeaderBlock({
    data,
    onEdit,
    onRefetch,
}: {
    data: ClientDetailPayload;
    onEdit: () => void;
    onRefetch: () => void;
}) {
    const session = useAuthStore((state) => state.session);
    const isAgent = session?.user?.role === 'agent';
    const [downloadingReport, setDownloadingReport] = useState(false);
    const navigate = useNavigate();

    const handleDownloadCreditReport = async () => {
        setDownloadingReport(true);
        try {
            const { downloadCreditReport } = await import('@/api/clients.api');
            const blob = await downloadCreditReport(data.id);

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `experian-report-${data.nationalId}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            // Refetch client data to get updated creditReportViewedAt timestamp
            onRefetch();
        } catch (error) {
            console.error('Failed to download credit report:', error);
            alert('Failed to download credit report. Please try again.');
        } finally {
            setDownloadingReport(false);
        }
    };

    // Calculate total from income/expense if available
    const totalDebt = data.incomeExpense?.income.reduce((sum, row) => sum + row.amount, 0) || 0;

    return (
        <>
            {/* Gradient Header */}
            <div
                className="card border-0 shadow-sm mb-4"
                style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '16px',
                }}
            >
                <div className="card-body p-4 text-white">
                    <div className="d-flex align-items-center mb-3">
                        <button
                            className="btn btn-light btn-sm me-3"
                            onClick={() => navigate('/clients')}
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
                                style={{ marginRight: '4px' }}
                            >
                                <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                            Back
                        </button>
                        <svg
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="me-3"
                        >
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                        <div className="flex-grow-1">
                            <h4 className="mb-0" style={{ fontWeight: 700 }}>
                                {data.name}
                            </h4>
                            <div className="opacity-90" style={{ fontSize: '0.95rem' }}>
                                {data.meta}
                            </div>
                        </div>
                        <div className="d-flex gap-2">
                            <button
                                className="btn btn-light"
                                onClick={onEdit}
                                style={{ borderRadius: '8px', fontWeight: 500 }}
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
                                    style={{ marginRight: '4px' }}
                                >
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                                Edit
                            </button>
                            <Dropdown>
                                <Dropdown.Toggle
                                    className="btn btn-light"
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
                                    >
                                        <circle cx="12" cy="12" r="1" />
                                        <circle cx="12" cy="5" r="1" />
                                        <circle cx="12" cy="19" r="1" />
                                    </svg>
                                </Dropdown.Toggle>
                                <Dropdown.Menu>
                                    <Dropdown.Item
                                        onClick={handleDownloadCreditReport}
                                        disabled={downloadingReport}
                                    >
                                        {downloadingReport ? (
                                            <>
                                                <span
                                                    className="spinner-border spinner-border-sm me-2"
                                                    role="status"
                                                    aria-hidden="true"
                                                ></span>
                                                Generating...
                                            </>
                                        ) : (
                                            <>
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
                                                >
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                    <polyline points="14 2 14 8 20 8" />
                                                    <line x1="16" y1="13" x2="8" y2="13" />
                                                    <line x1="16" y1="17" x2="8" y2="17" />
                                                    <polyline points="10 9 9 9 8 9" />
                                                </svg>
                                                Credit Report PDF
                                            </>
                                        )}
                                    </Dropdown.Item>
                                    <Dropdown.Item>
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
                                        >
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="7 10 12 15 17 10" />
                                            <line x1="12" y1="15" x2="12" y2="3" />
                                        </svg>
                                        Export PDF
                                    </Dropdown.Item>
                                    <Dropdown.Item>
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
                                        >
                                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                            <polyline points="22,6 12,13 2,6" />
                                        </svg>
                                        Send Profile Link
                                    </Dropdown.Item>
                                    <Dropdown.Divider />
                                    <Dropdown.Item className="text-danger">
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
                                        >
                                            <polyline points="3 6 5 6 21 6" />
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        </svg>
                                        Archive Client
                                    </Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="row g-3 mt-2">
                        <div className="col-md-3 col-6">
                            <div
                                className="text-center p-3"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.15)',
                                    borderRadius: '12px',
                                    backdropFilter: 'blur(10px)',
                                }}
                            >
                                <div className="opacity-90" style={{ fontSize: '0.85rem' }}>
                                    File Reference
                                </div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                                    {data.fileReference || 'N/A'}
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3 col-6">
                            <div
                                className="text-center p-3"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.15)',
                                    borderRadius: '12px',
                                    backdropFilter: 'blur(10px)',
                                }}
                            >
                                <div className="opacity-90" style={{ fontSize: '0.85rem' }}>
                                    ID Number
                                </div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                                    {data.nationalId || 'N/A'}
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3 col-6">
                            <div
                                className="text-center p-3"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.15)',
                                    borderRadius: '12px',
                                    backdropFilter: 'blur(10px)',
                                }}
                            >
                                <div className="opacity-90" style={{ fontSize: '0.85rem' }}>
                                    Total Income
                                </div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                                    R{' '}
                                    {totalDebt.toLocaleString('en-ZA', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3 col-6">
                            <div
                                className="text-center p-3"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.15)',
                                    borderRadius: '12px',
                                    backdropFilter: 'blur(10px)',
                                }}
                            >
                                <div className="opacity-90" style={{ fontSize: '0.85rem' }}>
                                    Products
                                </div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                                    {data.products.length}
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3 col-6">
                            <div
                                className="text-center p-3"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.15)',
                                    borderRadius: '12px',
                                    backdropFilter: 'blur(10px)',
                                }}
                            >
                                <div className="opacity-90" style={{ fontSize: '0.85rem' }}>
                                    Last Contact
                                </div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                                    {data.lastPhone || 'Never'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contact Info Card */}
            <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: '12px' }}>
                <div className="card-body p-3">
                    <div className="d-flex flex-wrap gap-3 align-items-center">
                        <div
                            className="d-inline-flex align-items-center gap-2"
                            style={{ color: '#667eea', fontWeight: 500 }}
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
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                            {maskSensitiveDataForAgents(data.phone, isAgent)}
                        </div>
                        <a
                            className="d-inline-flex align-items-center gap-2 text-decoration-none"
                            href={`mailto:${data.email}`}
                            style={{ color: '#667eea', fontWeight: 500 }}
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
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                <polyline points="22,6 12,13 2,6" />
                            </svg>
                            {data.email}
                        </a>
                        <button
                            className="btn btn-sm btn-outline-success"
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
                                style={{ marginRight: '4px' }}
                            >
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                            </svg>
                            WhatsApp
                        </button>
                        {data.lastUpdate && (
                            <span className="text-muted ms-auto" style={{ fontSize: '0.9rem' }}>
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{ marginRight: '4px' }}
                                >
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                                Updated {data.lastUpdate}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

// -----------------------------------------------
// Products
// -----------------------------------------------
function ProductsPanel({
    products,
    clientId,
    onProductAdded,
    creditReportViewedAt,
}: {
    products: Product[];
    clientId: string;
    onProductAdded: () => void;
    creditReportViewedAt?: string | null;
}) {
    const [availableProducts, setAvailableProducts] = useState<BackendProduct[]>([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await listProducts({
                    status: 'active' as const,
                    limit: 100,
                });
                setAvailableProducts(response.products);
            } catch (err) {
                console.error('Failed to load products:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    const handleAddProduct = async () => {
        if (!selectedProductId) return;

        // Validate credit report has been reviewed before adding products
        console.log('Credit report viewed at:', creditReportViewedAt);
        if (!creditReportViewedAt) {
            console.log('Validation failed: Credit report not viewed');
            setErrorMessage('Please download and review the credit report before adding products.');
            return;
        }

        console.log('Validation passed: Adding product', selectedProductId);
        setAdding(true);
        setSuccessMessage('');
        setErrorMessage('');

        try {
            // Get the current client to access existing selectedProducts
            const client = await getClientById(clientId);

            // Create new product entry
            const newProduct = {
                productId: selectedProductId,
                paymentOptionId: '', // Will be set later
                cirAccounts: [],
            };

            // Add to existing products or create new array
            const updatedProducts = [...(client.selectedProducts || []), newProduct];

            // Update the client with the new products list
            await updateClient(clientId, {
                selectedProducts: updatedProducts,
            });

            const addedProduct = availableProducts.find((p) => p.id === selectedProductId);
            setSelectedProductId('');
            setSuccessMessage(`Product "${addedProduct?.name}" added successfully!`);

            // Auto-dismiss success message after 5 seconds
            setTimeout(() => setSuccessMessage(''), 5000);

            onProductAdded(); // Refresh the client data
        } catch (err) {
            console.error('Failed to add product:', err);
            setErrorMessage(
                'Failed to add product: ' + (err instanceof Error ? err.message : 'Unknown error')
            );

            // Auto-dismiss error message after 8 seconds
            setTimeout(() => setErrorMessage(''), 8000);
        } finally {
            setAdding(false);
        }
    };

    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return products;
        const q = searchQuery.toLowerCase();
        return products.filter(
            (p) => p.name.toLowerCase().includes(q) || p.status?.toLowerCase().includes(q)
        );
    }, [products, searchQuery]);

    const riskBadge = (f?: Product['flag']) => {
        if (f === 'green')
            return (
                <span
                    className="badge"
                    style={{ borderColor: '#08b494', color: '#08b494', background: 'transparent' }}
                >
                    <FontAwesomeIcon icon={faCheckCircle} /> OK
                </span>
            );
        if (f === 'amber')
            return (
                <span
                    className="badge"
                    style={{ borderColor: '#f6a500', color: '#f6a500', background: 'transparent' }}
                >
                    <FontAwesomeIcon icon={faClock} /> Attention
                </span>
            );
        if (f === 'red')
            return (
                <span
                    className="badge"
                    style={{ borderColor: '#ff7a7a', color: '#ff7a7a', background: 'transparent' }}
                >
                    <FontAwesomeIcon icon={faTriangleExclamation} /> Urgent
                </span>
            );
        return null;
    };

    return (
        <>
            <h6 className="mb-3">Products</h6>

            {/* Success Message */}
            {successMessage && (
                <div className="alert alert-success alert-dismissible fade show mb-3" role="alert">
                    <div className="d-flex align-items-center">
                        <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                        {successMessage}
                    </div>
                    <button
                        type="button"
                        className="btn-close"
                        onClick={() => setSuccessMessage('')}
                        aria-label="Close"
                    ></button>
                </div>
            )}

            {/* Error Message */}
            {errorMessage && (
                <div className="alert alert-danger alert-dismissible fade show mb-3" role="alert">
                    <div className="d-flex align-items-center">
                        <FontAwesomeIcon icon={faTriangleExclamation} className="me-2" />
                        {errorMessage}
                    </div>
                    <button
                        type="button"
                        className="btn-close"
                        onClick={() => setErrorMessage('')}
                        aria-label="Close"
                    ></button>
                </div>
            )}

            {/* Add Product Section */}
            <div className="panel glass p-3 mb-3">
                <div className="d-flex align-items-center gap-2">
                    <FontAwesomeIcon icon={faPlus} className="text-muted" />
                    <Form.Select
                        className="form-control"
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                        disabled={loading || adding}
                        style={{ flex: 1 }}
                    >
                        <option value="" disabled>
                            {loading ? 'Loading products...' : 'Select product to add...'}
                        </option>
                        {availableProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name} ({p.code}) - {p.category.replace(/_/g, ' ')}
                            </option>
                        ))}
                    </Form.Select>
                    <Button
                        className="btn btn-primary"
                        onClick={handleAddProduct}
                        disabled={!selectedProductId || loading || adding}
                    >
                        {adding ? 'Adding...' : 'Add Product'}
                    </Button>
                </div>
            </div>

            {/* Search Products */}
            <div className="d-flex align-items-center gap-2 mb-3">
                <FontAwesomeIcon icon={faMagnifyingGlass} className="text-muted" />
                <input
                    className="form-control"
                    placeholder="Search client's products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ maxWidth: 300 }}
                />
                {searchQuery && (
                    <span className="text-muted" style={{ fontSize: 12 }}>
                        {filteredProducts.length} of {products.length}
                    </span>
                )}
            </div>

            {/* Products List */}
            <div className="vstack gap-3">
                {filteredProducts.length === 0 ? (
                    <div className="panel glass p-3 text-center text-muted">
                        {searchQuery ? 'No products match your search.' : 'No products added yet.'}
                    </div>
                ) : (
                    filteredProducts.map((p) => {
                        // Find full product details from availableProducts
                        const fullProduct = availableProducts.find((ap) => ap.id === p.id);

                        return (
                            <div
                                className="panel glass p-4"
                                key={p.id}
                                style={{
                                    borderLeft: '4px solid #667eea',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <div className="d-flex justify-content-between align-items-start mb-3">
                                    <div className="flex-grow-1">
                                        <div className="d-flex align-items-center gap-2 mb-2">
                                            <h6 className="mb-0 fw-bold">{p.name}</h6>
                                            <span
                                                className="badge bg-primary"
                                                style={{ fontSize: '0.75rem' }}
                                            >
                                                {fullProduct?.code || 'N/A'}
                                            </span>
                                            <span
                                                className={`badge ${p.status === 'active' ? 'bg-success' : 'bg-secondary'}`}
                                                style={{ fontSize: '0.75rem' }}
                                            >
                                                {p.status}
                                            </span>
                                            {p.flag && (
                                                <div className="ms-2">{riskBadge(p.flag)}</div>
                                            )}
                                        </div>

                                        {fullProduct?.description && (
                                            <p
                                                className="text-muted mb-3"
                                                style={{ fontSize: '0.9rem' }}
                                            >
                                                {fullProduct.description}
                                            </p>
                                        )}

                                        {/* Product Details Grid */}
                                        <div className="row g-3">
                                            {fullProduct && (
                                                <>
                                                    <div className="col-md-3 col-6">
                                                        <div className="text-muted small">
                                                            Category
                                                        </div>
                                                        <div className="fw-semibold">
                                                            {fullProduct.category
                                                                .replace(/_/g, ' ')
                                                                .replace(/\b\w/g, (l) =>
                                                                    l.toUpperCase()
                                                                )}
                                                        </div>
                                                    </div>

                                                    <div className="col-md-3 col-6">
                                                        <div className="text-muted small">
                                                            Mandate Required
                                                        </div>
                                                        <div className="fw-semibold">
                                                            {fullProduct.requires_mandate ? (
                                                                <span className="text-warning">
                                                                    <FontAwesomeIcon
                                                                        icon={faCheckCircle}
                                                                    />{' '}
                                                                    Yes
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted">
                                                                    No
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="col-md-3 col-6">
                                                        <div className="text-muted small">
                                                            Credit Pull
                                                        </div>
                                                        <div className="fw-semibold">
                                                            {fullProduct.requires_credit_pull ? (
                                                                <span className="text-info">
                                                                    <FontAwesomeIcon
                                                                        icon={faCheckCircle}
                                                                    />{' '}
                                                                    Required
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted">
                                                                    Not Required
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="col-md-3 col-6">
                                                        <div className="text-muted small">
                                                            Added
                                                        </div>
                                                        <div className="fw-semibold">
                                                            {fullProduct.createdAt
                                                                ? new Date(
                                                                      fullProduct.createdAt
                                                                  ).toLocaleDateString()
                                                                : 'N/A'}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Pricing Information */}
                                        {fullProduct?.pricing_options && (
                                            <div className="mt-3">
                                                <div
                                                    className="card border-0"
                                                    style={{
                                                        backgroundColor: '#f8f9fa',
                                                        borderRadius: '8px',
                                                    }}
                                                >
                                                    <div className="card-body p-3">
                                                        <div className="text-muted small mb-2 fw-semibold">
                                                            💰 Pricing
                                                        </div>
                                                        <div className="row g-2">
                                                            {fullProduct.pricing_options.oneOff !==
                                                                undefined &&
                                                                fullProduct.pricing_options.oneOff >
                                                                    0 && (
                                                                    <div className="col-md-4 col-6">
                                                                        <div
                                                                            className="text-muted"
                                                                            style={{
                                                                                fontSize: '0.75rem',
                                                                            }}
                                                                        >
                                                                            One-Time Fee
                                                                        </div>
                                                                        <div
                                                                            className="fw-bold text-success"
                                                                            style={{
                                                                                fontSize: '1.1rem',
                                                                            }}
                                                                        >
                                                                            R{' '}
                                                                            {fullProduct.pricing_options.oneOff.toLocaleString(
                                                                                'en-ZA',
                                                                                {
                                                                                    minimumFractionDigits: 2,
                                                                                    maximumFractionDigits: 2,
                                                                                }
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                            {fullProduct.pricing_options
                                                                .recurring && (
                                                                <div className="col-md-4 col-6">
                                                                    <div
                                                                        className="text-muted"
                                                                        style={{
                                                                            fontSize: '0.75rem',
                                                                        }}
                                                                    >
                                                                        Payment Type
                                                                    </div>
                                                                    <div className="fw-semibold text-info">
                                                                        Recurring
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {fullProduct.pricing_options
                                                                .minimumAmount && (
                                                                <div className="col-md-4 col-6">
                                                                    <div
                                                                        className="text-muted"
                                                                        style={{
                                                                            fontSize: '0.75rem',
                                                                        }}
                                                                    >
                                                                        Minimum Amount
                                                                    </div>
                                                                    <div className="fw-semibold">
                                                                        R{' '}
                                                                        {fullProduct.pricing_options.minimumAmount.toLocaleString(
                                                                            'en-ZA',
                                                                            {
                                                                                minimumFractionDigits: 2,
                                                                                maximumFractionDigits: 2,
                                                                            }
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {fullProduct.pricing_options
                                                                .instalments &&
                                                                fullProduct.pricing_options
                                                                    .instalments.length > 0 && (
                                                                    <div className="col-12">
                                                                        <div
                                                                            className="text-muted"
                                                                            style={{
                                                                                fontSize: '0.75rem',
                                                                            }}
                                                                        >
                                                                            Installment Options
                                                                        </div>
                                                                        <div className="d-flex gap-2 flex-wrap mt-1">
                                                                            {fullProduct.pricing_options.instalments.map(
                                                                                (inst, idx) => (
                                                                                    <span
                                                                                        key={idx}
                                                                                        className="badge bg-primary"
                                                                                        style={{
                                                                                            fontSize:
                                                                                                '0.85rem',
                                                                                            padding:
                                                                                                '0.4rem 0.8rem',
                                                                                        }}
                                                                                    >
                                                                                        {inst.count}
                                                                                        x R
                                                                                        {inst.amount.toLocaleString(
                                                                                            'en-ZA'
                                                                                        )}
                                                                                    </span>
                                                                                )
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Custom Fields */}
                                        {p.fields && Object.keys(p.fields).length > 0 && (
                                            <div className="mt-3">
                                                <div className="text-muted small mb-2">
                                                    Product Configuration
                                                </div>
                                                <div className="row g-2">
                                                    {Object.entries(p.fields).map(([k, v]) => (
                                                        <div className="col-md-4 col-6" key={k}>
                                                            <div className="bg-light p-2 rounded">
                                                                <div
                                                                    className="text-muted"
                                                                    style={{ fontSize: '0.75rem' }}
                                                                >
                                                                    {k}
                                                                </div>
                                                                <div className="fw-semibold">
                                                                    {v}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {p.feeNote && (
                                            <div
                                                className="alert alert-info mt-3 mb-0"
                                                style={{ fontSize: '0.85rem' }}
                                            >
                                                <FontAwesomeIcon icon={faClock} className="me-2" />
                                                {p.feeNote}
                                            </div>
                                        )}
                                    </div>

                                    <Dropdown align="end">
                                        <Dropdown.Toggle
                                            className="btn btn-light btn-sm"
                                            style={{
                                                borderRadius: '8px',
                                                border: '1px solid var(--glass-border)',
                                            }}
                                        >
                                            <FontAwesomeIcon icon={faEllipsisH} />
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu>
                                            <Dropdown.Item>Edit Configuration</Dropdown.Item>
                                            <Dropdown.Item>Attach File</Dropdown.Item>
                                            <Dropdown.Item className="text-danger">
                                                Remove
                                            </Dropdown.Item>
                                        </Dropdown.Menu>
                                    </Dropdown>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Total Pricing Summary */}
            {filteredProducts.length > 0 &&
                (() => {
                    // Calculate totals
                    let totalOneOff = 0;
                    let hasRecurring = false;
                    let totalMinimum = 0;
                    let productCount = 0;

                    filteredProducts.forEach((p) => {
                        const fullProduct = availableProducts.find((ap) => ap.id === p.id);
                        if (fullProduct?.pricing_options) {
                            productCount++;
                            if (fullProduct.pricing_options.oneOff) {
                                totalOneOff += fullProduct.pricing_options.oneOff;
                            }
                            if (fullProduct.pricing_options.recurring) {
                                hasRecurring = true;
                            }
                            if (fullProduct.pricing_options.minimumAmount) {
                                totalMinimum += fullProduct.pricing_options.minimumAmount;
                            }
                        }
                    });

                    // Only show total if there's pricing data
                    if (totalOneOff > 0 || hasRecurring || totalMinimum > 0) {
                        return (
                            <div
                                className="card border-0 shadow-sm mt-4"
                                style={{
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                }}
                            >
                                <div className="card-body p-4">
                                    <div className="row align-items-center text-white">
                                        <div className="col-md-8">
                                            <h6 className="mb-2 fw-bold">Total Product Value</h6>
                                            <p
                                                className="mb-0 opacity-90"
                                                style={{ fontSize: '0.9rem' }}
                                            >
                                                Based on {productCount} product
                                                {productCount !== 1 ? 's' : ''} with pricing
                                                information
                                            </p>
                                        </div>
                                        <div className="col-md-4 text-md-end mt-3 mt-md-0">
                                            {totalOneOff > 0 && (
                                                <div className="mb-2">
                                                    <div
                                                        className="opacity-75"
                                                        style={{ fontSize: '0.85rem' }}
                                                    >
                                                        One-Time Fees
                                                    </div>
                                                    <div className="display-6 fw-bold">
                                                        R{' '}
                                                        {totalOneOff.toLocaleString('en-ZA', {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2,
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                            {totalMinimum > 0 && (
                                                <div className="mb-2">
                                                    <div
                                                        className="opacity-75"
                                                        style={{ fontSize: '0.85rem' }}
                                                    >
                                                        Total Minimum
                                                    </div>
                                                    <div className="fs-4 fw-semibold">
                                                        R{' '}
                                                        {totalMinimum.toLocaleString('en-ZA', {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2,
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                            {hasRecurring && (
                                                <div
                                                    className="badge bg-warning text-dark"
                                                    style={{
                                                        fontSize: '0.85rem',
                                                        padding: '0.5rem 1rem',
                                                    }}
                                                >
                                                    + Recurring Payments
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }
                    return null;
                })()}
        </>
    );
}

// -----------------------------------------------
// Editable field
// -----------------------------------------------
function EditableField({
    label,
    value,
    disabled,
    onChange,
}: {
    label: string;
    value: string;
    disabled?: boolean;
    onChange: (value: string) => Promise<void>;
}) {
    const [localValue, setLocalValue] = useState(value);
    const [loading, setLoading] = useState(false);

    useEffect(() => setLocalValue(value), [value]);

    const handleChange = async () => {
        setLoading(true);
        try {
            await onChange(localValue);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mb-3">
            <label className="form-label">{label}</label>
            <div className="d-flex gap-2">
                <input
                    type="text"
                    className="form-control"
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    disabled={disabled || loading}
                />
                {localValue !== value && (
                    <Button variant="success" size="sm" disabled={loading} onClick={handleChange}>
                        {loading ? '...' : 'Save'}
                    </Button>
                )}
            </div>
        </div>
    );
}

// -----------------------------------------------
// Masked Field (shows last 4 digits for agents, read-only)
// -----------------------------------------------
function MaskedField({ label, value }: { label: string; value: string }) {
    const session = useAuthStore((state) => state.session);
    const isAgent = session?.user?.role === 'agent';

    // Mask sensitive data: show last 4 digits for agents
    const displayValue = () => {
        if (!value) return '';
        if (!isAgent) return value;

        // For agents: mask all but last 4 digits
        if (value.length <= 4) return value;
        const masked = '*'.repeat(value.length - 4);
        const last4 = value.slice(-4);
        return `${masked}${last4}`;
    };

    return (
        <div className="mb-3">
            <label className="form-label">{label}</label>
            <input type="text" className="form-control" value={displayValue()} readOnly disabled />
            {isAgent && value && (
                <small className="text-muted">Last 4 digits shown for security</small>
            )}
        </div>
    );
}

// -----------------------------------------------
// Client mini
// -----------------------------------------------
function ClientMini({
    data,
    onUpdate,
}: {
    data: ClientDetailPayload;
    onUpdate: (field: string, value: string) => Promise<void>;
}) {
    const [saving, setSaving] = useState<string | null>(null);

    const handleSave = async (field: string, value: string) => {
        setSaving(field);
        try {
            await onUpdate(field, value);
        } finally {
            setSaving(null);
        }
    };

    const nameParts = data.name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    return (
        <Section title="Client">
            <div className="row g-3">
                <div className="col-md-6">
                    <EditableField
                        label="First names"
                        value={firstName}
                        disabled={saving !== null}
                        onChange={(v) => handleSave('firstName', v)}
                    />
                    <EditableField
                        label="Surname"
                        value={lastName}
                        disabled={saving !== null}
                        onChange={(v) => handleSave('lastName', v)}
                    />
                    <div className="mb-3">
                        <label className="form-label">Marital Status</label>
                        <Form.Select
                            value={data.maritalStatus}
                            disabled={saving !== null}
                            onChange={(e) => handleSave('maritalStatus', e.target.value)}
                        >
                            <option value="single">Single</option>
                            <option value="married">Married</option>
                            <option value="divorced">Divorced</option>
                            <option value="widowed">Widowed</option>
                        </Form.Select>
                    </div>
                </div>
                <div className="col-md-6">
                    <Field label="ID Number" value={data.nationalId} />
                    <MaskedField label="Cell" value={data.phone} />
                    <EditableField
                        label="Email"
                        value={data.email}
                        disabled={saving !== null}
                        onChange={(v) => handleSave('email', v)}
                    />
                </div>

                <div className="col-12">
                    <EditableField
                        label="Physical Address"
                        value={data.physicalAddress || ''}
                        disabled={saving !== null}
                        onChange={(v) => handleSave('physicalAddress', v)}
                    />
                </div>

                <div className="col-12">
                    <EditableField
                        label="Postal Address"
                        value={data.postalAddress || ''}
                        disabled={saving !== null}
                        onChange={(v) => handleSave('postalAddress', v)}
                    />
                </div>

                {/* Banking Details Section */}
                <div className="col-12 mt-4">
                    <h6 className="mb-3" style={{ fontWeight: 600, color: '#667eea' }}>
                        Banking Details
                    </h6>
                </div>

                <div className="col-md-6">
                    <EditableField
                        label="Bank Name"
                        value={data.bankName || ''}
                        disabled={saving !== null}
                        onChange={(v) => handleSave('bankName', v)}
                    />
                </div>

                <div className="col-md-6">
                    <EditableField
                        label="Account Type"
                        value={data.accountType || ''}
                        disabled={saving !== null}
                        onChange={(v) => handleSave('accountType', v)}
                    />
                </div>

                <div className="col-md-6">
                    <EditableField
                        label="Account Holder"
                        value={data.accountHolder || ''}
                        disabled={saving !== null}
                        onChange={(v) => handleSave('accountHolder', v)}
                    />
                </div>

                <div className="col-md-6">
                    <MaskedField label="Account Number" value={data.accountNumber || ''} />
                </div>

                <div className="col-md-6">
                    <EditableField
                        label="Branch Code"
                        value={data.branchCode || ''}
                        disabled={saving !== null}
                        onChange={(v) => handleSave('branchCode', v)}
                    />
                </div>
            </div>
        </Section>
    );
}

// -----------------------------------------------
// Income/Expense form
// -----------------------------------------------
function IncomeExpenseForm({
    clientId,
    initial,
    onSaved,
}: {
    clientId: string;
    initial: IncomeExpense;
    onSaved: (ie: IncomeExpense) => void;
}) {
    const [form, setForm] = useState<IncomeExpense>(initial);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        setForm(initial);
        setDirty(false);
    }, [initial]);

    const addRow = (section: keyof IncomeExpense) => {
        const row: MoneyRow = { id: Math.random().toString(36).slice(2, 7), label: '', amount: 0 };
        setForm((s) => ({ ...s, [section]: [...s[section], row] }));
        setDirty(true);
    };

    const delRow = (section: keyof IncomeExpense, id: string) => {
        setForm((s) => ({ ...s, [section]: s[section].filter((r) => r.id !== id) }));
        setDirty(true);
    };

    const setCell = (section: keyof IncomeExpense, id: string, patch: Partial<MoneyRow>) => {
        setForm((s) => ({
            ...s,
            [section]: s[section].map((r) => (r.id === id ? { ...r, ...patch } : r)),
        }));
        setDirty(true);
    };

    const totalA = useMemo(() => form.income.reduce((a, r) => a + (r.amount || 0), 0), [form]);
    const totalB = useMemo(() => form.deductions.reduce((a, r) => a + (r.amount || 0), 0), [form]);
    const totalC = useMemo(() => form.expenses.reduce((a, r) => a + (r.amount || 0), 0), [form]);

    const availableForExpenses = useMemo(() => Math.max(0, totalA - totalB), [totalA, totalB]);
    const disposable = useMemo(
        () => Math.max(0, availableForExpenses - totalC),
        [availableForExpenses, totalC]
    );

    const save = async () => {
        setSaving(true);
        try {
            const totalA = form.income.reduce((a, r) => a + (r.amount || 0), 0);
            const totalB = form.deductions.reduce((a, r) => a + (r.amount || 0), 0);
            const totalC = form.expenses.reduce((a, r) => a + (r.amount || 0), 0);
            await updateClient(clientId, {
                monthlyIncome: totalA,
                monthlyExpenses: totalB + totalC,
            });
            setDirty(false);
            onSaved(form);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Section title="Income & Expense">
            <div className="row g-3">
                <div className="col-lg-6">
                    <IESection
                        title="A. Monthly Income"
                        rows={form.income}
                        onAdd={() => addRow('income')}
                        onDel={(id) => delRow('income', id)}
                        onChange={(id, patch) => setCell('income', id, patch)}
                    />
                </div>
                <div className="col-lg-6">
                    <IESection
                        title="B. Salary Deductions"
                        rows={form.deductions}
                        onAdd={() => addRow('deductions')}
                        onDel={(id) => delRow('deductions', id)}
                        onChange={(id, patch) => setCell('deductions', id, patch)}
                    />
                </div>

                <div className="col-12">
                    <div className="panel glass p-3">
                        <div className="d-flex flex-wrap gap-3">
                            <BadgeKV label="Total Income (A)" value={money(totalA)} />
                            <BadgeKV label="Total Deductions (B)" value={money(totalB)} />
                            <BadgeKV
                                label="Available for Expenses (A - B)"
                                value={money(availableForExpenses)}
                            />
                        </div>
                    </div>
                </div>

                <div className="col-12">
                    <IESection
                        title="C. Monthly Expenses"
                        rows={form.expenses}
                        onAdd={() => addRow('expenses')}
                        onDel={(id) => delRow('expenses', id)}
                        onChange={(id, patch) => setCell('expenses', id, patch)}
                    />
                </div>

                <div className="col-12">
                    <div className="panel glass p-3 d-flex flex-wrap justify-content-between align-items-center">
                        <div className="d-flex flex-wrap gap-3 align-items-center">
                            <BadgeKV label="Total Expenses (C)" value={money(totalC)} />
                            <BadgeKV label="Disposable (A - B - C)" value={money(disposable)} />
                            <span className="text-muted" style={{ fontSize: 12 }}>
                                Tip: approve products only if monthly fee ≤ disposable.
                            </span>
                        </div>
                        <Button
                            className="btn btn-primary"
                            disabled={!dirty || saving}
                            onClick={save}
                        >
                            {saving ? 'Saving…' : 'Save'}
                        </Button>
                    </div>
                </div>
            </div>
        </Section>
    );
}

function IESection({
    title,
    rows,
    onAdd,
    onDel,
    onChange,
}: {
    title: string;
    rows: MoneyRow[];
    onAdd: () => void;
    onDel: (id: string) => void;
    onChange: (id: string, patch: Partial<MoneyRow>) => void;
}) {
    return (
        <div className="panel glass p-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="m-0">{title}</h6>
                <Button
                    className="btn btn-light"
                    style={{ borderRadius: 999, border: '1px solid var(--glass-border)' }}
                    onClick={onAdd}
                >
                    <FontAwesomeIcon icon={faPlus} /> Add Row
                </Button>
            </div>

            <div className="vstack gap-2">
                {rows.map((r) => (
                    <div
                        key={r.id}
                        className="d-grid"
                        style={{ gridTemplateColumns: '1fr 160px 44px', gap: 8 }}
                    >
                        <input
                            className="form-control"
                            placeholder="Label"
                            value={r.label}
                            onChange={(e) => onChange(r.id, { label: e.currentTarget.value })}
                        />
                        <input
                            className="form-control"
                            inputMode="decimal"
                            placeholder="0"
                            value={String(r.amount ?? 0)}
                            onChange={(e) => {
                                const v = e.currentTarget.value.replace(/[^\d.]/g, '');
                                onChange(r.id, { amount: v === '' ? 0 : Number(v) });
                            }}
                        />
                        <Button
                            variant="link"
                            className="btn btn-light"
                            style={{ border: '1px solid var(--glass-border)' }}
                            onClick={() => onDel(r.id)}
                            aria-label="Delete row"
                            title="Delete row"
                        >
                            ×
                        </Button>
                    </div>
                ))}
                {rows.length === 0 && <div className="text-muted">No rows yet. Add one.</div>}
            </div>
        </div>
    );
}

function BadgeKV({ label, value }: { label: string; value: string }) {
    return (
        <div
            className="badge"
            style={{ borderColor: 'var(--glass-border)', background: 'transparent' }}
        >
            <b>{label}:</b> <span className="ms-1">{value}</span>
        </div>
    );
}

// -----------------------------------------------
// Correspondence (WhatsApp-first)
// -----------------------------------------------
function CorrespondencePanel({ clientId }: { clientId: string }) {
    const [commLogs, setCommLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadCommunications = async () => {
            try {
                const { getClientCommunications } = await import('@/api/clients.api');
                const logs = await getClientCommunications(clientId);
                setCommLogs(logs);
            } catch (error) {
                console.error('Failed to load communications:', error);
            } finally {
                setLoading(false);
            }
        };
        loadCommunications();
    }, [clientId]);

    return (
        <Section title="Correspondence">
            <Tab.Container defaultActiveKey="history">
                <Nav variant="pills" className="mb-2">
                    <Nav.Item>
                        <Nav.Link eventKey="history">Communication History</Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                        <Nav.Link eventKey="wa">WhatsApp</Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                        <Nav.Link eventKey="email">Email Log</Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                        <Nav.Link eventKey="sms">SMS Log</Nav.Link>
                    </Nav.Item>
                </Nav>
                <Tab.Content>
                    <Tab.Pane eventKey="history">
                        <CommunicationHistory logs={commLogs} loading={loading} />
                    </Tab.Pane>
                    <Tab.Pane eventKey="wa">
                        <WhatsAppChat clientId={clientId} />
                    </Tab.Pane>
                    <Tab.Pane eventKey="email">
                        <EmailLogNew logs={commLogs} loading={loading} clientId={clientId} />
                    </Tab.Pane>
                    <Tab.Pane eventKey="sms">
                        <SmsLog logs={commLogs} loading={loading} clientId={clientId} />
                    </Tab.Pane>
                </Tab.Content>
            </Tab.Container>
        </Section>
    );
}

function CommunicationHistory({ logs, loading }: { logs: any[]; loading: boolean }) {
    if (loading) {
        return <div className="text-muted">Loading communication history...</div>;
    }

    if (logs.length === 0) {
        return <div className="text-muted">No communications sent yet.</div>;
    }

    return (
        <div className="panel glass p-3">
            <div className="timeline">
                {logs.map((log, idx) => (
                    <div key={log.id} className="mb-4">
                        <div className="d-flex align-items-start">
                            <div className="me-3">
                                <div
                                    className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
                                    style={{ width: 40, height: 40 }}
                                >
                                    <i className="bi bi-envelope-check-fill"></i>
                                </div>
                            </div>
                            <div className="flex-grow-1">
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                    <h6 className="mb-0">Welcome Communications Sent</h6>
                                    <small className="text-muted">
                                        {new Date(log.createdAt).toLocaleString()}
                                    </small>
                                </div>
                                <div className="mb-2">
                                    <strong>Client:</strong> {log.clientName}
                                    <br />
                                    <strong>Email:</strong> {log.clientEmail}
                                    <br />
                                    <strong>Phone:</strong> {log.clientPhone}
                                </div>
                                <div className="row g-2">
                                    <div className="col-md-4">
                                        <div
                                            className={`alert alert-sm py-1 px-2 mb-0 ${log.communications?.email?.sent ? 'alert-success' : 'alert-danger'}`}
                                        >
                                            <i
                                                className={`bi ${log.communications?.email?.sent ? 'bi-check-circle-fill' : 'bi-x-circle-fill'} me-1`}
                                            ></i>
                                            <strong>Email:</strong>{' '}
                                            {log.communications?.email?.sent ? 'Sent' : 'Failed'}
                                            {log.communications?.email?.error && (
                                                <div className="small">
                                                    {log.communications.email.error}
                                                </div>
                                            )}
                                            {log.communications?.email?.subject && (
                                                <div className="small text-muted mt-1">
                                                    {log.communications.email.subject}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div
                                            className={`alert alert-sm py-1 px-2 mb-0 ${log.communications?.sms?.sent ? 'alert-success' : 'alert-danger'}`}
                                        >
                                            <i
                                                className={`bi ${log.communications?.sms?.sent ? 'bi-check-circle-fill' : 'bi-x-circle-fill'} me-1`}
                                            ></i>
                                            <strong>SMS:</strong>{' '}
                                            {log.communications?.sms?.sent ? 'Sent' : 'Failed'}
                                            {log.communications?.sms?.error && (
                                                <div className="small">
                                                    {log.communications.sms.error}
                                                </div>
                                            )}
                                            {log.communications?.sms?.message && (
                                                <div
                                                    className="small text-muted mt-1"
                                                    style={{
                                                        maxHeight: '40px',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                    }}
                                                >
                                                    {log.communications.sms.message.substring(
                                                        0,
                                                        50
                                                    )}
                                                    {log.communications.sms.message.length > 50
                                                        ? '...'
                                                        : ''}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div
                                            className={`alert alert-sm py-1 px-2 mb-0 ${log.communications?.whatsapp?.sent ? 'alert-success' : 'alert-danger'}`}
                                        >
                                            <i
                                                className={`bi ${log.communications?.whatsapp?.sent ? 'bi-check-circle-fill' : 'bi-x-circle-fill'} me-1`}
                                            ></i>
                                            <strong>WhatsApp:</strong>{' '}
                                            {log.communications?.whatsapp?.sent ? 'Sent' : 'Failed'}
                                            {log.communications?.whatsapp?.error && (
                                                <div className="small">
                                                    {log.communications.whatsapp.error}
                                                </div>
                                            )}
                                            {log.communications?.whatsapp?.message && (
                                                <div
                                                    className="small text-muted mt-1"
                                                    style={{
                                                        maxHeight: '40px',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                    }}
                                                >
                                                    {log.communications.whatsapp.message.substring(
                                                        0,
                                                        50
                                                    )}
                                                    {log.communications.whatsapp.message.length > 50
                                                        ? '...'
                                                        : ''}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {idx < logs.length - 1 && <hr className="mt-3" />}
                    </div>
                ))}
            </div>
        </div>
    );
}

function SmsLog({ logs, loading, clientId }: { logs: any[]; loading: boolean; clientId: string }) {
    const [sending, setSending] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [message, setMessage] = useState('');

    if (loading) {
        return <div className="text-muted">Loading SMS history...</div>;
    }

    const smsLogs = logs.filter((log) => log.communications?.sms?.sent);
    const latestLog = logs[0]; // Get the most recent log for client info

    const handleSendSms = async () => {
        if (!message.trim() || !clientId) return;

        setSending(true);
        try {
            // Import and use the API function
            const { sendSmsToClient } = await import('@/api/clients.api');
            await sendSmsToClient(clientId, message.trim());

            alert('SMS sent successfully!');
            setMessage('');
            setShowForm(false);
            // Refresh the page to show new SMS
            window.location.reload();
        } catch (error: any) {
            console.error('Error sending SMS:', error);
            alert(`Failed to send SMS: ${error.message || 'Unknown error'}`);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="panel glass p-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0">SMS History</h6>
                {latestLog && (
                    <button
                        className="btn btn-sm btn-primary"
                        onClick={() => setShowForm(!showForm)}
                    >
                        <i className="bi bi-chat-left-text me-1"></i>
                        Send SMS
                    </button>
                )}
            </div>

            {showForm && latestLog && (
                <div className="card mb-3">
                    <div className="card-body">
                        <h6>Send SMS to {latestLog.clientName}</h6>
                        <p className="text-muted small mb-2">Phone: {latestLog.clientPhone}</p>
                        <textarea
                            className="form-control mb-2"
                            rows={3}
                            placeholder="Type your message here..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            maxLength={160}
                        />
                        <div className="d-flex justify-content-between align-items-center">
                            <small className="text-muted">{message.length}/160 characters</small>
                            <div>
                                <button
                                    className="btn btn-sm btn-secondary me-2"
                                    onClick={() => {
                                        setShowForm(false);
                                        setMessage('');
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-sm btn-primary"
                                    onClick={handleSendSms}
                                    disabled={!message.trim() || sending}
                                >
                                    {sending ? 'Sending...' : 'Send'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {smsLogs.length === 0 ? (
                <div className="text-muted">No SMS messages sent yet.</div>
            ) : (
                smsLogs.map((log, idx) => (
                    <div key={log.id} className="mb-3">
                        <div className="d-flex align-items-start">
                            <div className="me-3">
                                <div
                                    className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center"
                                    style={{ width: 40, height: 40 }}
                                >
                                    <i className="bi bi-chat-left-text-fill"></i>
                                </div>
                            </div>
                            <div className="flex-grow-1">
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                    <div>
                                        <strong>{log.clientName}</strong>
                                        <div className="text-muted small">{log.clientPhone}</div>
                                    </div>
                                    <small className="text-muted">
                                        {new Date(log.createdAt).toLocaleString()}
                                    </small>
                                </div>
                                <div className="alert alert-success mb-0">
                                    <div className="d-flex align-items-center mb-2">
                                        <i className="bi bi-check-circle-fill me-2"></i>
                                        <strong>SMS Sent Successfully</strong>
                                    </div>
                                    {log.communications?.sms?.message && (
                                        <div className="p-2 bg-white rounded border">
                                            {log.communications.sms.message}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        {idx < smsLogs.length - 1 && <hr className="mt-3" />}
                    </div>
                ))
            )}
        </div>
    );
}

function EmailLogNew({
    logs,
    loading,
    clientId,
}: {
    logs: any[];
    loading: boolean;
    clientId: string;
}) {
    const [sending, setSending] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');

    if (loading) {
        return <div className="text-muted">Loading email history...</div>;
    }

    const emailLogs = logs.filter((log) => log.communications?.email?.sent);
    const latestLog = logs[0]; // Get the most recent log for client info

    const handleSendEmail = async () => {
        if (!subject.trim() || !message.trim() || !clientId) return;

        setSending(true);
        try {
            // Import and use the API function
            const { sendEmailToClient } = await import('@/api/clients.api');
            await sendEmailToClient(clientId, subject.trim(), message.trim());

            alert('Email sent successfully!');
            setSubject('');
            setMessage('');
            setShowForm(false);
            // Refresh the page to show new email
            window.location.reload();
        } catch (error: any) {
            console.error('Error sending email:', error);
            alert(`Failed to send email: ${error.message || 'Unknown error'}`);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="panel glass p-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0">Email History</h6>
                {latestLog && (
                    <button
                        className="btn btn-sm btn-primary"
                        onClick={() => setShowForm(!showForm)}
                    >
                        <i className="bi bi-envelope me-1"></i>
                        Send Email
                    </button>
                )}
            </div>

            {showForm && latestLog && (
                <div className="card mb-3">
                    <div className="card-body">
                        <h6>Send Email to {latestLog.clientName}</h6>
                        <p className="text-muted small mb-2">Email: {latestLog.clientEmail}</p>
                        <input
                            type="text"
                            className="form-control mb-2"
                            placeholder="Subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                        />
                        <textarea
                            className="form-control mb-2"
                            rows={5}
                            placeholder="Type your message here..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                        <div className="d-flex justify-content-end">
                            <button
                                className="btn btn-sm btn-secondary me-2"
                                onClick={() => {
                                    setShowForm(false);
                                    setSubject('');
                                    setMessage('');
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-sm btn-primary"
                                onClick={handleSendEmail}
                                disabled={!subject.trim() || !message.trim() || sending}
                            >
                                {sending ? 'Sending...' : 'Send Email'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {emailLogs.length === 0 ? (
                <div className="text-muted">No emails sent yet.</div>
            ) : (
                emailLogs.map((log, idx) => (
                    <div key={log.id} className="mb-3">
                        <div className="d-flex align-items-start">
                            <div className="me-3">
                                <div
                                    className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
                                    style={{ width: 40, height: 40 }}
                                >
                                    <i className="bi bi-envelope-fill"></i>
                                </div>
                            </div>
                            <div className="flex-grow-1">
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                    <div>
                                        <strong>To: {log.clientEmail}</strong>
                                        <div className="text-muted small">{log.clientName}</div>
                                    </div>
                                    <small className="text-muted">
                                        {new Date(log.createdAt).toLocaleString()}
                                    </small>
                                </div>
                                {log.communications?.email?.subject && (
                                    <div className="mb-2">
                                        <strong>Subject:</strong> {log.communications.email.subject}
                                    </div>
                                )}
                                <div className="alert alert-success mb-0">
                                    <div className="d-flex align-items-center mb-2">
                                        <i className="bi bi-check-circle-fill me-2"></i>
                                        <strong>Email Sent Successfully</strong>
                                    </div>
                                    {log.communications?.email?.html && (
                                        <details>
                                            <summary
                                                style={{ cursor: 'pointer' }}
                                                className="text-primary"
                                            >
                                                View email content
                                            </summary>
                                            <div
                                                className="mt-2 p-3 bg-white rounded border"
                                                dangerouslySetInnerHTML={{
                                                    __html: log.communications.email.html,
                                                }}
                                            />
                                        </details>
                                    )}
                                </div>
                            </div>
                        </div>
                        {idx < emailLogs.length - 1 && <hr className="mt-3" />}
                    </div>
                ))
            )}
        </div>
    );
}

function WhatsAppChat({ clientId }: { clientId: string }) {
    const [msgs, setMsgs] = useState<WhatsAppMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [whatsappReady, setWhatsappReady] = useState(false);

    useEffect(() => {
        loadMessages();
        checkWhatsAppStatus();
    }, [clientId]);

    const checkWhatsAppStatus = async () => {
        try {
            const { whatsappApi } = await import('@/api/whatsapp.api');
            const response = await whatsappApi.checkHealth();
            setWhatsappReady(response.data.isReady);
        } catch (error) {
            console.error('Failed to check WhatsApp status:', error);
            setWhatsappReady(false);
        }
    };

    const loadMessages = async () => {
        try {
            setLoading(true);
            const { whatsappApi } = await import('@/api/whatsapp.api');
            const response = await whatsappApi.getMessages(clientId, 50);
            setMsgs(response.data);
            setError(null);
        } catch (error: any) {
            console.error('Failed to load WhatsApp messages:', error);
            setError('Failed to load messages');
        } finally {
            setLoading(false);
        }
    };

    const onSend = async () => {
        if (!input.trim()) return;
        if (!whatsappReady) {
            setError('WhatsApp is not connected. Please contact an administrator.');
            return;
        }

        setSending(true);
        setError(null);

        try {
            const { whatsappApi } = await import('@/api/whatsapp.api');
            await whatsappApi.sendMessage({ clientId, message: input });
            setInput('');
            // Reload messages to show the sent message
            await loadMessages();
        } catch (error: any) {
            console.error('Failed to send WhatsApp message:', error);
            setError(error?.response?.data?.message || 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="panel glass p-0">
            {error && (
                <div className="alert alert-danger m-3 mb-0" role="alert">
                    {error}
                </div>
            )}
            {!whatsappReady && (
                <div className="alert alert-warning m-3 mb-0" role="alert">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    WhatsApp service is not ready. Messages may not be sent.
                </div>
            )}
            <div
                style={{ maxHeight: 360, overflowY: 'auto', padding: 12 }}
                className="vstack gap-2"
            >
                {loading ? (
                    <div className="text-center text-muted py-4">
                        <Spinner animation="border" size="sm" className="me-2" />
                        Loading messages...
                    </div>
                ) : msgs.length === 0 ? (
                    <div className="text-center text-muted py-4">
                        No WhatsApp messages yet. Start a conversation!
                    </div>
                ) : (
                    msgs.map((m) => (
                        <div
                            key={m.id}
                            className={`p-2 rounded ${m.direction === 'outbound' ? 'ms-auto' : 'me-auto'}`}
                            style={{
                                maxWidth: '80%',
                                background:
                                    m.direction === 'outbound'
                                        ? 'rgba(8, 180, 148, 0.15)'
                                        : 'rgba(255,255,255,0.08)',
                                border: '1px solid var(--glass-border)',
                            }}
                        >
                            <div style={{ whiteSpace: 'pre-wrap' }}>{m.message}</div>
                            <div className="text-muted" style={{ fontSize: 11 }}>
                                {new Date(m.sentAt || m.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}{' '}
                                {m.direction === 'outbound' && (
                                    <span className="ms-1">
                                        {m.status === 'sent' && '✓'}
                                        {m.status === 'delivered' && '✓✓'}
                                        {m.status === 'read' && <b>✓✓</b>}
                                        {m.status === 'failed' && (
                                            <span className="text-danger">
                                                ✗{' '}
                                                {m.errorMessage && (
                                                    <span className="small">
                                                        ({m.errorMessage})
                                                    </span>
                                                )}
                                            </span>
                                        )}
                                        {m.status === 'pending' && (
                                            <span className="text-muted">⏱</span>
                                        )}
                                    </span>
                                )}
                            </div>
                            {m.user && m.direction === 'outbound' && (
                                <div className="text-muted" style={{ fontSize: 10 }}>
                                    Sent by: {m.user.firstName} {m.user.lastName}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            <div
                className="d-flex gap-2 p-2 border-top"
                style={{ borderColor: 'var(--glass-border)' }}
            >
                <input
                    className="form-control"
                    placeholder="Type a message…"
                    value={input}
                    onChange={(e) => setInput(e.currentTarget.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !sending && onSend()}
                    disabled={sending || !whatsappReady}
                />
                <Button
                    className="btn btn-primary"
                    onClick={onSend}
                    disabled={sending || !input.trim() || !whatsappReady}
                >
                    {sending ? (
                        <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Sending...
                        </>
                    ) : (
                        <>
                            <FontAwesomeIcon icon={faPaperPlane} /> Send
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}

function EmailLog({ clientId }: { clientId: string }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [items, setItems] = useState<
        Array<{
            id: string;
            time: string;
            from?: string;
            to?: string;
            subject: string;
            snippet: string;
        }>
    >([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 10;
    const [liveFallback, setLiveFallback] = useState<
        Array<{
            id: string;
            time: string;
            from?: string;
            to?: string;
            subject: string;
            snippet: string;
        }>
    >([]);
    const [liveLoading, setLiveLoading] = useState(false);

    const fetchPage = async (p = 1) => {
        setLoading(true);
        setError(null);
        try {
            // First try to sync inbox to make sure latest messages are stored
            try {
                const { syncInbox } = await import('@/api/communications.api');
                await syncInbox();
            } catch {}

            let res = await listInboxEmails({ clientId, page: p, limit });
            // If none linked to this client, fallback to latest overall inbox
            if (res.items.length === 0 && p === 1) {
                res = await listInboxEmails({ page: p, limit });
            }
            setTotal(res.total);
            setItems(
                res.items.map((c) => ({
                    id: c.id,
                    time: c.sentAt || c.createdAt,
                    from: c.fromAddress,
                    to: c.toAddress,
                    subject: c.subject || '(no subject)',
                    // Simple snippet from stripped HTML
                    snippet: String(c.content || '')
                        .replace(/<[^>]+>/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim()
                        .slice(0, 160),
                }))
            );
            // If still nothing, attempt live IMAP inspect as a diagnostic fallback
            if (items.length === 0 && p === 1) {
                try {
                    const { inspectInbox } = await import('@/api/communications.api');
                    const previews = await inspectInbox({ limit: 10 });
                    setLiveFallback(
                        previews.map((m) => ({
                            id: String(m.uid),
                            time: m.date || new Date().toISOString(),
                            from: m.from,
                            to: m.to,
                            subject: m.subject,
                            snippet: m.preview,
                        }))
                    );
                } catch {}
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load email log');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPage(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clientId]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return (
        <div className="panel glass p-2">
            {loading && <div className="text-muted">Loading…</div>}
            {error && <div className="alert alert-danger py-1 my-2">{error}</div>}
            <div className="d-flex justify-content-end mb-2">
                <Button
                    size="sm"
                    variant="light"
                    onClick={async () => {
                        setLiveLoading(true);
                        try {
                            const { inspectInbox } = await import('@/api/communications.api');
                            const previews = await inspectInbox({ limit: 10 });
                            setLiveFallback(
                                previews.map((m) => ({
                                    id: String(m.uid),
                                    time: m.date || new Date().toISOString(),
                                    from: m.from,
                                    to: m.to,
                                    subject: m.subject,
                                    snippet: m.preview,
                                }))
                            );
                        } catch (e) {
                            setError(
                                e instanceof Error ? e.message : 'Failed to inspect live inbox'
                            );
                        } finally {
                            setLiveLoading(false);
                        }
                    }}
                    disabled={liveLoading}
                >
                    {liveLoading ? 'Loading live inbox…' : 'Load live inbox'}
                </Button>
            </div>
            {!loading && !error && items.length === 0 && liveFallback.length === 0 && (
                <div className="text-muted">No emails found.</div>
            )}
            <ul className="list-unstyled m-0">
                {items.map((m) => (
                    <li
                        key={m.id}
                        className="py-2"
                        style={{ borderBottom: '1px dashed var(--glass-border)' }}
                    >
                        <div className="d-flex justify-content-between">
                            <div style={{ fontWeight: 600 }}>{m.subject}</div>
                            <div className="text-muted" style={{ fontSize: 12 }}>
                                {new Date(m.time).toLocaleString()}
                            </div>
                        </div>
                        <div className="text-muted" style={{ fontSize: 12 }}>
                            {m.from && (
                                <>
                                    From: {m.from}
                                    {m.to ? ' → ' + m.to : ''}
                                </>
                            )}
                        </div>
                        <div>{m.snippet}</div>
                    </li>
                ))}
            </ul>
            {items.length === 0 && liveFallback.length > 0 && (
                <>
                    <div className="text-muted mb-2" style={{ fontSize: 12 }}>
                        Showing live inbox preview (not yet linked to this client)
                    </div>
                    <ul className="list-unstyled m-0">
                        {liveFallback.map((m) => (
                            <li
                                key={m.id}
                                className="py-2"
                                style={{ borderBottom: '1px dashed var(--glass-border)' }}
                            >
                                <div className="d-flex justify-content-between">
                                    <div style={{ fontWeight: 600 }}>{m.subject}</div>
                                    <div className="text-muted" style={{ fontSize: 12 }}>
                                        {new Date(m.time).toLocaleString()}
                                    </div>
                                </div>
                                <div className="text-muted" style={{ fontSize: 12 }}>
                                    {m.from && (
                                        <>
                                            From: {m.from}
                                            {m.to ? ' → ' + m.to : ''}
                                        </>
                                    )}
                                </div>
                                <div>{m.snippet}</div>
                            </li>
                        ))}
                    </ul>
                </>
            )}
            {totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-2">
                    <div className="text-muted" style={{ fontSize: 12 }}>
                        Page {page} of {totalPages}
                    </div>
                    <div className="d-flex gap-2">
                        <Button
                            size="sm"
                            variant="light"
                            disabled={page <= 1}
                            onClick={() => {
                                const np = Math.max(1, page - 1);
                                setPage(np);
                                fetchPage(np);
                            }}
                        >
                            Prev
                        </Button>
                        <Button
                            size="sm"
                            variant="light"
                            disabled={page >= totalPages}
                            onClick={() => {
                                const np = Math.min(totalPages, page + 1);
                                setPage(np);
                                fetchPage(np);
                            }}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

// -----------------------------------------------
// Right-column panels
// -----------------------------------------------
function TodoPanel({ clientId }: { clientId: string }) {
    const [todos, setTodos] = useState<
        Array<{ id: string; text: string; due: string; assignee?: string; done?: boolean }>
    >([]);

    const load = async () => {
        const res = await listTasks({ clientId, limit: 50, page: 1 });
        const mapped = res.tasks.map((t) => ({
            id: t.id,
            text: t.title,
            due: t.dueDate
                ? new Date(t.dueDate).toISOString().slice(0, 10)
                : new Date().toISOString().slice(0, 10),
            assignee: t.assignedToUser
                ? `${t.assignedToUser.firstName} ${t.assignedToUser.lastName}`
                : undefined,
            done: t.status === 'completed',
        }));
        setTodos(mapped);
    };

    useEffect(() => {
        load().catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clientId]);

    const toggle = async (id: string, done: boolean) => {
        const t = await updateTask(id, { status: done ? 'completed' : 'pending' });
        setTodos((prev) =>
            prev.map((x) => (x.id === id ? { ...x, done: t.status === 'completed' } : x))
        );
    };

    return (
        <div className="panel glass p-3 mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="m-0">To-do List</h6>
                <Button
                    className="btn btn-light"
                    style={{ borderRadius: 999, border: '1px solid var(--glass-border)' }}
                    onClick={async () => {
                        const dt = new Date();
                        dt.setDate(dt.getDate() + 3);
                        const created = await createTask({
                            title: 'Collect documents from client',
                            type: 'document_collection',
                            status: 'pending',
                            priority: 'normal',
                            dueDate: dt.toISOString(),
                            clientId,
                        });
                        setTodos((prev) => [
                            {
                                id: created.id,
                                text: created.title,
                                due: created.dueDate
                                    ? new Date(created.dueDate).toISOString().slice(0, 10)
                                    : dt.toISOString().slice(0, 10),
                                assignee: created.assignedToUser
                                    ? `${created.assignedToUser.firstName} ${created.assignedToUser.lastName}`
                                    : undefined,
                                done: created.status === 'completed',
                            },
                            ...prev,
                        ]);
                    }}
                >
                    <FontAwesomeIcon icon={faPlus} /> Add
                </Button>
            </div>
            <ul className="list-unstyled m-0">
                {todos.map((t) => (
                    <li
                        key={t.id}
                        className="py-2 d-flex justify-content-between"
                        style={{ borderBottom: '1px dashed var(--glass-border)' }}
                    >
                        <div>
                            <div style={{ fontWeight: 600 }}>{t.text}</div>
                            <div className="text-muted" style={{ fontSize: 12 }}>
                                Due {new Date(t.due).toLocaleDateString()} •{' '}
                                {t.assignee || 'Unassigned'}
                            </div>
                        </div>
                        <Form.Check
                            type="checkbox"
                            checked={!!t.done}
                            onChange={(e) => toggle(t.id, e.currentTarget.checked)}
                        />
                    </li>
                ))}
            </ul>
        </div>
    );
}

function NotesPanel({ clientId }: { clientId: string }) {
    const [notes, setNotes] = useState<ClientDetailPayload['notes']>([]);
    const [sys, setSys] = useState<ClientDetailPayload['systemLog']>([]);
    const [fin, setFin] = useState<ClientDetailPayload['financialLog']>([]);
    const [input, setInput] = useState('');

    useEffect(() => {
        // Pull notes and logs from the same client payload if available
        getClientById(clientId)
            .then((client) => {
                const cc = client as Client & {
                    clientNotes?: ClientNoteEntity[];
                    auditLogs?: AuditEntity[];
                    financialRecords?: FinancialRecordEntity[];
                };
                const mappedNotes = (cc.clientNotes || []).map((n) => ({
                    id: n.id,
                    time: n.createdAt,
                    by: n.createdByUser?.firstName || 'Agent',
                    text: n.title ? `${n.title}: ${n.content ?? ''}` : (n.content ?? ''),
                }));
                const mappedSystem = (cc.auditLogs || []).map((a) => ({
                    id: a.id,
                    time: a.createdAt,
                    by: a.actor?.firstName || (a.actorId ? 'User' : 'System'),
                    text: `${String(a.action).replace(/_/g, ' ')} on ${a.entityType || ''}${
                        a.entityId ? ` (${a.entityId})` : ''
                    }`,
                }));
                const mappedFin = (cc.financialRecords || []).map((fr) => ({
                    id: fr.id,
                    time: fr.recordedAt || fr.createdAt || new Date().toISOString(),
                    by: 'System',
                    text: `${String(fr.type || '').replace(/_/g, ' ')}: R ${Number(
                        fr.amount ?? 0
                    ).toLocaleString('en-ZA', { maximumFractionDigits: 2 })}${
                        fr.description ? ` — ${fr.description}` : ''
                    }`,
                }));
                setNotes(mappedNotes);
                setSys(mappedSystem);
                setFin(mappedFin);
            })
            .catch(() => {});
    }, [clientId]);

    return (
        <div className="panel glass p-3">
            <Tab.Container defaultActiveKey="notes">
                <Nav variant="pills" className="mb-2">
                    <Nav.Item>
                        <Nav.Link eventKey="notes">Notes</Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                        <Nav.Link eventKey="sys">System</Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                        <Nav.Link eventKey="log">Financial Log</Nav.Link>
                    </Nav.Item>
                </Nav>
                <Tab.Content>
                    <Tab.Pane eventKey="notes">
                        <div className="d-grid gap-2 mb-2">
                            <textarea
                                className="form-control"
                                rows={2}
                                placeholder="Add a note…"
                                value={input}
                                onChange={(e) => setInput(e.currentTarget.value)}
                            />
                            <div className="d-flex justify-content-end">
                                <Button className="btn btn-primary" disabled>
                                    Add (coming soon)
                                </Button>
                            </div>
                        </div>
                        <LogList items={notes} />
                    </Tab.Pane>
                    <Tab.Pane eventKey="sys">
                        <AuditLogList items={sys} />
                    </Tab.Pane>
                    <Tab.Pane eventKey="log">
                        <LogList items={fin} />
                    </Tab.Pane>
                </Tab.Content>
            </Tab.Container>
        </div>
    );
}

function LogList({
    items,
}: {
    items: Array<{ id: string; time: string; by: string; text: string }>;
}) {
    return (
        <ul className="list-unstyled m-0">
            {items.map((n) => (
                <li
                    key={n.id}
                    className="py-2"
                    style={{ borderBottom: '1px dashed var(--glass-border)' }}
                >
                    <div style={{ fontWeight: 600 }}>
                        {n.by}{' '}
                        <span className="text-muted" style={{ fontSize: 12 }}>
                            • {new Date(n.time).toLocaleString()}
                        </span>
                    </div>
                    <div>{n.text}</div>
                </li>
            ))}
        </ul>
    );
}

function AuditLogList({
    items,
}: {
    items: Array<{
        id: string;
        time: string;
        by: string;
        text: string;
        action?: string;
        entityType?: string;
        changes?: Record<string, unknown>;
        metadata?: Record<string, unknown>;
        actorType?: string;
    }>;
}) {
    const getActionBadge = (action?: string) => {
        if (!action) return null;

        const actionMap: Record<string, { bg: string; text: string }> = {
            create: { bg: 'success', text: 'Created' },
            update: { bg: 'info', text: 'Updated' },
            delete: { bg: 'danger', text: 'Deleted' },
            lead_assigned: { bg: 'primary', text: 'Lead Assigned' },
            lead_unassigned: { bg: 'warning', text: 'Lead Unassigned' },
            lead_viewed: { bg: 'secondary', text: 'Lead Viewed' },
            lead_bulk_assigned: { bg: 'primary', text: 'Bulk Assigned' },
            lead_bulk_unassigned: { bg: 'warning', text: 'Bulk Unassigned' },
            onboarding_step_completed: { bg: 'info', text: 'Step Completed' },
            onboarding_completed: { bg: 'success', text: 'Onboarding Done' },
            client_field_updated: { bg: 'info', text: 'Field Updated' },
            credit_report_downloaded: { bg: 'primary', text: 'Credit Report' },
            communication_sent: { bg: 'info', text: 'Communication' },
            status_change: { bg: 'warning', text: 'Status Changed' },
        };

        const badge = actionMap[action] || { bg: 'secondary', text: action.replace(/_/g, ' ') };

        return (
            <span className={`badge bg-${badge.bg} me-2`} style={{ fontSize: '0.75rem' }}>
                {badge.text}
            </span>
        );
    };

    return (
        <div className="list-group list-group-flush">
            {items.length === 0 ? (
                <div className="text-center text-muted py-4">
                    <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ opacity: 0.3, margin: '0 auto 1rem' }}
                    >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                    </svg>
                    <p>No audit logs yet</p>
                </div>
            ) : (
                items.map((log) => (
                    <div
                        key={log.id}
                        className="list-group-item border-0"
                        style={{
                            borderBottom: '1px solid rgba(0,0,0,0.05)',
                            padding: '1rem 0',
                        }}
                    >
                        <div className="d-flex justify-content-between align-items-start mb-2">
                            <div className="d-flex align-items-center gap-2">
                                {getActionBadge(log.action)}
                                <strong style={{ fontSize: '0.95rem' }}>{log.by}</strong>
                                {log.actorType && log.actorType !== 'user' && (
                                    <span
                                        className="badge bg-light text-dark"
                                        style={{ fontSize: '0.7rem' }}
                                    >
                                        {log.actorType}
                                    </span>
                                )}
                            </div>
                            <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                                {new Date(log.time).toLocaleString('en-ZA', {
                                    dateStyle: 'short',
                                    timeStyle: 'short',
                                })}
                            </span>
                        </div>

                        <div style={{ fontSize: '0.9rem', color: '#555' }} className="mb-2">
                            {log.text}
                        </div>

                        {/* Display field changes for client_field_updated */}
                        {log.action === 'client_field_updated' && log.changes && (
                            <div
                                className="mt-2 p-2"
                                style={{
                                    backgroundColor: '#f8f9fa',
                                    borderRadius: '6px',
                                    fontSize: '0.85rem',
                                }}
                            >
                                <div className="d-flex align-items-start gap-3">
                                    <div className="flex-shrink-0">
                                        <strong>Field:</strong>{' '}
                                        <code style={{ fontSize: '0.85rem' }}>
                                            {String(log.changes.field)}
                                        </code>
                                    </div>
                                </div>
                                <div className="mt-1">
                                    <span className="text-danger me-2">
                                        <strong>Before:</strong>{' '}
                                        {log.changes.before !== null &&
                                        log.changes.before !== undefined
                                            ? String(log.changes.before)
                                            : '(empty)'}
                                    </span>
                                    →
                                    <span className="text-success ms-2">
                                        <strong>After:</strong>{' '}
                                        {log.changes.after !== null &&
                                        log.changes.after !== undefined
                                            ? String(log.changes.after)
                                            : '(empty)'}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Display metadata if available */}
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <div className="mt-2">
                                <details>
                                    <summary
                                        style={{
                                            fontSize: '0.8rem',
                                            color: '#6c757d',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Additional details
                                    </summary>
                                    <div
                                        className="mt-2 p-2"
                                        style={{
                                            backgroundColor: '#f8f9fa',
                                            borderRadius: '6px',
                                            fontSize: '0.8rem',
                                            fontFamily: 'monospace',
                                        }}
                                    >
                                        {Object.entries(log.metadata).map(([key, value]) => (
                                            <div key={key} className="mb-1">
                                                <strong>{key}:</strong>{' '}
                                                {typeof value === 'object'
                                                    ? JSON.stringify(value, null, 2)
                                                    : String(value)}
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
}

// -----------------------------------------------
// Credit Report Viewer
// -----------------------------------------------
function CreditReportViewer({ clientId }: { clientId: string }) {
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleViewReport = async () => {
        setLoading(true);
        setError(null);
        setShowModal(true);

        try {
            const { downloadCreditReport } = await import('@/api/clients.api');
            const blob = await downloadCreditReport(clientId);
            const url = window.URL.createObjectURL(blob);
            setPdfUrl(url);
        } catch (err) {
            console.error('Failed to load credit report:', err);
            setError('Failed to load credit report. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadReport = async () => {
        try {
            const { downloadCreditReport } = await import('@/api/clients.api');
            const blob = await downloadCreditReport(clientId);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `experian-credit-report-${clientId}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to download credit report:', err);
            alert('Failed to download credit report. Please try again.');
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        if (pdfUrl) {
            window.URL.revokeObjectURL(pdfUrl);
            setPdfUrl(null);
        }
    };

    return (
        <>
            <div className="panel glass p-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                    <div>
                        <h5 className="mb-1">
                            <FontAwesomeIcon icon={faFilePdf} className="text-danger me-2" />
                            Experian Credit Report
                        </h5>
                        <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                            View comprehensive credit history and score analysis
                        </p>
                    </div>
                    <div className="text-end">
                        <div
                            className="badge bg-success"
                            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                        >
                            Available
                        </div>
                    </div>
                </div>

                <div className="row g-3 mb-4">
                    <div className="col-md-4">
                        <div className="text-center p-3 border rounded bg-light">
                            <div className="text-muted small mb-1">Credit Score</div>
                            <div className="h4 mb-0 text-primary">---</div>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="text-center p-3 border rounded bg-light">
                            <div className="text-muted small mb-1">Total Accounts</div>
                            <div className="h4 mb-0">---</div>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="text-center p-3 border rounded bg-light">
                            <div className="text-muted small mb-1">Report Date</div>
                            <div className="h4 mb-0" style={{ fontSize: '1rem' }}>
                                {new Date().toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="d-flex gap-2">
                    <Button
                        variant="primary"
                        size="lg"
                        className="flex-fill"
                        onClick={handleViewReport}
                    >
                        <FontAwesomeIcon icon={faEye} className="me-2" />
                        View Credit Report
                    </Button>
                    <Button variant="outline-primary" size="lg" onClick={handleDownloadReport}>
                        <FontAwesomeIcon icon={faDownload} />
                    </Button>
                </div>

                <div className="mt-3 pt-3 border-top">
                    <div className="d-flex align-items-start gap-2">
                        <FontAwesomeIcon
                            icon={faTriangleExclamation}
                            className="text-warning mt-1"
                        />
                        <small className="text-muted">
                            This is a <strong>UAT credit report</strong> generated for demonstration
                            purposes. It does not represent actual credit bureau data.
                        </small>
                    </div>
                </div>
            </div>

            {/* PDF Preview Modal */}
            <Modal
                show={showModal}
                onHide={handleCloseModal}
                size="xl"
                centered
                backdrop="static"
                className="credit-report-modal"
            >
                <Modal.Header className="border-0 pb-0">
                    <div className="w-100">
                        <div className="d-flex align-items-center justify-content-between">
                            <div>
                                <h5 className="mb-1">
                                    <FontAwesomeIcon
                                        icon={faFilePdf}
                                        className="text-danger me-2"
                                    />
                                    Experian Credit Report
                                </h5>
                                <small className="text-muted">
                                    Generated on {new Date().toLocaleDateString()}
                                </small>
                            </div>
                            <div className="d-flex gap-2">
                                <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={handleDownloadReport}
                                    disabled={loading}
                                >
                                    <FontAwesomeIcon icon={faDownload} className="me-1" />
                                    Download PDF
                                </Button>
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={handleCloseModal}
                                >
                                    <FontAwesomeIcon icon={faTimes} />
                                </Button>
                            </div>
                        </div>
                    </div>
                </Modal.Header>
                <Modal.Body className="p-0" style={{ height: '80vh' }}>
                    {loading && (
                        <div
                            className="d-flex align-items-center justify-content-center"
                            style={{ height: '100%' }}
                        >
                            <div className="text-center">
                                <Spinner animation="border" variant="primary" className="mb-3" />
                                <p className="text-muted">Generating credit report...</p>
                            </div>
                        </div>
                    )}
                    {error && (
                        <div
                            className="d-flex align-items-center justify-content-center"
                            style={{ height: '100%' }}
                        >
                            <div className="text-center text-danger">
                                <FontAwesomeIcon
                                    icon={faTriangleExclamation}
                                    size="3x"
                                    className="mb-3"
                                />
                                <p>{error}</p>
                                <Button variant="primary" onClick={handleViewReport}>
                                    Try Again
                                </Button>
                            </div>
                        </div>
                    )}
                    {!loading && !error && pdfUrl && (
                        <iframe
                            src={pdfUrl}
                            style={{
                                width: '100%',
                                height: '100%',
                                border: 'none',
                            }}
                            title="Credit Report Preview"
                        />
                    )}
                </Modal.Body>
            </Modal>

            <style>{`
                .credit-report-modal .modal-content {
                    border-radius: 12px;
                    overflow: hidden;
                }
                .credit-report-modal .modal-header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 1.5rem;
                }
                .credit-report-modal .modal-header h5 {
                    color: white;
                    margin: 0;
                }
                .credit-report-modal .modal-header small {
                    color: rgba(255, 255, 255, 0.8);
                }
                .credit-report-modal .modal-header .btn {
                    background: rgba(255, 255, 255, 0.2);
                    border-color: rgba(255, 255, 255, 0.3);
                    color: white;
                }
                .credit-report-modal .modal-header .btn:hover {
                    background: rgba(255, 255, 255, 0.3);
                    border-color: rgba(255, 255, 255, 0.4);
                    color: white;
                }
            `}</style>
        </>
    );
}

// -----------------------------------------------
// Small helpers
// -----------------------------------------------
function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mb-3">
            <div className="d-flex align-items-start gap-2 mb-2">
                <div
                    className="badge"
                    style={{ borderColor: 'var(--glass-border)', background: 'transparent' }}
                >
                    {title}
                </div>
                <div style={{ height: 1, background: 'var(--glass-border)', flex: 1 }} />
            </div>
            {children}
        </div>
    );
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-muted" style={{ fontSize: 12 }}>
                {label}
            </div>
            <div style={{ fontWeight: 600 }}>{value}</div>
        </div>
    );
}

function Flag({ flag }: { flag: 'green' | 'amber' | 'red' }) {
    const map = { green: '#08b494', amber: '#f6a500', red: '#ff7a7a' } as const;
    return (
        <span
            style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: map[flag],
                display: 'inline-block',
            }}
            aria-label={`${flag} flag`}
        />
    );
}
