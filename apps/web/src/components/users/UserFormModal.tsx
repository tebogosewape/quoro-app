import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
import { Formik, Form as FormikForm, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import type { CreateUserDto, UpdateUserDto, UserDto, UserRole, UserStatus } from '@/api/users';

type Props = {
    show: boolean;
    mode: 'create' | 'edit';
    initial?: Partial<UserDto>;
    onClose: () => void;
    onSubmit: (payload: CreateUserDto | UpdateUserDto) => Promise<void>;
};

const roleOptions: UserRole[] = [
    'admin',
    'admin_manager',
    'manager',
    'team_leader',
    'operations_manager',
    'agent',
    'sales_agent',
    'debt_review_specialist',
    'lead_provider',
    'chief_executive_officer',
    'viewer',
];

const statusOptions: UserStatus[] = ['active', 'inactive', 'suspended', 'pending'];

const CreateSchema = Yup.object({
    firstName: Yup.string().required('First name is required').max(100),
    lastName: Yup.string().required('Last name is required').max(100),
    email: Yup.string().email('Invalid email').required('Email is required'),
    username: Yup.string().max(100).nullable(),
    password: Yup.string()
        .min(8, 'Min 8 chars')
        .matches(/[A-Z]/, 'One uppercase required')
        .matches(/[a-z]/, 'One lowercase required')
        .matches(/\d/, 'One number required')
        .required('Password is required'),
    employeeNumber: Yup.string().required('Employee number is required'),
    role: Yup.mixed().oneOf(roleOptions).required('Role is required'),
    status: Yup.mixed().oneOf(statusOptions).nullable(),
    department: Yup.string().nullable(),
    phoneNumber: Yup.string().nullable(),
    title: Yup.string().nullable(),
});

const EditSchema = Yup.object({
    firstName: Yup.string().required('First name is required').max(100),
    lastName: Yup.string().required('Last name is required').max(100),
    email: Yup.string().email('Invalid email').required('Email is required'),
    username: Yup.string().max(100).nullable(),
    // password excluded on edit
    employeeNumber: Yup.string().required('Employee number is required'),
    role: Yup.mixed().oneOf(roleOptions).required('Role is required'),
    status: Yup.mixed().oneOf(statusOptions).nullable(),
    department: Yup.string().nullable(),
    phoneNumber: Yup.string().nullable(),
    title: Yup.string().nullable(),
});

export default function UserFormModal({ show, mode, initial, onClose, onSubmit }: Props) {
    const isCreate = mode === 'create';

    const initialValues: any = {
        firstName: initial?.firstName ?? '',
        lastName: initial?.lastName ?? '',
        email: initial?.email ?? '',
        username: initial?.username ?? '',
        password: '', // only used in create
        employeeNumber: initial?.employeeNumber ?? '',
        role: (initial?.role as UserRole) ?? 'sales_agent',
        status: (initial?.status as UserStatus) ?? 'active',
        department: initial?.department ?? '',
        phoneNumber: initial?.phoneNumber ?? '',
        title: initial?.title ?? '',
    };

    return (
        <Modal show={show} onHide={onClose} size="lg" backdrop="static">
            <Formik
                initialValues={initialValues}
                validationSchema={isCreate ? CreateSchema : EditSchema}
                onSubmit={async (values, { setSubmitting }) => {
                    try {
                        const payload: any = { ...values };
                        if (!isCreate) {
                            // remove password if empty/undefined
                            delete payload.password;
                        }
                        await onSubmit(payload);
                    } finally {
                        setSubmitting(false);
                    }
                }}
            >
                {({ isSubmitting }) => (
                    <FormikForm>
                        <Modal.Header closeButton>
                            <Modal.Title>{isCreate ? 'Add User' : 'Edit User'}</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <Row className="g-3">
                                <Col md={6}>
                                    <Form.Label>First Name</Form.Label>
                                    <Field name="firstName" className="form-control" />
                                    <ErrorMessage
                                        name="firstName"
                                        component="div"
                                        className="text-danger small"
                                    />
                                </Col>
                                <Col md={6}>
                                    <Form.Label>Last Name</Form.Label>
                                    <Field name="lastName" className="form-control" />
                                    <ErrorMessage
                                        name="lastName"
                                        component="div"
                                        className="text-danger small"
                                    />
                                </Col>
                                <Col md={6}>
                                    <Form.Label>Email</Form.Label>
                                    <Field name="email" type="email" className="form-control" />
                                    <ErrorMessage
                                        name="email"
                                        component="div"
                                        className="text-danger small"
                                    />
                                </Col>
                                <Col md={6}>
                                    <Form.Label>Username</Form.Label>
                                    <Field name="username" className="form-control" />
                                    <ErrorMessage
                                        name="username"
                                        component="div"
                                        className="text-danger small"
                                    />
                                </Col>
                                {isCreate && (
                                    <Col md={6}>
                                        <Form.Label>Password</Form.Label>
                                        <Field
                                            name="password"
                                            type="password"
                                            className="form-control"
                                        />
                                        <ErrorMessage
                                            name="password"
                                            component="div"
                                            className="text-danger small"
                                        />
                                    </Col>
                                )}
                                <Col md={6}>
                                    <Form.Label>Employee Number</Form.Label>
                                    <Field name="employeeNumber" className="form-control" />
                                    <ErrorMessage
                                        name="employeeNumber"
                                        component="div"
                                        className="text-danger small"
                                    />
                                </Col>
                                <Col md={6}>
                                    <Form.Label>Role</Form.Label>
                                    <Field as="select" name="role" className="form-select">
                                        {roleOptions.map((r) => (
                                            <option key={r} value={r}>
                                                {r}
                                            </option>
                                        ))}
                                    </Field>
                                    <ErrorMessage
                                        name="role"
                                        component="div"
                                        className="text-danger small"
                                    />
                                </Col>
                                <Col md={6}>
                                    <Form.Label>Status</Form.Label>
                                    <Field as="select" name="status" className="form-select">
                                        {statusOptions.map((s) => (
                                            <option key={s} value={s}>
                                                {s}
                                            </option>
                                        ))}
                                    </Field>
                                    <ErrorMessage
                                        name="status"
                                        component="div"
                                        className="text-danger small"
                                    />
                                </Col>
                                <Col md={6}>
                                    <Form.Label>Department</Form.Label>
                                    <Field name="department" className="form-control" />
                                </Col>
                                <Col md={6}>
                                    <Form.Label>Phone</Form.Label>
                                    <Field name="phoneNumber" className="form-control" />
                                </Col>
                                <Col md={6}>
                                    <Form.Label>Title</Form.Label>
                                    <Field name="title" className="form-control" />
                                </Col>
                            </Row>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary" disabled={isSubmitting}>
                                {isCreate ? 'Create' : 'Save changes'}
                            </Button>
                        </Modal.Footer>
                    </FormikForm>
                )}
            </Formik>
        </Modal>
    );
}
