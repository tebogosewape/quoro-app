// @vitest-environment jsdom

import { act, type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { requestMock, setSessionMock } = vi.hoisted(() => ({
    requestMock: vi.fn(),
    setSessionMock: vi.fn(),
}));

vi.mock('../../api/http-proxy.service', () => ({
    HttpProxy: vi.fn().mockImplementation(() => ({ request: requestMock })),
}));

vi.mock('../../stores/auth.store', () => ({
    useAuthStore: (
        selector: (state: {
            session: null;
            hydrated: boolean;
            setSession: typeof setSessionMock;
        }) => unknown
    ) => selector({ session: null, hydrated: true, setSession: setSessionMock }),
}));

let Login: ComponentType;
let container: HTMLDivElement;
let root: Root;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

const setInputValue = (input: HTMLInputElement, value: string) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
};

const submitCredentials = async () => {
    const identifier = container.querySelector<HTMLInputElement>('#login-identifier');
    const password = container.querySelector<HTMLInputElement>('#login-password');
    const form = container.querySelector<HTMLFormElement>('form');

    expect(identifier).not.toBeNull();
    expect(password).not.toBeNull();
    expect(form).not.toBeNull();

    await act(async () => {
        setInputValue(identifier!, 'agent@example.com');
        setInputValue(password!, 'secret12');
        form?.requestSubmit();
    });
};

beforeAll(async () => {
    Reflect.set(window, 'IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubEnv('VITE_API_URL', 'http://localhost:2200/api');
    Login = (await import('./Login')).default;
});

beforeEach(async () => {
    requestMock.mockReset();
    setSessionMock.mockReset();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
        root.render(
            <MemoryRouter initialEntries={['/login']}>
                <Login />
            </MemoryRouter>
        );
    });
});

afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    consoleErrorSpy.mockRestore();
});

describe('Login', () => {
    it('exposes password-manager-friendly fields and a visibility toggle', async () => {
        const identifier = container.querySelector<HTMLInputElement>('#login-identifier');
        const password = container.querySelector<HTMLInputElement>('#login-password');
        const toggle = container.querySelector<HTMLButtonElement>('.password-toggle');

        expect(identifier?.autocomplete).toBe('username');
        expect(password?.autocomplete).toBe('current-password');
        expect(password?.type).toBe('password');
        expect(toggle?.getAttribute('aria-label')).toBe('Show password');

        await act(async () => toggle?.click());

        expect(password?.type).toBe('text');
        expect(toggle?.getAttribute('aria-label')).toBe('Hide password');
        expect(toggle?.getAttribute('aria-pressed')).toBe('true');
    });

    it('renders labelled fields and a native submit form for Enter-key submission', () => {
        const form = container.querySelector<HTMLFormElement>('form');
        const identifierLabel = container.querySelector<HTMLLabelElement>(
            'label[for="login-identifier"]'
        );
        const passwordLabel = container.querySelector<HTMLLabelElement>(
            'label[for="login-password"]'
        );
        const submit = container.querySelector<HTMLButtonElement>('button[type="submit"]');

        expect(form).not.toBeNull();
        expect(identifierLabel?.textContent).toBe('Email, username, or phone');
        expect(passwordLabel?.textContent).toBe('Password');
        expect(submit?.textContent).toContain('Log in');
        expect(submit?.getAttribute('aria-busy')).toBe('false');
    });

    it('preserves the API session contract and role redirect path', async () => {
        requestMock.mockResolvedValue({
            data: {
                success: true,
                data: {
                    access_token: 'access-token',
                    refresh_token: 'refresh-token',
                    expires_in: 3600,
                    user: {
                        id: 'user-1',
                        email: 'agent@example.com',
                        firstName: 'Test',
                        lastName: 'Agent',
                        role: 'agent',
                        permissions: ['clients.create'],
                    },
                },
            },
        });

        await submitCredentials();

        await vi.waitFor(() => expect(setSessionMock).toHaveBeenCalledOnce());
        expect(requestMock).toHaveBeenCalledWith(
            'USER',
            'http://localhost:2200/api/auth/login',
            'POST',
            { identifier: 'agent@example.com', password: 'secret12' }
        );
        expect(setSessionMock).toHaveBeenCalledWith(
            expect.objectContaining({
                access_token: 'access-token',
                refresh_token: 'refresh-token',
                expires_in: 3600,
                user: expect.objectContaining({ role: 'agent' }),
            })
        );
    });

    it('shows the compact loading state while authentication is pending', async () => {
        requestMock.mockReturnValue(new Promise(() => undefined));

        await submitCredentials();
        await vi.waitFor(() => expect(requestMock).toHaveBeenCalledOnce());

        const submit = container.querySelector<HTMLButtonElement>('button[type="submit"]');
        expect(submit?.disabled).toBe(true);
        expect(submit?.getAttribute('aria-busy')).toBe('true');
        expect(submit?.textContent).toContain('Signing in');
    });

    it('announces API authentication errors', async () => {
        requestMock.mockResolvedValue({
            data: null,
            errorType: 'Unauthorized',
            errorMessage: 'Invalid credentials',
        });

        await submitCredentials();
        await vi.waitFor(() =>
            expect(container.querySelector('[role="alert"]')?.textContent).toContain(
                'Invalid credentials'
            )
        );
    });
});
