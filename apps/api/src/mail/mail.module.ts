import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';

@Module({
    imports: [ConfigModule.forRoot({ isGlobal: true })],
    controllers: [MailController],
    providers: [MailService],
})
export class MailModule {}
