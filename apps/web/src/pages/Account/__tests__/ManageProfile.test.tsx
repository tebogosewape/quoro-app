// @vitest-environment jsdom

import { act, type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthSession } from '@/interfaces/AuthUser';

const { updateUserMock, changePasswordMock, setSessionMock, authState } = vi.hoisted(() => ({
    updateUserMock: vi.fn(),
    changePasswordMock: vi.fn(),
    setSessionMock: vi.fn(),
    authState: { session: null as AuthSession | null },
}));

vi.mock('@/api/users', () => ({
    updateUser: updateUserMock,
    changeUserPassword: changePasswordMock,
}));

vi.mock('@/stores/auth.store', () => ({
    useAuthStore: (selector: (state: unknown) => unknown) =>
        selector({ session: authState.session, setSession: setSessionMock }),
}));

const session: AuthSession = {
    access_token: 'test-token',
    user: {
        id: 'user-1',
        firstName: 'Nandi',
        lastName: 'Maseko',
        email: 'nandi@example.test',
        username: 'nandi.maseko',
        phoneNumber: '0820000000',
        department: 'Operations',
        role: 'team_leader',
        permissions: ['roles.manage', 'leads.view'],
    },
};

let Screen: ComponentType;
let container: HTMLDivElement;
let root: Root;

const renderScreen = async () => {
    await act(async () => root.render(<Screen />));
};

const setInput = async (label: string, value: string) => {
    const input = Array.from(container.querySelectorAll<HTMLInputElement>('input')).find(
        (element) => element.parentElement?.textContent?.includes(label)
    );
    await act(async () => {
        if (!input) return;
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        setter?.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });
};

beforeAll(async () => {
    Reflect.set(window, 'IS_REACT_ACT_ENVIRONMENT', true);
    Screen = (await import('../ManageProfile')).default;
});

beforeEach(() => {
    authState.session = session;
    updateUserMock.mockReset().mockResolvedValue({ ...session.user, firstName: 'Naledi' });
    changePasswordMock.mockReset().mockResolvedValue(undefined);
    setSessionMock.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
});

describe('ManageProfile', () => {
    it('shows a safe loading state without an authenticated session', async () => {
        authState.session = null;
        await renderScreen();
        expect(container.textContent).toContain('Loading your account');
    });

    it('renders compact live account information and permissions', async () => {
        await renderScreen();
        expect(container.textContent).toContain('My profile');
        expect(container.textContent).toContain('Nandi Maseko');
        expect(container.textContent).toContain('Team Leader');
        expect(container.textContent).toContain('roles.manage');
        expect(container.querySelectorAll('.account-profile-fields input')).toHaveLength(9);
    });

    it('validates required profile fields before calling the API', async () => {
        await renderScreen();
        await setInput('First name', '');
        const form = container.querySelector<HTMLFormElement>('.account-profile-panel form');
        await act(async () =>
            form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
        );
        expect(container.textContent).toContain('Complete all required account fields');
        expect(updateUserMock).not.toHaveBeenCalled();
    });

    it('saves profile changes and refreshes the authenticated identity', async () => {
        await renderScreen();
        await setInput('First name', 'Naledi');
        const form = container.querySelector<HTMLFormElement>('.account-profile-panel form');
        await act(async () =>
            form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
        );
        await vi.waitFor(() => expect(updateUserMock).toHaveBeenCalled());
        expect(updateUserMock).toHaveBeenCalledWith(
            'user-1',
            expect.objectContaining({ firstName: 'Naledi', username: 'nandi.maseko' })
        );
        expect(setSessionMock).toHaveBeenCalled();
        expect(container.textContent).toContain('Profile updated successfully');
    });

    it('rejects mismatched new passwords locally', async () => {
        await renderScreen();
        await setInput('Current password', 'Password123!');
        await setInput('New password', 'Different123!');
        await setInput('Confirm new password', 'Mismatch123!');
        const form = container.querySelectorAll<HTMLFormElement>('form')[1];
        await act(async () =>
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
        );
        expect(container.textContent).toContain('do not match');
        expect(changePasswordMock).not.toHaveBeenCalled();
    });

    it('uses the real password endpoint after successful validation', async () => {
        await renderScreen();
        await setInput('Current password', 'Password123!');
        await setInput('New password', 'NewPassword123!');
        await setInput('Confirm new password', 'NewPassword123!');
        const form = container.querySelectorAll<HTMLFormElement>('form')[1];
        await act(async () =>
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
        );
        await vi.waitFor(() =>
            expect(changePasswordMock).toHaveBeenCalledWith('user-1', {
                currentPassword: 'Password123!',
                newPassword: 'NewPassword123!',
            })
        );
        expect(container.textContent).toContain('Password updated successfully');
    });
});
