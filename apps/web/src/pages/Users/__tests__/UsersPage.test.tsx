// @vitest-environment jsdom

import { act, type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { listUsersMock, createUserMock, updateUserMock, deleteUserMock } = vi.hoisted(() => ({
    listUsersMock: vi.fn(),
    createUserMock: vi.fn(),
    updateUserMock: vi.fn(),
    deleteUserMock: vi.fn(),
}));

vi.mock('@/api/users', () => ({
    listUsers: listUsersMock,
    createUser: createUserMock,
    updateUser: updateUserMock,
    deleteUser: deleteUserMock,
}));

const users = [
    {
        id: '2',
        firstName: 'Thabang',
        lastName: 'Sewape',
        email: 'thabang@example.test',
        employeeNumber: 'EMP002',
        role: 'agent',
        status: 'active',
        department: 'Sales',
        lastLoginAt: '2026-11-16T10:00:00.000Z',
    },
    {
        id: '1',
        firstName: 'Alice',
        lastName: 'Mokoena',
        email: 'alice@example.test',
        employeeNumber: 'EMP001',
        role: 'admin',
        status: 'pending',
        department: 'Operations',
        lastLoginAt: null,
    },
];

let Screen: ComponentType;
let container: HTMLDivElement;
let root: Root;

const response = { users, total: 2, page: 1, limit: 10, totalPages: 1 };
const renderScreen = async () => {
    await act(async () => root.render(<Screen />));
    await vi.waitFor(() => expect(listUsersMock).toHaveBeenCalled());
    await act(async () => Promise.resolve());
};
const findButton = (text: string, scope: ParentNode = document) =>
    Array.from(scope.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
        button.textContent?.includes(text)
    );
const click = async (element?: Element | null) => {
    await act(async () => element?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
};

beforeAll(async () => {
    Reflect.set(window, 'IS_REACT_ACT_ENVIRONMENT', true);
    Screen = (await import('../UsersPage')).default;
});
beforeEach(() => {
    listUsersMock.mockReset().mockResolvedValue(response);
    createUserMock.mockReset().mockResolvedValue(users[0]);
    updateUserMock.mockReset().mockResolvedValue(users[0]);
    deleteUserMock.mockReset().mockResolvedValue(undefined);
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
    vi.useRealTimers();
});

describe('UsersPage', () => {
    it('loads the real user directory with compact status and role labels', async () => {
        await renderScreen();
        expect(container.textContent).toContain('User management');
        expect(container.textContent).toContain('Thabang Sewape');
        expect(container.textContent).toContain('Pending');
        expect(container.textContent).toContain('Showing 1-2 of 2');
    });

    it('opens the create form from the page header', async () => {
        await renderScreen();
        await click(findButton('Add user', container));
        expect(document.body.textContent).toContain(
            'Create a new system identity and assign access.'
        );
        expect(document.querySelector('.user-form__grid')).not.toBeNull();
        expect(document.querySelectorAll('.user-form__section')).toHaveLength(2);
        expect(document.querySelector('.user-form .modal-header .btn-close')).not.toBeNull();
        expect(document.querySelector<HTMLInputElement>('#user-password')?.autocomplete).toBe(
            'new-password'
        );
    });

    it('sorts the visible page without changing the server contract', async () => {
        await renderScreen();
        await click(findButton('User', container));
        const names = Array.from(
            container.querySelectorAll(
                '.user-directory__table tbody .user-directory__identity strong'
            )
        ).map((node) => node.textContent);
        expect(names).toEqual(['Alice Mokoena', 'Thabang Sewape']);
        expect(listUsersMock).toHaveBeenCalledWith({
            page: 1,
            limit: 10,
            search: undefined,
            role: undefined,
            status: undefined,
        });
    });

    it('does not delete when the confirmation is cancelled', async () => {
        await renderScreen();
        await click(findButton('Delete', container));
        expect(window.confirm).toHaveBeenCalled();
        expect(deleteUserMock).not.toHaveBeenCalled();
    });

    it('keeps the administration shell visible when loading fails', async () => {
        listUsersMock.mockRejectedValue(new Error('User API unavailable'));
        await renderScreen();
        expect(container.textContent).toContain('User API unavailable');
        expect(container.textContent).toContain('Users could not be loaded.');
        expect(container.textContent).toContain('User management');
    });
});
