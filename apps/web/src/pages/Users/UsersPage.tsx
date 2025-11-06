// src/pages/UsersPage.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Form, InputGroup, Pagination, Spinner } from 'react-bootstrap';
import { listUsers, createUser, updateUser, deleteUser, type UserDto } from '@/api/users';
import UserFormModal from '@/components/users/UserFormModal';
import UserTable from '@/components/users/UserTable';

function useDebounced<T>(value: T, delay = 400) {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return v;
}

export default function UsersPage() {
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<UserDto[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounced(search, 500);

    const [sortBy, setSortBy] = useState<keyof UserDto | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    const [showModal, setShowModal] = useState(false);
    const [mode, setMode] = useState<'create' | 'edit'>('create');
    const [selected, setSelected] = useState<UserDto | null>(null);
    const [busyRow, setBusyRow] = useState<string | null>(null);
    const mounted = useRef(false);

    async function fetchData() {
        setLoading(true);
        try {
            const resp = await listUsers({ page, limit, search: debouncedSearch || undefined });
            setUsers(resp.users);
            setTotal(resp.total);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!mounted.current) {
            mounted.current = true;
        }
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, limit, debouncedSearch]);

    const sorted = useMemo(() => {
        if (!sortBy) return users;
        const copy = [...users];
        copy.sort((a: any, b: any) => {
            const av = a[sortBy];
            const bv = b[sortBy];
            if (av == null && bv == null) return 0;
            if (av == null) return sortDir === 'asc' ? -1 : 1;
            if (bv == null) return sortDir === 'asc' ? 1 : -1;
            // string/number/date friendly compare
            const as = typeof av === 'string' ? av.toLowerCase() : String(av);
            const bs = typeof bv === 'string' ? bv.toLowerCase() : String(bv);
            if (as < bs) return sortDir === 'asc' ? -1 : 1;
            if (as > bs) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
        return copy;
    }, [users, sortBy, sortDir]);

    function onSort(key: keyof UserDto) {
        if (sortBy === key) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortBy(key);
            setSortDir('asc');
        }
    }

    function openCreate() {
        setMode('create');
        setSelected(null);
        setShowModal(true);
    }

    function openEdit(u: UserDto) {
        setMode('edit');
        setSelected(u);
        setShowModal(true);
    }

    async function handleSubmit(payload: any) {
        try {
            if (mode === 'create') {
                await createUser(payload);
            } else if (mode === 'edit' && selected) {
                setBusyRow(selected.id);
                await updateUser(selected.id, payload);
                setBusyRow(null);
            }
            setShowModal(false);
            await fetchData();
        } catch (e: any) {
            console.error(e);
            alert(e?.message || 'Failed to save user');
        }
    }

    async function handleDelete(u: UserDto) {
        if (!confirm(`Delete user ${u.firstName} ${u.lastName}?`)) return;
        try {
            setBusyRow(u.id);
            await deleteUser(u.id);
            setBusyRow(null);
            await fetchData();
        } catch (e: any) {
            console.error(e);
            alert(e?.message || 'Failed to delete user');
        }
    }

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const canPrev = page > 1;
    const canNext = page < totalPages;

    return (
        <div className="container py-4">
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h3 className="mb-0">Users</h3>
                <div className="d-flex gap-2">
                    <InputGroup>
                        <Form.Control
                            placeholder="Search name, email, employee #"
                            value={search}
                            onChange={(e) => {
                                setPage(1);
                                setSearch(e.target.value);
                            }}
                        />
                    </InputGroup>
                    <Form.Select
                        style={{ width: 120 }}
                        value={limit}
                        onChange={(e) => {
                            setPage(1);
                            setLimit(Number(e.target.value));
                        }}
                    >
                        {[10, 20, 50, 100].map((n) => (
                            <option key={n} value={n}>
                                {n}/page
                            </option>
                        ))}
                    </Form.Select>
                    <Button onClick={openCreate}>Add User</Button>
                </div>
            </div>

            <div className="card">
                <div className="card-body">
                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" />
                        </div>
                    ) : (
                        <UserTable
                            users={sorted}
                            sortBy={sortBy}
                            sortDir={sortDir}
                            onSort={onSort}
                            onEdit={(u) => (busyRow === u.id ? undefined : openEdit(u))}
                            onDelete={(u) => (busyRow === u.id ? undefined : handleDelete(u))}
                        />
                    )}

                    <div className="d-flex justify-content-between align-items-center">
                        <div className="text-muted small">
                            Showing {total === 0 ? 0 : (page - 1) * limit + 1}–
                            {Math.min(page * limit, total)} of {total}
                        </div>
                        <Pagination className="mb-0">
                            <Pagination.First disabled={!canPrev} onClick={() => setPage(1)} />
                            <Pagination.Prev
                                disabled={!canPrev}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                            />
                            <Pagination.Item active>{page}</Pagination.Item>
                            <Pagination.Next
                                disabled={!canNext}
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            />
                            <Pagination.Last
                                disabled={!canNext}
                                onClick={() => setPage(totalPages)}
                            />
                        </Pagination>
                    </div>
                </div>
            </div>

            <UserFormModal
                show={showModal}
                mode={mode}
                initial={selected ?? undefined}
                onClose={() => setShowModal(false)}
                onSubmit={handleSubmit}
            />
        </div>
    );
}
