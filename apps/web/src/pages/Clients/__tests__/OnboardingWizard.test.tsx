// @vitest-environment jsdom

import { act, type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthSession } from '@/interfaces/AuthUser';

const { listProductsMock, createClientMock, logOnboardingStepMock, authState } = vi.hoisted(() => ({
    listProductsMock: vi.fn(),
    createClientMock: vi.fn(),
    logOnboardingStepMock: vi.fn(),
    authState: { session: null as AuthSession | null },
}));

vi.mock('@/api/products', () => ({
    listProducts: listProductsMock,
}));

vi.mock('@/api/clients.api', () => ({
    createClient: createClientMock,
    logOnboardingStep: logOnboardingStepMock,
}));

vi.mock('@/stores/auth.store', () => ({
    useAuthStore: (selector: (state: typeof authState) => unknown) => selector(authState),
}));

let OnboardingWizard: ComponentType;
let container: HTMLDivElement;
let root: Root;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

const session: AuthSession = {
    access_token: 'local-test-token',
    user: {
        id: 'agent-1',
        email: 'agent@example.test',
        firstName: 'Test',
        lastName: 'Agent',
        role: 'agent',
        permissions: ['clients.create'],
    },
};

const productsResponse = {
    products: [
        {
            id: 'product-1',
            name: 'Credit Health Review',
            description: 'Review and interpretation service',
            pricing_options: { oneOff: 795 },
        },
    ],
};

const LocationProbe = () => {
    const location = useLocation();
    return <output data-testid="location">{location.pathname}</output>;
};

const renderWizard = async () => {
    await act(async () => {
        root.render(
            <MemoryRouter initialEntries={['/clients/new']}>
                <OnboardingWizard />
                <LocationProbe />
            </MemoryRouter>
        );
    });
};

const selectStep = async (label: string) => {
    const step = Array.from(container.querySelectorAll<HTMLButtonElement>('.cf-tab')).find(
        (button) => button.textContent?.includes(label)
    );
    if (!step) throw new Error(`Step not rendered: ${label}`);
    await act(async () => step.click());
};

const clickAction = async (label: string) => {
    const action = Array.from(container.querySelectorAll<HTMLButtonElement>('.wizard-panel button'))
        .reverse()
        .find((button) => button.textContent?.trim() === label);
    if (!action) throw new Error(`Action not rendered: ${label}`);
    await act(async () => action.click());
};

const changeValue = async (
    control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
    value: string
) => {
    await act(async () => {
        const prototype = Object.getPrototypeOf(control) as object;
        const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
        valueSetter?.call(control, value);
        control.dispatchEvent(new Event('input', { bubbles: true }));
        control.dispatchEvent(new Event('change', { bubbles: true }));
    });
};

beforeAll(async () => {
    Reflect.set(window, 'IS_REACT_ACT_ENVIRONMENT', true);
    OnboardingWizard = (await import('../OnboardingWizard')).default;
});

beforeEach(() => {
    authState.session = session;
    listProductsMock.mockReset().mockResolvedValue(productsResponse);
    createClientMock.mockReset();
    logOnboardingStepMock.mockReset().mockResolvedValue(undefined);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    consoleErrorSpy.mockRestore();
});

describe('OnboardingWizard', () => {
    it('renders all eight ordered steps and loads operational products', async () => {
        await renderWizard();

        expect(container.querySelectorAll('.cf-tab')).toHaveLength(8);
        expect(container.querySelector('[aria-current="step"]')?.textContent).toContain(
            'Introduction'
        );
        expect(container.textContent).toContain('Step 1: Introduction Script');
        expect(listProductsMock).toHaveBeenCalledWith({ status: 'active', limit: 100 });
    });

    it('allows an invalid personal step to explain what must be fixed', async () => {
        await renderWizard();
        await selectStep('Your personal details');
        await clickAction('Next');

        const alert = container.querySelector('[role="alert"]');
        expect(alert?.textContent).toContain('Surname is required');
        expect(alert?.textContent).toContain('ID Number is required');
        expect(alert?.textContent).toContain('Physical address is required');
        expect(container.querySelector('[aria-current="step"]')?.textContent).toContain(
            'Your personal details'
        );
    });

    it('keeps product selection clear and advances through the existing workflow', async () => {
        await renderWizard();
        await selectStep('Select product');
        await vi.waitFor(() => expect(container.textContent).toContain('Credit Health Review'));

        const productCard = container.querySelector<HTMLElement>('.cf-prod');
        await act(async () => productCard?.click());
        expect(productCard?.classList.contains('border-primary')).toBe(true);
        expect(container.querySelector<HTMLInputElement>('input[type="radio"]')?.checked).toBe(
            true
        );

        await clickAction('Confirm');
        await vi.waitFor(() =>
            expect(container.querySelector('[aria-current="step"]')?.textContent).toContain(
                'Product information'
            )
        );
        expect(logOnboardingStepMock).toHaveBeenCalledWith(
            'products',
            undefined,
            expect.objectContaining({ stepLabel: 'Select product/s' })
        );
    });

    it('shows the product API failure instead of an empty product selector', async () => {
        listProductsMock.mockRejectedValue(new Error('Product service unavailable'));
        await renderWizard();
        await selectStep('Select product');

        await vi.waitFor(() =>
            expect(container.textContent).toContain('Product service unavailable')
        );
        expect(container.textContent).toContain('Error loading products');
    });

    it('shows product loading and empty states explicitly', async () => {
        let resolveProducts: ((value: typeof productsResponse) => void) | undefined;
        listProductsMock.mockReturnValueOnce(
            new Promise((resolve) => {
                resolveProducts = resolve;
            })
        );
        await renderWizard();
        await selectStep('Select product');

        expect(container.textContent).toContain('Loading available products');
        await act(async () => resolveProducts?.({ products: [] }));
        await vi.waitFor(() =>
            expect(container.textContent).toContain('No products are currently available')
        );
    });

    it('shows banking validation without allowing the step to advance', async () => {
        await renderWizard();
        await selectStep('Banking details');
        await clickAction('Next');

        const alert = container.querySelector('[role="alert"]');
        expect(alert?.textContent).toContain('Bank name is required');
        expect(alert?.textContent).toContain('Account number is required');
        expect(container.querySelector('[aria-current="step"]')?.textContent).toContain(
            'Banking details'
        );
    });

    it('uses the real login route when the authenticated session is missing', async () => {
        authState.session = null;
        await renderWizard();

        expect(container.querySelector('[role="alert"]')?.textContent).toContain('Not Logged In');
        const loginAction = Array.from(
            container.querySelectorAll<HTMLButtonElement>('button')
        ).find((button) => button.textContent?.includes('Click here to log in'));
        await act(async () => loginAction?.click());
        expect(container.querySelector('[data-testid="location"]')?.textContent).toBe('/login');
    });

    it('preserves the complete client, product, payment, banking and consent submission', async () => {
        createClientMock.mockResolvedValue({
            id: 'created-client-1',
            firstName: 'Naledi',
            lastName: 'Mokoena',
        });
        await renderWizard();

        await selectStep('Your personal details');
        const personalInputs = Array.from(
            container.querySelectorAll<HTMLInputElement>('.wizard-panel input.form-control')
        );
        await changeValue(personalInputs[0], 'Mokoena');
        await changeValue(personalInputs[1], 'Naledi');
        await changeValue(personalInputs[2], '9001015009087');
        await changeValue(personalInputs[3], '0821234567');
        await changeValue(personalInputs[4], 'naledi@example.test');
        const addresses = Array.from(
            container.querySelectorAll<HTMLTextAreaElement>('.wizard-panel textarea')
        );
        await changeValue(addresses[0], '1 Main Road, Pretoria');
        await changeValue(addresses[1], 'PO Box 10, Pretoria');

        await selectStep('Select product');
        await vi.waitFor(() => expect(container.textContent).toContain('Credit Health Review'));
        await act(async () => container.querySelector<HTMLElement>('.cf-prod')?.click());

        await selectStep('Banking details');
        const bankingSelects = Array.from(
            container.querySelectorAll<HTMLSelectElement>('.wizard-panel select')
        );
        await changeValue(bankingSelects[0], 'fnb');
        await changeValue(bankingSelects[1], 'savings');
        const holder = container.querySelector<HTMLInputElement>(
            'input[placeholder="Full name as it appears on account"]'
        );
        const account = container.querySelector<HTMLInputElement>(
            'input[placeholder="Account number"]'
        );
        if (!holder || !account) throw new Error('Banking inputs not rendered');
        await changeValue(holder, 'Naledi Mokoena');
        await changeValue(account, '1234567890');

        await selectStep('Payment details');
        const paymentSelects = Array.from(
            container.querySelectorAll<HTMLSelectElement>('.wizard-panel select')
        );
        await changeValue(paymentSelects[0], 'product-1_once_off');
        await changeValue(paymentSelects[1], 'first');

        await selectStep('Debit Order Agreement');
        const paymentDate = container.querySelector<HTMLSelectElement>('.wizard-panel select');
        if (!paymentDate) throw new Error('Payment date selector not rendered');
        await changeValue(paymentDate, '15');
        for (const checkbox of Array.from(
            container.querySelectorAll<HTMLInputElement>('.wizard-panel input[type="checkbox"]')
        )) {
            await act(async () => checkbox.click());
        }

        await selectStep('Confirm');
        await clickAction('Finish');

        await vi.waitFor(() => expect(createClientMock).toHaveBeenCalledTimes(1));
        expect(createClientMock).toHaveBeenCalledWith(
            expect.objectContaining({
                firstName: 'Naledi',
                lastName: 'Mokoena',
                email: 'naledi@example.test',
                bankName: 'fnb',
                accountType: 'savings',
                accountNumber: '1234567890',
                selectedProducts: [
                    expect.objectContaining({
                        productId: 'product-1',
                        paymentOptionId: 'product-1_once_off',
                    }),
                ],
                paymentInfo: expect.objectContaining({ firstPaymentMonth: 'first' }),
            })
        );
        await vi.waitFor(() =>
            expect(container.querySelector('[data-testid="location"]')?.textContent).toBe(
                '/clients/created-client-1'
            )
        );
    });
});
