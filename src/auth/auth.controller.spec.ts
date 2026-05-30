import { jest, beforeEach, describe, it, expect } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

describe('AuthController', () => {
  let authController: AuthController;
  let mockAuthService: { login: jest.Mock; logout: jest.Mock; register: jest.Mock };

  const mockCliente = {
    id: 1,
    rut: '123456785',
    nombre_completo: 'Juan Pérez',
    email: 'juan@test.cl',
    telefono: '912345678',
    estado: 'activo',
  };

  beforeEach(async () => {
    mockAuthService = {
      login: jest.fn<any>(),
      logout: jest.fn<any>(),
      register: jest.fn<any>(),
    };

    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard({ token: 'jwt' } as any)
      .useValue({ canActivate: () => true })
      .compile();

    authController = module.get<AuthController>(AuthController);
  });

  describe('POST /auth/login', () => {
    it('return access_token and cliente on valid credentials', async () => {
      const result = {
        access_token: 'jwt-token',
        cliente: mockCliente,
      };
      mockAuthService.login.mockResolvedValue(result);

      const response = await authController.login(
        {
          rut: '12.345.678-5',
          password: 'password',
        },
        { ip: '127.0.0.1' } as any,
      );

      expect(response).toEqual(result);
      expect(mockAuthService.login).toHaveBeenCalledWith(
        '12.345.678-5',
        'password',
        '127.0.0.1',
      );
    });
  });

  describe('POST /auth/register', () => {
    it('call register service and return access_token + cliente', async () => {
      const result = {
        access_token: 'register-jwt',
        cliente: { id: 2, rut: '123456785', nombre_completo: 'Nuevo', email: null, telefono: null },
      };
      mockAuthService.register.mockResolvedValue(result);

      const response = await authController.register(
        {
          rut: '12.345.678-5',
          nombre_completo: 'Nuevo',
          password: 'password123',
          email: '',
          telefono: '',
        },
        { ip: '127.0.0.1' } as any,
      );

      expect(response).toEqual(result);
      expect(mockAuthService.register).toHaveBeenCalledWith(
        '12.345.678-5',
        'Nuevo',
        'password123',
        '',
        '',
        '127.0.0.1',
      );
    });
  });

  describe('POST /auth/logout', () => {
    it('return success message and call logout', async () => {
      mockAuthService.logout.mockImplementation(async () => {
        // en la implementación real se invalida la sesión
      });

      const req = { headers: { authorization: 'Bearer test-token' } };
      const response = await authController.logout(
        { id_cliente: 1 } as any,
        req as any,
      );

      expect(response).toEqual({ message: 'Sesión cerrada exitosamente' });
      expect(mockAuthService.logout).toHaveBeenCalledWith(1, 'test-token');
    });
  });

  describe('GET /auth/me', () => {
    it('return authenticated client', () => {
      const response = authController.getProfile(mockCliente as any);
      expect(response).toEqual(mockCliente);
    });
  });
});
