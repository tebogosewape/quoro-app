import { useEffect } from 'react';

export const useAuthPageTheme = () => {
    useEffect(() => {
        const root = document.documentElement;
        const previousTheme = root.getAttribute('data-theme');

        root.setAttribute('data-theme', 'light');
        document.body.classList.add('auth-page');

        return () => {
            document.body.classList.remove('auth-page');
            if (previousTheme) {
                root.setAttribute('data-theme', previousTheme);
            } else {
                root.removeAttribute('data-theme');
            }
        };
    }, []);
};
