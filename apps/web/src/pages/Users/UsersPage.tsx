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

    // Calculate stats
    const activeUsers = users.filter((u) => u.status === 'active').length;
    const totalActiveUsers = Math.round((activeUsers / Math.max(users.length, 1)) * 100);

    return (
        <div className="container-fluid px-4 py-4">
            {/* Modern Header Card with Gradient */}
            <div
                className="card border-0 shadow-sm mb-4"
                style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '16px',
                }}
            >
                <div className="card-body p-4">
                    <div className="row align-items-center">
                        <div className="col-md-6">
                            <div className="d-flex align-items-center">
                                <div
                                    className="bg-white bg-opacity-25 rounded-3 p-3 me-3"
                                    style={{ backdropFilter: 'blur(10px)' }}
                                >
                                    <svg
                                        width="32"
                                        height="32"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="white"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="9" cy="7" r="4"></circle>
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-white mb-1 fw-bold">User Management</h2>
                                    <p className="text-white text-opacity-75 mb-0">
                                        Manage system users, roles, and permissions
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="row g-3 text-white">
                                <div className="col-4">
                                    <div className="text-center">
                                        <div className="fs-3 fw-bold">{total}</div>
                                        <div className="small opacity-75">Total Users</div>
                                    </div>
                                </div>
                                <div className="col-4">
                                    <div className="text-center">
                                        <div className="fs-3 fw-bold">{activeUsers}</div>
                                        <div className="small opacity-75">Active</div>
                                    </div>
                                </div>
                                <div className="col-4">
                                    <div className="text-center">
                                        <div className="fs-3 fw-bold">{totalActiveUsers}%</div>
                                        <div className="small opacity-75">Active Rate</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '12px' }}>
                <div className="card-body p-3">
                    <div className="row align-items-center g-3">
                        <div className="col-md-5">
                            <InputGroup className="shadow-sm">
                                <InputGroup.Text
                                    className="bg-white border-end-0"
                                    style={{ borderRadius: '8px 0 0 8px' }}
                                >
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <path d="m21 21-4.35-4.35"></path>
                                    </svg>
                                </InputGroup.Text>
                                <Form.Control
                                    placeholder="Search by name, email, or employee number..."
                                    className="border-start-0 ps-0"
                                    style={{ borderRadius: '0 8px 8px 0' }}
                                    value={search}
                                    onChange={(e) => {
                                        setPage(1);
                                        setSearch(e.target.value);
                                    }}
                                />
                            </InputGroup>
                        </div>
                        <div className="col-md-3">
                            <Form.Select
                                className="shadow-sm"
                                style={{ borderRadius: '8px' }}
                                value={limit}
                                onChange={(e) => {
                                    setPage(1);
                                    setLimit(Number(e.target.value));
                                }}
                            >
                                <option value={10}>10 per page</option>
                                <option value={20}>20 per page</option>
                                <option value={50}>50 per page</option>
                                <option value={100}>100 per page</option>
                            </Form.Select>
                        </div>
                        <div className="col-md-4 text-end">
                            <Button
                                variant="primary"
                                className="shadow-sm px-4"
                                style={{
                                    borderRadius: '8px',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    border: 'none',
                                }}
                                onClick={openCreate}
                            >
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="me-2"
                                    style={{ marginTop: '-3px' }}
                                >
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="16"></line>
                                    <line x1="8" y1="12" x2="16" y2="12"></line>
                                </svg>
                                Add New User
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Table Card */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                <div className="card-body p-0">
                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner
                                animation="border"
                                style={{ width: '3rem', height: '3rem', color: '#667eea' }}
                            />
                            <p className="text-muted mt-3 mb-0">Loading users...</p>
                        </div>
                    ) : (
                        <>
                            <div style={{ overflowX: 'auto' }}>
                                <UserTable
                                    users={sorted}
                                    sortBy={sortBy}
                                    sortDir={sortDir}
                                    onSort={onSort}
                                    onEdit={(u) => (busyRow === u.id ? undefined : openEdit(u))}
                                    onDelete={(u) =>
                                        busyRow === u.id ? undefined : handleDelete(u)
                                    }
                                    busyRow={busyRow}
                                />
                            </div>

                            {/* Pagination Footer */}
                            <div
                                className="d-flex justify-content-between align-items-center px-4 py-3"
                                style={{
                                    borderTop: '1px solid #e9ecef',
                                    background: '#f8f9fa',
                                    borderRadius: '0 0 12px 12px',
                                }}
                            >
                                <div className="text-muted">
                                    <span className="fw-semibold">
                                        {total === 0 ? 0 : (page - 1) * limit + 1}–
                                        {Math.min(page * limit, total)}
                                    </span>{' '}
                                    of <span className="fw-semibold">{total}</span> users
                                </div>
                                <Pagination className="mb-0" size="sm">
                                    <Pagination.First
                                        disabled={!canPrev}
                                        onClick={() => setPage(1)}
                                    />
                                    <Pagination.Prev
                                        disabled={!canPrev}
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    />
                                    <Pagination.Item active>
                                        {page} / {totalPages}
                                    </Pagination.Item>
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
                        </>
                    )}
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
