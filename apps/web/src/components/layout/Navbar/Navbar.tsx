import { Button, Container, Nav, Navbar } from 'react-bootstrap';
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
        <Navbar
            className="navbar-custom app-navbar shadow-sm"
            variant="dark"
            expand="lg"
            style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
        >
            <Container fluid>
                <Button
                    onClick={onToggleSidebar}
                    className="d-md-none me-2 border-0"
                    aria-controls="sidebar"
                    aria-expanded={isSidebarOpen}
                    aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
                    style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        color: '#fff',
                        borderRadius: '8px',
                        padding: '8px 12px',
                    }}
                >
                    {isSidebarOpen ? <CloseIcon size={24} /> : <HamburgerIcon size={24} />}
                </Button>

                <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
                    <Nav>
                        <Nav.Link href="#profile" style={{ color: '#fff', fontWeight: 500 }}>
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{
                                    marginRight: '8px',
                                    verticalAlign: 'middle',
                                }}
                            >
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                            Hello, {displayName}
                        </Nav.Link>
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
}
