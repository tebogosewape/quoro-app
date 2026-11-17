import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal } from 'react-bootstrap';
import { listProducts, updateProduct } from '@/api/products';
import type { Product, ProductCategory } from '@/interfaces/Product';
import { useAuthStore } from '@/stores/auth.store';
import { hasPermission } from '@/utils/permissions';
import './CommissionSettings.css';

type CommissionType = 'fixed' | 'percentage';
type CommissionRule = {
    firstPayment?: number;
    percentage?: number;
    rate?: number;
    applicableOn?: string;
};

const categories: Array<{ value: ProductCategory; label: string }> = [
    { value: 'value_added', label: 'Value added' },
    { value: 'debt_review', label: 'Debt review' },
    { value: 'legal_support', label: 'Legal support' },
];
const categoryLabels = Object.fromEntries(
    categories.map((category) => [category.value, category.label])
) as Record<ProductCategory, string>;
const applicableLabels: Record<string, string> = {
    first_instalment: 'First instalment',
    all_instalments: 'All instalments',
    first_payment: 'First payment',
    total_amount: 'Total amount',
};

const parseRules = (rules: unknown): CommissionRule | null => {
    if (!rules) return null;
    try {
        const parsed = typeof rules === 'string' ? (JSON.parse(rules) as unknown) : rules;
        return parsed && typeof parsed === 'object' ? (parsed as CommissionRule) : null;
    } catch {
        return null;
    }
};
const hasNumber = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value);
const formatCommission = (rules: unknown) => {
    const parsed = parseRules(rules);
    if (!parsed) return { label: 'Not configured', type: 'none' as const, detail: 'No agent rule' };
    if (hasNumber(parsed.firstPayment)) {
        return {
            label: `R ${parsed.firstPayment.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            type: 'fixed' as const,
            detail: 'First payment',
        };
    }
    let percentage: number | null = null;
    if (hasNumber(parsed.percentage)) percentage = parsed.percentage;
    else if (hasNumber(parsed.rate)) percentage = parsed.rate;
    if (percentage !== null) {
        return {
            label: `${percentage}%`,
            type: 'percentage' as const,
            detail: applicableLabels[parsed.applicableOn ?? ''] ?? 'Commission rate',
        };
    }
    return { label: 'Custom rule', type: 'custom' as const, detail: 'Advanced configuration' };
};
const errorMessage = (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback;

export default function CommissionSettings() {
    const session = useAuthStore((state) => state.session);
    const canView = hasPermission('view-commissions');
    const permissionAllowsManage = hasPermission('manage-commissions');
    const canManage =
        permissionAllowsManage &&
        (session?.user.role === 'admin' || session?.user.role === 'manager');

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState<ProductCategory | ''>('');
    const [configuration, setConfiguration] = useState<'configured' | 'unconfigured' | ''>('');
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [editType, setEditType] = useState<CommissionType>('fixed');
    const [fixedAmount, setFixedAmount] = useState('');
    const [percentageValue, setPercentageValue] = useState('');
    const [applicableOn, setApplicableOn] = useState('first_instalment');
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const loadProducts = useCallback(async () => {
        if (!canView) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const response = await listProducts({ limit: 100, status: 'active' });
            setProducts(response.products);
        } catch (loadError: unknown) {
            setProducts([]);
            setError(errorMessage(loadError, 'Commission settings could not be loaded.'));
        } finally {
            setLoading(false);
        }
    }, [canView]);

    useEffect(() => {
        void loadProducts();
    }, [loadProducts, session?.user.id]);

    const visibleProducts = useMemo(() => {
        const query = search.trim().toLocaleLowerCase();
        return products.filter((product) => {
            const matchesSearch =
                !query ||
                product.code.toLocaleLowerCase().includes(query) ||
                product.name.toLocaleLowerCase().includes(query);
            const matchesCategory = !category || product.category === category;
            const configured = Boolean(parseRules(product.agent_commission_rules));
            const matchesConfiguration =
                !configuration || (configuration === 'configured' ? configured : !configured);
            return matchesSearch && matchesCategory && matchesConfiguration;
        });
    }, [category, configuration, products, search]);

    const configuredCount = products.filter((product) =>
        Boolean(parseRules(product.agent_commission_rules))
    ).length;
    const filtersApplied = Boolean(search || category || configuration);

    const openEditor = (product: Product) => {
        const rule = parseRules(product.agent_commission_rules);
        setEditingProduct(product);
        setFormError(null);
        setFixedAmount('');
        setPercentageValue('');
        setApplicableOn(rule?.applicableOn || 'first_instalment');
        if (rule && hasNumber(rule.firstPayment)) {
            setEditType('fixed');
            setFixedAmount(String(rule.firstPayment));
        } else if (rule && (hasNumber(rule.percentage) || hasNumber(rule.rate))) {
            setEditType('percentage');
            setPercentageValue(String(rule.percentage ?? rule.rate));
        } else {
            setEditType('fixed');
        }
    };

    const closeEditor = () => {
        if (saving) return;
        setEditingProduct(null);
        setFormError(null);
    };

    const saveCommission = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editingProduct) return;
        let rule: CommissionRule;
        if (editType === 'fixed') {
            const amount = Number(fixedAmount);
            if (fixedAmount.trim() === '' || !Number.isFinite(amount) || amount < 0) {
                setFormError('Enter a valid fixed amount of zero or more.');
                return;
            }
            rule = { firstPayment: amount };
        } else {
            const percentage = Number(percentageValue);
            if (
                percentageValue.trim() === '' ||
                !Number.isFinite(percentage) ||
                percentage < 0 ||
                percentage > 100
            ) {
                setFormError('Enter a percentage between 0 and 100.');
                return;
            }
            rule = { percentage, applicableOn };
        }

        setSaving(true);
        setFormError(null);
        try {
            await updateProduct(editingProduct.id, { agent_commission_rules: rule });
            setNotice(`Commission updated for ${editingProduct.name}.`);
            setEditingProduct(null);
            await loadProducts();
        } catch (saveError: unknown) {
            setFormError(errorMessage(saveError, 'The commission rule could not be saved.'));
        } finally {
            setSaving(false);
        }
    };

    if (!canView) return <PermissionRequired />;

    return (
        <main className="commission-page">
            <header className="commission-page__header">
                <div>
                    <p className="commission-page__eyebrow">Financial administration</p>
                    <h1>Commission settings</h1>
                    <p>Review and maintain product-specific agent commission rules.</p>
                </div>
                <div className="commission-page__summary" aria-label="Commission summary">
                    <span>
                        <strong>{products.length}</strong> active products
                    </span>
                    <span>
                        <strong>{configuredCount}</strong> configured
                    </span>
                    {!canManage && <span className="commission-page__read-only">Read only</span>}
                </div>
            </header>

            <section className="commission-page__guidance">
                <strong>{canManage ? 'Commission administration' : 'Commission overview'}</strong>
                <span>
                    {canManage
                        ? 'Use Edit to set a fixed first-payment amount or a percentage rule.'
                        : 'Your role can review commission rules. An Admin or Manager must make changes.'}
                </span>
            </section>

            {error && (
                <div className="commission-page__alert commission-page__alert--error" role="alert">
                    <div>
                        <strong>Commission settings could not be loaded.</strong>
                        <span>{error}</span>
                    </div>
                    <button type="button" onClick={() => void loadProducts()}>
                        Retry
                    </button>
                </div>
            )}
            {notice && (
                <div
                    className="commission-page__alert commission-page__alert--success"
                    role="status"
                >
                    <span>{notice}</span>
                    <button type="button" onClick={() => setNotice(null)}>
                        Dismiss
                    </button>
                </div>
            )}

            <section className="commission-page__panel" aria-label="Commission rules">
                <div className="commission-page__toolbar">
                    <label className="commission-page__search">
                        <span className="visually-hidden">Search products</span>
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="11" cy="11" r="7" />
                            <path d="m20 20-4-4" />
                        </svg>
                        <input
                            type="search"
                            placeholder="Search code or product"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </label>
                    <label>
                        <span className="visually-hidden">Filter by category</span>
                        <select
                            value={category}
                            onChange={(event) =>
                                setCategory(event.target.value as ProductCategory | '')
                            }
                        >
                            <option value="">All categories</option>
                            {categories.map((item) => (
                                <option key={item.value} value={item.value}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        <span className="visually-hidden">Filter by configuration</span>
                        <select
                            value={configuration}
                            onChange={(event) =>
                                setConfiguration(event.target.value as typeof configuration)
                            }
                        >
                            <option value="">All commission states</option>
                            <option value="configured">Configured</option>
                            <option value="unconfigured">Not configured</option>
                        </select>
                    </label>
                    <button
                        type="button"
                        className="commission-page__clear"
                        disabled={!filtersApplied}
                        onClick={() => {
                            setSearch('');
                            setCategory('');
                            setConfiguration('');
                        }}
                    >
                        Clear
                    </button>
                </div>

                {loading ? (
                    <LoadingState />
                ) : visibleProducts.length === 0 ? (
                    <EmptyState
                        filtered={filtersApplied}
                        onClear={() => {
                            setSearch('');
                            setCategory('');
                            setConfiguration('');
                        }}
                    />
                ) : (
                    <>
                        <CommissionTable
                            products={visibleProducts}
                            canManage={canManage}
                            onEdit={openEditor}
                        />
                        <CommissionCards
                            products={visibleProducts}
                            canManage={canManage}
                            onEdit={openEditor}
                        />
                    </>
                )}
                <footer className="commission-page__footer">
                    <span>
                        Showing <strong>{visibleProducts.length}</strong> of{' '}
                        <strong>{products.length}</strong> active products
                    </span>
                </footer>
            </section>

            <CommissionEditor
                product={editingProduct}
                type={editType}
                fixedAmount={fixedAmount}
                percentage={percentageValue}
                applicableOn={applicableOn}
                error={formError}
                saving={saving}
                onClose={closeEditor}
                onType={setEditType}
                onFixed={setFixedAmount}
                onPercentage={setPercentageValue}
                onApplicable={setApplicableOn}
                onSubmit={saveCommission}
            />
        </main>
    );
}

function PermissionRequired() {
    return (
        <main className="commission-page">
            <header className="commission-page__header">
                <div>
                    <p className="commission-page__eyebrow">Financial administration</p>
                    <h1>Commission settings</h1>
                    <p>Review and maintain product-specific agent commission rules.</p>
                </div>
            </header>
            <section className="commission-page__permission">
                <strong>Permission required</strong>
                <span>You need commission-report access to view this page.</span>
                <code>reports.commission.view</code>
            </section>
        </main>
    );
}

function LoadingState() {
    return (
        <div className="commission-page__state" role="status">
            <span className="commission-page__spinner" aria-hidden="true" />
            <strong>Loading commission rules</strong>
            <span>Retrieving active products and configuration.</span>
        </div>
    );
}

function EmptyState({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
    return (
        <div className="commission-page__state">
            <strong>
                {filtered ? 'No matching commission rules' : 'No active products found'}
            </strong>
            <span>
                {filtered
                    ? 'Adjust or clear the current filters.'
                    : 'Active products will appear here when available.'}
            </span>
            {filtered && (
                <button type="button" onClick={onClear}>
                    Clear filters
                </button>
            )}
        </div>
    );
}

function CommissionTable({
    products,
    canManage,
    onEdit,
}: {
    products: Product[];
    canManage: boolean;
    onEdit: (product: Product) => void;
}) {
    return (
        <div className="commission-directory__table-wrap">
            <table className="commission-directory__table">
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Commission rule</th>
                        <th>Type</th>
                        {canManage && (
                            <th className="commission-directory__actions-heading">Actions</th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {products.map((product) => {
                        const commission = formatCommission(product.agent_commission_rules);
                        return (
                            <tr key={product.id}>
                                <td>
                                    <code>{product.code}</code>
                                </td>
                                <td>
                                    <strong>{product.name}</strong>
                                </td>
                                <td>
                                    <span className="commission-directory__category">
                                        {categoryLabels[product.category]}
                                    </span>
                                </td>
                                <td>
                                    <div className="commission-directory__value">
                                        <strong>{commission.label}</strong>
                                        <span>{commission.detail}</span>
                                    </div>
                                </td>
                                <td>
                                    <span
                                        className={`commission-directory__type commission-directory__type--${commission.type}`}
                                    >
                                        {commission.type === 'none'
                                            ? 'Unconfigured'
                                            : commission.type}
                                    </span>
                                </td>
                                {canManage && (
                                    <td>
                                        <button
                                            type="button"
                                            className="commission-directory__edit"
                                            onClick={() => onEdit(product)}
                                        >
                                            Edit rule
                                        </button>
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function CommissionCards({
    products,
    canManage,
    onEdit,
}: {
    products: Product[];
    canManage: boolean;
    onEdit: (product: Product) => void;
}) {
    return (
        <div className="commission-directory__cards">
            {products.map((product) => {
                const commission = formatCommission(product.agent_commission_rules);
                return (
                    <article key={product.id} className="commission-directory__card">
                        <div className="commission-directory__card-heading">
                            <div>
                                <code>{product.code}</code>
                                <h2>{product.name}</h2>
                            </div>
                            <span
                                className={`commission-directory__type commission-directory__type--${commission.type}`}
                            >
                                {commission.type === 'none' ? 'Unconfigured' : commission.type}
                            </span>
                        </div>
                        <dl>
                            <div>
                                <dt>Category</dt>
                                <dd>{categoryLabels[product.category]}</dd>
                            </div>
                            <div>
                                <dt>Commission</dt>
                                <dd>
                                    <strong>{commission.label}</strong>
                                    <span>{commission.detail}</span>
                                </dd>
                            </div>
                        </dl>
                        {canManage ? (
                            <button
                                type="button"
                                className="commission-directory__edit"
                                onClick={() => onEdit(product)}
                            >
                                Edit rule
                            </button>
                        ) : (
                            <span className="commission-directory__view-only">
                                View-only access
                            </span>
                        )}
                    </article>
                );
            })}
        </div>
    );
}

type EditorProps = {
    product: Product | null;
    type: CommissionType;
    fixedAmount: string;
    percentage: string;
    applicableOn: string;
    error: string | null;
    saving: boolean;
    onClose: () => void;
    onType: (type: CommissionType) => void;
    onFixed: (value: string) => void;
    onPercentage: (value: string) => void;
    onApplicable: (value: string) => void;
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
};

function CommissionEditor({
    product,
    type,
    fixedAmount,
    percentage,
    applicableOn,
    error,
    saving,
    onClose,
    onType,
    onFixed,
    onPercentage,
    onApplicable,
    onSubmit,
}: EditorProps) {
    let preview = 'Enter a fixed amount';
    if (type === 'fixed' && fixedAmount) preview = `R ${fixedAmount} on first payment`;
    if (type === 'percentage' && !percentage) preview = 'Enter a percentage';
    if (type === 'percentage' && percentage) {
        preview = `${percentage}% - ${applicableLabels[applicableOn]}`;
    }
    return (
        <Modal
            show={Boolean(product)}
            onHide={onClose}
            backdrop="static"
            centered
            scrollable
            dialogClassName="commission-form"
        >
            <form noValidate onSubmit={(event) => void onSubmit(event)}>
                <Modal.Header closeButton>
                    <div>
                        <Modal.Title>Edit commission</Modal.Title>
                        <small>
                            {product?.name} · {product?.code}
                        </small>
                    </div>
                </Modal.Header>
                <Modal.Body>
                    {error && (
                        <div className="commission-form__error" role="alert">
                            {error}
                        </div>
                    )}
                    <fieldset className="commission-form__section">
                        <legend>Commission type</legend>
                        <div className="commission-form__type-options">
                            <label>
                                <input
                                    type="radio"
                                    name="commission-type"
                                    checked={type === 'fixed'}
                                    onChange={() => onType('fixed')}
                                />
                                <span>
                                    <strong>Fixed amount</strong>
                                    <small>Paid on the first payment</small>
                                </span>
                            </label>
                            <label>
                                <input
                                    type="radio"
                                    name="commission-type"
                                    checked={type === 'percentage'}
                                    onChange={() => onType('percentage')}
                                />
                                <span>
                                    <strong>Percentage</strong>
                                    <small>Calculated against a selected event</small>
                                </span>
                            </label>
                        </div>
                    </fieldset>
                    <fieldset className="commission-form__section">
                        <legend>Rule value</legend>
                        {type === 'fixed' ? (
                            <label className="commission-form__field">
                                <span>Fixed amount</span>
                                <div className="commission-form__money">
                                    <span>R</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={fixedAmount}
                                        onChange={(event) => onFixed(event.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                            </label>
                        ) : (
                            <div className="commission-form__grid">
                                <label className="commission-form__field">
                                    <span>Percentage</span>
                                    <div className="commission-form__money">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.1"
                                            value={percentage}
                                            onChange={(event) => onPercentage(event.target.value)}
                                            placeholder="0"
                                        />
                                        <span>%</span>
                                    </div>
                                </label>
                                <label className="commission-form__field">
                                    <span>Applicable on</span>
                                    <select
                                        value={applicableOn}
                                        onChange={(event) => onApplicable(event.target.value)}
                                    >
                                        {Object.entries(applicableLabels).map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                        )}
                        <div className="commission-form__preview">
                            <span>Preview</span>
                            <strong>{preview}</strong>
                        </div>
                    </fieldset>
                </Modal.Body>
                <Modal.Footer>
                    <button
                        type="button"
                        className="commission-form__cancel"
                        disabled={saving}
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button type="submit" className="commission-form__submit" disabled={saving}>
                        {saving ? 'Saving…' : 'Save commission'}
                    </button>
                </Modal.Footer>
            </form>
        </Modal>
    );
}
