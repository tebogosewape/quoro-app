import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../stores/auth.store';
import { hasPermission, type AppPermission } from '../../../utils/permissions';

type PrivateRouteProps = {
    permission?: AppPermission | AppPermission[];
    children: React.ReactNode;
};

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ permission, children }) => {
    const session = useAuthStore((state) => state.session);
    const hydrated = useAuthStore((state) => state.hydrated);
    const location = useLocation();

    if (!hydrated) {
        return null;
    }

    if (!session) {
        return (
            <Navigate
                to="/login"
                state={{
                    from: location.pathname,
                    error: 'Session expired. Please log in to continue.',
                }}
                replace
            />
        );
    }

    if (permission) {
        const required = Array.isArray(permission) ? permission : [permission];
        const isAuthorized = required.some((perm) => hasPermission(perm));

        if (!isAuthorized) {
            return (
                <Navigate
                    to="/login"
                    state={{
                        from: location.pathname,
                        error: 'You do not have permission to access this page.',
                    }}
                    replace
                />
            );
        }
    }

    return <>{children}</>;
};
