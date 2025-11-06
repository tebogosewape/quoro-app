import { Form, Button, Container, InputGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationCircle, faEnvelope, faLock } from '@fortawesome/free-solid-svg-icons';
import { Formik, Field, Form as FormikForm, ErrorMessage } from 'formik';
import * as Yup from 'yup';

import '@/styles/login.css';
import { HttpProxy } from '../../api/http-proxy.service';
import { appConfig } from '../../config/env';
import { useAuthStore } from '../../stores/auth.store';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthPageTheme } from '../../hooks/useAuthPageTheme';
import { AuthCardHeader } from '../../components/auth/AuthCardHeader';
import { getDefaultRouteForRole } from '../../utils/permissions';
import type { AuthSession, UserRole } from '../../interfaces/AuthUser';
import { isAuthSession } from '../../utils/is-auth-user';

type LoginResponse = {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user: {
        id: string;
        email: string;
        username?: string;
        phoneNumber?: string;
        firstName: string;
        lastName: string;
        role: UserRole;
        department?: string;
        permissions: string[]; // <-- add this
    };
};

type ApiResponse<T> = {
    success: boolean;
    data?: T;
    message?: string;
    meta?: Record<string, unknown>;
};

const validationSchema = Yup.object().shape({
    identifier: Yup.string()
        .min(3, 'Use at least 3 characters')
        .required('Email, username, or phone is required'),
    password: Yup.string().min(6, 'Minimum 6 characters').required('Password is required'),
});

export default function Login() {
    useAuthPageTheme();
    const http = new HttpProxy();
    const location = useLocation();
    const navigate = useNavigate();
    const [showError, setShowError] = useState(location.state?.error || '');
    const [apiError, setApiError] = useState('');
    const session = useAuthStore((state) => state.session);
    const hydrated = useAuthStore((state) => state.hydrated);
    const setSession = useAuthStore((state) => state.setSession);

    useEffect(() => {
        if (showError) {
            const timer = setTimeout(() => setShowError(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [showError]);

    useEffect(() => {
        if (hydrated && session) {
            navigate(getDefaultRouteForRole(session.user.role), { replace: true });
        }
    }, [hydrated, navigate, session]);

    const handleLoginSuccess = async (values: { identifier: string; password: string }) => {
        setApiError('');

        const requestData = {
            identifier: values.identifier.trim(),
            password: values.password,
        };

        const result = await http.request(
            'USER',
            `${appConfig.apiUrl}/auth/login`,
            'POST',
            requestData
        );

        if (result.data) {
            const envelope = result.data as ApiResponse<LoginResponse>;

            if (!envelope.success || !envelope.data) {
                const message = envelope.message || 'Unable to sign in. Please try again.';
                console.error('Login envelope missing data', envelope);
                setApiError(message);
                return;
            }

            const data = envelope.data;

            // compute route separately (don't store in session)
            const defaultRoute = getDefaultRouteForRole(data.user.role);

            const session: AuthSession = {
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                expires_in:
                    typeof data.expires_in === 'string'
                        ? parseInt(data.expires_in, 10)
                        : data.expires_in,
                issued_at: Date.now(), // Store when token was issued
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    username: data.user.username,
                    firstName: data.user.firstName,
                    lastName: data.user.lastName,
                    role: data.user.role,
                    department: data.user.department,
                    phoneNumber: data.user.phoneNumber,
                    permissions: data.user.permissions ?? [], // <-- here
                },
            };

            // keep the guard — it should pass now
            if (!isAuthSession(session)) {
                console.error('Login succeeded but response shape is unexpected', data);
                setApiError('Unable to start session. Please contact support.');
                return;
            }

            setSession(session);
            navigate(defaultRoute, { replace: true });
        } else {
            console.error(result.errorType, result.errorMessage);
            console.error(result);
            setApiError(result.errorMessage || 'An error occurred. Please try again.');
        }
    };

    return (
        <div className="login-page-wrapper">
            <div className="login-wrapper">
                <AuthCardHeader
                    title="Welcome back"
                    subtitle="Sign in to keep client cases, tasks, and analytics moving."
                />

                <div className="login-form-wrapper">
                    <Container className="login-form-container">
                        {showError && <div className="alert alert-danger">{showError}</div>}

                        <Formik
                            initialValues={{ identifier: '', password: '' }}
                            validationSchema={validationSchema}
                            onSubmit={handleLoginSuccess}
                        >
                            {({ isSubmitting }) => (
                                <FormikForm className="login-form">
                                    {/* Identifier Field */}
                                    <Form.Group className="mb-4">
                                        <InputGroup>
                                            <InputGroup.Text className="input-icon">
                                                <FontAwesomeIcon
                                                    icon={faEnvelope}
                                                    className="input-icon__fa"
                                                />
                                            </InputGroup.Text>
                                            <Field
                                                name="identifier"
                                                type="text"
                                                className="form-control form-input"
                                                placeholder="Email, username, or phone"
                                            />
                                        </InputGroup>
                                        <ErrorMessage name="identifier">
                                            {(msg) => (
                                                <div className="error-message">
                                                    <FontAwesomeIcon
                                                        icon={faExclamationCircle}
                                                        className="me-2"
                                                    />
                                                    {msg}
                                                </div>
                                            )}
                                        </ErrorMessage>
                                    </Form.Group>

                                    {/* Password Field */}
                                    <Form.Group className="mb-4">
                                        <InputGroup>
                                            <InputGroup.Text className="input-icon">
                                                <FontAwesomeIcon
                                                    icon={faLock}
                                                    className="input-icon__fa"
                                                />
                                            </InputGroup.Text>
                                            <Field
                                                name="password"
                                                type="password"
                                                className="form-control form-input"
                                                placeholder="Enter password"
                                            />
                                        </InputGroup>
                                        <ErrorMessage name="password">
                                            {(msg) => (
                                                <div className="error-message">
                                                    <FontAwesomeIcon
                                                        icon={faExclamationCircle}
                                                        className="me-2"
                                                    />
                                                    {msg}
                                                </div>
                                            )}
                                        </ErrorMessage>
                                    </Form.Group>

                                    {apiError && (
                                        <p className="text-center text-danger font-weight-bold">
                                            <FontAwesomeIcon
                                                icon={faExclamationCircle}
                                                className="me-2"
                                            />
                                            {apiError}
                                        </p>
                                    )}

                                    <div className="login-actions mt-4">
                                        <Button
                                            variant="primary"
                                            type="submit"
                                            className="login-button"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? 'Signing in…' : 'Log in'}
                                        </Button>
                                        <Link className="reset-password-link" to="/forgot-password">
                                            Forgot password
                                        </Link>
                                    </div>
                                </FormikForm>
                            )}
                        </Formik>
                    </Container>
                </div>
            </div>
        </div>
    );
}
