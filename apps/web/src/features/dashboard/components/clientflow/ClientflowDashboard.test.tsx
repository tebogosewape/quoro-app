// @vitest-environment jsdom

import { act, type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthSession } from '@/interfaces/AuthUser';

const { agentDashboardMock, listTasksMock, getLeadsMock, apiGetMock, authState } = vi.hoisted(
    () => ({
        agentDashboardMock: vi.fn(),
        listTasksMock: vi.fn(),
        getLeadsMock: vi.fn(),
        apiGetMock: vi.fn(),
        authState: { session: null as AuthSession | null },
    })
);

vi.mock('@/stores/auth.store', () => ({
    useAuthStore: (selector: (state: { session: AuthSession | null }) => unknown) =>
        selector(authState),
}));

vi.mock('../../api/dashboard.api', () => ({
    getAgentDashboard: agentDashboardMock,
}));

vi.mock('@/api/tasks.api', () => ({
    listTasks: listTasksMock,
}));

vi.mock('@/api/leads.api', () => ({
    getLeads: getLeadsMock,
    logLeadView: vi.fn(),
}));

vi.mock('@/api/axios.config', () => ({
    apiClient: { get: apiGetMock },
}));

let ClientflowDashboard: ComponentType;
let container: HTMLDivElement;
let root: Root;
let queryClient: QueryClient;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
let consoleLogSpy: ReturnType<typeof vi.spyOn>;

const agentDashboard = {
    commissionSummary: {
        totalEarned: 0,
        pendingPayout: 0,
        paidThisMonth: 0,
        averageCommission: 0,
    },
    assignedClients: 4,
    assignedLeads: 0,
    newClientsThisMonth: 2,
    activeTasks: 1,
    overdueTasks: 0,
    completionRate: 75,
    clientSatisfaction: 90,
    totalDebtManaged: 125000,
    targetAchievement: 80,
    recentTasks: [],
    recentClients: [],
    recentAssignedLeads: [],
};

const makeSession = (role: AuthSession['user']['role']): AuthSession => ({
    access_token: 'test-token',
    user: {
        id: 'user-1',
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
        role,
        permissions: [],
    },
});

const LocationProbe = () => {
    const location = useLocation();
    return <output data-testid="location">{location.pathname}</output>;
};

const renderDashboard = async () => {
    await act(async () => {
        root.render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={['/dashboard']}>
                    <ClientflowDashboard />
                    <LocationProbe />
                </MemoryRouter>
            </QueryClientProvider>
        );
    });
};

beforeAll(async () => {
    Reflect.set(window, 'IS_REACT_ACT_ENVIRONMENT', true);
    ClientflowDashboard = (await import('./ClientflowDashboard')).default;
});

beforeEach(() => {
    authState.session = makeSession('agent');
    agentDashboardMock.mockReset().mockResolvedValue(agentDashboard);
    listTasksMock.mockReset().mockResolvedValue({
        tasks: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
    });
    getLeadsMock.mockReset().mockResolvedValue({
        leads: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
    });
    apiGetMock.mockReset().mockResolvedValue({ data: [] });
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(async () => {
    await act(async () => root.unmount());
    queryClient.clear();
    container.remove();
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
});

describe('ClientflowDashboard', () => {
    it('preserves the admin role branch without starting agent queries', async () => {
        authState.session = makeSession('admin');

        await renderDashboard();

        expect(container.querySelector('.dashboard-screen--admin')).not.toBeNull();
        expect(container.textContent).toContain('Admin Dashboard');
        expect(agentDashboardMock).not.toHaveBeenCalled();
        expect(listTasksMock).not.toHaveBeenCalled();
    });

    it('shows the dashboard loading state while agent data is pending', async () => {
        agentDashboardMock.mockReturnValue(new Promise(() => undefined));

        await renderDashboard();

        await vi.waitFor(() => expect(container.textContent).toContain('Loading your dashboard'));
        expect(container.querySelector('[role="status"]')).not.toBeNull();
    });

    it('shows a retryable error when the main agent dashboard request fails', async () => {
        agentDashboardMock.mockRejectedValue(new Error('Dashboard service unavailable'));

        await renderDashboard();

        await vi.waitFor(() =>
            expect(container.querySelector('[role="alert"]')?.textContent).toContain(
                'Dashboard service unavailable'
            )
        );
        expect(container.textContent).toContain('Retry');
    });

    it('keeps agent queries, live values, and empty states intact', async () => {
        await renderDashboard();

        await vi.waitFor(() => expect(container.textContent).toContain('Welcome back, Test'));
        expect(container.querySelector('.dashboard-screen--agent')).not.toBeNull();
        expect(container.textContent).toContain('My Clients');
        expect(container.textContent).toContain('Assigned Leads');
        expect(container.textContent).toContain('All caught up!');
        expect(container.textContent).toContain('No recent messages');
        expect(agentDashboardMock).toHaveBeenCalledWith({ timeRange: 'month' });
        expect(listTasksMock).toHaveBeenCalledWith({ assignedToUserId: 'user-1', limit: 50 });
        expect(getLeadsMock).toHaveBeenCalledWith({
            allocatedTo: 'Test User',
            limit: 50,
            sortBy: 'timeReceived',
            sortOrder: 'DESC',
        });
    });

    it('shows allocated leads in the work queue without duplicating an existing lead task', async () => {
        const allocatedLeads = [
            {
                id: 'lead-1',
                name: 'Leeuw',
                cell: '0810197967',
                idNumber: null,
                franchise: 'QFinance',
                affiliate: null,
                message: null,
                allocatedTo: 'Test User',
                leadOutcome: 'Not Processed',
                timeReceived: '2026-11-15T08:00:00.000Z',
                createdAt: '2026-11-15T08:00:00.000Z',
                updatedAt: '2026-11-15T08:00:00.000Z',
            },
            {
                id: 'lead-2',
                name: 'Mokoena',
                cell: '0820000000',
                idNumber: null,
                franchise: 'QFinance',
                affiliate: null,
                message: null,
                allocatedTo: 'Test User',
                leadOutcome: 'Not Processed',
                timeReceived: '2026-11-14T08:00:00.000Z',
                createdAt: '2026-11-14T08:00:00.000Z',
                updatedAt: '2026-11-14T08:00:00.000Z',
            },
        ];
        agentDashboardMock.mockResolvedValue({
            ...agentDashboard,
            assignedLeads: 33,
            recentAssignedLeads: allocatedLeads,
        });
        listTasksMock.mockResolvedValue({
            tasks: [
                {
                    id: 'task-1',
                    title: 'Convert Lead: Leeuw',
                    description: 'Follow up',
                    type: 'follow_up',
                    status: 'assigned',
                    priority: 'normal',
                    dueDate: null,
                    completedAt: null,
                    estimatedHours: null,
                    actualHours: null,
                    completionNotes: null,
                    metadata: { leadId: 'lead-1', leadData: { name: 'Leeuw' } },
                    createdAt: '2026-11-15T08:00:00.000Z',
                    updatedAt: '2026-11-15T08:00:00.000Z',
                    assignedToUser: null,
                    client: null,
                    createdByUser: null,
                },
            ],
            total: 1,
            page: 1,
            limit: 50,
            totalPages: 1,
        });
        getLeadsMock.mockResolvedValue({
            leads: allocatedLeads,
            total: 33,
            page: 1,
            limit: 50,
            totalPages: 1,
        });

        await renderDashboard();

        await vi.waitFor(() => expect(container.textContent).toContain('Mokoena'));
        expect(container.textContent).toContain('33');
        expect(container.textContent).toContain('My Work Queue');
        expect(container.querySelectorAll('.dashboard-task-item')).toHaveLength(2);
        expect(container.textContent?.match(/Convert Lead: Leeuw/g)).toHaveLength(1);
    });

    it('searches and paginates the compact work queue', async () => {
        const allocatedLeads = Array.from({ length: 7 }, (_, index) => ({
            id: `lead-${index + 1}`,
            name: `Lead ${index + 1}`,
            cell: `082000000${index}`,
            idNumber: null,
            franchise: 'QFinance',
            affiliate: null,
            message: null,
            allocatedTo: 'Test User',
            leadOutcome: 'Not Processed',
            timeReceived: `2026-11-${String(15 - index).padStart(2, '0')}T08:00:00.000Z`,
            createdAt: '2026-11-15T08:00:00.000Z',
            updatedAt: '2026-11-15T08:00:00.000Z',
        }));
        getLeadsMock.mockResolvedValue({
            leads: allocatedLeads,
            total: 7,
            page: 1,
            limit: 50,
            totalPages: 1,
        });

        await renderDashboard();

        await vi.waitFor(() =>
            expect(container.querySelectorAll('.dashboard-task-item')).toHaveLength(5)
        );
        expect(container.textContent).toContain('Page 1 of 2');

        const nextButton = Array.from(container.querySelectorAll('button')).find(
            (button) => button.textContent === 'Next'
        );
        await act(async () => nextButton?.click());
        expect(container.querySelectorAll('.dashboard-task-item')).toHaveLength(2);
        expect(container.textContent).toContain('Convert Lead: Lead 7');

        const searchInput = container.querySelector<HTMLInputElement>(
            'input[placeholder="Search lead, client or phone"]'
        );
        await act(async () => {
            if (!searchInput) return;
            const valueSetter = Object.getOwnPropertyDescriptor(
                HTMLInputElement.prototype,
                'value'
            )?.set;
            valueSetter?.call(searchInput, 'Lead 3');
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        });
        expect(container.querySelectorAll('.dashboard-task-item')).toHaveLength(1);
        expect(container.textContent).toContain('Convert Lead: Lead 3');
        expect(container.textContent).toContain('1 matching');
        expect(container.textContent).toContain('Page 1 of 1');
    });

    it('renders recent inbox messages with compact sender and subject hierarchy', async () => {
        apiGetMock.mockResolvedValue({
            data: [
                {
                    uid: 42,
                    from: 'Support Team <support@example.com>',
                    subject: 'Your application update',
                    date: '2026-11-15T10:30:00.000Z',
                },
            ],
        });

        await renderDashboard();

        await vi.waitFor(() => expect(container.textContent).toContain('Your application update'));
        expect(container.textContent).toContain('Support Team <support@example.com>');
        expect(container.querySelector('.dashboard-messages-panel')).not.toBeNull();
        expect(container.querySelectorAll('.dashboard-message-item')).toHaveLength(1);
    });

    it('preserves client navigation from an assigned task', async () => {
        listTasksMock.mockResolvedValue({
            tasks: [
                {
                    id: 'task-1',
                    title: 'Review client file',
                    description: 'Review documents',
                    type: 'review',
                    status: 'pending',
                    priority: 'normal',
                    dueDate: null,
                    completedAt: null,
                    estimatedHours: null,
                    actualHours: null,
                    completionNotes: null,
                    metadata: null,
                    createdAt: '2026-11-15T08:00:00.000Z',
                    updatedAt: '2026-11-15T08:00:00.000Z',
                    assignedToUser: null,
                    client: {
                        id: 'client-1',
                        firstName: 'Sample',
                        lastName: 'Client',
                        email: null,
                    },
                    createdByUser: null,
                },
            ],
            total: 1,
            page: 1,
            limit: 50,
            totalPages: 1,
        });

        await renderDashboard();
        await vi.waitFor(() => expect(container.textContent).toContain('Review client file'));

        const task = Array.from(
            container.querySelectorAll<HTMLElement>('.dashboard-task-item')
        ).find((item) => item.textContent?.includes('Review client file'));
        await act(async () => task?.click());

        expect(container.querySelector('[data-testid="location"]')?.textContent).toBe(
            '/clients/client-1'
        );
    });

    it('surfaces task and inbox API errors without hiding the rest of the dashboard', async () => {
        listTasksMock.mockRejectedValue(new Error('Task service unavailable'));
        apiGetMock.mockRejectedValue(new Error('Inbox service unavailable'));

        await renderDashboard();

        await vi.waitFor(() => expect(container.textContent).toContain('Error Loading Tasks'));
        expect(container.textContent).toContain('Task service unavailable');
        await vi.waitFor(() => expect(container.textContent).toContain('Messages unavailable'), {
            timeout: 3000,
        });
        expect(container.textContent).toContain('My Clients');
    });

    it('preserves the CEO data branch and its three operational queries', async () => {
        authState.session = makeSession('chief_executive_officer');
        apiGetMock.mockImplementation((url: string) => {
            if (url === '/clients/stats') {
                return Promise.resolve({
                    data: { data: { total: 12, byStatus: { active: 9, lead: 3 } } },
                });
            }
            if (url === '/zoomconnect/stats') {
                return Promise.resolve({
                    data: {
                        data: {
                            grandTotal: { delivered: 18, sent: 20, failed: 2 },
                            users: [{ user: { creditBalance: 44 } }],
                        },
                    },
                });
            }
            return Promise.resolve({ data: { data: [{ status: 'completed' }] } });
        });

        await renderDashboard();

        await vi.waitFor(() => expect(container.textContent).toContain('CEO Dashboard'));
        expect(container.querySelector('.dashboard-screen--executive')).not.toBeNull();
        expect(container.textContent).toContain('Total Clients');
        expect(container.textContent).toContain('SMS Credits');
        expect(apiGetMock).toHaveBeenCalledWith(
            '/clients/stats',
            expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } })
        );
        expect(apiGetMock).toHaveBeenCalledWith(
            '/tasks',
            expect.objectContaining({ params: { limit: 1000 } })
        );
    });

    it('keeps support roles in the documented fallback branch', async () => {
        authState.session = makeSession('lead_provider');

        await renderDashboard();

        expect(container.textContent).toContain('Your role: lead_provider');
        expect(container.textContent).toContain('Dashboard configuration in progress');
        expect(agentDashboardMock).not.toHaveBeenCalled();
        expect(apiGetMock).not.toHaveBeenCalled();
    });
});
