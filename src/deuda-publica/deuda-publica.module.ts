import { Module } from '@nestjs/common';
import { DeudaPublicaController } from './deuda-publica.controller.js';
import { DeudaPublicaService } from './deuda-publica.service.js';

@Module({
  controllers: [DeudaPublicaController],
  providers: [DeudaPublicaService],
})
export class DeudaPublicaModule {}
