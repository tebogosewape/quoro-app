// @vitest-environment jsdom

import { act, type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { listProductsMock, updateProductMock, permissionState, authState } = vi.hoisted(() => ({
    listProductsMock: vi.fn(),
    updateProductMock: vi.fn(),
    permissionState: { allowed: true },
    authState: { role: 'admin' },
}));

vi.mock('@/api/products', () => ({
    listProducts: listProductsMock,
    updateProduct: updateProductMock,
}));
vi.mock('@/utils/permissions', () => ({
    hasPermission: () => permissionState.allowed,
}));
vi.mock('@/stores/auth.store', () => ({
    useAuthStore: (selector: (state: unknown) => unknown) =>
        selector({ session: { user: { id: 'admin-1', role: authState.role } } }),
}));

const products = [
    {
        id: 'product-fixed',
        code: 'FIXED-0',
        name: 'Zero fixed commission',
        category: 'value_added',
        status: 'active',
        requires_mandate: false,
        requires_credit_pull: false,
        agent_commission_rules: { firstPayment: 0 },
        createdAt: '2026-11-17T08:00:00.000Z',
        updatedAt: '2026-11-17T08:00:00.000Z',
    },
    {
        id: 'product-percent',
        code: 'PERCENT-5',
        name: 'Percentage commission',
        category: 'debt_review',
        status: 'active',
        requires_mandate: true,
        requires_credit_pull: true,
        agent_commission_rules: { percentage: 5, applicableOn: 'all_instalments' },
        createdAt: '2026-11-17T08:00:00.000Z',
        updatedAt: '2026-11-17T08:00:00.000Z',
    },
    {
        id: 'product-none',
        code: 'NONE-1',
        name: 'Unconfigured product',
        category: 'legal_support',
        status: 'active',
        requires_mandate: false,
        requires_credit_pull: false,
        createdAt: '2026-11-17T08:00:00.000Z',
        updatedAt: '2026-11-17T08:00:00.000Z',
    },
];
const response = { products, total: 3, page: 1, limit: 100, totalPages: 1 };

let Screen: ComponentType;
let container: HTMLDivElement;
let root: Root;
const findButton = (text: string, scope: ParentNode = document) =>
    Array.from(scope.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
        button.textContent?.includes(text)
    );
const click = async (element?: Element | null) => {
    await act(async () => element?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
};
const change = async (element: HTMLInputElement, value: string) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(element, value);
    await act(async () => element.dispatchEvent(new Event('change', { bubbles: true })));
};
const renderScreen = async () => {
    await act(async () => root.render(<Screen />));
    await act(async () => Promise.resolve());
};

beforeAll(async () => {
    Reflect.set(window, 'IS_REACT_ACT_ENVIRONMENT', true);
    Screen = (await import('../CommissionSettings')).default;
});
beforeEach(() => {
    permissionState.allowed = true;
    authState.role = 'admin';
    listProductsMock.mockReset().mockResolvedValue(response);
    updateProductMock.mockReset().mockResolvedValue(products[0]);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
});
afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    document.querySelectorAll('.modal-backdrop').forEach((node) => node.remove());
    vi.restoreAllMocks();
});

describe('CommissionSettings', () => {
    it('loads active products and preserves zero-value commission rules', async () => {
        await renderScreen();
        await vi.waitFor(() => expect(listProductsMock).toHaveBeenCalled());
        expect(container.textContent).toContain('Commission settings');
        expect(container.textContent).toContain('R 0,00');
        expect(container.textContent).toContain('5%');
        expect(container.textContent).toContain('Not configured');
        expect(container.textContent).toContain('Showing 3 of 3 active products');
        expect(listProductsMock).toHaveBeenCalledWith({ limit: 100, status: 'active' });
    });

    it('opens a compact editor with the current fixed amount', async () => {
        await renderScreen();
        await vi.waitFor(() => expect(listProductsMock).toHaveBeenCalled());
        await click(findButton('Edit rule', container));
        expect(document.body.textContent).toContain('Edit commission');
        expect(document.querySelector<HTMLInputElement>('input[type="number"]')?.value).toBe('0');
        expect(document.querySelector('.commission-form__preview')?.textContent).toContain(
            'R 0 on first payment'
        );
    });

    it('rejects percentages above 100 without calling the API', async () => {
        await renderScreen();
        await vi.waitFor(() => expect(listProductsMock).toHaveBeenCalled());
        await click(findButton('Edit rule', container));
        const radios = document.querySelectorAll<HTMLInputElement>('input[type="radio"]');
        await click(radios[1]);
        const percentage = document.querySelector<HTMLInputElement>('input[type="number"]');
        if (!percentage) throw new Error('Percentage input did not render');
        await change(percentage, '101');
        await click(findButton('Save commission'));
        expect(document.body.textContent).toContain('Enter a percentage between 0 and 100.');
        expect(updateProductMock).not.toHaveBeenCalled();
    });

    it('shows a read-only catalogue when the API write role is absent', async () => {
        authState.role = 'chief_executive_officer';
        await renderScreen();
        await vi.waitFor(() => expect(listProductsMock).toHaveBeenCalled());
        expect(container.textContent).toContain('Read only');
        expect(container.textContent).not.toContain('Edit rule');
    });

    it('renders a professional permission state without loading products', async () => {
        permissionState.allowed = false;
        await renderScreen();
        expect(container.textContent).toContain('Permission required');
        expect(container.textContent).toContain('reports.commission.view');
        expect(listProductsMock).not.toHaveBeenCalled();
    });

    it('keeps the settings shell visible when loading fails', async () => {
        listProductsMock.mockRejectedValue(new Error('Commission API unavailable'));
        await renderScreen();
        await vi.waitFor(() => expect(listProductsMock).toHaveBeenCalled());
        expect(container.textContent).toContain('Commission settings');
        expect(container.textContent).toContain('Commission settings could not be loaded.');
        expect(container.textContent).toContain('Commission API unavailable');
    });
});
