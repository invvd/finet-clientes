import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { PerfilService } from './perfil.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentClient } from '../auth/decorators/current-client.decorator.js';
import { ZodValidationPipe } from '../auth/pipes/zod-validation.pipe.js';
import {
  ActualizarEmailDto,
  ActualizarTelefonoDto,
  CambiarPasswordDto,
} from './dto/perfil.dto.js';
import type { cliente } from '../../generated/prisma/client.js';

@Controller('auth/perfil')
@UseGuards(JwtAuthGuard)
export class PerfilController {
  constructor(private readonly perfilService: PerfilService) {}

  @Get()
  getPerfil(@CurrentClient() cliente: cliente) {
    return this.perfilService.getPerfil(cliente.id_cliente);
  }

  @Patch('telefono')
  actualizarTelefono(
    @CurrentClient() cliente: cliente,
    @Body(new ZodValidationPipe(ActualizarTelefonoDto)) body: unknown,
    @Req() req: Request,
  ) {
    return this.perfilService.actualizarTelefono(
      cliente.id_cliente,
      body as ActualizarTelefonoDto,
      req.ip ?? '0.0.0.0',
    );
  }

  @Patch('email')
  actualizarEmail(
    @CurrentClient() cliente: cliente,
    @Body(new ZodValidationPipe(ActualizarEmailDto)) body: unknown,
    @Req() req: Request,
  ) {
    return this.perfilService.actualizarEmail(
      cliente.id_cliente,
      body as ActualizarEmailDto,
      req.ip ?? '0.0.0.0',
    );
  }

  @Patch('password')
  cambiarPassword(
    @CurrentClient() cliente: cliente,
    @Body(new ZodValidationPipe(CambiarPasswordDto)) body: unknown,
    @Req() req: Request,
  ) {
    return this.perfilService.cambiarPassword(
      cliente.id_cliente,
      body as CambiarPasswordDto,
      req.ip ?? '0.0.0.0',
    );
  }
}
