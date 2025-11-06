import { Container, Form, Button, Alert } from 'react-bootstrap';
import { Formik, Field, Form as FormikForm, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';

import '@/styles/login.css';
import { HttpProxy } from '../../api/http-proxy.service';
import { appConfig } from '../../config/env';
import { useAuthPageTheme } from '../../hooks/useAuthPageTheme';
import { AuthCardHeader } from '../../components/auth/AuthCardHeader';

const schema = Yup.object().shape({
    password: Yup.string()
        .min(8, 'Use at least 8 characters')
        .matches(/[A-Z]/, 'Include at least one uppercase letter')
        .matches(/[a-z]/, 'Include at least one lowercase letter')
        .matches(/[0-9]/, 'Include at least one number')
        .required('Password is required'),
    confirmPassword: Yup.string()
        .oneOf([Yup.ref('password')], 'Passwords do not match')
        .required('Confirm your password'),
});

const ResetPassword = () => {
    useAuthPageTheme();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const http = new HttpProxy();

    const token = params.get('token');
    const email = params.get('email');
    const [done, setDone] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    if (!token || !email) {
        return (
            <div className="login-page-wrapper">
                <div className="login-wrapper">
                    <AuthCardHeader
                        title="Reset link expired"
                        subtitle="Your request could not be verified. Request a fresh password reset email to continue."
                    />
                    <div className="login-form-wrapper">
                        <Container className="login-form-container">
                            <Alert variant="danger" className="auth-alert">
                                Invalid or missing reset link. Please request a new email.
                            </Alert>
                            <div className="d-grid gap-3 mt-4">
                                <Button
                                    variant="primary"
                                    className="login-button"
                                    onClick={() => navigate('/forgot-password')}
                                >
                                    Request new link
                                </Button>
                                <Button
                                    variant="link"
                                    className="reset-password-link"
                                    onClick={() => navigate('/login')}
                                >
                                    Back to sign in
                                </Button>
                            </div>
                        </Container>
                    </div>
                </div>
            </div>
        );
    }

    const submit = async (values: { password: string; confirmPassword: string }) => {
        setErr(null);
        try {
            const payload = { token, email, password: values.password };
            const res = await http.request(
                'AUTH',
                `${appConfig.apiUrl}/auth/reset-password`,
                'POST',
                payload
            );
            if (res?.statusCode && res.statusCode !== 200) {
                throw new Error(res?.errorMessage || 'Reset failed');
            }
            setDone(true);
            setTimeout(() => navigate('/login', { replace: true }), 1500);
        } catch (e: unknown) {
            setErr((e as Error)?.message || 'Unable to reset password. The link may have expired.');
        }
    };

    return (
        <div className="login-page-wrapper">
            <div className="login-wrapper">
                <AuthCardHeader
                    title="Set a new password"
                    subtitle="Choose a strong password to secure your account."
                />
                <div className="login-form-wrapper">
                    <Container className="login-form-container">
                        {done ? (
                            <Alert variant="success" className="auth-alert">
                                Your password has been updated. Redirecting to sign in…
                            </Alert>
                        ) : (
                            <Formik
                                initialValues={{ password: '', confirmPassword: '' }}
                                validationSchema={schema}
                                onSubmit={submit}
                            >
                                {({ isSubmitting }) => (
                                    <FormikForm className="login-form">
                                        <Form.Group className="mb-4">
                                            <Form.Label className="form-label">
                                                New password
                                            </Form.Label>
                                            <Field
                                                name="password"
                                                type="password"
                                                className="form-control form-input"
                                                placeholder="Enter a strong password"
                                            />
                                            <ErrorMessage name="password">
                                                {(msg) => (
                                                    <div className="error-message mt-2">{msg}</div>
                                                )}
                                            </ErrorMessage>
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label className="form-label">
                                                Confirm password
                                            </Form.Label>
                                            <Field
                                                name="confirmPassword"
                                                type="password"
                                                className="form-control form-input"
                                                placeholder="Re-enter your password"
                                            />
                                            <ErrorMessage name="confirmPassword">
                                                {(msg) => (
                                                    <div className="error-message mt-2">{msg}</div>
                                                )}
                                            </ErrorMessage>
                                        </Form.Group>

                                        {err && (
                                            <Alert variant="danger" className="auth-alert">
                                                {err}
                                            </Alert>
                                        )}

                                        <div className="d-grid gap-3 mt-4">
                                            <Button
                                                variant="primary"
                                                type="submit"
                                                className="login-button"
                                                disabled={isSubmitting}
                                            >
                                                {isSubmitting ? 'Updating…' : 'Update password'}
                                            </Button>
                                            <Button
                                                variant="link"
                                                className="reset-password-link"
                                                onClick={() => navigate('/login')}
                                            >
                                                Back to sign in
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

export default ResetPassword;
