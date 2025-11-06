import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

interface ErrorResponse {
    statusCode: number;
    timestamp: string;
    path: string;
    method: string;
    message: string | string[];
    error?: string;
    traceId: string;
    details?: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        // Generate trace ID if not present
        const traceId = (request.headers['x-trace-id'] as string) || uuidv4();

        let status: number;
        let message: string | string[];
        let error: string;
        let details: unknown;

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
                error = exception.name;
            } else if (isRecord(exceptionResponse)) {
                const messageCandidate = exceptionResponse.message;
                if (Array.isArray(messageCandidate) || typeof messageCandidate === 'string') {
                    message = messageCandidate;
                } else {
                    message = exception.message;
                }

                const errorCandidate = exceptionResponse.error;
                error = typeof errorCandidate === 'string' ? errorCandidate : exception.name;
                details = exceptionResponse.details;
            } else {
                message = exception.message;
                error = exception.name;
            }
        } else if (exception instanceof Error) {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            message = 'Internal server error';
            error = 'InternalServerError';

            // Log the actual error details for debugging
            this.logger.error(`Unhandled exception: ${exception.message}`, {
                stack: exception.stack,
                traceId,
                path: request.url,
                method: request.method,
            });
        } else {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            message = 'Unknown error occurred';
            error = 'UnknownError';

            this.logger.error('Unknown exception type', {
                exception: String(exception),
                traceId,
                path: request.url,
                method: request.method,
            });
        }

        const errorResponse: ErrorResponse = {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            message,
            error,
            traceId,
        };

        // Only include details in development
        if (process.env.NODE_ENV === 'development' && details) {
            errorResponse.details = details;
        }

        // Log error for monitoring (but not 4xx client errors)
        if (status >= 500) {
            this.logger.error(`HTTP ${status} Error`, {
                ...errorResponse,
                userAgent: request.headers['user-agent'],
                ip: request.ip,
            });
        } else if (status >= 400) {
            this.logger.warn(`HTTP ${status} Client Error`, {
                ...errorResponse,
                userAgent: request.headers['user-agent'],
                ip: request.ip,
            });
        }

        response.status(status).json(errorResponse);
    }
}
