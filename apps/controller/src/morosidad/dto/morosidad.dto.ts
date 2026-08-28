import { z } from 'zod';

// ─── CU-80: Configurar parámetros de detección de morosidad ───────────────────

/**
 * Rangos permitidos. La Excepción 2 del CU pide que el sistema "informe el rango válido e
 * impida guardarlo hasta que sea corregido", por eso los mensajes nombran el rango en vez
 * de decir solo "valor inválido".
 */
export const DIAS_GRACIA_MIN = 0;
export const DIAS_GRACIA_MAX = 90;
export const UMBRAL_SUSPENSION_MIN = 0;
/** Tope de la columna `DECIMAL(10,2)`: 8 dígitos enteros + 2 decimales. */
export const UMBRAL_SUSPENSION_MAX = 99_999_999.99;

export const ActualizarConfiguracionDto = z.object({
  dias_gracia: z
    .number()
    .int('Los días de gracia deben ser un número entero, sin decimales')
    .min(
      DIAS_GRACIA_MIN,
      `Los días de gracia deben estar entre ${DIAS_GRACIA_MIN} y ${DIAS_GRACIA_MAX}`,
    )
    .max(
      DIAS_GRACIA_MAX,
      `Los días de gracia deben estar entre ${DIAS_GRACIA_MIN} y ${DIAS_GRACIA_MAX}`,
    ),
  umbral_suspension: z
    .number()
    .min(
      UMBRAL_SUSPENSION_MIN,
      `El umbral de suspensión debe estar entre ${UMBRAL_SUSPENSION_MIN} y ${UMBRAL_SUSPENSION_MAX}`,
    )
    .max(
      UMBRAL_SUSPENSION_MAX,
      `El umbral de suspensión debe estar entre ${UMBRAL_SUSPENSION_MIN} y ${UMBRAL_SUSPENSION_MAX}`,
    ),
});
export type ActualizarConfiguracionDto = z.infer<
  typeof ActualizarConfiguracionDto
>;

/** Forma que devuelven los endpoints de configuración de CU-80. */
export type ConfiguracionMorosidadDto = {
  dias_gracia: number;
  umbral_suspension: number;
  fecha_actualizacion: string | null;
};

// ─── CU-55 / RF-40: Lista paginada de contratos con saldos vencidos ───────────

/** Mismos límites de paginación que `intentosFallidosQuerySchema` (CU-06). */
export const ContratosVencidosQueryDto = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ContratosVencidosQueryDto = z.infer<
  typeof ContratosVencidosQueryDto
>;

/**
 * Fila de la vista de control. Solo "la información relevante para seguimiento" que pide el
 * CU: a quién cobrar, cuánto y desde cuándo. El resto (plan, contacto, facturas una por una,
 * historial de pagos) es del detalle, CU-56.
 */
export type ContratoVencidoDto = {
  id_contrato: number;
  /** `cliente.rut` es nullable en el schema. */
  rut: string | null;
  nombre_completo: string | null;
  saldo_vencido: number;
  facturas_vencidas: number;
  /**
   * Días desde la factura impaga más antigua. Se deriva de `factura.fecha_limite_pago` y no
   * de `contrato.fecha_morosidad` para que la vista sirva aunque CU-47 no haya corrido.
   */
  dias_vencido: number;
};

/** Excepción 3 del CU (sin resultados) es `data: []` con `total: 0`, no un error. */
export type ContratosVencidosResponseDto = {
  data: ContratoVencidoDto[];
  total: number;
  page: number;
  limit: number;
};

// ─── CU-56 / RF-40: Detalle de un contrato vencido ────────────────────────────

export type FacturaDetalleDto = {
  id_factura: number;
  periodo: string;
  monto: number;
  fecha_limite_pago: string;
  estado: string;
  dias_vencida: number | null;
};

export type PagoDetalleDto = {
  id_pago: number;
  monto: number;
  fecha_pago: string;
  pasarela: string;
};

/** "el detalle del contrato con la información de deuda, historial de pagos y datos del cliente" */
export type DetalleContratoVencidoDto = {
  id_contrato: number;
  estado: string;
  dia_vencimiento: number;
  plan: string | null;
  cliente: {
    rut: string | null;
    nombre_completo: string;
    email: string | null;
    telefono: string | null;
  } | null;
  saldo_vencido: number;
  facturas: FacturaDetalleDto[];
  historial_pagos: PagoDetalleDto[];
};

// ─── CU-47 / RF-35: Revisión diaria automática de morosidad ───────────────────

/**
 * El CU pide "un log con hora de inicio, fin y cantidad de contratos procesados". Esta es
 * la forma de ese log, que además queda en `log_auditoria` para que el administrador pueda
 * revisarlo desde los paneles de control.
 */
export type ResultadoRevisionDto = {
  inicio: string;
  fin: string;
  /** Contratos con deuda pendiente que entraron a la revisión. */
  contratos_procesados: number;
  /** Contratos que pasaron a moroso en esta corrida. */
  contratos_marcados: number;
  /** Excepción 2: omitidos por no tener día de vencimiento válido (fuera de 1–28). */
  contratos_omitidos: number;
  /**
   * `id_contrato` de los marcados, para el detalle que revisa el administrador. Acotada a
   * una muestra: el total real está en `contratos_marcados`.
   */
  ids_marcados: number[];
  /** `true` si se marcaron más contratos de los que caben en `ids_marcados`. */
  ids_truncados: boolean;
};
