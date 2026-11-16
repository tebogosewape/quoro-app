// @vitest-environment jsdom

import { act, type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthSession } from '@/interfaces/AuthUser';

const { agentsMock, leaveMock, successMock, errorMock, authState } = vi.hoisted(() => ({
    agentsMock: vi.fn(),
    leaveMock: vi.fn(),
    successMock: vi.fn(),
    errorMock: vi.fn(),
    authState: { session: null as AuthSession | null },
}));

vi.mock('@/stores/auth.store', () => ({
    useAuthStore: (selector: (state: { session: AuthSession | null }) => unknown) =>
        selector(authState),
}));

vi.mock('@/api/users', () => ({
    getTeamLeadAgents: agentsMock,
    updateAgentLeaveStatus: leaveMock,
}));

vi.mock('react-toastify', () => ({
    toast: { success: successMock, error: errorMock },
}));

const makeSession = (role: AuthSession['user']['role']): AuthSession => ({
    access_token: 'test-token',
    user: {
        id: 'leader-1',
        email: 'leader@example.test',
        firstName: 'Team',
        lastName: 'Leader',
        role,
        permissions: [],
    },
});

const agents = [
    {
        id: 'agent-1',
        firstName: 'Thabang',
        lastName: 'Sewape',
        email: 'thabang@example.test',
        role: 'agent' as const,
        isOnLeave: false,
        totalLeads: 33,
        convertedClients: 4,
        hotLeads: 5,
        busyLeads: 3,
        callLaterLeads: 2,
        conversionRate: 12.5,
    },
    {
        id: 'agent-2',
        firstName: 'Neo',
        lastName: 'Mahlangu',
        email: 'neo@example.test',
        role: 'sales_agent' as const,
        isOnLeave: true,
        totalLeads: 20,
        convertedClients: 6,
        hotLeads: 2,
        busyLeads: 1,
        callLaterLeads: 4,
        conversionRate: 30,
    },
];

let Screen: ComponentType;
let container: HTMLDivElement;
let root: Root;
let queryClient: QueryClient;

const renderScreen = async () => {
    await act(async () => {
        root.render(
            <QueryClientProvider client={queryClient}>
                <Screen />
            </QueryClientProvider>
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
    });
};

beforeAll(async () => {
    Reflect.set(window, 'IS_REACT_ACT_ENVIRONMENT', true);
    Screen = (await import('../TeamLeadDashboard')).default;
});

beforeEach(() => {
    authState.session = makeSession('team_leader');
    agentsMock.mockReset().mockResolvedValue(agents);
    leaveMock.mockReset().mockResolvedValue({});
    successMock.mockReset();
    errorMock.mockReset();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(async () => {
    await act(async () => root.unmount());
    queryClient.clear();
    container.remove();
});

describe('TeamLeadDashboard', () => {
    it('blocks non-team-leader roles without requesting team data', async () => {
        authState.session = makeSession('agent');
        await renderScreen();
        expect(container.textContent).toContain('Access denied');
        expect(agentsMock).not.toHaveBeenCalled();
    });

    it('shows a focused loading state', async () => {
        agentsMock.mockReturnValue(new Promise(() => undefined));
        await renderScreen();
        expect(container.textContent).toContain('Loading team performance');
        expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    });

    it('shows a retryable API error', async () => {
        agentsMock.mockRejectedValue(new Error('Team service unavailable'));
        await renderScreen();
        await vi.waitFor(() => expect(container.textContent).toContain('Team service unavailable'));
        expect(container.querySelector('[role="alert"]')).not.toBeNull();
        expect(container.textContent).toContain('Retry');
    });

    it('shows an intentional empty state', async () => {
        agentsMock.mockResolvedValue([]);
        await renderScreen();
        await vi.waitFor(() => expect(container.textContent).toContain('No agents assigned'));
    });

    it('renders live summary totals, dense rows and mobile cards', async () => {
        await renderScreen();
        await vi.waitFor(() => expect(container.textContent).toContain('Agent performance'));
        expect(container.textContent).toContain('53');
        expect(container.textContent).toContain('Thabang Sewape');
        expect(container.textContent).toContain('Sales Agent');
        expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
        expect(container.querySelectorAll('.team-dashboard-mobile-list article')).toHaveLength(2);
    });

    it('updates leave status through the existing mutation', async () => {
        await renderScreen();
        await vi.waitFor(() => expect(container.textContent).toContain('Thabang Sewape'));
        const toggle = container.querySelector<HTMLInputElement>(
            'input[aria-label="Thabang Sewape leave status"]'
        );
        await act(async () => toggle?.click());
        await vi.waitFor(() => expect(leaveMock).toHaveBeenCalledWith('agent-1', true));
        expect(successMock).toHaveBeenCalledWith('Agent status changed to On leave');
    });
});
