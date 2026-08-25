import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  HttpCode,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AdminService } from './admin.service.js';
import { ApiKeyGuard } from './guards/api-key.guard.js';
import { ZodValidationPipe } from '../auth/pipes/zod-validation.pipe.js';
import { intentosFallidosQuerySchema } from './dto/intentos-fallidos.dto.js';
import type { IntentosFallidosQueryDto } from './dto/intentos-fallidos.dto.js';
import { desbloquearIpSchema } from './dto/desbloquear-ip.dto.js';
import { reporteFinancieroQuerySchema } from './dto/reporte-financiero.dto.js';
import type { ReporteFinancieroQueryDto } from './dto/reporte-financiero.dto.js';

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

  @Post('intentos-fallidos/desbloquear-ip')
  @HttpCode(200)
  async desbloquearIp(
    @Body(new ZodValidationPipe(desbloquearIpSchema))
    body: {
      ip: string;
    },
  ) {
    return this.adminService.desbloquearIp(body.ip);
  }

  @Get('reportes/financiero')
  getReporteFinanciero(
    @Query(new ZodValidationPipe(reporteFinancieroQuerySchema))
    query: ReporteFinancieroQueryDto,
  ) {
    return this.adminService.getReporteFinanciero(query);
  }

  @Get('reportes/financiero/descarga')
  async descargarReporteFinanciero(
    @Query(new ZodValidationPipe(reporteFinancieroQuerySchema))
    query: ReporteFinancieroQueryDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const archivo = await this.adminService.descargarReporteFinanciero(query);
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${archivo.nombre}"`,
    );
    return archivo.contenido;
  }
}
