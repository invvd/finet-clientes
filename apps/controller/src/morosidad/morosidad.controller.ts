import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MorosidadService } from './morosidad.service.js';
import { AdminGuard } from '../admin/guards/admin.guard.js';
import { ZodValidationPipe } from '../auth/pipes/zod-validation.pipe.js';
import {
  ActualizarConfiguracionDto,
  ContratosVencidosQueryDto,
} from './dto/morosidad.dto.js';

/**
 * Bloque Deuda del Incremento 2. Corresponde al `MorosidadController` del Diagrama de
 * Componentes del Documento 0.
 *
 * La Excepción 1 de los CU de este bloque ("sin permisos suficientes") la cubre AdminGuard.
 * Hoy valida `x-api-key`; el caso real de un admin autenticado pero sin permisos de
 * configuración no se puede verificar hasta que exista el panel administrativo con roles.
 */
@Controller('admin/morosidad')
@UseGuards(AdminGuard)
export class MorosidadController {
  constructor(private readonly morosidadService: MorosidadService) {}

  /**
   * CU-80: parámetros de detección de morosidad de un contrato.
   *
   * Van por contrato porque cada uno define su propio corte: según cuándo se contrató, o
   * según lo que el administrador decida para ese cliente.
   */
  @Get('configuracion/:idContrato')
  obtenerConfiguracion(@Param('idContrato', ParseIntPipe) idContrato: number) {
    return this.morosidadService.obtenerConfiguracion(idContrato);
  }

  /**
   * CU-80: actualiza los parámetros de un contrato.
   * Excepción 2 (valor fuera de rango) la rechaza el ZodValidationPipe con 400.
   */
  @Put('configuracion/:idContrato')
  @HttpCode(200)
  actualizarConfiguracion(
    @Param('idContrato', ParseIntPipe) idContrato: number,
    @Body(new ZodValidationPipe(ActualizarConfiguracionDto))
    body: ActualizarConfiguracionDto,
  ) {
    return this.morosidadService.actualizarConfiguracion(idContrato, body);
  }

  /**
   * CU-47: dispara a mano la revisión diaria de morosidad, que normalmente corre por cron a
   * las 00:00. Existe para poder demostrarla y probarla sin esperar a medianoche; el actor
   * del CU sigue siendo el Sistema.
   *
   * Devuelve el mismo log que deja el cron: hora de inicio, fin y contratos procesados.
   */
  @Post('revision')
  @HttpCode(200)
  revisarMorosidad() {
    return this.morosidadService.revisarMorosidad();
  }

  /**
   * CU-55 / RF-40: lista paginada de contratos con saldos vencidos.
   * Excepción 3 (sin resultados) devuelve `data: []`, no un error.
   */
  @Get('contratos-vencidos')
  listarContratosVencidos(
    @Query(new ZodValidationPipe(ContratosVencidosQueryDto))
    query: ContratosVencidosQueryDto,
  ) {
    return this.morosidadService.listarContratosVencidos(query);
  }

  /** CU-56 / RF-40: detalle de deuda, historial de pagos y datos del cliente. */
  @Get('contratos-vencidos/:id')
  obtenerDetalleContratoVencido(@Param('id', ParseIntPipe) id: number) {
    return this.morosidadService.obtenerDetalleContratoVencido(id);
  }
}
