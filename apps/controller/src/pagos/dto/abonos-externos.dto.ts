import { z } from 'zod';

// CU-46: incorporar un abono reportado por una entidad de recaudación externa.
// Identifica el contrato por codigo_abonado (= id_contrato, mismo patrón que
// deuda-publica.service.ts#consultarPorAbonado) — no por RUT, para no tener
// que resolver la ambigüedad de un cliente con varios contratos.
export const IncorporarAbonoExternoDto = z.object({
  codigo_abonado: z
    .number()
    .int('codigo_abonado debe ser un entero')
    .positive('codigo_abonado debe ser un entero positivo'),
  monto: z.number().positive('El monto debe ser mayor a 0'),
  fecha_pago: z
    .string()
    .datetime({ message: 'fecha_pago debe ser una fecha ISO 8601 válida' }),
  codigo_transaccion: z
    .string()
    .min(1, 'El código de transacción es requerido')
    .max(100),
  // Nombre de la entidad de recaudación externa (ej: "servipag", "webpay-oneclick")
  pasarela: z
    .string()
    .min(1, 'La pasarela/origen del abono es requerido')
    .max(30),
});
export type IncorporarAbonoExternoDto = z.infer<
  typeof IncorporarAbonoExternoDto
>;
