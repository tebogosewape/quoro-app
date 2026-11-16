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
} = vi.hoisted(() => ({
    getClientByIdMock: vi.fn(),
    updateClientMock: vi.fn(),
    downloadCreditReportMock: vi.fn(),
    listProductsMock: vi.fn(),
    listTasksMock: vi.fn(),
    createTaskMock: vi.fn(),
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
    selectedProducts: [],
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
    getClientByIdMock.mockReset().mockResolvedValue(client);
    updateClientMock.mockReset().mockResolvedValue(client);
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
        await vi.waitFor(() =>
            expect(container.textContent).toContain('Debt Review Removal - Single Application')
        );

        const productSelect = container.querySelector<HTMLSelectElement>(
            'select[aria-label="Product to add"]'
        );
        const paymentSelect = container.querySelector<HTMLSelectElement>(
            'select[aria-label="Payment option"]'
        );
        if (!productSelect || !paymentSelect) throw new Error('Product controls not rendered');
        await changeValue(productSelect, 'product-1');
        await changeValue(paymentSelect, 'product-1_once_off');

        const addButton = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
            (button) => button.textContent?.includes('Add product')
        );
        await act(async () => addButton?.click());

        await vi.waitFor(() => expect(updateClientMock).toHaveBeenCalledTimes(1));
        expect(updateClientMock).toHaveBeenCalledWith(client.id, {
            selectedProducts: [
                {
                    productId: 'product-1',
                    paymentOptionId: 'product-1_once_off',
                    cirAccounts: undefined,
                },
            ],
        });
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

        const productSelect = container.querySelector<HTMLSelectElement>(
            'select[aria-label="Product to add"]'
        );
        const paymentSelect = container.querySelector<HTMLSelectElement>(
            'select[aria-label="Payment option"]'
        );
        if (!productSelect || !paymentSelect) throw new Error('Product controls not rendered');
        await changeValue(productSelect, 'product-1');
        await changeValue(paymentSelect, 'product-1_once_off');

        const accounts = Array.from(
            container.querySelectorAll<HTMLInputElement>('input[aria-label^="Current account"]')
        );
        expect(accounts).toHaveLength(3);
        await changeValue(accounts[0], 'Vehicle finance');
        await changeValue(accounts[1], 'Home loan');
        await changeValue(accounts[2], 'Retail account');
        const addButton = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
            (button) => button.textContent?.includes('Add product')
        );
        await act(async () => addButton?.click());

        await vi.waitFor(() => expect(updateClientMock).toHaveBeenCalledTimes(1));
        expect(updateClientMock).toHaveBeenCalledWith(client.id, {
            selectedProducts: [
                expect.objectContaining({
                    productId: 'product-1',
                    paymentOptionId: 'product-1_once_off',
                    cirAccounts: ['Vehicle finance', 'Home loan', 'Retail account'],
                }),
            ],
        });
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
