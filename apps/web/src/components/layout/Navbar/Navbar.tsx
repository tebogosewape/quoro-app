import { Button, Container, Nav, Navbar } from 'react-bootstrap';
import { FaSignOutAlt } from 'react-icons/fa';
import './Navbar.css';
import { useAuthStore } from '../../../stores/auth.store';
import { List as HamburgerIcon, XLg as CloseIcon } from 'react-bootstrap-icons';

interface AppNavbarProps {
    onToggleSidebar: () => void;
    isSidebarOpen: boolean;
}

export default function AppNavbar({ onToggleSidebar, isSidebarOpen }: AppNavbarProps) {
    const session = useAuthStore((state) => state.session);
    const displayName = session
        ? `${session.user.firstName} ${session.user.lastName ?? ''}`.trim()
        : 'Guest';

    return (
        <Navbar className="navbar-custom surface-dark app-navbar" variant="dark" expand="lg">
            <Container fluid>
                <Button
                    variant="outline-secondary"
                    onClick={onToggleSidebar}
                    className="d-md-none me-2 border-0"
                    aria-controls="sidebar"
                    aria-expanded={isSidebarOpen}
                    style={{ color: '#fff' }}
                    aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
                >
                    {isSidebarOpen ? <CloseIcon size={24} /> : <HamburgerIcon size={24} />}
                </Button>

                <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
                    <Nav>
                        <Nav.Link href="#profile">
                            <span className="nav-bar-icon">
                                <FaSignOutAlt />
                            </span>{' '}
                            Hello {displayName}
                        </Nav.Link>
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
}
