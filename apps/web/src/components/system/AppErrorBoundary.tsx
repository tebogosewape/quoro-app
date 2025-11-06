import { useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Button } from 'react-bootstrap';
import { getCurrentTraceId } from '@/lib/telemetry/trace';
import { logger } from '@/lib/logging/logger';

const buildDiagnostics = (error: Error) => {
    return {
        message: error.message,
        stack: error.stack,
        traceId: getCurrentTraceId(),
        url: window.location.href,
        timestamp: new Date().toISOString(),
    };
};

const DiagnosticsFallback = ({
    error,
    resetErrorBoundary,
}: {
    error: Error;
    resetErrorBoundary: () => void;
}) => {
    const [copied, setCopied] = useState(false);
    const diagnostics = buildDiagnostics(error);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        } catch (clipboardError) {
            logger.error('Failed to copy diagnostics', {
                clipboardError: (clipboardError as Error).message,
            });
        }
    };

    return (
        <div className="container py-5">
            <div className="bg-light p-4 rounded shadow-sm">
                <h1 className="h3 mb-3">Something went wrong</h1>
                <p className="mb-3">
                    An unexpected error occurred. Please try again or share the diagnostics with
                    support.
                </p>
                <div className="d-flex gap-2">
                    <Button variant="primary" onClick={handleCopy}>
                        {copied ? 'Diagnostics copied!' : 'Copy diagnostics'}
                    </Button>
                    <Button variant="outline-secondary" onClick={resetErrorBoundary}>
                        Reload page
                    </Button>
                </div>
            </div>
        </div>
    );
};

export const AppErrorBoundary = ({ children }: { children: React.ReactNode }) => {
    return (
        <ErrorBoundary
            FallbackComponent={DiagnosticsFallback}
            onReset={() => {
                window.location.reload();
            }}
        >
            {children}
        </ErrorBoundary>
    );
};
