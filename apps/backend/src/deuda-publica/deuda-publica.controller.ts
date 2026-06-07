import { Controller, Get, Query } from '@nestjs/common';
import { DeudaPublicaService } from './deuda-publica.service.js';
import { ZodValidationPipe } from '../auth/pipes/zod-validation.pipe.js';
import {
  ConsultaDeudaAbonado,
  ConsultaDeudaRutDto,
} from './dto/deuda-publica.dto.js';

@Controller('deuda-publica')
export class DeudaPublicaController {
  constructor(private readonly deudaPublicaService: DeudaPublicaService) {}

  @Get('rut')
  consultarPorRut(
    @Query(new ZodValidationPipe(ConsultaDeudaRutDto))
    query: ConsultaDeudaRutDto,
  ) {
    return this.deudaPublicaService.consultarPorRut(query.rut);
  }

  @Get('abonado')
  consultarPorAbonado(
    @Query(new ZodValidationPipe(ConsultaDeudaAbonado))
    query: ConsultaDeudaAbonado,
  ) {
    const codigoNum = parseInt(query.codigo_abonado, 10);

    return this.deudaPublicaService.consultarPorAbonado(codigoNum);
  }
}
