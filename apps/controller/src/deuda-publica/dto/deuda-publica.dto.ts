import { z } from 'zod';
import { validateRut } from '../../common/utils/rut.js';

// CU-39: Consultar deuda pública por RUT
export const ConsultaDeudaRutDto = z.object({
  rut: z
    .string()
    .min(1, 'El RUT es requerido')
    .max(12)
    .refine((val) => /^\d{1,8}[\dkK]$/.test(val), {
      message: 'Formato inválido. Ej: 123456785',
    })
    .refine((val) => validateRut(val), {
      message: 'RUT inválido — dígito verificador incorrecto',
    }),
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
    codigo_abonado: number | null; // id_contrato como código de abonado
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
  dias_para_vencer: number | null; // null si ya está vencida
}
