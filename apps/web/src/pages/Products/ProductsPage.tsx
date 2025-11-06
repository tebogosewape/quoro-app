import { useEffect, useMemo, useState } from 'react';
import { Button, Form, InputGroup, Table, Badge, Dropdown } from 'react-bootstrap';
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

    return (
        <div className="container-fluid py-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
                <h5 className="m-0">Products</h5>
                <div className="d-flex align-items-center gap-2">
                    {/* Compact search */}
                    <InputGroup size="sm" style={{ width: 260 }}>
                        <Form.Control
                            placeholder="Search code, name, description"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') void load();
                            }}
                        />
                        <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => {
                                setPage(1);
                                void load();
                            }}
                        >
                            Go
                        </Button>
                    </InputGroup>

                    {/* Status filter (compact) */}
                    <Form.Select
                        size="sm"
                        value={status}
                        onChange={(e) => {
                            setStatus(e.target.value as ProductStatus | '');
                            setPage(1);
                        }}
                        style={{ width: 150 }}
                        title="Status filter"
                    >
                        <option value="">All statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="archived">Archived</option>
                    </Form.Select>

                    {/* Page size (compact) */}
                    <Form.Select
                        size="sm"
                        value={limit}
                        onChange={(e) => {
                            setLimit(Number(e.target.value));
                            setPage(1);
                        }}
                        style={{ width: 90 }}
                        title="Rows per page"
                    >
                        {[10, 20, 30, 50].map((n) => (
                            <option key={n} value={n}>
                                {n}/pg
                            </option>
                        ))}
                    </Form.Select>

                    <Button
                        size="sm"
                        onClick={() => {
                            setEditRow(null);
                            setShowForm(true);
                        }}
                    >
                        + Add
                    </Button>
                </div>
            </div>

            <div className="table-responsive border rounded">
                <Table hover size="sm" className="mb-0 align-middle">
                    <thead className="table-light sticky-top" style={{ top: 0, zIndex: 1 }}>
                        <tr>
                            <Th
                                label="Code"
                                onClick={() => toggleSort('code')}
                                active={sort.key === 'code'}
                                dir={sort.dir}
                            />
                            <Th
                                label="Name"
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
                            <th style={{ width: 130 }} className="text-end">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && (
                            <tr>
                                <td colSpan={5} className="text-center py-4">
                                    Loading…
                                </td>
                            </tr>
                        )}
                        {!loading && visible.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center py-4">
                                    No products
                                </td>
                            </tr>
                        )}
                        {!loading &&
                            visible.map((row) => (
                                <tr key={row.id}>
                                    <td className="text-monospace">{row.code}</td>
                                    <td>{row.name}</td>
                                    <td>{row.category}</td>
                                    <td>
                                        {row.status === 'active' && (
                                            <Badge bg="success">active</Badge>
                                        )}
                                        {row.status === 'inactive' && (
                                            <Badge bg="secondary">inactive</Badge>
                                        )}
                                        {row.status === 'archived' && (
                                            <Badge bg="dark">archived</Badge>
                                        )}
                                    </td>
                                    <td className="text-end">
                                        <Dropdown align="end">
                                            <Dropdown.Toggle size="sm" variant="outline-secondary">
                                                ⋮
                                            </Dropdown.Toggle>
                                            <Dropdown.Menu>
                                                <Dropdown.Item
                                                    onClick={() => {
                                                        setEditRow(row);
                                                        setShowForm(true);
                                                    }}
                                                >
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
                                                >
                                                    {row.status === 'active'
                                                        ? 'Set Inactive'
                                                        : 'Set Active'}
                                                </Dropdown.Item>
                                                <Dropdown.Divider />
                                                <Dropdown.Item
                                                    className="text-danger"
                                                    onClick={() => void handleDelete(row)}
                                                >
                                                    Delete
                                                </Dropdown.Item>
                                            </Dropdown.Menu>
                                        </Dropdown>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </Table>
            </div>

            {/* Pagination bar (compact) */}
            <div className="d-flex justify-content-between align-items-center mt-2">
                <small className="text-muted">
                    {total} total • Page {page} / {totalPages}
                </small>
                <div className="d-flex gap-1">
                    <Button
                        size="sm"
                        variant="light"
                        disabled={page <= 1}
                        onClick={() => setPage(1)}
                    >
                        &laquo;
                    </Button>
                    <Button
                        size="sm"
                        variant="light"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                    >
                        Prev
                    </Button>
                    <Button
                        size="sm"
                        variant="light"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        Next
                    </Button>
                    <Button
                        size="sm"
                        variant="light"
                        disabled={page >= totalPages}
                        onClick={() => setPage(totalPages)}
                    >
                        &raquo;
                    </Button>
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
        <th role="button" onClick={onClick} className="user-select-none">
            <span className="d-inline-flex align-items-center gap-1">
                {label}
                <small className="text-muted">{active ? (dir === 'asc' ? '▲' : '▼') : ''}</small>
            </span>
        </th>
    );
}
