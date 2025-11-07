import { Nav, Accordion, Button } from 'react-bootstrap';
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
    const canManageLeads = hasPermission('manage-leads');

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
                    <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
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
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ marginRight: '12px' }}
                        >
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                        Dashboard
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
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{ marginRight: '12px' }}
                                >
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
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
                                            <svg
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                style={{ marginRight: '8px' }}
                                            >
                                                <line x1="8" y1="6" x2="21" y2="6" />
                                                <line x1="8" y1="12" x2="21" y2="12" />
                                                <line x1="8" y1="18" x2="21" y2="18" />
                                                <line x1="3" y1="6" x2="3.01" y2="6" />
                                                <line x1="3" y1="12" x2="3.01" y2="12" />
                                                <line x1="3" y1="18" x2="3.01" y2="18" />
                                            </svg>
                                            All Clients
                                        </Nav.Link>
                                    )}
                                    {canCreateClients && (
                                        <Nav.Link
                                            as={NavLink}
                                            to="/clients/new"
                                            className="sidebar-sublink"
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
                                                style={{ marginRight: '8px' }}
                                            >
                                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                                <circle cx="8.5" cy="7" r="4" />
                                                <line x1="20" y1="8" x2="20" y2="14" />
                                                <line x1="23" y1="11" x2="17" y2="11" />
                                            </svg>
                                            New Client
                                        </Nav.Link>
                                    )}
                                </Nav>
                            </Accordion.Body>
                        </Accordion.Item>
                    )}

                    {/* Lead Management Section */}
                    {canManageLeads && (
                        <Accordion.Item eventKey="leads" className="sidebar-accordion-item">
                            <Accordion.Header className="sidebar-accordion-header">
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{ marginRight: '12px' }}
                                >
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                    <line x1="12" y1="18" x2="12" y2="12" />
                                    <line x1="9" y1="15" x2="15" y2="15" />
                                </svg>
                                Lead Management
                            </Accordion.Header>
                            <Accordion.Body className="py-0">
                                <Nav className="flex-column ps-3">
                                    <Nav.Link as={NavLink} to="/leads" className="sidebar-sublink">
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            style={{ marginRight: '8px' }}
                                        >
                                            <line x1="8" y1="6" x2="21" y2="6" />
                                            <line x1="8" y1="12" x2="21" y2="12" />
                                            <line x1="8" y1="18" x2="21" y2="18" />
                                            <line x1="3" y1="6" x2="3.01" y2="6" />
                                            <line x1="3" y1="12" x2="3.01" y2="12" />
                                            <line x1="3" y1="18" x2="3.01" y2="18" />
                                        </svg>
                                        All Leads
                                    </Nav.Link>
                                    <Nav.Link
                                        as={NavLink}
                                        to="/leads/import"
                                        className="sidebar-sublink"
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
                                            style={{ marginRight: '8px' }}
                                        >
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="17 8 12 3 7 8" />
                                            <line x1="12" y1="3" x2="12" y2="15" />
                                        </svg>
                                        Import Leads
                                    </Nav.Link>
                                    {canManageRoles && (
                                        <Nav.Link
                                            as={NavLink}
                                            to="/leads/allocation"
                                            className="sidebar-sublink"
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
                                                style={{ marginRight: '8px' }}
                                            >
                                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                                <circle cx="8.5" cy="7" r="4" />
                                                <line x1="20" y1="8" x2="20" y2="14" />
                                                <line x1="23" y1="11" x2="17" y2="11" />
                                            </svg>
                                            Lead Allocation
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
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    style={{ marginRight: '12px' }}
                                >
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                </svg>
                                Administration
                            </Accordion.Header>
                            <Accordion.Body className="py-0">
                                <Nav className="flex-column ps-3">
                                    <Nav.Link
                                        as={NavLink}
                                        to="/admin/users"
                                        className="sidebar-sublink"
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
                                            style={{ marginRight: '8px' }}
                                        >
                                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                            <circle cx="9" cy="7" r="4" />
                                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                        </svg>
                                        Manage Users
                                    </Nav.Link>
                                    <Nav.Link
                                        as={NavLink}
                                        to="/admin/roles"
                                        className="sidebar-sublink"
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
                                            style={{ marginRight: '8px' }}
                                        >
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                        </svg>
                                        Manage Roles
                                    </Nav.Link>
                                    <Nav.Link
                                        as={NavLink}
                                        to="/admin/products"
                                        className="sidebar-sublink"
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
                                            style={{ marginRight: '8px' }}
                                        >
                                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                                            <line x1="12" y1="22.08" x2="12" y2="12" />
                                        </svg>
                                        Manage Products
                                    </Nav.Link>
                                    <Nav.Link
                                        as={NavLink}
                                        to="/admin/commission-settings"
                                        className="sidebar-sublink"
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
                                            style={{ marginRight: '8px' }}
                                        >
                                            <circle cx="12" cy="12" r="3" />
                                            <path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m0 6l4.2 4.2M23 12h-6m-6 0H1m18.2-5.2l-4.2 4.2m0 6l4.2 4.2" />
                                        </svg>
                                        Commission Settings
                                    </Nav.Link>
                                </Nav>
                            </Accordion.Body>
                        </Accordion.Item>
                    )}
                </Accordion>

                {/* My Profile - Always visible */}
                <Nav.Link as={NavLink} to="/account/profile" className="sidebar-link">
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ marginRight: '12px' }}
                    >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                    My Profile
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
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ marginRight: '12px' }}
                    >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>Logout</span>
                </Nav.Link>
            </Nav>

            <div className="sidebar-footer">
                <div className="sidebar-version">version 0.1</div>
            </div>
        </aside>
    );
}
