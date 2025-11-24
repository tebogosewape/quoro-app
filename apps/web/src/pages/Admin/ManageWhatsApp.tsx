import { useState, useEffect } from 'react';
import { Card, Button, Spinner, Alert } from 'react-bootstrap';
import { whatsappApi, type WhatsAppSession } from '@/api/whatsapp.api';

// Simple QR Code component using an external service
function QRCode({ value, size = 256 }: { value: string; size?: number }) {
    // Use a QR code generation service
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;

    return (
        <img src={qrUrl} alt="QR Code" width={size} height={size} style={{ display: 'block' }} />
    );
}

export default function ManageWhatsApp() {
    const [session, setSession] = useState<WhatsAppSession | null>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resetting, setResetting] = useState(false);

    useEffect(() => {
        loadStatus();
        // Poll for status every 5 seconds
        const interval = setInterval(loadStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const loadStatus = async () => {
        try {
            const [sessionResponse, qrResponse] = await Promise.all([
                whatsappApi.getSessionStatus(),
                whatsappApi.getQrCode(),
            ]);

            setSession(sessionResponse.data.session);
            setIsReady(sessionResponse.data.isReady);
            setQrCode(qrResponse.data.qrCode);
            setError(null);
        } catch (err: any) {
            console.error('Failed to load WhatsApp status:', err);
            setError(err?.response?.data?.message || 'Failed to load status');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        if (
            !confirm(
                'Are you sure you want to reset the WhatsApp session? You will need to scan the QR code again.'
            )
        ) {
            return;
        }

        setResetting(true);
        setError(null);

        try {
            await whatsappApi.resetSession();
            // Reload status after a short delay
            setTimeout(loadStatus, 2000);
        } catch (err: any) {
            console.error('Failed to reset WhatsApp session:', err);
            setError(err?.response?.data?.message || 'Failed to reset session');
        } finally {
            setResetting(false);
        }
    };

    const getStatusBadge = () => {
        if (!session) return null;

        const statusConfig = {
            connected: { variant: 'success', text: 'Connected' },
            connecting: { variant: 'info', text: 'Connecting...' },
            qr_code: { variant: 'warning', text: 'Awaiting QR Scan' },
            disconnected: { variant: 'secondary', text: 'Disconnected' },
            failed: { variant: 'danger', text: 'Failed' },
        };

        const config = statusConfig[session.status] || statusConfig.disconnected;

        return (
            <span className={`badge bg-${config.variant}`} style={{ fontSize: '1rem' }}>
                {config.text}
            </span>
        );
    };

    return (
        <div className="container-fluid px-4 py-4">
            {/* Header */}
            <div
                className="card border-0 shadow-sm mb-4"
                style={{
                    background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                }}
            >
                <div className="card-body p-4">
                    <div className="row align-items-center">
                        <div className="col-md-6">
                            <div className="d-flex align-items-center gap-3">
                                <div
                                    className="bg-white text-success rounded-circle d-flex align-items-center justify-content-center"
                                    style={{ width: 64, height: 64 }}
                                >
                                    <i className="bi bi-whatsapp" style={{ fontSize: '2rem' }}></i>
                                </div>
                                <div>
                                    <h2 className="text-white mb-1 fw-bold">WhatsApp Management</h2>
                                    <p className="text-white text-opacity-75 mb-0">
                                        Manage WhatsApp Business integration and session
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6 text-md-end mt-3 mt-md-0">
                            {loading ? (
                                <Spinner animation="border" variant="light" />
                            ) : (
                                getStatusBadge()
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <Alert variant="danger" dismissible onClose={() => setError(null)}>
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {error}
                </Alert>
            )}

            <div className="row g-4">
                {/* Session Status Card */}
                <div className="col-lg-6">
                    <Card className="h-100">
                        <Card.Header className="bg-light">
                            <h5 className="mb-0">
                                <i className="bi bi-info-circle me-2"></i>
                                Session Information
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            {loading ? (
                                <div className="text-center py-5">
                                    <Spinner animation="border" />
                                    <p className="mt-3 text-muted">
                                        Loading session information...
                                    </p>
                                </div>
                            ) : session ? (
                                <>
                                    <table className="table table-borderless mb-4">
                                        <tbody>
                                            <tr>
                                                <td className="text-muted" style={{ width: '40%' }}>
                                                    <strong>Status:</strong>
                                                </td>
                                                <td>{getStatusBadge()}</td>
                                            </tr>
                                            <tr>
                                                <td className="text-muted">
                                                    <strong>Phone Number:</strong>
                                                </td>
                                                <td>{session.phoneNumber || 'Not connected'}</td>
                                            </tr>
                                            <tr>
                                                <td className="text-muted">
                                                    <strong>Session Name:</strong>
                                                </td>
                                                <td>{session.sessionName}</td>
                                            </tr>
                                            {session.lastConnectedAt && (
                                                <tr>
                                                    <td className="text-muted">
                                                        <strong>Last Connected:</strong>
                                                    </td>
                                                    <td>
                                                        {new Date(
                                                            session.lastConnectedAt
                                                        ).toLocaleString()}
                                                    </td>
                                                </tr>
                                            )}
                                            {session.lastDisconnectedAt && (
                                                <tr>
                                                    <td className="text-muted">
                                                        <strong>Last Disconnected:</strong>
                                                    </td>
                                                    <td>
                                                        {new Date(
                                                            session.lastDisconnectedAt
                                                        ).toLocaleString()}
                                                    </td>
                                                </tr>
                                            )}
                                            {session.errorMessage && (
                                                <tr>
                                                    <td className="text-muted">
                                                        <strong>Error:</strong>
                                                    </td>
                                                    <td className="text-danger">
                                                        {session.errorMessage}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>

                                    <div className="d-grid gap-2">
                                        <Button
                                            variant="danger"
                                            onClick={handleReset}
                                            disabled={resetting}
                                        >
                                            {resetting ? (
                                                <>
                                                    <Spinner
                                                        animation="border"
                                                        size="sm"
                                                        className="me-2"
                                                    />
                                                    Resetting...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-arrow-clockwise me-2"></i>
                                                    Reset Session
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <Alert variant="warning">
                                    <i className="bi bi-exclamation-triangle me-2"></i>
                                    No session information available
                                </Alert>
                            )}
                        </Card.Body>
                    </Card>
                </div>

                {/* QR Code Card */}
                <div className="col-lg-6">
                    <Card className="h-100">
                        <Card.Header className="bg-light">
                            <h5 className="mb-0">
                                <i className="bi bi-qr-code me-2"></i>
                                QR Code
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            {loading ? (
                                <div className="text-center py-5">
                                    <Spinner animation="border" />
                                    <p className="mt-3 text-muted">Loading QR code...</p>
                                </div>
                            ) : qrCode ? (
                                <div className="text-center">
                                    <div className="bg-white p-3 d-inline-block rounded border">
                                        <QRCode value={qrCode} size={256} />
                                    </div>
                                    <Alert variant="info" className="mt-3">
                                        <i className="bi bi-info-circle me-2"></i>
                                        <strong>Scan this QR code</strong> with your WhatsApp mobile
                                        app to connect:
                                        <ol className="mt-2 mb-0 text-start">
                                            <li>Open WhatsApp on your phone</li>
                                            <li>Tap Menu or Settings</li>
                                            <li>
                                                Tap <strong>Linked Devices</strong>
                                            </li>
                                            <li>
                                                Tap <strong>Link a Device</strong>
                                            </li>
                                            <li>
                                                Point your phone at this screen to scan the code
                                            </li>
                                        </ol>
                                    </Alert>
                                </div>
                            ) : isReady ? (
                                <Alert variant="success">
                                    <i className="bi bi-check-circle me-2"></i>
                                    <strong>WhatsApp is connected!</strong>
                                    <p className="mb-0 mt-2">
                                        Your WhatsApp session is active. You can now send and
                                        receive messages through the system.
                                    </p>
                                </Alert>
                            ) : (
                                <Alert variant="warning">
                                    <i className="bi bi-exclamation-triangle me-2"></i>
                                    <strong>No QR code available</strong>
                                    <p className="mb-0 mt-2">
                                        WhatsApp is connecting. Please wait a moment for the QR code
                                        to appear, or try resetting the session.
                                    </p>
                                </Alert>
                            )}
                        </Card.Body>
                    </Card>
                </div>
            </div>

            {/* Help Card */}
            <Card className="mt-4">
                <Card.Header className="bg-light">
                    <h5 className="mb-0">
                        <i className="bi bi-question-circle me-2"></i>
                        Help & Information
                    </h5>
                </Card.Header>
                <Card.Body>
                    <h6>About WhatsApp Integration</h6>
                    <p>
                        This system uses WhatsApp Web to send and receive messages to clients. The
                        business phone number <strong>+27 72 605 8688</strong> is used as the sender
                        for all outbound messages.
                    </p>

                    <h6 className="mt-4">Troubleshooting</h6>
                    <ul>
                        <li>
                            If the QR code doesn't appear, try refreshing the page or resetting the
                            session.
                        </li>
                        <li>
                            Make sure the phone with the business WhatsApp account has a stable
                            internet connection.
                        </li>
                        <li>
                            If messages aren't sending, check that the session status shows
                            "Connected".
                        </li>
                        <li>
                            The QR code expires after a few minutes. If it's not working, reset the
                            session to generate a new one.
                        </li>
                    </ul>

                    <Alert variant="info" className="mt-3">
                        <i className="bi bi-shield-check me-2"></i>
                        <strong>Security Note:</strong> Only users with the CEO role can access this
                        page and manage the WhatsApp session.
                    </Alert>
                </Card.Body>
            </Card>
        </div>
    );
}
