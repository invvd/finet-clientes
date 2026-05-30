import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { cleanRut } from '../common/utils/rut.js';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(rut: string, password: string, ip: string) {
    const rutLimpio = cleanRut(rut);

    const bloqueo = await this.prisma.intento_fallido.findFirst({
      where: {
        rut_intentado: rutLimpio,
        bloqueado_hasta: { gt: new Date() },
      },
      orderBy: { bloqueado_hasta: 'desc' },
    });

    if (bloqueo?.bloqueado_hasta) {
      throw new UnauthorizedException('RUT bloqueado temporalmente');
    }

    const cliente = await this.prisma.cliente.findUnique({
      where: { rut: rutLimpio },
    });

    if (!cliente) {
      await this.registrarIntentoFallido(rutLimpio, ip);
      throw new UnauthorizedException('RUT o contraseña incorrectos');
    }

    if (!cliente.password_portal_hash) {
      await this.registrarIntentoFallido(rutLimpio, ip, cliente.id_empresa ?? null);
      throw new UnauthorizedException('RUT o contraseña incorrectos');
    }

    const passwordValida = await bcrypt.compare(
      password,
      cliente.password_portal_hash,
    );

    if (!passwordValida) {
      await this.registrarIntentoFallido(rutLimpio, ip, cliente.id_empresa ?? null);
      throw new UnauthorizedException('RUT o contraseña incorrectos');
    }

    await this.prisma.intento_fallido.deleteMany({
      where: { rut_intentado: rutLimpio },
    });

    const payload = { sub: cliente.id_cliente, rut: cliente.rut };
    const token = await this.jwtService.signAsync(payload);

    await this.invalidarSesionesAnteriores(cliente.id_cliente);

    await this.prisma.sesion_portal.create({
      data: {
        id_cliente: cliente.id_cliente,
        token,
        fecha_inicio: new Date(),
        fecha_expiracion: this.calcularExpiracion(),
      },
    });

    return {
      access_token: token,
      cliente: {
        id: cliente.id_cliente,
        rut: cliente.rut,
        nombre_completo: cliente.nombre_completo,
        email: cliente.email,
        telefono: cliente.telefono,
      },
    };
  }

  async logout(idCliente: number, token: string) {
    await this.prisma.sesion_portal.updateMany({
      where: {
        id_cliente: idCliente,
        token,
        fecha_expiracion: { gt: new Date() },
      },
      data: {
        fecha_expiracion: new Date(),
      },
    });
  }

  private async invalidarSesionesAnteriores(idCliente: number) {
    await this.prisma.sesion_portal.updateMany({
      where: {
        id_cliente: idCliente,
        fecha_expiracion: { gt: new Date() },
      },
      data: {
        fecha_expiracion: new Date(),
      },
    });
  }

  private calcularExpiracion(): Date {
    const expiracion = new Date();
    expiracion.setDate(expiracion.getDate() + 7);
    return expiracion;
  }

  private async registrarIntentoFallido(
    rutLimpio: string,
    ip: string,
    idEmpresa?: number | null,
  ) {
    const ahora = new Date();
    const ventanaInicio = new Date(ahora.getTime() - 10 * 60 * 1000);

    const intentos = await this.prisma.intento_fallido.count({
      where: {
        rut_intentado: rutLimpio,
        timestamp: { gte: ventanaInicio },
      },
    });

    const bloquearHasta = intentos + 1 >= 5
      ? new Date(ahora.getTime() + 15 * 60 * 1000)
      : null;

    await this.prisma.intento_fallido.create({
      data: {
        rut_intentado: rutLimpio,
        id_empresa: idEmpresa ?? undefined,
        ip_address: ip,
        timestamp: ahora,
        bloqueado_hasta: bloquearHasta ?? undefined,
      },
    });
  }
}
