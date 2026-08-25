import { z } from 'zod';

const fechaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe usar el formato AAAA-MM-DD')
  .refine(
    (fecha) => {
      const parsed = new Date(`${fecha}T00:00:00.000Z`);
      return (
        !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === fecha
      );
    },
    { message: 'La fecha no es valida' },
  );

export const reporteFinancieroQuerySchema = z
  .object({
    desde: fechaSchema,
    hasta: fechaSchema,
  })
  .strict()
  .refine((rango) => rango.desde <= rango.hasta, {
    message: 'La fecha inicial no puede ser posterior a la fecha final',
    path: ['hasta'],
  });

export type ReporteFinancieroQueryDto = z.infer<
  typeof reporteFinancieroQuerySchema
>;

export interface ReporteFinancieroDto {
  periodo: { desde: string; hasta: string };
  generado_en: string;
  resumen: {
    total_ingresos: number;
    total_deudas: number;
    cantidad_pagos: number;
    cantidad_facturas_pendientes: number;
  };
  ingresos: Array<{
    id_pago: number;
    fecha_pago: string;
    monto: number;
    pasarela: string;
    cliente: string | null;
  }>;
  deudas: Array<{
    id_factura: number;
    periodo: string;
    fecha_emision: string | null;
    fecha_limite_pago: string;
    monto: number;
    estado: string;
    cliente: string | null;
  }>;
}
