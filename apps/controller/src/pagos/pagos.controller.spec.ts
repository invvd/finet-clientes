import { fileURLToPath } from 'node:url';
import { jest, beforeEach, describe, it, expect } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { StreamableFile } from '@nestjs/common';
import { PagosController } from './pagos.controller.js';
import { PagosService } from './pagos.service.js';
import { ApiKeyGuard } from '../admin/guards/api-key.guard.js';
import type { RegistrarPagoDto } from './dto/pagos.dto.js';
import type { IncorporarAbonoExternoDto } from './dto/abonos-externos.dto.js';

// Ruta a un archivo real (este mismo spec) para que createReadStream no falle
// al abrirlo — evita tener que mockear node:fs solo para este test.
const ARCHIVO_REAL_DE_PRUEBA = fileURLToPath(import.meta.url);

describe('PagosController', () => {
  let pagosController: PagosController;
  let mockPagosService: {
    registrarPagoConfirmado: jest.Mock;
    getPagosRechazados: jest.Mock;
    incorporarAbonoExterno: jest.Mock;
    listarPagos: jest.Mock;
    obtenerRutaComprobante: jest.Mock;
  };

  beforeEach(async () => {
    mockPagosService = {
      registrarPagoConfirmado: jest.fn(),
      getPagosRechazados: jest.fn(),
      incorporarAbonoExterno: jest.fn(),
      listarPagos: jest.fn(),
      obtenerRutaComprobante: jest.fn(),
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

  describe('POST /admin/pagos/abonos-externos', () => {
    const dto: IncorporarAbonoExternoDto = {
      codigo_abonado: 100,
      monto: 19990,
      fecha_pago: '2026-06-10T12:00:00.000Z',
      codigo_transaccion: 'EXT-0001',
      pasarela: 'servipag',
    };

    it('CU-46: delega en el service con el body y la IP de la request', async () => {
      const mockResult = { id_pago: 2, ...dto };
      mockPagosService.incorporarAbonoExterno.mockResolvedValue(mockResult);

      const response = await pagosController.incorporarAbono(dto, {
        ip: '10.0.0.5',
      } as never);

      expect(response).toEqual(mockResult);
      expect(mockPagosService.incorporarAbonoExterno).toHaveBeenCalledWith(
        dto,
        '10.0.0.5',
      );
    });

    it('usa 0.0.0.0 si la request no trae IP', async () => {
      mockPagosService.incorporarAbonoExterno.mockResolvedValue({});

      await pagosController.incorporarAbono(dto, {} as never);

      expect(mockPagosService.incorporarAbonoExterno).toHaveBeenCalledWith(
        dto,
        '0.0.0.0',
      );
    });
  });

  describe('GET /admin/pagos/rechazados', () => {
    it('CU-45: delega en el service con la query recibida', async () => {
      const mockResult = { data: [], total: 0, page: 1, limit: 20 };
      mockPagosService.getPagosRechazados.mockResolvedValue(mockResult);

      const response = await pagosController.getRechazados({
        page: 1,
        limit: 20,
      });

      expect(response).toEqual(mockResult);
      expect(mockPagosService.getPagosRechazados).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
      });
    });

    it('CU-45: pasa el filtro de codigo_transaccion al service', async () => {
      mockPagosService.getPagosRechazados.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      await pagosController.getRechazados({
        codigo_transaccion: 'TX-0001',
        page: 1,
        limit: 20,
      });

      expect(mockPagosService.getPagosRechazados).toHaveBeenCalledWith({
        codigo_transaccion: 'TX-0001',
        page: 1,
        limit: 20,
      });
    });
  });

  describe('GET /admin/pagos (listado, CU-52)', () => {
    it('delega en el service con la query recibida', async () => {
      const mockResult = { data: [], total: 0, page: 1, limit: 20 };
      mockPagosService.listarPagos.mockResolvedValue(mockResult);

      const response = await pagosController.listar({ page: 1, limit: 20 });

      expect(response).toEqual(mockResult);
      expect(mockPagosService.listarPagos).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
      });
    });
  });

  describe('GET /admin/pagos/:id_pago/comprobante (CU-52)', () => {
    it('resuelve la ruta vía el service y retorna un StreamableFile', async () => {
      mockPagosService.obtenerRutaComprobante.mockResolvedValue(
        ARCHIVO_REAL_DE_PRUEBA,
      );

      const result = await pagosController.descargarComprobante(1);

      expect(mockPagosService.obtenerRutaComprobante).toHaveBeenCalledWith(1);
      expect(result).toBeInstanceOf(StreamableFile);
    });
  });
});
