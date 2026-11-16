import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    createUser,
    deleteUser,
    listUsers,
    updateUser,
    type CreateUserDto,
    type UpdateUserDto,
    type UserDto,
    type UserRole,
    type UserStatus,
} from '@/api/users';
import UserFormModal from '@/components/users/UserFormModal';
import UserTable from '@/components/users/UserTable';
import './UsersPage.css';

function useDebounced<T>(value: T, delay = 400) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = window.setTimeout(() => setDebounced(value), delay);
        return () => window.clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}

const roleOptions: UserRole[] = [
    'admin', 'admin_manager', 'manager', 'team_leader', 'operations_manager', 'agent',
    'sales_agent', 'debt_review_specialist', 'lead_provider', 'chief_executive_officer', 'viewer',
];
const statusOptions: UserStatus[] = ['active', 'inactive', 'suspended', 'pending'];
const formatOption = (value: string) => value.split(/[_-]/).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
const getErrorMessage = (error: unknown, fallback: string) => error instanceof Error && error.message ? error.message : fallback;

export default function UsersPage() {
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<UserDto[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [search, setSearch] = useState('');
    const [role, setRole] = useState<UserRole | ''>('');
    const [status, setStatus] = useState<UserStatus | ''>('');
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const debouncedSearch = useDebounced(search);
    const [sortBy, setSortBy] = useState<keyof UserDto | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [showModal, setShowModal] = useState(false);
    const [mode, setMode] = useState<'create' | 'edit'>('create');
    const [selected, setSelected] = useState<UserDto | null>(null);
    const [busyRow, setBusyRow] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await listUsers({ page, limit, search: debouncedSearch || undefined, role: role || undefined, status: status || undefined });
            setUsers(response.users);
            setTotal(response.total);
        } catch (caughtError: unknown) {
            setError(getErrorMessage(caughtError, 'Failed to load users.'));
        } finally {
            setLoading(false);
        }
    }, [page, limit, debouncedSearch, role, status]);

    useEffect(() => { void fetchData(); }, [fetchData]);

    const sortedUsers = useMemo(() => {
        if (!sortBy) return users;
        return [...users].sort((a, b) => {
            const first = a[sortBy];
            const second = b[sortBy];
            if (first == null && second == null) return 0;
            if (first == null) return sortDir === 'asc' ? -1 : 1;
            if (second == null) return sortDir === 'asc' ? 1 : -1;
            return String(first).toLocaleLowerCase().localeCompare(String(second).toLocaleLowerCase()) * (sortDir === 'asc' ? 1 : -1);
        });
    }, [users, sortBy, sortDir]);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const firstResult = total === 0 ? 0 : (page - 1) * limit + 1;
    const lastResult = Math.min(page * limit, total);

    const handleSort = (key: keyof UserDto) => {
        if (sortBy === key) { setSortDir((direction) => direction === 'asc' ? 'desc' : 'asc'); return; }
        setSortBy(key);
        setSortDir('asc');
    };
    const openCreate = () => { setMode('create'); setSelected(null); setShowModal(true); };
    const openEdit = (user: UserDto) => { setMode('edit'); setSelected(user); setShowModal(true); };

    const handleSubmit = async (payload: CreateUserDto | UpdateUserDto) => {
        if (mode === 'create') {
            await createUser(payload as CreateUserDto);
            setNotice('User created successfully.');
        } else if (selected) {
            setBusyRow(selected.id);
            try { await updateUser(selected.id, payload as UpdateUserDto); setNotice('User updated successfully.'); }
            finally { setBusyRow(null); }
        }
        setShowModal(false);
        await fetchData();
    };

    const handleDelete = async (user: UserDto) => {
        if (!window.confirm(`Delete ${user.firstName} ${user.lastName}? This cannot be undone.`)) return;
        setBusyRow(user.id);
        setError(null);
        try { await deleteUser(user.id); setNotice('User deleted successfully.'); await fetchData(); }
        catch (caughtError: unknown) { setError(getErrorMessage(caughtError, 'Failed to delete user.')); }
        finally { setBusyRow(null); }
    };

    const resetFilters = () => { setSearch(''); setRole(''); setStatus(''); setPage(1); };

    return (
        <main className="users-page" aria-labelledby="users-page-title">
            <header className="users-page__header">
                <div><p className="users-page__eyebrow">Access administration</p><h1 id="users-page-title">User management</h1><p>Manage user identities, access roles and account status.</p></div>
                <div className="users-page__header-actions"><span className="users-page__count">{total} users</span><button type="button" className="users-page__primary" onClick={openCreate}><span aria-hidden="true">+</span> Add user</button></div>
            </header>

            {error && <div className="users-page__alert users-page__alert--error" role="alert"><span>{error}</span><button type="button" onClick={() => setError(null)}>Dismiss</button></div>}
            {notice && <div className="users-page__alert users-page__alert--success" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice(null)}>Dismiss</button></div>}

            <section className="users-page__panel" aria-label="User directory">
                <div className="users-page__toolbar">
                    <label className="users-page__search"><span className="visually-hidden">Search users</span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg><input type="search" value={search} placeholder="Search name, email or employee number" onChange={(event) => { setSearch(event.target.value); setPage(1); }} /></label>
                    <label><span className="visually-hidden">Filter by role</span><select value={role} onChange={(event) => { setRole(event.target.value as UserRole | ''); setPage(1); }}><option value="">All roles</option>{roleOptions.map((option) => <option key={option} value={option}>{formatOption(option)}</option>)}</select></label>
                    <label><span className="visually-hidden">Filter by status</span><select value={status} onChange={(event) => { setStatus(event.target.value as UserStatus | ''); setPage(1); }}><option value="">All statuses</option>{statusOptions.map((option) => <option key={option} value={option}>{formatOption(option)}</option>)}</select></label>
                    <label className="users-page__page-size"><span>Rows</span><select value={limit} onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }}>{[10, 20, 50, 100].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
                    {(search || role || status) && <button type="button" className="users-page__clear" onClick={resetFilters}>Clear</button>}
                </div>

                {loading ? <div className="users-page__state" role="status"><span className="users-page__spinner" />Loading users…</div> : error && users.length === 0 ? <div className="users-page__state"><strong>Users could not be loaded.</strong><button type="button" onClick={() => void fetchData()}>Retry</button></div> : <UserTable users={sortedUsers} sortBy={sortBy} sortDir={sortDir} onSort={handleSort} onEdit={openEdit} onDelete={(user) => void handleDelete(user)} busyRow={busyRow} />}

                <footer className="users-page__footer"><span>Showing <strong>{firstResult}-{lastResult}</strong> of <strong>{total}</strong></span><div className="users-page__pagination" aria-label="User pagination"><button type="button" disabled={page === 1} onClick={() => setPage(1)} aria-label="First page">«</button><button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page} of {totalPages}</span><button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</button><button type="button" disabled={page >= totalPages} onClick={() => setPage(totalPages)} aria-label="Last page">»</button></div></footer>
            </section>
            <UserFormModal show={showModal} mode={mode} initial={selected ?? undefined} onClose={() => setShowModal(false)} onSubmit={handleSubmit} />
        </main>
    );
}
