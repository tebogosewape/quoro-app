import { useMemo, useState, type FormEvent } from 'react';
import { changeUserPassword, updateUser } from '@/api/users';
import { useAuthStore } from '@/stores/auth.store';
import './ManageProfile.css';

type Notice = { tone: 'success' | 'error'; message: string } | null;

const roleLabel = (role: string) =>
    role
        .split('_')
        .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
        .join(' ');

export default function ManageProfile() {
    const session = useAuthStore((state) => state.session);
    const setSession = useAuthStore((state) => state.setSession);
    const user = session?.user;
    const initialProfile = useMemo(
        () => ({
            firstName: user?.firstName ?? '',
            lastName: user?.lastName ?? '',
            email: user?.email ?? '',
            username: user?.username ?? '',
            phoneNumber: user?.phoneNumber ?? '',
            department: user?.department ?? '',
        }),
        [user]
    );
    const [profile, setProfile] = useState(initialProfile);
    const [profileNotice, setProfileNotice] = useState<Notice>(null);
    const [savingProfile, setSavingProfile] = useState(false);
    const [password, setPassword] = useState({ current: '', next: '', confirm: '' });
    const [passwordNotice, setPasswordNotice] = useState<Notice>(null);
    const [savingPassword, setSavingPassword] = useState(false);

    if (!session || !user) {
        return (
            <main className="account-profile account-profile-state">
                <strong>Loading your account</strong>
            </main>
        );
    }

    const updateField = (field: keyof typeof profile, value: string) => {
        setProfile((current) => ({ ...current, [field]: value }));
        setProfileNotice(null);
    };

    const resetProfile = () => {
        setProfile(initialProfile);
        setProfileNotice(null);
    };

    const saveProfile = async (event: FormEvent) => {
        event.preventDefault();
        const required = [profile.firstName, profile.lastName, profile.email, profile.username];
        if (required.some((value) => !value.trim())) {
            setProfileNotice({ tone: 'error', message: 'Complete all required account fields.' });
            return;
        }

        setSavingProfile(true);
        setProfileNotice(null);
        try {
            const updated = await updateUser(user.id, {
                firstName: profile.firstName.trim(),
                lastName: profile.lastName.trim(),
                email: profile.email.trim(),
                username: profile.username.trim(),
                phoneNumber: profile.phoneNumber.trim() || undefined,
                department: profile.department.trim() || undefined,
            });
            setSession({
                ...session,
                user: { ...session.user, ...updated, permissions: session.user.permissions },
            });
            setProfileNotice({ tone: 'success', message: 'Profile updated successfully.' });
        } catch (error) {
            setProfileNotice({
                tone: 'error',
                message: error instanceof Error ? error.message : 'Failed to update profile.',
            });
        } finally {
            setSavingProfile(false);
        }
    };

    const savePassword = async (event: FormEvent) => {
        event.preventDefault();
        setPasswordNotice(null);
        if (!password.current || !password.next || !password.confirm) {
            setPasswordNotice({ tone: 'error', message: 'Complete all password fields.' });
            return;
        }
        if (password.next.length < 8) {
            setPasswordNotice({
                tone: 'error',
                message: 'New password must be at least 8 characters.',
            });
            return;
        }
        if (password.next !== password.confirm) {
            setPasswordNotice({
                tone: 'error',
                message: 'New password and confirmation do not match.',
            });
            return;
        }

        setSavingPassword(true);
        try {
            await changeUserPassword(user.id, {
                currentPassword: password.current,
                newPassword: password.next,
            });
            setPassword({ current: '', next: '', confirm: '' });
            setPasswordNotice({ tone: 'success', message: 'Password updated successfully.' });
        } catch (error) {
            setPasswordNotice({
                tone: 'error',
                message: error instanceof Error ? error.message : 'Failed to update password.',
            });
        } finally {
            setSavingPassword(false);
        }
    };

    const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

    return (
        <main className="account-profile">
            <header className="account-profile-header">
                <div className="account-profile-avatar" aria-hidden="true">
                    {initials}
                </div>
                <div>
                    <p>Account</p>
                    <h1>My profile</h1>
                    <span>Manage your personal details and account security.</span>
                </div>
                <div className="account-profile-identity">
                    <strong>
                        {user.firstName} {user.lastName}
                    </strong>
                    <span>{roleLabel(user.role)}</span>
                </div>
            </header>

            <div className="account-profile-grid">
                <section className="account-profile-panel" aria-labelledby="profile-details-title">
                    <header>
                        <div>
                            <h2 id="profile-details-title">Account details</h2>
                            <p>Information used across your workspace.</p>
                        </div>
                        <span>Required fields marked *</span>
                    </header>
                    <form onSubmit={saveProfile}>
                        <div className="account-profile-fields">
                            <ProfileField
                                label="First name *"
                                value={profile.firstName}
                                onChange={(value) => updateField('firstName', value)}
                                autoComplete="given-name"
                            />
                            <ProfileField
                                label="Last name *"
                                value={profile.lastName}
                                onChange={(value) => updateField('lastName', value)}
                                autoComplete="family-name"
                            />
                            <ProfileField
                                label="Email address *"
                                type="email"
                                value={profile.email}
                                onChange={(value) => updateField('email', value)}
                                autoComplete="email"
                            />
                            <ProfileField
                                label="Username *"
                                value={profile.username}
                                onChange={(value) => updateField('username', value)}
                                autoComplete="username"
                            />
                            <ProfileField
                                label="Phone number"
                                type="tel"
                                value={profile.phoneNumber}
                                onChange={(value) => updateField('phoneNumber', value)}
                                autoComplete="tel"
                            />
                            <ProfileField
                                label="Department"
                                value={profile.department}
                                onChange={(value) => updateField('department', value)}
                            />
                        </div>
                        {profileNotice && <NoticeView notice={profileNotice} />}
                        <div className="account-profile-actions">
                            <button type="button" onClick={resetProfile} disabled={savingProfile}>
                                Cancel
                            </button>
                            <button type="submit" className="primary" disabled={savingProfile}>
                                {savingProfile ? 'Saving...' : 'Save changes'}
                            </button>
                        </div>
                    </form>
                </section>

                <div className="account-profile-side">
                    <section className="account-profile-panel" aria-labelledby="security-title">
                        <header>
                            <div>
                                <h2 id="security-title">Security</h2>
                                <p>Use a unique password of at least 8 characters.</p>
                            </div>
                        </header>
                        <form onSubmit={savePassword}>
                            <div className="account-profile-fields account-profile-fields--single">
                                <ProfileField
                                    label="Current password"
                                    type="password"
                                    value={password.current}
                                    onChange={(value) =>
                                        setPassword((current) => ({ ...current, current: value }))
                                    }
                                    autoComplete="current-password"
                                />
                                <ProfileField
                                    label="New password"
                                    type="password"
                                    value={password.next}
                                    onChange={(value) =>
                                        setPassword((current) => ({ ...current, next: value }))
                                    }
                                    autoComplete="new-password"
                                />
                                <ProfileField
                                    label="Confirm new password"
                                    type="password"
                                    value={password.confirm}
                                    onChange={(value) =>
                                        setPassword((current) => ({ ...current, confirm: value }))
                                    }
                                    autoComplete="new-password"
                                />
                            </div>
                            {passwordNotice && <NoticeView notice={passwordNotice} />}
                            <div className="account-profile-actions">
                                <button type="submit" className="primary" disabled={savingPassword}>
                                    {savingPassword ? 'Updating...' : 'Update password'}
                                </button>
                            </div>
                        </form>
                    </section>

                    <section
                        className="account-profile-panel account-profile-permissions"
                        aria-labelledby="permissions-title"
                    >
                        <header>
                            <div>
                                <h2 id="permissions-title">Access</h2>
                                <p>Your current role and granted permissions.</p>
                            </div>
                            <span>{user.permissions.length} permissions</span>
                        </header>
                        <div>
                            <strong>{roleLabel(user.role)}</strong>
                            {user.permissions.length ? (
                                <ul>
                                    {user.permissions.map((permission) => (
                                        <li key={permission}>{permission}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p>No additional permissions assigned.</p>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}

function ProfileField({
    label,
    value,
    onChange,
    type = 'text',
    autoComplete,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    autoComplete?: string;
}) {
    return (
        <label>
            <span>{label}</span>
            <input
                type={type}
                value={value}
                autoComplete={autoComplete}
                onChange={(event) => onChange(event.target.value)}
            />
        </label>
    );
}

function NoticeView({ notice }: { notice: Exclude<Notice, null> }) {
    return (
        <div
            className={`account-profile-notice account-profile-notice--${notice.tone}`}
            role={notice.tone === 'error' ? 'alert' : 'status'}
        >
            {notice.message}
        </div>
    );
}
