import { Controller, Get, Post, Body, Query, ParseIntPipe } from '@nestjs/common';
import { MailService } from './mail.service';
import { SendEmailDto } from './dto/send-email.dto';
import { ApiTags, ApiQuery, ApiBody } from '@nestjs/swagger';

@ApiTags('mail')
@Controller('mail')
export class MailController {
    constructor(private readonly mail: MailService) {}

    @Post('send')
    @ApiBody({ type: SendEmailDto })
    async send(@Body() dto: SendEmailDto) {
        return this.mail.sendMail(dto);
    }

    @Get('list')
    @ApiQuery({
        name: 'limit',
        required: false,
        description: 'Number of recent emails to return (default 20)',
    })
    async list(@Query('limit', new ParseIntPipe({ optional: true })) limit?: number) {
        return this.mail.listEmails(limit ?? 20);
    }
}
