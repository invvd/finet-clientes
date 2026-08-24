import { z } from 'zod';

// CU-45: consultar el historial de intentos de registro rechazados por código duplicado
export const pagosRechazadosQuerySchema = z.object({
  codigo_transaccion: z.string().optional(),
  desde: z.string().optional(),
  hasta: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PagosRechazadosQueryDto = z.infer<
  typeof pagosRechazadosQuerySchema
>;

export interface PagoRechazadoDto {
  id_log: string;
  codigo_transaccion: string | null;
  id_factura: number | null;
  monto: number | null;
  pasarela: string | null;
  ip_origen: string | null;
  fecha: string | null;
}
