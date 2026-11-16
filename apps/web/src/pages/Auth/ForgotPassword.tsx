import { faCheckCircle, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ErrorMessage, Field, Form as FormikForm, Formik } from 'formik';
import { useState } from 'react';
import { Alert, Button, Container, Form, InputGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import * as Yup from 'yup';

import '@/styles/login.css';
import { HttpProxy } from '../../api/http-proxy.service';
import { AuthCardHeader } from '../../components/auth/AuthCardHeader';
import { appConfig } from '../../config/env';
import { useAuthPageTheme } from '../../hooks/useAuthPageTheme';

const schema = Yup.object().shape({
    email: Yup.string().trim().email('Enter a valid email').required('Email is required'),
});

const ForgotPassword = () => {
    useAuthPageTheme();
    const http = new HttpProxy();
    const [submitted, setSubmitted] = useState(false);

    const submit = async (values: { email: string }) => {
        try {
            await http.request('AUTH', `${appConfig.apiUrl}/auth/forgot-password`, 'POST', {
                email: values.email.trim(),
            });
        } catch (error: unknown) {
            // Do not reveal whether an account exists or expose provider failures.
            console.error('Forgot password error:', error);
        } finally {
            setSubmitted(true);
        }
    };

    return (
        <div className="login-page-wrapper login-page-wrapper--auth-split">
            <div className="login-wrapper">
                <AuthCardHeader
                    title="Forgot your password?"
                    subtitle="Enter the email associated with your account and we'll send a reset link."
                />

                <div className="login-form-wrapper">
                    <Container className="login-form-container">
                        {submitted ? (
                            <div className="auth-result" aria-live="polite">
                                <Alert variant="success" className="auth-alert" role="status">
                                    <FontAwesomeIcon
                                        icon={faCheckCircle}
                                        className="auth-alert__icon"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        If an account exists for that email address, a reset link
                                        has been sent. Please check your inbox and follow the
                                        instructions.
                                    </span>
                                </Alert>
                                <Link className="auth-secondary-link" to="/login">
                                    Back to login
                                </Link>
                            </div>
                        ) : (
                            <Formik
                                initialValues={{ email: '' }}
                                validationSchema={schema}
                                onSubmit={submit}
                            >
                                {({ isSubmitting }) => (
                                    <FormikForm className="login-form">
                                        <Form.Group className="mb-3" controlId="reset-email">
                                            <Form.Label>Email address</Form.Label>
                                            <InputGroup>
                                                <InputGroup.Text className="input-icon">
                                                    <FontAwesomeIcon
                                                        icon={faEnvelope}
                                                        className="input-icon__fa"
                                                        aria-hidden="true"
                                                    />
                                                </InputGroup.Text>
                                                <Field
                                                    name="email"
                                                    type="email"
                                                    id="reset-email"
                                                    className="form-control form-input"
                                                    placeholder="Enter your account email"
                                                    autoComplete="email"
                                                    inputMode="email"
                                                    autoCapitalize="none"
                                                    spellCheck="false"
                                                />
                                            </InputGroup>
                                            <ErrorMessage name="email">
                                                {(message) => (
                                                    <div className="error-message">{message}</div>
                                                )}
                                            </ErrorMessage>
                                        </Form.Group>

                                        <div className="auth-actions-stack mt-4">
                                            <Button
                                                variant="primary"
                                                type="submit"
                                                className="login-button"
                                                disabled={isSubmitting}
                                                aria-busy={isSubmitting}
                                            >
                                                {isSubmitting ? 'Sending…' : 'Send reset link'}
                                            </Button>

                                            <Link className="auth-secondary-link" to="/login">
                                                Back to login
                                            </Link>
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
