import { jest, beforeEach, describe, it, expect } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { CoberturaController } from './cobertura.controller.js';
import { CoberturaService } from './cobertura.service.js';
import {
  consultaPuntosCoberturaSchema,
  crearPuntoCoberturaSchema,
  actualizarPuntoCoberturaSchema,
  listarPuntosCoberturaSchema,
} from './dto/cobertura.dto.js';

describe('CoberturaController', () => {
  let controller: CoberturaController;
  let service: jest.Mocked<CoberturaService>;

  beforeEach(async () => {
    const mockService = {
      getConfig: jest.fn().mockReturnValue({ zoom_inicial: 12 }),
      getPuntos: jest.fn().mockResolvedValue([]),
    };
    const module = await Test.createTestingModule({
      controllers: [CoberturaController],
      providers: [{ provide: CoberturaService, useValue: mockService }],
    }).compile();
    controller = module.get(CoberturaController);
    service = module.get(CoberturaService);
  });

  describe('CU-59: GET /cobertura/config', () => {
    it('delega en el service', () => {
      controller.getConfig();
      expect(service.getConfig).toHaveBeenCalled();
    });
  });

  describe('CU-60: GET /cobertura/puntos', () => {
    it('llama al service sin filtro cuando no hay query param', async () => {
      const query = consultaPuntosCoberturaSchema.parse({});
      await controller.getPuntos(query);
      expect(service.getPuntos).toHaveBeenCalledWith(undefined);
    });

    it('propaga el filtro de tipo_cobertura', async () => {
      const query = consultaPuntosCoberturaSchema.parse({
        tipo_cobertura: 'fibra',
      });
      await controller.getPuntos(query);
      expect(service.getPuntos).toHaveBeenCalledWith('fibra');
    });
  });
});

describe('DTOs de cobertura', () => {
  it('rechaza coordenadas fuera del rango geografico', () => {
    expect(
      crearPuntoCoberturaSchema.safeParse({ latitud: 120, longitud: -70.6 })
        .success,
    ).toBe(false);
    expect(
      crearPuntoCoberturaSchema.safeParse({ latitud: -33.6, longitud: 200 })
        .success,
    ).toBe(false);
  });

  it('acepta un punto valido con densidad y tipo opcionales', () => {
    expect(
      crearPuntoCoberturaSchema.safeParse({ latitud: -33.6, longitud: -70.6 })
        .success,
    ).toBe(true);
  });

  it('rechaza un update vacio', () => {
    expect(actualizarPuntoCoberturaSchema.safeParse({}).success).toBe(false);
  });

  it('aplica page y limit por defecto en el listado admin', () => {
    const query = listarPuntosCoberturaSchema.parse({});
    expect(query.page).toBe(1);
    expect(query.limit).toBe(50);
  });

  it('acota el limit del listado admin', () => {
    expect(listarPuntosCoberturaSchema.safeParse({ limit: 5000 }).success).toBe(
      false,
    );
  });
});
