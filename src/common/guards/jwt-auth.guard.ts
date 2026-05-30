import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Guard que valida la sesión activa del cliente en la tabla sesion_portal.
 * Se usa en todas las rutas del portal que requieren autenticación.
 * Relacionado con: CU-12 (cierre automático por inactividad).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    // Buscar sesión activa en la BD (CU-12: valida expiración)
    const sesion = await this.prisma.sesion_portal.findFirst({
      where: {
        token,
        fecha_expiracion: { gt: new Date() },
      },
      include: { cliente: true },
    });

    if (!sesion || !sesion.cliente) {
      throw new UnauthorizedException('Sesión inválida o expirada');
    }

    // Inyectar cliente en el request para uso en controllers/services
    (request as any).cliente = sesion.cliente;
    (request as any).sesion = sesion;
    return true;
  }

  private extractToken(request: Request): string | null {
    const authHeader = request.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    return null;
  }
}
