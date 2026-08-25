import { z } from 'zod';

export const tecnicoQuerySchema = z
  .object({
    id_usuario: z.coerce
      .number()
      .int()
      .positive('El tecnico seleccionado no es valido'),
  })
  .strict();

export type TecnicoQueryDto = z.infer<typeof tecnicoQuerySchema>;

export const ticketIdSchema = z.coerce
  .number()
  .int()
  .positive('El ticket no es valido');

export const actualizarTicketSchema = z
  .object({
    id_usuario: z.number().int().positive('El tecnico no es valido'),
    estado: z.enum(['abierto', 'en_progreso', 'cerrado']),
    accion: z
      .string()
      .trim()
      .min(1, 'Registra la accion realizada')
      .max(2000, 'La accion no puede superar los 2000 caracteres'),
  })
  .strict();

export type ActualizarTicketDto = z.infer<typeof actualizarTicketSchema>;

export interface TicketAsignadoDto {
  id_ticket: number;
  codigo_seguimiento: string | null;
  estado: string;
  prioridad: string;
  descripcion: string | null;
  fecha_creacion: string;
  fecha_cierre: string | null;
  categoria: string;
  cliente: string | null;
}

export interface AccionTicketDto {
  id_log: string;
  accion: string;
  detalle: string;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  fecha_hora: string;
  tecnico: string | null;
}

export interface TicketDetalleDto extends TicketAsignadoDto {
  historial: AccionTicketDto[];
}

export interface TicketsAsignadosResponseDto {
  total: number;
  tiene_tickets: boolean;
  tickets: TicketAsignadoDto[];
}
