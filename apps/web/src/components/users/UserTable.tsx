// src/components/users/UserTable.tsx
import { Table, Badge, Dropdown } from 'react-bootstrap';
import type { UserDto } from '@/api/users';

type Props = {
    users: UserDto[];
    sortBy: keyof UserDto | null;
    sortDir: 'asc' | 'desc';
    onSort: (key: keyof UserDto) => void;
    onEdit: (u: UserDto) => void;
    onDelete: (u: UserDto) => void;
    busyRow?: string | null;
};

const columns: Array<{ key: keyof UserDto; label: string; width?: string }> = [
    { key: 'firstName', label: 'First Name', width: '120px' },
    { key: 'lastName', label: 'Last Name', width: '120px' },
    { key: 'email', label: 'Email', width: '200px' },
    { key: 'employeeNumber', label: 'Employee #', width: '100px' },
    { key: 'role', label: 'Role', width: '120px' },
    { key: 'status', label: 'Status', width: '100px' },
    { key: 'department', label: 'Department', width: '120px' },
    { key: 'phoneNumber', label: 'Phone', width: '130px' },
    { key: 'lastLoginAt', label: 'Last Login', width: '150px' },
];

function getRoleBadgeColor(role: string): string {
    const roleColors: Record<string, string> = {
        ceo: 'danger',
        'operations-manager': 'warning',
        'team-leader': 'info',
        manager: 'primary',
        agent: 'success',
        viewer: 'secondary',
    };
    return roleColors[role.toLowerCase()] || 'secondary';
}

function getStatusBadgeColor(status: string): string {
    return status.toLowerCase() === 'active' ? 'success' : 'secondary';
}

function formatRole(role: string): string {
    return role
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export default function UserTable({
    users,
    sortBy,
    sortDir,
    onSort,
    onEdit,
    onDelete,
    busyRow,
}: Props) {
    return (
        <Table hover responsive className="align-middle mb-0" style={{ minWidth: '1200px' }}>
            <thead style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <tr>
                    {columns.map((c) => {
                        const active = sortBy === c.key;
                        return (
                            <th
                                key={String(c.key)}
                                role="button"
                                onClick={() => onSort(c.key)}
                                style={{
                                    whiteSpace: 'nowrap',
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    color: '#495057',
                                    padding: '1rem 0.75rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    width: c.width,
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                }}
                                className={active ? 'text-primary' : ''}
                            >
                                <div className="d-flex align-items-center gap-2">
                                    {c.label}
                                    {active && (
                                        <span style={{ fontSize: '0.75rem' }}>
                                            {sortDir === 'asc' ? '↑' : '↓'}
                                        </span>
                                    )}
                                </div>
                            </th>
                        );
                    })}
                    <th
                        style={{
                            width: '100px',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            color: '#495057',
                            padding: '1rem 0.75rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            textAlign: 'center',
                        }}
                    >
                        Actions
                    </th>
                </tr>
            </thead>
            <tbody>
                {users.map((u) => {
                    const isBusy = busyRow === u.id;
                    return (
                        <tr
                            key={u.id}
                            style={{
                                borderBottom: '1px solid #e9ecef',
                                transition: 'all 0.2s ease',
                                opacity: isBusy ? 0.6 : 1,
                            }}
                            className="user-row"
                        >
                            <td style={{ padding: '1rem 0.75rem', fontWeight: 500 }}>
                                {u.firstName}
                            </td>
                            <td style={{ padding: '1rem 0.75rem', fontWeight: 500 }}>
                                {u.lastName}
                            </td>
                            <td style={{ padding: '1rem 0.75rem' }}>
                                <div className="d-flex align-items-center gap-2">
                                    <div
                                        style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            background:
                                                'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            fontWeight: 600,
                                            fontSize: '0.75rem',
                                        }}
                                    >
                                        {u.firstName?.charAt(0)}
                                        {u.lastName?.charAt(0)}
                                    </div>
                                    <span className="text-muted small">{u.email}</span>
                                </div>
                            </td>
                            <td style={{ padding: '1rem 0.75rem' }}>
                                <code
                                    className="bg-light px-2 py-1 rounded"
                                    style={{ fontSize: '0.8rem' }}
                                >
                                    {u.employeeNumber}
                                </code>
                            </td>
                            <td style={{ padding: '1rem 0.75rem' }}>
                                <Badge bg={getRoleBadgeColor(u.role)} className="px-3 py-2">
                                    {formatRole(u.role)}
                                </Badge>
                            </td>
                            <td style={{ padding: '1rem 0.75rem' }}>
                                <Badge
                                    bg={getStatusBadgeColor(u.status)}
                                    className="px-3 py-2"
                                    style={{
                                        textTransform: 'capitalize',
                                    }}
                                >
                                    {u.status}
                                </Badge>
                            </td>
                            <td style={{ padding: '1rem 0.75rem' }}>
                                <span className="text-capitalize">{u.department || '-'}</span>
                            </td>
                            <td style={{ padding: '1rem 0.75rem', color: '#6c757d' }}>
                                {u.phoneNumber || '-'}
                            </td>
                            <td style={{ padding: '1rem 0.75rem', fontSize: '0.85rem' }}>
                                {u.lastLoginAt ? (
                                    <div className="d-flex flex-column">
                                        <span className="text-muted small">
                                            {new Date(u.lastLoginAt).toLocaleDateString()}
                                        </span>
                                        <span
                                            className="text-muted"
                                            style={{ fontSize: '0.75rem' }}
                                        >
                                            {new Date(u.lastLoginAt).toLocaleTimeString()}
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-muted">Never</span>
                                )}
                            </td>
                            <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                                <Dropdown align="end">
                                    <Dropdown.Toggle
                                        variant="light"
                                        size="sm"
                                        className="border-0"
                                        style={{
                                            borderRadius: '8px',
                                            padding: '0.375rem 0.75rem',
                                        }}
                                        disabled={isBusy}
                                    >
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <circle cx="12" cy="12" r="1"></circle>
                                            <circle cx="12" cy="5" r="1"></circle>
                                            <circle cx="12" cy="19" r="1"></circle>
                                        </svg>
                                    </Dropdown.Toggle>

                                    <Dropdown.Menu
                                        style={{ borderRadius: '8px', minWidth: '160px' }}
                                    >
                                        <Dropdown.Item
                                            onClick={() => onEdit(u)}
                                            className="d-flex align-items-center gap-2"
                                        >
                                            <svg
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                            </svg>
                                            Edit
                                        </Dropdown.Item>
                                        <Dropdown.Divider />
                                        <Dropdown.Item
                                            onClick={() => onDelete(u)}
                                            className="text-danger d-flex align-items-center gap-2"
                                        >
                                            <svg
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            </svg>
                                            Delete
                                        </Dropdown.Item>
                                    </Dropdown.Menu>
                                </Dropdown>
                            </td>
                        </tr>
                    );
                })}
                {users.length === 0 && (
                    <tr>
                        <td
                            colSpan={columns.length + 1}
                            className="text-center py-5"
                            style={{ color: '#6c757d' }}
                        >
                            <div className="d-flex flex-column align-items-center gap-3">
                                <svg
                                    width="64"
                                    height="64"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    opacity="0.3"
                                >
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                <div>
                                    <div className="fw-semibold mb-1">No users found</div>
                                    <div className="small text-muted">
                                        Try adjusting your search or filters
                                    </div>
                                </div>
                            </div>
                        </td>
                    </tr>
                )}
            </tbody>
            <style>{`
                .user-row:hover {
                    background-color: #f8f9fa;
                    transform: translateY(-1px);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }
            `}</style>
        </Table>
    );
}
