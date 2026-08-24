import { jest, beforeEach, describe, it, expect } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { RegistrarPagoDto } from './dto/pagos.dto.js';

const { PagosService } = await import('./pagos.service.js');

const DTO_MOCK: RegistrarPagoDto = {
  id_factura: 201,
  monto: 19990,
  fecha_pago: '2026-06-10T12:00:00.000Z',
  codigo_transaccion: 'TX-0001',
  pasarela: 'recaudacion-externa',
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

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PagosService,
        {
          provide: PrismaService,
          useValue: {
            pago: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
            factura: {
              findUnique: jest.fn(),
            },
            log_auditoria: {
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get(PagosService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('registrarPagoConfirmado', () => {
    beforeEach(() => {
      (prisma.pago.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.factura.findUnique as jest.Mock).mockResolvedValue({
        id_factura: 201,
        contrato: { id_cliente: 5 },
      });
      (prisma.pago.create as jest.Mock).mockResolvedValue(PAGO_DB_MOCK);
    });

    it('CU-44: registra el pago y retorna los datos persistidos', async () => {
      const result = await service.registrarPagoConfirmado(
        DTO_MOCK,
        '127.0.0.1',
      );

      expect(prisma.pago.create).toHaveBeenCalledWith({
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
      expect(prisma.pago.create).not.toHaveBeenCalled();
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
      expect(prisma.pago.create).not.toHaveBeenCalled();
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
      expect(prisma.pago.create).not.toHaveBeenCalled();
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
      (prisma.pago.create as jest.Mock).mockRejectedValue(
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
      (prisma.pago.create as jest.Mock).mockRejectedValue(
        new Error('connection lost'),
      );

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
});
