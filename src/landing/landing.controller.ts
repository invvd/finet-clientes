import { Controller, Get, Query } from '@nestjs/common';
import { LandingService } from './landing.service.js';
import { ZodValidationPipe } from '../auth/pipes/zod-validation.pipe.js';
import { ConsultaPlanesDto } from './dto/landing.dto.js';

@Controller('landing')
export class LandingController {
  constructor(private readonly landingService: LandingService) {}

  @Get('planes')
  getPlanes(
    @Query(new ZodValidationPipe(ConsultaPlanesDto))
    query: ConsultaPlanesDto,
  ) {
    return this.landingService.getPlanes(query.tipo_cliente);
  }
}
