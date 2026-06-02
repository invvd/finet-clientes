import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service.js';

interface JwtPayload {
  sub: number;
  rut: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'fallback-secret',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const token =
      req.headers.authorization?.replace('Bearer ', '') ||
      (req.cookies as Record<string, string> | undefined)?.access_token;

    if (token) {
      const session = await this.prisma.sesion_portal.findFirst({
        where: {
          token,
          fecha_expiracion: { gt: new Date() },
        },
      });

      if (!session) {
        throw new UnauthorizedException('Sesión expirada por inactividad');
      }

      const timeout = parseInt(
        process.env.SESSION_INACTIVITY_MINUTES ?? '15',
        10,
      );
      const nuevaExpiracion = new Date();
      nuevaExpiracion.setMinutes(nuevaExpiracion.getMinutes() + timeout);

      await this.prisma.sesion_portal.updateMany({
        where: { token },
        data: { fecha_expiracion: nuevaExpiracion },
      });
    }

    const cliente = await this.prisma.cliente.findUnique({
      where: { id_cliente: payload.sub },
      select: {
        id_cliente: true,
        rut: true,
        nombre_completo: true,
        email: true,
        telefono: true,
        estado: true,
      },
    });

    if (!cliente) {
      throw new UnauthorizedException('Cliente no encontrado');
    }

    return cliente;
  }
}
