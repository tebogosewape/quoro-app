import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthSession } from '../interfaces/AuthUser';

type AuthState = {
    session: AuthSession | null;
    hydrated: boolean;
    setSession: (session: AuthSession) => void;
    clearSession: () => void;
    setHydrated: (state: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            session: null,
            hydrated: false,
            setSession: (session) => set({ session, hydrated: true }),
            clearSession: () => set({ session: null, hydrated: true }),
            setHydrated: (hydrated) => set({ hydrated }),
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ session: state.session }),
            onRehydrateStorage: () => (state) => {
                state?.setHydrated(true);
            },
        }
    )
);
