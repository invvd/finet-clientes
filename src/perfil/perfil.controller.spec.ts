import { jest, beforeEach, describe, it, expect } from '@jest/globals';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import { PerfilController } from './perfil.controller.js';
import { PerfilService } from './perfil.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import {
  ActualizarTelefonoDto,
  ActualizarEmailDto,
  CambiarPasswordDto,
} from './dto/perfil.dto.js';

const CLIENTE_MOCK = {
  id_cliente: 1,
  nombre_completo: 'Juan Perez',
  rut: '12.345.678-9',
  email: 'juan@example.com',
  telefono: '+56912345678',
  estado: 'activo',
};

const PERFIL_MOCK = {
  id_cliente: 1,
  nombre_completo: 'Juan Perez',
  rut: '12.345.678-9',
  email: 'juan@example.com',
  telefono: '+56912345678',
  fecha_creacion: '2024-01-01T00:00:00.000Z',
};

describe('PerfilController', () => {
  let controller: PerfilController;
  let service: jest.Mocked<PerfilService>;

  beforeEach(async () => {
    const mockService = {
      getPerfil: jest.fn().mockResolvedValue(PERFIL_MOCK),
      actualizarTelefono: jest.fn().mockResolvedValue(PERFIL_MOCK),
      actualizarEmail: jest.fn().mockResolvedValue(PERFIL_MOCK),
      cambiarPassword: jest
        .fn()
        .mockResolvedValue({ mensaje: 'Contrasena actualizada correctamente' }),
    };

    const module = await Test.createTestingModule({
      controllers: [PerfilController],
      providers: [{ provide: PerfilService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(PerfilController);
    service = module.get(PerfilService);
  });

  describe('GET /auth/perfil', () => {
    it('CU-07: llama getPerfil con el id del cliente autenticado', async () => {
      await controller.getPerfil(CLIENTE_MOCK as any);
      expect(service.getPerfil).toHaveBeenCalledWith(1);
    });
  });

  describe('PATCH /auth/perfil/telefono', () => {
    it('CU-08: llama actualizarTelefono con id, body e ip', async () => {
      const body = ActualizarTelefonoDto.parse({
        password_actual: 'Password1',
        telefono: '+56987654321',
      });
      const req = { ip: '127.0.0.1' } as Request;

      await controller.actualizarTelefono(CLIENTE_MOCK as any, body, req);

      expect(service.actualizarTelefono).toHaveBeenCalledWith(
        1,
        body,
        '127.0.0.1',
      );
    });
  });

  describe('PATCH /auth/perfil/email', () => {
    it('CU-09: llama actualizarEmail con id, body e ip', async () => {
      const body = ActualizarEmailDto.parse({
        password_actual: 'Password1',
        email: 'nuevo@test.cl',
      });
      const req = { ip: '127.0.0.1' } as Request;

      await controller.actualizarEmail(CLIENTE_MOCK as any, body, req);

      expect(service.actualizarEmail).toHaveBeenCalledWith(
        1,
        body,
        '127.0.0.1',
      );
    });
  });

  describe('PATCH /auth/perfil/password', () => {
    it('CU-10/11: llama cambiarPassword con id, body e ip', async () => {
      const body = CambiarPasswordDto.parse({
        password_actual: 'OldPass1',
        password_nuevo: 'NewPass2!',
        password_confirmacion: 'NewPass2!',
      });
      const req = { ip: '127.0.0.1' } as Request;

      await controller.cambiarPassword(CLIENTE_MOCK as any, body, req);

      expect(service.cambiarPassword).toHaveBeenCalledWith(
        1,
        body,
        '127.0.0.1',
      );
    });
  });
});
