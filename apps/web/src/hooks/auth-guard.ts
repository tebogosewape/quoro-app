import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { isTokenExpired } from '../utils/token';

export const useTokenGuard = () => {
    const session = useAuthStore((state) => state.session);
    const clearSession = useAuthStore((state) => state.clearSession);
    const navigate = useNavigate();

    useEffect(() => {
        if (session?.access_token && isTokenExpired(session.access_token)) {
            clearSession();
            navigate('/login', {
                state: { error: 'Your session has expired. Please log in again.' },
            });
        }
    }, [clearSession, navigate, session?.access_token]);
};
