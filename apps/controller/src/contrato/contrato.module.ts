import { Module } from '@nestjs/common';
import { ContratoController } from './contrato.controller.js';
import { ContratoService } from './contrato.service.js';

/**
 * `ContratoModule` del Diagrama de Componentes del Documento 0 — operaciones
 * administrativas sobre contratos existentes. Hoy solo CU-54.
 */
@Module({
  controllers: [ContratoController],
  providers: [ContratoService],
  exports: [ContratoService],
})
export class ContratoModule {}
