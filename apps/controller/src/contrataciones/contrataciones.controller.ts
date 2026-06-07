import { Body, Controller, Post } from '@nestjs/common';
import { ContratacionesService } from './contrataciones.service.js';
import { ZodValidationPipe } from '../auth/pipes/zod-validation.pipe.js';
import { ContratacionDto } from './dto/contratacion.dto.js';

/**
 * Endpoint público — no requiere autenticación.
 * Base path: /api/contrataciones
 */
@Controller('contrataciones')
export class ContratacionesController {
  constructor(private readonly contratacionesService: ContratacionesService) {}

  /**
   * POST /contrataciones
   * Registra un nuevo cliente desde el formulario web:
   * crea cliente, dirección, contrato, orden de instalación y prospecto CRM en una sola transacción.
   */
  @Post()
  crear(
    @Body(new ZodValidationPipe(ContratacionDto))
    dto: ContratacionDto,
  ) {
    return this.contratacionesService.crear(dto);
  }
}
