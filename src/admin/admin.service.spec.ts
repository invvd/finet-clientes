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
});
