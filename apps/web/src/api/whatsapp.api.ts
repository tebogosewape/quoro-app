import { apiClient } from './axios.config';

export interface WhatsAppMessage {
    id: string;
    clientId: string;
    userId?: string;
    direction: 'inbound' | 'outbound';
    status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
    fromNumber: string;
    toNumber: string;
    message?: string;
    mediaUrl?: string;
    mediaMimeType?: string;
    mediaFilename?: string;
    whatsappMessageId?: string;
    sentAt?: string;
    deliveredAt?: string;
    readAt?: string;
    errorMessage?: string;
    createdAt: string;
    updatedAt: string;
    user?: {
        id: string;
        firstName: string;
        lastName: string;
    };
}

export interface WhatsAppSession {
    id: string;
    sessionName: string;
    status: 'disconnected' | 'connecting' | 'connected' | 'qr_code' | 'failed';
    phoneNumber?: string;
    qrCode?: string;
    lastConnectedAt?: string;
    lastDisconnectedAt?: string;
    errorMessage?: string;
    createdAt: string;
    updatedAt: string;
}

export interface SendMessageDto {
    clientId: string;
    message: string;
}

export const whatsappApi = {
    async sendMessage(data: SendMessageDto): Promise<{ success: boolean; data: WhatsAppMessage }> {
        const response = await apiClient.post('/whatsapp/send', data);
        return response.data;
    },

    async getMessages(
        clientId: string,
        limit = 50
    ): Promise<{ success: boolean; data: WhatsAppMessage[] }> {
        const response = await apiClient.get(`/whatsapp/messages/${clientId}`, {
            params: { limit },
        });
        return response.data;
    },

    async getQrCode(): Promise<{
        success: boolean;
        data: { qrCode: string | null; message: string };
    }> {
        const response = await apiClient.get('/whatsapp/qr-code');
        return response.data;
    },

    async getSessionStatus(): Promise<{
        success: boolean;
        data: { session: WhatsAppSession; isReady: boolean };
    }> {
        const response = await apiClient.get('/whatsapp/session/status');
        return response.data;
    },

    async resetSession(): Promise<{ success: boolean; message: string }> {
        const response = await apiClient.post('/whatsapp/session/reset');
        return response.data;
    },

    async checkHealth(): Promise<{
        success: boolean;
        data: { isReady: boolean; message: string };
    }> {
        const response = await apiClient.get('/whatsapp/health');
        return response.data;
    },
};
