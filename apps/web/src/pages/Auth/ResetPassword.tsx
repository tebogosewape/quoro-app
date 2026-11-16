import {
    faCheckCircle,
    faExclamationCircle,
    faEye,
    faEyeSlash,
    faLock,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ErrorMessage, Field, Form as FormikForm, Formik } from 'formik';
import { useState } from 'react';
import { Alert, Button, Container, Form, InputGroup } from 'react-bootstrap';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import * as Yup from 'yup';

import '@/styles/login.css';
import { HttpProxy } from '../../api/http-proxy.service';
import { AuthCardHeader } from '../../components/auth/AuthCardHeader';
import { appConfig } from '../../config/env';
import { useAuthPageTheme } from '../../hooks/useAuthPageTheme';

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
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);

    if (!token || !email) {
        return (
            <div className="login-page-wrapper login-page-wrapper--auth-split">
                <div className="login-wrapper">
                    <AuthCardHeader
                        title="Reset link expired"
                        subtitle="Your request could not be verified. Request a fresh password reset email to continue."
                    />
                    <div className="login-form-wrapper">
                        <Container className="login-form-container">
                            <div className="auth-result">
                                <Alert
                                    variant="danger"
                                    className="auth-alert auth-alert--danger"
                                    role="alert"
                                >
                                    <FontAwesomeIcon
                                        icon={faExclamationCircle}
                                        className="auth-alert__icon"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        Invalid or missing reset link. Please request a new email.
                                    </span>
                                </Alert>
                                <Link className="login-button" to="/forgot-password">
                                    Request new link
                                </Link>
                                <Link className="auth-secondary-link" to="/login">
                                    Back to sign in
                                </Link>
                            </div>
                        </Container>
                    </div>
                </div>
            </div>
        );
    }

    const submit = async (values: { password: string; confirmPassword: string }) => {
        setError(null);
        try {
            const response = await http.request(
                'AUTH',
                `${appConfig.apiUrl}/auth/reset-password`,
                'POST',
                { token, email, password: values.password }
            );

            if (response.statusCode !== 200) {
                throw new Error(response.errorMessage || 'Reset failed');
            }

            setDone(true);
            setTimeout(() => navigate('/login', { replace: true }), 1500);
        } catch (caughtError: unknown) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Unable to reset password. The link may have expired.'
            );
        }
    };

    return (
        <div className="login-page-wrapper login-page-wrapper--auth-split">
            <div className="login-wrapper">
                <AuthCardHeader
                    title="Set a new password"
                    subtitle="Choose a strong password to secure your account."
                />

                <div className="login-form-wrapper">
                    <Container className="login-form-container">
                        {done ? (
                            <div className="auth-result" aria-live="polite">
                                <Alert variant="success" className="auth-alert" role="status">
                                    <FontAwesomeIcon
                                        icon={faCheckCircle}
                                        className="auth-alert__icon"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        Your password has been updated. Redirecting to sign in.
                                    </span>
                                </Alert>
                                <Link className="auth-secondary-link" to="/login">
                                    Continue to sign in
                                </Link>
                            </div>
                        ) : (
                            <Formik
                                initialValues={{ password: '', confirmPassword: '' }}
                                validationSchema={schema}
                                onSubmit={submit}
                            >
                                {({ isSubmitting }) => (
                                    <FormikForm className="login-form">
                                        <Form.Group className="mb-3" controlId="new-password">
                                            <Form.Label>New password</Form.Label>
                                            <InputGroup>
                                                <InputGroup.Text className="input-icon">
                                                    <FontAwesomeIcon
                                                        icon={faLock}
                                                        className="input-icon__fa"
                                                        aria-hidden="true"
                                                    />
                                                </InputGroup.Text>
                                                <Field
                                                    name="password"
                                                    type={showPassword ? 'text' : 'password'}
                                                    id="new-password"
                                                    className="form-control form-input"
                                                    placeholder="Enter a strong password"
                                                    autoComplete="new-password"
                                                    aria-describedby="new-password-help"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="light"
                                                    className="password-toggle"
                                                    aria-label={
                                                        showPassword
                                                            ? 'Hide new password'
                                                            : 'Show new password'
                                                    }
                                                    aria-pressed={showPassword}
                                                    onClick={() =>
                                                        setShowPassword((current) => !current)
                                                    }
                                                >
                                                    <FontAwesomeIcon
                                                        icon={showPassword ? faEyeSlash : faEye}
                                                        aria-hidden="true"
                                                    />
                                                </Button>
                                            </InputGroup>
                                            <div id="new-password-help" className="auth-field-help">
                                                Use 8+ characters with uppercase, lowercase and a number.
                                            </div>
                                            <ErrorMessage name="password">
                                                {(message) => (
                                                    <div className="error-message">{message}</div>
                                                )}
                                            </ErrorMessage>
                                        </Form.Group>

                                        <Form.Group className="mb-3" controlId="confirm-password">
                                            <Form.Label>Confirm password</Form.Label>
                                            <InputGroup>
                                                <InputGroup.Text className="input-icon">
                                                    <FontAwesomeIcon
                                                        icon={faLock}
                                                        className="input-icon__fa"
                                                        aria-hidden="true"
                                                    />
                                                </InputGroup.Text>
                                                <Field
                                                    name="confirmPassword"
                                                    type={showConfirmation ? 'text' : 'password'}
                                                    id="confirm-password"
                                                    className="form-control form-input"
                                                    placeholder="Re-enter your password"
                                                    autoComplete="new-password"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="light"
                                                    className="password-toggle"
                                                    aria-label={
                                                        showConfirmation
                                                            ? 'Hide password confirmation'
                                                            : 'Show password confirmation'
                                                    }
                                                    aria-pressed={showConfirmation}
                                                    onClick={() =>
                                                        setShowConfirmation((current) => !current)
                                                    }
                                                >
                                                    <FontAwesomeIcon
                                                        icon={showConfirmation ? faEyeSlash : faEye}
                                                        aria-hidden="true"
                                                    />
                                                </Button>
                                            </InputGroup>
                                            <ErrorMessage name="confirmPassword">
                                                {(message) => (
                                                    <div className="error-message">{message}</div>
                                                )}
                                            </ErrorMessage>
                                        </Form.Group>

                                        {error && (
                                            <Alert
                                                variant="danger"
                                                className="auth-alert auth-alert--danger"
                                                role="alert"
                                            >
                                                <FontAwesomeIcon
                                                    icon={faExclamationCircle}
                                                    className="auth-alert__icon"
                                                    aria-hidden="true"
                                                />
                                                <span>{error}</span>
                                            </Alert>
                                        )}

                                        <div className="auth-actions-stack mt-4">
                                            <Button
                                                variant="primary"
                                                type="submit"
                                                className="login-button"
                                                disabled={isSubmitting}
                                                aria-busy={isSubmitting}
                                            >
                                                {isSubmitting ? 'Updating…' : 'Update password'}
                                            </Button>
                                            <Link className="auth-secondary-link" to="/login">
                                                Back to sign in
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

export default ResetPassword;
