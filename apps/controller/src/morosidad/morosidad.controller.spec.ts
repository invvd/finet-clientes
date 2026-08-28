import { jest, beforeEach, describe, it, expect } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { MorosidadController } from './morosidad.controller.js';
import { MorosidadService } from './morosidad.service.js';
import { AdminGuard } from '../admin/guards/admin.guard.js';
import {
  ActualizarConfiguracionDto,
  ContratosVencidosQueryDto,
  DIAS_GRACIA_MAX,
  UMBRAL_SUSPENSION_MAX,
} from './dto/morosidad.dto.js';

describe('MorosidadController', () => {
  let morosidadController: MorosidadController;
  let mockMorosidadService: {
    obtenerConfiguracion: jest.Mock;
    actualizarConfiguracion: jest.Mock;
    revisarMorosidad: jest.Mock;
    listarContratosVencidos: jest.Mock;
    obtenerDetalleContratoVencido: jest.Mock;
  };

  beforeEach(async () => {
    mockMorosidadService = {
      obtenerConfiguracion: jest.fn(),
      actualizarConfiguracion: jest.fn(),
      revisarMorosidad: jest.fn(),
      listarContratosVencidos: jest.fn(),
      obtenerDetalleContratoVencido: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [MorosidadController],
      providers: [
        { provide: MorosidadService, useValue: mockMorosidadService },
      ],
    })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    morosidadController = module.get<MorosidadController>(MorosidadController);
  });

  describe('GET /admin/morosidad/configuracion/:idContrato', () => {
    it('return the parameters of the requested contract', async () => {
      const mockResult = {
        id_contrato: 7,
        dias_gracia: 5,
        umbral_suspension: 15000,
      };
      mockMorosidadService.obtenerConfiguracion.mockResolvedValue(mockResult);

      const result = await morosidadController.obtenerConfiguracion(7);

      expect(result).toEqual(mockResult);
      expect(mockMorosidadService.obtenerConfiguracion).toHaveBeenCalledWith(7);
    });
  });

  describe('PUT /admin/morosidad/configuracion/:idContrato', () => {
    it('delegate the contract and the new values to the service', async () => {
      const body = { dias_gracia: 10, umbral_suspension: 20000 };
      const mockResult = { id_contrato: 7, ...body };
      mockMorosidadService.actualizarConfiguracion.mockResolvedValue(
        mockResult,
      );

      const result = await morosidadController.actualizarConfiguracion(7, body);

      expect(result).toEqual(mockResult);
      expect(mockMorosidadService.actualizarConfiguracion).toHaveBeenCalledWith(
        7,
        body,
      );
    });
  });

  describe('POST /admin/morosidad/revision (CU-47)', () => {
    it('return the run log produced by the service', async () => {
      const mockResult = {
        inicio: '2026-08-24T00:00:00.000Z',
        fin: '2026-08-24T00:00:02.000Z',
        contratos_procesados: 12,
        contratos_marcados: 3,
        contratos_omitidos: 1,
        ids_marcados: [7, 8, 9],
      };
      mockMorosidadService.revisarMorosidad.mockResolvedValue(mockResult);

      const result = await morosidadController.revisarMorosidad();

      expect(result).toEqual(mockResult);
      expect(mockMorosidadService.revisarMorosidad).toHaveBeenCalled();
    });
  });

  // CU-80 Excepción 2: "El valor ingresado está fuera del rango permitido. El sistema
  // informa el rango válido e impide guardarlo hasta que sea corregido."
  describe('ActualizarConfiguracionDto (CU-80 Excepción 2)', () => {
    const valido = { dias_gracia: 5, umbral_suspension: 15000 };

    it('accept values inside the allowed range', () => {
      expect(ActualizarConfiguracionDto.safeParse(valido).success).toBe(true);
    });

    it('accept the range boundaries', () => {
      expect(
        ActualizarConfiguracionDto.safeParse({
          dias_gracia: 0,
          umbral_suspension: 0,
        }).success,
      ).toBe(true);
      expect(
        ActualizarConfiguracionDto.safeParse({
          dias_gracia: DIAS_GRACIA_MAX,
          umbral_suspension: UMBRAL_SUSPENSION_MAX,
        }).success,
      ).toBe(true);
    });

    it('reject dias_gracia out of range naming the valid range', () => {
      for (const invalido of [-1, DIAS_GRACIA_MAX + 1]) {
        const result = ActualizarConfiguracionDto.safeParse({
          ...valido,
          dias_gracia: invalido,
        });

        expect(result.success).toBe(false);
        expect(result.error?.issues[0].message).toContain(
          `0 y ${DIAS_GRACIA_MAX}`,
        );
      }
    });

    it('reject dias_gracia with decimals', () => {
      const result = ActualizarConfiguracionDto.safeParse({
        ...valido,
        dias_gracia: 5.5,
      });

      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain('entero');
    });

    it('reject umbral_suspension out of the DECIMAL(10,2) range', () => {
      for (const invalido of [-1, UMBRAL_SUSPENSION_MAX + 1]) {
        const result = ActualizarConfiguracionDto.safeParse({
          ...valido,
          umbral_suspension: invalido,
        });

        expect(result.success).toBe(false);
        expect(result.error?.issues[0].message).toContain(
          'umbral de suspensión',
        );
      }
    });

    it('reject non-numeric values and missing fields', () => {
      expect(
        ActualizarConfiguracionDto.safeParse({
          dias_gracia: 'cinco',
          umbral_suspension: 15000,
        }).success,
      ).toBe(false);
      expect(ActualizarConfiguracionDto.safeParse({}).success).toBe(false);
    });
  });

  describe('GET /admin/morosidad/contratos-vencidos (CU-55)', () => {
    it('delegate pagination to the service', async () => {
      const mockResult = { data: [], total: 0, page: 2, limit: 50 };
      mockMorosidadService.listarContratosVencidos.mockResolvedValue(
        mockResult,
      );

      const result = await morosidadController.listarContratosVencidos({
        page: 2,
        limit: 50,
      });

      expect(result).toEqual(mockResult);
      expect(mockMorosidadService.listarContratosVencidos).toHaveBeenCalledWith(
        { page: 2, limit: 50 },
      );
    });
  });

  describe('ContratosVencidosQueryDto (CU-55)', () => {
    it('default to page 1 and limit 20', () => {
      const result = ContratosVencidosQueryDto.safeParse({});

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ page: 1, limit: 20 });
    });

    it('coerce numeric strings coming from the query string', () => {
      const result = ContratosVencidosQueryDto.safeParse({
        page: '3',
        limit: '50',
      });

      expect(result.data).toEqual({ page: 3, limit: 50 });
    });

    it('reject page below 1 and limit above 100', () => {
      expect(ContratosVencidosQueryDto.safeParse({ page: 0 }).success).toBe(
        false,
      );
      expect(ContratosVencidosQueryDto.safeParse({ limit: 101 }).success).toBe(
        false,
      );
    });
  });

  describe('GET /admin/morosidad/contratos-vencidos/:id (CU-56)', () => {
    it('delegate the contract id to the service', async () => {
      const mockResult = { id_contrato: 7 };
      mockMorosidadService.obtenerDetalleContratoVencido.mockResolvedValue(
        mockResult,
      );

      const result = await morosidadController.obtenerDetalleContratoVencido(7);

      expect(result).toEqual(mockResult);
      expect(
        mockMorosidadService.obtenerDetalleContratoVencido,
      ).toHaveBeenCalledWith(7);
    });
  });
});
