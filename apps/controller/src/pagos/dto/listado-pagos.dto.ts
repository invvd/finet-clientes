import { z } from 'zod';

// CU-52: historial de transacciones exitosas, para que el administrador
// pueda llegar al comprobante generado de cualquier pago.
export const listadoPagosQuerySchema = z.object({
  desde: z.string().optional(),
  hasta: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListadoPagosQueryDto = z.infer<typeof listadoPagosQuerySchema>;

export interface PagoListadoDto {
  id_pago: number;
  id_factura: number | null;
  id_cliente: number | null;
  monto: number;
  fecha_pago: string;
  codigo_transaccion: string | null;
  pasarela: string;
  comprobante_pdf_url: string | null;
}
