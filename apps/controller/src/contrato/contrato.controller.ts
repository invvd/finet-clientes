import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ContratoService } from './contrato.service.js';
import { AdminGuard } from '../admin/guards/admin.guard.js';
import { ZodValidationPipe } from '../auth/pipes/zod-validation.pipe.js';
import { AsignarDiaVencimientoDto } from './dto/contrato.dto.js';

/**
 * `ContratoController` del Diagrama de Componentes del Documento 0, acotado a las
 * operaciones administrativas sobre un contrato existente. El alta de contratos desde el
 * formulario web es otra cosa y vive en `ContratacionesController` (endpoint público).
 *
 * La Excepción 1 de CU-54 ("el administrador no posee permisos suficientes") la cubre
 * AdminGuard.
 */
@Controller('admin/contratos')
@UseGuards(AdminGuard)
export class ContratoController {
  constructor(private readonly contratoService: ContratoService) {}

  /**
   * CU-54 / RF-39: asigna el día del mes en que vence el contrato.
   * Excepción 2 (día fuera del rango 1–28) la rechaza el ZodValidationPipe con 400.
   */
  @Patch(':id/dia-vencimiento')
  @HttpCode(200)
  asignarDiaVencimiento(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(AsignarDiaVencimientoDto))
    body: AsignarDiaVencimientoDto,
  ) {
    return this.contratoService.asignarDiaVencimiento(id, body.dia_vencimiento);
  }
}
