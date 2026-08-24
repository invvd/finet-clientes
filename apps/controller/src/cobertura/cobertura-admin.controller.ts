import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CoberturaService } from './cobertura.service.js';
import { ApiKeyGuard } from '../admin/guards/api-key.guard.js';
import { ZodValidationPipe } from '../auth/pipes/zod-validation.pipe.js';
import {
  actualizarPuntoCoberturaSchema,
  actualizarZonaCoberturaSchema,
  crearPuntoCoberturaSchema,
  crearZonaCoberturaSchema,
  listarPuntosCoberturaSchema,
  listarZonasCoberturaSchema,
  puntoCoberturaIdSchema,
  trazoPincelSchema,
  zonaCoberturaIdSchema,
} from './dto/cobertura.dto.js';
import type {
  ActualizarPuntoCoberturaDto,
  ActualizarZonaCoberturaDto,
  CrearPuntoCoberturaDto,
  CrearZonaCoberturaDto,
  ListarPuntosCoberturaDto,
  ListarZonasCoberturaDto,
  TrazoPincelDto,
} from './dto/cobertura.dto.js';

/**
 * Editor de cobertura del administrador (CU-59 / CU-60).
 *
 * El panel de administración definitivo todavía no existe; por ahora estos
 * endpoints los consume la página provisional `/admin/cobertura` del sitio,
 * autenticándose con el header `X-API-Key`.
 *
 * Base path: /api/admin/cobertura
 */
@Controller('admin/cobertura')
@UseGuards(ApiKeyGuard)
export class CoberturaAdminController {
  constructor(private readonly coberturaService: CoberturaService) {}

  /** Estado completo del lienzo: celdas del pincel + polígonos + grilla. */
  @Get('lienzo')
  @HttpCode(200)
  getLienzo() {
    return this.coberturaService.getLienzo();
  }

  // --- Pincel ---------------------------------------------------------------

  /** Aplica un trazo: celdas a pintar y a borrar en una sola transacción. */
  @Post('pincel')
  @HttpCode(200)
  aplicarTrazo(
    @Body(new ZodValidationPipe(trazoPincelSchema)) body: TrazoPincelDto,
  ) {
    return this.coberturaService.aplicarTrazo(body);
  }

  /** Borra todo lo pintado a mano. Los polígonos quedan intactos. */
  @Delete('pincel')
  @HttpCode(200)
  limpiarPincel() {
    return this.coberturaService.limpiarPincel();
  }

  // --- Zonas (polígonos) ----------------------------------------------------

  @Get('zonas')
  @HttpCode(200)
  listarZonas(
    @Query(new ZodValidationPipe(listarZonasCoberturaSchema))
    query: ListarZonasCoberturaDto,
  ) {
    return this.coberturaService.listarZonas(query.incluir_inactivas);
  }

  @Post('zonas')
  @HttpCode(201)
  crearZona(
    @Body(new ZodValidationPipe(crearZonaCoberturaSchema))
    body: CrearZonaCoberturaDto,
  ) {
    return this.coberturaService.crearZona(body);
  }

  @Patch('zonas/:id')
  @HttpCode(200)
  actualizarZona(
    @Param('id', new ZodValidationPipe(zonaCoberturaIdSchema)) id: number,
    @Body(new ZodValidationPipe(actualizarZonaCoberturaSchema))
    body: ActualizarZonaCoberturaDto,
  ) {
    return this.coberturaService.actualizarZona(id, body);
  }

  @Delete('zonas/:id')
  @HttpCode(200)
  eliminarZona(
    @Param('id', new ZodValidationPipe(zonaCoberturaIdSchema)) id: number,
  ) {
    return this.coberturaService.eliminarZona(id);
  }

  // --- Puntos sueltos (CRUD fila a fila) ------------------------------------

  @Get('puntos')
  @HttpCode(200)
  listarPuntos(
    @Query(new ZodValidationPipe(listarPuntosCoberturaSchema))
    query: ListarPuntosCoberturaDto,
  ) {
    return this.coberturaService.listarPuntos(query);
  }

  @Post('puntos')
  @HttpCode(201)
  crearPunto(
    @Body(new ZodValidationPipe(crearPuntoCoberturaSchema))
    body: CrearPuntoCoberturaDto,
  ) {
    return this.coberturaService.crearPunto(body);
  }

  @Patch('puntos/:id')
  @HttpCode(200)
  actualizarPunto(
    @Param('id', new ZodValidationPipe(puntoCoberturaIdSchema)) id: number,
    @Body(new ZodValidationPipe(actualizarPuntoCoberturaSchema))
    body: ActualizarPuntoCoberturaDto,
  ) {
    return this.coberturaService.actualizarPunto(id, body);
  }

  @Delete('puntos/:id')
  @HttpCode(200)
  eliminarPunto(
    @Param('id', new ZodValidationPipe(puntoCoberturaIdSchema)) id: number,
  ) {
    return this.coberturaService.eliminarPunto(id);
  }
}
