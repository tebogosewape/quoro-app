import { useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { whatsappApi, type WhatsAppSession } from '@/api/whatsapp.api';
import './ManageWhatsApp.css';

const STATUS_LABELS: Record<WhatsAppSession['status'], string> = {
    connected: 'Connected',
    connecting: 'Connecting',
    qr_code: 'Awaiting QR scan',
    disconnected: 'Disconnected',
    failed: 'Failed',
};

const getErrorMessage = (error: unknown, fallback: string) => {
    if (typeof error === 'object' && error !== null && 'response' in error) {
        const response = (error as { response?: { data?: { message?: string } } }).response;
        if (response?.data?.message) return response.data.message;
    }
    return error instanceof Error && error.message ? error.message : fallback;
};

const formatDateTime = (value?: string) => {
    if (!value) return '-';
    return new Intl.DateTimeFormat('en-ZA', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
};

function StatusBadge({ status }: { status: WhatsAppSession['status'] }) {
    return (
        <span className={`whatsapp-admin__status whatsapp-admin__status--${status}`}>
            <span aria-hidden="true" />
            {STATUS_LABELS[status]}
        </span>
    );
}

export default function ManageWhatsApp() {
    const [session, setSession] = useState<WhatsAppSession | null>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resetting, setResetting] = useState(false);
    const requestInFlight = useRef(false);
    const resetRefreshTimer = useRef<number | null>(null);

    const loadStatus = useCallback(async () => {
        if (requestInFlight.current) return;
        requestInFlight.current = true;

        try {
            const [sessionResponse, qrResponse] = await Promise.all([
                whatsappApi.getSessionStatus(),
                whatsappApi.getQrCode(),
            ]);
            setSession(sessionResponse.data.session);
            setIsReady(sessionResponse.data.isReady);
            setQrCode(qrResponse.data.qrCode);
            setError(null);
        } catch (caughtError: unknown) {
            setError(getErrorMessage(caughtError, 'Failed to load WhatsApp status.'));
        } finally {
            requestInFlight.current = false;
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadStatus();
        const interval = window.setInterval(() => void loadStatus(), 5000);

        return () => {
            window.clearInterval(interval);
            if (resetRefreshTimer.current) window.clearTimeout(resetRefreshTimer.current);
        };
    }, [loadStatus]);

    const handleReset = async () => {
        const confirmed = window.confirm(
            'Are you sure you want to reset the WhatsApp session? You will need to scan the QR code again.'
        );
        if (!confirmed) return;

        setResetting(true);
        setError(null);

        try {
            await whatsappApi.resetSession();
            setSession((current) =>
                current ? { ...current, status: 'connecting', errorMessage: undefined } : current
            );
            setIsReady(false);
            setQrCode(null);
            resetRefreshTimer.current = window.setTimeout(() => void loadStatus(), 2000);
        } catch (caughtError: unknown) {
            setError(getErrorMessage(caughtError, 'Failed to reset the WhatsApp session.'));
        } finally {
            setResetting(false);
        }
    };

    const currentStatus = session?.status ?? 'disconnected';

    return (
        <main className="whatsapp-admin" aria-labelledby="whatsapp-admin-title">
            <header className="whatsapp-admin__header">
                <div className="whatsapp-admin__heading">
                    <span className="whatsapp-admin__mark" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                            <path d="M20.5 11.7a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.4-4.9A8.4 8.4 0 1 1 20.5 11.7Z" />
                            <path d="M8.2 7.8c.2-.4.4-.4.7-.4h.4c.1 0 .3 0 .4.3l.8 2c.1.2 0 .4-.1.6l-.6.8c-.2.2-.1.4 0 .6.7 1.2 1.6 2.1 2.8 2.7.2.1.4.1.6-.1l.9-1.1c.2-.2.4-.2.6-.1l1.9.9c.2.1.4.2.4.4 0 .2-.1 1.2-.6 1.7-.5.6-1.4.9-2.2.9-.7 0-1.7-.2-3.5-1-2.1-.9-3.6-3-3.7-3.2-.1-.2-.9-1.2-.9-2.3 0-1.1.6-2.2 1-2.7Z" />
                        </svg>
                    </span>
                    <div>
                        <p className="whatsapp-admin__eyebrow">Communication administration</p>
                        <h1 id="whatsapp-admin-title">WhatsApp integration</h1>
                        <p>Monitor the business session and reconnect it when required.</p>
                    </div>
                </div>
                {loading && !session ? (
                    <span className="whatsapp-admin__loading-label" role="status">
                        <span className="whatsapp-admin__spinner" aria-hidden="true" />
                        Checking status
                    </span>
                ) : (
                    <StatusBadge status={currentStatus} />
                )}
            </header>

            {error && (
                <div className="whatsapp-admin__notice whatsapp-admin__notice--error" role="alert">
                    <span>{error}</span>
                    <button type="button" onClick={() => setError(null)}>
                        Dismiss
                    </button>
                </div>
            )}

            <div className="whatsapp-admin__workspace">
                <section className="whatsapp-admin__panel" aria-labelledby="session-info-title">
                    <div className="whatsapp-admin__panel-heading">
                        <div>
                            <h2 id="session-info-title">Session information</h2>
                            <p>Live connection details, refreshed every five seconds</p>
                        </div>
                        {!loading && session && <StatusBadge status={session.status} />}
                    </div>

                    <div className="whatsapp-admin__panel-body">
                        {loading && !session ? (
                            <div className="whatsapp-admin__state" role="status">
                                <span className="whatsapp-admin__spinner" aria-hidden="true" />
                                Loading session information…
                            </div>
                        ) : session ? (
                            <dl className="whatsapp-admin__details">
                                <div>
                                    <dt>Phone number</dt>
                                    <dd>{session.phoneNumber || 'Not connected'}</dd>
                                </div>
                                <div>
                                    <dt>Session name</dt>
                                    <dd>{session.sessionName}</dd>
                                </div>
                                <div>
                                    <dt>Last connected</dt>
                                    <dd>{formatDateTime(session.lastConnectedAt)}</dd>
                                </div>
                                <div>
                                    <dt>Last disconnected</dt>
                                    <dd>{formatDateTime(session.lastDisconnectedAt)}</dd>
                                </div>
                                {session.errorMessage && (
                                    <div className="whatsapp-admin__detail-error">
                                        <dt>Session error</dt>
                                        <dd>{session.errorMessage}</dd>
                                    </div>
                                )}
                            </dl>
                        ) : (
                            <div className="whatsapp-admin__state">
                                No session information is currently available.
                            </div>
                        )}
                    </div>

                    <footer className="whatsapp-admin__panel-footer">
                        <p>Reset only when reconnection or a new QR code is required.</p>
                        <button
                            type="button"
                            className="whatsapp-admin__reset"
                            onClick={handleReset}
                            disabled={resetting || loading}
                        >
                            {resetting ? 'Resetting…' : 'Reset session'}
                        </button>
                    </footer>
                </section>

                <section className="whatsapp-admin__panel" aria-labelledby="qr-code-title">
                    <div className="whatsapp-admin__panel-heading">
                        <div>
                            <h2 id="qr-code-title">Device connection</h2>
                            <p>Link the approved WhatsApp Business phone</p>
                        </div>
                    </div>

                    <div className="whatsapp-admin__qr-body">
                        {loading && !session ? (
                            <div className="whatsapp-admin__state" role="status">
                                <span className="whatsapp-admin__spinner" aria-hidden="true" />
                                Checking for a QR code…
                            </div>
                        ) : qrCode ? (
                            <div className="whatsapp-admin__qr-layout">
                                <div
                                    className="whatsapp-admin__qr-code"
                                    aria-label="WhatsApp connection QR code"
                                >
                                    <QRCodeSVG
                                        value={qrCode}
                                        size={220}
                                        level="M"
                                        marginSize={1}
                                        title="WhatsApp connection QR code"
                                    />
                                </div>
                                <div className="whatsapp-admin__instructions">
                                    <strong>Scan with the business phone</strong>
                                    <ol>
                                        <li>Open WhatsApp on the phone.</li>
                                        <li>Open Settings or Menu.</li>
                                        <li>Select Linked devices.</li>
                                        <li>Select Link a device and scan this code.</li>
                                    </ol>
                                    <p>The code expires after a few minutes.</p>
                                </div>
                            </div>
                        ) : isReady ? (
                            <div className="whatsapp-admin__connection-state whatsapp-admin__connection-state--success">
                                <span aria-hidden="true">✓</span>
                                <div>
                                    <strong>WhatsApp is connected</strong>
                                    <p>The session is active and ready for messaging.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="whatsapp-admin__connection-state whatsapp-admin__connection-state--waiting">
                                <span aria-hidden="true">…</span>
                                <div>
                                    <strong>Waiting for a QR code</strong>
                                    <p>
                                        The service is connecting. The page will refresh
                                        automatically.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            <section className="whatsapp-admin__help" aria-labelledby="whatsapp-help-title">
                <div>
                    <h2 id="whatsapp-help-title">Operational guidance</h2>
                    <p>The integration uses WhatsApp Web to send and receive client messages.</p>
                </div>
                <ul>
                    <li>Keep the approved business phone online with a stable connection.</li>
                    <li>Reset the session if the QR code expires or messages stop sending.</li>
                    <li>Confirm the status is Connected before investigating message failures.</li>
                </ul>
                <p className="whatsapp-admin__security">
                    Session linking and reset access is restricted to the Chief Executive Officer
                    role. QR data is generated locally in this browser and is not sent to an
                    external QR service.
                </p>
            </section>
        </main>
    );
}
