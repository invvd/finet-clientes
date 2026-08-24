import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { PagosService } from './pagos.service.js';
import { ApiKeyGuard } from '../admin/guards/api-key.guard.js';
import { ZodValidationPipe } from '../auth/pipes/zod-validation.pipe.js';
import { RegistrarPagoDto } from './dto/pagos.dto.js';

/**
 * Núcleo de pago (Incremento 2). Protegido con API Key porque, en este
 * incremento, el único emisor de confirmaciones es la recaudación externa
 * (CU-46), operada por un administrador — no hay pasarela conectada todavía
 * (esa llega en CU-42/43, Incremento 3, y reusará este mismo servicio).
 *
 * Base path: /api/admin/pagos
 */
@Controller('admin/pagos')
@UseGuards(ApiKeyGuard)
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  /**
   * CU-44 / CU-45 / CU-46: registrar un pago confirmado
   *
   * Registra de forma permanente un pago ya confirmado por la entidad
   * recaudadora (fecha, monto, código de autorización) y lo asocia a la
   * factura/contrato correspondiente.
   *
   * POST /admin/pagos/confirmar
   * Auth: X-API-Key
   *
   * @body {
   *   id_factura: number,
   *   monto: number,
   *   fecha_pago: string,          // ISO 8601
   *   codigo_transaccion: string,  // único — CU-45
   *   pasarela: string,
   *   token_transaccional?: string
   * }
   *
   * Errores:
   *   400 - Validación Zod (datos incompletos — CU-44 Excepción 1)
   *   409 - codigo_transaccion ya registrado (CU-45)
   *   422 - No fue posible asociar el pago a una cuenta/contrato (CU-44 Excepción 2)
   *   500 - Falla de persistencia (CU-44 Excepción 3)
   */
  @Post('confirmar')
  @HttpCode(201)
  async confirmar(
    @Body(new ZodValidationPipe(RegistrarPagoDto)) body: unknown,
    @Req() req: Request,
  ) {
    return this.pagosService.registrarPagoConfirmado(
      body as RegistrarPagoDto,
      req.ip ?? '0.0.0.0',
    );
  }
}
