import { jest, beforeEach, describe, it, expect } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { ContratacionesController } from './contrataciones.controller.js';
import { ContratacionesService } from './contrataciones.service.js';
import { ContratacionDto } from './dto/contratacion.dto.js';

const RUT_VALIDO = '111111111';

const DTO_VALIDO: ContratacionDto = {
  nombre_completo: 'Juan Pérez',
  rut: RUT_VALIDO,
  email: 'juan@example.com',
  telefono: '+56912345678',
  id_plan: 1,
  direccion_completa: 'Av. Siempre Viva 742',
  comuna: 'Providencia',
  ciudad: 'Santiago',
};

const RESPUESTA_MOCK = { id_cliente: 10, id_contrato: 20, id_ot: 30 };

describe('ContratacionesController', () => {
  let controller: ContratacionesController;
  let service: jest.Mocked<ContratacionesService>;

  beforeEach(async () => {
    const mockService = {
      crear: jest.fn().mockResolvedValue(RESPUESTA_MOCK),
    };
    const module = await Test.createTestingModule({
      controllers: [ContratacionesController],
      providers: [{ provide: ContratacionesService, useValue: mockService }],
    }).compile();
    controller = module.get(ContratacionesController);
    service = module.get(ContratacionesService);
  });

  describe('POST /contrataciones', () => {
    it('llama al service.crear con el DTO validado y retorna 201', async () => {
      const result = await controller.crear(DTO_VALIDO);

      expect(service.crear).toHaveBeenCalledWith(DTO_VALIDO);
      expect(result).toEqual(RESPUESTA_MOCK);
    });

    it('el endpoint usa @HttpCode(201)', () => {
      const metadata = Reflect.getMetadata(
        '__httpCode__',
        ContratacionesController.prototype.crear,
      );
      expect(metadata).toBe(201);
    });
  });

  describe('Validación del DTO con Zod', () => {
    it('rechaza RUT inválido', () => {
      const result = ContratacionDto.safeParse({
        ...DTO_VALIDO,
        rut: '123',
      });
      expect(result.success).toBe(false);
    });

    it('rechaza email inválido', () => {
      const result = ContratacionDto.safeParse({
        ...DTO_VALIDO,
        email: 'no-es-email',
      });
      expect(result.success).toBe(false);
    });

    it('rechaza id_plan no positivo', () => {
      const result = ContratacionDto.safeParse({
        ...DTO_VALIDO,
        id_plan: 0,
      });
      expect(result.success).toBe(false);
    });

    it('rechaza nombre_completo vacío', () => {
      const result = ContratacionDto.safeParse({
        ...DTO_VALIDO,
        nombre_completo: '',
      });
      expect(result.success).toBe(false);
    });

    it('rechaza direccion_completa vacía', () => {
      const result = ContratacionDto.safeParse({
        ...DTO_VALIDO,
        direccion_completa: '',
      });
      expect(result.success).toBe(false);
    });

    it('acepta telefono y ciudad como opcionales', () => {
      const result = ContratacionDto.safeParse({
        nombre_completo: 'Juan Pérez',
        rut: RUT_VALIDO,
        email: 'juan@example.com',
        id_plan: 1,
        direccion_completa: 'Av. Siempre Viva 742',
        comuna: 'Providencia',
      });
      expect(result.success).toBe(true);
    });

    it('acepta telefono y ciudad como null', () => {
      const result = ContratacionDto.safeParse({
        nombre_completo: 'Juan Pérez',
        rut: RUT_VALIDO,
        email: 'juan@example.com',
        telefono: null,
        id_plan: 1,
        direccion_completa: 'Av. Siempre Viva 742',
        comuna: 'Providencia',
        ciudad: null,
      });
      expect(result.success).toBe(true);
    });

    it('transforma RUT limpiando puntos y guión', () => {
      const result = ContratacionDto.parse({
        ...DTO_VALIDO,
        rut: '11.111.111-1',
      });
      expect(result.rut).toBe(RUT_VALIDO);
    });
  });
});
