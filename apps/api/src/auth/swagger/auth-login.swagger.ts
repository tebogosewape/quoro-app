import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { LoginDto } from '../auth.dto';

export function AuthLoginDocs() {
    return applyDecorators(
        ApiOperation({
            summary: 'User login',
            description: 'Authenticate user with email and password, returns JWT tokens',
        }),
        ApiBody({ type: LoginDto }),
        ApiResponse({
            status: 200,
            description: 'Login successful',
            schema: {
                type: 'object',
                properties: {
                    access_token: {
                        type: 'string',
                        example: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.mock_signature',
                    },
                    refresh_token: {
                        type: 'string',
                        example: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.mock_signature',
                    },
                    expires_in: { type: 'number', example: 3600 },
                },
            },
        })
    );
}
