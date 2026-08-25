import { jest, beforeEach, describe, it, expect } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { ContratoController } from './contrato.controller.js';
import { ContratoService } from './contrato.service.js';
import { AdminGuard } from '../admin/guards/admin.guard.js';
import {
  AsignarDiaVencimientoDto,
  DIA_VENCIMIENTO_MIN,
  DIA_VENCIMIENTO_MAX,
} from './dto/contrato.dto.js';

describe('ContratoController', () => {
  let contratoController: ContratoController;
  let mockContratoService: {
    asignarDiaVencimiento: jest.Mock;
  };

  beforeEach(async () => {
    mockContratoService = {
      asignarDiaVencimiento: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [ContratoController],
      providers: [{ provide: ContratoService, useValue: mockContratoService }],
    })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    contratoController = module.get<ContratoController>(ContratoController);
  });

  describe('PATCH /admin/contratos/:id/dia-vencimiento', () => {
    it('delegate the contract id and the day to the service', async () => {
      const mockResult = { id_contrato: 7, dia_vencimiento: 15 };
      mockContratoService.asignarDiaVencimiento.mockResolvedValue(mockResult);

      const result = await contratoController.asignarDiaVencimiento(7, {
        dia_vencimiento: 15,
      });

      expect(result).toEqual(mockResult);
      expect(mockContratoService.asignarDiaVencimiento).toHaveBeenCalledWith(
        7,
        15,
      );
    });
  });

  // CU-54 Excepción 2: "El día ingresado es inválido o está fuera del rango permitido. El
  // sistema rechaza el dato y solicita corrección."
  describe('AsignarDiaVencimientoDto (CU-54 Excepción 2)', () => {
    it('accept a day inside the 1–28 range', () => {
      expect(
        AsignarDiaVencimientoDto.safeParse({ dia_vencimiento: 15 }).success,
      ).toBe(true);
    });

    it('accept both range boundaries', () => {
      for (const dia of [DIA_VENCIMIENTO_MIN, DIA_VENCIMIENTO_MAX]) {
        expect(
          AsignarDiaVencimientoDto.safeParse({ dia_vencimiento: dia }).success,
        ).toBe(true);
      }
    });

    // El tope de 28 es del CU: "para evitar conflictos con meses cortos".
    it('reject days 29 to 31, which do not exist in every month', () => {
      for (const dia of [29, 30, 31]) {
        const result = AsignarDiaVencimientoDto.safeParse({
          dia_vencimiento: dia,
        });

        expect(result.success).toBe(false);
        expect(result.error?.issues[0].message).toContain(
          `${DIA_VENCIMIENTO_MIN} y ${DIA_VENCIMIENTO_MAX}`,
        );
      }
    });

    it('reject 0 and negative days naming the valid range', () => {
      for (const dia of [0, -1]) {
        const result = AsignarDiaVencimientoDto.safeParse({
          dia_vencimiento: dia,
        });

        expect(result.success).toBe(false);
        expect(result.error?.issues[0].message).toContain(
          `${DIA_VENCIMIENTO_MIN} y ${DIA_VENCIMIENTO_MAX}`,
        );
      }
    });

    it('reject a day with decimals', () => {
      const result = AsignarDiaVencimientoDto.safeParse({
        dia_vencimiento: 15.5,
      });

      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain('entero');
    });

    it('reject non-numeric values and a missing field', () => {
      expect(
        AsignarDiaVencimientoDto.safeParse({ dia_vencimiento: '15' }).success,
      ).toBe(false);
      expect(AsignarDiaVencimientoDto.safeParse({}).success).toBe(false);
    });
  });
});
