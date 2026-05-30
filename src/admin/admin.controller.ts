import { Controller, Get, Query, UseGuards, HttpCode } from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { ApiKeyGuard } from './guards/api-key.guard.js';
import { ZodValidationPipe } from '../auth/pipes/zod-validation.pipe.js';
import { intentosFallidosQuerySchema } from './dto/intentos-fallidos.dto.js';
import type { IntentosFallidosQueryDto } from './dto/intentos-fallidos.dto.js';

@Controller('admin')
@UseGuards(ApiKeyGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('intentos-fallidos')
  @HttpCode(200)
  async getIntentosFallidos(
    @Query(new ZodValidationPipe(intentosFallidosQuerySchema))
    query: IntentosFallidosQueryDto,
  ) {
    return this.adminService.getIntentosFallidos(query);
  }
}
