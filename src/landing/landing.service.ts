import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PlanResponseDto } from './dto/landing.dto.js';

@Injectable()
export class LandingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * CU-42: Catalogo de planes publico para la landing page.
   * Devuelve todos los planes activos, opcionalmente filtrados por tipo_cliente.
   * Endpoint publico — no requiere autenticacion.
   */
  async getPlanes(tipoCliente?: string): Promise<PlanResponseDto[]> {
    const planes = await this.prisma.plan.findMany({
      where: {
        activo: true,
        ...(tipoCliente ? { tipo_cliente: tipoCliente } : {}),
      },
      orderBy: { precio_mensual: 'asc' },
    });

    return planes.map((p) => ({
      id_plan: p.id_plan,
      nombre_comercial: p.nombre_comercial,
      tipo_plan: p.tipo_plan,
      tipo_cliente: p.tipo_cliente,
      velocidad_mbps: p.velocidad_mbps,
      precio_mensual: Number(p.precio_mensual),
      descripcion: p.descripcion,
    }));
  }
}
