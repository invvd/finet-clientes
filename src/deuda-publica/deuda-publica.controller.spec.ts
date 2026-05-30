import { jest, beforeEach, describe, it, expect } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DeudaPublicaController } from './deuda-publica.controller.js';
import { DeudaPublicaService } from './deuda-publica.service.js';

const respuestaVacia = {
  encontrado: false,
  cliente: null,
  tiene_deuda: false,
  saldo_total: 0,
  facturas: [],
};

describe('DeudaPublicaController', () => {
  let controller: DeudaPublicaController;
  let service: jest.Mocked<DeudaPublicaService>;

  beforeEach(async () => {
    const mockService = {
      consultarPorRut: jest.fn().mockResolvedValue(respuestaVacia),
      consultarPorAbonado: jest.fn().mockResolvedValue(respuestaVacia),
    };
    const module = await Test.createTestingModule({
      controllers: [DeudaPublicaController],
      providers: [{ provide: DeudaPublicaService, useValue: mockService }],
    }).compile();
    controller = module.get(DeudaPublicaController);
    service = module.get(DeudaPublicaService);
  });

  it('rechaza RUT con formato inválido', () => {
    expect(() => controller.consultarPorRut({ rut: 'abc' })).toThrow(BadRequestException);
  });

  it('acepta RUT válido y llama al service', async () => {
    await controller.consultarPorRut({ rut: '12.345.678-9' });
    expect(service.consultarPorRut).toHaveBeenCalledWith('12.345.678-9');
  });

  it('rechaza código de abonado vacío', () => {
    expect(() => controller.consultarPorAbonado({ codigo_abonado: '' })).toThrow(BadRequestException);
  });

  it('rechaza código de abonado no numérico', () => {
    expect(() => controller.consultarPorAbonado({ codigo_abonado: 'abc' })).toThrow(BadRequestException);
  });

  it('acepta código numérico y llama al service', async () => {
    await controller.consultarPorAbonado({ codigo_abonado: '123' });
    expect(service.consultarPorAbonado).toHaveBeenCalledWith(123);
  });
});
