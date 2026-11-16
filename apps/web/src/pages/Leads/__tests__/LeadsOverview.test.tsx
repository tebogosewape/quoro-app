// @vitest-environment jsdom

import { act, type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { getLeadsMock } = vi.hoisted(() => ({
    getLeadsMock: vi.fn(),
}));

vi.mock('@/api/leads.api', () => ({
    getLeads: getLeadsMock,
    formatPhoneNumber: (value: string) => value,
}));

const lead = {
    id: 'lead-1',
    timeReceived: '2026-11-16T09:30:00.000Z',
    franchise: 'Pretoria Central',
    name: 'Naledi Mokoena',
    cell: '0821234567',
    idNumber: '9001015009087',
    affiliate: 'Website',
    message: 'Please call me',
    allocatedTo: 'Lindiwe Dlamini',
    leadOutcome: 'Not Processed',
    createdAt: '2026-11-16T09:30:00.000Z',
    updatedAt: '2026-11-16T09:30:00.000Z',
};

const successResponse = {
    leads: [lead],
    total: 41,
    page: 1,
    limit: 20,
    totalPages: 3,
};

let LeadsOverview: ComponentType;
let container: HTMLDivElement;
let root: Root;

const LocationProbe = () => {
    const location = useLocation();
    return <output data-testid="location">{location.pathname}</output>;
};

const renderScreen = async () => {
    await act(async () => {
        root.render(
            <MemoryRouter initialEntries={['/leads']}>
                <LeadsOverview />
                <LocationProbe />
            </MemoryRouter>
        );
    });
};

const changeValue = async (control: HTMLInputElement, value: string) => {
    await act(async () => {
        const setter = Object.getOwnPropertyDescriptor(
            Object.getPrototypeOf(control),
            'value'
        )?.set;
        setter?.call(control, value);
        control.dispatchEvent(new Event('change', { bubbles: true }));
    });
};

beforeAll(async () => {
    Reflect.set(window, 'IS_REACT_ACT_ENVIRONMENT', true);
    LeadsOverview = (await import('../LeadsOverview')).default;
});

beforeEach(() => {
    getLeadsMock.mockReset().mockResolvedValue(successResponse);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
});

describe('LeadsOverview', () => {
    it('renders live lead data in compact desktop and mobile presentations', async () => {
        await renderScreen();

        await vi.waitFor(() => expect(container.textContent).toContain('Naledi Mokoena'));
        expect(container.textContent).toContain('Pretoria Central');
        expect(container.textContent).toContain('Lindiwe Dlamini');
        expect(container.textContent).toContain('41');
        expect(container.querySelector('.leads-overview-table')).not.toBeNull();
        expect(container.querySelector('.leads-overview-mobile-list')).not.toBeNull();
        expect(
            container.querySelector('.leads-overview-stat--pending strong')?.textContent
        ).toBe('1');
        expect(getLeadsMock).toHaveBeenCalledWith({
            page: 1,
            limit: 20,
            search: undefined,
            franchise: undefined,
            affiliate: undefined,
            leadOutcome: undefined,
            sortBy: 'timeReceived',
            sortOrder: 'DESC',
        });
    });

    it('preserves server-side franchise filtering', async () => {
        await renderScreen();
        await vi.waitFor(() => expect(container.textContent).toContain('Naledi Mokoena'));

        const franchise = container.querySelector<HTMLSelectElement>('#lead-franchise');
        await act(async () => {
            if (!franchise) throw new Error('Franchise filter not rendered');
            franchise.value = 'Pretoria Central';
            franchise.dispatchEvent(new Event('change', { bubbles: true }));
        });

        await vi.waitFor(() =>
            expect(getLeadsMock).toHaveBeenLastCalledWith(
                expect.objectContaining({ franchise: 'Pretoria Central', page: 1 })
            )
        );
    });

    it('applies search only when the user submits the compact toolbar', async () => {
        await renderScreen();
        await vi.waitFor(() => expect(container.textContent).toContain('Naledi Mokoena'));

        const initialCalls = getLeadsMock.mock.calls.length;
        const search = container.querySelector<HTMLInputElement>('#lead-search');
        if (!search) throw new Error('Lead search not rendered');
        await changeValue(search, 'Naledi');
        expect(getLeadsMock).toHaveBeenCalledTimes(initialCalls);

        const submit = Array.from(container.querySelectorAll('button')).find(
            (button) => button.textContent?.trim() === 'Search'
        );
        await act(async () => submit?.click());

        await vi.waitFor(() =>
            expect(getLeadsMock).toHaveBeenLastCalledWith(
                expect.objectContaining({ search: 'Naledi', page: 1 })
            )
        );
    });

    it('navigates to the existing import workflow', async () => {
        await renderScreen();
        await vi.waitFor(() => expect(container.textContent).toContain('Naledi Mokoena'));

        const importButton = Array.from(container.querySelectorAll('button')).find(
            (button) => button.textContent?.trim() === 'Import leads'
        );
        await act(async () => importButton?.click());

        expect(container.querySelector('[data-testid="location"]')?.textContent).toBe(
            '/leads/import'
        );
    });

    it('shows accessible loading and empty states', async () => {
        let resolveRequest: ((value: typeof successResponse) => void) | undefined;
        getLeadsMock.mockReturnValueOnce(
            new Promise((resolve) => {
                resolveRequest = resolve;
            })
        );

        await renderScreen();
        expect(container.querySelector('[aria-label="Loading leads"]')).not.toBeNull();

        await act(async () => {
            resolveRequest?.({ ...successResponse, leads: [], total: 0, totalPages: 0 });
        });
        await vi.waitFor(() => expect(container.textContent).toContain('No leads found'));
    });

    it('shows a useful API error without rendering an empty state', async () => {
        getLeadsMock.mockRejectedValueOnce(new Error('Network error'));
        await renderScreen();

        await vi.waitFor(() => expect(container.querySelector('[role="alert"]')).not.toBeNull());
        expect(container.textContent).toContain('Network connection error');
        expect(container.textContent).not.toContain('No leads found');
    });

    it('requests the next server page from the compact paginator', async () => {
        await renderScreen();
        await vi.waitFor(() => expect(container.textContent).toContain('Naledi Mokoena'));

        const next = container.querySelector<HTMLButtonElement>('[aria-label="Next page"]');
        await act(async () => next?.click());

        await vi.waitFor(() =>
            expect(getLeadsMock).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }))
        );
    });
});
