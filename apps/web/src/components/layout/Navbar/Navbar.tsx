import { Button } from 'react-bootstrap';
import './Navbar.css';
import { useAuthStore } from '../../../stores/auth.store';
import { List as HamburgerIcon, XLg as CloseIcon } from 'react-bootstrap-icons';
import { Link, useLocation } from 'react-router-dom';
import { QFinanceBrand } from '../../auth/QFinanceBrand';

interface AppNavbarProps {
    onToggleSidebar: () => void;
    isSidebarOpen: boolean;
}

export default function AppNavbar({ onToggleSidebar, isSidebarOpen }: AppNavbarProps) {
    const session = useAuthStore((state) => state.session);
    const location = useLocation();
    const displayName = session
        ? `${session.user.firstName} ${session.user.lastName ?? ''}`.trim()
        : 'Guest';
    const initials = session
        ? `${session.user.firstName?.[0] ?? ''}${session.user.lastName?.[0] ?? ''}`.toUpperCase()
        : 'G';
    const roleParts = session?.user.role.split('_') ?? [];
    const roleLabel = roleParts
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

    const sectionTitle = (() => {
        const path = location.pathname;
        if (path.startsWith('/clients/new')) return 'New client';
        if (path.startsWith('/clients/')) return 'Client details';
        if (path.startsWith('/clients')) return 'Clients';
        if (path.startsWith('/leads/import')) return 'Import leads';
        if (path.startsWith('/leads/bulk-allocate')) return 'Bulk allocation';
        if (path.startsWith('/leads')) return 'Leads';
        if (path.startsWith('/admin')) return 'Administration';
        if (path.startsWith('/team')) return 'Team management';
        if (path.startsWith('/account')) return 'My profile';
        return 'Dashboard';
    })();

    return (
        <header className="app-navbar">
            <Link to="/dashboard" className="app-navbar__brand" aria-label="QFinance dashboard">
                <QFinanceBrand />
            </Link>

            <div className="app-navbar__content">
                <Button
                    onClick={onToggleSidebar}
                    className="app-navbar__menu-button d-md-none"
                    aria-controls="sidebar"
                    aria-expanded={isSidebarOpen}
                    aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
                >
                    {isSidebarOpen ? <CloseIcon size={20} /> : <HamburgerIcon size={20} />}
                </Button>

                <div className="app-navbar__section" aria-live="polite">
                    <span className="app-navbar__eyebrow">Workspace</span>
                    <span className="app-navbar__title">{sectionTitle}</span>
                </div>

                <Link to="/account/profile" className="app-navbar__user">
                    <span className="app-navbar__avatar" aria-hidden="true">
                        {initials}
                    </span>
                    <span className="app-navbar__user-copy">
                        <span className="app-navbar__user-name">{displayName}</span>
                        <span className="app-navbar__user-role">{roleLabel}</span>
                    </span>
                </Link>
            </div>
        </header>
    );
}
