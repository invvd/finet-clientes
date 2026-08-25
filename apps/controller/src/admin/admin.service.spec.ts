import { jest, beforeEach, describe, it, expect } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';

const { AdminService } = await import('./admin.service.js');

describe('AdminService', () => {
  let adminService: InstanceType<typeof AdminService>;
  let mockPrisma: {
    intento_fallido: {
      findMany: jest.Mock;
      count: jest.Mock;
      updateMany: jest.Mock;
    };
    log_auditoria: {
      create: jest.Mock;
    };
    pago: {
      findMany: jest.Mock;
    };
    factura: {
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    mockPrisma = {
      intento_fallido: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      log_auditoria: {
        create: jest.fn().mockResolvedValue({}),
      },
      pago: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      factura: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    adminService = module.get(AdminService);
  });

  describe('getIntentosFallidos', () => {
    it('return paginated results with default query', async () => {
      const mockData = [
        {
          id_intento: 1n,
          rut_intentado: '123456785',
          ip_address: '192.168.1.1',
          timestamp: new Date('2026-06-01T10:00:00Z'),
          bloqueado_hasta: null,
        },
      ];
      mockPrisma.intento_fallido.findMany.mockResolvedValue(mockData);
      mockPrisma.intento_fallido.count.mockResolvedValue(1);

      const result = await adminService.getIntentosFallidos({
        page: 1,
        limit: 20,
      });

      expect(result).toEqual({ data: mockData, total: 1, page: 1, limit: 20 });
      expect(mockPrisma.intento_fallido.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { timestamp: 'desc' },
        skip: 0,
        take: 20,
        select: {
          id_intento: true,
          rut_intentado: true,
          ip_address: true,
          timestamp: true,
          bloqueado_hasta: true,
        },
      });
    });

    it('filter by RUT', async () => {
      await adminService.getIntentosFallidos({
        rut: '123456785',
        page: 1,
        limit: 20,
      });

      const where = (mockPrisma.intento_fallido.findMany as jest.Mock).mock
        .calls[0][0].where;
      expect(where.rut_intentado).toBe('123456785');
    });

    it('filter by IP', async () => {
      await adminService.getIntentosFallidos({
        ip: '10.0.0.1',
        page: 1,
        limit: 20,
      });

      const where = (mockPrisma.intento_fallido.findMany as jest.Mock).mock
        .calls[0][0].where;
      expect(where.ip_address).toBe('10.0.0.1');
    });

    it('filter by bloqueados=true', async () => {
      await adminService.getIntentosFallidos({
        bloqueados: 'true',
        page: 1,
        limit: 20,
      });

      const where = (mockPrisma.intento_fallido.findMany as jest.Mock).mock
        .calls[0][0].where;
      expect(where.bloqueado_hasta).toEqual({
        gt: expect.any(Date),
      });
    });

    it('filter by bloqueados=false', async () => {
      await adminService.getIntentosFallidos({
        bloqueados: 'false',
        page: 1,
        limit: 20,
      });

      const where = (mockPrisma.intento_fallido.findMany as jest.Mock).mock
        .calls[0][0].where;
      expect(where.OR).toHaveLength(2);
    });

    it('filter by date range', async () => {
      await adminService.getIntentosFallidos({
        desde: '2026-06-01',
        hasta: '2026-06-02',
        page: 1,
        limit: 20,
      });

      const where = (mockPrisma.intento_fallido.findMany as jest.Mock).mock
        .calls[0][0].where;
      expect(where.timestamp).toBeDefined();
    });

    it('apply pagination with custom page and limit', async () => {
      await adminService.getIntentosFallidos({
        page: 3,
        limit: 10,
      });

      const call = (mockPrisma.intento_fallido.findMany as jest.Mock).mock
        .calls[0][0];
      expect(call.skip).toBe(20);
      expect(call.take).toBe(10);
    });

    it('return empty data when no records', async () => {
      const result = await adminService.getIntentosFallidos({
        page: 1,
        limit: 20,
      });

      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      });
    });
  });

  describe('desbloquearIp', () => {
    it('unblock IP and register in audit log', async () => {
      mockPrisma.intento_fallido.updateMany.mockResolvedValue({ count: 3 });

      const result = await adminService.desbloquearIp('192.168.1.50');

      expect(result).toEqual({
        desbloqueado: true,
        registros_afectados: 3,
      });

      expect(mockPrisma.intento_fallido.updateMany).toHaveBeenCalledWith({
        where: {
          ip_address: '192.168.1.50',
          bloqueado_hasta: { gt: expect.any(Date) },
        },
        data: { bloqueado_hasta: null },
      });

      expect(mockPrisma.log_auditoria.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accion: 'DESBLOQUEAR_IP',
          entidad_afectada: 'intento_fallido',
          ip_origen: '192.168.1.50',
        }),
      });
    });

    it('return desbloqueado=false when no active blocks for IP', async () => {
      mockPrisma.intento_fallido.updateMany.mockResolvedValue({ count: 0 });

      const result = await adminService.desbloquearIp('10.0.0.1');

      expect(result).toEqual({
        desbloqueado: false,
        registros_afectados: 0,
      });

      expect(mockPrisma.log_auditoria.create).toHaveBeenCalled();
    });
  });

  describe('getIntentosFallidos (modo resumen — CU-06)', () => {
    it('agrupa por IP con conteo de intentos y estado de bloqueo', async () => {
      const ahora = new Date();
      const futuro = new Date(ahora.getTime() + 600_000);
      const mockData = [
        {
          ip_address: '192.168.1.10',
          bloqueado_hasta: null,
          timestamp: new Date('2026-06-01T10:00:00Z'),
        },
        {
          ip_address: '192.168.1.10',
          bloqueado_hasta: null,
          timestamp: new Date('2026-06-01T11:00:00Z'),
        },
        {
          ip_address: '192.168.1.10',
          bloqueado_hasta: futuro,
          timestamp: new Date('2026-06-01T12:00:00Z'),
        },
        {
          ip_address: '10.0.0.50',
          bloqueado_hasta: null,
          timestamp: new Date('2026-06-01T09:00:00Z'),
        },
      ];
      mockPrisma.intento_fallido.findMany.mockResolvedValue(mockData);

      const result = await adminService.getIntentosFallidos({
        resumen: 'true',
        page: 1,
        limit: 20,
      });

      expect(result.total).toBe(2);
      expect(Array.isArray(result.data)).toBe(true);

      const ip10 = result.data.find(
        (r: { ip: string }) => r.ip === '192.168.1.10',
      );
      expect(ip10).toBeDefined();
      expect(ip10.total_intentos).toBe(3);
      expect(ip10.bloqueos_activos).toBe(1);
      expect(ip10.bloqueado).toBe(true);

      const ip50 = result.data.find(
        (r: { ip: string }) => r.ip === '10.0.0.50',
      );
      expect(ip50).toBeDefined();
      expect(ip50.total_intentos).toBe(1);
      expect(ip50.bloqueos_activos).toBe(0);
      expect(ip50.bloqueado).toBe(false);
      expect(ip50.bloqueado_hasta).toBeNull();
    });

    it('resumen respeta filtros (RUT, bloqueados, fechas)', async () => {
      mockPrisma.intento_fallido.findMany.mockResolvedValue([]);

      await adminService.getIntentosFallidos({
        resumen: 'true',
        rut: '123456785',
        bloqueados: 'true',
        desde: '2026-06-01',
        page: 1,
        limit: 20,
      });

      const where = (mockPrisma.intento_fallido.findMany as jest.Mock).mock
        .calls[0][0].where;
      expect(where.rut_intentado).toBe('123456785');
      expect(where.bloqueado_hasta).toEqual({ gt: expect.any(Date) });
      expect(where.timestamp).toBeDefined();
    });

    it('resumen pagina correctamente sobre datos agrupados en memoria', async () => {
      const mockData = Array.from({ length: 10 }, (_, i) => ({
        ip_address: `10.0.0.${i + 1}`,
        bloqueado_hasta: null,
        timestamp: new Date(`2026-06-01T${String(i).padStart(2, '0')}:00:00Z`),
      }));
      mockPrisma.intento_fallido.findMany.mockResolvedValue(mockData);

      const result = await adminService.getIntentosFallidos({
        resumen: 'true',
        page: 1,
        limit: 3,
      });

      expect(result.total).toBe(10);
      expect(result.data).toHaveLength(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(3);
    });

    it('resumen retorna data vacía cuando no hay registros', async () => {
      mockPrisma.intento_fallido.findMany.mockResolvedValue([]);

      const result = await adminService.getIntentosFallidos({
        resumen: 'true',
        page: 1,
        limit: 20,
      });

      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      });
    });
  });

  describe('reportes financieros (CU-57/CU-58)', () => {
    const query = { desde: '2026-08-01', hasta: '2026-08-31' };

    beforeEach(() => {
      mockPrisma.pago.findMany.mockResolvedValue([
        {
          id_pago: 1,
          fecha_pago: new Date('2026-08-10T12:00:00.000Z'),
          monto: 25000,
          pasarela: 'webpay',
          cliente: { nombre_completo: 'Juan Perez' },
        },
      ]);
      mockPrisma.factura.findMany.mockResolvedValue([
        {
          id_factura: 9,
          periodo_mes: 8,
          periodo_anio: 2026,
          monto: 12000,
          fecha_emision: new Date('2026-08-01T00:00:00.000Z'),
          fecha_limite_pago: new Date('2026-08-15T00:00:00.000Z'),
          estado: 'pendiente',
          contrato: { cliente: { nombre_completo: 'Ana Perez' } },
        },
      ]);
    });

    it('consolida ingresos y deudas del periodo', async () => {
      const result = await adminService.getReporteFinanciero(query);

      expect(result.resumen).toEqual({
        total_ingresos: 25000,
        total_deudas: 12000,
        cantidad_pagos: 1,
        cantidad_facturas_pendientes: 1,
      });
      expect(result.ingresos[0].cliente).toBe('Juan Perez');
      expect(result.deudas[0].cliente).toBe('Ana Perez');
      expect(mockPrisma.log_auditoria.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accion: 'GENERAR_REPORTE_FINANCIERO',
        }),
      });
    });

    it('informa cuando el periodo no contiene datos', async () => {
      mockPrisma.pago.findMany.mockResolvedValue([]);
      mockPrisma.factura.findMany.mockResolvedValue([]);

      await expect(adminService.getReporteFinanciero(query)).rejects.toThrow(
        'No existen datos financieros',
      );
    });

    it('genera CSV y registra su descarga', async () => {
      const archivo = await adminService.descargarReporteFinanciero(query);

      expect(archivo.nombre).toBe(
        'reporte-financiero-2026-08-01-2026-08-31.csv',
      );
      expect(archivo.contenido).toContain('"Ingreso"');
      expect(archivo.contenido).toContain('"Deuda"');
      expect(mockPrisma.log_auditoria.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accion: 'DESCARGAR_REPORTE_FINANCIERO',
        }),
      });
    });

    it('neutraliza formulas al construir el CSV', async () => {
      mockPrisma.pago.findMany.mockResolvedValue([
        {
          id_pago: 1,
          fecha_pago: new Date('2026-08-10T12:00:00.000Z'),
          monto: 25000,
          pasarela: '=CMD()',
          cliente: { nombre_completo: 'Juan Perez' },
        },
      ]);
      mockPrisma.factura.findMany.mockResolvedValue([]);

      const archivo = await adminService.descargarReporteFinanciero(query);

      expect(archivo.contenido).toContain("'=CMD()");
    });
  });
});
