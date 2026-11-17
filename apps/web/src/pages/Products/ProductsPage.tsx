import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    createProduct,
    deleteProduct,
    listProducts,
    setProductStatus,
    updateProduct,
} from '@/api/products';
import ProductForm from '@/components/products/ProductForm';
import type { Product, ProductCategory, ProductStatus } from '@/interfaces/Product';
import { useAuthStore } from '@/stores/auth.store';
import './ProductsPage.css';

type Sort = { key: keyof Product; dir: 'asc' | 'desc' };
type ProductActions = {
    rows: Product[];
    busyId: string | null;
    canManage: boolean;
    onEdit: (product: Product) => void;
    onDelete: (product: Product) => Promise<void>;
    onStatus: (product: Product, status: ProductStatus) => Promise<void>;
};

const categoryOptions: Array<{ value: ProductCategory; label: string }> = [
    { value: 'value_added', label: 'Value added' },
    { value: 'debt_review', label: 'Debt review' },
    { value: 'legal_support', label: 'Legal support' },
];
const statusLabels: Record<ProductStatus, string> = {
    active: 'Active',
    inactive: 'Inactive',
    archived: 'Archived',
};
const categoryLabels = Object.fromEntries(
    categoryOptions.map((option) => [option.value, option.label])
) as Record<ProductCategory, string>;
const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback;

export default function ProductsPage() {
    const role = useAuthStore((state) => state.session?.user.role);
    const canManage = role === 'admin' || role === 'manager';
    const [rows, setRows] = useState<Product[]>([]);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState<ProductCategory | ''>('');
    const [status, setStatus] = useState<ProductStatus | ''>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editRow, setEditRow] = useState<Product | null>(null);
    const [sort, setSort] = useState<Sort>({ key: 'createdAt', dir: 'desc' });

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await listProducts({
                page,
                limit,
                search: search || undefined,
                category: category || undefined,
                status: status || undefined,
            });
            setRows(response.products);
            setTotal(response.total);
            setTotalPages(Math.max(1, response.totalPages));
        } catch (loadError: unknown) {
            setRows([]);
            setTotal(0);
            setTotalPages(1);
            setError(getErrorMessage(loadError, 'Products could not be loaded.'));
        } finally {
            setLoading(false);
        }
    }, [category, limit, page, search, status]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setPage(1);
            setSearch(searchInput.trim());
        }, 300);
        return () => window.clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        void load();
    }, [load]);

    const visible = useMemo(
        () =>
            [...rows].sort((a, b) => {
                const first = String(a[sort.key] ?? '').toLocaleLowerCase();
                const second = String(b[sort.key] ?? '').toLocaleLowerCase();
                return first.localeCompare(second) * (sort.dir === 'asc' ? 1 : -1);
            }),
        [rows, sort]
    );

    const firstResult = total === 0 ? 0 : (page - 1) * limit + 1;
    const lastResult = Math.min(page * limit, total);
    const filtersApplied = Boolean(searchInput || category || status);

    const toggleSort = (key: keyof Product) => {
        setSort((current) =>
            current.key === key
                ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
                : { key, dir: 'asc' }
        );
    };
    const openCreate = () => {
        setEditRow(null);
        setShowForm(true);
    };
    const openEdit = (product: Product) => {
        setEditRow(product);
        setShowForm(true);
    };
    const closeForm = () => {
        setShowForm(false);
        setEditRow(null);
    };

    const handleSave = async (values: Partial<Product>) => {
        if (editRow) {
            await updateProduct(editRow.id, values);
            setNotice(`${values.name || editRow.name} was updated.`);
        } else {
            await createProduct(values);
            setNotice(`${values.name || 'Product'} was created.`);
        }
        closeForm();
        await load();
    };

    const handleDelete = async (product: Product) => {
        if (!window.confirm(`Delete product “${product.name}”? This action cannot be undone.`)) {
            return;
        }
        setBusyId(product.id);
        setError(null);
        try {
            await deleteProduct(product.id);
            setNotice(`${product.name} was deleted.`);
            if (rows.length === 1 && page > 1) setPage((current) => current - 1);
            else await load();
        } catch (deleteError: unknown) {
            setError(getErrorMessage(deleteError, 'The product could not be deleted.'));
        } finally {
            setBusyId(null);
        }
    };

    const handleStatus = async (product: Product, nextStatus: ProductStatus) => {
        if (product.status === nextStatus) return;
        setBusyId(product.id);
        setError(null);
        try {
            await setProductStatus(product.id, nextStatus);
            setNotice(`${product.name} is now ${statusLabels[nextStatus].toLocaleLowerCase()}.`);
            await load();
        } catch (statusError: unknown) {
            setError(getErrorMessage(statusError, 'The product status could not be updated.'));
        } finally {
            setBusyId(null);
        }
    };

    const clearFilters = () => {
        setSearchInput('');
        setSearch('');
        setCategory('');
        setStatus('');
        setPage(1);
    };

    return (
        <main className="products-page">
            <header className="products-page__header">
                <div>
                    <p className="products-page__eyebrow">Product administration</p>
                    <h1>Product catalogue</h1>
                    <p>Maintain available services, requirements and operational status.</p>
                </div>
                <div className="products-page__header-actions">
                    <span className="products-page__count">
                        {total} {total === 1 ? 'product' : 'products'}
                    </span>
                    {canManage && (
                        <button
                            type="button"
                            className="products-page__primary"
                            onClick={openCreate}
                        >
                            <span aria-hidden="true">+</span>
                            Add product
                        </button>
                    )}
                </div>
            </header>

            {error && (
                <div className="products-page__alert products-page__alert--error" role="alert">
                    <div>
                        <strong>Products could not be loaded or updated.</strong>
                        <span>{error}</span>
                    </div>
                    <button type="button" onClick={() => void load()}>
                        Retry
                    </button>
                </div>
            )}
            {notice && (
                <div className="products-page__alert products-page__alert--success" role="status">
                    <span>{notice}</span>
                    <button
                        type="button"
                        aria-label="Dismiss message"
                        onClick={() => setNotice(null)}
                    >
                        Dismiss
                    </button>
                </div>
            )}

            <section className="products-page__panel" aria-label="Product directory">
                <div className="products-page__toolbar">
                    <label className="products-page__search">
                        <span className="visually-hidden">Search products</span>
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="11" cy="11" r="7" />
                            <path d="m20 20-4-4" />
                        </svg>
                        <input
                            type="search"
                            value={searchInput}
                            placeholder="Search code, name or description"
                            onChange={(event) => setSearchInput(event.target.value)}
                        />
                    </label>
                    <label>
                        <span className="visually-hidden">Filter by category</span>
                        <select
                            value={category}
                            onChange={(event) => {
                                setCategory(event.target.value as ProductCategory | '');
                                setPage(1);
                            }}
                        >
                            <option value="">All categories</option>
                            {categoryOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        <span className="visually-hidden">Filter by status</span>
                        <select
                            value={status}
                            onChange={(event) => {
                                setStatus(event.target.value as ProductStatus | '');
                                setPage(1);
                            }}
                        >
                            <option value="">All statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="archived">Archived</option>
                        </select>
                    </label>
                    <label className="products-page__page-size">
                        <span>Rows</span>
                        <select
                            value={limit}
                            onChange={(event) => {
                                setLimit(Number(event.target.value));
                                setPage(1);
                            }}
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={30}>30</option>
                            <option value={50}>50</option>
                        </select>
                    </label>
                    <button
                        type="button"
                        className="products-page__clear"
                        disabled={!filtersApplied}
                        onClick={clearFilters}
                    >
                        Clear
                    </button>
                </div>

                {loading ? (
                    <div className="products-page__state" role="status">
                        <span className="products-page__spinner" aria-hidden="true" />
                        <strong>Loading products</strong>
                        <span>Retrieving the current catalogue.</span>
                    </div>
                ) : visible.length === 0 ? (
                    <div className="products-page__state">
                        <strong>No products found</strong>
                        <span>Adjust the filters or add a product to this catalogue.</span>
                        {filtersApplied && (
                            <button type="button" onClick={clearFilters}>
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <ProductTable
                            rows={visible}
                            sort={sort}
                            busyId={busyId}
                            canManage={canManage}
                            onSort={toggleSort}
                            onEdit={openEdit}
                            onDelete={handleDelete}
                            onStatus={handleStatus}
                        />
                        <ProductCards
                            rows={visible}
                            busyId={busyId}
                            canManage={canManage}
                            onEdit={openEdit}
                            onDelete={handleDelete}
                            onStatus={handleStatus}
                        />
                    </>
                )}

                <footer className="products-page__pagination">
                    <span>
                        Showing{' '}
                        <strong>
                            {firstResult}-{lastResult}
                        </strong>{' '}
                        of <strong>{total}</strong>
                    </span>
                    <div className="products-page__pager" aria-label="Product pages">
                        <button type="button" disabled={page === 1} onClick={() => setPage(1)}>
                            First
                        </button>
                        <button
                            type="button"
                            disabled={page === 1}
                            onClick={() => setPage((current) => Math.max(1, current - 1))}
                        >
                            Previous
                        </button>
                        <span>
                            Page {page} of {totalPages}
                        </span>
                        <button
                            type="button"
                            disabled={page >= totalPages}
                            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                        >
                            Next
                        </button>
                        <button
                            type="button"
                            disabled={page >= totalPages}
                            onClick={() => setPage(totalPages)}
                        >
                            Last
                        </button>
                    </div>
                </footer>
            </section>

            <ProductForm
                show={showForm}
                onClose={closeForm}
                onSubmit={handleSave}
                initial={editRow || undefined}
            />
        </main>
    );
}

function ProductStatusSelect({
    product,
    disabled,
    onStatus,
}: {
    product: Product;
    disabled: boolean;
    onStatus: ProductActions['onStatus'];
}) {
    return (
        <select
            className="product-directory__status-select"
            aria-label={`Update ${product.name} status`}
            value={product.status}
            disabled={disabled}
            onChange={(event) => void onStatus(product, event.target.value as ProductStatus)}
        >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
        </select>
    );
}

function ProductTable({
    rows,
    sort,
    busyId,
    canManage,
    onSort,
    onEdit,
    onDelete,
    onStatus,
}: ProductActions & { sort: Sort; onSort: (key: keyof Product) => void }) {
    return (
        <div className="product-directory__table-wrap">
            <table className="product-directory__table">
                <thead>
                    <tr>
                        <SortableHeader label="Code" field="code" sort={sort} onSort={onSort} />
                        <SortableHeader label="Product" field="name" sort={sort} onSort={onSort} />
                        <SortableHeader
                            label="Category"
                            field="category"
                            sort={sort}
                            onSort={onSort}
                        />
                        <th>Requirements</th>
                        <SortableHeader label="Status" field="status" sort={sort} onSort={onSort} />
                        <th className="product-directory__actions-heading">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((product) => (
                        <tr key={product.id}>
                            <td>
                                <code>{product.code}</code>
                            </td>
                            <td>
                                <div className="product-directory__identity">
                                    <strong>{product.name}</strong>
                                    <span>{product.description || 'No description provided'}</span>
                                </div>
                            </td>
                            <td>
                                <span className="product-directory__category">
                                    {categoryLabels[product.category]}
                                </span>
                            </td>
                            <td>
                                <Requirements product={product} />
                            </td>
                            <td>
                                <span
                                    className={`product-directory__status product-directory__status--${product.status}`}
                                >
                                    {statusLabels[product.status]}
                                </span>
                            </td>
                            <td>
                                {canManage ? (
                                    <ProductActions
                                        product={product}
                                        busy={busyId === product.id}
                                        onEdit={onEdit}
                                        onDelete={onDelete}
                                        onStatus={onStatus}
                                    />
                                ) : (
                                    <span className="product-directory__read-only">View only</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function SortableHeader({
    label,
    field,
    sort,
    onSort,
}: {
    label: string;
    field: keyof Product;
    sort: Sort;
    onSort: (key: keyof Product) => void;
}) {
    const active = sort.key === field;
    return (
        <th aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
            <button type="button" onClick={() => onSort(field)}>
                {label}
                <span aria-hidden="true">{active ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}</span>
            </button>
        </th>
    );
}

function Requirements({ product }: { product: Product }) {
    const requiresMandate = Boolean(product.requires_mandate);
    const requiresCreditPull = Boolean(product.requires_credit_pull);
    if (!requiresMandate && !requiresCreditPull)
        return <span className="product-directory__none">None</span>;
    return (
        <div className="product-directory__requirements">
            {requiresMandate && <span>Mandate</span>}
            {requiresCreditPull && <span>Credit report</span>}
        </div>
    );
}

function ProductActions({
    product,
    busy,
    onEdit,
    onDelete,
    onStatus,
}: {
    product: Product;
    busy: boolean;
    onEdit: ProductActions['onEdit'];
    onDelete: ProductActions['onDelete'];
    onStatus: ProductActions['onStatus'];
}) {
    return (
        <div className="product-directory__actions">
            <button type="button" onClick={() => onEdit(product)}>
                Edit
            </button>
            <ProductStatusSelect product={product} disabled={busy} onStatus={onStatus} />
            <button
                type="button"
                className="product-directory__delete"
                disabled={busy}
                onClick={() => void onDelete(product)}
            >
                Delete
            </button>
        </div>
    );
}

function ProductCards({ rows, busyId, canManage, onEdit, onDelete, onStatus }: ProductActions) {
    return (
        <div className="product-directory__cards">
            {rows.map((product) => (
                <article key={product.id} className="product-directory__card">
                    <div className="product-directory__card-heading">
                        <div>
                            <code>{product.code}</code>
                            <h2>{product.name}</h2>
                        </div>
                        <span
                            className={`product-directory__status product-directory__status--${product.status}`}
                        >
                            {statusLabels[product.status]}
                        </span>
                    </div>
                    <p>{product.description || 'No description provided'}</p>
                    <dl>
                        <div>
                            <dt>Category</dt>
                            <dd>{categoryLabels[product.category]}</dd>
                        </div>
                        <div>
                            <dt>Requirements</dt>
                            <dd>
                                <Requirements product={product} />
                            </dd>
                        </div>
                    </dl>
                    {canManage ? (
                        <ProductActions
                            product={product}
                            busy={busyId === product.id}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onStatus={onStatus}
                        />
                    ) : (
                        <span className="product-directory__read-only">
                            View-only catalogue access
                        </span>
                    )}
                </article>
            ))}
        </div>
    );
}
