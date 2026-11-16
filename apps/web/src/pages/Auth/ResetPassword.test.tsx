// @vitest-environment jsdom

import { act, type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { navigateMock, requestMock } = vi.hoisted(() => ({
    navigateMock: vi.fn(),
    requestMock: vi.fn(),
}));

vi.mock('../../api/http-proxy.service', () => ({
    HttpProxy: vi.fn().mockImplementation(() => ({ request: requestMock })),
}));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
    return { ...actual, useNavigate: () => navigateMock };
});

let ResetPassword: ComponentType;
let container: HTMLDivElement;
let root: Root;

const setInputValue = (input: HTMLInputElement, value: string) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
};

const renderResetPassword = async (entry: string) => {
    await act(async () => {
        root.render(
            <MemoryRouter initialEntries={[entry]}>
                <ResetPassword />
            </MemoryRouter>
        );
    });
};

const submitPasswords = async () => {
    const password = container.querySelector<HTMLInputElement>('#new-password');
    const confirmation = container.querySelector<HTMLInputElement>('#confirm-password');
    const form = container.querySelector<HTMLFormElement>('form');

    expect(password).not.toBeNull();
    expect(confirmation).not.toBeNull();
    expect(form).not.toBeNull();

    await act(async () => {
        setInputValue(password!, 'Strongpass1');
        setInputValue(confirmation!, 'Strongpass1');
        form?.requestSubmit();
    });
};

beforeAll(async () => {
    Reflect.set(window, 'IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubEnv('VITE_API_URL', 'http://localhost:2200/api');
    ResetPassword = (await import('./ResetPassword')).default;
});

beforeEach(() => {
    requestMock.mockReset();
    navigateMock.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
});

describe('ResetPassword', () => {
    it('shows a safe recovery state when the token or email is missing', async () => {
        await renderResetPassword('/reset-password');

        expect(container.querySelector('[role="alert"]')?.textContent).toContain(
            'Invalid or missing reset link'
        );
        expect(container.querySelector('a[href="/forgot-password"]')?.textContent).toContain(
            'Request new link'
        );
        expect(container.querySelector('a[href="/login"]')?.textContent).toContain(
            'Back to sign in'
        );
    });

    it('renders password-manager fields with independent visibility controls', async () => {
        await renderResetPassword('/reset-password?token=test-token&email=test%40example.com');

        const password = container.querySelector<HTMLInputElement>('#new-password');
        const confirmation = container.querySelector<HTMLInputElement>('#confirm-password');
        const toggles = container.querySelectorAll<HTMLButtonElement>('.password-toggle');

        expect(password?.autocomplete).toBe('new-password');
        expect(confirmation?.autocomplete).toBe('new-password');
        expect(password?.type).toBe('password');
        expect(confirmation?.type).toBe('password');

        await act(async () => toggles[0]?.click());
        expect(password?.type).toBe('text');
        expect(confirmation?.type).toBe('password');

        await act(async () => toggles[1]?.click());
        expect(confirmation?.type).toBe('text');
    });

    it('preserves the reset payload and presents the success state', async () => {
        requestMock.mockResolvedValue({ statusCode: 200, data: { success: true } });
        await renderResetPassword('/reset-password?token=test-token&email=test%40example.com');

        await submitPasswords();
        await vi.waitFor(() =>
            expect(container.querySelector('[role="status"]')?.textContent).toContain(
                'Your password has been updated'
            )
        );

        expect(requestMock).toHaveBeenCalledWith(
            'AUTH',
            'http://localhost:2200/api/auth/reset-password',
            'POST',
            { token: 'test-token', email: 'test@example.com', password: 'Strongpass1' }
        );
    });

    it('announces reset-provider errors without losing the form', async () => {
        requestMock.mockResolvedValue({ statusCode: 400, errorMessage: 'Reset link expired' });
        await renderResetPassword('/reset-password?token=test-token&email=test%40example.com');

        await submitPasswords();
        await vi.waitFor(() =>
            expect(container.querySelector('[role="alert"]')?.textContent).toContain(
                'Reset link expired'
            )
        );
        expect(container.querySelector('form')).not.toBeNull();
    });

    it('disables the compact submit action while the reset request is pending', async () => {
        requestMock.mockReturnValue(new Promise(() => undefined));
        await renderResetPassword('/reset-password?token=test-token&email=test%40example.com');

        await submitPasswords();
        await vi.waitFor(() => expect(requestMock).toHaveBeenCalledOnce());

        const submit = container.querySelector<HTMLButtonElement>('button[type="submit"]');
        expect(submit?.disabled).toBe(true);
        expect(submit?.getAttribute('aria-busy')).toBe('true');
        expect(submit?.textContent).toContain('Updating');
    });
});
