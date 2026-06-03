import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { cleanRut } from '../common/utils/rut.js';
import type { IntentosFallidosQueryDto } from './dto/intentos-fallidos.dto.js';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private prisma: PrismaService) {}

  async getIntentosFallidos(query: IntentosFallidosQueryDto) {
    const { rut, ip, bloqueados, desde, hasta, page, limit } = query;

    const where: Record<string, unknown> = {};

    if (rut) {
      where.rut_intentado = cleanRut(rut);
    }

    if (ip) {
      where.ip_address = ip;
    }

    if (bloqueados === 'true') {
      where.bloqueado_hasta = { gt: new Date() };
    } else if (bloqueados === 'false') {
      where.OR = [
        { bloqueado_hasta: null },
        { bloqueado_hasta: { lte: new Date() } },
      ];
    }

    if (desde) {
      const desdeDate = new Date(desde);
      desdeDate.setHours(0, 0, 0, 0);
      if (!where.timestamp) where.timestamp = {};
      (where.timestamp as Record<string, unknown>).gte = desdeDate;
    }

    if (hasta) {
      const hastaDate = new Date(hasta);
      hastaDate.setHours(23, 59, 59, 999);
      if (!where.timestamp) where.timestamp = {};
      (where.timestamp as Record<string, unknown>).lte = hastaDate;
    }

    const [data, total] = await Promise.all([
      this.prisma.intento_fallido.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id_intento: true,
          rut_intentado: true,
          ip_address: true,
          timestamp: true,
          bloqueado_hasta: true,
        },
      }),
      this.prisma.intento_fallido.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async desbloquearIp(ip: string) {
    const result = await this.prisma.intento_fallido.updateMany({
      where: {
        ip_address: ip,
        bloqueado_hasta: { gt: new Date() },
      },
      data: {
        bloqueado_hasta: null,
      },
    });

    await this.prisma.log_auditoria.create({
      data: {
        accion: 'DESBLOQUEAR_IP',
        entidad_afectada: 'intento_fallido',
        ip_origen: ip,
        valor_anterior: { bloqueado_hasta: 'activo' },
        valor_nuevo: { desbloqueado: true, registros_afectados: result.count },
      },
    });

    this.logger.log(
      `IP ${ip} desbloqueada — ${result.count} registros afectados`,
    );

    return {
      desbloqueado: result.count > 0,
      registros_afectados: result.count,
    };
  }
}
