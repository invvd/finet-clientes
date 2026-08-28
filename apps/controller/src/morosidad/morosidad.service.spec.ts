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

/**
 * Contrato con parámetros configurados, tal como lo devuelve Prisma: `umbral_suspension`
 * es Decimal, no number. Los parámetros viven en `contrato`, no en una tabla aparte.
 */
const contratoConfig = {
  id_contrato: 1,
  dias_gracia: 5,
  umbral_suspension: { toString: () => '15000.00' },
};

describe('MorosidadService', () => {
  let morosidadService: InstanceType<typeof MorosidadService>;
  let mockPrisma: {
    factura: {
      findMany: jest.Mock;
      groupBy: jest.Mock;
    };
    contrato: {
      updateMany: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
      groupBy: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
    log_auditoria: {
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    mockPrisma = {
      factura: {
        findMany: jest.fn().mockResolvedValue([]),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      contrato: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        update: jest.fn().mockResolvedValue(contratoConfig),
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(contratoConfig),
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
    it('return the contract parameters with Decimal serialized as number', async () => {
      const result = await morosidadService.obtenerConfiguracion(1);

      expect(result).toEqual({
        id_contrato: 1,
        dias_gracia: 5,
        umbral_suspension: 15000,
      });
      expect(typeof result.umbral_suspension).toBe('number');
    });

    it('throw NotFound when the contract does not exist', async () => {
      mockPrisma.contrato.findUnique.mockResolvedValue(null);

      await expect(morosidadService.obtenerConfiguracion(99)).rejects.toThrow(
        NotFoundException,
      );
    });

    // Los parámetros son nullable: un contrato puede existir sin haberlos configurado.
    it('throw NotFound when the contract has no parameters configured', async () => {
      mockPrisma.contrato.findUnique.mockResolvedValue({
        id_contrato: 1,
        dias_gracia: null,
        umbral_suspension: null,
      });

      await expect(morosidadService.obtenerConfiguracion(1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('actualizarConfiguracion (CU-80)', () => {
    const nuevosValores = { dias_gracia: 10, umbral_suspension: 20000 };
    const contratoActualizado = {
      id_contrato: 1,
      dias_gracia: 10,
      umbral_suspension: { toString: () => '20000.00' },
    };

    it('persist the new values on the contract and return them', async () => {
      mockPrisma.contrato.update.mockResolvedValue(contratoActualizado);

      const result = await morosidadService.actualizarConfiguracion(
        1,
        nuevosValores,
      );

      expect(mockPrisma.contrato.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id_contrato: 1 },
          data: expect.objectContaining({
            dias_gracia: 10,
            umbral_suspension: 20000,
          }),
        }),
      );
      expect(result).toEqual({
        id_contrato: 1,
        dias_gracia: 10,
        umbral_suspension: 20000,
      });
    });

    // Configurar por primera vez un contrato que tenía los parámetros en null es el mismo
    // camino que modificar uno ya configurado: no debe exigir valores previos.
    it('configure a contract that had no parameters yet', async () => {
      mockPrisma.contrato.findUnique.mockResolvedValue({
        id_contrato: 1,
        dias_gracia: null,
        umbral_suspension: null,
      });
      mockPrisma.contrato.update.mockResolvedValue(contratoActualizado);

      const result = await morosidadService.actualizarConfiguracion(
        1,
        nuevosValores,
      );

      expect(result.dias_gracia).toBe(10);
      expect(mockPrisma.log_auditoria.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          valor_anterior: { dias_gracia: null, umbral_suspension: null },
        }),
      });
    });

    // CU-80 poscondición: el cambio queda registrado en la bitácora con marca de tiempo.
    it('record the change in log_auditoria with previous and new values', async () => {
      mockPrisma.contrato.update.mockResolvedValue(contratoActualizado);

      await morosidadService.actualizarConfiguracion(1, nuevosValores);

      expect(mockPrisma.log_auditoria.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accion: 'ACTUALIZAR_CONFIG_MOROSIDAD',
          entidad_afectada: 'contrato',
          id_entidad_afectada: 1,
          valor_anterior: { dias_gracia: 5, umbral_suspension: 15000 },
          valor_nuevo: { dias_gracia: 10, umbral_suspension: 20000 },
        }),
      });
    });

    // Los parámetros ya quedaron guardados: un fallo de auditoría no debe convertirse en un
    // 500 que haga creer al administrador que el cambio no se aplicó.
    it('still succeed when writing the audit log fails', async () => {
      mockPrisma.contrato.update.mockResolvedValue(contratoActualizado);
      mockPrisma.log_auditoria.create.mockRejectedValue(
        new Error('audit table down'),
      );

      const result = await morosidadService.actualizarConfiguracion(
        1,
        nuevosValores,
      );

      expect(result).toEqual({
        id_contrato: 1,
        dias_gracia: 10,
        umbral_suspension: 20000,
      });
    });

    it('throw NotFound and write nothing when the contract does not exist', async () => {
      mockPrisma.contrato.findUnique.mockResolvedValue(null);

      await expect(
        morosidadService.actualizarConfiguracion(99, nuevosValores),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.contrato.update).not.toHaveBeenCalled();
      expect(mockPrisma.log_auditoria.create).not.toHaveBeenCalled();
    });
  });

  describe('revisarMorosidad (CU-47)', () => {
    /**
     * Prepara las consultas en el orden en que las hace el servicio:
     *
     * `groupBy` → los valores distintos de `dias_gracia` (los grupos).
     * `count` #1 → procesados, `count` #2 → contratos sin parámetros.
     * Luego, por cada grupo: `count` → omitidos y `findMany` → contratos a marcar.
     *
     * `gruposGracia` por defecto es `[5]`: un solo grupo con 5 días de gracia, que es lo
     * que asumen los tests de corte.
     */
    function conContratos(opciones: {
      procesados?: number;
      sinParametros?: number;
      omitidos?: number;
      aMarcar?: number[];
      gruposGracia?: number[];
    }) {
      const grupos = opciones.gruposGracia ?? [5];

      mockPrisma.contrato.count
        .mockResolvedValueOnce(opciones.procesados ?? 0)
        .mockResolvedValueOnce(opciones.sinParametros ?? 0);

      mockPrisma.contrato.groupBy.mockResolvedValue(
        grupos.map((dias_gracia) => ({ dias_gracia })),
      );

      for (let i = 0; i < grupos.length; i += 1) {
        mockPrisma.contrato.count.mockResolvedValueOnce(opciones.omitidos ?? 0);
        mockPrisma.contrato.findMany.mockResolvedValueOnce(
          (opciones.aMarcar ?? []).map((id) => ({ id_contrato: id })),
        );
      }
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

      // El grupo por defecto de `conContratos` fija dias_gracia en 5.
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

      // Los grupos salen de `groupBy`, así que `findMany` solo trae los a marcar.
      const argumentos = mockPrisma.contrato.findMany.mock.calls[0]![0] as {
        where: { factura: { some: { fecha_limite_pago: { lt: Date } } } };
      };
      const corte = argumentos.where.factura.some.fecha_limite_pago.lt;

      expect(corte.getUTCHours()).toBe(0);
      expect(corte.getUTCMinutes()).toBe(0);
      // Hoy menos los 5 días de gracia del grupo por defecto.
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
    it('record the failure and mark nothing when no contract has parameters configured', async () => {
      mockPrisma.contrato.groupBy.mockResolvedValue([]);

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

    // El corazón del cambio: los días de gracia son por contrato, así que no hay una sola
    // fecha de corte. Cada grupo de `dias_gracia` se compara contra su propio corte.
    it('use a different cutoff per grace-period group', async () => {
      conContratos({ procesados: 4, gruposGracia: [5, 30], aMarcar: [] });

      await morosidadService.revisarMorosidad();

      // Una llamada a findMany por grupo, con el corte propio de cada uno.
      const cortes = mockPrisma.contrato.findMany.mock.calls.map(
        (llamada) =>
          (
            llamada[0] as {
              where: {
                dias_gracia: number;
                factura: { some: { fecha_limite_pago: { lt: Date } } };
              };
            }
          ).where,
      );

      expect(cortes).toHaveLength(2);
      expect(cortes[0]!.dias_gracia).toBe(5);
      expect(cortes[0]!.factura.some.fecha_limite_pago.lt.toISOString()).toBe(
        diasDesdeHoy(-5).toISOString(),
      );
      expect(cortes[1]!.dias_gracia).toBe(30);
      expect(cortes[1]!.factura.some.fecha_limite_pago.lt.toISOString()).toBe(
        diasDesdeHoy(-30).toISOString(),
      );
    });

    it('mark contracts from every grace-period group in the same run', async () => {
      const grupos = [5, 30];
      mockPrisma.contrato.count
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(0);
      mockPrisma.contrato.groupBy.mockResolvedValue(
        grupos.map((dias_gracia) => ({ dias_gracia })),
      );
      mockPrisma.contrato.count.mockResolvedValueOnce(0);
      mockPrisma.contrato.findMany.mockResolvedValueOnce([{ id_contrato: 1 }]);
      mockPrisma.contrato.count.mockResolvedValueOnce(0);
      mockPrisma.contrato.findMany.mockResolvedValueOnce([{ id_contrato: 2 }]);

      const result = await morosidadService.revisarMorosidad();

      expect(result.ids_marcados).toEqual([1, 2]);
      expect(result.contratos_marcados).toBe(2);
    });

    // CU-47 Excepcion 1, ahora por contrato: con deuda pero sin parámetros propios se omite
    // en vez de asumir un valor por defecto que nadie configuró.
    it('count contracts without configured parameters as omitted', async () => {
      conContratos({ procesados: 5, sinParametros: 3, aMarcar: [8] });

      const result = await morosidadService.revisarMorosidad();

      expect(result.contratos_omitidos).toBe(3);
      expect(result.ids_marcados).toEqual([8]);
      // count #2 es el de contratos con deuda y sin parámetros.
      expect(mockPrisma.contrato.count).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: expect.objectContaining({ dias_gracia: null }),
        }),
      );
    });

    // CU-47 Excepcion 2: contratos sin fecha de vencimiento valida se omiten.
    it('count contracts with an invalid dia_vencimiento apart, without marking them', async () => {
      conContratos({ procesados: 3, omitidos: 2, aMarcar: [9] });

      const result = await morosidadService.revisarMorosidad();

      expect(result.contratos_omitidos).toBe(2);
      expect(result.ids_marcados).toEqual([9]);
      // count #1 procesados, #2 sin parámetros, #3 los omitidos del único grupo.
      expect(mockPrisma.contrato.count).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          where: expect.objectContaining({
            dias_gracia: 5,
            NOT: { dia_vencimiento: { gte: 1, lte: 28 } },
          }),
        }),
      );
    });

    // CU-47 Excepcion 3: la consulta masiva falla, el proceso queda inconcluso.
    it('leave the run unfinished and record the error when the query fails', async () => {
      // Los grupos resuelven bien; lo que falla es la consulta masiva posterior.
      mockPrisma.contrato.groupBy.mockResolvedValue([{ dias_gracia: 5 }]);
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
