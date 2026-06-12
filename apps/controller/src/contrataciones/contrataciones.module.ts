import { Module } from '@nestjs/common';
import { ContratacionesController } from './contrataciones.controller.js';
import { ContratacionesService } from './contrataciones.service.js';

@Module({
  controllers: [ContratacionesController],
  providers: [ContratacionesService],
})
export class ContratacionesModule {}
