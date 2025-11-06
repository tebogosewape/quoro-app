import { useEffect, useMemo, useState } from 'react';
import { Card, Button, Form, InputGroup, Spinner, Alert, Row, Col } from 'react-bootstrap';
import * as Yup from 'yup';
import { Formik, Form as FormikForm, Field, ErrorMessage } from 'formik';
import { fetchCommission, updateCommission } from '@/api/commission';
import { hasPermission } from '@/utils/permissions';
import { useAuthStore } from '@/stores/auth.store';

const schema = Yup.object({
    percentage: Yup.number()
        .typeError('Enter a number')
        .min(0, 'Must be ≥ 0')
        .max(100, 'Must be ≤ 100')
        .required('Required'),
});

export default function CommissionSettings() {
    const session = useAuthStore((s) => s.session);
    const canView = hasPermission('view-commissions');
    const canManage = hasPermission('manage-commissions');

    const [loading, setLoading] = useState(true);
    const [initial, setInitial] = useState<number>(10);
    const [error, setError] = useState<string>('');
    const [saved, setSaved] = useState<string>('');

    useEffect(() => {
        let mounted = true;
        setError('');
        if (!canView && !canManage) {
            setLoading(false);
            return;
        }
        (async () => {
            try {
                const data = await fetchCommission();
                if (mounted) {
                    setInitial(data.percentage ?? 10);
                }
            } catch (e: any) {
                if (mounted) setError(e?.message || 'Failed to load commission');
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [session?.user?.id, canView, canManage]);

    const headerNote = useMemo(() => {
        if (canManage) return 'Configure the global commission percentage for all agents';
        if (canView) return 'View the current global agent commission percentage';
        return 'You do not have permission to view this setting.';
    }, [canManage, canView]);

    if (!canView && !canManage) {
        return (
            <div className="container-fluid px-4 py-4">
                {/* Modern Header Card with Gradient */}
                <div
                    className="card border-0 shadow-sm mb-4"
                    style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: '16px',
                    }}
                >
                    <div className="card-body p-4">
                        <div className="d-flex align-items-center">
                            <div
                                className="bg-white bg-opacity-25 rounded-3 p-3 me-3"
                                style={{ backdropFilter: 'blur(10px)' }}
                            >
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                                    <text
                                        x="12"
                                        y="18"
                                        fontSize="20"
                                        fontWeight="bold"
                                        textAnchor="middle"
                                        fill="white"
                                    >
                                        R
                                    </text>
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-white mb-1 fw-bold">Commission Settings</h2>
                                <p className="text-white text-opacity-75 mb-0">{headerNote}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Permission Error Card */}
                <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                    <div className="card-body p-4">
                        <div className="text-center py-4">
                            <div
                                className="bg-warning bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                                style={{ width: '80px', height: '80px' }}
                            >
                                <svg
                                    width="40"
                                    height="40"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="#ffc107"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                    <line x1="12" y1="9" x2="12" y2="13"></line>
                                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                </svg>
                            </div>
                            <h5 className="mb-2">Permission Required</h5>
                            <p className="text-muted mb-3">
                                You need one of the following permissions to view this page:
                            </p>
                            <div className="d-flex gap-2 justify-content-center">
                                <code className="bg-light px-3 py-2 rounded">view-commissions</code>
                                <span className="text-muted">or</span>
                                <code className="bg-light px-3 py-2 rounded">
                                    manage-commissions
                                </code>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid px-4 py-4">
            {/* Modern Header Card with Gradient */}
            <div
                className="card border-0 shadow-sm mb-4"
                style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '16px',
                }}
            >
                <div className="card-body p-4">
                    <div className="row align-items-center">
                        <div className="col-md-8">
                            <div className="d-flex align-items-center">
                                <div
                                    className="bg-white bg-opacity-25 rounded-3 p-3 me-3"
                                    style={{ backdropFilter: 'blur(10px)' }}
                                >
                                    <svg
                                        width="32"
                                        height="32"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="white"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <line x1="12" y1="1" x2="12" y2="23"></line>
                                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-white mb-1 fw-bold">Commission Settings</h2>
                                    <p className="text-white text-opacity-75 mb-0">{headerNote}</p>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="text-white text-center">
                                <div className="fs-2 fw-bold">{initial}%</div>
                                <div className="small opacity-75">Current Commission Rate</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Settings Card */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                <div className="card-body p-4">
                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner
                                animation="border"
                                style={{ width: '3rem', height: '3rem', color: '#667eea' }}
                            />
                            <p className="text-muted mt-3 mb-0">Loading commission settings...</p>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <Alert
                                    variant="danger"
                                    onClose={() => setError('')}
                                    dismissible
                                    className="d-flex align-items-center shadow-sm"
                                    style={{ borderRadius: '8px' }}
                                >
                                    <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="me-2"
                                    >
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="15" y1="9" x2="9" y2="15"></line>
                                        <line x1="9" y1="9" x2="15" y2="15"></line>
                                    </svg>
                                    {error}
                                </Alert>
                            )}
                            {saved && (
                                <Alert
                                    variant="success"
                                    onClose={() => setSaved('')}
                                    dismissible
                                    className="d-flex align-items-center shadow-sm"
                                    style={{ borderRadius: '8px' }}
                                >
                                    <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="me-2"
                                    >
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                    </svg>
                                    {saved}
                                </Alert>
                            )}

                            <Formik
                                enableReinitialize
                                initialValues={{ percentage: initial }}
                                validationSchema={schema}
                                onSubmit={async (values, helpers) => {
                                    setError('');
                                    setSaved('');
                                    try {
                                        if (!canManage) return; // silent guard
                                        const result = await updateCommission(values.percentage);
                                        setInitial(result.percentage);
                                        setSaved('Commission updated successfully.');
                                    } catch (e: any) {
                                        setError(e?.message || 'Failed to update commission');
                                    } finally {
                                        helpers.setSubmitting(false);
                                    }
                                }}
                            >
                                {({ isSubmitting, values, setFieldValue }) => (
                                    <FormikForm>
                                        <Row>
                                            <Col md={6}>
                                                <div className="mb-4">
                                                    <Form.Label className="fw-semibold mb-2">
                                                        <svg
                                                            width="18"
                                                            height="18"
                                                            viewBox="0 0 24 24"
                                                            fill="currentColor"
                                                            className="me-2"
                                                            style={{ marginTop: '-3px' }}
                                                        >
                                                            <text
                                                                x="12"
                                                                y="18"
                                                                fontSize="18"
                                                                fontWeight="bold"
                                                                textAnchor="middle"
                                                                fill="currentColor"
                                                            >
                                                                R
                                                            </text>
                                                        </svg>
                                                        Agent Commission Percentage
                                                    </Form.Label>
                                                    <InputGroup
                                                        className="shadow-sm"
                                                        style={{ maxWidth: 400 }}
                                                    >
                                                        <InputGroup.Text
                                                            className="bg-light"
                                                            style={{ borderRadius: '8px 0 0 8px' }}
                                                        >
                                                            <svg
                                                                width="18"
                                                                height="18"
                                                                viewBox="0 0 24 24"
                                                                fill="currentColor"
                                                            >
                                                                <text
                                                                    x="12"
                                                                    y="18"
                                                                    fontSize="18"
                                                                    fontWeight="bold"
                                                                    textAnchor="middle"
                                                                    fill="currentColor"
                                                                >
                                                                    R
                                                                </text>
                                                            </svg>
                                                        </InputGroup.Text>
                                                        <Field
                                                            as={Form.Control}
                                                            name="percentage"
                                                            type="number"
                                                            step="0.1"
                                                            min={0}
                                                            max={100}
                                                            placeholder="e.g. 10"
                                                            disabled={!canManage}
                                                            onWheel={(e: any) =>
                                                                e.currentTarget.blur()
                                                            }
                                                            className="border-start-0 border-end-0"
                                                            style={{
                                                                fontSize: '1.1rem',
                                                                fontWeight: 500,
                                                            }}
                                                        />
                                                        <InputGroup.Text
                                                            className="bg-light fw-semibold"
                                                            style={{ borderRadius: '0 8px 8px 0' }}
                                                        >
                                                            %
                                                        </InputGroup.Text>
                                                    </InputGroup>
                                                    <div className="mt-2">
                                                        <small className="text-muted">
                                                            <svg
                                                                width="14"
                                                                height="14"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="2"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                className="me-1"
                                                                style={{ marginTop: '-2px' }}
                                                            >
                                                                <circle
                                                                    cx="12"
                                                                    cy="12"
                                                                    r="10"
                                                                ></circle>
                                                                <line
                                                                    x1="12"
                                                                    y1="16"
                                                                    x2="12"
                                                                    y2="12"
                                                                ></line>
                                                                <line
                                                                    x1="12"
                                                                    y1="8"
                                                                    x2="12.01"
                                                                    y2="8"
                                                                ></line>
                                                            </svg>
                                                            Default is <b>10%</b>. Decimal values
                                                            are allowed (e.g. 12.5)
                                                        </small>
                                                    </div>
                                                    <ErrorMessage
                                                        name="percentage"
                                                        render={(msg) => (
                                                            <div className="text-danger mt-2 small">
                                                                <svg
                                                                    width="14"
                                                                    height="14"
                                                                    viewBox="0 0 24 24"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    strokeWidth="2"
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    className="me-1"
                                                                >
                                                                    <circle
                                                                        cx="12"
                                                                        cy="12"
                                                                        r="10"
                                                                    ></circle>
                                                                    <line
                                                                        x1="15"
                                                                        y1="9"
                                                                        x2="9"
                                                                        y2="15"
                                                                    ></line>
                                                                    <line
                                                                        x1="9"
                                                                        y1="9"
                                                                        x2="15"
                                                                        y2="15"
                                                                    ></line>
                                                                </svg>
                                                                {msg}
                                                            </div>
                                                        )}
                                                    />
                                                </div>

                                                {canManage ? (
                                                    <div className="d-flex gap-2">
                                                        <Button
                                                            type="submit"
                                                            disabled={isSubmitting}
                                                            className="shadow-sm px-4"
                                                            style={{
                                                                borderRadius: '8px',
                                                                background:
                                                                    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                                border: 'none',
                                                            }}
                                                        >
                                                            {isSubmitting ? (
                                                                <>
                                                                    <Spinner
                                                                        animation="border"
                                                                        size="sm"
                                                                        className="me-2"
                                                                    />
                                                                    Saving...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <svg
                                                                        width="18"
                                                                        height="18"
                                                                        viewBox="0 0 24 24"
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        strokeWidth="2"
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        className="me-2"
                                                                        style={{
                                                                            marginTop: '-3px',
                                                                        }}
                                                                    >
                                                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                                                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                                                        <polyline points="7 3 7 8 15 8"></polyline>
                                                                    </svg>
                                                                    Save Changes
                                                                </>
                                                            )}
                                                        </Button>
                                                        <Button
                                                            variant="outline-secondary"
                                                            type="button"
                                                            disabled={isSubmitting}
                                                            onClick={() =>
                                                                setFieldValue('percentage', initial)
                                                            }
                                                            className="shadow-sm px-4"
                                                            style={{ borderRadius: '8px' }}
                                                        >
                                                            <svg
                                                                width="18"
                                                                height="18"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="2"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                className="me-2"
                                                                style={{ marginTop: '-3px' }}
                                                            >
                                                                <polyline points="1 4 1 10 7 10"></polyline>
                                                                <polyline points="23 20 23 14 17 14"></polyline>
                                                                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
                                                            </svg>
                                                            Reset
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Alert
                                                        variant="info"
                                                        className="mb-0 shadow-sm d-flex align-items-center"
                                                        style={{ borderRadius: '8px' }}
                                                    >
                                                        <svg
                                                            width="20"
                                                            height="20"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            className="me-2"
                                                        >
                                                            <circle cx="12" cy="12" r="10"></circle>
                                                            <line
                                                                x1="12"
                                                                y1="16"
                                                                x2="12"
                                                                y2="12"
                                                            ></line>
                                                            <line
                                                                x1="12"
                                                                y1="8"
                                                                x2="12.01"
                                                                y2="8"
                                                            ></line>
                                                        </svg>
                                                        Read-only for your role.
                                                    </Alert>
                                                )}
                                            </Col>
                                            <Col md={6}>
                                                <div
                                                    className="bg-light p-4 rounded-3"
                                                    style={{ borderRadius: '12px' }}
                                                >
                                                    <h6 className="fw-semibold mb-3">
                                                        <svg
                                                            width="18"
                                                            height="18"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            className="me-2"
                                                            style={{ marginTop: '-3px' }}
                                                        >
                                                            <circle cx="12" cy="12" r="10"></circle>
                                                            <line
                                                                x1="12"
                                                                y1="16"
                                                                x2="12"
                                                                y2="12"
                                                            ></line>
                                                            <line
                                                                x1="12"
                                                                y1="8"
                                                                x2="12.01"
                                                                y2="8"
                                                            ></line>
                                                        </svg>
                                                        About Commission Settings
                                                    </h6>
                                                    <ul className="small text-muted mb-0 ps-3">
                                                        <li className="mb-2">
                                                            This percentage applies globally to all
                                                            agents across the system
                                                        </li>
                                                        <li className="mb-2">
                                                            Commission is calculated on approved
                                                            loan amounts
                                                        </li>
                                                        <li className="mb-2">
                                                            Changes take effect immediately for new
                                                            transactions
                                                        </li>
                                                        <li className="mb-0">
                                                            Historical commissions are not affected
                                                            by this change
                                                        </li>
                                                    </ul>
                                                </div>
                                            </Col>
                                        </Row>
                                    </FormikForm>
                                )}
                            </Formik>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
