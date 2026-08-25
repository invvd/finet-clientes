import { Module } from '@nestjs/common';
import { MorosidadController } from './morosidad.controller.js';
import { MorosidadService } from './morosidad.service.js';

/**
 * `MorosidadModule` del Diagrama de Componentes del Documento 0 — bloque Deuda del
 * Incremento 2 (CU-80, CU-47, CU-55, CU-56).
 *
 * Las rutas van bajo el prefijo `admin/` para quedar agrupadas con el resto de la
 * administración cuando exista el panel, pero el dominio vive acá y no en AdminModule,
 * que es de CU-06 (intentos fallidos de login).
 */
@Module({
  controllers: [MorosidadController],
  providers: [MorosidadService],
  exports: [MorosidadService],
})
export class MorosidadModule {}
