import { z } from 'zod';
import { validateRut } from '../../common/utils/rut.js';

// CU-39: Consultar deuda pública por RUT
export const consultaDeudaRutSchema = z.object({
  rut: z
    .string()
    .min(1, 'El RUT es requerido')
    .refine((val) => /^\d{1,3}(\.\d{3})*-[\dkK]$/.test(val), {
      message: 'Formato inválido. Ej: 12.345.678-5',
    })
    .refine((val) => validateRut(val), {
      message: 'RUT inválido — dígito verificador incorrecto',
    }),
});
export type ConsultaDeudaRutDto = z.infer<typeof consultaDeudaRutSchema>;

// CU-40: Consultar deuda pública por código de abonado
export const consultaDeudaAbonadoSchema = z.object({
  codigo_abonado: z
    .string()
    .min(1, 'El código de abonado es requerido')
    .regex(/^\d+$/, 'El código de abonado debe ser numérico'),
});
export type ConsultaDeudaAbonadoDto = z.infer<typeof consultaDeudaAbonadoSchema>;

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
