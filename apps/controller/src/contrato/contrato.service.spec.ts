import { jest, beforeEach, describe, it, expect } from '@jest/globals';
import { Test } from '@nestjs/testing';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const { ContratoService } = await import('./contrato.service.js');

describe('ContratoService', () => {
  let contratoService: InstanceType<typeof ContratoService>;
  let mockPrisma: {
    contrato: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    log_auditoria: {
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    mockPrisma = {
      contrato: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id_contrato: 7, dia_vencimiento: 5 }),
        update: jest
          .fn()
          .mockResolvedValue({ id_contrato: 7, dia_vencimiento: 15 }),
      },
      log_auditoria: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        ContratoService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    contratoService = module.get(ContratoService);
  });

  describe('asignarDiaVencimiento (CU-54)', () => {
    it('persist the new day and return the updated contract', async () => {
      const result = await contratoService.asignarDiaVencimiento(7, 15);

      expect(mockPrisma.contrato.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id_contrato: 7 },
          data: { dia_vencimiento: 15 },
        }),
      );
      expect(result).toEqual({ id_contrato: 7, dia_vencimiento: 15 });
    });

    it('record the change in log_auditoria with previous and new day', async () => {
      await contratoService.asignarDiaVencimiento(7, 15);

      expect(mockPrisma.log_auditoria.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accion: 'ASIGNAR_DIA_VENCIMIENTO',
          entidad_afectada: 'contrato',
          id_entidad_afectada: 7,
          valor_anterior: { dia_vencimiento: 5 },
          valor_nuevo: { dia_vencimiento: 15 },
        }),
      });
    });

    // Precondición del CU: "debe existir un contrato válido para configurar".
    it('throw NotFound and write nothing when the contract does not exist', async () => {
      mockPrisma.contrato.findUnique.mockResolvedValue(null);

      await expect(
        contratoService.asignarDiaVencimiento(999, 15),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.contrato.update).not.toHaveBeenCalled();
      expect(mockPrisma.log_auditoria.create).not.toHaveBeenCalled();
    });

    // CU-54 Excepción 3: "Error al guardar la configuración. El sistema informa que no fue
    // posible registrar el vencimiento."
    it('throw a 500 with the CU message when saving fails', async () => {
      mockPrisma.contrato.update.mockRejectedValue(new Error('db down'));

      await expect(
        contratoService.asignarDiaVencimiento(7, 15),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        contratoService.asignarDiaVencimiento(7, 15),
      ).rejects.toThrow('No fue posible registrar el vencimiento.');
    });

    // El día ya quedó guardado: un fallo de auditoría no debe convertirse en un 500 que
    // haga creer al administrador que el cambio no se aplicó.
    it('still succeed when writing the audit log fails', async () => {
      mockPrisma.log_auditoria.create.mockRejectedValue(
        new Error('audit table down'),
      );

      const result = await contratoService.asignarDiaVencimiento(7, 15);

      expect(result).toEqual({ id_contrato: 7, dia_vencimiento: 15 });
      expect(mockPrisma.contrato.update).toHaveBeenCalled();
    });

    it('not write to the audit log when saving fails', async () => {
      mockPrisma.contrato.update.mockRejectedValue(new Error('db down'));

      await expect(
        contratoService.asignarDiaVencimiento(7, 15),
      ).rejects.toThrow(InternalServerErrorException);

      expect(mockPrisma.log_auditoria.create).not.toHaveBeenCalled();
    });
  });
});
