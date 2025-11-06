import { Container, Form, Button, Alert } from 'react-bootstrap';
import { Formik, Field, Form as FormikForm, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import '@/styles/login.css';
import { HttpProxy } from '../../api/http-proxy.service';
import { appConfig } from '../../config/env';
import { useAuthPageTheme } from '../../hooks/useAuthPageTheme';
import { AuthCardHeader } from '../../components/auth/AuthCardHeader';

const schema = Yup.object().shape({
    email: Yup.string().email('Enter a valid email').required('Email is required'),
});

const ForgotPassword = () => {
    useAuthPageTheme();
    const http = new HttpProxy();
    const navigate = useNavigate();
    const [submitted, setSubmitted] = useState(false);
    const [serverErr, setServerErr] = useState<string | null>(null);

    const submit = async (values: { email: string }) => {
        setServerErr(null);
        try {
            await http.request('AUTH', `${appConfig.apiUrl}/auth/forgot-password`, 'POST', {
                email: values.email,
            });
            // Regardless of backend response details, show a generic success.
            setSubmitted(true);
        } catch (err: unknown) {
            // Still show success to avoid info leaks; log if needed.
            console.error('Forgot password error:', err);
            setSubmitted(true);
        }
    };

    return (
        <div className="login-page-wrapper">
            <div className="login-wrapper">
                <AuthCardHeader
                    title="Forgot your password?"
                    subtitle="Enter the email associated with your account and we’ll send a reset link."
                />
                <div className="login-form-wrapper">
                    <Container className="login-form-container">
                        {submitted ? (
                            <div className="d-grid gap-3">
                                <Alert variant="success" className="auth-alert">
                                    If an account exists for that email address, a reset link has
                                    been sent. Please check your inbox and follow the instructions.
                                </Alert>
                                <Button
                                    variant="primary"
                                    className="login-button"
                                    onClick={() => navigate('/login')}
                                >
                                    Back to login
                                </Button>
                            </div>
                        ) : (
                            <Formik
                                initialValues={{ email: '' }}
                                validationSchema={schema}
                                onSubmit={submit}
                            >
                                {({ isSubmitting }) => (
                                    <FormikForm className="login-form">
                                        <Form.Group className="mb-4">
                                            <Form.Label className="form-label">Email</Form.Label>
                                            <Field
                                                name="email"
                                                type="email"
                                                className="form-control form-input"
                                                placeholder="Enter your account email"
                                            />
                                            <ErrorMessage name="email">
                                                {(msg) => (
                                                    <div className="error-message mt-2">{msg}</div>
                                                )}
                                            </ErrorMessage>
                                        </Form.Group>

                                        {serverErr && (
                                            <Alert variant="danger" className="auth-alert">
                                                {serverErr}
                                            </Alert>
                                        )}

                                        <div className="d-grid gap-3 mt-4">
                                            <Button
                                                variant="primary"
                                                type="submit"
                                                className="login-button"
                                                disabled={isSubmitting}
                                            >
                                                {isSubmitting ? 'Sending…' : 'Send reset link'}
                                            </Button>

                                            <Button
                                                variant="outline-secondary"
                                                type="button"
                                                className="login-button"
                                                onClick={() => navigate('/login')}
                                            >
                                                Back to login
                                            </Button>
                                        </div>
                                    </FormikForm>
                                )}
                            </Formik>
                        )}
                    </Container>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
