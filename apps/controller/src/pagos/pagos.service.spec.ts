import { jest, beforeEach, describe, it, expect } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { RegistrarPagoDto } from './dto/pagos.dto.js';
import type { IncorporarAbonoExternoDto } from './dto/abonos-externos.dto.js';

const { PagosService } = await import('./pagos.service.js');

const DTO_MOCK: RegistrarPagoDto = {
  id_factura: 201,
  monto: 19990,
  fecha_pago: '2026-06-10T12:00:00.000Z',
  codigo_transaccion: 'TX-0001',
  pasarela: 'recaudacion-externa',
};

const ABONO_DTO_MOCK: IncorporarAbonoExternoDto = {
  codigo_abonado: 100,
  monto: 19990,
  fecha_pago: '2026-06-10T12:00:00.000Z',
  codigo_transaccion: 'EXT-0001',
  pasarela: 'servipag',
};

const PAGO_DB_MOCK = {
  id_pago: 1,
  id_factura: 201,
  id_cliente: 5,
  monto: 19990,
  fecha_pago: new Date('2026-06-10T12:00:00.000Z'),
  codigo_transaccion: 'TX-0001',
  pasarela: 'recaudacion-externa',
  token_transaccional: null,
};

describe('PagosService', () => {
  let service: InstanceType<typeof PagosService>;
  let prisma: PrismaService;
  let txMock: {
    pago: { create: jest.Mock };
    factura: { update: jest.Mock };
  };

  beforeEach(async () => {
    txMock = {
      pago: { create: jest.fn() },
      factura: { update: jest.fn() },
    };

    const module = await Test.createTestingModule({
      providers: [
        PagosService,
        {
          provide: PrismaService,
          useValue: {
            pago: {
              findUnique: jest.fn(),
            },
            factura: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
            },
            contrato: {
              findUnique: jest.fn(),
            },
            log_auditoria: {
              create: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
            $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
              callback(txMock),
            ),
          },
        },
      ],
    }).compile();

    service = module.get(PagosService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('registrarPagoConfirmado (CU-44/CU-45)', () => {
    beforeEach(() => {
      (prisma.pago.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.factura.findUnique as jest.Mock).mockResolvedValue({
        id_factura: 201,
        contrato: { id_cliente: 5 },
      });
      txMock.pago.create.mockResolvedValue(PAGO_DB_MOCK);
    });

    it('CU-44: registra el pago, marca la factura como pagada y retorna los datos persistidos', async () => {
      const result = await service.registrarPagoConfirmado(
        DTO_MOCK,
        '127.0.0.1',
      );

      expect(txMock.pago.create).toHaveBeenCalledWith({
        data: {
          id_factura: 201,
          id_cliente: 5,
          monto: 19990,
          fecha_pago: new Date('2026-06-10T12:00:00.000Z'),
          codigo_transaccion: 'TX-0001',
          pasarela: 'recaudacion-externa',
          token_transaccional: undefined,
        },
      });
      expect(txMock.factura.update).toHaveBeenCalledWith({
        where: { id_factura: 201 },
        data: { estado: 'pagada' },
      });
      expect(result).toMatchObject({
        id_pago: 1,
        id_factura: 201,
        id_cliente: 5,
        monto: 19990,
        codigo_transaccion: 'TX-0001',
      });
    });

    it('CU-44: crea registro en log_auditoria al confirmar el pago', async () => {
      await service.registrarPagoConfirmado(DTO_MOCK, '127.0.0.1');

      expect(prisma.log_auditoria.create).toHaveBeenCalledWith({
        data: {
          accion: 'PAGO_REGISTRADO',
          entidad_afectada: 'pago',
          id_entidad_afectada: 1,
          valor_nuevo: {
            id_factura: 201,
            monto: 19990,
            codigo_transaccion: 'TX-0001',
            pasarela: 'recaudacion-externa',
          },
          ip_origen: '127.0.0.1',
        },
      });
    });

    it('CU-45: lanza ConflictException si codigo_transaccion ya existe', async () => {
      (prisma.pago.findUnique as jest.Mock).mockResolvedValue(PAGO_DB_MOCK);

      await expect(
        service.registrarPagoConfirmado(DTO_MOCK, '127.0.0.1'),
      ).rejects.toThrow('El código de transacción ya fue registrado');
      expect(txMock.pago.create).not.toHaveBeenCalled();
    });

    it('CU-45: registra incidencia DUPLICADO_RECHAZADO para que el administrador pueda consultarla', async () => {
      (prisma.pago.findUnique as jest.Mock).mockResolvedValue(PAGO_DB_MOCK);

      await expect(
        service.registrarPagoConfirmado(DTO_MOCK, '127.0.0.1'),
      ).rejects.toThrow();

      expect(prisma.log_auditoria.create).toHaveBeenCalledWith({
        data: {
          accion: 'PAGO_INCIDENCIA_DUPLICADO_RECHAZADO',
          entidad_afectada: 'pago',
          valor_nuevo: { payload: DTO_MOCK, error: undefined },
          ip_origen: '127.0.0.1',
        },
      });
    });

    it('CU-45 Excepción 2: lanza ServiceUnavailableException si no se puede consultar el historial', async () => {
      (prisma.pago.findUnique as jest.Mock).mockRejectedValue(
        new Error('connection lost'),
      );

      await expect(
        service.registrarPagoConfirmado(DTO_MOCK, '127.0.0.1'),
      ).rejects.toThrow('No fue posible verificar duplicados');
      expect(prisma.factura.findUnique).not.toHaveBeenCalled();
      expect(txMock.pago.create).not.toHaveBeenCalled();
    });

    it('CU-45 Excepción 2: registra incidencia HISTORIAL_NO_CONSULTABLE', async () => {
      (prisma.pago.findUnique as jest.Mock).mockRejectedValue(
        new Error('connection lost'),
      );

      await expect(
        service.registrarPagoConfirmado(DTO_MOCK, '127.0.0.1'),
      ).rejects.toThrow();

      expect(prisma.log_auditoria.create).toHaveBeenCalledWith({
        data: {
          accion: 'PAGO_INCIDENCIA_HISTORIAL_NO_CONSULTABLE',
          entidad_afectada: 'pago',
          valor_nuevo: { payload: DTO_MOCK, error: 'connection lost' },
          ip_origen: '127.0.0.1',
        },
      });
    });

    it('CU-44 Excepción 2: lanza UnprocessableEntityException si la factura no existe', async () => {
      (prisma.factura.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.registrarPagoConfirmado(DTO_MOCK, '127.0.0.1'),
      ).rejects.toThrow(
        'No fue posible asociar el pago a una cuenta o contrato válido',
      );
      expect(txMock.pago.create).not.toHaveBeenCalled();
    });

    it('CU-44 Excepción 2: lanza UnprocessableEntityException si la factura no tiene contrato/cliente asociado', async () => {
      (prisma.factura.findUnique as jest.Mock).mockResolvedValue({
        id_factura: 201,
        contrato: null,
      });

      await expect(
        service.registrarPagoConfirmado(DTO_MOCK, '127.0.0.1'),
      ).rejects.toThrow(
        'No fue posible asociar el pago a una cuenta o contrato válido',
      );
    });

    it('CU-44 Excepción 2: registra incidencia en log_auditoria cuando no se puede asociar', async () => {
      (prisma.factura.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.registrarPagoConfirmado(DTO_MOCK, '127.0.0.1'),
      ).rejects.toThrow();

      expect(prisma.log_auditoria.create).toHaveBeenCalledWith({
        data: {
          accion: 'PAGO_INCIDENCIA_CUENTA_NO_DETERMINADA',
          entidad_afectada: 'pago',
          valor_nuevo: { payload: DTO_MOCK, error: undefined },
          ip_origen: '127.0.0.1',
        },
      });
    });

    it('CU-45: lanza ConflictException (no Excepción 3) si create() falla por unique constraint P2002', async () => {
      txMock.pago.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.registrarPagoConfirmado(DTO_MOCK, '127.0.0.1'),
      ).rejects.toThrow('El código de transacción ya fue registrado');

      // Se registra como duplicado rechazado (CU-45), no como falla de persistencia (CU-44 Excepción 3)
      expect(prisma.log_auditoria.create).toHaveBeenCalledWith({
        data: {
          accion: 'PAGO_INCIDENCIA_DUPLICADO_RECHAZADO',
          entidad_afectada: 'pago',
          valor_nuevo: { payload: DTO_MOCK, error: undefined },
          ip_origen: '127.0.0.1',
        },
      });
    });

    it('CU-44 Excepción 3: lanza InternalServerErrorException y registra incidencia si falla la persistencia', async () => {
      txMock.pago.create.mockRejectedValue(new Error('connection lost'));

      await expect(
        service.registrarPagoConfirmado(DTO_MOCK, '127.0.0.1'),
      ).rejects.toThrow('No fue posible registrar el pago');

      expect(prisma.log_auditoria.create).toHaveBeenCalledWith({
        data: {
          accion: 'PAGO_INCIDENCIA_ERROR_PERSISTENCIA',
          entidad_afectada: 'pago',
          valor_nuevo: {
            payload: DTO_MOCK,
            error: 'connection lost',
          },
          ip_origen: '127.0.0.1',
        },
      });
    });
  });

  describe('incorporarAbonoExterno (CU-46)', () => {
    beforeEach(() => {
      (prisma.pago.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.contrato.findUnique as jest.Mock).mockResolvedValue({
        id_cliente: 5,
      });
      (prisma.factura.findFirst as jest.Mock).mockResolvedValue({
        id_factura: 301,
        monto: new Prisma.Decimal(19990),
      });
      txMock.pago.create.mockResolvedValue({
        ...PAGO_DB_MOCK,
        id_pago: 2,
        id_factura: 301,
        codigo_transaccion: 'EXT-0001',
        pasarela: 'servipag',
      });
    });

    it('CU-46: resuelve el contrato por codigo_abonado y aplica el abono a la factura pendiente más antigua', async () => {
      await service.incorporarAbonoExterno(ABONO_DTO_MOCK, '127.0.0.1');

      expect(prisma.contrato.findUnique).toHaveBeenCalledWith({
        where: { id_contrato: 100 },
        select: { id_cliente: true },
      });
      expect(prisma.factura.findFirst).toHaveBeenCalledWith({
        where: { id_contrato: 100, estado: { in: ['pendiente', 'vencida'] } },
        orderBy: { fecha_limite_pago: 'asc' },
        select: { id_factura: true, monto: true },
      });
      expect(txMock.pago.create).toHaveBeenCalledWith({
        data: {
          id_factura: 301,
          id_cliente: 5,
          monto: 19990,
          fecha_pago: new Date('2026-06-10T12:00:00.000Z'),
          codigo_transaccion: 'EXT-0001',
          pasarela: 'servipag',
          token_transaccional: undefined,
        },
      });
      expect(txMock.factura.update).toHaveBeenCalledWith({
        where: { id_factura: 301 },
        data: { estado: 'pagada' },
      });
    });

    it('CU-46 Excepción 1: lanza UnprocessableEntityException si el contrato no existe', async () => {
      (prisma.contrato.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.incorporarAbonoExterno(ABONO_DTO_MOCK, '127.0.0.1'),
      ).rejects.toThrow('No fue posible identificar al cliente o contrato');
      expect(txMock.pago.create).not.toHaveBeenCalled();
    });

    it('CU-46 Excepción 1: registra incidencia ABONO_CLIENTE_NO_IDENTIFICADO', async () => {
      (prisma.contrato.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.incorporarAbonoExterno(ABONO_DTO_MOCK, '127.0.0.1'),
      ).rejects.toThrow();

      expect(prisma.log_auditoria.create).toHaveBeenCalledWith({
        data: {
          accion: 'PAGO_INCIDENCIA_ABONO_CLIENTE_NO_IDENTIFICADO',
          entidad_afectada: 'pago',
          valor_nuevo: { payload: ABONO_DTO_MOCK, error: undefined },
          ip_origen: '127.0.0.1',
        },
      });
    });

    it('CU-46 Excepción 2: lanza BadRequestException si no hay factura pendiente para el contrato', async () => {
      (prisma.factura.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.incorporarAbonoExterno(ABONO_DTO_MOCK, '127.0.0.1'),
      ).rejects.toThrow(
        'El monto informado es inválido o inconsistente con la deuda del contrato',
      );
      expect(txMock.pago.create).not.toHaveBeenCalled();
    });

    it('CU-46 Excepción 2: lanza BadRequestException si el monto no calza exacto con la factura', async () => {
      (prisma.factura.findFirst as jest.Mock).mockResolvedValue({
        id_factura: 301,
        monto: new Prisma.Decimal(25000),
      });

      await expect(
        service.incorporarAbonoExterno(ABONO_DTO_MOCK, '127.0.0.1'),
      ).rejects.toThrow(
        'El monto informado es inválido o inconsistente con la deuda del contrato',
      );
      expect(txMock.pago.create).not.toHaveBeenCalled();
    });

    it('CU-46 Excepción 2: no registra incidencia (rechazo directo, igual que la Excepción 1 de CU-44/45)', async () => {
      (prisma.factura.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.incorporarAbonoExterno(ABONO_DTO_MOCK, '127.0.0.1'),
      ).rejects.toThrow();

      expect(prisma.log_auditoria.create).not.toHaveBeenCalled();
    });

    it('CU-46 Excepción 3: lanza InternalServerErrorException y registra incidencia ABONO_ERROR_ACTUALIZAR_SALDO si falla la transacción', async () => {
      txMock.pago.create.mockRejectedValue(new Error('connection lost'));

      await expect(
        service.incorporarAbonoExterno(ABONO_DTO_MOCK, '127.0.0.1'),
      ).rejects.toThrow('No fue posible registrar el pago');

      expect(prisma.log_auditoria.create).toHaveBeenCalledWith({
        data: {
          accion: 'PAGO_INCIDENCIA_ABONO_ERROR_ACTUALIZAR_SALDO',
          entidad_afectada: 'pago',
          valor_nuevo: { payload: ABONO_DTO_MOCK, error: 'connection lost' },
          ip_origen: '127.0.0.1',
        },
      });
    });

    it('CU-45: tambien detecta codigo_transaccion duplicado para abonos externos', async () => {
      (prisma.pago.findUnique as jest.Mock).mockResolvedValue(PAGO_DB_MOCK);

      await expect(
        service.incorporarAbonoExterno(ABONO_DTO_MOCK, '127.0.0.1'),
      ).rejects.toThrow('El código de transacción ya fue registrado');
      expect(prisma.contrato.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('getPagosRechazados', () => {
    const LOG_MOCK = {
      id_log: 10n,
      valor_nuevo: { payload: DTO_MOCK, error: undefined },
      ip_origen: '127.0.0.1',
      fecha_hora: new Date('2026-06-10T12:05:00.000Z'),
    };

    beforeEach(() => {
      (prisma.log_auditoria.findMany as jest.Mock).mockResolvedValue([
        LOG_MOCK,
      ]);
      (prisma.log_auditoria.count as jest.Mock).mockResolvedValue(1);
    });

    it('CU-45: filtra por accion PAGO_INCIDENCIA_DUPLICADO_RECHAZADO', async () => {
      await service.getPagosRechazados({ page: 1, limit: 20 });

      expect(prisma.log_auditoria.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { accion: 'PAGO_INCIDENCIA_DUPLICADO_RECHAZADO' },
          orderBy: { fecha_hora: 'desc' },
          skip: 0,
          take: 20,
        }),
      );
    });

    it('CU-45: mapea el payload guardado en valor_nuevo a la respuesta', async () => {
      const result = await service.getPagosRechazados({ page: 1, limit: 20 });

      expect(result).toEqual({
        data: [
          {
            id_log: '10',
            codigo_transaccion: 'TX-0001',
            id_factura: 201,
            monto: 19990,
            pasarela: 'recaudacion-externa',
            ip_origen: '127.0.0.1',
            fecha: '2026-06-10T12:05:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      });
    });

    it('CU-45: filtra por codigo_transaccion vía JSON path', async () => {
      await service.getPagosRechazados({
        codigo_transaccion: 'TX-0001',
        page: 1,
        limit: 20,
      });

      const where = (prisma.log_auditoria.findMany as jest.Mock).mock
        .calls[0][0].where;
      expect(where.valor_nuevo).toEqual({
        path: ['payload', 'codigo_transaccion'],
        equals: 'TX-0001',
      });
    });

    it('CU-45: filtra por rango de fechas', async () => {
      await service.getPagosRechazados({
        desde: '2026-06-01',
        hasta: '2026-06-30',
        page: 1,
        limit: 20,
      });

      const where = (prisma.log_auditoria.findMany as jest.Mock).mock
        .calls[0][0].where;
      expect(where.fecha_hora.gte).toBeInstanceOf(Date);
      expect(where.fecha_hora.lte).toBeInstanceOf(Date);
    });

    it('CU-45: aplica paginación', async () => {
      await service.getPagosRechazados({ page: 3, limit: 10 });

      expect(prisma.log_auditoria.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('CU-45: retorna data vacía cuando no hay registros', async () => {
      (prisma.log_auditoria.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.log_auditoria.count as jest.Mock).mockResolvedValue(0);

      const result = await service.getPagosRechazados({ page: 1, limit: 20 });

      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 20 });
    });
  });
});
