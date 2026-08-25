import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  AccionTicketDto,
  ActualizarTicketDto,
  TicketAsignadoDto,
  TicketDetalleDto,
  TicketsAsignadosResponseDto,
} from './dto/soporte.dto.js';

@Injectable()
export class SoporteService {
  private readonly logger = new Logger(SoporteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async getTicketsAsignados(
    idUsuario: number,
  ): Promise<TicketsAsignadosResponseDto> {
    await this.validarTecnico(idUsuario);

    const tickets = await this.prisma.ticket.findMany({
      where: { id_usuario_asignado: idUsuario },
      include: {
        categoria_falla: { select: { nombre: true } },
        cliente: { select: { nombre_completo: true } },
      },
      orderBy: { fecha_creacion: 'desc' },
    });

    const ticketsMapeados = tickets.map((ticket) => this.mapTicket(ticket));
    return {
      total: ticketsMapeados.length,
      tiene_tickets: ticketsMapeados.length > 0,
      tickets: ticketsMapeados,
    };
  }

  async getTicketDetalle(
    idTicket: number,
    idUsuario: number,
  ): Promise<TicketDetalleDto> {
    await this.validarTecnico(idUsuario);

    const ticket = await this.prisma.ticket.findFirst({
      where: { id_ticket: idTicket, id_usuario_asignado: idUsuario },
      include: {
        categoria_falla: { select: { nombre: true } },
        cliente: { select: { nombre_completo: true } },
      },
    });

    if (!ticket) {
      throw new ForbiddenException(
        'El ticket no esta asignado al tecnico seleccionado',
      );
    }

    return {
      ...this.mapTicket(ticket),
      historial: await this.getHistorial(idTicket),
    };
  }

  async actualizarTicket(
    idTicket: number,
    dto: ActualizarTicketDto,
  ): Promise<TicketDetalleDto> {
    await this.validarTecnico(dto.id_usuario);

    try {
      const resultado = await this.prisma.$transaction(async (tx) => {
        const ticket = await tx.ticket.findFirst({
          where: {
            id_ticket: idTicket,
            id_usuario_asignado: dto.id_usuario,
          },
          select: {
            id_ticket: true,
            estado: true,
            fecha_cierre: true,
          },
        });

        if (!ticket) {
          throw new ForbiddenException(
            'El ticket no esta asignado al tecnico seleccionado',
          );
        }

        if (ticket.estado === 'cerrado') {
          throw new BadRequestException('El ticket ya se encuentra cerrado');
        }

        const cambioEstado = ticket.estado !== dto.estado;
        const fechaCierre = dto.estado === 'cerrado' ? new Date() : null;
        const actualizado = await tx.ticket.update({
          where: { id_ticket: idTicket },
          data: { estado: dto.estado, fecha_cierre: fechaCierre },
          include: {
            categoria_falla: { select: { nombre: true } },
            cliente: {
              select: {
                id_cliente: true,
                nombre_completo: true,
                email: true,
              },
            },
          },
        });

        await tx.log_auditoria.create({
          data: {
            id_usuario: dto.id_usuario,
            accion:
              dto.estado === 'cerrado'
                ? 'CERRAR_TICKET_SOPORTE'
                : 'ACTUALIZAR_TICKET_SOPORTE',
            entidad_afectada: 'ticket',
            id_entidad_afectada: idTicket,
            valor_anterior: {
              estado: ticket.estado,
              fecha_cierre: ticket.fecha_cierre?.toISOString() ?? null,
            },
            valor_nuevo: {
              estado: dto.estado,
              fecha_cierre: fechaCierre?.toISOString() ?? null,
              detalle_accion: dto.accion,
            },
          },
        });

        return { actualizado, cambioEstado };
      });

      if (resultado.cambioEstado) {
        await this.notificarCambioEstado(resultado.actualizado, dto.accion);
      }

      return {
        ...this.mapTicket(resultado.actualizado),
        historial: await this.getHistorial(idTicket),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`No se pudo actualizar el ticket ${idTicket}`, error);
      throw new InternalServerErrorException(
        'No fue posible actualizar el ticket en este momento',
      );
    }
  }

  private async validarTecnico(idUsuario: number): Promise<void> {
    const tecnico = await this.prisma.usuario.findFirst({
      where: { id_usuario: idUsuario, activo: true },
      select: { id_usuario: true },
    });

    if (!tecnico) {
      throw new NotFoundException('Tecnico no encontrado o inactivo');
    }
  }

  private async getHistorial(idTicket: number): Promise<AccionTicketDto[]> {
    const registros = await this.prisma.log_auditoria.findMany({
      where: {
        entidad_afectada: 'ticket',
        id_entidad_afectada: idTicket,
      },
      select: {
        id_log: true,
        accion: true,
        valor_anterior: true,
        valor_nuevo: true,
        fecha_hora: true,
        usuario: { select: { nombre_completo: true } },
      },
      orderBy: { fecha_hora: 'asc' },
    });

    return registros.map((registro) => {
      const anterior = this.asRecord(registro.valor_anterior);
      const nuevo = this.asRecord(registro.valor_nuevo);
      return {
        id_log: registro.id_log.toString(),
        accion: registro.accion,
        detalle:
          typeof nuevo?.detalle_accion === 'string'
            ? nuevo.detalle_accion
            : registro.accion === 'CREAR_TICKET_PORTAL'
              ? 'Solicitud creada desde el portal de cliente'
              : registro.accion.replaceAll('_', ' ').toLocaleLowerCase('es'),
        estado_anterior:
          typeof anterior?.estado === 'string' ? anterior.estado : null,
        estado_nuevo: typeof nuevo?.estado === 'string' ? nuevo.estado : null,
        fecha_hora: registro.fecha_hora?.toISOString() ?? '',
        tecnico: registro.usuario?.nombre_completo ?? null,
      };
    });
  }

  private mapTicket(ticket: {
    id_ticket: number;
    codigo_seguimiento: string | null;
    estado: string;
    prioridad: string;
    descripcion: string | null;
    fecha_creacion: Date | null;
    fecha_cierre: Date | null;
    categoria_falla: { nombre: string };
    cliente: { nombre_completo: string } | null;
  }): TicketAsignadoDto {
    return {
      id_ticket: ticket.id_ticket,
      codigo_seguimiento: ticket.codigo_seguimiento,
      estado: ticket.estado,
      prioridad: ticket.prioridad,
      descripcion: ticket.descripcion,
      fecha_creacion: ticket.fecha_creacion?.toISOString() ?? '',
      fecha_cierre: ticket.fecha_cierre?.toISOString() ?? null,
      categoria: ticket.categoria_falla.nombre,
      cliente: ticket.cliente?.nombre_completo ?? null,
    };
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  }

  private async notificarCambioEstado(
    ticket: {
      id_ticket: number;
      codigo_seguimiento: string | null;
      estado: string;
      cliente: {
        id_cliente: number;
        nombre_completo: string;
        email: string | null;
      } | null;
    },
    accion: string,
  ): Promise<void> {
    if (!ticket.cliente) return;

    let estadoEnvio = 'omitido';
    if (ticket.cliente.email) {
      try {
        await this.mailService.sendTicketStatusChanged(
          ticket.cliente.email,
          ticket.cliente.nombre_completo,
          ticket.codigo_seguimiento ?? `Ticket #${ticket.id_ticket}`,
          ticket.estado,
          accion,
        );
        estadoEnvio = 'enviado';
      } catch (error) {
        estadoEnvio = 'fallido';
        this.logger.error(
          `No se pudo notificar el ticket ${ticket.id_ticket}`,
          error,
        );
      }
    }

    try {
      await this.prisma.log_notificacion.create({
        data: {
          id_cliente: ticket.cliente.id_cliente,
          canal: 'email',
          fecha_envio: new Date(),
          estado_envio: estadoEnvio,
        },
      });
    } catch (error) {
      this.logger.error(
        `No se pudo registrar la notificacion del ticket ${ticket.id_ticket}`,
        error,
      );
    }
  }
}
