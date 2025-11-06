import { useAuthStore } from '@/stores/auth.store';
import { Card, Button, Form } from 'react-bootstrap';

export default function ManageProfile() {
    const session = useAuthStore((s) => s.session);

    if (!session) return null;

    const user = session.user;

    return (
        <div className="container" style={{ maxWidth: 900 }}>
            <h3 className="mb-3">My Profile</h3>
            <Card className="mb-3">
                <Card.Body>
                    <div className="row">
                        <div className="col-md-6">
                            <p>
                                <strong>Name:</strong> {user.firstName} {user.lastName}
                            </p>
                            <p>
                                <strong>Email:</strong> {user.email}
                            </p>
                            <p>
                                <strong>Username:</strong> {user.username ?? '—'}
                            </p>
                        </div>
                        <div className="col-md-6">
                            <p>
                                <strong>Role:</strong> {user.role}
                            </p>
                            <p>
                                <strong>Department:</strong> {user.department ?? '—'}
                            </p>
                            <p>
                                <strong>Phone:</strong> {user.phoneNumber ?? '—'}
                            </p>
                        </div>
                    </div>
                    <div className="mt-3">
                        <strong>Permissions:</strong>
                        <div className="mt-2">
                            {user.permissions?.length ? (
                                <div className="d-flex flex-wrap gap-2">
                                    {user.permissions.map((k) => (
                                        <span key={k} className="badge bg-secondary">
                                            {k}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-muted">None</span>
                            )}
                        </div>
                    </div>
                </Card.Body>
            </Card>

            <Card>
                <Card.Header>Security</Card.Header>
                <Card.Body>
                    <Form className="row g-3">
                        <div className="col-md-6">
                            <Form.Label>Current Password</Form.Label>
                            <Form.Control type="password" placeholder="••••••••" />
                        </div>
                        <div className="col-md-6">
                            <Form.Label>New Password</Form.Label>
                            <Form.Control type="password" placeholder="••••••••" />
                        </div>
                        <div className="col-12">
                            <Button variant="primary" disabled>
                                Update Password (coming soon)
                            </Button>
                        </div>
                    </Form>
                </Card.Body>
            </Card>
        </div>
    );
}
