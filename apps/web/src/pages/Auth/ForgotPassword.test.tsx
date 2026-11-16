// @vitest-environment jsdom

import { act, type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }));

vi.mock('../../api/http-proxy.service', () => ({
    HttpProxy: vi.fn().mockImplementation(() => ({ request: requestMock })),
}));

let ForgotPassword: ComponentType;
let container: HTMLDivElement;
let root: Root;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

const setInputValue = (input: HTMLInputElement, value: string) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
};

const submitEmail = async (email = ' client@example.com ') => {
    const input = container.querySelector<HTMLInputElement>('#reset-email');
    const form = container.querySelector<HTMLFormElement>('form');

    expect(input).not.toBeNull();
    expect(form).not.toBeNull();

    await act(async () => {
        setInputValue(input!, email);
        form?.requestSubmit();
    });
};

beforeAll(async () => {
    Reflect.set(window, 'IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubEnv('VITE_API_URL', 'http://localhost:2200/api');
    ForgotPassword = (await import('./ForgotPassword')).default;
});

beforeEach(async () => {
    requestMock.mockReset();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
        root.render(
            <MemoryRouter initialEntries={['/forgot-password']}>
                <ForgotPassword />
            </MemoryRouter>
        );
    });
});

afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    consoleErrorSpy.mockRestore();
});

describe('ForgotPassword', () => {
    it('renders a labelled password-manager-friendly email field and login link', () => {
        const email = container.querySelector<HTMLInputElement>('#reset-email');
        const label = container.querySelector<HTMLLabelElement>('label[for="reset-email"]');
        const loginLink = container.querySelector<HTMLAnchorElement>('a[href="/login"]');

        expect(label?.textContent).toBe('Email address');
        expect(email?.autocomplete).toBe('email');
        expect(email?.inputMode).toBe('email');
        expect(loginLink?.textContent).toContain('Back to login');
    });

    it('trims the email and shows the generic success response', async () => {
        requestMock.mockResolvedValue({ statusCode: 202, data: { success: true } });

        await submitEmail();
        await vi.waitFor(() =>
            expect(container.querySelector('[role="status"]')?.textContent).toContain(
                'If an account exists'
            )
        );

        expect(requestMock).toHaveBeenCalledWith(
            'AUTH',
            'http://localhost:2200/api/auth/forgot-password',
            'POST',
            { email: 'client@example.com' }
        );
    });

    it('keeps provider failures private by showing the same generic response', async () => {
        requestMock.mockRejectedValue(new Error('Provider unavailable'));

        await submitEmail('client@example.com');
        await vi.waitFor(() =>
            expect(container.querySelector('[role="status"]')?.textContent).toContain(
                'If an account exists'
            )
        );

        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('shows a compact disabled loading action while the request is pending', async () => {
        requestMock.mockReturnValue(new Promise(() => undefined));

        await submitEmail('client@example.com');
        await vi.waitFor(() => expect(requestMock).toHaveBeenCalledOnce());

        const submit = container.querySelector<HTMLButtonElement>('button[type="submit"]');
        expect(submit?.disabled).toBe(true);
        expect(submit?.getAttribute('aria-busy')).toBe('true');
        expect(submit?.textContent).toContain('Sending');
    });
});
