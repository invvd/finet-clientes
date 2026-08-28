/**
 * Estados de `factura` que cuentan como deuda pendiente de pago.
 *
 * Vive en `common` y no dentro de un servicio porque lo comparten la revisión de morosidad
 * (CU-47), la cartera vencida (CU-55, CU-56), el portal del cliente y la deuda pública: si
 * mañana se agrega un estado, no puede quedar uno de ellos con un criterio distinto.
 */
export const ESTADOS_IMPAGOS = ['pendiente', 'vencida'];
