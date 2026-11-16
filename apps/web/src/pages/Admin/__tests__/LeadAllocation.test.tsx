// @vitest-environment jsdom

import { act, type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    getLeads: vi.fn(),
    updateLead: vi.fn(),
    unassigned: vi.fn(),
    assigned: vi.fn(),
    listUsers: vi.fn(),
    createTask: vi.fn(),
    toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/api/leads.api', () => ({
    getLeads: mocks.getLeads,
    updateLead: mocks.updateLead,
    getAllUnassignedLeads: mocks.unassigned,
    getAllAssignedLeads: mocks.assigned,
    formatPhoneNumber: (value: string) => value,
}));
vi.mock('@/api/users', () => ({ listUsers: mocks.listUsers }));
vi.mock('@/api/tasks.api', () => ({ createTask: mocks.createTask }));
vi.mock('@/utils/toast', () => ({ showToast: mocks.toast }));

const agent = {
    id: 'agent-1',
    firstName: 'Lindiwe',
    lastName: 'Dlamini',
    email: 'lindiwe@example.com',
    employeeNumber: 'EMP1',
    role: 'agent',
    status: 'active',
};
const unassignedLead = {
    id: 'lead-1',
    timeReceived: '2026-11-16T08:00:00Z',
    franchise: 'Pretoria',
    name: 'Naledi Mokoena',
    cell: '0821234567',
    idNumber: '9001015009087',
    affiliate: 'Web',
    message: null,
    allocatedTo: null,
    leadOutcome: 'Not Processed',
    createdAt: '2026-11-16',
    updatedAt: '2026-11-16',
};
const assignedLead = {
    ...unassignedLead,
    id: 'lead-2',
    name: 'Thabo Molefe',
    cell: '0831234567',
    allocatedTo: 'Lindiwe Dlamini',
    leadOutcome: 'Pending',
};
const response = {
    leads: [unassignedLead, assignedLead],
    total: 42,
    page: 1,
    limit: 20,
    totalPages: 3,
};

let Screen: ComponentType;
let container: HTMLDivElement;
let root: Root;

const renderScreen = async () => {
    await act(async () => root.render(<Screen />));
    await vi.waitFor(() => expect(container.textContent).toContain('Naledi Mokoena'));
};

const change = async (control: HTMLInputElement | HTMLSelectElement, value: string) => {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(control), 'value')?.set;
    await act(async () => {
        setter?.call(control, value);
        control.dispatchEvent(new Event('change', { bubbles: true }));
    });
};

beforeAll(async () => {
    Reflect.set(window, 'IS_REACT_ACT_ENVIRONMENT', true);
    Screen = (await import('../LeadAllocation')).default;
});

beforeEach(() => {
    mocks.getLeads.mockReset().mockResolvedValue(response);
    mocks.updateLead.mockReset().mockResolvedValue({});
    mocks.unassigned.mockReset().mockResolvedValue([unassignedLead]);
    mocks.assigned.mockReset().mockResolvedValue([assignedLead]);
    mocks.listUsers.mockReset().mockResolvedValue({ users: [agent] });
    mocks.createTask.mockReset().mockResolvedValue({});
    Object.values(mocks.toast).forEach((mock) => mock.mockReset());
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
});

describe('LeadAllocation', () => {
    it('renders live allocation data in desktop and mobile presentations', async () => {
        await renderScreen();
        expect(container.textContent).toContain('Total leads42');
        expect(container.textContent).toContain('Lindiwe Dlamini');
        expect(container.querySelector('.lead-allocation-table-wrap')).not.toBeNull();
        expect(container.querySelectorAll('.lead-allocation-mobile-list article')).toHaveLength(2);
        expect(mocks.getLeads).toHaveBeenCalledWith(
            expect.objectContaining({ page: 1, limit: 50, sortBy: 'timeReceived' })
        );
    });

    it('preserves search and assignment filters', async () => {
        await renderScreen();
        const search = container.querySelector<HTMLInputElement>('input[type="search"]');
        const selects = container.querySelectorAll<HTMLSelectElement>(
            '.lead-allocation-toolbar select'
        );
        if (!search || selects.length < 2) throw new Error('Filters not rendered');
        await change(search, 'Naledi');
        await change(selects[1], 'unassigned');
        await vi.waitFor(() =>
            expect(mocks.getLeads).toHaveBeenLastCalledWith(
                expect.objectContaining({ search: 'Naledi', allocatedTo: null })
            )
        );
    });

    it('assigns one lead and creates its follow-up task', async () => {
        await renderScreen();
        const assign = [...container.querySelectorAll('button')].find(
            (button) => button.textContent === 'Assign'
        );
        await act(async () => assign?.click());
        const select = document.querySelector<HTMLSelectElement>('.lead-allocation-field select');
        if (!select) throw new Error('Assignment modal not rendered');
        await change(select, 'agent-1');
        const save = [...document.querySelectorAll('button')].find(
            (button) => button.textContent === 'Save assignment'
        );
        await act(async () => save?.click());
        await vi.waitFor(() =>
            expect(mocks.updateLead).toHaveBeenCalledWith('lead-1', {
                allocatedTo: 'Lindiwe Dlamini',
            })
        );
        expect(mocks.createTask).toHaveBeenCalledWith(
            expect.objectContaining({
                assignedToUserId: 'agent-1',
                metadata: expect.objectContaining({ leadId: 'lead-1' }),
            })
        );
    });

    it('directly unassigns an allocated lead', async () => {
        await renderScreen();
        const button = [...container.querySelectorAll('button')].find(
            (item) => item.textContent === 'Unassign'
        );
        await act(async () => button?.click());
        await vi.waitFor(() =>
            expect(mocks.updateLead).toHaveBeenCalledWith('lead-2', { allocatedTo: null })
        );
        expect(mocks.toast.success).toHaveBeenCalledWith('Lead unassigned successfully');
    });

    it('bulk assigns selected leads and creates tasks', async () => {
        await renderScreen();
        const open = [...container.querySelectorAll('button')].find(
            (button) => button.textContent === 'Assign multiple'
        );
        await act(async () => open?.click());
        await vi.waitFor(() => expect(mocks.unassigned).toHaveBeenCalled());
        const agentButton = [
            ...document.querySelectorAll('.lead-allocation-agent-list button'),
        ][0] as HTMLButtonElement;
        const checkbox = document.querySelector<HTMLInputElement>(
            '.lead-allocation-selection-list input[type="checkbox"]'
        );
        await act(async () => agentButton.click());
        await act(async () => checkbox?.click());
        const submit = [...document.querySelectorAll('button')].find(
            (button) => button.textContent === 'Assign 1'
        );
        await act(async () => submit?.click());
        await vi.waitFor(() =>
            expect(mocks.updateLead).toHaveBeenCalledWith('lead-1', {
                allocatedTo: 'Lindiwe Dlamini',
            })
        );
        expect(mocks.createTask).toHaveBeenCalled();
    });

    it('shows a retryable error state', async () => {
        mocks.getLeads.mockRejectedValueOnce(new Error('Allocation API unavailable'));
        await act(async () => root.render(<Screen />));
        await vi.waitFor(() => expect(container.querySelector('[role="alert"]')).not.toBeNull());
        expect(container.textContent).toContain('Allocation API unavailable');
        expect(container.textContent).toContain('Retry');
    });
});
