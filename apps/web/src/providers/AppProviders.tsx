import { useState } from 'react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AppErrorBoundary } from '@/components/system/AppErrorBoundary';

const createQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: {
                refetchOnWindowFocus: false,
                retry: 1,
                staleTime: 1000 * 30,
            },
        },
    });

export const AppProviders = ({ children }: { children: ReactNode }) => {
    const [queryClient] = useState(() => createQueryClient());

    return (
        <AppErrorBoundary>
            <QueryClientProvider client={queryClient}>
                {children}
                {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
            </QueryClientProvider>
        </AppErrorBoundary>
    );
};
