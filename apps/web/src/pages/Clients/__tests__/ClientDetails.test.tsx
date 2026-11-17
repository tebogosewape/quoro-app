// @vitest-environment jsdom

import { act, type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubEnv('VITE_API_URL', 'http://localhost:2200/api');

const {
    getClientByIdMock,
    updateClientMock,
    downloadCreditReportMock,
    listProductsMock,
    listTasksMock,
    createTaskMock,
    attemptNuPayMandateMock,
} = vi.hoisted(() => ({
    getClientByIdMock: vi.fn(),
    updateClientMock: vi.fn(),
    downloadCreditReportMock: vi.fn(),
    listProductsMock: vi.fn(),
    listTasksMock: vi.fn(),
    createTaskMock: vi.fn(),
    attemptNuPayMandateMock: vi.fn(),
}));

vi.mock('@/api/clients.api', () => ({
    getClientById: getClientByIdMock,
    updateClient: updateClientMock,
    getClientCommunications: vi.fn().mockResolvedValue([]),
    downloadCreditReport: downloadCreditReportMock,
}));

vi.mock('@/api/products', () => ({ listProducts: listProductsMock }));
vi.mock('@/api/tasks.api', () => ({
    listTasks: listTasksMock,
    createTask: createTaskMock,
    updateTask: vi.fn(),
}));
vi.mock('@/api/whatsapp.api', () => ({
    whatsappApi: {
        checkHealth: vi.fn().mockResolvedValue({ data: { isReady: true } }),
        getMessages: vi.fn().mockResolvedValue({ data: [] }),
        sendMessage: vi.fn().mockResolvedValue({ data: {} }),
    },
}));
vi.mock('@/api/debicheck.api', () => ({
    attemptNuPayMandate: attemptNuPayMandateMock,
}));
vi.mock('@/stores/auth.store', () => ({
    useAuthStore: (selector: (state: unknown) => unknown) =>
        selector({
            session: {
                access_token: 'test-token',
                user: { id: 'agent-1', role: 'agent' },
            },
        }),
}));

const client = {
    id: '803e284e-d178-4f5b-b76f-81a376398e31',
    fileReference: 'QFN000022',
    firstName: 'Naledi',
    lastName: 'Mokoena',
    phoneNumber: '0821234567',
    email: 'naledi@example.test',
    idNumber: '9001015009087',
    maritalStatus: 'single',
    clientType: 'individual',
    dateOfBirth: '1990-01-01',
    physicalAddress: '1 Main Road, Pretoria, 0002',
    postalAddress: '1 Main Road, Pretoria, 0002',
    monthlyIncome: 25000,
    monthlyExpenses: 12000,
    totalDebt: 50000,
    bankName: 'Test Bank',
    accountType: 'Cheque',
    accountHolder: 'Naledi Mokoena',
    accountNumber: '1234567890',
    branchCode: '250655',
    selectedProducts: [],
    paymentInfo: null,
    creditReportViewedAt: '2026-11-16T10:00:00.000Z',
    createdAt: '2026-11-16T08:00:00.000Z',
    updatedAt: '2026-11-16T10:00:00.000Z',
};

const activeProduct = {
    id: 'product-1',
    code: 'DRR-SINGLE',
    name: 'Debt Review Removal - Single Application',
    category: 'debt_review',
    status: 'active',
    requires_mandate: true,
    requires_credit_pull: false,
    pricing_options: { oneOff: 1500 },
    description: 'Debt review removal service',
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z',
};

let ClientDetails: ComponentType;
let container: HTMLDivElement;
let root: Root;
let persistedClient = { ...client };

const changeValue = async (
    control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
    value: string
) => {
    await act(async () => {
        const setter = Object.getOwnPropertyDescriptor(
            Object.getPrototypeOf(control),
            'value'
        )?.set;
        setter?.call(control, value);
        control.dispatchEvent(new Event('change', { bubbles: true }));
    });
};

const clickButton = async (label: string) => {
    const button = Array.from(document.body.querySelectorAll<HTMLButtonElement>('button')).find(
        (candidate) => candidate.textContent?.includes(label)
    );
    if (!button) throw new Error(`Button not found: ${label}`);
    await act(async () => button.click());
};

const openProductJourney = async (productName: string) => {
    await clickButton('Add product');
    await vi.waitFor(() =>
        expect(document.body.querySelector('.client-product-journey')).not.toBeNull()
    );
    const productOption = Array.from(
        document.body.querySelectorAll<HTMLButtonElement>('.client-product-option')
    ).find((option) => option.textContent?.includes(productName));
    if (!productOption) throw new Error(`Product option not found: ${productName}`);
    await act(async () => productOption.click());
};

const selectMandateSchedule = async (month = 'first', day = '25') => {
    const firstPaymentMonth = document.body.querySelector<HTMLSelectElement>(
        'select[aria-label="First payment month"]'
    );
    const collectionDay = document.body.querySelector<HTMLSelectElement>(
        'select[aria-label="Monthly collection day"]'
    );
    if (!firstPaymentMonth || !collectionDay) throw new Error('Mandate schedule not rendered');
    await changeValue(firstPaymentMonth, month);
    await changeValue(collectionDay, day);
};

beforeAll(async () => {
    Reflect.set(window, 'IS_REACT_ACT_ENVIRONMENT', true);
    Object.defineProperty(window.URL, 'createObjectURL', {
        configurable: true,
        value: vi.fn(),
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
        configurable: true,
        value: vi.fn(),
    });
    ClientDetails = (await import('../ClientDetails')).default;
});

beforeEach(() => {
    persistedClient = { ...client };
    getClientByIdMock.mockReset().mockImplementation(async () => persistedClient);
    updateClientMock.mockReset().mockImplementation(async (_clientId, updates) => {
        persistedClient = { ...persistedClient, ...updates };
        return persistedClient;
    });
    downloadCreditReportMock.mockReset().mockResolvedValue(new Blob(['%PDF-1.4']));
    vi.mocked(window.URL.createObjectURL).mockReturnValue('blob:credit-report');
    vi.mocked(window.URL.revokeObjectURL).mockImplementation(() => undefined);
    listProductsMock.mockReset().mockResolvedValue({
        products: [activeProduct],
        total: 1,
        page: 1,
        limit: 100,
        totalPages: 1,
    });
    listTasksMock.mockReset().mockResolvedValue({
        tasks: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
    });
    createTaskMock.mockReset().mockResolvedValue({
        id: 'task-1',
        title: 'Call client about documents',
        status: 'pending',
        type: 'follow_up',
        priority: 'normal',
        dueDate: '2026-11-19T12:00:00.000Z',
        createdAt: '2026-11-16T12:00:00.000Z',
        updatedAt: '2026-11-16T12:00:00.000Z',
    });
    attemptNuPayMandateMock.mockReset().mockResolvedValue({
        mandateStatus: 'pending_auth',
        mandateId: 'MANDATE-1',
        mandateReference: 'CONTRACT-1',
        mandateRequestTranId: 'REQUEST-1',
        mandateAttemptedAt: '2026-11-17T09:00:00.000Z',
        mandateCollectionDay: '25',
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
});

describe('ClientDetails module', () => {
    it('renders the compact client profile with live client data', async () => {
        await act(async () => {
            root.render(
                <MemoryRouter initialEntries={[`/clients/${client.id}`]}>
                    <Routes>
                        <Route path="/clients/:id" element={<ClientDetails />} />
                    </Routes>
                </MemoryRouter>
            );
        });

        await vi.waitFor(() => expect(container.textContent).toContain('Naledi Mokoena'));
        expect(container.textContent).toContain('QFN000022');
        expect(container.textContent).not.toContain('9001015009087');
        expect(container.querySelector('.client-profile-header')).not.toBeNull();
        expect(container.querySelector('.client-primary-tabs')).not.toBeNull();
        expect(container.querySelectorAll('.client-profile-stats > .client-profile-stat')).toHaveLength(
            5
        );
        expect(container.querySelector('aside.client-right-rail')).not.toBeNull();
        expect(container.querySelector('.client-task-panel')).not.toBeNull();
        expect(container.querySelector('.client-notes-panel')).not.toBeNull();
    });

    it('links an added product to an explicit payment option', async () => {
        await act(async () => {
            root.render(
                <MemoryRouter initialEntries={[`/clients/${client.id}`]}>
                    <Routes>
                        <Route path="/clients/:id" element={<ClientDetails />} />
                    </Routes>
                </MemoryRouter>
            );
        });
        await vi.waitFor(() => expect(container.textContent).toContain('Add product'));

        await openProductJourney('Debt Review Removal - Single Application');
        await clickButton('Continue');
        await clickButton('Continue');
        const paymentOption = document.body.querySelector<HTMLButtonElement>(
            '.client-payment-option'
        );
        await act(async () => paymentOption?.click());
        await selectMandateSchedule('first', '25');
        await clickButton('Continue');
        const mandateConfirmation = document.body.querySelector<HTMLInputElement>(
            '#confirm-product-mandate'
        );
        await act(async () => mandateConfirmation?.click());
        await clickButton('Confirm and link product');

        await vi.waitFor(() => expect(updateClientMock).toHaveBeenCalledTimes(2));
        expect(updateClientMock).toHaveBeenNthCalledWith(
            1,
            client.id,
            expect.objectContaining({
                selectedProducts: [
                    expect.objectContaining({
                        productId: 'product-1',
                        paymentOptionId: 'product-1_once_off',
                        mandateStatus: 'pending',
                        mandateCollectionDay: '25',
                    }),
                ],
                paymentInfo: {
                    firstPaymentMonth: 'first',
                    selectedPaymentOptions: {
                        'product-1': 'product-1_once_off',
                    },
                },
                debiCheckConsentGiven: true,
            })
        );
        expect(attemptNuPayMandateMock).toHaveBeenCalledTimes(1);
        await vi.waitFor(() =>
            expect(container.textContent).toContain('awaiting customer authorisation')
        );
        await vi.waitFor(() => expect(container.textContent).toContain('All products linked'));
        expect(persistedClient.selectedProducts).toEqual([
            expect.objectContaining({
                productId: 'product-1',
                paymentOptionId: 'product-1_once_off',
            }),
        ]);
    });

    it('does not send DebiCheck consent when the selected product has no mandate', async () => {
        listProductsMock.mockResolvedValue({
            products: [{ ...activeProduct, requires_mandate: false }],
            total: 1,
            page: 1,
            limit: 100,
            totalPages: 1,
        });
        await act(async () => {
            root.render(
                <MemoryRouter initialEntries={[`/clients/${client.id}`]}>
                    <Routes>
                        <Route path="/clients/:id" element={<ClientDetails />} />
                    </Routes>
                </MemoryRouter>
            );
        });
        await vi.waitFor(() => expect(container.textContent).toContain('Add product'));

        await openProductJourney('Debt Review Removal - Single Application');
        await clickButton('Continue');
        await clickButton('Continue');
        const paymentOption = document.body.querySelector<HTMLButtonElement>(
            '.client-payment-option'
        );
        await act(async () => paymentOption?.click());
        await clickButton('Continue');
        await clickButton('Confirm and link product');

        await vi.waitFor(() => expect(updateClientMock).toHaveBeenCalledTimes(1));
        const updatePayload = updateClientMock.mock.calls[0]?.[1];
        expect(updatePayload).not.toHaveProperty('debiCheckConsentGiven');
        expect(attemptNuPayMandateMock).not.toHaveBeenCalled();
    });

    it('warns but allows product linking while Experian UAT is unavailable', async () => {
        persistedClient = { ...client, creditReportViewedAt: null };
        attemptNuPayMandateMock.mockResolvedValueOnce({
            mandateStatus: 'pending',
            mandateError: 'NuPay unavailable',
            mandateAttemptedAt: '2026-11-17T09:00:00.000Z',
            mandateCollectionDay: '25',
        });
        await act(async () => {
            root.render(
                <MemoryRouter initialEntries={[`/clients/${client.id}`]}>
                    <Routes>
                        <Route path="/clients/:id" element={<ClientDetails />} />
                    </Routes>
                </MemoryRouter>
            );
        });
        await vi.waitFor(() => expect(container.textContent).toContain('Add product'));

        await openProductJourney('Debt Review Removal - Single Application');
        await clickButton('Continue');
        await clickButton('Continue');
        const paymentOption = document.body.querySelector<HTMLButtonElement>(
            '.client-payment-option'
        );
        await act(async () => paymentOption?.click());
        await selectMandateSchedule('first', '25');
        await clickButton('Continue');

        expect(document.body.textContent).toContain('Temporary credit-report exception');
        const mandateConfirmation = document.body.querySelector<HTMLInputElement>(
            '#confirm-product-mandate'
        );
        await act(async () => mandateConfirmation?.click());
        const confirmButton = Array.from(
            document.body.querySelectorAll<HTMLButtonElement>('button')
        ).find((button) => button.textContent?.includes('Confirm and link product'));
        expect(confirmButton?.disabled).toBe(false);
        await act(async () => confirmButton?.click());

        await vi.waitFor(() => expect(updateClientMock).toHaveBeenCalledTimes(2));
        await vi.waitFor(() =>
            expect(container.textContent).toContain('mandate is pending and can be retried later')
        );
        expect(persistedClient.selectedProducts?.[0]).toEqual(
            expect.objectContaining({ mandateStatus: 'pending', mandateError: 'NuPay unavailable' })
        );
    });

    it('creates the task entered by the user instead of a hard-coded placeholder', async () => {
        await act(async () => {
            root.render(
                <MemoryRouter initialEntries={[`/clients/${client.id}`]}>
                    <Routes>
                        <Route path="/clients/:id" element={<ClientDetails />} />
                    </Routes>
                </MemoryRouter>
            );
        });
        await vi.waitFor(() => expect(container.textContent).toContain('To-do List'));

        const taskTitle = container.querySelector<HTMLInputElement>(
            'input[aria-label="Task title"]'
        );
        if (!taskTitle) throw new Error('Task title input not rendered');
        await changeValue(taskTitle, 'Call client about documents');
        const addButton = taskTitle.parentElement?.querySelector<HTMLButtonElement>('button');
        await act(async () => addButton?.click());

        await vi.waitFor(() => expect(createTaskMock).toHaveBeenCalledTimes(1));
        expect(createTaskMock).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Call client about documents',
                type: 'follow_up',
                clientId: client.id,
            })
        );
        expect(container.textContent).toContain('Call client about documents');
    });

    it('requires three account names when linking the CAR product', async () => {
        listProductsMock.mockResolvedValue({
            products: [
                {
                    ...activeProduct,
                    code: 'CAR',
                    name: 'Credit Assessment and Report',
                },
            ],
            total: 1,
            page: 1,
            limit: 100,
            totalPages: 1,
        });
        await act(async () => {
            root.render(
                <MemoryRouter initialEntries={[`/clients/${client.id}`]}>
                    <Routes>
                        <Route path="/clients/:id" element={<ClientDetails />} />
                    </Routes>
                </MemoryRouter>
            );
        });
        await vi.waitFor(() => expect(container.textContent).toContain('Credit Assessment'));

        await openProductJourney('Credit Assessment and Report');
        await clickButton('Continue');

        const accounts = Array.from(
            document.body.querySelectorAll<HTMLInputElement>(
                'input[aria-label^="Current account"]'
            )
        );
        expect(accounts).toHaveLength(3);
        await changeValue(accounts[0], 'Vehicle finance');
        await changeValue(accounts[1], 'Home loan');
        await changeValue(accounts[2], 'Retail account');
        await clickButton('Continue');
        const paymentOption = document.body.querySelector<HTMLButtonElement>(
            '.client-payment-option'
        );
        await act(async () => paymentOption?.click());
        await selectMandateSchedule('second', '25');
        await clickButton('Continue');
        const mandateConfirmation = document.body.querySelector<HTMLInputElement>(
            '#confirm-product-mandate'
        );
        await act(async () => mandateConfirmation?.click());
        await clickButton('Confirm and link product');

        await vi.waitFor(() => expect(updateClientMock).toHaveBeenCalledTimes(2));
        expect(updateClientMock).toHaveBeenNthCalledWith(
            1,
            client.id,
            expect.objectContaining({
                selectedProducts: [
                    expect.objectContaining({
                        productId: 'product-1',
                        paymentOptionId: 'product-1_once_off',
                        cirAccounts: ['Vehicle finance', 'Home loan', 'Retail account'],
                    }),
                ],
            })
        );
    });

    it('requires consent and submits one Experian enquiry with the selected purpose', async () => {
        await act(async () => {
            root.render(
                <MemoryRouter initialEntries={[`/clients/${client.id}`]}>
                    <Routes>
                        <Route path="/clients/:id" element={<ClientDetails />} />
                    </Routes>
                </MemoryRouter>
            );
        });
        await vi.waitFor(() => expect(container.textContent).toContain('Credit Reports'));

        const reportsTab = Array.from(container.querySelectorAll<HTMLElement>('[role="tab"]')).find(
            (tab) => tab.textContent?.includes('Credit Reports')
        );
        await act(async () => reportsTab?.click());
        await vi.waitFor(() =>
            expect(container.textContent).toContain('Request the client’s original report')
        );

        const requestButton = Array.from(
            container.querySelectorAll<HTMLButtonElement>('button')
        ).find((button) => button.textContent?.includes('Request and view report'));
        expect(requestButton?.disabled).toBe(false);

        await act(async () => requestButton?.click());
        expect(downloadCreditReportMock).not.toHaveBeenCalled();
        expect(container.textContent).toContain(
            'Confirm the client’s explicit consent before requesting the report.'
        );

        const consent = container.querySelector<HTMLInputElement>(`#credit-consent-${client.id}`);
        await act(async () => consent?.click());
        await act(async () => requestButton?.click());
        await vi.waitFor(() => expect(downloadCreditReportMock).toHaveBeenCalledTimes(1));
        expect(downloadCreditReportMock).toHaveBeenCalledWith(client.id, {
            consentGiven: true,
            consentMethod: 'electronic',
            enquiryPurpose: 13,
            purpose: 'Debt review assessment',
        });
    });

    it('blocks the Experian enquiry and explains an incomplete client address', async () => {
        getClientByIdMock.mockResolvedValue({
            ...client,
            physicalAddress: '627 fish street',
            postalAddress: '627 fish street',
        });

        await act(async () => {
            root.render(
                <MemoryRouter initialEntries={[`/clients/${client.id}`]}>
                    <Routes>
                        <Route path="/clients/:id" element={<ClientDetails />} />
                    </Routes>
                </MemoryRouter>
            );
        });
        await vi.waitFor(() => expect(container.textContent).toContain('Credit Reports'));

        const reportsTab = Array.from(container.querySelectorAll<HTMLElement>('[role="tab"]')).find(
            (tab) => tab.textContent?.includes('Credit Reports')
        );
        await act(async () => reportsTab?.click());
        await vi.waitFor(() => expect(container.textContent).toContain('Client record incomplete.'));

        const consent = container.querySelector<HTMLInputElement>(`#credit-consent-${client.id}`);
        await act(async () => consent?.click());
        const requestButton = Array.from(
            container.querySelectorAll<HTMLButtonElement>('button')
        ).find((button) => button.textContent?.includes('Request and view report'));
        await act(async () => requestButton?.click());

        expect(downloadCreditReportMock).not.toHaveBeenCalled();
        expect(container.textContent).toContain('add a 4 or 5 digit postal code');
        expect(container.textContent).toContain('separate the street and suburb with a comma');
    });
});
