import { createReadStream } from 'node:fs';
import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { PagosService } from './pagos.service.js';
import { ApiKeyGuard } from '../admin/guards/api-key.guard.js';
import { ZodValidationPipe } from '../auth/pipes/zod-validation.pipe.js';
import { RegistrarPagoDto } from './dto/pagos.dto.js';
import { pagosRechazadosQuerySchema } from './dto/pagos-rechazados.dto.js';
import type { PagosRechazadosQueryDto } from './dto/pagos-rechazados.dto.js';
import { IncorporarAbonoExternoDto } from './dto/abonos-externos.dto.js';
import { listadoPagosQuerySchema } from './dto/listado-pagos.dto.js';
import type { ListadoPagosQueryDto } from './dto/listado-pagos.dto.js';

/**
 * Núcleo de pago (Incremento 2). Protegido con API Key porque, en este
 * incremento, quienes reportan pagos son sistemas de recaudación externa
 * (CU-46) operados por un administrador — no hay pasarela conectada todavía
 * (esa llega en CU-42/43, Incremento 3, y reusará el mismo `PagosService`).
 *
 * Base path: /api/admin/pagos
 */
@Controller('admin/pagos')
@UseGuards(ApiKeyGuard)
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  /**
   * CU-44 / CU-45: registrar un pago confirmado
   *
   * Registra de forma permanente un pago ya confirmado (fecha, monto, código
   * de autorización) y lo asocia a la factura indicada — marcándola como
   * pagada. Pensado para cuando ya se conoce la factura exacta a la que
   * aplica el pago (a diferencia de CU-46, que la resuelve a partir del
   * contrato).
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

  /**
   * CU-46: incorporar un abono de recaudación externa
   *
   * Incorpora al saldo del cliente un abono reportado por una entidad de
   * recaudación externa (pago hecho fuera de nuestro sistema). Identifica el
   * contrato por `codigo_abonado` (= id_contrato) y lo aplica a la factura
   * pendiente/vencida más antigua de ese contrato — no hay pagos parciales,
   * así que el monto debe calzar exacto con esa factura.
   *
   * POST /admin/pagos/abonos-externos
   * Auth: X-API-Key
   *
   * @body {
   *   codigo_abonado: number,      // = id_contrato
   *   monto: number,
   *   fecha_pago: string,          // ISO 8601
   *   codigo_transaccion: string,  // único — CU-45
   *   pasarela: string             // nombre del recaudador externo
   * }
   *
   * Errores:
   *   400 - Validación Zod, o monto inválido/inconsistente con la deuda del contrato (CU-46 Excepción 2)
   *   409 - codigo_transaccion ya registrado (CU-45)
   *   422 - No fue posible identificar al cliente/contrato (CU-46 Excepción 1)
   *   500 - Falla al actualizar el saldo (CU-46 Excepción 3)
   */
  @Post('abonos-externos')
  @HttpCode(201)
  async incorporarAbono(
    @Body(new ZodValidationPipe(IncorporarAbonoExternoDto)) body: unknown,
    @Req() req: Request,
  ) {
    return this.pagosService.incorporarAbonoExterno(
      body as IncorporarAbonoExternoDto,
      req.ip ?? '0.0.0.0',
    );
  }

  /**
   * CU-52: "el administrador puede acceder al comprobante generado desde el
   * historial de transacciones del sistema" — historial de pagos exitosos.
   *
   * GET /admin/pagos
   * Auth: X-API-Key
   *
   * @query {
   *   desde?: string,   // YYYY-MM-DD
   *   hasta?: string,   // YYYY-MM-DD
   *   page?: number,    // default 1
   *   limit?: number    // default 20, máx 100
   * }
   */
  @Get()
  @HttpCode(200)
  async listar(
    @Query(new ZodValidationPipe(listadoPagosQuerySchema))
    query: ListadoPagosQueryDto,
  ) {
    return this.pagosService.listarPagos(query);
  }

  /**
   * CU-52: descargar el comprobante PDF de un pago
   *
   * GET /admin/pagos/:id_pago/comprobante
   * Auth: X-API-Key
   *
   * Errores:
   *   404 - El pago no existe, o el comprobante todavía no se generó
   *         (CU-52 Excepción 1/2 — queda pendiente de generación)
   */
  @Get(':id_pago/comprobante')
  @Header('Content-Type', 'application/pdf')
  async descargarComprobante(
    @Param('id_pago', ParseIntPipe) idPago: number,
  ): Promise<StreamableFile> {
    const ruta = await this.pagosService.obtenerRutaComprobante(idPago);
    return new StreamableFile(createReadStream(ruta));
  }

  /**
   * CU-45: consultar el historial de intentos de registro rechazados por
   * código duplicado
   *
   * GET /admin/pagos/rechazados
   * Auth: X-API-Key
   *
   * @query {
   *   codigo_transaccion?: string,
   *   desde?: string,   // YYYY-MM-DD
   *   hasta?: string,   // YYYY-MM-DD
   *   page?: number,    // default 1
   *   limit?: number    // default 20, máx 100
   * }
   */
  @Get('rechazados')
  @HttpCode(200)
  async getRechazados(
    @Query(new ZodValidationPipe(pagosRechazadosQuerySchema))
    query: PagosRechazadosQueryDto,
  ) {
    return this.pagosService.getPagosRechazados(query);
  }
}
