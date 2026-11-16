import { useEffect, useMemo, useState } from 'react';
import {
    fetchPermissions,
    fetchRolePermissions,
    fetchRoles,
    updateRolePermissions,
    type PermissionDto,
    type RoleDto,
} from '@/api/roles';
import './ManageRoles.css';

type State = 'idle' | 'loading' | 'saving' | 'error' | 'success';

const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback;

const normalisePermissionKeys = (keys: string[] | Record<string, string>): string[] =>
    Array.isArray(keys) ? keys : Object.values(keys);

const formatGroupName = (value: string) =>
    value
        .split(/[-_]/)
        .filter(Boolean)
        .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
        .join(' ');

export default function ManageRoles() {
    const [roles, setRoles] = useState<RoleDto[]>([]);
    const [permissions, setPermissions] = useState<PermissionDto[]>([]);
    const [selectedRole, setSelectedRole] = useState<RoleDto | null>(null);
    const [rolePermissionKeys, setRolePermissionKeys] = useState<string[]>([]);
    const [originalKeys, setOriginalKeys] = useState<string[]>([]);
    const [status, setStatus] = useState<State>('loading');
    const [error, setError] = useState<string | null>(null);
    const [permissionSearch, setPermissionSearch] = useState('');

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                setStatus('loading');
                setError(null);
                const [loadedRoles, loadedPermissions] = await Promise.all([
                    fetchRoles(),
                    fetchPermissions(),
                ]);
                if (cancelled) return;
                setRoles(loadedRoles);
                setPermissions(loadedPermissions);
                setSelectedRole(loadedRoles[0] ?? null);
                if (!loadedRoles.length) setStatus('idle');
            } catch (caughtError: unknown) {
                if (cancelled) return;
                setError(getErrorMessage(caughtError, 'Failed to load roles and permissions.'));
                setStatus('error');
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!selectedRole) return;
        let cancelled = false;

        (async () => {
            try {
                setStatus('loading');
                setError(null);
                const keys = await fetchRolePermissions(selectedRole.slug);
                if (cancelled) return;
                const permissionKeys = normalisePermissionKeys(keys);
                setRolePermissionKeys(permissionKeys);
                setOriginalKeys(permissionKeys);
                setStatus('idle');
            } catch (caughtError: unknown) {
                if (cancelled) return;
                setError(getErrorMessage(caughtError, 'Failed to load role permissions.'));
                setStatus('error');
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [selectedRole]);

    const dirty = useMemo(() => {
        const current = new Set(rolePermissionKeys);
        const original = new Set(originalKeys);
        if (current.size !== original.size) return true;
        return Array.from(current).some((key) => !original.has(key));
    }, [rolePermissionKeys, originalKeys]);

    const groups = useMemo(() => {
        const grouped: Record<string, PermissionDto[]> = {};
        for (const permission of permissions) {
            const prefix = permission.key.includes('.') ? permission.key.split('.')[0] : 'general';
            if (!grouped[prefix]) grouped[prefix] = [];
            grouped[prefix].push(permission);
        }
        return grouped;
    }, [permissions]);

    const visibleGroups = useMemo(() => {
        const query = permissionSearch.trim().toLowerCase();
        if (!query) return groups;

        return Object.fromEntries(
            Object.entries(groups)
                .map(([group, groupPermissions]) => [
                    group,
                    groupPermissions.filter((permission) =>
                        [permission.key, permission.name, permission.description]
                            .filter(Boolean)
                            .some((value) => value!.toLowerCase().includes(query))
                    ),
                ])
                .filter(([, groupPermissions]) => groupPermissions.length > 0)
        ) as Record<string, PermissionDto[]>;
    }, [groups, permissionSearch]);

    const toggleKey = (key: string) => {
        setRolePermissionKeys((current) =>
            current.includes(key) ? current.filter((value) => value !== key) : [...current, key]
        );
        setStatus('idle');
    };

    const updateGroup = (groupPermissions: PermissionDto[], shouldSelect: boolean) => {
        const groupKeys = new Set(groupPermissions.map((permission) => permission.key));
        setRolePermissionKeys((current) => {
            if (shouldSelect) return Array.from(new Set([...current, ...groupKeys]));
            return current.filter((key) => !groupKeys.has(key));
        });
        setStatus('idle');
    };

    const save = async () => {
        if (!selectedRole) return;
        try {
            setStatus('saving');
            setError(null);
            await updateRolePermissions(selectedRole.slug, rolePermissionKeys);
            setOriginalKeys([...rolePermissionKeys]);
            setStatus('success');
            window.setTimeout(() => setStatus('idle'), 1500);
        } catch (caughtError: unknown) {
            setError(getErrorMessage(caughtError, 'Failed to update role permissions.'));
            setStatus('error');
        }
    };

    const selectAll = () => {
        setRolePermissionKeys(permissions.map((permission) => permission.key));
        setStatus('idle');
    };

    const clearAll = () => {
        setRolePermissionKeys([]);
        setStatus('idle');
    };

    const isLoadingCatalogue = status === 'loading' && roles.length === 0;
    const isLoadingRole = status === 'loading' && roles.length > 0;
    const isSaving = status === 'saving';
    const visiblePermissionCount = Object.values(visibleGroups).reduce(
        (total, groupPermissions) => total + groupPermissions.length,
        0
    );

    return (
        <main className="role-admin" aria-labelledby="role-admin-title">
            <header className="role-admin__header">
                <div>
                    <p className="role-admin__eyebrow">Access administration</p>
                    <h1 id="role-admin-title">Roles &amp; permissions</h1>
                    <p>Control application access by assigning permissions to each system role.</p>
                </div>
                <dl className="role-admin__summary" aria-label="Role management summary">
                    <div>
                        <dt>Roles</dt>
                        <dd>{roles.length}</dd>
                    </div>
                    <div>
                        <dt>Permissions</dt>
                        <dd>{permissions.length}</dd>
                    </div>
                    <div>
                        <dt>Assigned</dt>
                        <dd>{rolePermissionKeys.length}</dd>
                    </div>
                </dl>
            </header>

            {error && (
                <div className="role-admin__notice role-admin__notice--error" role="alert">
                    <span>{error}</span>
                    <button type="button" onClick={() => setError(null)} aria-label="Dismiss error">
                        Dismiss
                    </button>
                </div>
            )}
            {status === 'success' && (
                <div className="role-admin__notice role-admin__notice--success" role="status">
                    Permissions saved successfully.
                </div>
            )}

            <div className="role-admin__workspace">
                <aside className="role-admin__roles" aria-labelledby="system-roles-title">
                    <div className="role-admin__panel-heading">
                        <div>
                            <h2 id="system-roles-title">System roles</h2>
                            <p>Select a role to manage</p>
                        </div>
                        <span>{roles.length}</span>
                    </div>
                    {isLoadingCatalogue ? (
                        <div className="role-admin__state" role="status">
                            <span className="role-admin__spinner" aria-hidden="true" />
                            Loading roles…
                        </div>
                    ) : roles.length ? (
                        <nav className="role-admin__role-list" aria-label="System roles">
                            {roles.map((role) => {
                                const active = selectedRole?.id === role.id;
                                return (
                                    <button
                                        key={role.id}
                                        type="button"
                                        className={active ? 'is-active' : undefined}
                                        aria-current={active ? 'true' : undefined}
                                        onClick={() => {
                                            setSelectedRole(role);
                                            setPermissionSearch('');
                                        }}
                                        disabled={isSaving}
                                    >
                                        <span className="role-admin__role-mark" aria-hidden="true">
                                            {role.name.charAt(0).toUpperCase()}
                                        </span>
                                        <span className="role-admin__role-copy">
                                            <strong>{role.name}</strong>
                                            <small>{role.slug}</small>
                                            {role.description && <em>{role.description}</em>}
                                        </span>
                                        {active && (
                                            <span className="role-admin__role-count">
                                                {rolePermissionKeys.length}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    ) : (
                        <div className="role-admin__state">No roles are available.</div>
                    )}
                </aside>

                <section className="role-admin__permissions" aria-labelledby="permissions-title">
                    <div className="role-admin__permission-header">
                        <div className="role-admin__permission-title">
                            <div>
                                <h2 id="permissions-title">Permissions</h2>
                                <p>
                                    {selectedRole
                                        ? `Configuring ${selectedRole.name}`
                                        : 'Select a role to continue'}
                                </p>
                            </div>
                            {selectedRole && <span>{selectedRole.name}</span>}
                        </div>
                        <div className="role-admin__toolbar">
                            <label className="role-admin__search">
                                <span className="visually-hidden">Search permissions</span>
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <circle cx="11" cy="11" r="7" />
                                    <path d="m20 20-4-4" />
                                </svg>
                                <input
                                    type="search"
                                    value={permissionSearch}
                                    onChange={(event) => setPermissionSearch(event.target.value)}
                                    placeholder="Search permissions"
                                    disabled={!selectedRole || isSaving}
                                />
                            </label>
                            <button
                                type="button"
                                className="role-admin__button role-admin__button--secondary"
                                onClick={selectAll}
                                disabled={!selectedRole || isSaving}
                            >
                                Select all
                            </button>
                            <button
                                type="button"
                                className="role-admin__button role-admin__button--secondary"
                                onClick={clearAll}
                                disabled={!selectedRole || isSaving}
                            >
                                Clear
                            </button>
                        </div>
                    </div>

                    <div className="role-admin__permission-body">
                        {isLoadingRole ? (
                            <div className="role-admin__state" role="status">
                                <span className="role-admin__spinner" aria-hidden="true" />
                                Loading permissions…
                            </div>
                        ) : !selectedRole ? (
                            <div className="role-admin__empty">
                                <strong>No role selected</strong>
                                <span>Choose a system role to review its access.</span>
                            </div>
                        ) : permissions.length === 0 ? (
                            <div className="role-admin__empty">
                                <strong>No permissions available</strong>
                                <span>The permission catalogue is currently empty.</span>
                            </div>
                        ) : visiblePermissionCount === 0 ? (
                            <div className="role-admin__empty">
                                <strong>No matching permissions</strong>
                                <span>Try a different key, name or description.</span>
                            </div>
                        ) : (
                            <div className="role-admin__groups">
                                {Object.entries(visibleGroups)
                                    .sort(([left], [right]) => left.localeCompare(right))
                                    .map(([group, groupPermissions]) => {
                                        const selectedCount = groupPermissions.filter(
                                            (permission) =>
                                                rolePermissionKeys.includes(permission.key)
                                        ).length;
                                        const allSelected =
                                            selectedCount === groupPermissions.length &&
                                            groupPermissions.length > 0;
                                        return (
                                            <section
                                                className="role-admin__group"
                                                key={group}
                                                aria-labelledby={`permission-group-${group}`}
                                            >
                                                <div className="role-admin__group-heading">
                                                    <div>
                                                        <h3 id={`permission-group-${group}`}>
                                                            {formatGroupName(group)}
                                                        </h3>
                                                        <span>
                                                            {selectedCount} of{' '}
                                                            {groupPermissions.length} selected
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            updateGroup(
                                                                groupPermissions,
                                                                !allSelected
                                                            )
                                                        }
                                                        disabled={isSaving}
                                                    >
                                                        {allSelected
                                                            ? 'Clear group'
                                                            : 'Select group'}
                                                    </button>
                                                </div>
                                                <div className="role-admin__permission-grid">
                                                    {[...groupPermissions]
                                                        .sort((left, right) =>
                                                            left.key.localeCompare(right.key)
                                                        )
                                                        .map((permission) => {
                                                            const checked =
                                                                rolePermissionKeys.includes(
                                                                    permission.key
                                                                );
                                                            return (
                                                                <label
                                                                    className={`role-admin__permission ${checked ? 'is-selected' : ''}`}
                                                                    key={permission.id}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={checked}
                                                                        onChange={() =>
                                                                            toggleKey(
                                                                                permission.key
                                                                            )
                                                                        }
                                                                        disabled={isSaving}
                                                                    />
                                                                    <span>
                                                                        <code>
                                                                            {permission.key}
                                                                        </code>
                                                                        <strong>
                                                                            {permission.name ||
                                                                                permission.key}
                                                                        </strong>
                                                                        {permission.description && (
                                                                            <small>
                                                                                {
                                                                                    permission.description
                                                                                }
                                                                            </small>
                                                                        )}
                                                                    </span>
                                                                </label>
                                                            );
                                                        })}
                                                </div>
                                            </section>
                                        );
                                    })}
                            </div>
                        )}
                    </div>

                    <footer className="role-admin__footer">
                        <div aria-live="polite">
                            <strong>{rolePermissionKeys.length}</strong> permissions assigned
                            {dirty && <span>Unsaved changes</span>}
                        </div>
                        <button
                            type="button"
                            className="role-admin__button role-admin__button--primary"
                            disabled={!dirty || isSaving || !selectedRole}
                            onClick={save}
                        >
                            {isSaving ? 'Saving…' : 'Save changes'}
                        </button>
                    </footer>
                </section>
            </div>
        </main>
    );
}
