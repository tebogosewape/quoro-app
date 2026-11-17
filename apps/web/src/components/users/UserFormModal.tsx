import { Modal } from 'react-bootstrap';
import { ErrorMessage, Field, Form as FormikForm, Formik } from 'formik';
import * as Yup from 'yup';
import type { CreateUserDto, UpdateUserDto, UserDto, UserRole, UserStatus } from '@/api/users';

type Props = {
    show: boolean;
    mode: 'create' | 'edit';
    initial?: Partial<UserDto>;
    onClose: () => void;
    onSubmit: (payload: CreateUserDto | UpdateUserDto) => Promise<void>;
};
type FormValues = {
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    password: string;
    employeeNumber: string;
    role: UserRole;
    status: UserStatus;
    department: string;
    phoneNumber: string;
    title: string;
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
const formatOption = (value: string) =>
    value
        .split(/[_-]/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
const baseSchema = {
    firstName: Yup.string().required('First name is required').max(100),
    lastName: Yup.string().required('Last name is required').max(100),
    email: Yup.string().email('Enter a valid email address').required('Email is required'),
    username: Yup.string().max(100).nullable(),
    employeeNumber: Yup.string().required('Employee number is required'),
    role: Yup.mixed<UserRole>().oneOf(roleOptions).required('Role is required'),
    status: Yup.mixed<UserStatus>().oneOf(statusOptions).required('Status is required'),
    department: Yup.string().nullable(),
    phoneNumber: Yup.string().nullable(),
    title: Yup.string().nullable(),
};
const createSchema = Yup.object({
    ...baseSchema,
    password: Yup.string()
        .min(8, 'Use at least 8 characters')
        .matches(/[A-Z]/, 'Add one uppercase letter')
        .matches(/[a-z]/, 'Add one lowercase letter')
        .matches(/\d/, 'Add one number')
        .required('Password is required'),
});
const editSchema = Yup.object(baseSchema);

function FormField({
    name,
    label,
    type = 'text',
    autoComplete = 'off',
}: {
    name: keyof FormValues;
    label: string;
    type?: string;
    autoComplete?: string;
}) {
    return (
        <div className="user-form__field">
            <label htmlFor={`user-${name}`}>{label}</label>
            <Field id={`user-${name}`} name={name} type={type} autoComplete={autoComplete} />
            <ErrorMessage name={name} component="div" className="user-form__error" />
        </div>
    );
}

export default function UserFormModal({ show, mode, initial, onClose, onSubmit }: Props) {
    const isCreate = mode === 'create';
    const initialValues: FormValues = {
        firstName: initial?.firstName ?? '',
        lastName: initial?.lastName ?? '',
        email: initial?.email ?? '',
        username: initial?.username ?? '',
        password: '',
        employeeNumber: initial?.employeeNumber ?? '',
        role: initial?.role ?? 'sales_agent',
        status: initial?.status ?? 'active',
        department: initial?.department ?? '',
        phoneNumber: initial?.phoneNumber ?? '',
        title: initial?.title ?? '',
    };

    return (
        <Modal
            show={show}
            onHide={onClose}
            backdrop="static"
            centered
            scrollable
            dialogClassName="user-form"
        >
            <Formik<FormValues>
                enableReinitialize
                initialValues={initialValues}
                validationSchema={isCreate ? createSchema : editSchema}
                onSubmit={async (values, { setStatus }) => {
                    setStatus(undefined);
                    try {
                        const common = {
                            firstName: values.firstName.trim(),
                            lastName: values.lastName.trim(),
                            email: values.email.trim(),
                            username: values.username.trim() || undefined,
                            employeeNumber: values.employeeNumber.trim(),
                            role: values.role,
                            status: values.status,
                            department: values.department.trim() || undefined,
                            phoneNumber: values.phoneNumber.trim() || undefined,
                            title: values.title.trim() || undefined,
                        };
                        await onSubmit(
                            isCreate ? { ...common, password: values.password } : common
                        );
                    } catch (error: unknown) {
                        setStatus(
                            error instanceof Error && error.message
                                ? error.message
                                : 'Failed to save user.'
                        );
                    }
                }}
            >
                {({ isSubmitting, status }) => (
                    <FormikForm noValidate autoComplete="off">
                        <Modal.Header closeButton>
                            <div>
                                <Modal.Title>{isCreate ? 'Add user' : 'Edit user'}</Modal.Title>
                                <small>
                                    {isCreate
                                        ? 'Create a new system identity and assign access.'
                                        : 'Update identity, role and account status.'}
                                </small>
                            </div>
                        </Modal.Header>
                        <Modal.Body>
                            {status && (
                                <div className="user-form__api-error" role="alert">
                                    {status}
                                </div>
                            )}
                            <div className="user-form__sections">
                                <fieldset className="user-form__section">
                                    <legend>Identity</legend>
                                    <div className="user-form__grid">
                                        <FormField name="firstName" label="First name" />
                                        <FormField name="lastName" label="Last name" />
                                        <FormField name="employeeNumber" label="Employee number" />
                                        <FormField
                                            name="email"
                                            label="Email address"
                                            type="email"
                                        />
                                        <FormField name="username" label="Username" />
                                        {isCreate && (
                                            <FormField
                                                name="password"
                                                label="Temporary password"
                                                type="password"
                                                autoComplete="new-password"
                                            />
                                        )}
                                    </div>
                                </fieldset>

                                <fieldset className="user-form__section">
                                    <legend>Access and organisation</legend>
                                    <div className="user-form__grid">
                                        <div className="user-form__field">
                                            <label htmlFor="user-role">Role</label>
                                            <Field id="user-role" as="select" name="role">
                                                {roleOptions.map((option) => (
                                                    <option key={option} value={option}>
                                                        {formatOption(option)}
                                                    </option>
                                                ))}
                                            </Field>
                                            <ErrorMessage
                                                name="role"
                                                component="div"
                                                className="user-form__error"
                                            />
                                        </div>
                                        <div className="user-form__field">
                                            <label htmlFor="user-status">Status</label>
                                            <Field id="user-status" as="select" name="status">
                                                {statusOptions.map((option) => (
                                                    <option key={option} value={option}>
                                                        {formatOption(option)}
                                                    </option>
                                                ))}
                                            </Field>
                                            <ErrorMessage
                                                name="status"
                                                component="div"
                                                className="user-form__error"
                                            />
                                        </div>
                                        <FormField name="department" label="Department" />
                                        <FormField name="title" label="Job title" />
                                        <FormField name="phoneNumber" label="Phone number" />
                                    </div>
                                </fieldset>
                            </div>
                        </Modal.Body>
                        <Modal.Footer>
                            <button
                                type="button"
                                className="user-form__button user-form__button--secondary"
                                onClick={onClose}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="user-form__button user-form__button--primary"
                                disabled={isSubmitting}
                            >
                                {isSubmitting
                                    ? 'Saving…'
                                    : isCreate
                                        ? 'Create user'
                                        : 'Save changes'}
                            </button>
                        </Modal.Footer>
                    </FormikForm>
                )}
            </Formik>
        </Modal>
    );
}
