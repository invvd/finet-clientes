import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { cleanRut } from '../common/utils/rut.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async login(rut: string, password: string, ip: string) {
    const rutLimpio = cleanRut(rut);

    const ipBloqueo = await this.prisma.intento_fallido.findFirst({
      where: {
        ip_address: ip,
        bloqueado_hasta: { gt: new Date() },
      },
      orderBy: { bloqueado_hasta: 'desc' },
    });

    if (ipBloqueo?.bloqueado_hasta) {
      throw new UnauthorizedException('IP bloqueada temporalmente');
    }

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
        ip_origen: ip,
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
    ip: string,
    email: string,
    telefono?: string | null,
  ) {
    const rutLimpio = cleanRut(rut);

    const existenteRut = await this.prisma.cliente.findUnique({
      where: { rut: rutLimpio },
    });

    if (existenteRut) {
      throw new ConflictException('El RUT ya está registrado');
    }

    const existenteEmail = await this.prisma.cliente.findFirst({
      where: { email },
    });

    if (existenteEmail) {
      throw new ConflictException('El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const cliente = await this.prisma.cliente.create({
      data: {
        rut: rutLimpio,
        nombre_completo: nombreCompleto,
        email: email,
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
        ip_origen: ip,
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
    await this.prisma.sesion_portal.deleteMany({
      where: {
        id_cliente: idCliente,
        token,
      },
    });
  }

  async recuperarPassword(rut: string, ip?: string) {
    const rutLimpio = cleanRut(rut);
    const mensajeGenerico = {
      message: 'Si el RUT está registrado, recibirás un enlace de recuperación',
    };

    const cliente = await this.prisma.cliente.findUnique({
      where: { rut: rutLimpio },
    });

    if (!cliente) {
      return mensajeGenerico;
    }

    if (!cliente.email) {
      await this.prisma.intento_fallido.create({
        data: {
          rut_intentado: rutLimpio,
          ip_address: ip ?? '0.0.0.0',
          id_empresa: cliente.id_empresa ?? undefined,
        },
      });
      return mensajeGenerico;
    }

    try {
      const payload = { sub: cliente.id_cliente, type: 'reset' };
      const token = await this.jwtService.signAsync(payload, {
        expiresIn: '15m',
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const link = `${frontendUrl}/restablecer-password?token=${token}`;

      try {
        await this.mailService.sendPasswordReset(
          cliente.email,
          cliente.nombre_completo,
          link,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send password reset email to ${cliente.email}`,
          error,
        );
      }

      return mensajeGenerico;
    } catch {
      return mensajeGenerico;
    }
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

    const cliente = await this.prisma.cliente.update({
      where: { id_cliente: payload.sub },
      data: { password_portal_hash: passwordHash },
    });

    await this.invalidarSesionesAnteriores(payload.sub);

    if (cliente.email) {
      try {
        await this.mailService.sendPasswordChanged(
          cliente.email,
          cliente.nombre_completo,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send password changed email to ${cliente.email}`,
          error,
        );
      }
    }

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

    const ventanaRut = new Date(ahora.getTime() - 10 * 60 * 1000);
    const intentosRut = await this.prisma.intento_fallido.count({
      where: {
        rut_intentado: rutLimpio,
        timestamp: { gte: ventanaRut },
      },
    });

    const ventanaIp = new Date(ahora.getTime() - 5 * 60 * 1000);
    const intentosIp = await this.prisma.intento_fallido.count({
      where: {
        ip_address: ip,
        timestamp: { gte: ventanaIp },
      },
    });

    const bloquearRut = intentosRut + 1 >= 5;
    const bloquearIp = intentosIp + 1 >= 5;
    const bloquearHasta =
      bloquearRut || bloquearIp
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
