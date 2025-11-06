import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

type Primitive = string | number | boolean | null | undefined;

const SENSITIVE_FIELDS = new Set([
    'password',
    'passwordConfirm',
    'token',
    'accessToken',
    'refreshToken',
    'authorization',
    'creditCardNumber',
    'cvv',
    'pin',
    'ssn',
    'idNumber',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger(LoggingInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const request = context.switchToHttp().getRequest<Request>();
        const response = context.switchToHttp().getResponse<Response>();

        // Generate or extract trace ID
        const traceId = (request.headers['x-trace-id'] as string) || uuidv4();

        // Add trace ID to request and response headers
        request.headers['x-trace-id'] = traceId;
        response.setHeader('X-Trace-Id', traceId);

        const { method, url, body, query, params } = request;
        const userAgent = request.get('User-Agent') || '';
        const ip = request.ip;

        const now = Date.now();

        // Log incoming request
        this.logger.log(`🔍 ${method} ${url} - ${ip}`, {
            traceId,
            method,
            url,
            userAgent,
            ip,
            body: this.sanitizeBody(body),
            query,
            params,
            timestamp: new Date().toISOString(),
        });

        return next.handle().pipe(
            tap({
                next: (data) => {
                    const statusCode = response.statusCode;
                    const responseTime = Date.now() - now;

                    this.logger.log(
                        `✅ ${method} ${url} ${statusCode} - ${responseTime}ms - ${ip}`,
                        {
                            traceId,
                            method,
                            url,
                            statusCode,
                            responseTime,
                            ip,
                            responseSize: this.getResponseSize(data),
                            timestamp: new Date().toISOString(),
                        }
                    );
                },
                error: (error) => {
                    const statusCode = response.statusCode || 500;
                    const responseTime = Date.now() - now;

                    this.logger.error(
                        `❌ ${method} ${url} ${statusCode} - ${responseTime}ms - ${ip}`,
                        {
                            traceId,
                            method,
                            url,
                            statusCode,
                            responseTime,
                            ip,
                            error: error.message,
                            stack: error.stack,
                            timestamp: new Date().toISOString(),
                        }
                    );
                },
            })
        );
    }

    private sanitizeBody(body: unknown): unknown {
        if (body === null || body === undefined) {
            return body;
        }

        if (Array.isArray(body)) {
            return body.map((item) => this.sanitizeBody(item));
        }

        if (isRecord(body)) {
            return Object.entries(body).reduce<Record<string, unknown>>((acc, [key, value]) => {
                if (SENSITIVE_FIELDS.has(key)) {
                    acc[key] = '[REDACTED]';
                    return acc;
                }

                acc[key] = this.sanitizeBody(value);
                return acc;
            }, {});
        }

        return body as Primitive;
    }

    private getResponseSize(data: unknown): number {
        if (data === null || data === undefined) {
            return 0;
        }

        try {
            return JSON.stringify(data).length;
        } catch {
            return 0;
        }
    }
}
