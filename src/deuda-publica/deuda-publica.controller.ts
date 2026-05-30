import {
  BadRequestException,
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import { DeudaPublicaService } from './deuda-publica.service';
import {
  consultaDeudaAbonadoSchema,
  consultaDeudaRutSchema,
} from './dto/deuda-publica.dto';

/**
 * Endpoints públicos — NO requieren autenticación.
 * Permiten que cualquier persona consulte su deuda con RUT o código de abonado.
 */
@Controller('deuda-publica')
export class DeudaPublicaController {
  constructor(private readonly deudaPublicaService: DeudaPublicaService) {}

  /**
   * CU-39: Consultar deuda pública mediante RUT.
   * GET /deuda-publica/rut?rut=12345678-9
   */
  @Get('rut')
  consultarPorRut(@Query() query: Record<string, string>) {
    const parsed = consultaDeudaRutSchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors[0].message);
    }
    return this.deudaPublicaService.consultarPorRut(parsed.data.rut);
  }

  /**
   * CU-40: Consultar deuda pública mediante código de abonado.
   * GET /deuda-publica/abonado?codigo_abonado=1234
   *
   * CU-41: El detalle de deuda y fecha de vencimiento viene incluido
   * en la respuesta (campo `facturas` con dias_para_vencer / dias_vencida).
   */
  @Get('abonado')
  consultarPorAbonado(@Query() query: Record<string, string>) {
    const parsed = consultaDeudaAbonadoSchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors[0].message);
    }

    return this.deudaPublicaService.consultarPorAbonado(
      parseInt(parsed.data.codigo_abonado, 10),
    );
  }
}
