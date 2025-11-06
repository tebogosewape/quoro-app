import { HttpProxy } from '@/api/http-proxy.service';
import { useAuthStore } from '@/stores/auth.store';

const http = new HttpProxy();

type CommissionDto = { percentage: number };

function getBearer(): string | null {
    return useAuthStore.getState().session?.access_token ?? null;
}

export async function fetchCommission(): Promise<CommissionDto> {
    const token = getBearer();
    const resp = await http.request<CommissionDto>(
        'COMM_GET',
        '/commission',
        'GET',
        {},
        false,
        token
    );
    if (resp.statusCode >= 200 && resp.statusCode < 300 && resp.data) {
        // API envelope: { success, data }
        const data = (resp.data as any).data ?? resp.data;
        return { percentage: Number(data.percentage) };
    }
    throw new Error(resp.errorMessage || 'Failed to load commission');
}

export async function updateCommission(percentage: number): Promise<CommissionDto> {
    const token = getBearer();
    const resp = await http.request<CommissionDto>(
        'COMM_PUT',
        '/commission',
        'PUT',
        { percentage },
        false,
        token
    );
    if (resp.statusCode >= 200 && resp.statusCode < 300 && resp.data) {
        const data = (resp.data as any).data ?? resp.data;
        return { percentage: Number(data.percentage) };
    }
    throw new Error(resp.errorMessage || 'Failed to update commission');
}
