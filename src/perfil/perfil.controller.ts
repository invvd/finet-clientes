import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
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
  ) {
    return this.perfilService.actualizarTelefono(
      cliente.id_cliente,
      body as ActualizarTelefonoDto,
    );
  }

  @Patch('email')
  actualizarEmail(
    @CurrentClient() cliente: cliente,
    @Body(new ZodValidationPipe(ActualizarEmailDto)) body: unknown,
  ) {
    return this.perfilService.actualizarEmail(
      cliente.id_cliente,
      body as ActualizarEmailDto,
    );
  }

  @Patch('password')
  cambiarPassword(
    @CurrentClient() cliente: cliente,
    @Body(new ZodValidationPipe(CambiarPasswordDto)) body: unknown,
  ) {
    return this.perfilService.cambiarPassword(
      cliente.id_cliente,
      body as CambiarPasswordDto,
    );
  }
}
