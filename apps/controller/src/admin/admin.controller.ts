import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { AdminGuard } from './guards/admin.guard.js';
import { ZodValidationPipe } from '../auth/pipes/zod-validation.pipe.js';
import { intentosFallidosQuerySchema } from './dto/intentos-fallidos.dto.js';
import type { IntentosFallidosQueryDto } from './dto/intentos-fallidos.dto.js';
import { desbloquearIpSchema } from './dto/desbloquear-ip.dto.js';

@Controller('admin')
@UseGuards(AdminGuard)
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
}
