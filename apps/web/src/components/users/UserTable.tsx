// src/components/users/UserTable.tsx
import { Table } from 'react-bootstrap';
import type { UserDto } from '@/api/users';

type Props = {
    users: UserDto[];
    sortBy: keyof UserDto | null;
    sortDir: 'asc' | 'desc';
    onSort: (key: keyof UserDto) => void;
    onEdit: (u: UserDto) => void;
    onDelete: (u: UserDto) => void;
};

const columns: Array<{ key: keyof UserDto; label: string }> = [
    { key: 'firstName', label: 'First' },
    { key: 'lastName', label: 'Last' },
    { key: 'email', label: 'Email' },
    { key: 'username', label: 'Username' },
    { key: 'employeeNumber', label: 'Emp No.' },
    { key: 'role', label: 'Role' },
    { key: 'status', label: 'Status' },
    { key: 'department', label: 'Department' },
    { key: 'phoneNumber', label: 'Phone' },
    { key: 'lastLoginAt', label: 'Last Login' },
];

export default function UserTable({ users, sortBy, sortDir, onSort, onEdit, onDelete }: Props) {
    return (
        <Table hover responsive className="align-middle">
            <thead>
                <tr>
                    {columns.map((c) => {
                        const active = sortBy === c.key;
                        return (
                            <th
                                key={String(c.key)}
                                role="button"
                                onClick={() => onSort(c.key)}
                                style={{ whiteSpace: 'nowrap' }}
                            >
                                {c.label} {active ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                            </th>
                        );
                    })}
                    <th style={{ width: 120 }}>Actions</th>
                </tr>
            </thead>
            <tbody>
                {users.map((u) => (
                    <tr key={u.id}>
                        <td>{u.firstName}</td>
                        <td>{u.lastName}</td>
                        <td>{u.email}</td>
                        <td>{u.username}</td>
                        <td>{u.employeeNumber}</td>
                        <td>{u.role}</td>
                        <td>{u.status}</td>
                        <td>{u.department}</td>
                        <td>{u.phoneNumber}</td>
                        <td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '-'}</td>
                        <td>
                            <button
                                className="btn btn-sm btn-outline-primary me-2"
                                onClick={() => onEdit(u)}
                            >
                                Edit
                            </button>
                            <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => onDelete(u)}
                            >
                                Delete
                            </button>
                        </td>
                    </tr>
                ))}
                {users.length === 0 && (
                    <tr>
                        <td colSpan={columns.length + 1} className="text-center text-muted py-4">
                            No users found.
                        </td>
                    </tr>
                )}
            </tbody>
        </Table>
    );
}
