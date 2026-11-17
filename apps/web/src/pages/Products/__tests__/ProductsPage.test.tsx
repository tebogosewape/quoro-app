// @vitest-environment jsdom

import { act, type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const {
    listProductsMock,
    createProductMock,
    updateProductMock,
    deleteProductMock,
    setProductStatusMock,
} = vi.hoisted(() => ({
    listProductsMock: vi.fn(),
    createProductMock: vi.fn(),
    updateProductMock: vi.fn(),
    deleteProductMock: vi.fn(),
    setProductStatusMock: vi.fn(),
}));

vi.mock('@/api/products', () => ({
    listProducts: listProductsMock,
    createProduct: createProductMock,
    updateProduct: updateProductMock,
    deleteProduct: deleteProductMock,
    setProductStatus: setProductStatusMock,
}));

vi.mock('@/stores/auth.store', () => ({
    useAuthStore: (selector: (state: unknown) => unknown) =>
        selector({ session: { user: { role: 'admin' } } }),
}));

const products = [
    {
        id: 'product-2',
        code: 'LEGAL-01',
        name: 'Legal support',
        category: 'legal_support',
        status: 'inactive',
        requires_mandate: true,
        requires_credit_pull: false,
        description: 'Legal administration support',
        createdAt: '2026-11-17T09:00:00.000Z',
        updatedAt: '2026-11-17T09:00:00.000Z',
    },
    {
        id: 'product-1',
        code: 'DEBT-01',
        name: 'Debt review',
        category: 'debt_review',
        status: 'active',
        requires_mandate: true,
        requires_credit_pull: true,
        description: 'Debt review onboarding',
        createdAt: '2026-11-16T09:00:00.000Z',
        updatedAt: '2026-11-16T09:00:00.000Z',
    },
];

const response = { products, total: 2, page: 1, limit: 10, totalPages: 1 };
let Screen: ComponentType;
let container: HTMLDivElement;
let root: Root;

const renderScreen = async () => {
    await act(async () => root.render(<Screen />));
    await vi.waitFor(() => expect(listProductsMock).toHaveBeenCalled());
    await act(async () => Promise.resolve());
};
const findButton = (text: string, scope: ParentNode = document) =>
    Array.from(scope.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
        button.textContent?.includes(text)
    );
const click = async (element?: Element | null) => {
    await act(async () => element?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
};
const change = async (
    element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
    value: string
) => {
    let prototype: object = HTMLInputElement.prototype;
    if (element instanceof HTMLSelectElement) prototype = HTMLSelectElement.prototype;
    if (element instanceof HTMLTextAreaElement) prototype = HTMLTextAreaElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    setter?.call(element, value);
    await act(async () => element.dispatchEvent(new Event('change', { bubbles: true })));
};

beforeAll(async () => {
    Reflect.set(window, 'IS_REACT_ACT_ENVIRONMENT', true);
    Screen = (await import('../ProductsPage')).default;
});
beforeEach(() => {
    listProductsMock.mockReset().mockResolvedValue(response);
    createProductMock.mockReset().mockResolvedValue(products[0]);
    updateProductMock.mockReset().mockResolvedValue(products[0]);
    deleteProductMock.mockReset().mockResolvedValue(undefined);
    setProductStatusMock.mockReset().mockResolvedValue(products[0]);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
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

describe('ProductsPage', () => {
    it('loads a compact product catalogue with real requirements and status', async () => {
        await renderScreen();
        expect(container.textContent).toContain('Product catalogue');
        expect(container.textContent).toContain('Debt review');
        expect(container.textContent).toContain('Credit report');
        expect(container.textContent).toContain('Showing 1-2 of 2');
        expect(listProductsMock).toHaveBeenCalledWith({
            page: 1,
            limit: 10,
            search: undefined,
            category: undefined,
            status: undefined,
        });
    });

    it('opens the compact add-product form and validates JSON without crashing', async () => {
        await renderScreen();
        await click(findButton('Add product', container));
        expect(document.body.textContent).toContain(
            'Create a product and define its requirements.'
        );
        expect(document.querySelector('.product-form__grid')).not.toBeNull();
        const code = document.querySelector<HTMLInputElement>('#product-code');
        const name = document.querySelector<HTMLInputElement>('#product-name');
        const json = document.querySelector<HTMLTextAreaElement>('.product-form__json');
        if (!code || !name || !json) throw new Error('Product form did not render');
        await change(code, 'TEST-01');
        await change(name, 'Test product');
        await change(json, '{');
        await click(findButton('Create product'));
        expect(document.body.textContent).toContain('Enter valid JSON or leave this field empty.');
        expect(createProductMock).not.toHaveBeenCalled();
    });

    it('sends category filtering through the product API', async () => {
        await renderScreen();
        const select =
            container.querySelector<HTMLSelectElement>('select[aria-label="Filter by category"]') ??
            Array.from(container.querySelectorAll<HTMLSelectElement>('select')).find((item) =>
                item.textContent?.includes('All categories')
            );
        if (!select) throw new Error('Category filter did not render');
        await change(select, 'debt_review');
        await vi.waitFor(() =>
            expect(listProductsMock).toHaveBeenLastCalledWith({
                page: 1,
                limit: 10,
                search: undefined,
                category: 'debt_review',
                status: undefined,
            })
        );
    });

    it('does not delete a product when confirmation is cancelled', async () => {
        await renderScreen();
        await click(findButton('Delete', container));
        expect(window.confirm).toHaveBeenCalled();
        expect(deleteProductMock).not.toHaveBeenCalled();
    });

    it('keeps the administration shell visible when loading fails', async () => {
        listProductsMock.mockRejectedValue(new Error('Product API unavailable'));
        await renderScreen();
        expect(container.textContent).toContain('Product catalogue');
        expect(container.textContent).toContain('Products could not be loaded or updated.');
        expect(container.textContent).toContain('Product API unavailable');
    });
});
