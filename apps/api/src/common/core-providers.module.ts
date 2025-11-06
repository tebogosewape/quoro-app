import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Module({
    providers: [Reflector],
    exports: [Reflector],
})
export class CoreProvidersModule {}
