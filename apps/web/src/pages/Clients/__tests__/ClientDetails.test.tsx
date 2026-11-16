import { describe, expect, it, vi } from 'vitest';

vi.stubEnv('VITE_API_URL', 'http://localhost:2200/api');

describe('ClientDetails module', () => {
    it(
        'exports the routed client details screen',
        async () => {
            const { default: ClientDetails } = await import('../ClientDetails');
            expect(ClientDetails).toBeTypeOf('function');
        },
        15_000
    );
});
