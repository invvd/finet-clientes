import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
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
      await this.registrarIntentoFallido(
        rutLimpio,
        ip,
        cliente.id_empresa ?? null,
      );
      throw new UnauthorizedException('RUT o contraseña incorrectos');
    }

    const passwordValida = await bcrypt.compare(
      password,
      cliente.password_portal_hash,
    );

    if (!passwordValida) {
      await this.registrarIntentoFallido(
        rutLimpio,
        ip,
        cliente.id_empresa ?? null,
      );
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

  async register(
    rut: string,
    nombreCompleto: string,
    password: string,
    email?: string | null,
    telefono?: string | null,
    ip?: string,
  ) {
    const rutLimpio = cleanRut(rut);

    const existente = await this.prisma.cliente.findUnique({
      where: { rut: rutLimpio },
    });

    if (existente) {
      throw new ConflictException('El RUT ya está registrado');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const cliente = await this.prisma.cliente.create({
      data: {
        rut: rutLimpio,
        nombre_completo: nombreCompleto,
        email: email || null,
        telefono: telefono || null,
        password_portal_hash: passwordHash,
        id_empresa: 1,
        estado: 'activo',
      },
    });

    const payload = { sub: cliente.id_cliente, rut: cliente.rut };
    const token = await this.jwtService.signAsync(payload);

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

  async recuperarPassword(rut: string) {
    const rutLimpio = cleanRut(rut);

    const cliente = await this.prisma.cliente.findUnique({
      where: { rut: rutLimpio },
    });

    if (!cliente) {
      return {
        message:
          'Si el RUT está registrado, recibirás un enlace de recuperación',
      };
    }

    const payload = { sub: cliente.id_cliente, type: 'reset' };
    const token = await this.jwtService.signAsync(payload, {
      expiresIn: '15m',
    });

    return { token };
  }

  async restablecerPassword(token: string, password: string) {
    let payload: { sub: number; type: string };

    try {
      payload = this.jwtService.verify<{ sub: number; type: string }>(token);
    } catch {
      throw new BadRequestException('Token inválido o expirado');
    }

    if (payload.type !== 'reset') {
      throw new BadRequestException('Token inválido');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await this.prisma.cliente.update({
      where: { id_cliente: payload.sub },
      data: { password_portal_hash: passwordHash },
    });

    await this.invalidarSesionesAnteriores(payload.sub);

    return { message: 'Contraseña restablecida exitosamente' };
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
    const timeout = parseInt(
      process.env.SESSION_INACTIVITY_MINUTES ?? '15',
      10,
    );
    const expiracion = new Date();
    expiracion.setMinutes(expiracion.getMinutes() + timeout);
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

    const bloquearHasta =
      intentos + 1 >= 5 ? new Date(ahora.getTime() + 15 * 60 * 1000) : null;

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
