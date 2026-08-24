import { Module } from '@nestjs/common';
import { PagosController } from './pagos.controller.js';
import { PagosService } from './pagos.service.js';

@Module({
  controllers: [PagosController],
  providers: [PagosService],
})
export class PagosModule {}
