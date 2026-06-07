import { z } from 'zod';

export const ConsultaPlanesDto = z.object({
  tipo_cliente: z.string().max(20).optional(),
});
export type ConsultaPlanesDto = z.infer<typeof ConsultaPlanesDto>;

export interface PlanResponseDto {
  id_plan: number;
  nombre_comercial: string;
  tipo_plan: string;
  tipo_cliente: string;
  velocidad_mbps: number | null;
  precio_mensual: number;
  descripcion: string | null;
}
