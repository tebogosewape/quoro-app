import { useEffect, useState } from 'react';
import { Table, Spinner, Alert, Badge, Button, Form, InputGroup, Modal } from 'react-bootstrap';
import { listProducts, updateProduct } from '@/api/products';
import type { Product } from '@/interfaces/Product';
import { hasPermission } from '@/utils/permissions';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'react-toastify';

// Helper to format commission rules for display
function formatCommissionRules(rules: any): string {
    if (!rules) return 'Not configured';

    try {
        const r = typeof rules === 'string' ? JSON.parse(rules) : rules;

        // Check for different commission structures
        if (r.firstPayment) {
            return `R ${r.firstPayment.toFixed(2)} on first payment`;
        }
        if (r.percentage) {
            const applicableOn = r.applicableOn ? ` (${r.applicableOn.replace(/_/g, ' ')})` : '';
            return `${r.percentage}%${applicableOn}`;
        }
        if (r.rate) {
            return `${r.rate}% commission`;
        }

        return JSON.stringify(r);
    } catch {
        return String(rules);
    }
}

export default function CommissionSettings() {
    const session = useAuthStore((s) => s.session);
    const canView = hasPermission('view-commissions');
    const canManage = hasPermission('manage-commissions');

    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState<Product[]>([]);
    const [error, setError] = useState<string>('');

    // Edit modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [editType, setEditType] = useState<'fixed' | 'percentage'>('fixed');
    const [fixedAmount, setFixedAmount] = useState('');
    const [percentageValue, setPercentageValue] = useState('');
    const [applicableOn, setApplicableOn] = useState('first_instalment');
    const [saving, setSaving] = useState(false);

    async function loadProducts() {
        setLoading(true);
        try {
            const resp = await listProducts({ limit: 100, status: 'active' });
            setProducts(resp.products);
        } catch (e: any) {
            setError(e?.message || 'Failed to load products');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        setError('');
        if (!canView) {
            setLoading(false);
            return;
        }
        loadProducts();
    }, [session?.user?.id, canView]);

    function handleEditClick(product: Product) {
        setEditingProduct(product);

        // Parse existing commission rules
        try {
            const rules = product.agent_commission_rules;
            const r = typeof rules === 'string' ? JSON.parse(rules) : rules;

            if (r?.firstPayment) {
                setEditType('fixed');
                setFixedAmount(String(r.firstPayment));
            } else if (r?.percentage) {
                setEditType('percentage');
                setPercentageValue(String(r.percentage));
                setApplicableOn(r.applicableOn || 'first_instalment');
            } else {
                // Default to fixed
                setEditType('fixed');
                setFixedAmount('');
            }
        } catch {
            setEditType('fixed');
            setFixedAmount('');
        }

        setShowEditModal(true);
    }

    async function handleSaveCommission() {
        if (!editingProduct) return;

        setSaving(true);
        try {
            let commissionRules: any;

            if (editType === 'fixed') {
                const amount = parseFloat(fixedAmount);
                if (isNaN(amount) || amount < 0) {
                    toast.error('Please enter a valid amount');
                    return;
                }
                commissionRules = { firstPayment: amount };
            } else {
                const pct = parseFloat(percentageValue);
                if (isNaN(pct) || pct < 0 || pct > 100) {
                    toast.error('Please enter a valid percentage (0-100)');
                    return;
                }
                commissionRules = {
                    percentage: pct,
                    applicableOn: applicableOn,
                };
            }

            await updateProduct(editingProduct.id, {
                agent_commission_rules: commissionRules,
            });

            toast.success(`Commission updated for ${editingProduct.name}`);
            setShowEditModal(false);
            loadProducts();
        } catch (e: any) {
            toast.error(e?.message || 'Failed to update commission');
        } finally {
            setSaving(false);
        }
    }

    function handleCloseModal() {
        setShowEditModal(false);
        setEditingProduct(null);
        setFixedAmount('');
        setPercentageValue('');
        setApplicableOn('first_instalment');
    }

    if (!canView) {
        return (
            <div className="container-fluid px-4 py-4">
                <div
                    className="card border-0 shadow-sm mb-4"
                    style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: '16px',
                    }}
                >
                    <div className="card-body p-4">
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
                                    <line x1="12" y1="1" x2="12" y2="23"></line>
                                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-white mb-1 fw-bold">Commission Settings</h2>
                                <p className="text-white text-opacity-75 mb-0">
                                    Product-specific commission rates for agents
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                    <div className="card-body p-4">
                        <div className="text-center py-4">
                            <div
                                className="bg-warning bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                                style={{ width: '80px', height: '80px' }}
                            >
                                <svg
                                    width="40"
                                    height="40"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#ffc107"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                    <line x1="12" y1="9" x2="12" y2="13"></line>
                                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                </svg>
                            </div>
                            <h5 className="mb-2">Permission Required</h5>
                            <p className="text-muted mb-3">
                                You need the following permission to view this page:
                            </p>
                            <code className="bg-light px-3 py-2 rounded">view-commissions</code>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid px-4 py-4">
            <div
                className="card border-0 shadow-sm mb-4"
                style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '16px',
                }}
            >
                <div className="card-body p-4">
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
                                <line x1="12" y1="1" x2="12" y2="23"></line>
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-white mb-1 fw-bold">Commission Settings</h2>
                            <p className="text-white text-opacity-75 mb-0">
                                Product-specific commission rates for agents
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <Alert variant="info" className="mb-4">
                <div className="d-flex align-items-start">
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="me-2 mt-1"
                    >
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    <div>
                        <strong>Product-Specific Commission</strong>
                        <p className="mb-0 mt-1">
                            {canManage
                                ? 'Click the Edit button to configure commission rules for each product. You can set fixed amounts or percentage-based commissions.'
                                : 'Commission rates are configured per product. Contact an administrator to modify them.'}
                        </p>
                    </div>
                </div>
            </Alert>

            {error && (
                <Alert variant="danger" onClose={() => setError('')} dismissible className="mb-4">
                    {error}
                </Alert>
            )}

            <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                <div className="card-body p-0">
                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner
                                animation="border"
                                style={{ width: '3rem', height: '3rem', color: '#667eea' }}
                            />
                            <p className="text-muted mt-3 mb-0">Loading commission settings...</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <Table hover responsive className="align-middle mb-0">
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
                                            Product Code
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
                                            Product Name
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
                                            Category
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
                                            Agent Commission
                                        </th>
                                        {canManage && (
                                            <th
                                                style={{
                                                    fontWeight: 600,
                                                    fontSize: '0.875rem',
                                                    color: '#495057',
                                                    padding: '1rem 0.75rem',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px',
                                                    width: '120px',
                                                    textAlign: 'center',
                                                }}
                                            >
                                                Actions
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={canManage ? 5 : 4}
                                                className="text-center py-5"
                                                style={{ color: '#6c757d' }}
                                            >
                                                <div className="d-flex flex-column align-items-center gap-3">
                                                    <svg
                                                        width="64"
                                                        height="64"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="1"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        opacity="0.3"
                                                    >
                                                        <circle cx="9" cy="21" r="1"></circle>
                                                        <circle cx="20" cy="21" r="1"></circle>
                                                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                                                    </svg>
                                                    <div>
                                                        <div className="fw-semibold mb-1">
                                                            No active products found
                                                        </div>
                                                        <div className="small text-muted">
                                                            Add products to configure commission
                                                            rates
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    {products.map((product) => (
                                        <tr
                                            key={product.id}
                                            style={{
                                                borderBottom: '1px solid #e9ecef',
                                            }}
                                        >
                                            <td style={{ padding: '1rem 0.75rem' }}>
                                                <code
                                                    className="bg-light px-2 py-1 rounded fw-semibold"
                                                    style={{ fontSize: '0.85rem' }}
                                                >
                                                    {product.code}
                                                </code>
                                            </td>
                                            <td
                                                style={{
                                                    padding: '1rem 0.75rem',
                                                    fontWeight: 500,
                                                }}
                                            >
                                                {product.name}
                                            </td>
                                            <td style={{ padding: '1rem 0.75rem' }}>
                                                <span className="text-capitalize">
                                                    {product.category.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem 0.75rem' }}>
                                                <Badge
                                                    bg={
                                                        product.agent_commission_rules
                                                            ? 'success'
                                                            : 'secondary'
                                                    }
                                                    className="px-3 py-2"
                                                >
                                                    {formatCommissionRules(
                                                        product.agent_commission_rules
                                                    )}
                                                </Badge>
                                            </td>
                                            {canManage && (
                                                <td
                                                    style={{
                                                        padding: '1rem 0.75rem',
                                                        textAlign: 'center',
                                                    }}
                                                >
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        onClick={() => handleEditClick(product)}
                                                        style={{
                                                            borderRadius: '8px',
                                                            padding: '0.375rem 0.75rem',
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
                                                            style={{ marginRight: '4px' }}
                                                        >
                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                        </svg>
                                                        Edit
                                                    </Button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Commission Modal */}
            <Modal show={showEditModal} onHide={handleCloseModal} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Edit Commission - {editingProduct?.name}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Commission Type</Form.Label>
                            <div className="d-flex gap-3">
                                <Form.Check
                                    type="radio"
                                    label="Fixed Amount"
                                    name="commissionType"
                                    checked={editType === 'fixed'}
                                    onChange={() => setEditType('fixed')}
                                />
                                <Form.Check
                                    type="radio"
                                    label="Percentage"
                                    name="commissionType"
                                    checked={editType === 'percentage'}
                                    onChange={() => setEditType('percentage')}
                                />
                            </div>
                        </Form.Group>

                        {editType === 'fixed' ? (
                            <Form.Group className="mb-3">
                                <Form.Label>Fixed Amount (R)</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text>R</InputGroup.Text>
                                    <Form.Control
                                        type="number"
                                        placeholder="e.g., 100.00"
                                        step="0.01"
                                        min="0"
                                        value={fixedAmount}
                                        onChange={(e) => setFixedAmount(e.target.value)}
                                    />
                                </InputGroup>
                                <Form.Text className="text-muted">
                                    Agent will receive this fixed amount on first payment
                                </Form.Text>
                            </Form.Group>
                        ) : (
                            <>
                                <Form.Group className="mb-3">
                                    <Form.Label>Percentage (%)</Form.Label>
                                    <InputGroup>
                                        <Form.Control
                                            type="number"
                                            placeholder="e.g., 5"
                                            step="0.1"
                                            min="0"
                                            max="100"
                                            value={percentageValue}
                                            onChange={(e) => setPercentageValue(e.target.value)}
                                        />
                                        <InputGroup.Text>%</InputGroup.Text>
                                    </InputGroup>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Applicable On</Form.Label>
                                    <Form.Select
                                        value={applicableOn}
                                        onChange={(e) => setApplicableOn(e.target.value)}
                                    >
                                        <option value="first_instalment">First Instalment</option>
                                        <option value="all_instalments">All Instalments</option>
                                        <option value="first_payment">First Payment</option>
                                        <option value="total_amount">Total Amount</option>
                                    </Form.Select>
                                    <Form.Text className="text-muted">
                                        Select when the commission percentage applies
                                    </Form.Text>
                                </Form.Group>
                            </>
                        )}

                        <Alert variant="info" className="mb-0">
                            <small>
                                <strong>Product:</strong> {editingProduct?.name} (
                                {editingProduct?.code})
                                <br />
                                <strong>Category:</strong>{' '}
                                {editingProduct?.category.replace(/_/g, ' ')}
                            </small>
                        </Alert>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseModal} disabled={saving}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSaveCommission} disabled={saving}>
                        {saving ? (
                            <>
                                <Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    role="status"
                                    className="me-2"
                                />
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
