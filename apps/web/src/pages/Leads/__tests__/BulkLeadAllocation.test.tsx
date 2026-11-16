// @vitest-environment jsdom

import { act, type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { getAgentsMock, getLeadsMock, allocateMock, unallocateMock, toastMock } = vi.hoisted(() => ({
    getAgentsMock: vi.fn(),
    getLeadsMock: vi.fn(),
    allocateMock: vi.fn(),
    unallocateMock: vi.fn(),
    toastMock: { success: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock('@/api/users.api', () => ({ getAgents: getAgentsMock }));
vi.mock('@/api/leads.api', () => ({
    getLeads: getLeadsMock,
    bulkAllocateLeads: allocateMock,
    bulkUnallocateLeads: unallocateMock,
}));
vi.mock('react-toastify', () => ({ toast: toastMock }));

const agents = [
    {
        id: 'agent-1',
        firstName: 'Lindiwe',
        lastName: 'Dlamini',
        email: 'lindiwe@example.com',
        username: 'lindiwe',
        role: 'Agent',
        employeeNumber: 'EMP-104',
        phoneNumber: null,
        status: 'active',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
    },
    {
        id: 'agent-2',
        firstName: 'Thabo',
        lastName: 'Mokoena',
        email: 'thabo@example.com',
        username: 'thabo',
        role: 'Agent',
        employeeNumber: null,
        phoneNumber: null,
        status: 'active',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
    },
];

let BulkLeadAllocation: ComponentType;
let container: HTMLDivElement;
let root: Root;

const renderScreen = async () => {
    await act(async () => root.render(<BulkLeadAllocation />));
    await vi.waitFor(() => expect(container.textContent).toContain('Lindiwe Dlamini'));
};

const changeInput = async (input: HTMLInputElement, value: string) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    await act(async () => {
        setter?.call(input, value);
        input.dispatchEvent(new Event('change', { bubbles: true }));
    });
};

beforeAll(async () => {
    Reflect.set(window, 'IS_REACT_ACT_ENVIRONMENT', true);
    BulkLeadAllocation = (await import('../BulkLeadAllocation')).default;
});

beforeEach(() => {
    getAgentsMock.mockReset().mockResolvedValue(agents);
    getLeadsMock
        .mockReset()
        .mockImplementation(({ allocatedTo }: { allocatedTo: string }) =>
            Promise.resolve({ total: allocatedTo.startsWith('Lindiwe') ? 12 : 4 })
        );
    allocateMock
        .mockReset()
        .mockResolvedValue({ success: true, allocated: 3, agentName: 'Lindiwe Dlamini' });
    unallocateMock
        .mockReset()
        .mockResolvedValue({ success: true, unallocated: 2, agentName: 'Lindiwe Dlamini' });
    Object.values(toastMock).forEach((mock) => mock.mockReset());
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
});

describe('BulkLeadAllocation', () => {
    it('loads live counts into compact desktop and mobile presentations', async () => {
        await renderScreen();
        expect(getAgentsMock).toHaveBeenCalledTimes(1);
        expect(getLeadsMock).toHaveBeenCalledWith({ allocatedTo: 'Lindiwe Dlamini', limit: 1 });
        expect(getLeadsMock).toHaveBeenCalledWith({ allocatedTo: 'Thabo Mokoena', limit: 1 });
        expect(container.querySelector('.bulk-allocation-table')).not.toBeNull();
        expect(container.querySelectorAll('.bulk-allocation-agent')).toHaveLength(2);
        expect(container.textContent).toContain('Allocated leads16');
        expect(container.textContent).toContain('EMP-104');
        expect(container.textContent).toContain('N/A');
    });

    it('allocates the entered count and reloads current totals', async () => {
        await renderScreen();
        const input = container.querySelector<HTMLInputElement>('#allocate-agent-1');
        if (!input) throw new Error('Allocate input not rendered');
        await changeInput(input, '3');
        const button = [
            ...container.querySelectorAll<HTMLButtonElement>('.bulk-allocation-button--allocate'),
        ].find((item) => !item.disabled);
        if (!button) throw new Error('Allocate action not enabled');
        await act(async () => button.click());

        await vi.waitFor(() =>
            expect(allocateMock).toHaveBeenCalledWith('agent-1', 'Lindiwe Dlamini', 3)
        );
        expect(toastMock.success).toHaveBeenCalledWith(
            'Successfully allocated 3 leads to Lindiwe Dlamini'
        );
        expect(getAgentsMock).toHaveBeenCalledTimes(2);
    });

    it('caps unallocation at the agent current lead count', async () => {
        await renderScreen();
        const input = container.querySelector<HTMLInputElement>('#unallocate-agent-2');
        if (!input) throw new Error('Unallocate input not rendered');
        await changeInput(input, '99');
        expect(input.value).toBe('4');
        expect(container.textContent).toContain('−4');
    });

    it('unallocates the selected count and reports success', async () => {
        await renderScreen();
        const input = container.querySelector<HTMLInputElement>('#unallocate-agent-1');
        if (!input) throw new Error('Unallocate input not rendered');
        await changeInput(input, '2');
        const button = [
            ...container.querySelectorAll<HTMLButtonElement>('.bulk-allocation-button--unallocate'),
        ].find((item) => !item.disabled);
        if (!button) throw new Error('Unallocate action not enabled');
        await act(async () => button.click());

        await vi.waitFor(() =>
            expect(unallocateMock).toHaveBeenCalledWith('agent-1', 'Lindiwe Dlamini', 2)
        );
        expect(toastMock.success).toHaveBeenCalledWith(
            'Successfully unallocated 2 leads from Lindiwe Dlamini'
        );
    });

    it('shows an empty state when no agents are available', async () => {
        getAgentsMock.mockResolvedValueOnce([]);
        await act(async () => root.render(<BulkLeadAllocation />));
        await vi.waitFor(() => expect(container.textContent).toContain('No agents found'));
        expect(container.textContent).toContain(
            'There are no active agents available for allocation.'
        );
    });

    it('shows a retry action when the agent request fails', async () => {
        getAgentsMock.mockRejectedValueOnce(new Error('network unavailable'));
        await act(async () => root.render(<BulkLeadAllocation />));
        await vi.waitFor(() => expect(container.querySelector('[role="alert"]')).not.toBeNull());
        expect(container.textContent).toContain('Failed to load agents. Please try again.');

        const retry = [...container.querySelectorAll('button')].find(
            (button) => button.textContent === 'Retry'
        );
        if (!retry) throw new Error('Retry button not rendered');
        await act(async () => retry.click());
        await vi.waitFor(() => expect(container.textContent).toContain('Lindiwe Dlamini'));
    });
});
