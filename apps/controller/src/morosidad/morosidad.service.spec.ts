import { jest, beforeEach, describe, it, expect } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const { MorosidadService } = await import('./morosidad.service.js');

/**
 * Fecha a N días de hoy, a medianoche UTC — igual que `MorosidadService.hoy()`.
 *
 * Se usa UTC y no `setHours(0,0,0,0)` porque Prisma devuelve las columnas `@db.Date` como
 * medianoche UTC: normalizar a medianoche local retrocedería un día en Chile (UTC-4).
 */
function diasDesdeHoy(dias: number): Date {
  const ahora = new Date();
  return new Date(
    Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + dias),
  );
}

/** Fila tal como la devuelve Prisma: umbral_suspension es Decimal, no number. */
const filaConfig = {
  id_configuracion: 1,
  id_empresa: 1,
  dias_gracia: 5,
  umbral_suspension: { toString: () => '15000.00' },
  fecha_actualizacion: new Date('2026-08-23T12:00:00Z'),
};

describe('MorosidadService', () => {
  let morosidadService: InstanceType<typeof MorosidadService>;
  let mockPrisma: {
    configuracion_morosidad: {
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    factura: {
      findMany: jest.Mock;
      groupBy: jest.Mock;
    };
    contrato: {
      updateMany: jest.Mock;
      count: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
    log_auditoria: {
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    mockPrisma = {
      configuracion_morosidad: {
        findFirst: jest.fn().mockResolvedValue(filaConfig),
        update: jest.fn().mockResolvedValue(filaConfig),
      },
      factura: {
        findMany: jest.fn().mockResolvedValue([]),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      contrato: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      log_auditoria: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        MorosidadService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    morosidadService = module.get(MorosidadService);
  });

  describe('obtenerConfiguracion (CU-80)', () => {
    it('return current parameters with Decimal serialized as number', async () => {
      const result = await morosidadService.obtenerConfiguracion();

      expect(result).toEqual({
        dias_gracia: 5,
        umbral_suspension: 15000,
        fecha_actualizacion: '2026-08-23T12:00:00.000Z',
      });
      expect(typeof result.umbral_suspension).toBe('number');
    });

    it('return null fecha_actualizacion when the row has none', async () => {
      mockPrisma.configuracion_morosidad.findFirst.mockResolvedValue({
        ...filaConfig,
        fecha_actualizacion: null,
      });

      const result = await morosidadService.obtenerConfiguracion();

      expect(result.fecha_actualizacion).toBeNull();
    });

    it('throw NotFound when no configuration row exists', async () => {
      mockPrisma.configuracion_morosidad.findFirst.mockResolvedValue(null);

      await expect(morosidadService.obtenerConfiguracion()).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('actualizarConfiguracion (CU-80)', () => {
    const nuevosValores = { dias_gracia: 10, umbral_suspension: 20000 };
    const filaActualizada = {
      ...filaConfig,
      dias_gracia: 10,
      umbral_suspension: { toString: () => '20000.00' },
    };

    it('persist the new values and return the updated configuration', async () => {
      mockPrisma.configuracion_morosidad.update.mockResolvedValue(
        filaActualizada,
      );

      const result =
        await morosidadService.actualizarConfiguracion(nuevosValores);

      expect(mockPrisma.configuracion_morosidad.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id_configuracion: 1 },
          data: expect.objectContaining({
            dias_gracia: 10,
            umbral_suspension: 20000,
          }),
        }),
      );
      expect(result).toEqual({
        dias_gracia: 10,
        umbral_suspension: 20000,
        fecha_actualizacion: '2026-08-23T12:00:00.000Z',
      });
    });

    // CU-80 poscondición: el cambio queda registrado en la bitácora con marca de tiempo.
    it('record the change in log_auditoria with previous and new values', async () => {
      mockPrisma.configuracion_morosidad.update.mockResolvedValue(
        filaActualizada,
      );

      await morosidadService.actualizarConfiguracion(nuevosValores);

      expect(mockPrisma.log_auditoria.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accion: 'ACTUALIZAR_CONFIG_MOROSIDAD',
          entidad_afectada: 'configuracion_morosidad',
          id_entidad_afectada: 1,
          valor_anterior: { dias_gracia: 5, umbral_suspension: 15000 },
          valor_nuevo: { dias_gracia: 10, umbral_suspension: 20000 },
        }),
      });
    });

    // Los parámetros ya quedaron guardados: un fallo de auditoría no debe convertirse en un
    // 500 que haga creer al administrador que el cambio no se aplicó.
    it('still succeed when writing the audit log fails', async () => {
      mockPrisma.configuracion_morosidad.update.mockResolvedValue(
        filaActualizada,
      );
      mockPrisma.log_auditoria.create.mockRejectedValue(
        new Error('audit table down'),
      );

      const result =
        await morosidadService.actualizarConfiguracion(nuevosValores);

      expect(result).toEqual({
        dias_gracia: 10,
        umbral_suspension: 20000,
        fecha_actualizacion: '2026-08-23T12:00:00.000Z',
      });
    });

    it('throw NotFound and write nothing when there is no row to update', async () => {
      mockPrisma.configuracion_morosidad.findFirst.mockResolvedValue(null);

      await expect(
        morosidadService.actualizarConfiguracion(nuevosValores),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.configuracion_morosidad.update).not.toHaveBeenCalled();
      expect(mockPrisma.log_auditoria.create).not.toHaveBeenCalled();
    });
  });

  describe('revisarMorosidad (CU-47)', () => {
    /** Deja las 3 consultas paralelas listas: procesados, omitidos y a marcar. */
    function conContratos(opciones: {
      procesados?: number;
      omitidos?: number;
      aMarcar?: number[];
    }) {
      mockPrisma.contrato.count
        .mockResolvedValueOnce(opciones.procesados ?? 0)
        .mockResolvedValueOnce(opciones.omitidos ?? 0);
      mockPrisma.contrato.findMany.mockResolvedValue(
        (opciones.aMarcar ?? []).map((id) => ({ id_contrato: id })),
      );
    }

    // "compara la fecha actual con la fecha limite de pago mas los dias de gracia
    // configurados [...] marca dichos contratos con estado de morosidad" (RF-35).
    it('mark contracts whose due date plus the grace period has already passed', async () => {
      conContratos({ procesados: 1, aMarcar: [7] });

      const result = await morosidadService.revisarMorosidad();

      expect(mockPrisma.contrato.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id_contrato: { in: [7] },
            fecha_morosidad: null,
          }),
        }),
      );
      expect(result.contratos_marcados).toBe(1);
      expect(result.ids_marcados).toEqual([7]);
    });

    // El corte se calcula antes de la consulta: la base filtra por fecha, no JavaScript.
    it('push the grace-period cutoff into the query instead of filtering in memory', async () => {
      conContratos({ procesados: 1, aMarcar: [7] });

      await morosidadService.revisarMorosidad();

      // filaConfig fija dias_gracia en 5.
      const esperado = diasDesdeHoy(-5);
      expect(mockPrisma.contrato.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            factura: {
              some: expect.objectContaining({
                fecha_limite_pago: { lt: esperado },
              }),
            },
            dia_vencimiento: { gte: 1, lte: 28 },
            fecha_morosidad: null,
          }),
        }),
      );
      expect(mockPrisma.factura.findMany).not.toHaveBeenCalled();
    });

    // Prisma devuelve `fecha_limite_pago` (@db.Date) como medianoche UTC. Si el corte se
    // normalizara a medianoche local, en Chile (UTC-4) caería un día antes y los contratos
    // se marcarían morosos 24 horas antes de lo debido.
    it('build the cutoff at UTC midnight, not local midnight', async () => {
      conContratos({ procesados: 1, aMarcar: [7] });

      await morosidadService.revisarMorosidad();

      const [[argumentos]] = mockPrisma.contrato.findMany.mock.calls as [
        [{ where: { factura: { some: { fecha_limite_pago: { lt: Date } } } } }],
      ];
      const corte = argumentos.where.factura.some.fecha_limite_pago.lt;

      expect(corte.getUTCHours()).toBe(0);
      expect(corte.getUTCMinutes()).toBe(0);
      // Hoy menos los 5 días de gracia de `filaConfig`.
      expect(corte.toISOString()).toBe(diasDesdeHoy(-5).toISOString());
    });

    it('not touch any contract when none passed the grace period', async () => {
      conContratos({ procesados: 3, aMarcar: [] });

      const result = await morosidadService.revisarMorosidad();

      expect(mockPrisma.contrato.updateMany).not.toHaveBeenCalled();
      expect(result.contratos_marcados).toBe(0);
      expect(result.contratos_procesados).toBe(3);
    });

    // CU-47: "generando un log con hora de inicio, fin y cantidad de contratos procesados".
    it('return a log with start time, end time and processed count', async () => {
      conContratos({ procesados: 12, aMarcar: [7] });

      const result = await morosidadService.revisarMorosidad();

      expect(Date.parse(result.inicio)).not.toBeNaN();
      expect(Date.parse(result.fin)).toBeGreaterThanOrEqual(
        Date.parse(result.inicio),
      );
      expect(result.contratos_procesados).toBe(12);
    });

    // CU-47: "El administrador puede revisar el log generado con el detalle de los
    // contratos identificados como morosos".
    it('persist the run in log_auditoria so the admin can review it', async () => {
      conContratos({ procesados: 1, aMarcar: [7] });

      await morosidadService.revisarMorosidad();

      expect(mockPrisma.log_auditoria.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accion: 'REVISION_MOROSIDAD',
          entidad_afectada: 'contrato',
          valor_nuevo: expect.objectContaining({
            contratos_marcados: 1,
            ids_marcados: [7],
          }),
        }),
      });
    });

    // CU-47 Excepcion 1: el proceso programado no puede iniciarse.
    it('record the failure and mark nothing when there are no parameters configured', async () => {
      mockPrisma.configuracion_morosidad.findFirst.mockResolvedValue(null);

      const result = await morosidadService.revisarMorosidad();

      expect(mockPrisma.contrato.updateMany).not.toHaveBeenCalled();
      expect(result.contratos_marcados).toBe(0);
      expect(mockPrisma.log_auditoria.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accion: 'REVISION_MOROSIDAD_FALLIDA',
          valor_nuevo: expect.objectContaining({ fallo: 'SIN_CONFIGURACION' }),
        }),
      });
    });

    // CU-47 Excepcion 2: contratos sin fecha de vencimiento valida se omiten.
    it('count contracts with an invalid dia_vencimiento apart, without marking them', async () => {
      conContratos({ procesados: 3, omitidos: 2, aMarcar: [9] });

      const result = await morosidadService.revisarMorosidad();

      expect(result.contratos_omitidos).toBe(2);
      expect(result.ids_marcados).toEqual([9]);
      expect(mockPrisma.contrato.count).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: expect.objectContaining({
            NOT: { dia_vencimiento: { gte: 1, lte: 28 } },
          }),
        }),
      );
    });

    // CU-47 Excepcion 3: la consulta masiva falla, el proceso queda inconcluso.
    it('leave the run unfinished and record the error when the query fails', async () => {
      mockPrisma.contrato.count.mockRejectedValue(new Error('db down'));

      const result = await morosidadService.revisarMorosidad();

      expect(mockPrisma.contrato.updateMany).not.toHaveBeenCalled();
      expect(result.contratos_marcados).toBe(0);
      expect(mockPrisma.log_auditoria.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accion: 'REVISION_MOROSIDAD_FALLIDA',
          valor_nuevo: expect.objectContaining({ fallo: 'CONSULTA_FALLIDA' }),
        }),
      });
    });

    it('record the error when marking the contracts fails', async () => {
      conContratos({ procesados: 1, aMarcar: [7] });
      mockPrisma.contrato.updateMany.mockRejectedValue(new Error('db down'));

      const result = await morosidadService.revisarMorosidad();

      expect(result.contratos_marcados).toBe(0);
      expect(mockPrisma.log_auditoria.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accion: 'REVISION_MOROSIDAD_FALLIDA',
          valor_nuevo: expect.objectContaining({ fallo: 'MARCADO_FALLIDO' }),
        }),
      });
    });

    // Los contratos ya quedaron marcados: un fallo de auditoria no debe perder el resultado.
    it('still return the result when writing the audit log fails', async () => {
      conContratos({ procesados: 1, aMarcar: [7] });
      mockPrisma.log_auditoria.create.mockRejectedValue(
        new Error('audit table down'),
      );

      const result = await morosidadService.revisarMorosidad();

      expect(result.contratos_marcados).toBe(1);
      expect(result.ids_marcados).toEqual([7]);
    });
  });

  describe('listarContratosVencidos (CU-55)', () => {
    const grupo = {
      id_contrato: 7,
      _sum: { monto: 45000 },
      _count: { _all: 3 },
      _min: { fecha_limite_pago: diasDesdeHoy(-40) },
    };

    it('return the page with balance, invoice count and days overdue', async () => {
      mockPrisma.factura.groupBy.mockResolvedValue([grupo]);
      mockPrisma.contrato.count.mockResolvedValue(1);
      mockPrisma.contrato.findMany.mockResolvedValue([
        {
          id_contrato: 7,
          cliente: { rut: '123456785', nombre_completo: 'Juan Perez' },
        },
      ]);

      const result = await morosidadService.listarContratosVencidos({
        page: 1,
        limit: 20,
      });

      expect(result.total).toBe(1);
      expect(result.data[0]).toEqual({
        id_contrato: 7,
        rut: '123456785',
        nombre_completo: 'Juan Perez',
        saldo_vencido: 45000,
        facturas_vencidas: 3,
        dias_vencido: 40,
      });
    });

    // El saldo lo suma la base: no se traen las facturas una por una.
    it('aggregate in the database instead of loading every invoice', async () => {
      mockPrisma.factura.groupBy.mockResolvedValue([grupo]);
      mockPrisma.contrato.count.mockResolvedValue(1);
      mockPrisma.contrato.findMany.mockResolvedValue([
        { id_contrato: 7, cliente: { rut: '1', nombre_completo: 'A' } },
      ]);

      await morosidadService.listarContratosVencidos({ page: 1, limit: 20 });

      expect(mockPrisma.factura.groupBy).toHaveBeenCalled();
      expect(mockPrisma.factura.findMany).not.toHaveBeenCalled();
    });

    it('pass pagination through to the query', async () => {
      await morosidadService.listarContratosVencidos({ page: 3, limit: 10 });

      expect(mockPrisma.factura.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    // CU-55 Excepcion 3: no existen contratos con saldo vencido.
    it('return an empty list instead of an error when nothing is overdue', async () => {
      mockPrisma.factura.groupBy.mockResolvedValue([]);
      mockPrisma.contrato.count.mockResolvedValue(0);

      const result = await morosidadService.listarContratosVencidos({
        page: 1,
        limit: 20,
      });

      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 20 });
      expect(mockPrisma.contrato.findMany).not.toHaveBeenCalled();
    });

    // CU-55 Excepcion 2: la consulta falla por falla en el sistema.
    it('report that the list could not be refreshed when the query fails', async () => {
      mockPrisma.factura.groupBy.mockRejectedValue(new Error('db down'));

      await expect(
        morosidadService.listarContratosVencidos({ page: 1, limit: 20 }),
      ).rejects.toThrow('La lista de contratos vencidos no pudo actualizarse.');
    });
  });

  describe('obtenerDetalleContratoVencido (CU-56)', () => {
    const contratoDetalle = {
      id_contrato: 7,
      estado: 'activo',
      dia_vencimiento: 5,
      plan: { nombre_comercial: 'Fibra 400 Mbps' },
      cliente: {
        rut: '123456785',
        nombre_completo: 'Juan Perez',
        email: 'juan@mail.cl',
        telefono: '+56911111111',
      },
      factura: [
        {
          id_factura: 1,
          periodo_mes: 7,
          periodo_anio: 2026,
          monto: 20000,
          fecha_limite_pago: diasDesdeHoy(-40),
          estado: 'vencida',
          pago: [],
        },
        {
          id_factura: 2,
          periodo_mes: 6,
          periodo_anio: 2026,
          monto: 20000,
          fecha_limite_pago: diasDesdeHoy(-70),
          estado: 'pagada',
          pago: [
            {
              id_pago: 9,
              monto: 20000,
              fecha_pago: new Date('2026-06-10T12:00:00Z'),
              pasarela: 'webpay',
            },
          ],
        },
      ],
    };

    beforeEach(() => {
      mockPrisma.contrato.findUnique.mockResolvedValue(contratoDetalle);
    });

    // "el detalle del contrato con la informacion de deuda, historial de pagos y datos del cliente"
    it('return debt, payment history and client data', async () => {
      const result = await morosidadService.obtenerDetalleContratoVencido(7);

      expect(result.cliente?.rut).toBe('123456785');
      expect(result.plan).toBe('Fibra 400 Mbps');
      expect(result.saldo_vencido).toBe(20000);
      expect(result.historial_pagos).toHaveLength(1);
      expect(result.historial_pagos[0].pasarela).toBe('webpay');
    });

    it('count only unpaid invoices past due in the overdue balance', async () => {
      const result = await morosidadService.obtenerDetalleContratoVencido(7);

      // La factura pagada no suma, aunque su fecha limite ya paso.
      expect(result.saldo_vencido).toBe(20000);
    });

    it('mark days overdue only on unpaid invoices', async () => {
      const result = await morosidadService.obtenerDetalleContratoVencido(7);

      const vencida = result.facturas.find((f) => f.id_factura === 1);
      const pagada = result.facturas.find((f) => f.id_factura === 2);
      expect(vencida?.dias_vencida).toBe(40);
      expect(pagada?.dias_vencida).toBeNull();
      expect(vencida?.periodo).toBe('07/2026');
    });

    it('throw NotFound when the contract does not exist', async () => {
      mockPrisma.contrato.findUnique.mockResolvedValue(null);

      await expect(
        morosidadService.obtenerDetalleContratoVencido(999),
      ).rejects.toThrow(NotFoundException);
    });

    // CU-56 Excepcion 2: el detalle no puede cargarse por error del sistema.
    it('report the detail as temporarily unavailable when the query fails', async () => {
      mockPrisma.contrato.findUnique.mockRejectedValue(new Error('db down'));

      await expect(
        morosidadService.obtenerDetalleContratoVencido(7),
      ).rejects.toThrow(
        'La información del contrato no está disponible temporalmente.',
      );
    });
  });
});
