import { jest, beforeEach, describe, it, expect } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { DeudaPublicaService } from './deuda-publica.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('DeudaPublicaService', () => {
  let service: DeudaPublicaService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrisma = {
      cliente: { findUnique: jest.fn() },
      contrato: { findUnique: jest.fn() },
      factura: { findMany: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeudaPublicaService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(DeudaPublicaService);
    prisma = module.get(PrismaService);
  });

  it('retorna encontrado:false si el RUT no existe', async () => {
    (prisma.cliente.findUnique as jest.Mock).mockResolvedValue(null);
    const r = await service.consultarPorRut('12.345.678-9');
    expect(r.encontrado).toBe(false);
    expect(r.cliente).toBeNull();
  });

  it('retorna tiene_deuda:false cuando no hay facturas pendientes', async () => {
    (prisma.cliente.findUnique as jest.Mock).mockResolvedValue({
      id_cliente: 1,
      nombre_completo: 'Juan Pérez',
      rut: '12345678-9',
      contrato: [{ id_contrato: 100 }],
    });
    (prisma.factura.findMany as jest.Mock).mockResolvedValue([]);
    const r = await service.consultarPorRut('12.345.678-9');
    expect(r.encontrado).toBe(true);
    expect(r.tiene_deuda).toBe(false);
    expect(r.saldo_total).toBe(0);
    expect(r.facturas).toHaveLength(0);
  });

  it('calcula dias_vencida cuando la factura está vencida', async () => {
    const ayer = new Date(Date.now() - 86_400_000 * 3);
    (prisma.cliente.findUnique as jest.Mock).mockResolvedValue({
      id_cliente: 1,
      nombre_completo: 'Juan',
      rut: '12345678-9',
      contrato: [{ id_contrato: 100 }],
    });
    (prisma.factura.findMany as jest.Mock).mockResolvedValue([
      {
        id_factura: 1, periodo_mes: 4, periodo_anio: 2026,
        monto: 23890, fecha_limite_pago: ayer, estado: 'vencida',
      },
    ]);
    const r = await service.consultarPorRut('12.345.678-9');
    expect(r.facturas[0].dias_vencida).toBeGreaterThanOrEqual(2);
    expect(r.facturas[0].dias_para_vencer).toBeNull();
  });

  it('calcula dias_para_vencer cuando la factura está pendiente', async () => {
    const futuro = new Date(Date.now() + 86_400_000 * 5);
    (prisma.cliente.findUnique as jest.Mock).mockResolvedValue({
      id_cliente: 1,
      nombre_completo: 'Juan',
      rut: '12345678-9',
      contrato: [{ id_contrato: 100 }],
    });
    (prisma.factura.findMany as jest.Mock).mockResolvedValue([
      {
        id_factura: 2, periodo_mes: 5, periodo_anio: 2026,
        monto: 23890, fecha_limite_pago: futuro, estado: 'pendiente',
      },
    ]);
    const r = await service.consultarPorRut('12.345.678-9');
    expect(r.facturas[0].dias_para_vencer).toBeGreaterThanOrEqual(4);
    expect(r.facturas[0].dias_vencida).toBeNull();
  });

  it('consultarPorAbonado retorna deuda cuando el contrato existe', async () => {
    (prisma.contrato.findUnique as jest.Mock).mockResolvedValue({
      id_contrato: 100,
      cliente: { nombre_completo: 'Juan Pérez', rut: '12345678-9' },
    });
    (prisma.factura.findMany as jest.Mock).mockResolvedValue([]);
    const r = await service.consultarPorAbonado(100);
    expect(r.encontrado).toBe(true);
    expect(r.cliente?.codigo_abonado).toBe(100);
  });

  it('consultarPorAbonado retorna encontrado:false si el contrato no existe', async () => {
    (prisma.contrato.findUnique as jest.Mock).mockResolvedValue(null);
    const r = await service.consultarPorAbonado(99999);
    expect(r.encontrado).toBe(false);
  });
});
