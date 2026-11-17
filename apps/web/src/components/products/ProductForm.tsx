import { useEffect, useState } from 'react';
import { Modal } from 'react-bootstrap';
import type { Product, ProductCategory, ProductStatus } from '@/interfaces/Product';
import './ProductForm.css';

const categories: Array<{ value: ProductCategory; label: string }> = [
    { value: 'value_added', label: 'Value added' },
    { value: 'debt_review', label: 'Debt review' },
    { value: 'legal_support', label: 'Legal support' },
];
const statuses: Array<{ value: ProductStatus; label: string }> = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'archived', label: 'Archived' },
];

type Props = {
    show: boolean;
    onClose: () => void;
    onSubmit: (values: Partial<Product>) => Promise<void>;
    initial?: Partial<Product>;
};
type JsonField =
    | 'pricing_options'
    | 'agent_commission_rules'
    | 'fee_structure'
    | 'capture_restrictions';
type FormValues = {
    code: string;
    name: string;
    category: ProductCategory;
    status: ProductStatus;
    requires_mandate: boolean;
    requires_credit_pull: boolean;
    description: string;
    pricing_options: string;
    agent_commission_rules: string;
    fee_structure: string;
    capture_restrictions: string;
};
type FormErrors = Partial<Record<keyof FormValues | 'form', string>>;

const jsonFields: Array<{ name: JsonField; label: string; hint: string }> = [
    {
        name: 'pricing_options',
        label: 'Pricing options',
        hint: 'Amounts, instalments and recurring rules.',
    },
    {
        name: 'agent_commission_rules',
        label: 'Commission rules',
        hint: 'Agent commission configuration.',
    },
    {
        name: 'fee_structure',
        label: 'Fee structure',
        hint: 'Product fee and charge configuration.',
    },
    {
        name: 'capture_restrictions',
        label: 'Capture restrictions',
        hint: 'Eligibility and capture restrictions.',
    },
];
const jsonText = (value: unknown) =>
    value === undefined || value === null ? '' : JSON.stringify(value, null, 2);
const initialValues = (initial?: Partial<Product>): FormValues => ({
    code: initial?.code ?? '',
    name: initial?.name ?? '',
    category: initial?.category ?? 'value_added',
    status: initial?.status ?? 'active',
    requires_mandate: initial?.requires_mandate ?? false,
    requires_credit_pull: initial?.requires_credit_pull ?? false,
    description: initial?.description ?? '',
    pricing_options: jsonText(initial?.pricing_options),
    agent_commission_rules: jsonText(initial?.agent_commission_rules),
    fee_structure: jsonText(initial?.fee_structure),
    capture_restrictions: jsonText(initial?.capture_restrictions),
});

export default function ProductForm({ show, onClose, onSubmit, initial }: Props) {
    const [values, setValues] = useState<FormValues>(() => initialValues(initial));
    const [errors, setErrors] = useState<FormErrors>({});
    const [saving, setSaving] = useState(false);
    const isEdit = Boolean(initial?.id);

    useEffect(() => {
        if (!show) return;
        setValues(initialValues(initial));
        setErrors({});
        setSaving(false);
    }, [initial, show]);

    const setValue = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
        setValues((current) => ({ ...current, [key]: value }));
        setErrors((current) => ({ ...current, [key]: undefined, form: undefined }));
    };

    const buildPayload = (): Partial<Product> | null => {
        const nextErrors: FormErrors = {};
        if (!values.code.trim()) nextErrors.code = 'Product code is required.';
        if (!values.name.trim()) nextErrors.name = 'Product name is required.';

        const parsed: Partial<Pick<Product, JsonField>> = {};
        jsonFields.forEach(({ name }) => {
            const raw = values[name].trim();
            if (!raw) return;
            try {
                (parsed as Record<JsonField, unknown>)[name] = JSON.parse(raw) as unknown;
            } catch {
                nextErrors[name] = 'Enter valid JSON or leave this field empty.';
            }
        });
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return null;

        return {
            code: values.code.trim(),
            name: values.name.trim(),
            category: values.category,
            status: values.status,
            requires_mandate: values.requires_mandate,
            requires_credit_pull: values.requires_credit_pull,
            description: values.description.trim() || undefined,
            pricing_options: parsed.pricing_options,
            agent_commission_rules: parsed.agent_commission_rules,
            fee_structure: parsed.fee_structure,
            capture_restrictions: parsed.capture_restrictions,
        };
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const payload = buildPayload();
        if (!payload) return;
        setSaving(true);
        try {
            await onSubmit(payload);
        } catch (error: unknown) {
            setErrors((current) => ({
                ...current,
                form:
                    error instanceof Error && error.message
                        ? error.message
                        : 'The product could not be saved.',
            }));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            show={show}
            onHide={onClose}
            backdrop="static"
            centered
            scrollable
            dialogClassName="product-form"
        >
            <form noValidate onSubmit={handleSubmit}>
                <Modal.Header closeButton>
                    <div>
                        <Modal.Title>{isEdit ? 'Edit product' : 'Add product'}</Modal.Title>
                        <small>
                            {isEdit
                                ? 'Update catalogue and operational settings.'
                                : 'Create a product and define its requirements.'}
                        </small>
                    </div>
                </Modal.Header>
                <Modal.Body>
                    {errors.form && (
                        <div className="product-form__api-error" role="alert">
                            {errors.form}
                        </div>
                    )}
                    <div className="product-form__sections">
                        <fieldset className="product-form__section">
                            <legend>Product details</legend>
                            <div className="product-form__grid">
                                <FormField label="Product code" error={errors.code}>
                                    <input
                                        id="product-code"
                                        value={values.code}
                                        onChange={(event) => setValue('code', event.target.value)}
                                        autoComplete="off"
                                    />
                                </FormField>
                                <FormField label="Product name" error={errors.name}>
                                    <input
                                        id="product-name"
                                        value={values.name}
                                        onChange={(event) => setValue('name', event.target.value)}
                                        autoComplete="off"
                                    />
                                </FormField>
                                <FormField label="Category">
                                    <select
                                        id="product-category"
                                        value={values.category}
                                        onChange={(event) =>
                                            setValue(
                                                'category',
                                                event.target.value as ProductCategory
                                            )
                                        }
                                    >
                                        {categories.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </FormField>
                                <FormField label="Status">
                                    <select
                                        id="product-status"
                                        value={values.status}
                                        onChange={(event) =>
                                            setValue('status', event.target.value as ProductStatus)
                                        }
                                    >
                                        {statuses.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </FormField>
                                <FormField label="Description" wide>
                                    <textarea
                                        id="product-description"
                                        rows={3}
                                        value={values.description}
                                        onChange={(event) =>
                                            setValue('description', event.target.value)
                                        }
                                    />
                                </FormField>
                            </div>
                        </fieldset>

                        <fieldset className="product-form__section">
                            <legend>Operational requirements</legend>
                            <div className="product-form__toggles">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={values.requires_mandate}
                                        onChange={(event) =>
                                            setValue('requires_mandate', event.target.checked)
                                        }
                                    />
                                    <span>
                                        <strong>Mandate required</strong>
                                        <small>Require a signed mandate before processing.</small>
                                    </span>
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={values.requires_credit_pull}
                                        onChange={(event) =>
                                            setValue('requires_credit_pull', event.target.checked)
                                        }
                                    />
                                    <span>
                                        <strong>Credit report required</strong>
                                        <small>Request a credit report during onboarding.</small>
                                    </span>
                                </label>
                            </div>
                        </fieldset>

                        <details className="product-form__advanced">
                            <summary>
                                Advanced configuration <span>Optional JSON settings</span>
                            </summary>
                            <div className="product-form__json-grid">
                                {jsonFields.map((field) => (
                                    <FormField
                                        key={field.name}
                                        label={field.label}
                                        error={errors[field.name]}
                                        hint={field.hint}
                                    >
                                        <textarea
                                            className="product-form__json"
                                            rows={5}
                                            value={values[field.name]}
                                            onChange={(event) =>
                                                setValue(field.name, event.target.value)
                                            }
                                            spellCheck={false}
                                        />
                                    </FormField>
                                ))}
                            </div>
                        </details>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <button
                        type="button"
                        className="product-form__cancel"
                        onClick={onClose}
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button type="submit" className="product-form__submit" disabled={saving}>
                        {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
                    </button>
                </Modal.Footer>
            </form>
        </Modal>
    );
}

function FormField({
    label,
    error,
    hint,
    wide = false,
    children,
}: {
    label: string;
    error?: string;
    hint?: string;
    wide?: boolean;
    children: React.ReactNode;
}) {
    return (
        <label className={`product-form__field${wide ? ' product-form__field--wide' : ''}`}>
            <span>{label}</span>
            {children}
            {hint && <small>{hint}</small>}
            {error && <small className="product-form__error">{error}</small>}
        </label>
    );
}
