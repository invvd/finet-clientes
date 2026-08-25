import { Module } from '@nestjs/common';
import { SoporteController } from './soporte.controller.js';
import { SoporteService } from './soporte.service.js';

@Module({
  controllers: [SoporteController],
  providers: [SoporteService],
})
export class SoporteModule {}
