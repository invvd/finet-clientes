import { z } from 'zod';

// CU-39: Consultar deuda pública por RUT
export const ConsultaDeudaRutDto = z.object({
  rut: z
    .string()
    .min(1, 'El RUT es requerido')
    .max(12)
    .regex(/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$|^\d{7,8}-[\dkK]$/,
      'Formato de RUT inválido. Use 12.345.678-9 o 12345678-9'),
});
export type ConsultaDeudaRutDto = z.infer<typeof ConsultaDeudaRutDto>;

// CU-40: Consultar deuda pública por código de abonado
export const ConsultaDeudaAbonado = z.object({
  codigo_abonado: z
    .string()
    .min(1, 'El código de abonado es requerido')
    .max(20),
});
export type ConsultaDeudaAbonado = z.infer<typeof ConsultaDeudaAbonado>;

// ─── Respuesta compartida CU-39 / CU-40 / CU-41 ─────────────────────────────
export interface DeudaPublicaResponseDto {
  encontrado: boolean;
  cliente: {
    nombre_completo: string;
    rut: string | null;
    codigo_abonado: number | null;  // id_contrato como código de abonado
  } | null;
  tiene_deuda: boolean;
  saldo_total: number;
  facturas: DetalleFacturaPublicaDto[];
}

// CU-41: Detalle de deuda y fecha de vencimiento
export interface DetalleFacturaPublicaDto {
  id_factura: number;
  periodo: string;
  monto: number;
  fecha_limite_pago: string;
  estado: string;
  dias_vencida: number | null;
  dias_para_vencer: number | null;  // null si ya está vencida
}
