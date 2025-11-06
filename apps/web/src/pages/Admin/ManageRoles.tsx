import { useEffect, useMemo, useState } from 'react';
import {
    fetchRoles,
    fetchPermissions,
    fetchRolePermissions,
    updateRolePermissions,
    type RoleDto,
    type PermissionDto,
} from '@/api/roles';
import { Button, Form, Spinner, Alert, Badge, Card } from 'react-bootstrap';

type State = 'idle' | 'loading' | 'saving' | 'error' | 'success';

export default function ManageRoles() {
    const [roles, setRoles] = useState<RoleDto[]>([]);
    const [perms, setPerms] = useState<PermissionDto[]>([]);
    const [selectedRole, setSelectedRole] = useState<RoleDto | null>(null);
    const [rolePermKeys, setRolePermKeys] = useState<string[]>([]);
    const [originalKeys, setOriginalKeys] = useState<string[]>([]);
    const [status, setStatus] = useState<State>('loading');
    const [error, setError] = useState<string | null>(null);

    // Load roles + permissions on mount
    useEffect(() => {
        (async () => {
            try {
                setStatus('loading');
                const [r, p] = await Promise.all([fetchRoles(), fetchPermissions()]);
                setRoles(r);
                setPerms(p);
                setStatus('idle');
                if (r.length) {
                    setSelectedRole(r[0]);
                }
            } catch (e: any) {
                setError(e?.message ?? 'Failed to load roles/permissions');
                setStatus('error');
            }
        })();
    }, []);

    // When selected role changes, load its permissions using role.slug
    useEffect(() => {
        if (!selectedRole) return;
        (async () => {
            try {
                setStatus('loading');
                // Use slug instead of id for the endpoint
                const keys = await fetchRolePermissions(selectedRole.slug);
                const permKeys = Array.isArray(keys) ? keys : Object.values(keys);
                setRolePermKeys(permKeys as string[]);
                setOriginalKeys(permKeys as string[]);
                setStatus('idle');
            } catch (e: any) {
                setError(e?.message ?? 'Failed to load role permissions');
                setStatus('error');
            }
        })();
    }, [selectedRole?.id]);

    const dirty = useMemo(() => {
        const a = new Set(rolePermKeys);
        const b = new Set(originalKeys);
        if (a.size !== b.size) return true;
        for (const k of a) if (!b.has(k)) return true;
        return false;
    }, [rolePermKeys, originalKeys]);

    const toggleKey = (k: string) => {
        setRolePermKeys((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
    };

    const save = async () => {
        if (!selectedRole) return;
        try {
            setStatus('saving');
            // Use slug for update endpoint
            await updateRolePermissions(selectedRole.slug, rolePermKeys);
            setOriginalKeys(rolePermKeys);
            setStatus('success');
            setTimeout(() => setStatus('idle'), 1500);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to update role permissions');
            setStatus('error');
        }
    };

    const selectAll = () => {
        setRolePermKeys(perms.map((p) => p.key));
    };

    const groups = useMemo(() => {
        // Optional groupings by prefix to make UI nicer
        const map: Record<string, PermissionDto[]> = {};
        for (const p of perms) {
            const prefix = p.key.includes('.') ? p.key.split('.')[0] : 'general';
            if (!map[prefix]) map[prefix] = [];
            map[prefix].push(p);
        }
        return map;
    }, [perms]);

    const getRoleBadgeColor = (slug: string): string => {
        const roleColors: Record<string, string> = {
            ceo: 'danger',
            'operations-manager': 'warning',
            'team-leader': 'info',
            manager: 'primary',
            agent: 'success',
            viewer: 'secondary',
        };
        return roleColors[slug] || 'secondary';
    };

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
                                        <rect
                                            x="3"
                                            y="3"
                                            width="18"
                                            height="18"
                                            rx="2"
                                            ry="2"
                                        ></rect>
                                        <line x1="9" y1="9" x2="15" y2="9"></line>
                                        <line x1="9" y1="15" x2="15" y2="15"></line>
                                        <line x1="12" y1="9" x2="12" y2="15"></line>
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-white mb-1 fw-bold">Roles & Permissions</h2>
                                    <p className="text-white text-opacity-75 mb-0">
                                        Manage role-based access control and permissions
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="row g-3 text-white">
                                <div className="col-4">
                                    <div className="text-center">
                                        <div className="fs-3 fw-bold">{roles.length}</div>
                                        <div className="small opacity-75">System Roles</div>
                                    </div>
                                </div>
                                <div className="col-4">
                                    <div className="text-center">
                                        <div className="fs-3 fw-bold">{perms.length}</div>
                                        <div className="small opacity-75">Permissions</div>
                                    </div>
                                </div>
                                <div className="col-4">
                                    <div className="text-center">
                                        <div className="fs-3 fw-bold">{rolePermKeys.length}</div>
                                        <div className="small opacity-75">Active Perms</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Messages */}
            {status === 'error' && error && (
                <Alert
                    variant="danger"
                    dismissible
                    onClose={() => setError(null)}
                    className="mb-4 shadow-sm"
                    style={{ borderRadius: '12px', border: 'none' }}
                >
                    <div className="d-flex align-items-center">
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="me-2"
                        >
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                        {error}
                    </div>
                </Alert>
            )}

            {status === 'success' && (
                <Alert
                    variant="success"
                    className="mb-4 shadow-sm"
                    style={{ borderRadius: '12px', border: 'none' }}
                >
                    <div className="d-flex align-items-center">
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="me-2"
                        >
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        Permissions saved successfully!
                    </div>
                </Alert>
            )}

            <div className="row">
                {/* Roles List Card */}
                <div className="col-12 col-lg-4 mb-4">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
                        <div
                            className="card-header bg-white border-0 py-3"
                            style={{ borderRadius: '12px 12px 0 0' }}
                        >
                            <h5 className="mb-0 fw-semibold">System Roles</h5>
                            <p className="text-muted small mb-0 mt-1">
                                Select a role to manage permissions
                            </p>
                        </div>
                        <div className="card-body p-0">
                            {status === 'loading' && !roles.length ? (
                                <div className="text-center py-5">
                                    <Spinner
                                        animation="border"
                                        style={{ width: '2rem', height: '2rem', color: '#667eea' }}
                                    />
                                    <p className="text-muted mt-3 mb-0 small">Loading roles...</p>
                                </div>
                            ) : (
                                <div className="list-group list-group-flush">
                                    {roles.map((r) => {
                                        const isActive = selectedRole?.id === r.id;
                                        return (
                                            <button
                                                key={r.id}
                                                className={`list-group-item list-group-item-action border-0 ${
                                                    isActive ? 'active' : ''
                                                }`}
                                                onClick={() => setSelectedRole(r)}
                                                style={{
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    background: isActive
                                                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                                        : 'transparent',
                                                    borderLeft: isActive
                                                        ? '4px solid #667eea'
                                                        : '4px solid transparent',
                                                }}
                                            >
                                                <div className="d-flex align-items-center justify-content-between">
                                                    <div>
                                                        <div
                                                            className={`fw-semibold ${
                                                                isActive ? 'text-white' : ''
                                                            }`}
                                                        >
                                                            {r.name}
                                                        </div>
                                                        <div
                                                            className={`small ${
                                                                isActive
                                                                    ? 'text-white text-opacity-75'
                                                                    : 'text-muted'
                                                            }`}
                                                        >
                                                            <code
                                                                className={
                                                                    isActive
                                                                        ? 'text-white bg-white bg-opacity-25'
                                                                        : 'bg-light'
                                                                }
                                                                style={{
                                                                    padding: '2px 6px',
                                                                    borderRadius: '4px',
                                                                    fontSize: '0.75rem',
                                                                }}
                                                            >
                                                                {r.slug}
                                                            </code>
                                                        </div>
                                                        {r.description && (
                                                            <div
                                                                className={`small mt-1 ${
                                                                    isActive
                                                                        ? 'text-white text-opacity-75'
                                                                        : 'text-muted'
                                                                }`}
                                                            >
                                                                {r.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {isActive && (
                                                        <Badge
                                                            bg="light"
                                                            text="primary"
                                                            className="ms-2"
                                                        >
                                                            {rolePermKeys.length}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                    {!roles.length && (
                                        <div className="p-4 text-center text-muted">
                                            No roles found
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Permissions Grid Card */}
                <div className="col-12 col-lg-8 mb-4">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
                        <div
                            className="card-header bg-white border-0 py-3"
                            style={{ borderRadius: '12px 12px 0 0' }}
                        >
                            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                                <div className="d-flex align-items-center gap-2">
                                    <h5 className="mb-0 fw-semibold">Permissions</h5>
                                    {selectedRole && (
                                        <Badge
                                            bg={getRoleBadgeColor(selectedRole.slug)}
                                            className="px-3 py-2"
                                        >
                                            {selectedRole.name}
                                        </Badge>
                                    )}
                                </div>
                                <div className="d-flex gap-2">
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={selectAll}
                                        disabled={!selectedRole || status === 'saving'}
                                        style={{ borderRadius: '8px' }}
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
                                            className="me-1"
                                            style={{ marginTop: '-2px' }}
                                        >
                                            <polyline points="9 11 12 14 22 4"></polyline>
                                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                                        </svg>
                                        Select All
                                    </Button>
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={() => setRolePermKeys([])}
                                        disabled={!selectedRole || status === 'saving'}
                                        style={{ borderRadius: '8px' }}
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
                                            className="me-1"
                                            style={{ marginTop: '-2px' }}
                                        >
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                        Clear All
                                    </Button>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        disabled={!dirty || status === 'saving' || !selectedRole}
                                        onClick={save}
                                        style={{
                                            borderRadius: '8px',
                                            background: dirty
                                                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                                : undefined,
                                            border: 'none',
                                        }}
                                    >
                                        {status === 'saving' ? (
                                            <>
                                                <Spinner
                                                    size="sm"
                                                    animation="border"
                                                    className="me-2"
                                                />
                                                Saving…
                                            </>
                                        ) : (
                                            <>
                                                <svg
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    className="me-1"
                                                    style={{ marginTop: '-2px' }}
                                                >
                                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                                    <polyline points="7 3 7 8 15 8"></polyline>
                                                </svg>
                                                Save Changes
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                            {dirty && (
                                <div className="mt-2">
                                    <Badge bg="warning" text="dark" className="px-2 py-1">
                                        <svg
                                            width="14"
                                            height="14"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="me-1"
                                            style={{ marginTop: '-2px' }}
                                        >
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <line x1="12" y1="8" x2="12" y2="12"></line>
                                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                        </svg>
                                        Unsaved changes
                                    </Badge>
                                </div>
                            )}
                        </div>

                        <div className="card-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            {status === 'loading' && !perms.length ? (
                                <div className="text-center py-5">
                                    <Spinner
                                        animation="border"
                                        style={{ width: '2rem', height: '2rem', color: '#667eea' }}
                                    />
                                    <p className="text-muted mt-3 mb-0 small">
                                        Loading permissions...
                                    </p>
                                </div>
                            ) : selectedRole ? (
                                Object.keys(groups)
                                    .sort()
                                    .map((group) => (
                                        <Card
                                            key={group}
                                            className="mb-3 border-0 shadow-sm"
                                            style={{ borderRadius: '8px' }}
                                        >
                                            <Card.Header
                                                className="bg-light border-0 py-2"
                                                style={{ borderRadius: '8px 8px 0 0' }}
                                            >
                                                <div className="d-flex align-items-center justify-content-between">
                                                    <h6 className="text-uppercase text-primary mb-0 fw-semibold">
                                                        <svg
                                                            width="16"
                                                            height="16"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            className="me-2"
                                                            style={{ marginTop: '-2px' }}
                                                        >
                                                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                                                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                                                        </svg>
                                                        {group}
                                                    </h6>
                                                    <Badge bg="secondary" className="px-2">
                                                        {
                                                            groups[group].filter((p) =>
                                                                rolePermKeys.includes(p.key)
                                                            ).length
                                                        }
                                                        /{groups[group].length}
                                                    </Badge>
                                                </div>
                                            </Card.Header>
                                            <Card.Body className="p-3">
                                                <div className="row g-3">
                                                    {groups[group]
                                                        .sort((a, b) => a.key.localeCompare(b.key))
                                                        .map((p) => {
                                                            const checked = rolePermKeys.includes(
                                                                p.key
                                                            );
                                                            return (
                                                                <div
                                                                    className="col-12 col-md-6"
                                                                    key={p.id}
                                                                >
                                                                    <div
                                                                        className={`p-3 rounded ${
                                                                            checked
                                                                                ? 'bg-primary bg-opacity-10 border-primary'
                                                                                : 'bg-light'
                                                                        }`}
                                                                        style={{
                                                                            border: checked
                                                                                ? '2px solid'
                                                                                : '2px solid transparent',
                                                                            transition:
                                                                                'all 0.2s ease',
                                                                            cursor: 'pointer',
                                                                        }}
                                                                        onClick={() =>
                                                                            toggleKey(p.key)
                                                                        }
                                                                    >
                                                                        <Form.Check
                                                                            type="checkbox"
                                                                            id={`perm-${p.id}`}
                                                                            checked={checked}
                                                                            onChange={() =>
                                                                                toggleKey(p.key)
                                                                            }
                                                                            label={
                                                                                <div>
                                                                                    <code
                                                                                        className={`fw-semibold ${
                                                                                            checked
                                                                                                ? 'text-primary'
                                                                                                : ''
                                                                                        }`}
                                                                                        style={{
                                                                                            fontSize:
                                                                                                '0.85rem',
                                                                                        }}
                                                                                    >
                                                                                        {p.key}
                                                                                    </code>
                                                                                    {p.description && (
                                                                                        <div className="small text-muted mt-1">
                                                                                            {
                                                                                                p.description
                                                                                            }
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            }
                                                                            style={{
                                                                                cursor: 'pointer',
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    ))
                            ) : (
                                <div className="text-center py-5">
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
                                        className="mb-3"
                                    >
                                        <rect
                                            x="3"
                                            y="11"
                                            width="18"
                                            height="11"
                                            rx="2"
                                            ry="2"
                                        ></rect>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                    </svg>
                                    <div className="text-muted">
                                        <div className="fw-semibold mb-1">No role selected</div>
                                        <div className="small">
                                            Select a role from the list to manage permissions
                                        </div>
                                    </div>
                                </div>
                            )}

                            {perms.length === 0 && selectedRole && (
                                <div className="text-center py-5">
                                    <div className="text-muted">No permissions available</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
