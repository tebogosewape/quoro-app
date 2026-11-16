// @vitest-environment jsdom

import { act, type ComponentType } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { getSessionStatusMock, getQrCodeMock, resetSessionMock } = vi.hoisted(() => ({
    getSessionStatusMock: vi.fn(),
    getQrCodeMock: vi.fn(),
    resetSessionMock: vi.fn(),
}));

vi.mock('@/api/whatsapp.api', () => ({
    whatsappApi: {
        getSessionStatus: getSessionStatusMock,
        getQrCode: getQrCodeMock,
        resetSession: resetSessionMock,
    },
}));

const connectedSession = {
    id: 'session-1',
    sessionName: 'qfinance-business',
    status: 'connected' as const,
    phoneNumber: '+27 72 605 8688',
    lastConnectedAt: '2026-11-16T18:00:00.000Z',
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-16T18:00:00.000Z',
};

let Screen: ComponentType;
let container: HTMLDivElement;
let root: Root;

const renderScreen = async () => {
    await act(async () => root.render(<Screen />));
    await vi.waitFor(() => expect(getSessionStatusMock).toHaveBeenCalled());
    await act(async () => Promise.resolve());
};

const findButton = (text: string) =>
    Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
        button.textContent?.includes(text)
    );

const click = async (element: Element | null | undefined) => {
    await act(async () => element?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
};

beforeAll(async () => {
    Reflect.set(window, 'IS_REACT_ACT_ENVIRONMENT', true);
    Screen = (await import('../ManageWhatsApp')).default;
});

beforeEach(() => {
    getSessionStatusMock.mockReset().mockResolvedValue({
        data: { session: connectedSession, isReady: true },
    });
    getQrCodeMock.mockReset().mockResolvedValue({ data: { qrCode: null } });
    resetSessionMock.mockReset().mockResolvedValue({ success: true });
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe('ManageWhatsApp', () => {
    it('loads and renders the live connected session', async () => {
        await renderScreen();
        expect(container.textContent).toContain('WhatsApp integration');
        expect(container.textContent).toContain('Connected');
        expect(container.textContent).toContain('+27 72 605 8688');
        expect(container.textContent).toContain('qfinance-business');
        expect(container.textContent).toContain('WhatsApp is connected');
    });

    it('renders QR data locally without an external image request', async () => {
        getSessionStatusMock.mockResolvedValue({
            data: {
                session: { ...connectedSession, status: 'qr_code' },
                isReady: false,
            },
        });
        getQrCodeMock.mockResolvedValue({ data: { qrCode: 'private-session-token' } });
        await renderScreen();
        expect(container.querySelector('.whatsapp-admin__qr-code svg')).not.toBeNull();
        expect(container.querySelector('.whatsapp-admin__qr-code img')).toBeNull();
        expect(container.innerHTML).not.toContain('api.qrserver.com');
        expect(container.textContent).toContain('Scan with the business phone');
    });

    it('shows the waiting state when the service is not ready and has no QR code', async () => {
        getSessionStatusMock.mockResolvedValue({
            data: {
                session: { ...connectedSession, status: 'connecting' },
                isReady: false,
            },
        });
        await renderScreen();
        expect(container.textContent).toContain('Waiting for a QR code');
        expect(container.textContent).toContain('refresh automatically');
    });

    it('shows API errors without discarding the administration screen', async () => {
        getSessionStatusMock.mockRejectedValue({
            response: { data: { message: 'WhatsApp service unavailable' } },
        });
        await renderScreen();
        expect(container.textContent).toContain('WhatsApp service unavailable');
        expect(container.textContent).toContain('Session information');
    });

    it('does not reset the session when confirmation is cancelled', async () => {
        await renderScreen();
        await click(findButton('Reset session'));
        expect(window.confirm).toHaveBeenCalled();
        expect(resetSessionMock).not.toHaveBeenCalled();
    });

    it('resets only after confirmation and moves into reconnecting state', async () => {
        await renderScreen();
        vi.mocked(window.confirm).mockReturnValue(true);
        vi.useFakeTimers();
        await click(findButton('Reset session'));
        await act(async () => Promise.resolve());
        expect(resetSessionMock).toHaveBeenCalledTimes(1);
        expect(container.textContent).toContain('Connecting');
        expect(container.textContent).toContain('Waiting for a QR code');
    });
});
