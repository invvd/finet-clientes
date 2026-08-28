import { z } from 'zod';

// ─── CU-54 / RF-39: Asignar día de vencimiento fijo a un contrato ─────────────

/**
 * El tope de 28 es del CU: "el sistema valida que el valor sea un entero entre 1 y 28 para
 * evitar conflictos con meses cortos". Un día 29, 30 o 31 no existe en todos los meses, así
 * que el vencimiento quedaría indefinido en febrero.
 */
export const DIA_VENCIMIENTO_MIN = 1;
export const DIA_VENCIMIENTO_MAX = 28;

export const AsignarDiaVencimientoDto = z.object({
  dia_vencimiento: z
    .number()
    .int('El día de vencimiento debe ser un número entero, sin decimales')
    .min(
      DIA_VENCIMIENTO_MIN,
      `El día de vencimiento debe estar entre ${DIA_VENCIMIENTO_MIN} y ${DIA_VENCIMIENTO_MAX}`,
    )
    .max(
      DIA_VENCIMIENTO_MAX,
      `El día de vencimiento debe estar entre ${DIA_VENCIMIENTO_MIN} y ${DIA_VENCIMIENTO_MAX}`,
    ),
});
export type AsignarDiaVencimientoDto = z.infer<typeof AsignarDiaVencimientoDto>;

/** Forma que devuelve el endpoint de CU-54. */
export type ContratoVencimientoDto = {
  id_contrato: number;
  dia_vencimiento: number;
};
