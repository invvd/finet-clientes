import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SoporteService } from './soporte.service.js';

const FECHA = new Date('2026-08-24T10:00:00.000Z');
const TICKET = {
  id_ticket: 12,
  id_cliente: 1,
  codigo_seguimiento: 'FIN-2026-000012',
  estado: 'en_progreso',
  prioridad: 'media',
  descripcion: 'La conexion se interrumpe',
  fecha_creacion: FECHA,
  fecha_cierre: null,
  categoria_falla: { nombre: 'Conectividad' },
  cliente: {
    id_cliente: 1,
    nombre_completo: 'Juan Pérez',
    email: 'juan@example.com',
  },
};

describe('SoporteService', () => {
  let service: SoporteService;
  let prisma: jest.Mocked<PrismaService>;
  let mailService: jest.Mocked<MailService>;
  let mockPrisma: Record<string, any>;

  beforeEach(async () => {
    mockPrisma = {
      usuario: { findFirst: jest.fn() },
      ticket: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      log_auditoria: { findMany: jest.fn(), create: jest.fn() },
      log_notificacion: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    const mockMailService = { sendTicketStatusChanged: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        SoporteService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get(SoporteService);
    prisma = module.get(PrismaService);
    mailService = module.get(MailService);
    (prisma.usuario.findFirst as jest.Mock).mockResolvedValue({
      id_usuario: 7,
    });
    (prisma.log_auditoria.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.log_notificacion.create as jest.Mock).mockResolvedValue({});
    (mailService.sendTicketStatusChanged as jest.Mock).mockResolvedValue(
      undefined,
    );
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
        callback(mockPrisma),
    );
  });

  it('devuelve estado vacio si el tecnico no tiene tickets', async () => {
    (prisma.ticket.findMany as jest.Mock).mockResolvedValue([]);

    await expect(service.getTicketsAsignados(7)).resolves.toEqual({
      total: 0,
      tiene_tickets: false,
      tickets: [],
    });
  });

  it('impide consultar un ticket asignado a otro tecnico', async () => {
    (prisma.ticket.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(service.getTicketDetalle(12, 7)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('muestra descripcion, categoria e historial', async () => {
    (prisma.ticket.findFirst as jest.Mock).mockResolvedValue(TICKET);
    (prisma.log_auditoria.findMany as jest.Mock).mockResolvedValue([
      {
        id_log: 10n,
        accion: 'ACTUALIZAR_TICKET_SOPORTE',
        valor_anterior: { estado: 'abierto' },
        valor_nuevo: {
          estado: 'en_progreso',
          detalle_accion: 'Se contacto al cliente',
        },
        fecha_hora: FECHA,
        usuario: { nombre_completo: 'Ana Tecnica' },
      },
    ]);

    const result = await service.getTicketDetalle(12, 7);

    expect(result.descripcion).toBe('La conexion se interrumpe');
    expect(result.categoria).toBe('Conectividad');
    expect(result.historial[0]).toEqual(
      expect.objectContaining({
        detalle: 'Se contacto al cliente',
        estado_anterior: 'abierto',
        estado_nuevo: 'en_progreso',
      }),
    );
  });

  it('cierra con marca de tiempo, auditoria y notificacion', async () => {
    (prisma.ticket.findFirst as jest.Mock).mockResolvedValue({
      id_ticket: 12,
      estado: 'en_progreso',
      fecha_cierre: null,
    });
    (prisma.ticket.update as jest.Mock).mockImplementation(
      ({ data }: { data: { estado: string; fecha_cierre: Date } }) =>
        Promise.resolve({ ...TICKET, ...data }),
    );
    (prisma.log_auditoria.create as jest.Mock).mockResolvedValue({});

    const result = await service.actualizarTicket(12, {
      id_usuario: 7,
      estado: 'cerrado',
      accion: 'Se cambio el conector y la conexion quedo estable',
    });

    expect(result.estado).toBe('cerrado');
    expect(result.fecha_cierre).not.toBeNull();
    expect(prisma.log_auditoria.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        accion: 'CERRAR_TICKET_SOPORTE',
        valor_nuevo: expect.objectContaining({
          detalle_accion: 'Se cambio el conector y la conexion quedo estable',
        }),
      }),
    });
    expect(mailService.sendTicketStatusChanged).toHaveBeenCalledWith(
      'juan@example.com',
      'Juan Pérez',
      'FIN-2026-000012',
      'cerrado',
      'Se cambio el conector y la conexion quedo estable',
    );
  });

  it('impide modificar un ticket ya cerrado', async () => {
    (prisma.ticket.findFirst as jest.Mock).mockResolvedValue({
      id_ticket: 12,
      estado: 'cerrado',
      fecha_cierre: FECHA,
    });

    await expect(
      service.actualizarTicket(12, {
        id_usuario: 7,
        estado: 'cerrado',
        accion: 'Intento posterior',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
