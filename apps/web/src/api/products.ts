import { HttpProxy } from './http-proxy.service';
import { appConfig } from '@/config/env';
import type { Product, ProductStatus, ProductCategory } from '@/interfaces/Product';
import { useAuthStore } from '@/stores/auth.store';

const http = new HttpProxy();
const base = `${appConfig.apiUrl}/products`;
const token = () => useAuthStore.getState().session?.access_token ?? null;

type Envelope<T> = { success: boolean; data: T; meta?: any };

export async function listProducts(params: {
    page?: number;
    limit?: number;
    search?: string;
    category?: ProductCategory;
    status?: ProductStatus;
}): Promise<{
    products: Product[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}> {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.search) q.set('search', params.search);
    if (params.category) q.set('category', params.category);
    if (params.status) q.set('status', params.status);

    const resp = await http.request<Envelope<any>>(
        'PRODUCTS_LIST',
        `${base}?${q.toString()}`,
        'GET',
        {},
        false,
        token()
    );
    if (!resp.data?.success) throw new Error(resp.errorMessage || 'Failed to fetch products');
    return resp.data.data;
}

export async function createProduct(payload: Partial<Product>) {
    const resp = await http.request<Envelope<Product>>(
        'PRODUCT_CREATE',
        base,
        'POST',
        payload as any,
        false,
        token()
    );
    if (!resp.data?.success) throw new Error(resp.errorMessage || 'Failed to create product');
    return resp.data.data;
}

export async function updateProduct(id: string, payload: Partial<Product>) {
    const resp = await http.request<Envelope<Product>>(
        'PRODUCT_UPDATE',
        `${base}/${id}`,
        'PUT',
        payload as any,
        false,
        token()
    );
    if (!resp.data?.success) throw new Error(resp.errorMessage || 'Failed to update product');
    return resp.data.data;
}

export async function deleteProduct(id: string) {
    const resp = await http.request<Envelope<{ message: string }>>(
        'PRODUCT_DELETE',
        `${base}/${id}`,
        'DELETE',
        {},
        false,
        token()
    );
    if (!resp.data?.success) throw new Error(resp.errorMessage || 'Failed to delete product');
    return resp.data.data;
}

export async function setProductStatus(id: string, status: ProductStatus) {
    const resp = await http.request<Envelope<Product>>(
        'PRODUCT_STATUS',
        `${base}/${id}/status/${status}`,
        'PUT',
        {},
        false,
        token()
    );
    if (!resp.data?.success) throw new Error(resp.errorMessage || 'Failed to set status');
    return resp.data.data;
}
