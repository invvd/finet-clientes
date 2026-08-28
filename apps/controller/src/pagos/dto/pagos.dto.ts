import { z } from 'zod';

// ─── CU-44/CU-46: Registrar pago confirmado por la entidad recaudadora ────────
// id_factura es el "identificador" que la spec de CU-44 pide para asociar el
// pago a la cuenta/contrato correspondiente (CU-44 Excepción 2).
export const RegistrarPagoDto = z.object({
  id_factura: z
    .number()
    .int('id_factura debe ser un entero')
    .positive('id_factura debe ser un entero positivo'),
  monto: z.number().positive('El monto debe ser mayor a 0'),
  fecha_pago: z
    .string()
    .datetime({ message: 'fecha_pago debe ser una fecha ISO 8601 válida' }),
  // CU-45: código de autorización/transacción — debe ser único (ver pago.codigo_transaccion @unique)
  codigo_transaccion: z
    .string()
    .min(1, 'El código de transacción es requerido')
    .max(100),
  // Origen del pago: nombre de la pasarela (CU-42/43) o del recaudador externo (CU-46)
  pasarela: z
    .string()
    .min(1, 'La pasarela/origen del pago es requerido')
    .max(30),
  token_transaccional: z.string().max(200).optional(),
});
export type RegistrarPagoDto = z.infer<typeof RegistrarPagoDto>;

// ─── Respuesta ─────────────────────────────────────────────────────────────
export interface PagoResponseDto {
  id_pago: number;
  id_factura: number | null;
  id_cliente: number | null;
  monto: number;
  fecha_pago: string;
  codigo_transaccion: string | null;
  pasarela: string;
  // CU-52: null si el comprobante todavía no se generó (ver Excepción 1/2) —
  // la generación nunca falla la respuesta del pago en sí.
  comprobante_pdf_url: string | null;
}
