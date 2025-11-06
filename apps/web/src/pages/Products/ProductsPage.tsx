import { useEffect, useMemo, useState } from 'react';
import {
    Button,
    Form,
    InputGroup,
    Table,
    Badge,
    Dropdown,
    Spinner,
    Pagination,
} from 'react-bootstrap';
import {
    listProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    setProductStatus,
} from '@/api/products';
import type { Product, ProductStatus } from '@/interfaces/Product';
import ProductForm from '@/components/products/ProductForm';

type Sort = { key: keyof Product; dir: 'asc' | 'desc' };

export default function ProductsPage() {
    const [rows, setRows] = useState<Product[]>([]);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<ProductStatus | ''>('');
    const [loading, setLoading] = useState(false);

    const [showForm, setShowForm] = useState(false);
    const [editRow, setEditRow] = useState<Product | null>(null);

    const [sort, setSort] = useState<Sort>({ key: 'createdAt', dir: 'desc' });

    async function load() {
        setLoading(true);
        try {
            const resp = await listProducts({
                page,
                limit,
                search: search.trim() || undefined,
                status: status || undefined,
            });
            setRows(resp.products);
            setTotal(resp.total);
            setTotalPages(resp.totalPages);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load(); /* eslint-disable-next-line */
    }, [page, limit, status]);

    // Local sort for any column (cheap & snappy)
    const visible = useMemo(() => {
        const sorted = [...rows].sort((a, b) => {
            const va = String(a[sort.key] ?? '').toLowerCase();
            const vb = String(b[sort.key] ?? '').toLowerCase();
            if (va < vb) return sort.dir === 'asc' ? -1 : 1;
            if (va > vb) return sort.dir === 'asc' ? 1 : -1;
            return 0;
        });
        // Optional: client-side search as you type (without roundtrip)
        if (!search) return sorted;
        const q = search.toLowerCase();
        return sorted.filter(
            (r) =>
                r.code.toLowerCase().includes(q) ||
                r.name.toLowerCase().includes(q) ||
                (r.description || '').toLowerCase().includes(q)
        );
    }, [rows, sort, search]);

    function toggleSort(key: keyof Product) {
        setSort((s) =>
            s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
        );
    }

    async function handleSave(values: Partial<Product>) {
        if (editRow) {
            await updateProduct(editRow.id, values);
        } else {
            await createProduct(values);
        }
        setShowForm(false);
        setEditRow(null);
        await load();
    }

    async function handleDelete(row: Product) {
        if (!confirm(`Delete product "${row.name}"?`)) return;
        await deleteProduct(row.id);
        await load();
    }

    async function handleStatus(row: Product, s: ProductStatus) {
        await setProductStatus(row.id, s);
        await load();
    }

    // Calculate stats
    const activeProducts = rows.filter((r) => r.status === 'active').length;
    const categories = new Set(rows.map((r) => r.category)).size;

    const canPrev = page > 1;
    const canNext = page < totalPages;

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
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                                        <text
                                            x="12"
                                            y="18"
                                            fontSize="20"
                                            fontWeight="bold"
                                            textAnchor="middle"
                                            fill="white"
                                        >
                                            R
                                        </text>
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-white mb-1 fw-bold">Product Catalog</h2>
                                    <p className="text-white text-opacity-75 mb-0">
                                        Manage loan products and their configurations
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="row g-3 text-white">
                                <div className="col-4">
                                    <div className="text-center">
                                        <div className="fs-3 fw-bold">{total}</div>
                                        <div className="small opacity-75">Total Products</div>
                                    </div>
                                </div>
                                <div className="col-4">
                                    <div className="text-center">
                                        <div className="fs-3 fw-bold">{activeProducts}</div>
                                        <div className="small opacity-75">Active</div>
                                    </div>
                                </div>
                                <div className="col-4">
                                    <div className="text-center">
                                        <div className="fs-3 fw-bold">{categories}</div>
                                        <div className="small opacity-75">Categories</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '12px' }}>
                <div className="card-body p-3">
                    <div className="row align-items-center g-3">
                        <div className="col-md-4">
                            <InputGroup className="shadow-sm">
                                <InputGroup.Text
                                    className="bg-white border-end-0"
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
                                </InputGroup.Text>
                                <Form.Control
                                    placeholder="Search by code, name, or description..."
                                    className="border-start-0 border-end-0 ps-0"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            setPage(1);
                                            void load();
                                        }
                                    }}
                                />
                                <Button
                                    variant="outline-secondary"
                                    style={{ borderRadius: '0 8px 8px 0' }}
                                    onClick={() => {
                                        setPage(1);
                                        void load();
                                    }}
                                >
                                    Search
                                </Button>
                            </InputGroup>
                        </div>
                        <div className="col-md-3">
                            <Form.Select
                                className="shadow-sm"
                                style={{ borderRadius: '8px' }}
                                value={status}
                                onChange={(e) => {
                                    setStatus(e.target.value as ProductStatus | '');
                                    setPage(1);
                                }}
                            >
                                <option value="">All Statuses</option>
                                <option value="active">Active Only</option>
                                <option value="inactive">Inactive Only</option>
                                <option value="archived">Archived Only</option>
                            </Form.Select>
                        </div>
                        <div className="col-md-2">
                            <Form.Select
                                className="shadow-sm"
                                style={{ borderRadius: '8px' }}
                                value={limit}
                                onChange={(e) => {
                                    setLimit(Number(e.target.value));
                                    setPage(1);
                                }}
                            >
                                <option value={10}>10 per page</option>
                                <option value={20}>20 per page</option>
                                <option value={30}>30 per page</option>
                                <option value={50}>50 per page</option>
                            </Form.Select>
                        </div>
                        <div className="col-md-3 text-end">
                            <Button
                                variant="primary"
                                className="shadow-sm px-4"
                                style={{
                                    borderRadius: '8px',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    border: 'none',
                                }}
                                onClick={() => {
                                    setEditRow(null);
                                    setShowForm(true);
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
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="16"></line>
                                    <line x1="8" y1="12" x2="16" y2="12"></line>
                                </svg>
                                Add Product
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Table Card */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                <div className="card-body p-0">
                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner
                                animation="border"
                                style={{ width: '3rem', height: '3rem', color: '#667eea' }}
                            />
                            <p className="text-muted mt-3 mb-0">Loading products...</p>
                        </div>
                    ) : (
                        <>
                            <div style={{ overflowX: 'auto' }}>
                                <Table hover responsive className="align-middle mb-0">
                                    <thead
                                        style={{
                                            background: '#f8f9fa',
                                            borderBottom: '2px solid #dee2e6',
                                        }}
                                    >
                                        <tr>
                                            <Th
                                                label="Product Code"
                                                onClick={() => toggleSort('code')}
                                                active={sort.key === 'code'}
                                                dir={sort.dir}
                                            />
                                            <Th
                                                label="Product Name"
                                                onClick={() => toggleSort('name')}
                                                active={sort.key === 'name'}
                                                dir={sort.dir}
                                            />
                                            <Th
                                                label="Category"
                                                onClick={() => toggleSort('category')}
                                                active={sort.key === 'category'}
                                                dir={sort.dir}
                                            />
                                            <Th
                                                label="Status"
                                                onClick={() => toggleSort('status')}
                                                active={sort.key === 'status'}
                                                dir={sort.dir}
                                            />
                                            <th
                                                style={{
                                                    width: '100px',
                                                    fontWeight: 600,
                                                    fontSize: '0.875rem',
                                                    color: '#495057',
                                                    padding: '1rem 0.75rem',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px',
                                                    textAlign: 'center',
                                                }}
                                            >
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visible.length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan={5}
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
                                                                No products found
                                                            </div>
                                                            <div className="small text-muted">
                                                                Try adjusting your search or filters
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        {visible.map((row) => (
                                            <tr
                                                key={row.id}
                                                style={{
                                                    borderBottom: '1px solid #e9ecef',
                                                    transition: 'all 0.2s ease',
                                                }}
                                                className="product-row"
                                            >
                                                <td style={{ padding: '1rem 0.75rem' }}>
                                                    <code
                                                        className="bg-light px-2 py-1 rounded fw-semibold"
                                                        style={{ fontSize: '0.85rem' }}
                                                    >
                                                        {row.code}
                                                    </code>
                                                </td>
                                                <td
                                                    style={{
                                                        padding: '1rem 0.75rem',
                                                        fontWeight: 500,
                                                    }}
                                                >
                                                    {row.name}
                                                    {row.description && (
                                                        <div className="small text-muted mt-1">
                                                            {row.description}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '1rem 0.75rem' }}>
                                                    <span className="text-capitalize">
                                                        {row.category}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem 0.75rem' }}>
                                                    {row.status === 'active' && (
                                                        <Badge bg="success" className="px-3 py-2">
                                                            Active
                                                        </Badge>
                                                    )}
                                                    {row.status === 'inactive' && (
                                                        <Badge bg="secondary" className="px-3 py-2">
                                                            Inactive
                                                        </Badge>
                                                    )}
                                                    {row.status === 'archived' && (
                                                        <Badge bg="dark" className="px-3 py-2">
                                                            Archived
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td
                                                    style={{
                                                        padding: '1rem 0.75rem',
                                                        textAlign: 'center',
                                                    }}
                                                >
                                                    <Dropdown align="end">
                                                        <Dropdown.Toggle
                                                            variant="light"
                                                            size="sm"
                                                            className="border-0"
                                                            style={{
                                                                borderRadius: '8px',
                                                                padding: '0.375rem 0.75rem',
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
                                                            >
                                                                <circle
                                                                    cx="12"
                                                                    cy="12"
                                                                    r="1"
                                                                ></circle>
                                                                <circle
                                                                    cx="12"
                                                                    cy="5"
                                                                    r="1"
                                                                ></circle>
                                                                <circle
                                                                    cx="12"
                                                                    cy="19"
                                                                    r="1"
                                                                ></circle>
                                                            </svg>
                                                        </Dropdown.Toggle>

                                                        <Dropdown.Menu
                                                            style={{
                                                                borderRadius: '8px',
                                                                minWidth: '160px',
                                                            }}
                                                        >
                                                            <Dropdown.Item
                                                                onClick={() => {
                                                                    setEditRow(row);
                                                                    setShowForm(true);
                                                                }}
                                                                className="d-flex align-items-center gap-2"
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
                                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                                </svg>
                                                                Edit
                                                            </Dropdown.Item>
                                                            <Dropdown.Item
                                                                onClick={() =>
                                                                    void handleStatus(
                                                                        row,
                                                                        row.status === 'active'
                                                                            ? 'inactive'
                                                                            : 'active'
                                                                    )
                                                                }
                                                                className="d-flex align-items-center gap-2"
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
                                                                    <circle
                                                                        cx="12"
                                                                        cy="12"
                                                                        r="10"
                                                                    ></circle>
                                                                    <line
                                                                        x1="8"
                                                                        y1="12"
                                                                        x2="16"
                                                                        y2="12"
                                                                    ></line>
                                                                </svg>
                                                                {row.status === 'active'
                                                                    ? 'Set Inactive'
                                                                    : 'Set Active'}
                                                            </Dropdown.Item>
                                                            <Dropdown.Divider />
                                                            <Dropdown.Item
                                                                className="text-danger d-flex align-items-center gap-2"
                                                                onClick={() =>
                                                                    void handleDelete(row)
                                                                }
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
                                                                    <polyline points="3 6 5 6 21 6"></polyline>
                                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                                </svg>
                                                                Delete
                                                            </Dropdown.Item>
                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <style>{`
                                        .product-row:hover {
                                            background-color: #f8f9fa;
                                            transform: translateY(-1px);
                                            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                                        }
                                    `}</style>
                                </Table>
                            </div>

                            {/* Pagination Footer */}
                            <div
                                className="d-flex justify-content-between align-items-center px-4 py-3"
                                style={{
                                    borderTop: '1px solid #e9ecef',
                                    background: '#f8f9fa',
                                    borderRadius: '0 0 12px 12px',
                                }}
                            >
                                <div className="text-muted">
                                    <span className="fw-semibold">
                                        {total === 0 ? 0 : (page - 1) * limit + 1}–
                                        {Math.min(page * limit, total)}
                                    </span>{' '}
                                    of <span className="fw-semibold">{total}</span> products
                                </div>
                                <Pagination className="mb-0" size="sm">
                                    <Pagination.First
                                        disabled={!canPrev}
                                        onClick={() => setPage(1)}
                                    />
                                    <Pagination.Prev
                                        disabled={!canPrev}
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    />
                                    <Pagination.Item active>
                                        {page} / {totalPages}
                                    </Pagination.Item>
                                    <Pagination.Next
                                        disabled={!canNext}
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    />
                                    <Pagination.Last
                                        disabled={!canNext}
                                        onClick={() => setPage(totalPages)}
                                    />
                                </Pagination>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <ProductForm
                show={showForm}
                onClose={() => {
                    setShowForm(false);
                    setEditRow(null);
                }}
                onSubmit={handleSave}
                initial={editRow || undefined}
            />
        </div>
    );
}

function Th({
    label,
    onClick,
    active,
    dir,
}: {
    label: string;
    onClick: () => void;
    active: boolean;
    dir: 'asc' | 'desc';
}) {
    return (
        <th
            role="button"
            onClick={onClick}
            style={{
                whiteSpace: 'nowrap',
                fontWeight: 600,
                fontSize: '0.875rem',
                color: '#495057',
                padding: '1rem 0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                cursor: 'pointer',
                userSelect: 'none',
            }}
            className={active ? 'text-primary' : ''}
        >
            <div className="d-flex align-items-center gap-2">
                {label}
                {active && <span style={{ fontSize: '0.75rem' }}>{dir === 'asc' ? '↑' : '↓'}</span>}
            </div>
        </th>
    );
}
