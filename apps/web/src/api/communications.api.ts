import { apiClient } from '@/api/axios.config';
import { useAuthStore } from '@/stores/auth.store';
import { z } from 'zod';

// ================================
// Schemas
// ================================

const inboxAttachmentSchema = z
    .object({
        id: z.string().optional(),
        communicationId: z.string().optional(),
        filename: z.string(),
        contentType: z.string().optional(),
        size: z.number().optional(),
        storagePath: z.string().optional(),
        checksum: z.string().optional(),
        metadata: z.record(z.unknown()).nullish(),
    })
    .passthrough();

export const inboxEmailSchema = z
    .object({
        id: z.string(),
        clientId: z.string(),
        type: z.literal('email'),
        direction: z.enum(['inbound', 'outbound']).default('inbound'),
        subject: z.string().default('(no subject)'),
        content: z.string().default(''), // HTML content
        fromAddress: z.string().optional(),
        toAddress: z.string().optional(),
        status: z.string().optional(),
        sentAt: z.string().optional(),
        createdAt: z.string(),
        readAt: z.string().optional(),
        metadata: z.record(z.unknown()).nullish(),
        attachments: z.array(inboxAttachmentSchema).nullish().default([]),
    })
    .passthrough();

export type InboxEmail = z.infer<typeof inboxEmailSchema>;

const inboxResponseSchema = z.object({
    items: z.array(inboxEmailSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
});

type ApiEnvelope<T> = { success: boolean; data: T };

const unwrapApiResponse = <T>(payload: unknown): T => {
    if (
        payload &&
        typeof payload === 'object' &&
        'success' in (payload as Record<string, unknown>)
    ) {
        const env = payload as ApiEnvelope<T>;
        if ('data' in env) return env.data;
    }
    return payload as T;
};

const getAuthHeaders = () => {
    const token = useAuthStore.getState().session?.access_token;
    if (!token) throw new Error('Authentication required.');
    return { Authorization: `Bearer ${token}` } as const;
};

export async function listInboxEmails(params: {
    clientId?: string;
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    search?: string;
}): Promise<z.infer<typeof inboxResponseSchema>> {
    const response = await apiClient.get('/communications/inbox', {
        params: {
            clientId: params.clientId,
            page: params.page,
            limit: params.limit,
            unreadOnly: params.unreadOnly,
            search: params.search,
        },
        headers: getAuthHeaders(),
    });

    return inboxResponseSchema.parse(unwrapApiResponse(response.data));
}

export async function syncInbox(): Promise<void> {
    await apiClient.post(
        '/communications/inbox/sync',
        {},
        {
            headers: getAuthHeaders(),
        }
    );
}

// Live inspect of IMAP inbox (diagnostic/fallback), returns a lightweight list
const liveMessageSchema = z.object({
    uid: z.number(),
    messageId: z.string(),
    subject: z.string(),
    from: z.string(),
    to: z.string().optional(),
    date: z.string().optional(),
    flags: z.array(z.string()),
    preview: z.string(),
});

export async function inspectInbox(params?: {
    mailbox?: string;
    limit?: number;
}): Promise<Array<z.infer<typeof liveMessageSchema>>> {
    const response = await apiClient.post(
        '/communications/inbox/inspect',
        {
            mailbox: params?.mailbox,
            limit: params?.limit ?? 20,
        },
        { headers: getAuthHeaders() }
    );
    const data = unwrapApiResponse<{ success: boolean; data: unknown } | unknown>(response.data);
    // Some backends wrap differently; normalize to array
    const items = (
        data && typeof data === 'object' && 'data' in (data as any) ? (data as any).data : data
    ) as unknown;
    const arr = z.array(liveMessageSchema).parse(items);
    return arr;
}
