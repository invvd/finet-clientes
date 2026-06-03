import { jest, beforeEach, describe, it, expect } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PortalService } from './portal.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const FECHA_BASE = new Date('2024-01-15T00:00:00.000Z');
const PLAN_MOCK = {
  id_plan: 1,
  nombre_comercial: 'Fibra 200',
  tipo_plan: 'residencial',
  velocidad_mbps: 200,
  precio_mensual: 25000,
};
const CONTRATO_MOCK = {
  id_contrato: 1,
  estado: 'activo',
  fecha_inicio: FECHA_BASE,
  fecha_suspension: null,
  dia_vencimiento: 15,
  plan: PLAN_MOCK,
};
const CLIENTE_MOCK = {
  id_cliente: 1,
  nombre_completo: 'Juan Pérez',
  rut: '12.345.678-9',
  email: 'juan@example.com',
  telefono: '+56912345678',
};

describe('PortalService', () => {
  let service: PortalService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrisma = {
      contrato: { findMany: jest.fn() },
      cliente: { findUnique: jest.fn() },
      factura: { findMany: jest.fn() },
      ticket: { findMany: jest.fn() },
      log_auditoria: { create: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortalService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(PortalService);
    prisma = module.get(PrismaService);
  });

  // ─── CU-23: getEstadoContratos ────────────────────────────────────────────

  describe('getEstadoContratos', () => {
    it('retorna contratos con estado y fechas formateadas', async () => {
      (prisma.contrato.findMany as jest.Mock).mockResolvedValue([
        CONTRATO_MOCK,
      ]);
      (prisma.log_auditoria.create as jest.Mock).mockResolvedValue({});

      const result = await service.getEstadoContratos(1);

      expect(result).toHaveLength(1);
      expect(result[0].id_contrato).toBe(1);
      expect(result[0].estado).toBe('activo');
      expect(result[0].fecha_inicio).toBe('2024-01-15');
      expect(result[0].fecha_suspension).toBeNull();
    });

    it('lanza NotFoundException si el cliente no tiene contratos', async () => {
      (prisma.contrato.findMany as jest.Mock).mockResolvedValue([]);

      await expect(service.getEstadoContratos(99)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('registra en log_auditoria si el estado no es reconocido (CU-23 Excepción 3)', async () => {
      const contratoInvalido = { ...CONTRATO_MOCK, estado: 'cortado' };
      (prisma.contrato.findMany as jest.Mock).mockResolvedValue([
        contratoInvalido,
      ]);
      (prisma.log_auditoria.create as jest.Mock).mockResolvedValue({});

      await service.getEstadoContratos(1);

      expect(prisma.log_auditoria.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accion: 'ESTADO_CONTRATO_INVALIDO',
          entidad_afectada: 'contrato',
          id_entidad_afectada: 1,
          valor_anterior: { estado: 'cortado' },
        }),
      });
    });
  });

  // ─── CU-25 / CU-26: getContratosVigentes ─────────────────────────────────

  describe('getContratosVigentes', () => {
    it('retorna contratos activos con datos del plan (precio como number)', async () => {
      (prisma.contrato.findMany as jest.Mock).mockResolvedValue([
        CONTRATO_MOCK,
      ]);

      const result = await service.getContratosVigentes(1);

      expect(result).toHaveLength(1);
      expect(result[0].plan?.nombre_comercial).toBe('Fibra 200');
      expect(typeof result[0].plan?.precio_mensual).toBe('number');
      expect(result[0].plan?.precio_mensual).toBe(25000);
    });

    it('retorna array vacío si no hay contratos vigentes (sin error)', async () => {
      (prisma.contrato.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getContratosVigentes(1);

      expect(result).toEqual([]);
    });
  });

  // ─── CU-27 / CU-28: getResumenDeuda ──────────────────────────────────────

  describe('getResumenDeuda', () => {
    it('retorna tiene_deuda:false y saldo_total:0 cuando no hay facturas pendientes', async () => {
      (prisma.contrato.findMany as jest.Mock).mockResolvedValue([
        { id_contrato: 1 },
      ]);
      (prisma.factura.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getResumenDeuda(1);

      expect(result.tiene_deuda).toBe(false);
      expect(result.saldo_total).toBe(0);
      expect(result.facturas_pendientes).toHaveLength(0);
    });

    it('retorna tiene_deuda:true con dias_vencida calculados para facturas vencidas', async () => {
      const hace3dias = new Date(Date.now() - 86_400_000 * 3);
      (prisma.contrato.findMany as jest.Mock).mockResolvedValue([
        { id_contrato: 1 },
      ]);
      (prisma.factura.findMany as jest.Mock).mockResolvedValue([
        {
          id_factura: 10,
          periodo_mes: 4,
          periodo_anio: 2026,
          monto: 23890,
          fecha_limite_pago: hace3dias,
          estado: 'vencida',
        },
      ]);

      const result = await service.getResumenDeuda(1);

      expect(result.tiene_deuda).toBe(true);
      expect(result.saldo_total).toBe(23890);
      expect(result.facturas_pendientes[0].dias_vencida).toBeGreaterThanOrEqual(
        2,
      );
      expect(result.facturas_pendientes[0].periodo).toBe('Abril 2026');
    });

    it('lanza InternalServerErrorException si saldo_total es negativo (CU-27 Excepción 3)', async () => {
      (prisma.contrato.findMany as jest.Mock).mockResolvedValue([
        { id_contrato: 1 },
      ]);
      (prisma.factura.findMany as jest.Mock).mockResolvedValue([
        {
          id_factura: 11,
          periodo_mes: 5,
          periodo_anio: 2026,
          monto: -5000,
          fecha_limite_pago: new Date(),
          estado: 'pendiente',
        },
      ]);

      await expect(service.getResumenDeuda(1)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ─── CU-29 / CU-30: getTickets ───────────────────────────────────────────

  describe('getTickets', () => {
    it('retorna tiene_tickets:false cuando no hay tickets registrados', async () => {
      (prisma.ticket.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getTickets(1);

      expect(result.tiene_tickets).toBe(false);
      expect(result.total).toBe(0);
      expect(result.tickets).toHaveLength(0);
    });

    it('retorna tickets con categoria de categoria_falla.nombre, respetando el límite', async () => {
      const ticketsMock = Array.from({ length: 5 }, (_, i) => ({
        id_ticket: i + 1,
        codigo_seguimiento: `TK-2026-00${i + 1}`,
        estado: 'abierto',
        prioridad: 'media',
        descripcion: `Ticket ${i + 1}`,
        fecha_creacion: FECHA_BASE,
        fecha_cierre: null,
        categoria_falla: { nombre: 'Conectividad' },
        origen: 'portal',
      }));
      (prisma.ticket.findMany as jest.Mock).mockResolvedValue(
        ticketsMock.slice(0, 3),
      );

      const result = await service.getTickets(1, 3);

      expect(result.tiene_tickets).toBe(true);
      expect(result.total).toBe(3);
      expect(result.tickets[0].categoria).toBe('Conectividad');
    });
  });

  // ─── CU-24: getPanelPrincipal ─────────────────────────────────────────────

  describe('getPanelPrincipal', () => {
    it('agrega cliente, contratos, deuda y tickets en la estructura PanelPrincipalDto', async () => {
      (prisma.cliente.findUnique as jest.Mock).mockResolvedValue(CLIENTE_MOCK);
      // getContratosVigentes y getResumenDeuda llaman a contrato.findMany
      (prisma.contrato.findMany as jest.Mock).mockResolvedValue([
        CONTRATO_MOCK,
      ]);
      (prisma.factura.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.ticket.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.log_auditoria.create as jest.Mock).mockResolvedValue({});

      const result = await service.getPanelPrincipal(1);

      expect(result.cliente.id_cliente).toBe(1);
      expect(result.cliente.nombre_completo).toBe('Juan Pérez');
      expect(result.contratos).toHaveLength(1);
      expect(result.resumen_deuda.tiene_deuda).toBe(false);
      expect(result.tickets_recientes).toHaveLength(0);
    });

    it('lanza NotFoundException si el cliente no existe', async () => {
      (prisma.cliente.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getPanelPrincipal(99)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza mensaje amigable si una sub-consulta falla (CU-24 Excepción 2)', async () => {
      (prisma.cliente.findUnique as jest.Mock).mockResolvedValue(CLIENTE_MOCK);
      (prisma.contrato.findMany as jest.Mock).mockRejectedValue(
        new Error('DB connection lost'),
      );

      await expect(service.getPanelPrincipal(1)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.getPanelPrincipal(1)).rejects.toThrow(
        'El portal no está disponible temporalmente',
      );
    });
  });
});
