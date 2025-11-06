import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const isPaginationMeta = (value: unknown): value is PaginationMeta =>
    isRecord(value) &&
    typeof value.page === 'number' &&
    typeof value.limit === 'number' &&
    typeof value.total === 'number' &&
    typeof value.totalPages === 'number';

const isApiResponseEnvelope = <T>(value: unknown): value is ApiResponse<T> =>
    isRecord(value) && 'success' in value && typeof value.success === 'boolean';

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    meta?: {
        timestamp: string;
        traceId: string;
        version: string;
        pagination?: PaginationMeta;
    };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
    intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
        const request = context.switchToHttp().getRequest<Request>();
        const traceId = request.headers['x-trace-id'] as string;

        return next.handle().pipe(
            map((data) => {
                // If data is already in the expected format, return as-is
                if (isApiResponseEnvelope<T>(data)) {
                    return data;
                }

                // For health check endpoints, return minimal response
                if (request.url === '/' || request.url === '/health') {
                    return data;
                }

                // Transform the response
                const response: ApiResponse<T> = {
                    success: true,
                    data,
                    meta: {
                        timestamp: new Date().toISOString(),
                        traceId: traceId || 'unknown',
                        version: process.env.npm_package_version || '1.0.0',
                    },
                };

                // Add pagination info if present in data
                if (isRecord(data)) {
                    const clonedData: Record<string, unknown> = { ...data };

                    if (isPaginationMeta(clonedData.pagination)) {
                        response.meta!.pagination = clonedData.pagination;
                        delete clonedData.pagination;
                    }

                    const messageCandidate = clonedData.message;
                    if (typeof messageCandidate === 'string') {
                        response.message = messageCandidate;
                        delete clonedData.message;
                    }

                    response.data = clonedData as unknown as T;
                }

                return response;
            })
        );
    }
}
