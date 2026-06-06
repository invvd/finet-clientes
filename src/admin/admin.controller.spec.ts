import { jest, beforeEach, describe, it, expect } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { ApiKeyGuard } from './guards/api-key.guard.js';

describe('AdminController', () => {
  let adminController: AdminController;
  let mockAdminService: {
    getIntentosFallidos: jest.Mock;
    desbloquearIp: jest.Mock;
  };

  beforeEach(async () => {
    mockAdminService = {
      getIntentosFallidos: jest.fn(),
      desbloquearIp: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: mockAdminService }],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    adminController = module.get<AdminController>(AdminController);
  });

  describe('GET /admin/intentos-fallidos', () => {
    it('return paginated list with default query', async () => {
      const mockResult = {
        data: [
          {
            id_intento: '1',
            rut_intentado: '123456785',
            ip_address: '192.168.1.1',
            timestamp: '2026-06-01T10:00:00.000Z',
            bloqueado_hasta: null,
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      };
      mockAdminService.getIntentosFallidos.mockResolvedValue(mockResult);

      const response = await adminController.getIntentosFallidos({
        page: 1,
        limit: 20,
      });

      expect(response).toEqual(mockResult);
      expect(mockAdminService.getIntentosFallidos).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
      });
    });

    it('pass filters to service', async () => {
      const mockResult = { data: [], total: 0, page: 1, limit: 20 };
      mockAdminService.getIntentosFallidos.mockResolvedValue(mockResult);

      await adminController.getIntentosFallidos({
        rut: '123456785',
        ip: '192.168.1.50',
        bloqueados: 'true',
        page: 1,
        limit: 10,
      });

      expect(mockAdminService.getIntentosFallidos).toHaveBeenCalledWith({
        rut: '123456785',
        ip: '192.168.1.50',
        bloqueados: 'true',
        page: 1,
        limit: 10,
      });
    });
  });

  describe('POST /admin/intentos-fallidos/desbloquear-ip', () => {
    it('unblock IP and return result', async () => {
      const mockResult = {
        desbloqueado: true,
        registros_afectados: 3,
      };
      mockAdminService.desbloquearIp.mockResolvedValue(mockResult);

      const response = await adminController.desbloquearIp({
        ip: '192.168.1.50',
      });

      expect(response).toEqual(mockResult);
      expect(mockAdminService.desbloquearIp).toHaveBeenCalledWith(
        '192.168.1.50',
      );
    });

    it('return desbloqueado=false when IP not blocked', async () => {
      const mockResult = {
        desbloqueado: false,
        registros_afectados: 0,
      };
      mockAdminService.desbloquearIp.mockResolvedValue(mockResult);

      const response = await adminController.desbloquearIp({
        ip: '10.0.0.1',
      });

      expect(response).toEqual(mockResult);
    });
  });
});
