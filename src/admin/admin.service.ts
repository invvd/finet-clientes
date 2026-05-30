import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { cleanRut } from '../common/utils/rut.js';
import type { IntentosFallidosQueryDto } from './dto/intentos-fallidos.dto.js';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getIntentosFallidos(query: IntentosFallidosQueryDto) {
    const { rut, bloqueados, desde, hasta, page, limit } = query;

    const where: Record<string, unknown> = {};

    if (rut) {
      where.rut_intentado = cleanRut(rut);
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
}
