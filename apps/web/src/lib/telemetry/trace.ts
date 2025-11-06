const TRACE_KEY = 'quora-trace-id';

export const setCurrentTraceId = (traceId: string) => {
    try {
        sessionStorage.setItem(TRACE_KEY, traceId);
    } catch {
        // no-op: storage may be unavailable
    }
};

export const getCurrentTraceId = (): string | null => {
    try {
        return sessionStorage.getItem(TRACE_KEY);
    } catch {
        return null;
    }
};
