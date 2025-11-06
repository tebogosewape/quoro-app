import { Nav, Accordion, Button } from 'react-bootstrap';
import {
    FaHome,
    FaUsers,
    FaUserPlus,
    FaList,
    FaFileImport,
    FaUpload,
    FaShieldAlt,
    FaCog,
    FaBox,
    FaUserCog,
    FaSignOutAlt,
    FaTimes,
} from 'react-icons/fa';
import logo from '@/assets/logo.png';
import './Sidebar.css';

import { hasPermission } from '../../../utils/permissions';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../stores/auth.store';
import { useEffect, useState } from 'react';

type SidebarProps = {
    isOpen: boolean;
    onCloseSidebar: () => void;
};

export default function Sidebar({ isOpen, onCloseSidebar }: SidebarProps) {
    const navigate = useNavigate();
    const [activeAccordion, setActiveAccordion] = useState<string | null>(null);

    const canViewDashboard = hasPermission('view-dashboard');
    const canViewClients = hasPermission('view-clients');
    const canCreateClients = hasPermission('create-clients') || hasPermission('manage-clients');
    const canManageRoles = hasPermission('roles.manage');

    // Lock/unlock body scroll on mobile when sidebar opens
    useEffect(() => {
        if (window.innerWidth <= 767.98) {
            if (isOpen) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    return (
        <aside
            id="sidebar"
            className={`sidebar surface-dark ${isOpen ? 'open' : ''}`}
            role="navigation"
            aria-label="Main navigation"
        >
            <div className="sidebar-header-top d-flex justify-content-between align-items-center px-2">
                <Button
                    variant="link"
                    onClick={onCloseSidebar}
                    className="d-md-none p-0 close-sidebar-btn text-secondary"
                    aria-label="Close sidebar menu"
                >
                    <FaTimes size={22} />
                </Button>
            </div>

            <div className="sidebar-header">
                <img src={logo} alt="QFinance" className="sidebar-logo mb-5" />
                <div className="sidebar-title">QUORA FINANCIAL SOLUTION</div>
            </div>

            <Nav className="flex-column sidebar-nav">
                {/* Dashboard - Always visible if permitted */}
                {canViewDashboard && (
                    <Nav.Link as={NavLink} to="/dashboard" className="sidebar-link">
                        <FaHome size={18} /> Dashboard
                    </Nav.Link>
                )}

                {/* Single Accordion for all collapsible sections */}
                <Accordion
                    activeKey={activeAccordion}
                    onSelect={(key) => setActiveAccordion(key as string | null)}
                    className="sidebar-accordion"
                >
                    {/* Client Management Section */}
                    {(canViewClients || canCreateClients) && (
                        <Accordion.Item eventKey="clients" className="sidebar-accordion-item">
                            <Accordion.Header className="sidebar-accordion-header">
                                <FaUsers size={18} className="me-2" />
                                Client Management
                            </Accordion.Header>
                            <Accordion.Body className="py-0">
                                <Nav className="flex-column ps-3">
                                    {canViewClients && (
                                        <Nav.Link
                                            as={NavLink}
                                            to="/clients"
                                            className="sidebar-sublink"
                                        >
                                            <FaList size={16} />
                                            All Clients
                                        </Nav.Link>
                                    )}
                                    {canCreateClients && (
                                        <Nav.Link
                                            as={NavLink}
                                            to="/clients/new"
                                            className="sidebar-sublink"
                                        >
                                            <FaUserPlus size={16} />
                                            New Client
                                        </Nav.Link>
                                    )}
                                </Nav>
                            </Accordion.Body>
                        </Accordion.Item>
                    )}

                    {/* Lead Management Section */}
                    {(canViewClients || canCreateClients) && (
                        <Accordion.Item eventKey="leads" className="sidebar-accordion-item">
                            <Accordion.Header className="sidebar-accordion-header">
                                <FaFileImport size={18} className="me-2" />
                                Lead Management
                            </Accordion.Header>
                            <Accordion.Body className="py-0">
                                <Nav className="flex-column ps-3">
                                    {canViewClients && (
                                        <Nav.Link
                                            as={NavLink}
                                            to="/leads"
                                            className="sidebar-sublink"
                                        >
                                            <FaList size={16} />
                                            All Leads
                                        </Nav.Link>
                                    )}
                                    {canCreateClients && (
                                        <Nav.Link
                                            as={NavLink}
                                            to="/leads/import"
                                            className="sidebar-sublink"
                                        >
                                            <FaUpload size={16} />
                                            Import Leads
                                        </Nav.Link>
                                    )}
                                </Nav>
                            </Accordion.Body>
                        </Accordion.Item>
                    )}

                    {/* Administration Section */}
                    {canManageRoles && (
                        <Accordion.Item eventKey="admin" className="sidebar-accordion-item">
                            <Accordion.Header className="sidebar-accordion-header">
                                <FaShieldAlt size={18} className="me-2" />
                                Administration
                            </Accordion.Header>
                            <Accordion.Body className="py-0">
                                <Nav className="flex-column ps-3">
                                    <Nav.Link
                                        as={NavLink}
                                        to="/admin/users"
                                        className="sidebar-sublink"
                                    >
                                        <FaUsers size={16} />
                                        Manage Users
                                    </Nav.Link>
                                    <Nav.Link
                                        as={NavLink}
                                        to="/admin/roles"
                                        className="sidebar-sublink"
                                    >
                                        <FaShieldAlt size={16} />
                                        Manage Roles
                                    </Nav.Link>
                                    <Nav.Link
                                        as={NavLink}
                                        to="/admin/products"
                                        className="sidebar-sublink"
                                    >
                                        <FaBox size={16} />
                                        Manage Products
                                    </Nav.Link>
                                    <Nav.Link
                                        as={NavLink}
                                        to="/admin/commission-settings"
                                        className="sidebar-sublink"
                                    >
                                        <FaCog size={16} />
                                        Commission Settings
                                    </Nav.Link>
                                </Nav>
                            </Accordion.Body>
                        </Accordion.Item>
                    )}
                </Accordion>

                {/* My Profile - Always visible */}
                <Nav.Link as={NavLink} to="/account/profile" className="sidebar-link">
                    <FaUserCog size={18} /> My Profile
                </Nav.Link>

                {/* Logout - Always at bottom */}
                <Nav.Link
                    href="#"
                    className="sidebar-link-logout mt-auto"
                    onClick={(event) => {
                        event.preventDefault();
                        useAuthStore.getState().clearSession();
                        navigate('/login', { replace: true });
                    }}
                >
                    <FaSignOutAlt size={18} />
                    <span>Logout</span>
                </Nav.Link>
            </Nav>

            <div className="sidebar-footer">
                <div className="sidebar-version">version 0.1</div>
            </div>
        </aside>
    );
}
