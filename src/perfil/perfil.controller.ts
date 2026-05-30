import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { PerfilService } from './perfil.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ClienteActual } from '../common/decorators/cliente-actual.decorator';
import {
  ActualizarEmailDto,
  ActualizarTelefonoDto,
  CambiarPasswordDto,
} from './dto/perfil.dto';
import { cliente } from '../../generated/prisma/client';

@Controller('perfil')
@UseGuards(JwtAuthGuard)
export class PerfilController {
  constructor(private readonly perfilService: PerfilService) {}

  /**
   * CU-07: Acceder a la sección Perfil del portal.
   * GET /perfil
   */
  @Get()
  getPerfil(@ClienteActual() cliente: cliente) {
    return this.perfilService.getPerfil(cliente.id_cliente);
  }

  /**
   * CU-08: Actualizar número de teléfono de contacto.
   * PATCH /perfil/telefono
   * Body: { "telefono": "+56912345678" }
   */
  @Patch('telefono')
  actualizarTelefono(
    @ClienteActual() cliente: cliente,
    @Body() body: unknown,
  ) {
    const parsed = ActualizarTelefonoDto.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors[0].message);
    }
    return this.perfilService.actualizarTelefono(cliente.id_cliente, parsed.data);
  }

  /**
   * CU-09: Actualizar correo electrónico de contacto.
   * PATCH /perfil/email
   * Body: { "email": "nuevo@correo.com" }
   */
  @Patch('email')
  actualizarEmail(
    @ClienteActual() cliente: cliente,
    @Body() body: unknown,
  ) {
    const parsed = ActualizarEmailDto.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors[0].message);
    }
    return this.perfilService.actualizarEmail(cliente.id_cliente, parsed.data);
  }

  /**
   * CU-10: Cambiar contraseña de acceso al portal.
   * CU-11: La validación de complejidad ocurre en el DTO (zod) antes de llegar al service.
   * PATCH /perfil/password
   * Body: { "password_actual": "...", "password_nuevo": "..." }
   */
  @Patch('password')
  cambiarPassword(
    @ClienteActual() cliente: cliente,
    @Body() body: unknown,
  ) {
    const parsed = CambiarPasswordDto.safeParse(body);
    if (!parsed.success) {
      // Retorna TODOS los errores de validación (útil para CU-11 en el frontend)
      throw new BadRequestException(
        parsed.error.errors.map((e) => e.message),
      );
    }
    return this.perfilService.cambiarPassword(cliente.id_cliente, parsed.data);
  }
}
