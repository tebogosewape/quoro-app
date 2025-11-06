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
        if (canManage) return 'Managers can update the global agent commission percentage.';
        if (canView) return 'You can view the current global agent commission percentage.';
        return 'You do not have permission to view this setting.';
    }, [canManage, canView]);

    if (!canView && !canManage) {
        return (
            <Card>
                <Card.Body>
                    <Card.Title>Commission Settings</Card.Title>
                    <Card.Text className="text-muted">{headerNote}</Card.Text>
                    <Alert variant="warning" className="mb-0">
                        Permission required: <code>view-commissions</code> or{' '}
                        <code>manage-commissions</code>.
                    </Alert>
                </Card.Body>
            </Card>
        );
    }

    return (
        <Card>
            <Card.Body>
                <Row className="align-items-center mb-2">
                    <Col>
                        <Card.Title className="mb-0">Commission Settings</Card.Title>
                    </Col>
                    <Col xs="auto">{loading && <Spinner animation="border" size="sm" />}</Col>
                </Row>
                <Card.Text className="text-muted">{headerNote}</Card.Text>

                {error && (
                    <Alert variant="danger" onClose={() => setError('')} dismissible>
                        {error}
                    </Alert>
                )}
                {saved && (
                    <Alert variant="success" onClose={() => setSaved('')} dismissible>
                        {saved}
                    </Alert>
                )}

                {!loading && (
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
                                <Form.Label>Agent Commission (%)</Form.Label>
                                <InputGroup className="mb-1" style={{ maxWidth: 360 }}>
                                    <Field
                                        as={Form.Control}
                                        name="percentage"
                                        type="number"
                                        step="0.1"
                                        min={0}
                                        max={100}
                                        placeholder="e.g. 10"
                                        disabled={!canManage}
                                        onWheel={(e: any) => e.currentTarget.blur()} // avoid scroll changing input
                                    />
                                    <InputGroup.Text>%</InputGroup.Text>
                                </InputGroup>
                                <div className="mb-3">
                                    <small className="text-muted">
                                        Default is <b>10%</b>. Decimal values are allowed (e.g.
                                        12.5).
                                    </small>
                                </div>
                                <ErrorMessage
                                    name="percentage"
                                    render={(msg) => <div className="text-danger mb-3">{msg}</div>}
                                />

                                {canManage ? (
                                    <div className="d-flex gap-2">
                                        <Button type="submit" disabled={isSubmitting}>
                                            {isSubmitting ? 'Saving…' : 'Save Changes'}
                                        </Button>
                                        <Button
                                            variant="outline-secondary"
                                            type="button"
                                            disabled={isSubmitting}
                                            onClick={() => setFieldValue('percentage', initial)}
                                        >
                                            Reset
                                        </Button>
                                    </div>
                                ) : (
                                    <Alert variant="info" className="mb-0">
                                        Read-only for your role.
                                    </Alert>
                                )}
                            </FormikForm>
                        )}
                    </Formik>
                )}
            </Card.Body>
        </Card>
    );
}
