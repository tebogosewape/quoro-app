import { z } from 'zod';

const envSchema = z.object({
    VITE_APP_NAME: z.string().default('Quora Financial Web'),
    VITE_API_URL: z.string().url(),
    VITE_API_TIMEOUT: z.coerce.number().positive().default(10000),
    VITE_TRACE_HEADER: z.string().default('X-Trace-Id'),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
    console.error('❌ Invalid environment variables', parsed.error.flatten().fieldErrors);
    throw new Error('Environment validation failed. Check your Vite env variables.');
}

const { VITE_APP_NAME, VITE_API_URL, VITE_API_TIMEOUT, VITE_TRACE_HEADER } = parsed.data;

export const appConfig = {
    appName: VITE_APP_NAME,
    apiUrl: VITE_API_URL,
    apiTimeout: VITE_API_TIMEOUT,
    traceHeader: VITE_TRACE_HEADER,
} as const;

export const env = appConfig;

export type AppEnv = typeof appConfig;
