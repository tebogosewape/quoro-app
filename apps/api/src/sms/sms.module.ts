import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZoomConnectService } from './zoomconnect.service';
import { ZoomConnectController, ZoomConnectWebhookController } from './zoomconnect.controller';
import { SmsMessage } from '@/entities/sms-message.entity';

@Module({
    imports: [TypeOrmModule.forFeature([SmsMessage])],
    controllers: [ZoomConnectController, ZoomConnectWebhookController],
    providers: [ZoomConnectService],
    exports: [ZoomConnectService],
})
export class SmsModule {}
