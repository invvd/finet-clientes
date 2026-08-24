import { jest, beforeEach, describe, it, expect } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { PagosController } from './pagos.controller.js';
import { PagosService } from './pagos.service.js';
import { ApiKeyGuard } from '../admin/guards/api-key.guard.js';
import type { RegistrarPagoDto } from './dto/pagos.dto.js';

describe('PagosController', () => {
  let pagosController: PagosController;
  let mockPagosService: { registrarPagoConfirmado: jest.Mock };

  beforeEach(async () => {
    mockPagosService = {
      registrarPagoConfirmado: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [PagosController],
      providers: [{ provide: PagosService, useValue: mockPagosService }],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    pagosController = module.get<PagosController>(PagosController);
  });

  describe('POST /admin/pagos/confirmar', () => {
    const dto: RegistrarPagoDto = {
      id_factura: 201,
      monto: 19990,
      fecha_pago: '2026-06-10T12:00:00.000Z',
      codigo_transaccion: 'TX-0001',
      pasarela: 'recaudacion-externa',
    };

    it('CU-44: delega en el service con el body y la IP de la request', async () => {
      const mockResult = { id_pago: 1, ...dto };
      mockPagosService.registrarPagoConfirmado.mockResolvedValue(mockResult);

      const response = await pagosController.confirmar(dto, {
        ip: '10.0.0.5',
      } as never);

      expect(response).toEqual(mockResult);
      expect(mockPagosService.registrarPagoConfirmado).toHaveBeenCalledWith(
        dto,
        '10.0.0.5',
      );
    });

    it('usa 0.0.0.0 si la request no trae IP', async () => {
      mockPagosService.registrarPagoConfirmado.mockResolvedValue({});

      await pagosController.confirmar(dto, {} as never);

      expect(mockPagosService.registrarPagoConfirmado).toHaveBeenCalledWith(
        dto,
        '0.0.0.0',
      );
    });
  });
});
