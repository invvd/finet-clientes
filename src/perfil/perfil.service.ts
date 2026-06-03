import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  type ActualizarEmailDto,
  type ActualizarTelefonoDto,
  type CambiarPasswordDto,
  type PerfilResponseDto,
} from './dto/perfil.dto.js';

@Injectable()
export class PerfilService {
  constructor(private readonly prisma: PrismaService) {}

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

  async actualizarEmail(
    idCliente: number,
    dto: ActualizarEmailDto,
  ): Promise<PerfilResponseDto> {
    await this.assertClienteExiste(idCliente);

    const emailEnUso = await this.prisma.cliente.findFirst({
      where: {
        email: dto.email,
        id_cliente: { not: idCliente },
      },
    });

    if (emailEnUso) {
      throw new BadRequestException(
        'El correo electronico ya esta registrado por otro usuario',
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

  async cambiarPassword(
    idCliente: number,
    dto: CambiarPasswordDto,
  ): Promise<{ mensaje: string }> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id_cliente: idCliente },
      select: { password_portal_hash: true },
    });

    if (!cliente || !cliente.password_portal_hash) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const passwordValida = await bcrypt.compare(
      dto.password_actual,
      cliente.password_portal_hash,
    );

    if (!passwordValida) {
      throw new UnauthorizedException('La contrasena actual es incorrecta');
    }

    const nuevaIgual = await bcrypt.compare(
      dto.password_nuevo,
      cliente.password_portal_hash,
    );

    if (nuevaIgual) {
      throw new BadRequestException(
        'La nueva contrasena no puede ser igual a la actual',
      );
    }

    await this.prisma.cliente.update({
      where: { id_cliente: idCliente },
      data: { password_portal_hash: await bcrypt.hash(dto.password_nuevo, 10) },
    });

    return { mensaje: 'Contrasena actualizada correctamente' };
  }

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
}
