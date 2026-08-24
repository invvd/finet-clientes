import { Module } from '@nestjs/common';
import { CoberturaController } from './cobertura.controller.js';
import { CoberturaAdminController } from './cobertura-admin.controller.js';
import { CoberturaService } from './cobertura.service.js';

@Module({
  controllers: [CoberturaController, CoberturaAdminController],
  providers: [CoberturaService],
})
export class CoberturaModule {}
