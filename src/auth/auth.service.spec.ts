import { jest, beforeEach, describe, it, expect } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';

jest.unstable_mockModule('bcrypt', () => ({
  default: { compare: jest.fn(), hash: jest.fn() },
  compare: jest.fn(),
  hash: jest.fn(),
}));

const { AuthService } = await import('./auth.service.js');
const bcrypt = await import('bcrypt');

describe('AuthService', () => {
  let authService: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockCliente = {
    id_cliente: 1,
    rut: '123456785',
    nombre_completo: 'Juan Pérez',
    email: 'juan@test.cl',
    telefono: '912345678',
    password_portal_hash: 'hashedpassword',
    estado: 'activo',
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            cliente: { findUnique: jest.fn(), create: jest.fn() },
            sesion_portal: { create: jest.fn(), updateMany: jest.fn() },
            intento_fallido: {
              findFirst: jest.fn().mockResolvedValue(null),
              count: jest.fn().mockResolvedValue(0),
              create: jest.fn(),
              deleteMany: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn().mockResolvedValue('mock-token') },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('login', () => {
    it('return token and cliente when credentials are valid', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prisma.cliente.findUnique as jest.Mock).mockResolvedValue(mockCliente);
      (jwtService.signAsync as jest.Mock).mockResolvedValue('jwt-token');

      const result = await authService.login(
        '12.345.678-5',
        'password',
        '127.0.0.1',
      );

      expect(result).toHaveProperty('access_token', 'jwt-token');
      expect(result).toHaveProperty('cliente');
      expect(result.cliente.rut).toBe('123456785');
    });

    it('throw UnauthorizedException when cliente not found', async () => {
      (prisma.cliente.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.login('99.999.999-9', 'password', '127.0.0.1'),
      ).rejects.toThrow('RUT o contraseña incorrectos');
    });

    it('throw UnauthorizedException when cliente has no password', async () => {
      (prisma.cliente.findUnique as jest.Mock).mockResolvedValue({
        ...mockCliente,
        password_portal_hash: null,
      });

      await expect(
        authService.login('12.345.678-5', 'password', '127.0.0.1'),
      ).rejects.toThrow('RUT o contraseña incorrectos');
    });

    it('throw UnauthorizedException when password is wrong', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      (prisma.cliente.findUnique as jest.Mock).mockResolvedValue(mockCliente);

      await expect(
        authService.login('12.345.678-5', 'wrongpassword', '127.0.0.1'),
      ).rejects.toThrow('RUT o contraseña incorrectos');
    });
  });

  describe('register', () => {
    it('create cliente and return token', async () => {
      const mockCreated = {
        id_cliente: 2,
        rut: '876543210',
        nombre_completo: 'Nuevo Cliente',
        email: 'nuevo@test.cl',
        telefono: '998877665',
        password_portal_hash: 'hashed',
        estado: 'activo',
        id_empresa: 1,
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      (prisma.cliente.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.cliente.create as jest.Mock).mockResolvedValue(mockCreated);
      (jwtService.signAsync as jest.Mock).mockResolvedValue('register-jwt');

      const result = await authService.register(
        '12.345.678-5',
        'Nuevo Cliente',
        'password123',
        'nuevo@test.cl',
        '998877665',
        '127.0.0.1',
      );

      expect(prisma.cliente.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          rut: '123456785',
          nombre_completo: 'Nuevo Cliente',
          email: 'nuevo@test.cl',
          telefono: '998877665',
          password_portal_hash: 'hashed-password',
          id_empresa: 1,
          estado: 'activo',
        }),
      });

      expect(result).toHaveProperty('access_token', 'register-jwt');
      expect(result.cliente).toMatchObject({
        id: 2,
        rut: '876543210',
        nombre_completo: 'Nuevo Cliente',
        email: 'nuevo@test.cl',
        telefono: '998877665',
      });
    });

    it('throw ConflictException when RUT already exists', async () => {
      (prisma.cliente.findUnique as jest.Mock).mockResolvedValue(mockCliente);

      await expect(
        authService.register('12.345.678-5', 'Otro', 'password123'),
      ).rejects.toThrow('El RUT ya está registrado');
    });

    it('set email and telefono to null when empty string', async () => {
      const mockCreated = {
        id_cliente: 3,
        rut: '111111111',
        nombre_completo: 'Sin Contacto',
        email: null,
        telefono: null,
        password_portal_hash: 'hashed',
        estado: 'activo',
        id_empresa: 1,
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      (prisma.cliente.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.cliente.create as jest.Mock).mockResolvedValue(mockCreated);
      (jwtService.signAsync as jest.Mock).mockResolvedValue('jwt');

      await authService.register('11.111.111-1', 'Sin Contacto', 'password123', '', '');

      expect(prisma.cliente.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: null,
          telefono: null,
        }),
      });
    });

    it('create session after register', async () => {
      const mockCreated = {
        id_cliente: 4,
        rut: '222222222',
        nombre_completo: 'Con Sesion',
        email: null,
        telefono: null,
        password_portal_hash: 'hashed',
        estado: 'activo',
        id_empresa: 1,
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      (prisma.cliente.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.cliente.create as jest.Mock).mockResolvedValue(mockCreated);
      (jwtService.signAsync as jest.Mock).mockResolvedValue('session-jwt');

      await authService.register('22.222.222-2', 'Con Sesion', 'password123');

      expect(prisma.sesion_portal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id_cliente: 4,
          token: 'session-jwt',
        }),
      });
    });
  });

  describe('logout', () => {
    it('mark session as expired', async () => {
      const updateMany = jest
        .spyOn(prisma.sesion_portal, 'updateMany')
        .mockResolvedValue({ count: 1 } as any);

      await authService.logout(1, 'some-token');

      expect(updateMany).toHaveBeenCalledWith({
        where: {
          id_cliente: 1,
          token: 'some-token',
          fecha_expiracion: { gt: expect.any(Date) },
        },
        data: { fecha_expiracion: expect.any(Date) },
      });
    });
  });

  describe('bloqueo por intentos fallidos', () => {
    it('bloquear despues de 5 intentos en 10 minutos', async () => {
      (prisma.intento_fallido.count as jest.Mock).mockResolvedValue(4);
      (prisma.cliente.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.login('12.345.678-5', 'password', '127.0.0.1'),
      ).rejects.toThrow('RUT o contraseña incorrectos');

      expect(prisma.intento_fallido.create).toHaveBeenCalled();
    });
  });
});
