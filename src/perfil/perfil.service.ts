import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ActualizarEmailDto,
  ActualizarTelefonoDto,
  CambiarPasswordDto,
  PerfilResponseDto,
} from './dto/perfil.dto';
import { createHash } from 'crypto';

@Injectable()
export class PerfilService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── CU-07: Acceder a la sección Perfil ──────────────────────────────────
  // Retorna los datos visibles del cliente autenticado.
  async getPerfil(idCliente: number): Promise<PerfilResponseDto> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id_cliente: idCliente },
      select: {
        id_cliente: true,
        nombre_completo: true,
        rut: true,
        email: true,
        telefono: true,
        fecha_creacion: true,
      },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }

    return {
      id_cliente: cliente.id_cliente,
      nombre_completo: cliente.nombre_completo,
      rut: cliente.rut,
      email: cliente.email,
      telefono: cliente.telefono,
      fecha_creacion: cliente.fecha_creacion
        ? cliente.fecha_creacion.toISOString()
        : null,
    };
  }

  // ─── CU-08: Actualizar número de teléfono ────────────────────────────────
  async actualizarTelefono(
    idCliente: number,
    dto: ActualizarTelefonoDto,
  ): Promise<PerfilResponseDto> {
    await this.assertClienteExiste(idCliente);

    const actualizado = await this.prisma.cliente.update({
      where: { id_cliente: idCliente },
      data: { telefono: dto.telefono },
      select: {
        id_cliente: true,
        nombre_completo: true,
        rut: true,
        email: true,
        telefono: true,
        fecha_creacion: true,
      },
    });

    return this.mapearPerfil(actualizado);
  }

  // ─── CU-09: Actualizar correo electrónico ────────────────────────────────
  async actualizarEmail(
    idCliente: number,
    dto: ActualizarEmailDto,
  ): Promise<PerfilResponseDto> {
    await this.assertClienteExiste(idCliente);

    // Verificar que el email no esté en uso por otro cliente
    const emailEnUso = await this.prisma.cliente.findFirst({
      where: {
        email: dto.email,
        id_cliente: { not: idCliente },
      },
    });

    if (emailEnUso) {
      throw new BadRequestException(
        'El correo electrónico ya está registrado por otro usuario',
      );
    }

    const actualizado = await this.prisma.cliente.update({
      where: { id_cliente: idCliente },
      data: { email: dto.email },
      select: {
        id_cliente: true,
        nombre_completo: true,
        rut: true,
        email: true,
        telefono: true,
        fecha_creacion: true,
      },
    });

    return this.mapearPerfil(actualizado);
  }

  // ─── CU-10 + CU-11: Cambiar contraseña con validación de complejidad ─────
  // CU-11 es la validación de requisitos — está cubierta en el DTO (zod).
  // Aquí además verificamos que la contraseña actual sea correcta.
  async cambiarPassword(
    idCliente: number,
    dto: CambiarPasswordDto,
  ): Promise<{ mensaje: string }> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id_cliente: idCliente },
      select: { password_portal_hash: true },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }

    // Verificar contraseña actual
    const hashActual = this.hashPassword(dto.password_actual);
    if (hashActual !== cliente.password_portal_hash) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    // Evitar que la nueva contraseña sea igual a la actual
    const hashNuevo = this.hashPassword(dto.password_nuevo);
    if (hashNuevo === cliente.password_portal_hash) {
      throw new BadRequestException(
        'La nueva contraseña no puede ser igual a la actual',
      );
    }

    await this.prisma.cliente.update({
      where: { id_cliente: idCliente },
      data: { password_portal_hash: hashNuevo },
    });

    return { mensaje: 'Contraseña actualizada correctamente' };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────
  private async assertClienteExiste(idCliente: number): Promise<void> {
    const existe = await this.prisma.cliente.findUnique({
      where: { id_cliente: idCliente },
      select: { id_cliente: true },
    });
    if (!existe) throw new NotFoundException('Cliente no encontrado');
  }

  private mapearPerfil(c: {
    id_cliente: number;
    nombre_completo: string;
    rut: string | null;
    email: string | null;
    telefono: string | null;
    fecha_creacion: Date | null;
  }): PerfilResponseDto {
    return {
      id_cliente: c.id_cliente,
      nombre_completo: c.nombre_completo,
      rut: c.rut,
      email: c.email,
      telefono: c.telefono,
      fecha_creacion: c.fecha_creacion ? c.fecha_creacion.toISOString() : null,
    };
  }

  /**
   * Hash SHA-256 simple para el portal.
   * Si en el proyecto ya se usa bcrypt, reemplazar este método
   * por bcrypt.compare() / bcrypt.hash() según corresponda.
   */
  private hashPassword(plain: string): string {
    return createHash('sha256').update(plain).digest('hex');
  }
}
