import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { ApiKeyGuard } from '../admin/guards/api-key.guard.js';
import { SoporteController } from './soporte.controller.js';
import { SoporteService } from './soporte.service.js';

describe('SoporteController', () => {
  let controller: SoporteController;
  let service: jest.Mocked<SoporteService>;

  beforeEach(async () => {
    const mockService = {
      getTicketsAsignados: jest.fn().mockResolvedValue({
        total: 0,
        tiene_tickets: false,
        tickets: [],
      }),
      getTicketDetalle: jest.fn().mockResolvedValue({ id_ticket: 12 }),
      actualizarTicket: jest.fn().mockResolvedValue({ id_ticket: 12 }),
    };

    const module = await Test.createTestingModule({
      controllers: [SoporteController],
      providers: [{ provide: SoporteService, useValue: mockService }],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(SoporteController);
    service = module.get(SoporteService);
  });

  it('lista los tickets del tecnico indicado', async () => {
    await controller.getTicketsAsignados({ id_usuario: 7 });
    expect(service.getTicketsAsignados).toHaveBeenCalledWith(7);
  });

  it('consulta el detalle con ticket y tecnico', async () => {
    await controller.getTicketDetalle(12, { id_usuario: 7 });
    expect(service.getTicketDetalle).toHaveBeenCalledWith(12, 7);
  });

  it('actualiza el ticket con la accion registrada', async () => {
    const body = {
      id_usuario: 7,
      estado: 'cerrado' as const,
      accion: 'Conexion restablecida',
    };

    await controller.actualizarTicket(12, body);

    expect(service.actualizarTicket).toHaveBeenCalledWith(12, body);
  });
});
