interface ApiError {
    errorMessage: string;
    errorCode: string;
}

export const isApiError = (error: unknown): error is ApiError => {
    if (typeof error !== 'object' || error === null) {
        return false;
    }

    const candidate = error as Record<string, unknown>;
    return typeof candidate.errorMessage === 'string' && typeof candidate.errorCode === 'string';
};
