// @vitest-environment jsdom

import { act, type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { getClientsMock, hasPermissionMock } = vi.hoisted(() => ({
    getClientsMock: vi.fn(),
    hasPermissionMock: vi.fn(),
}));

vi.mock('@/api/clients.api', async () => {
    const { z } = await import('zod');
    return {
        getClients: getClientsMock,
        clientStatusEnum: z.enum([
            'lead',
            'consultation_scheduled',
            'documentation_pending',
            'under_review',
            'approved',
            'rejected',
            'active',
            'completed',
            'withdrawn',
        ]),
    };
});

vi.mock('@/utils/permissions', () => ({
    hasPermission: hasPermissionMock,
}));

let ClientsOverview: ComponentType;
let container: HTMLDivElement;
let root: Root;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

const client = {
    id: 'b5a51cf3-aae8-4187-99b6-5e7b134df34e',
    fileReference: 'QFN000003',
    firstName: 'Naledi',
    lastName: 'Mokoena',
    phoneNumber: '0821234567',
    email: 'naledi@example.test',
    idNumber: '9001015009087',
    status: 'active',
    totalDebt: 12500,
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-14T08:00:00.000Z',
    assignedAgent: { firstName: 'Lindiwe', lastName: 'Dlamini' },
    clientProducts: [{ productName: 'Debt counselling' }],
};

const successResponse = {
    data: [client],
    meta: { total: 1, page: 1, limit: 12, totalPages: 1 },
};

const LocationProbe = () => {
    const location = useLocation();
    return <output data-testid="location">{location.pathname}</output>;
};

const renderScreen = async () => {
    await act(async () => {
        root.render(
            <MemoryRouter initialEntries={['/clients']}>
                <ClientsOverview />
                <LocationProbe />
            </MemoryRouter>
        );
    });
};

beforeAll(async () => {
    Reflect.set(window, 'IS_REACT_ACT_ENVIRONMENT', true);
    ClientsOverview = (await import('../ClientsOverview')).default;
});

beforeEach(() => {
    getClientsMock.mockReset().mockResolvedValue(successResponse);
    hasPermissionMock.mockReset().mockReturnValue(true);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    consoleErrorSpy.mockRestore();
});

describe('ClientsOverview', () => {
    it('loads live clients and preserves their mapped business data', async () => {
        await renderScreen();

        await vi.waitFor(() => expect(container.textContent).toContain('Naledi Mokoena'));
        expect(container.textContent).toContain('Debt counselling');
        expect(container.textContent).toContain('Lindiwe Dlamini');
        expect(container.textContent).toContain('QFN000003');
        expect(container.textContent).not.toContain(client.id);
        expect(container.textContent).toContain('12 500');
        expect(getClientsMock).toHaveBeenCalledWith({
            page: 1,
            limit: 12,
            search: undefined,
            status: undefined,
        });
    });

    it('shows accessible loading and empty states', async () => {
        let resolveRequest: ((value: typeof successResponse) => void) | undefined;
        getClientsMock.mockReturnValueOnce(
            new Promise((resolve) => {
                resolveRequest = resolve;
            })
        );

        await renderScreen();
        expect(container.querySelector('[aria-label="Loading clients"]')).not.toBeNull();

        await act(async () => {
            resolveRequest?.({
                data: [],
                meta: { total: 0, page: 1, limit: 12, totalPages: 0 },
            });
        });
        await vi.waitFor(() => expect(container.textContent).toContain('No clients found'));
    });

    it('preserves server-side status filtering', async () => {
        await renderScreen();
        await vi.waitFor(() => expect(container.textContent).toContain('Naledi Mokoena'));

        const statusSelect = container.querySelector('select');
        await act(async () => {
            if (!statusSelect) throw new Error('Status filter not rendered');
            statusSelect.value = 'active';
            statusSelect.dispatchEvent(new Event('change', { bubbles: true }));
        });

        await vi.waitFor(() =>
            expect(getClientsMock).toHaveBeenLastCalledWith(
                expect.objectContaining({ status: 'active' })
            )
        );
    });

    it('navigates to the selected client', async () => {
        await renderScreen();
        await vi.waitFor(() => expect(container.textContent).toContain('Naledi Mokoena'));

        const openButton = Array.from(container.querySelectorAll('button')).find(
            (button) => button.textContent?.trim() === 'Open'
        );
        await act(async () => openButton?.click());

        expect(container.querySelector('[data-testid="location"]')?.textContent).toBe(
            `/clients/${client.id}`
        );
    });

    it('retries a failed page-one request', async () => {
        getClientsMock.mockRejectedValueOnce(new Error('Network error'));
        await renderScreen();

        await vi.waitFor(() => expect(container.querySelector('[role="alert"]')).not.toBeNull());
        getClientsMock.mockResolvedValue(successResponse);
        const retryButton = Array.from(container.querySelectorAll('button')).find(
            (button) => button.textContent?.trim() === 'Retry'
        );
        await act(async () => retryButton?.click());

        await vi.waitFor(() => expect(container.textContent).toContain('Naledi Mokoena'));
        expect(getClientsMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('shows the New client action only when creation is permitted', async () => {
        await renderScreen();
        await vi.waitFor(() => expect(container.textContent).toContain('New client'));

        const createButton = Array.from(container.querySelectorAll('button')).find(
            (button) => button.textContent?.trim() === 'New client'
        );
        await act(async () => createButton?.click());
        expect(container.querySelector('[data-testid="location"]')?.textContent).toBe(
            '/clients/new'
        );
    });

    it('hides the New client action without creation permission', async () => {
        hasPermissionMock.mockReturnValue(false);
        await renderScreen();

        await vi.waitFor(() => expect(container.textContent).toContain('Clients Overview'));
        expect(container.textContent).not.toContain('New client');
    });
});
