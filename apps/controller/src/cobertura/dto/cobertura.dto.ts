import { z } from 'zod';

/**
 * CU-60: filtro opcional de la capa de calor por tipo de cobertura.
 */
export const consultaPuntosCoberturaSchema = z.object({
  tipo_cobertura: z.string().max(20).optional(),
});
export type ConsultaPuntosCoberturaDto = z.infer<
  typeof consultaPuntosCoberturaSchema
>;

/**
 * Administración de puntos de cobertura (sin UI todavía — solo endpoints).
 */
export const crearPuntoCoberturaSchema = z.object({
  latitud: z.coerce.number().min(-90).max(90),
  longitud: z.coerce.number().min(-180).max(180),
  densidad_cobertura: z.coerce.number().min(0).max(999.99).optional(),
  tipo_cobertura: z.string().max(20).optional(),
  id_empresa: z.coerce.number().int().positive().optional(),
});
export type CrearPuntoCoberturaDto = z.infer<typeof crearPuntoCoberturaSchema>;

export const actualizarPuntoCoberturaSchema = crearPuntoCoberturaSchema
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Debe enviar al menos un campo para actualizar',
  });
export type ActualizarPuntoCoberturaDto = z.infer<
  typeof actualizarPuntoCoberturaSchema
>;

export const listarPuntosCoberturaSchema = z.object({
  tipo_cobertura: z.string().max(20).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(50),
});
export type ListarPuntosCoberturaDto = z.infer<
  typeof listarPuntosCoberturaSchema
>;

export const puntoCoberturaIdSchema = z.coerce.number().int().positive();

/** Fila cruda de `punto_cobertura` — solo endpoints de administración. */
export interface PuntoCoberturaResponseDto {
  id_punto: number;
  latitud: number;
  longitud: number;
  densidad_cobertura: number | null;
  tipo_cobertura: string | null;
}

/**
 * Celda del mapa de calor público. No lleva `id_punto` a propósito: es el
 * resultado de combinar polígonos y pincel sobre la grilla, no una fila de la
 * base, así que un id sería inventado.
 */
export interface PuntoMapaDto {
  latitud: number;
  longitud: number;
  densidad_cobertura: number;
  tipo_cobertura: string | null;
}

// --- Pincel ---------------------------------------------------------------

const latitudSchema = z.coerce.number().min(-90).max(90);
const longitudSchema = z.coerce.number().min(-180).max(180);

/** Tope por request: un trazo largo se parte en varios envios desde el editor. */
const MAX_CELDAS_POR_TRAZO = 5000;

const celdaPintadaSchema = z.object({
  latitud: latitudSchema,
  longitud: longitudSchema,
  densidad: z.coerce.number().min(0).max(100),
});

const celdaBorradaSchema = z.object({
  latitud: latitudSchema,
  longitud: longitudSchema,
});

/**
 * Un trazo del pincel: celdas a pintar y celdas a borrar en una sola operacion.
 * El backend redondea a la grilla antes de escribir — el editor manda las
 * coordenadas ya redondeadas, pero no se confia en eso.
 */
export const trazoPincelSchema = z
  .object({
    tipo_cobertura: z.string().max(20).optional(),
    id_empresa: z.coerce.number().int().positive().optional(),
    pintar: z.array(celdaPintadaSchema).max(MAX_CELDAS_POR_TRAZO).default([]),
    borrar: z.array(celdaBorradaSchema).max(MAX_CELDAS_POR_TRAZO).default([]),
  })
  .refine((body) => body.pintar.length > 0 || body.borrar.length > 0, {
    message: 'El trazo no contiene celdas para pintar ni borrar',
  });
export type TrazoPincelDto = z.infer<typeof trazoPincelSchema>;

export interface ResultadoTrazoDto {
  pintadas: number;
  borradas: number;
  total_celdas: number;
}

// --- Zonas (poligonos) ----------------------------------------------------

/** `[latitud, longitud]` — orden de Leaflet, no el `[lng, lat]` de GeoJSON. */
const verticeSchema = z.tuple([latitudSchema, longitudSchema]);

export const crearZonaCoberturaSchema = z.object({
  nombre: z.string().max(80).optional(),
  densidad_cobertura: z.coerce.number().min(0).max(100),
  tipo_cobertura: z.string().max(20).optional(),
  vertices: z
    .array(verticeSchema)
    .min(3, 'Un poligono necesita al menos 3 vertices')
    .max(500),
  activo: z.boolean().optional(),
  id_empresa: z.coerce.number().int().positive().optional(),
});
export type CrearZonaCoberturaDto = z.infer<typeof crearZonaCoberturaSchema>;

export const actualizarZonaCoberturaSchema = crearZonaCoberturaSchema
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Debe enviar al menos un campo para actualizar',
  });
export type ActualizarZonaCoberturaDto = z.infer<
  typeof actualizarZonaCoberturaSchema
>;

export const listarZonasCoberturaSchema = z.object({
  incluir_inactivas: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});
export type ListarZonasCoberturaDto = z.infer<
  typeof listarZonasCoberturaSchema
>;

export const zonaCoberturaIdSchema = z.coerce.number().int().positive();

export interface ZonaCoberturaResponseDto {
  id_zona: number;
  nombre: string | null;
  densidad_cobertura: number;
  tipo_cobertura: string | null;
  vertices: [number, number][];
  activo: boolean;
  fecha_actualizacion: string | null;
}

/**
 * CU-59 / CU-61 / CU-62: parámetros de inicialización del visor.
 * `zoom_min`/`zoom_max` acotan el rango de escala (CU-61) y `limites`
 * define el borde geográfico más allá del cual no se puede panear (CU-62).
 */
export interface VisorCoberturaConfigDto {
  centro: { latitud: number; longitud: number };
  zoom_inicial: number;
  zoom_min: number;
  zoom_max: number;
  limites: {
    sur_oeste: { latitud: number; longitud: number };
    nor_este: { latitud: number; longitud: number };
  };
}
