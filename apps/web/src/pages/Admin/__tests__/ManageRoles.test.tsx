// @vitest-environment jsdom

import { act, type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchRolesMock, fetchPermissionsMock, fetchRolePermissionsMock, updateMock } = vi.hoisted(
    () => ({
        fetchRolesMock: vi.fn(),
        fetchPermissionsMock: vi.fn(),
        fetchRolePermissionsMock: vi.fn(),
        updateMock: vi.fn(),
    })
);

vi.mock('@/api/roles', () => ({
    fetchRoles: fetchRolesMock,
    fetchPermissions: fetchPermissionsMock,
    fetchRolePermissions: fetchRolePermissionsMock,
    updateRolePermissions: updateMock,
}));

const roles = [
    { id: 'role-admin', slug: 'admin', name: 'Administrator', description: 'Full access' },
    { id: 'role-agent', slug: 'agent', name: 'Agent', description: 'Operational access' },
];

const permissions = [
    { id: 'perm-roles', key: 'roles.manage', name: 'Manage roles', description: 'Manage RBAC' },
    { id: 'perm-view', key: 'users.view', name: 'View users', description: 'Read users' },
    { id: 'perm-edit', key: 'users.edit', name: 'Edit users', description: 'Change users' },
];

let Screen: ComponentType;
let container: HTMLDivElement;
let root: Root;

const renderScreen = async () => {
    await act(async () => root.render(<Screen />));
    await vi.waitFor(() => expect(fetchRolePermissionsMock).toHaveBeenCalledWith('admin'));
    await act(async () => Promise.resolve());
};

const findButton = (text: string) =>
    Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
        button.textContent?.includes(text)
    );

const click = async (element: Element | undefined | null) => {
    await act(async () => element?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
};

beforeAll(async () => {
    Reflect.set(window, 'IS_REACT_ACT_ENVIRONMENT', true);
    Screen = (await import('../ManageRoles')).default;
});

beforeEach(() => {
    fetchRolesMock.mockReset().mockResolvedValue(roles);
    fetchPermissionsMock.mockReset().mockResolvedValue(permissions);
    fetchRolePermissionsMock
        .mockReset()
        .mockImplementation((slug: string) =>
            Promise.resolve(slug === 'admin' ? ['roles.manage'] : ['users.view'])
        );
    updateMock.mockReset().mockResolvedValue(undefined);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
});

describe('ManageRoles', () => {
    it('loads the role catalogue and the selected role permissions', async () => {
        await renderScreen();
        expect(container.textContent).toContain('Roles & permissions');
        expect(container.textContent).toContain('Administrator');
        expect(container.textContent).toContain('Agent');
        expect(container.textContent).toContain('roles.manage');
        expect(container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')).toHaveLength(
            3
        );
        expect(container.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(
            true
        );
    });

    it('toggles a permission once when its checkbox is clicked', async () => {
        await renderScreen();
        const checkbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
        await click(checkbox);
        expect(checkbox?.checked).toBe(false);
        expect(findButton('Save changes')?.disabled).toBe(false);
    });

    it('filters permissions by key, name or description', async () => {
        await renderScreen();
        const search = container.querySelector<HTMLInputElement>('input[type="search"]');
        await act(async () => {
            const setter = Object.getOwnPropertyDescriptor(
                HTMLInputElement.prototype,
                'value'
            )?.set;
            setter?.call(search, 'Edit users');
            search?.dispatchEvent(new Event('input', { bubbles: true }));
        });
        expect(container.textContent).toContain('users.edit');
        expect(container.textContent).not.toContain('roles.manage');
        expect(container.textContent).not.toContain('users.view');
    });

    it('loads the correct permission set when another role is selected', async () => {
        await renderScreen();
        await click(findButton('Agent'));
        await vi.waitFor(() => expect(fetchRolePermissionsMock).toHaveBeenCalledWith('agent'));
        await vi.waitFor(() => {
            const checked = Array.from(
                container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
            ).filter((input) => input.checked);
            expect(checked).toHaveLength(1);
            expect(checked[0].parentElement?.textContent).toContain('users.view');
        });
    });

    it('supports select-all and clear actions with a visible dirty state', async () => {
        await renderScreen();
        await click(findButton('Select all'));
        expect(
            Array.from(
                container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
            ).every((input) => input.checked)
        ).toBe(true);
        expect(container.textContent).toContain('Unsaved changes');
        await click(findButton('Clear'));
        expect(
            Array.from(container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')).some(
                (input) => input.checked
            )
        ).toBe(false);
    });

    it('saves the selected keys through the existing role endpoint', async () => {
        vi.useFakeTimers();
        await renderScreen();
        const editPermission = Array.from(
            container.querySelectorAll<HTMLLabelElement>('.role-admin__permission')
        ).find((label) => label.textContent?.includes('users.edit'));
        await click(editPermission?.querySelector('input'));
        await click(findButton('Save changes'));
        await act(async () => Promise.resolve());
        expect(updateMock).toHaveBeenCalledWith('admin', ['roles.manage', 'users.edit']);
        expect(container.textContent).toContain('Permissions saved successfully');
    });
});
