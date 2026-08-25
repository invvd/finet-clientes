import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { cleanRut } from '../common/utils/rut.js';
import type { IntentosFallidosQueryDto } from './dto/intentos-fallidos.dto.js';
import type {
  ReporteFinancieroDto,
  ReporteFinancieroQueryDto,
} from './dto/reporte-financiero.dto.js';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private prisma: PrismaService) {}

  async getIntentosFallidos(query: IntentosFallidosQueryDto) {
    const { rut, ip, bloqueados, resumen, desde, hasta, page, limit } = query;

    // CU-06: Modo resumen — agrupado por IP con conteo de intentos
    if (resumen === 'true') {
      return this.getIntentosFallidosResumen({
        rut,
        ip,
        bloqueados,
        desde,
        hasta,
        page,
        limit,
      });
    }

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

  async getReporteFinanciero(
    query: ReporteFinancieroQueryDto,
  ): Promise<ReporteFinancieroDto> {
    const reporte = await this.consolidarReporteFinanciero(query);

    await this.prisma.log_auditoria.create({
      data: {
        accion: 'GENERAR_REPORTE_FINANCIERO',
        entidad_afectada: 'reporte_financiero',
        valor_nuevo: {
          periodo: reporte.periodo,
          resumen: reporte.resumen,
        },
      },
    });

    return reporte;
  }

  async descargarReporteFinanciero(query: ReporteFinancieroQueryDto) {
    const reporte = await this.consolidarReporteFinanciero(query);
    const nombre = `reporte-financiero-${query.desde}-${query.hasta}.csv`;
    const contenido = this.crearCsvReporte(reporte);

    await this.prisma.log_auditoria.create({
      data: {
        accion: 'DESCARGAR_REPORTE_FINANCIERO',
        entidad_afectada: 'reporte_financiero',
        valor_nuevo: {
          periodo: reporte.periodo,
          nombre_archivo: nombre,
          formato: 'csv',
        },
      },
    });

    return { nombre, contenido };
  }

  /**
   * CU-06: Resumen de IPs bloqueadas agrupado por dirección IP
   * con conteo de intentos fallidos, última fecha y estado de bloqueo.
   */
  private async getIntentosFallidosResumen(query: {
    rut?: string;
    ip?: string;
    bloqueados?: string;
    desde?: string;
    hasta?: string;
    page: number;
    limit: number;
  }) {
    const where: Record<string, unknown> = {};

    if (query.rut) {
      where.rut_intentado = cleanRut(query.rut);
    }

    if (query.ip) {
      where.ip_address = query.ip;
    }

    if (query.bloqueados === 'true') {
      where.bloqueado_hasta = { gt: new Date() };
    } else if (query.bloqueados === 'false') {
      where.OR = [
        { bloqueado_hasta: null },
        { bloqueado_hasta: { lte: new Date() } },
      ];
    }

    if (query.desde) {
      const desdeDate = new Date(query.desde);
      desdeDate.setHours(0, 0, 0, 0);
      if (!where.timestamp) where.timestamp = {};
      (where.timestamp as Record<string, unknown>).gte = desdeDate;
    }

    if (query.hasta) {
      const hastaDate = new Date(query.hasta);
      hastaDate.setHours(23, 59, 59, 999);
      if (!where.timestamp) where.timestamp = {};
      (where.timestamp as Record<string, unknown>).lte = hastaDate;
    }

    const registros = await this.prisma.intento_fallido.findMany({
      where,
      select: {
        ip_address: true,
        bloqueado_hasta: true,
        timestamp: true,
      },
      orderBy: { timestamp: 'desc' },
    });

    // Agrupar por IP y calcular conteos
    const agrupados = new Map<
      string,
      {
        ip: string;
        total_intentos: number;
        bloqueos_activos: number;
        ultimo_intento: Date;
        bloqueado: boolean;
        bloqueado_hasta: Date | null;
      }
    >();

    const ahora = new Date();
    for (const r of registros) {
      const existente = agrupados.get(r.ip_address);
      if (existente) {
        existente.total_intentos++;
        if (r.bloqueado_hasta && r.bloqueado_hasta > ahora) {
          existente.bloqueos_activos++;
        }
        if (r.timestamp && r.timestamp > existente.ultimo_intento) {
          existente.ultimo_intento = r.timestamp;
        }
        // Mantener el bloqueo más lejano
        if (
          r.bloqueado_hasta &&
          r.bloqueado_hasta > ahora &&
          (!existente.bloqueado_hasta ||
            r.bloqueado_hasta > existente.bloqueado_hasta)
        ) {
          existente.bloqueado_hasta = r.bloqueado_hasta;
          existente.bloqueado = true;
        }
      } else {
        const bloqueado = r.bloqueado_hasta ? r.bloqueado_hasta > ahora : false;
        agrupados.set(r.ip_address, {
          ip: r.ip_address,
          total_intentos: 1,
          bloqueos_activos: bloqueado ? 1 : 0,
          ultimo_intento: r.timestamp ?? new Date(0),
          bloqueado,
          bloqueado_hasta: bloqueado ? r.bloqueado_hasta : null,
        });
      }
    }

    const data = Array.from(agrupados.values()).sort(
      (a, b) => b.ultimo_intento.getTime() - a.ultimo_intento.getTime(),
    );

    const total = data.length;
    const inicio = (query.page - 1) * query.limit;
    const pagina = data.slice(inicio, inicio + query.limit);

    return {
      data: pagina,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  private async consolidarReporteFinanciero(
    query: ReporteFinancieroQueryDto,
  ): Promise<ReporteFinancieroDto> {
    const desde = new Date(`${query.desde}T00:00:00.000Z`);
    const hasta = new Date(`${query.hasta}T23:59:59.999Z`);

    const [pagos, facturas] = await Promise.all([
      this.prisma.pago.findMany({
        where: { fecha_pago: { gte: desde, lte: hasta } },
        select: {
          id_pago: true,
          fecha_pago: true,
          monto: true,
          pasarela: true,
          cliente: { select: { nombre_completo: true } },
        },
        orderBy: { fecha_pago: 'asc' },
      }),
      this.prisma.factura.findMany({
        where: {
          fecha_emision: { gte: desde, lte: hasta },
          estado: { in: ['pendiente', 'vencida'] },
        },
        select: {
          id_factura: true,
          periodo_mes: true,
          periodo_anio: true,
          monto: true,
          fecha_emision: true,
          fecha_limite_pago: true,
          estado: true,
          contrato: {
            select: {
              cliente: { select: { nombre_completo: true } },
            },
          },
        },
        orderBy: { fecha_emision: 'asc' },
      }),
    ]);

    if (pagos.length === 0 && facturas.length === 0) {
      throw new NotFoundException(
        'No existen datos financieros para el periodo seleccionado',
      );
    }

    const ingresos = pagos.map((pago) => ({
      id_pago: pago.id_pago,
      fecha_pago: pago.fecha_pago.toISOString(),
      monto: Number(pago.monto),
      pasarela: pago.pasarela,
      cliente: pago.cliente?.nombre_completo ?? null,
    }));
    const deudas = facturas.map((factura) => ({
      id_factura: factura.id_factura,
      periodo: `${String(factura.periodo_mes).padStart(2, '0')}-${factura.periodo_anio}`,
      fecha_emision: factura.fecha_emision?.toISOString() ?? null,
      fecha_limite_pago: factura.fecha_limite_pago.toISOString(),
      monto: Number(factura.monto ?? 0),
      estado: factura.estado,
      cliente: factura.contrato?.cliente?.nombre_completo ?? null,
    }));

    return {
      periodo: { desde: query.desde, hasta: query.hasta },
      generado_en: new Date().toISOString(),
      resumen: {
        total_ingresos: ingresos.reduce((total, pago) => total + pago.monto, 0),
        total_deudas: deudas.reduce(
          (total, factura) => total + factura.monto,
          0,
        ),
        cantidad_pagos: ingresos.length,
        cantidad_facturas_pendientes: deudas.length,
      },
      ingresos,
      deudas,
    };
  }

  private crearCsvReporte(reporte: ReporteFinancieroDto): string {
    const filas: Array<Array<string | number>> = [
      ['Tipo', 'Fecha', 'Documento', 'Cliente', 'Concepto', 'Estado', 'Monto'],
      ...reporte.ingresos.map((pago) => [
        'Ingreso',
        pago.fecha_pago,
        `Pago ${pago.id_pago}`,
        pago.cliente ?? '',
        pago.pasarela,
        'pagado',
        pago.monto,
      ]),
      ...reporte.deudas.map((factura) => [
        'Deuda',
        factura.fecha_emision ?? '',
        `Factura ${factura.id_factura}`,
        factura.cliente ?? '',
        factura.periodo,
        factura.estado,
        factura.monto,
      ]),
    ];

    return `\uFEFF${filas
      .map((fila) => fila.map((valor) => this.escaparCsv(valor)).join(','))
      .join('\r\n')}`;
  }

  private escaparCsv(valor: string | number): string {
    let texto = String(valor);
    if (/^[=+\-@]/.test(texto)) texto = `'${texto}`;
    return `"${texto.replaceAll('"', '""')}"`;
  }
}
