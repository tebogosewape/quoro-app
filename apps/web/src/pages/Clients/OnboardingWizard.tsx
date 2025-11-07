import { useMemo, useState, useEffect } from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faIdCard, // Personal details
    faBoxesPacking, // Products
    faClipboard, // Product Info
    faBank, // Banking
    faCreditCard, // Payment
    faClipboardCheck, // Confirm
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { listProducts } from '@/api/products';
import { createClient, type CreateClientDto } from '@/api/clients.api';
import { useAuthStore } from '@/stores/auth.store';

type StepKey = 'personal' | 'products' | 'product-info' | 'banking' | 'payment' | 'confirm';

type Personal = {
    title?: string;
    surname?: string;
    firstNames?: string;
    idNumber?: string;
    language?: string;
    gender?: string;
    phone?: string;
    email?: string;
    physicalAddress?: string;
    postalAddress?: string;
    sameAsPhysical?: boolean;
};

type Product = {
    id: string;
    name: string;
    desc: string;
    selected?: boolean;
    paymentOptions?: PaymentOption[];
};

type PaymentOption = {
    id: string;
    label: string;
    onceOff?: number;
    monthly?: number;
    months?: number;
    type: 'debit-order' | 'cash';
};

type Banking = {
    bankName?: string;
    accountType?: string;
    accountHolder?: string;
    accountNumber?: string;
    branchCode?: string;
    balance?: number;
};

type ProductInfo = {
    cirAccounts?: string[]; // For CIR product
};

type Payment = {
    selectedPaymentOptions?: Record<string, string>; // productId -> optionId
    firstPaymentMonth?: 'first' | 'second' | 'third'; // 0, 1, 2
    agreedToDebt?: boolean;
    agreedToPaymentInstructions?: boolean;
    agreedToCreditCheck?: boolean;
};

type FormState = {
    personal: Personal;
    products: Product[];
    productInfo?: ProductInfo;
    banking?: Banking;
    payment?: Payment;
};

// This will be replaced by API data
const PRODUCTS_PLACEHOLDER: Product[] = [];

import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

const STEPS: { key: StepKey; label: string; icon: IconDefinition }[] = [
    { key: 'personal', label: 'Your personal details', icon: faIdCard },
    { key: 'products', label: 'Select product/s', icon: faBoxesPacking },
    { key: 'product-info', label: 'Product information', icon: faClipboard },
    { key: 'banking', label: 'Banking details', icon: faBank },
    { key: 'payment', label: 'Payment details', icon: faCreditCard },
    { key: 'confirm', label: 'Confirm', icon: faClipboardCheck },
];

export default function OnboardingWizard() {
    const navigate = useNavigate();
    const location = useLocation();
    const session = useAuthStore((state) => state.session);
    const [current, setCurrent] = useState<StepKey>('personal');
    const [busy, setBusy] = useState(false);
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [productError, setProductError] = useState<string | null>(null);
    const [submissionError, setSubmissionError] = useState<string | null>(null);

    // Extract lead data from navigation state if present
    const leadData = location.state?.leadData;
    const [state, setState] = useState<FormState>({
        personal: leadData
            ? {
                  // Pre-fill from lead data if available
                  firstNames: leadData.name?.split(' ')[0] || '',
                  surname: leadData.name?.split(' ').slice(1).join(' ') || '',
                  phone: leadData.cell || '',
                  idNumber: leadData.idNumber || '',
              }
            : {},
        products: PRODUCTS_PLACEHOLDER,
    });

    // Load products from API on mount
    useEffect(() => {
        const fetchProducts = async () => {
            setLoadingProducts(true);
            setProductError(null);
            try {
                const response = await listProducts({
                    status: 'active' as const,
                    limit: 100,
                });

                // Map backend products to frontend Product format
                const mappedProducts: Product[] = response.products.map((p) => {
                    // Parse pricing_options JSON to extract payment options
                    let paymentOptions: Product['paymentOptions'] = [];
                    try {
                        const pricingData = p.pricing_options as {
                            oneOff?: number;
                            instalments?: Array<{ count: number; amount: number }>;
                            recurring?: boolean;
                            recurringAmount?: number;
                            minimumAmount?: number;
                        };

                        if (pricingData && typeof pricingData === 'object') {
                            const options: Product['paymentOptions'] = [];

                            // Handle one-off payment option
                            if (pricingData.oneOff && pricingData.oneOff > 0) {
                                options.push({
                                    id: `${p.id}_once_off`,
                                    label: `Once-off: R ${pricingData.oneOff.toLocaleString()}`,
                                    type: 'debit-order',
                                    onceOff: pricingData.oneOff,
                                });
                            }

                            // Handle instalment options
                            if (pricingData.instalments && pricingData.instalments.length > 0) {
                                pricingData.instalments.forEach((inst) => {
                                    const totalAmount = inst.count * inst.amount;
                                    options.push({
                                        id: `${p.id}_inst_${inst.count}`,
                                        label: `${inst.count} instalments of R ${inst.amount.toLocaleString()} (Total: R ${totalAmount.toLocaleString()})`,
                                        type: 'debit-order',
                                        monthly: inst.amount,
                                        months: inst.count,
                                    });
                                });
                            }

                            // Handle recurring payment option
                            if (pricingData.recurring && pricingData.recurringAmount) {
                                options.push({
                                    id: `${p.id}_recurring`,
                                    label: `Recurring: R ${pricingData.recurringAmount.toLocaleString()}/month`,
                                    type: 'debit-order',
                                    monthly: pricingData.recurringAmount,
                                });
                            }

                            // Handle minimum amount recurring (like AD product)
                            if (pricingData.recurring && pricingData.minimumAmount) {
                                options.push({
                                    id: `${p.id}_recurring_min`,
                                    label: `Recurring: Minimum R ${pricingData.minimumAmount.toLocaleString()}/month`,
                                    type: 'debit-order',
                                    monthly: pricingData.minimumAmount,
                                });
                            }

                            paymentOptions = options;
                        }
                    } catch (e) {
                        console.warn(`Failed to parse pricing options for product ${p.id}:`, e);
                    }

                    return {
                        id: p.id,
                        name: p.name,
                        desc: p.description || '',
                        paymentOptions:
                            paymentOptions.length > 0
                                ? paymentOptions
                                : [
                                      {
                                          id: `${p.id}_default`,
                                          label: 'Standard pricing - contact for details',
                                          type: 'debit-order',
                                          onceOff: 0,
                                      },
                                  ],
                        selected: false,
                    };
                });

                setState((prev) => ({
                    ...prev,
                    products: mappedProducts,
                }));
            } catch (err) {
                console.error('Failed to load products:', err);
                setProductError(
                    err instanceof Error ? err.message : 'Failed to load products from server'
                );
                // Keep empty products array on error
            } finally {
                setLoadingProducts(false);
            }
        };

        fetchProducts();
    }, []);

    const index = useMemo(() => STEPS.findIndex((s) => s.key === current), [current]);

    function canNext(step: StepKey): boolean {
        if (step === 'personal') {
            const p = state.personal;
            // Check required fields
            if (!p.surname || !p.firstNames || !p.idNumber || !p.phone) return false;
            // Check physical address is required
            if (!p.physicalAddress) return false;
            // Check postal address is required only if not same as physical
            if (!p.sameAsPhysical && !p.postalAddress) return false;
            return true;
        }
        if (step === 'products') {
            return state.products.some((p) => p.selected);
        }
        if (step === 'product-info') {
            const hasCIR = state.products.some((p) => p.id === 'cir' && p.selected);
            if (!hasCIR) return true; // Skip validation if CIR not selected
            return (state.productInfo?.cirAccounts?.length ?? 0) >= 3;
        }
        if (step === 'banking') {
            const b = state.banking;
            return !!(b?.bankName && b?.accountType && b?.accountHolder && b?.accountNumber);
        }
        if (step === 'payment') {
            const selectedProducts = state.products.filter((p) => p.selected);
            const paymentOptions = state.payment?.selectedPaymentOptions || {};
            // Check that each selected product has a payment option selected
            return selectedProducts.every((p) => paymentOptions[p.id]);
        }
        return true;
    }

    function goNext() {
        if (!canNext(current)) return;
        if (index < STEPS.length - 1) setCurrent(STEPS[index + 1].key);
    }
    function goBack() {
        if (index > 0) setCurrent(STEPS[index - 1].key);
    }

    async function submitAll() {
        if (!canNext('products')) return;
        setBusy(true);
        // mock submit delay
        setTimeout(() => {
            setBusy(false);
            setCurrent('confirm');
        }, 700);
    }

    async function handleFinish() {
        setBusy(true);
        setSubmissionError(null);

        try {
            console.log('[OnboardingWizard] handleFinish called');
            console.log('[OnboardingWizard] Session:', session);
            console.log('[OnboardingWizard] User:', session?.user);
            console.log('[OnboardingWizard] User Role:', session?.user?.role);

            // Log token expiry information
            if (session?.issued_at && session?.expires_in) {
                const now = Date.now();
                const expiresAt = session.issued_at + session.expires_in * 1000;
                const timeRemaining = expiresAt - now;
                const minutesRemaining = Math.floor(timeRemaining / 60000);
                console.log('[OnboardingWizard] Token expires in:', minutesRemaining, 'minutes');
                console.log(
                    '[OnboardingWizard] Token issued at:',
                    new Date(session.issued_at).toLocaleString()
                );
                console.log(
                    '[OnboardingWizard] Token expires at:',
                    new Date(expiresAt).toLocaleString()
                );
            }

            // Check authentication first
            if (!session || !session.access_token) {
                console.log('[OnboardingWizard] No session or access_token');
                setSubmissionError(
                    'You must be logged in to create a client. Redirecting to login...'
                );
                setBusy(false);
                setTimeout(() => {
                    navigate('/auth/login');
                }, 2000);
                return;
            }

            const p = state.personal;

            // Validate required fields
            if (!p.surname || !p.firstNames || !p.idNumber || !p.phone || !p.email) {
                throw new Error('Missing required personal information');
            }

            console.log('[OnboardingWizard] Building client data...');
            console.log('[OnboardingWizard] State.products:', state.products);
            console.log('[OnboardingWizard] State.productInfo:', state.productInfo);
            console.log('[OnboardingWizard] State.payment:', state.payment);

            // Build CreateClientDto from form state
            const clientData: CreateClientDto = {
                idNumber: p.idNumber,
                firstName: p.firstNames,
                lastName: p.surname,
                email: p.email,
                phoneNumber: p.phone,
                alternatePhone: undefined,
                // Extract date of birth from ID number (first 6 digits: YYMMDD)
                dateOfBirth: extractDateOfBirthFromId(p.idNumber),
                maritalStatus: 'single' as const, // Default - not collected in current form
                clientType: 'individual' as const,
                physicalAddress: p.physicalAddress || '',
                postalAddress: p.postalAddress || p.physicalAddress || '',
                monthlyIncome: 0, // TODO: Should collect this in form
                monthlyExpenses: 0, // TODO: Should collect this in form
                totalDebt: 0, // TODO: Should collect this in form
                creditScore: undefined,
                employer: undefined, // Not collected in current form
                jobTitle: undefined, // Not collected in current form
                // Add selected products
                selectedProducts: state.products
                    .filter((p) => p.selected)
                    .map((p) => ({
                        productId: p.id,
                        paymentOptionId: state.payment?.selectedPaymentOptions?.[p.id] || '',
                        cirAccounts: state.productInfo?.cirAccounts || undefined,
                    })),
                // Add payment information
                paymentInfo: {
                    firstPaymentMonth: state.payment?.firstPaymentMonth,
                    selectedPaymentOptions: state.payment?.selectedPaymentOptions,
                },
                // Add banking information
                bankName: state.banking?.bankName,
                accountType: state.banking?.accountType,
                accountHolder: state.banking?.accountHolder,
                accountNumber: state.banking?.accountNumber,
                branchCode: state.banking?.branchCode,
                // Add additional personal info if collected
                title: p.title,
                language: p.language,
                gender: p.gender,
            };

            console.log('[OnboardingWizard] Client data prepared:', clientData);
            console.log(
                '[OnboardingWizard] selectedProducts structure:',
                JSON.stringify(clientData.selectedProducts, null, 2)
            );
            console.log('[OnboardingWizard] Calling createClient API...');

            // Call the API to create the client
            const createdClient = await createClient(clientData);

            console.log('[OnboardingWizard] Client created successfully:', createdClient);

            // Navigate to the newly created client's detail page
            navigate(`/clients/${createdClient.id}`);
        } catch (err) {
            console.error('[OnboardingWizard] Error in handleFinish:', err);
            console.error('[OnboardingWizard] Error details:', {
                message: err instanceof Error ? err.message : 'Unknown error',
                stack: err instanceof Error ? err.stack : undefined,
                error: err,
            });

            let errorMessage = 'Failed to create client';

            if (err instanceof Error) {
                errorMessage = err.message;

                // Check for authentication errors
                if (
                    errorMessage.includes('Authentication required') ||
                    errorMessage.includes('401')
                ) {
                    errorMessage =
                        'You must be logged in to create a client. Please log in and try again.';
                    // Optionally redirect to login after a delay
                    setTimeout(() => {
                        navigate('/auth/login');
                    }, 3000);
                }
            }

            setSubmissionError(errorMessage);
            setBusy(false);
        }
    }

    // Helper function to extract date of birth from SA ID number
    function extractDateOfBirthFromId(idNumber: string): string {
        if (idNumber.length !== 13) {
            return '2000-01-01'; // Default fallback
        }

        // SA ID format: YYMMDD... (first 6 digits)
        const yy = idNumber.substring(0, 2);
        const mm = idNumber.substring(2, 4);
        const dd = idNumber.substring(4, 6);

        // Determine century (assume 19xx if > current year's last 2 digits, else 20xx)
        const currentYear = new Date().getFullYear();
        const currentYY = currentYear % 100;
        const yyNum = parseInt(yy, 10);
        const century = yyNum > currentYY ? '19' : '20';

        return `${century}${yy}-${mm}-${dd}`;
    }

    return (
        <div className="container-fluid py-3">
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
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="8.5" cy="7" r="4" />
                            <polyline points="17 11 19 13 23 9" />
                        </svg>
                        <div className="flex-grow-1">
                            <h4 className="mb-0" style={{ fontWeight: 700 }}>
                                New Client Onboarding
                            </h4>
                            <div className="opacity-90" style={{ fontSize: '0.95rem' }}>
                                Complete all steps to register a new client
                            </div>
                        </div>
                    </div>

                    {/* Progress Stats */}
                    <div className="row g-3 mt-2">
                        <div className="col-md-4 col-6">
                            <div
                                className="text-center p-3"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.15)',
                                    borderRadius: '12px',
                                    backdropFilter: 'blur(10px)',
                                }}
                            >
                                <div className="opacity-90" style={{ fontSize: '0.85rem' }}>
                                    Current Step
                                </div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                                    {index + 1} of {STEPS.length}
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4 col-6">
                            <div
                                className="text-center p-3"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.15)',
                                    borderRadius: '12px',
                                    backdropFilter: 'blur(10px)',
                                }}
                            >
                                <div className="opacity-90" style={{ fontSize: '0.85rem' }}>
                                    Progress
                                </div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                                    {Math.round(((index + 1) / STEPS.length) * 100)}%
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4 col-6">
                            <div
                                className="text-center p-3"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.15)',
                                    borderRadius: '12px',
                                    backdropFilter: 'blur(10px)',
                                }}
                            >
                                <div className="opacity-90" style={{ fontSize: '0.85rem' }}>
                                    Status
                                </div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                                    {STEPS[index]?.label || 'N/A'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Authentication Warning */}
            {!session && (
                <div
                    className="alert alert-warning mb-3"
                    role="alert"
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
                        style={{ marginRight: '8px' }}
                    >
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <strong>Not Logged In:</strong> You must be logged in to submit this form.
                    <Button
                        variant="link"
                        className="p-0 ms-2"
                        onClick={() => navigate('/auth/login')}
                        style={{ textDecoration: 'underline' }}
                    >
                        Click here to log in
                    </Button>
                </div>
            )}

            <div className="row">
                {/* vertical tabs */}
                <div className="col-md-3">
                    <div className="card border-0 shadow-sm mb-3" style={{ borderRadius: '12px' }}>
                        <div className="card-body p-2">
                            <div className="cf-tabs d-flex flex-column gap-2">
                                {STEPS.map((s, i) => {
                                    const active = s.key === current;
                                    const done = i < index;
                                    return (
                                        <button
                                            key={s.key}
                                            type="button"
                                            className={`cf-tab ${active ? 'active' : ''} ${done ? 'done' : ''}`}
                                            onClick={() => (done ? setCurrent(s.key) : null)}
                                            aria-current={active}
                                        >
                                            <span className="cf-tab-icon">
                                                <FontAwesomeIcon icon={s.icon} />
                                            </span>
                                            <span className="cf-tab-label">
                                                {i + 1}. {s.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* step body */}
                <div className="col-md-9">
                    <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                        <div className="card-body p-3">
                            {current === 'personal' && (
                                <StepPersonal
                                    value={state.personal}
                                    onChange={(p) =>
                                        setState((prev) => ({
                                            ...prev,
                                            personal: { ...prev.personal, ...p },
                                        }))
                                    }
                                    canContinue={canNext('personal')}
                                    onBack={goBack}
                                    onNext={goNext}
                                />
                            )}
                            {current === 'products' && (
                                <StepProducts
                                    products={state.products}
                                    onToggle={(id, sel) => {
                                        console.log(`Main onToggle - Product ${id} set to ${sel}`);
                                        setState((prev) => {
                                            const updated = {
                                                ...prev,
                                                products: prev.products.map((p) =>
                                                    p.id === id ? { ...p, selected: sel } : p
                                                ),
                                            };
                                            console.log(
                                                'Main onToggle - Updated state:',
                                                updated.products
                                            );
                                            return updated;
                                        });
                                    }}
                                    canContinue={canNext('products')}
                                    onBack={goBack}
                                    onNext={goNext}
                                    busy={busy}
                                    loading={loadingProducts}
                                    error={productError}
                                />
                            )}
                            {current === 'product-info' && (
                                <StepProductInfo
                                    products={state.products}
                                    value={state.productInfo || {}}
                                    onChange={(pi) =>
                                        setState((prev) => ({
                                            ...prev,
                                            productInfo: { ...prev.productInfo, ...pi },
                                        }))
                                    }
                                    canContinue={canNext('product-info')}
                                    onBack={goBack}
                                    onNext={goNext}
                                    busy={busy}
                                />
                            )}
                            {current === 'banking' && (
                                <StepBanking
                                    value={state.banking || {}}
                                    onChange={(b) =>
                                        setState((prev) => ({
                                            ...prev,
                                            banking: { ...prev.banking, ...b },
                                        }))
                                    }
                                    canContinue={canNext('banking')}
                                    onBack={goBack}
                                    onNext={goNext}
                                    busy={busy}
                                />
                            )}
                            {current === 'payment' && (
                                <StepPayment
                                    products={state.products}
                                    value={state.payment || {}}
                                    onChange={(p) =>
                                        setState((prev) => ({
                                            ...prev,
                                            payment: { ...prev.payment, ...p },
                                        }))
                                    }
                                    canContinue={canNext('payment')}
                                    onBack={goBack}
                                    onNext={submitAll}
                                    busy={busy}
                                />
                            )}
                            {current === 'confirm' && (
                                <StepConfirm
                                    data={state}
                                    onBack={() => setCurrent('payment')}
                                    onFinish={handleFinish}
                                    busy={busy}
                                    error={submissionError}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ---------- Steps ---------- */

function StepPersonal({
    value,
    onChange,
    canContinue,
    onBack,
    onNext,
}: {
    value: Personal;
    onChange: (p: Partial<Personal>) => void;
    canContinue: boolean;
    onBack: () => void;
    onNext: () => void;
}) {
    return (
        <>
            <h5 className="mb-3">1: Your personal details</h5>
            <Row className="g-3">
                <Col md={6}>
                    <Form.Label>
                        Surname <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                        value={value.surname ?? ''}
                        onChange={(e) => onChange({ surname: e.target.value })}
                    />
                </Col>
                <Col md={6}>
                    <Form.Label>
                        First names <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                        value={value.firstNames ?? ''}
                        onChange={(e) => onChange({ firstNames: e.target.value })}
                    />
                </Col>
                <Col md={6}>
                    <Form.Label>
                        ID Number <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                        value={value.idNumber ?? ''}
                        onChange={(e) => onChange({ idNumber: e.target.value })}
                    />
                </Col>
                <Col md={6}>
                    <Form.Label>Language</Form.Label>
                    <Form.Select
                        value={value.language ?? ''}
                        onChange={(e) => onChange({ language: e.currentTarget.value })}
                    >
                        <option value="">Choose…</option>
                        <option value="en">English</option>
                        <option value="af">Afrikaans</option>
                        <option value="zu">Zulu (isiZulu)</option>
                        <option value="xh">Xhosa (isiXhosa)</option>
                        <option value="st">Sotho (Sesotho)</option>
                        <option value="nso">Northern Sotho (Sepedi)</option>
                        <option value="tn">Tswana (Setswana)</option>
                        <option value="ts">Tsonga (Xitsonga)</option>
                        <option value="ss">Swati (siSwati)</option>
                        <option value="ve">Venda (Tshivenda)</option>
                        <option value="nr">Ndebele (isiNdebele)</option>
                    </Form.Select>
                </Col>
                <Col md={6}>
                    <Form.Label>Gender</Form.Label>
                    <Form.Select
                        value={value.gender ?? ''}
                        onChange={(e) => onChange({ gender: e.currentTarget.value })}
                    >
                        <option value="">Choose…</option>
                        <option value="f">Female</option>
                        <option value="m">Male</option>
                        <option value="o">Other</option>
                    </Form.Select>
                </Col>
                <Col md={6}>
                    <Form.Label>
                        Cell <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                        value={value.phone ?? ''}
                        onChange={(e) => onChange({ phone: e.target.value })}
                    />
                </Col>
                <Col md={12}>
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                        value={value.email ?? ''}
                        onChange={(e) => onChange({ email: e.target.value })}
                    />
                </Col>
                <Col md={12}>
                    <Form.Label>
                        Physical Address <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={3}
                        value={value.physicalAddress ?? ''}
                        onChange={(e) => onChange({ physicalAddress: e.target.value })}
                        placeholder="Enter your physical address"
                    />
                </Col>
                <Col md={12}>
                    <Form.Check
                        type="checkbox"
                        id="sameAsPhysical"
                        label="Postal address is the same as physical address"
                        checked={value.sameAsPhysical ?? false}
                        onChange={(e) => {
                            const isChecked = e.target.checked;
                            onChange({
                                sameAsPhysical: isChecked,
                                postalAddress: isChecked ? value.physicalAddress : '',
                            });
                        }}
                    />
                </Col>
                {!value.sameAsPhysical && (
                    <Col md={12}>
                        <Form.Label>
                            Postal Address <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            value={value.postalAddress ?? ''}
                            onChange={(e) => onChange({ postalAddress: e.target.value })}
                            placeholder="Enter your postal address"
                        />
                    </Col>
                )}
            </Row>

            <div className="d-flex justify-content-between mt-4">
                <Button
                    variant="outline-secondary"
                    onClick={onBack}
                    type="button"
                    style={{ borderRadius: '8px' }}
                >
                    Back
                </Button>
                <Button
                    disabled={!canContinue}
                    onClick={onNext}
                    type="button"
                    style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        color: 'white',
                        borderRadius: '8px',
                        fontWeight: 500,
                    }}
                >
                    Next
                </Button>
            </div>
        </>
    );
}

function StepProducts({
    products,
    onToggle,
    canContinue,
    onBack,
    onNext,
    busy,
    loading,
    error,
}: {
    products: Product[];
    onToggle: (id: string, selected: boolean) => void;
    canContinue: boolean;
    onBack: () => void;
    onNext: () => void;
    busy?: boolean;
    loading?: boolean;
    error?: string | null;
}) {
    // Get the currently selected product
    const selectedProduct = products.find((p) => p.selected);

    // Handle radio button selection - only one product at a time
    const handleSelect = (productId: string) => {
        console.log(`StepProducts - Selecting product ${productId}`);

        // Deselect all products first, then select the clicked one
        products.forEach((p) => {
            if (p.id === productId) {
                onToggle(p.id, true);
            } else if (p.selected) {
                onToggle(p.id, false);
            }
        });
    };

    useEffect(() => {
        console.log('StepProducts - Products:', products);
        console.log('StepProducts - Selected product:', selectedProduct?.name || 'None');
    }, [products, selectedProduct]);

    return (
        <>
            <h5 className="mb-3">2: Select a product</h5>
            <p className="text-muted mb-4">
                Please select <strong>one product</strong> for this client. You can add additional
                products after the initial onboarding.
            </p>

            {loading && (
                <div className="alert alert-info">
                    <div className="d-flex align-items-center gap-2">
                        <div className="spinner-border spinner-border-sm" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <span>Loading available products...</span>
                    </div>
                </div>
            )}

            {error && (
                <div className="alert alert-danger">
                    <strong>Error loading products:</strong> {error}
                    <div className="mt-2">
                        <small>
                            Please refresh the page or contact support if the problem persists.
                        </small>
                    </div>
                </div>
            )}

            {!loading && !error && products.length === 0 && (
                <div className="alert alert-warning">
                    No products are currently available. Please contact support.
                </div>
            )}

            <Row className="g-3">
                {products.map((p) => (
                    <Col md={12} key={p.id}>
                        <div
                            className={`cf-prod card h-100 ${p.selected ? 'border-primary' : ''}`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => !loading && handleSelect(p.id)}
                        >
                            <div className="card-body">
                                <div className="d-flex align-items-start gap-3">
                                    <Form.Check
                                        type="radio"
                                        name="productSelection"
                                        checked={!!p.selected}
                                        onChange={() => handleSelect(p.id)}
                                        disabled={loading}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <div className="flex-grow-1">
                                        <div className="fw-bold mb-1">{p.name}</div>
                                        <div className="text-muted" style={{ fontSize: 13 }}>
                                            {p.desc}
                                        </div>
                                        {/* Display pricing options */}
                                        {p.paymentOptions && p.paymentOptions.length > 0 && (
                                            <div
                                                className="mt-2 text-muted"
                                                style={{ fontSize: 12 }}
                                            >
                                                <strong>Payment options:</strong>{' '}
                                                {p.paymentOptions
                                                    .map((opt) => opt.label)
                                                    .join(', ')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Col>
                ))}
            </Row>

            <div className="d-flex justify-content-between mt-4">
                <Button
                    variant="outline-secondary"
                    onClick={onBack}
                    type="button"
                    style={{ borderRadius: '8px' }}
                >
                    Back
                </Button>
                <Button
                    disabled={!canContinue || busy}
                    onClick={onNext}
                    type="button"
                    style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        color: 'white',
                        borderRadius: '8px',
                        fontWeight: 500,
                    }}
                >
                    {busy ? 'Saving…' : 'Confirm'}
                </Button>
            </div>
        </>
    );
}

function StepProductInfo({
    products,
    value,
    onChange,
    canContinue,
    onBack,
    onNext,
    busy,
}: {
    products: Product[];
    value: ProductInfo;
    onChange: (pi: Partial<ProductInfo>) => void;
    canContinue: boolean;
    onBack: () => void;
    onNext: () => void;
    busy?: boolean;
}) {
    const selectedProducts = products.filter((p) => p.selected);
    const hasCIR = selectedProducts.some((p) => p.id === 'cir');

    return (
        <>
            <h5 className="mb-3">3: Product-Specific Information</h5>

            {hasCIR && (
                <div className="mb-4">
                    <div className="card border-0 shadow-sm p-3" style={{ borderRadius: '12px' }}>
                        <div className="fw-bold mb-3">Credit Interpretation Report (Experian)</div>
                        <Form.Label>
                            Name 3 accounts that you are currently paying?
                            <span className="text-danger">*</span>
                        </Form.Label>
                        <div className="gap-3 d-flex flex-column">
                            {[0, 1, 2].map((index) => (
                                <Form.Control
                                    key={index}
                                    placeholder={`Account ${index + 1}`}
                                    value={value.cirAccounts?.[index] ?? ''}
                                    onChange={(e) => {
                                        const accounts = [...(value.cirAccounts ?? ['', '', ''])];
                                        accounts[index] = e.target.value;
                                        onChange({ cirAccounts: accounts });
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {!hasCIR && (
                <div className="card border-0 shadow-sm p-3" style={{ borderRadius: '12px' }}>
                    <div className="text-muted">
                        No product-specific information required for the selected product(s).
                    </div>
                </div>
            )}

            <div className="d-flex justify-content-between mt-4">
                <Button
                    variant="outline-secondary"
                    onClick={onBack}
                    type="button"
                    style={{ borderRadius: '8px' }}
                >
                    Back
                </Button>
                <Button
                    disabled={!canContinue || busy}
                    onClick={onNext}
                    type="button"
                    style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        color: 'white',
                        borderRadius: '8px',
                        fontWeight: 500,
                    }}
                >
                    Next
                </Button>
            </div>
        </>
    );
}

function StepPayment({
    products,
    value,
    onChange,
    canContinue,
    onBack,
    onNext,
    busy,
}: {
    products: Product[];
    value: Payment;
    onChange: (p: Partial<Payment>) => void;
    canContinue: boolean;
    onBack: () => void;
    onNext: () => void;
    busy?: boolean;
}) {
    const selectedProducts = products.filter((p) => p.selected);
    const selectedPayments = value.selectedPaymentOptions || {};
    const totalAmount = calculateTotal(selectedProducts, selectedPayments);

    function calculateTotal(prods: Product[], payments: Record<string, string>): number {
        return prods.reduce((sum, product) => {
            const optionId = payments[product.id];
            const option = product.paymentOptions?.find((o) => o.id === optionId);
            if (!option) return sum;

            if (option.onceOff) return sum + option.onceOff;
            if (option.monthly && option.months) return sum + option.monthly * option.months;
            return sum;
        }, 0);
    }

    function getPaymentSummary(product: Product, optionId?: string) {
        if (!optionId) return null;
        const option = product.paymentOptions?.find((o) => o.id === optionId);
        return option;
    }

    return (
        <>
            <h5 className="mb-3">4: Payment Details</h5>
            <p className="text-muted mb-4">
                Please select a payment option for each chosen product:
            </p>

            {/* Payment Options per Product */}
            <div className="mb-4">
                {selectedProducts.map((product) => (
                    <div
                        key={product.id}
                        className="card border-0 shadow-sm p-3 mb-3"
                        style={{ borderRadius: '12px' }}
                    >
                        <div className="fw-bold mb-3">{product.name}</div>
                        <Form.Label>
                            Payment option <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Select
                            value={selectedPayments[product.id] ?? ''}
                            onChange={(e) => {
                                onChange({
                                    selectedPaymentOptions: {
                                        ...selectedPayments,
                                        [product.id]: e.target.value,
                                    },
                                });
                            }}
                        >
                            <option value="" disabled>
                                Select payment option…
                            </option>
                            {product.paymentOptions?.map((option) => (
                                <option key={option.id} value={option.id}>
                                    {option.label}
                                </option>
                            ))}
                        </Form.Select>
                    </div>
                ))}
            </div>

            {/* First Payment Month */}
            <div className="card border-0 shadow-sm p-3 mb-4" style={{ borderRadius: '12px' }}>
                <Form.Label>
                    First payment month <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                    value={value.firstPaymentMonth ?? ''}
                    onChange={(e) =>
                        onChange({
                            firstPaymentMonth: e.target.value as 'first' | 'second' | 'third',
                        })
                    }
                >
                    <option value="" disabled>
                        Select first payment month…
                    </option>
                    <option value="first">First month</option>
                    <option value="second">Second month</option>
                    <option value="third">Third month</option>
                </Form.Select>
            </div>

            {/* Quote Summary */}
            <div className="card border-0 shadow-sm p-3 mb-4" style={{ borderRadius: '12px' }}>
                <div className="fw-bold mb-3">Quote Summary</div>
                <div className="table-responsive">
                    <table className="table table-sm mb-0">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th className="text-end">Once-off</th>
                                <th className="text-end">Monthly</th>
                                <th className="text-end">Months</th>
                                <th className="text-end">First Payment</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedProducts.map((product) => {
                                const summary = getPaymentSummary(
                                    product,
                                    selectedPayments[product.id]
                                );
                                return (
                                    <tr key={product.id}>
                                        <td>{product.name}</td>
                                        <td className="text-end">
                                            {summary?.onceOff
                                                ? `R ${summary.onceOff.toLocaleString()}`
                                                : '-'}
                                        </td>
                                        <td className="text-end">
                                            {summary?.monthly
                                                ? `R ${summary.monthly.toLocaleString()}`
                                                : '-'}
                                        </td>
                                        <td className="text-end">{summary?.months ?? '-'}</td>
                                        <td className="text-end fw-bold">
                                            {summary?.onceOff
                                                ? `R ${summary.onceOff.toLocaleString()}`
                                                : summary?.monthly
                                                  ? `R ${summary.monthly.toLocaleString()}`
                                                  : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                            <tr className="fw-bold border-top">
                                <td>Total contract amount:</td>
                                <td colSpan={3}></td>
                                <td className="text-end">R {totalAmount.toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Agreements */}
            <div className="card border-0 shadow-sm p-3 mb-4" style={{ borderRadius: '12px' }}>
                <div className="fw-bold mb-3">Agreements</div>
                <Form.Group className="mb-3">
                    <Form.Check
                        type="checkbox"
                        id="agree-debt"
                        label={`Do you agree that you are indebted to QFinance (PTY) Ltd for an amount of R ${totalAmount.toLocaleString()}?`}
                        checked={value.agreedToDebt ?? false}
                        onChange={(e) => onChange({ agreedToDebt: e.target.checked })}
                    />
                </Form.Group>
                <Form.Group className="mb-3">
                    <Form.Check
                        type="checkbox"
                        id="agree-payment"
                        label="Do you authorise QFinance (PTY) Ltd to issue and deliver payment instructions to your banker for collection against your bank account?"
                        checked={value.agreedToPaymentInstructions ?? false}
                        onChange={(e) =>
                            onChange({ agreedToPaymentInstructions: e.target.checked })
                        }
                    />
                </Form.Group>
                <Form.Group>
                    <Form.Check
                        type="checkbox"
                        id="agree-credit-check"
                        label="Do you authorize QFinance (PTY) Ltd to do a credit check on your behalf?"
                        checked={value.agreedToCreditCheck ?? false}
                        onChange={(e) => onChange({ agreedToCreditCheck: e.target.checked })}
                    />
                </Form.Group>
            </div>

            <div className="d-flex justify-content-between mt-4">
                <Button
                    variant="outline-secondary"
                    onClick={onBack}
                    type="button"
                    style={{ borderRadius: '8px' }}
                >
                    Back
                </Button>
                <Button
                    disabled={!canContinue || busy}
                    onClick={onNext}
                    type="button"
                    style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        color: 'white',
                        borderRadius: '8px',
                        fontWeight: 500,
                    }}
                >
                    Next
                </Button>
            </div>
        </>
    );
}

function StepBanking({
    value,
    onChange,
    canContinue,
    onBack,
    onNext,
    busy,
}: {
    value: Banking;
    onChange: (b: Partial<Banking>) => void;
    canContinue: boolean;
    onBack: () => void;
    onNext: () => void;
    busy?: boolean;
}) {
    const SOUTH_AFRICAN_BANKS = [
        { value: 'fnb', label: 'First National Bank (FNB)' },
        { value: 'absa', label: 'Absa Bank' },
        { value: 'standard', label: 'Standard Bank' },
        { value: 'capitec', label: 'Capitec Bank' },
        { value: 'nedbank', label: 'Nedbank' },
        { value: 'african', label: 'African Bank' },
        { value: 'tymebank', label: 'TymeBank' },
        { value: 'discovery', label: 'Discovery Bank' },
        { value: 'bidvest', label: 'Bidvest Bank' },
        { value: 'ubank', label: 'Ubank' },
        { value: 'mercantile', label: 'Mercantile Bank' },
        { value: 'investec', label: 'Investec' },
        { value: 'anz', label: 'ANZ Bank' },
        { value: 'citibank', label: 'Citibank' },
        { value: 'hsbc', label: 'HSBC Bank' },
        { value: 'other', label: 'Other Bank' },
    ];

    const ACCOUNT_TYPES = [
        { value: 'cheque', label: 'Cheque Account' },
        { value: 'savings', label: 'Savings Account' },
        { value: 'credit', label: 'Credit Card' },
        { value: 'callaccount', label: 'Call Account' },
        { value: 'investment', label: 'Investment Account' },
        { value: 'other', label: 'Other' },
    ];

    return (
        <>
            <h5 className="mb-3">5: Banking Details</h5>
            <Row className="g-3">
                <Col md={6}>
                    <Form.Label>
                        Bank Name <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Select
                        value={value.bankName ?? ''}
                        onChange={(e) => onChange({ bankName: e.target.value })}
                    >
                        <option value="" disabled>
                            Select your bank…
                        </option>
                        {SOUTH_AFRICAN_BANKS.map((bank) => (
                            <option key={bank.value} value={bank.value}>
                                {bank.label}
                            </option>
                        ))}
                    </Form.Select>
                </Col>
                <Col md={6}>
                    <Form.Label>
                        Account Type <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Select
                        value={value.accountType ?? ''}
                        onChange={(e) => onChange({ accountType: e.target.value })}
                    >
                        <option value="" disabled>
                            Select account type…
                        </option>
                        {ACCOUNT_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                                {type.label}
                            </option>
                        ))}
                    </Form.Select>
                </Col>
                <Col md={6}>
                    <Form.Label>
                        Account Holder Name <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                        value={value.accountHolder ?? ''}
                        onChange={(e) => onChange({ accountHolder: e.target.value })}
                        placeholder="Full name as it appears on account"
                    />
                </Col>
                <Col md={6}>
                    <Form.Label>
                        Account Number <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                        value={value.accountNumber ?? ''}
                        onChange={(e) => onChange({ accountNumber: e.target.value })}
                        placeholder="Account number"
                        type="text"
                    />
                    <Form.Text className="text-muted">Your account number is secure</Form.Text>
                </Col>
                <Col md={12}>
                    <Form.Label>Account Balance (Optional)</Form.Label>
                    <Form.Control
                        type="number"
                        value={value.balance ?? ''}
                        onChange={(e) =>
                            onChange({
                                balance: e.target.value ? parseFloat(e.target.value) : undefined,
                            })
                        }
                        placeholder="0.00"
                        step="0.01"
                    />
                    <Form.Text className="text-muted">Last known balance</Form.Text>
                </Col>
            </Row>

            <div className="d-flex justify-content-between mt-4">
                <Button
                    variant="outline-secondary"
                    onClick={onBack}
                    type="button"
                    style={{ borderRadius: '8px' }}
                >
                    Back
                </Button>
                <Button
                    disabled={!canContinue || busy}
                    onClick={onNext}
                    type="button"
                    style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        color: 'white',
                        borderRadius: '8px',
                        fontWeight: 500,
                    }}
                >
                    {busy ? 'Saving…' : 'Next'}
                </Button>
            </div>
        </>
    );
}

function StepConfirm({
    data,
    onBack,
    onFinish,
    busy,
    error,
}: {
    data: FormState;
    onBack: () => void;
    onFinish: () => void;
    busy?: boolean;
    error?: string | null;
}) {
    const chosen = data.products.filter((p) => p.selected);

    // Debug: Log products state to console
    useEffect(() => {
        console.log('StepConfirm - All products:', data.products);
        console.log('StepConfirm - Selected products:', chosen);
    }, [data.products, chosen]);

    return (
        <>
            <h5 className="mb-3">6: Confirm</h5>

            {error && (
                <div className="alert alert-danger mb-3" style={{ borderRadius: '12px' }}>
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ marginRight: '8px' }}
                    >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <strong>Submission Error:</strong> {error}
                    <div className="mt-2">
                        <small>Please try again or contact support if the problem persists.</small>
                    </div>
                </div>
            )}

            <Row className="g-3">
                <Col lg={6}>
                    <div className="card border-0 shadow-sm p-3" style={{ borderRadius: '12px' }}>
                        <div className="fw-bold mb-2">Personal</div>
                        <div>
                            <b>Name:</b> {data.personal.firstNames} {data.personal.surname}
                        </div>
                        <div>
                            <b>ID:</b> {data.personal.idNumber}
                        </div>
                        <div>
                            <b>Cell:</b> {data.personal.phone}
                        </div>
                        {data.personal.email && (
                            <div>
                                <b>Email:</b> {data.personal.email}
                            </div>
                        )}
                        {data.personal.physicalAddress && (
                            <div>
                                <b>Physical Address:</b> {data.personal.physicalAddress}
                            </div>
                        )}
                        {data.personal.postalAddress && (
                            <div>
                                <b>Postal Address:</b> {data.personal.postalAddress}
                            </div>
                        )}
                    </div>
                </Col>
                <Col lg={6}>
                    <div className="card border-0 shadow-sm p-3" style={{ borderRadius: '12px' }}>
                        <div className="fw-bold mb-2">Products</div>
                        <ul className="m-0 ps-3">
                            {chosen.map((p) => (
                                <li key={p.id}>{p.name}</li>
                            ))}
                        </ul>
                        {!chosen.length && <div className="text-muted">No products selected.</div>}
                    </div>
                </Col>
            </Row>

            {chosen.some((p) => p.id === 'cir') && (
                <Row className="g-3 mt-2">
                    <Col lg={6}>
                        <div
                            className="card border-0 shadow-sm p-3"
                            style={{ borderRadius: '12px' }}
                        >
                            <div className="fw-bold mb-2">
                                Credit Interpretation Report (Experian)
                            </div>
                            <div>
                                <b>Accounts Currently Paying:</b>
                            </div>
                            <ul className="m-0 ps-3 mt-2">
                                {data.productInfo?.cirAccounts?.map(
                                    (account, idx) => account && <li key={idx}>{account}</li>
                                ) || <li className="text-muted">No accounts listed</li>}
                            </ul>
                        </div>
                    </Col>
                </Row>
            )}

            <Row className="g-3 mt-2">
                <Col lg={6}>
                    <div className="card border-0 shadow-sm p-3" style={{ borderRadius: '12px' }}>
                        <div className="fw-bold mb-2">Banking Details</div>
                        <div>
                            <b>Bank:</b> {data.banking?.bankName || '-'}
                        </div>
                        <div>
                            <b>Account Type:</b> {data.banking?.accountType || '-'}
                        </div>
                        <div>
                            <b>Account Holder:</b> {data.banking?.accountHolder || '-'}
                        </div>
                        <div>
                            <b>Account Number:</b> ••••
                            {data.banking?.accountNumber?.slice(-4) || ''}
                        </div>
                        {data.banking?.balance && (
                            <div>
                                <b>Balance:</b> R {data.banking.balance.toLocaleString()}
                            </div>
                        )}
                    </div>
                </Col>
            </Row>

            <Row className="g-3 mt-2">
                <Col lg={6}>
                    <div className="card border-0 shadow-sm p-3" style={{ borderRadius: '12px' }}>
                        <div className="fw-bold mb-2">Payment Details</div>
                        <div>
                            <b>Payment Method:</b>
                        </div>
                        <ul className="m-0 ps-3 mt-2">
                            {chosen.map((product) => {
                                const optionId = data.payment?.selectedPaymentOptions?.[product.id];
                                const option = product.paymentOptions?.find(
                                    (o) => o.id === optionId
                                );
                                return (
                                    <li key={product.id}>
                                        <div className="text-sm mb-1">
                                            <b>{product.name}:</b> {option?.label || 'Not selected'}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                        <div className="mt-3">
                            <b>First Payment Month:</b>{' '}
                            {data.payment?.firstPaymentMonth
                                ?.replace('first', 'First month')
                                .replace('second', 'Second month')
                                .replace('third', 'Third month') || '-'}
                        </div>
                    </div>
                </Col>
            </Row>

            <div className="d-flex justify-content-between mt-4">
                <Button
                    variant="outline-secondary"
                    onClick={onBack}
                    disabled={busy}
                    type="button"
                    style={{ borderRadius: '8px' }}
                >
                    Back
                </Button>
                <Button
                    onClick={onFinish}
                    disabled={busy}
                    type="button"
                    style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        color: 'white',
                        borderRadius: '8px',
                        fontWeight: 500,
                        minWidth: '120px',
                    }}
                >
                    {busy ? (
                        <>
                            <span
                                className="spinner-border spinner-border-sm me-2"
                                role="status"
                                aria-hidden="true"
                            ></span>
                            Creating...
                        </>
                    ) : (
                        'Finish'
                    )}
                </Button>
            </div>
        </>
    );
}
