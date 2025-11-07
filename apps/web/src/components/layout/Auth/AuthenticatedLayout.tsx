import { Outlet, useLocation } from 'react-router-dom';
import AppNavbar from '../Navbar/Navbar';
import Sidebar from '../Sidebar/Sidebar';
import '@/styles/authorized.css';
import '@/styles/responsive-layout.css';
import { useTokenGuard } from '../../../hooks/auth-guard';
import { useCallback, useEffect, useState } from 'react';

export default function AuthenticatedLayout() {
    useTokenGuard();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();

    const toggleSidebar = useCallback(() => {
        setIsSidebarOpen((prev) => !prev);
    }, []);

    const closeSidebar = useCallback(() => {
        setIsSidebarOpen(false);
    }, []);

    useEffect(() => {
        if (isSidebarOpen && window.innerWidth < 768) {
            closeSidebar();
        }
    }, [closeSidebar, isSidebarOpen, location.pathname]);

    useEffect(() => {
        if (isSidebarOpen && window.innerWidth < 768) {
            document.body.classList.add('no-scroll');
        } else {
            document.body.classList.remove('no-scroll');
        }

        return () => {
            document.body.classList.remove('no-scroll');
        };
    }, [isSidebarOpen]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', 'light');
        return () => {
            // go back to default (dark or whatever you prefer for public pages)
            document.documentElement.removeAttribute('data-theme');
        };
    }, []);

    return (
        <div className="d-flex flex-column vh-100">
            <AppNavbar onToggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
            <div className="d-flex flex-grow-1">
                <Sidebar isOpen={isSidebarOpen} onCloseSidebar={closeSidebar} />

                {isSidebarOpen && (
                    <div
                        className="sidebar-overlay d-md-none"
                        onClick={closeSidebar}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && closeSidebar()}
                        aria-label="Close sidebar overlay"
                    ></div>
                )}

                <main
                    className="flex-grow-1 main-content"
                    style={{
                        backgroundColor: '#f8f9fa',
                        overflowY: 'auto',
                        padding: '24px',
                    }}
                >
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
