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
const { MailService } = await import('../mail/mail.service.js');

describe('AuthService', () => {
  let authService: InstanceType<typeof AuthService>;
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
            cliente: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            sesion_portal: {
              create: jest.fn(),
              updateMany: jest.fn(),
              deleteMany: jest.fn(),
            },
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
          useValue: {
            signAsync: jest.fn().mockResolvedValue('mock-token'),
            verify: jest.fn(),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendPasswordReset: jest.fn().mockResolvedValue(undefined),
            sendPasswordChanged: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    authService = module.get(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('login', () => {
    it('return token and cliente when credentials are valid', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prisma.cliente.findUnique as jest.Mock).mockResolvedValue(mockCliente);
      (jwtService.signAsync as jest.Mock).mockResolvedValue('jwt-token');

      const result = await authService.login(
        '123456785',
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
        authService.login('999999999', 'password', '127.0.0.1'),
      ).rejects.toThrow('RUT o contraseña incorrectos');
    });

    it('throw UnauthorizedException when cliente has no password', async () => {
      (prisma.cliente.findUnique as jest.Mock).mockResolvedValue({
        ...mockCliente,
        password_portal_hash: null,
      });

      await expect(
        authService.login('123456785', 'password', '127.0.0.1'),
      ).rejects.toThrow('RUT o contraseña incorrectos');
    });

    it('throw UnauthorizedException when password is wrong', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      (prisma.cliente.findUnique as jest.Mock).mockResolvedValue(mockCliente);

      await expect(
        authService.login('123456785', 'wrongpassword', '127.0.0.1'),
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
      (prisma.cliente.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.cliente.create as jest.Mock).mockResolvedValue(mockCreated);
      (jwtService.signAsync as jest.Mock).mockResolvedValue('register-jwt');

      const result = await authService.register(
        '123456785',
        'Nuevo Cliente',
        'Password1',
        '127.0.0.1',
        'nuevo@test.cl',
        '998877665',
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
        authService.register(
          '123456785',
          'Otro',
          'Password1',
          '0.0.0.0',
          'otro@test.cl',
        ),
      ).rejects.toThrow('No se pudo completar el registro');
    });

    it('throw ConflictException when email already exists', async () => {
      (prisma.cliente.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.cliente.findFirst as jest.Mock).mockResolvedValue(mockCliente);

      await expect(
        authService.register(
          '999999999',
          'Duplicado',
          'Password1',
          '0.0.0.0',
          'juan@test.cl',
        ),
      ).rejects.toThrow('No se pudo completar el registro');
    });

    it('create session after register', async () => {
      const mockCreated = {
        id_cliente: 4,
        rut: '222222222',
        nombre_completo: 'Con Sesion',
        email: 'sesion@test.cl',
        telefono: null,
        password_portal_hash: 'hashed',
        estado: 'activo',
        id_empresa: 1,
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      (prisma.cliente.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.cliente.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.cliente.create as jest.Mock).mockResolvedValue(mockCreated);
      (jwtService.signAsync as jest.Mock).mockResolvedValue('session-jwt');

      await authService.register(
        '222222222',
        'Con Sesion',
        'Password1',
        '0.0.0.0',
        'sesion@test.cl',
      );

      expect(prisma.sesion_portal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id_cliente: 4,
          token: 'session-jwt',
        }),
      });
    });

    it('set session expiration within 15 minutes from now', async () => {
      const mockCreated = {
        id_cliente: 5,
        rut: '333333333',
        nombre_completo: 'Expiracion',
        email: 'exp@test.cl',
        telefono: null,
        password_portal_hash: 'hashed',
        estado: 'activo',
        id_empresa: 1,
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      (prisma.cliente.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.cliente.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.cliente.create as jest.Mock).mockResolvedValue(mockCreated);
      (jwtService.signAsync as jest.Mock).mockResolvedValue('jwt');

      const beforeCall = Date.now();
      await authService.register(
        '333333333',
        'Expiracion',
        'Password1',
        '0.0.0.0',
        'exp@test.cl',
      );
      const afterCall = Date.now();

      const createCall = (prisma.sesion_portal.create as jest.Mock).mock
        .calls[0][0];
      const fechaExpiracion = new Date(
        createCall.data.fecha_expiracion,
      ).getTime();

      const expectedMin = beforeCall + 14 * 60 * 1000;
      const expectedMax = afterCall + 15 * 60 * 1000;

      expect(fechaExpiracion).toBeGreaterThanOrEqual(expectedMin);
      expect(fechaExpiracion).toBeLessThanOrEqual(expectedMax);
    });
  });

  describe('recuperarPassword', () => {
    it('return generic message when RUT exists with email', async () => {
      (prisma.cliente.findUnique as jest.Mock).mockResolvedValue(mockCliente);
      (jwtService.signAsync as jest.Mock).mockResolvedValue('reset-token');

      const result = await authService.recuperarPassword('123456785');

      expect(result).toHaveProperty('message');
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: 1, type: 'reset' },
        { expiresIn: '15m' },
      );
    });

    it('return generic message when RUT not found', async () => {
      (prisma.cliente.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await authService.recuperarPassword('999999999');

      expect(result).toHaveProperty('message');
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('restablecerPassword', () => {
    it('update password and invalidate sessions on valid token', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue({
        sub: 1,
        type: 'reset',
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
      (prisma.cliente.update as jest.Mock).mockResolvedValue({
        id_cliente: 1,
        email: 'juan@test.cl',
        nombre_completo: 'Juan Pérez',
      });

      const result = await authService.restablecerPassword(
        'reset-token',
        'NewPass1',
      );

      expect(prisma.cliente.update).toHaveBeenCalledWith({
        where: { id_cliente: 1 },
        data: { password_portal_hash: 'new-hash' },
      });
      expect(result).toEqual({
        message: 'Contraseña restablecida exitosamente',
      });
    });

    it('throw BadRequestException on expired token', async () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(
        authService.restablecerPassword('expired-token', 'NewPass1'),
      ).rejects.toThrow('Token inválido o expirado');
    });

    it('throw BadRequestException when token type is not reset', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue({
        sub: 1,
        type: 'login',
      });

      await expect(
        authService.restablecerPassword('session-token', 'NewPass1'),
      ).rejects.toThrow('Token inválido');
    });
  });

  describe('logout', () => {
    it('delete session from database', async () => {
      const deleteMany = jest
        .spyOn(prisma.sesion_portal, 'deleteMany')
        .mockResolvedValue({ count: 1 });

      await authService.logout(1, 'some-token');

      expect(deleteMany).toHaveBeenCalledWith({
        where: {
          id_cliente: 1,
          token: 'some-token',
        },
      });
    });
  });

  describe('bloqueo por intentos fallidos', () => {
    it('bloquear RUT despues de 5 intentos en 10 minutos', async () => {
      (prisma.intento_fallido.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.intento_fallido.count as jest.Mock)
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(0);
      (prisma.cliente.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.login('123456785', 'password', '127.0.0.1'),
      ).rejects.toThrow('RUT o contraseña incorrectos');

      const createCall = (prisma.intento_fallido.create as jest.Mock).mock
        .calls[0][0];
      expect(createCall.data.bloqueado_hasta).toBeDefined();
    });

    it('bloquear IP despues de 5 intentos en 5 minutos', async () => {
      (prisma.intento_fallido.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.intento_fallido.count as jest.Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(4);
      (prisma.cliente.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.login('999999999', 'password', '192.168.1.1'),
      ).rejects.toThrow('RUT o contraseña incorrectos');

      const createCall = (prisma.intento_fallido.create as jest.Mock).mock
        .calls[0][0];
      expect(createCall.data.bloqueado_hasta).toBeDefined();
      expect(createCall.data.ip_address).toBe('192.168.1.1');
    });

    it('rechazar login cuando IP esta bloqueada', async () => {
      (prisma.intento_fallido.findFirst as jest.Mock).mockResolvedValue({
        id_intento: 1n,
        bloqueado_hasta: new Date(Date.now() + 600000),
        ip_address: '10.0.0.5',
      });

      await expect(
        authService.login('123456785', 'password', '10.0.0.5'),
      ).rejects.toThrow('IP bloqueada temporalmente');
    });

    it('rechazar login cuando RUT esta bloqueado', async () => {
      (prisma.intento_fallido.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id_intento: 2n,
          bloqueado_hasta: new Date(Date.now() + 600000),
          rut_intentado: '123456785',
        });

      await expect(
        authService.login('123456785', 'password', '127.0.0.1'),
      ).rejects.toThrow('RUT bloqueado temporalmente');
    });
  });
});
