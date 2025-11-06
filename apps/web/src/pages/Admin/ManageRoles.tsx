import { useEffect, useMemo, useState } from 'react';
import {
    fetchRoles,
    fetchPermissions,
    fetchRolePermissions,
    updateRolePermissions,
    type RoleDto,
    type PermissionDto,
} from '@/api/roles';
import { Button, Form, ListGroup, Spinner, Alert, Badge } from 'react-bootstrap';

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

    // When selected role changes, load its keys
    useEffect(() => {
        if (!selectedRole) return;
        (async () => {
            try {
                setStatus('loading');
                const keys = await fetchRolePermissions(selectedRole.slug);
                const newKeys = Object.values(keys).filter((k) => !originalKeys.includes(k));
                setRolePermKeys(newKeys);
                setOriginalKeys(newKeys);
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
            await updateRolePermissions(selectedRole.id, rolePermKeys);
            setOriginalKeys(rolePermKeys);
            setStatus('success');
            setTimeout(() => setStatus('idle'), 1500);
        } catch (e: any) {
            setError(e?.message ?? 'Failed to update role permissions');
            setStatus('error');
        }
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

    return (
        <div className="container-fluid">
            <h3 className="mb-3">Manage Roles & Permissions</h3>

            {status === 'error' && (
                <Alert variant="danger" className="mb-3">
                    {error}
                </Alert>
            )}
            {status === 'loading' && (
                <div className="mb-3">
                    <Spinner animation="border" size="sm" /> Loading…
                </div>
            )}
            {status === 'success' && (
                <Alert variant="success" className="mb-3">
                    Saved ✓
                </Alert>
            )}

            <div className="row">
                {/* Roles list */}
                <div className="col-12 col-md-4 mb-3">
                    <div className="card">
                        <div className="card-header">Roles</div>
                        <ListGroup variant="flush">
                            {roles.map((r) => (
                                <ListGroup.Item
                                    key={r.id}
                                    role="button"
                                    active={selectedRole?.id === r.id}
                                    onClick={() => setSelectedRole(r)}
                                >
                                    <strong>{r.name}</strong>
                                    <div className="text-muted small">{r.slug}</div>
                                </ListGroup.Item>
                            ))}
                            {!roles.length && <div className="p-3 text-muted">No roles</div>}
                        </ListGroup>
                    </div>
                </div>

                {/* Permissions grid */}
                <div className="col-12 col-md-8 mb-3">
                    <div className="card">
                        <div className="card-header d-flex align-items-center justify-content-between">
                            <div>
                                Permissions{' '}
                                {selectedRole && (
                                    <Badge bg="secondary" className="ms-2">
                                        {selectedRole.name}
                                    </Badge>
                                )}
                            </div>
                            <div>
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    className="me-2"
                                    onClick={() => setRolePermKeys([])}
                                >
                                    Clear
                                </Button>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    disabled={!dirty || status === 'saving'}
                                    onClick={save}
                                >
                                    {status === 'saving' ? (
                                        <>
                                            <Spinner size="sm" animation="border" /> Saving…
                                        </>
                                    ) : (
                                        'Save changes'
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="card-body">
                            {Object.keys(groups)
                                .sort()
                                .map((group) => (
                                    <div key={group} className="mb-3">
                                        <h6 className="text-uppercase text-muted">{group}</h6>
                                        <div className="row">
                                            {groups[group]
                                                .sort((a, b) => a.key.localeCompare(b.key))
                                                .map((p) => {
                                                    const checked = rolePermKeys.includes(p.key);
                                                    return (
                                                        <div
                                                            className="col-12 col-sm-6 col-lg-4"
                                                            key={p.id}
                                                        >
                                                            <Form.Check
                                                                type="checkbox"
                                                                id={`perm-${p.id}`}
                                                                label={<code>{p.key}</code>}
                                                                checked={checked}
                                                                onChange={() => toggleKey(p.key)}
                                                            />
                                                            {p.description && (
                                                                <div className="small text-muted ms-4">
                                                                    {p.description}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                ))}
                            {!perms.length && <div className="text-muted">No permissions</div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
