# Pagos (Núcleo de pago) — Incremento 2

Base URL: `http://localhost:4000/api`

**Interno/Administración** — requiere `X-API-Key` (`ADMIN_API_KEY`), igual que los endpoints de `/admin`. No es consumido por el frontend de clientes.

Implementa CU-44, CU-45 y CU-46 — ver [`docs/CASOS-DE-USO.md`](../../../docs/CASOS-DE-USO.md) para el detalle de la spec y las excepciones. CU-52 (comprobante PDF) y CU-53 (envío por correo) todavía no están implementados.

---

## Diseño: por qué está desacoplado de la pasarela

Este incremento no depende de ninguna pasarela de pago (Webpay/Mercado Pago son CU-42/43, Incremento 3). Los dos emisores de confirmaciones hoy son: alguien que ya conoce la factura exacta (`POST confirmar`, CU-44) y la recaudación externa, que solo conoce el contrato (`POST abonos-externos`, CU-46).

Ambos endpoints comparten un núcleo privado (`aplicarPago()` en `PagosService`) que crea el `pago` y marca la `factura` como pagada dentro de una misma transacción. Cuando se integre una pasarela real (CU-42/43), el adaptador de esa pasarela solo tendrá que resolver la factura/contrato a su manera y llamar a este mismo núcleo — sin duplicar la lógica de aplicar el pago.

> **Fix retroactivo (CU-44):** hasta esta implementación de CU-46, `registrarPagoConfirmado` solo creaba el `pago` y **nunca actualizaba `factura.estado`** — el saldo calculado en `portal.service.ts`/`deuda-publica.service.ts` (que filtra `factura.estado IN ('pendiente','vencida')`) no reflejaba ningún pago registrado. Se corrigió al extraer `aplicarPago()`, que ahora marca la factura como `'pagada'` dentro de la misma transacción que crea el `pago`. Es un valor de estado nuevo y seguro: los dos lugares que leen `factura.estado` usan filtros de inclusión, no un enum exhaustivo.

## 1. Registrar pago confirmado (CU-44 / CU-45)

```
POST /api/admin/pagos/confirmar
X-API-Key: <ADMIN_API_KEY>
Content-Type: application/json
```

**Body:**

```json
{
  "id_factura": 201,
  "monto": 19990,
  "fecha_pago": "2026-06-10T12:00:00.000Z",
  "codigo_transaccion": "TX-0001",
  "pasarela": "recaudacion-externa",
  "token_transaccional": null
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `id_factura` | number | Sí | Factura a la que se asocia el pago — de ahí se resuelve el contrato/cliente (CU-44 Excepción 2) |
| `monto` | number | Sí | Monto del pago, mayor a 0 |
| `fecha_pago` | string (ISO 8601) | Sí | Fecha/hora en que la entidad recaudadora confirmó la transacción |
| `codigo_transaccion` | string | Sí | Código de autorización — único (CU-45). Máx 100 caracteres |
| `pasarela` | string | Sí | Origen del pago: `recaudacion-externa` hoy, `webpay`/`mercadopago` cuando lleguen CU-42/43 |
| `token_transaccional` | string | No | Token devuelto por la pasarela, si aplica |

**Respuesta 201:**

```json
{
  "id_pago": 1,
  "id_factura": 201,
  "id_cliente": 5,
  "monto": 19990,
  "fecha_pago": "2026-06-10T12:00:00.000Z",
  "codigo_transaccion": "TX-0001",
  "pasarela": "recaudacion-externa"
}
```

**Errores:**

| HTTP | Causa | Excepción |
|---|---|---|
| 400 | Validation failed — payload incompleto o mal formado, incluye `codigo_transaccion` ausente/corrupto | CU-44 Excepción 1 / CU-45 Excepción 1 |
| 401 | Falta `X-API-Key`, key inválida, o `ADMIN_API_KEY` no configurado | — |
| 409 | `codigo_transaccion` ya registrado (pago duplicado) — detectado antes del insert o por condición de carrera vía la constraint `@unique` de la DB | CU-45 |
| 422 | La factura no existe o no tiene contrato/cliente asociado — no se pudo determinar a quién aplicar el pago | CU-44 Excepción 2 |
| 500 | Falla al persistir el pago | CU-44 Excepción 3 |
| 503 | No se pudo consultar el historial de pagos para verificar duplicados | CU-45 Excepción 2 |

## 2. Incorporar abono de recaudación externa (CU-46)

```
POST /api/admin/pagos/abonos-externos
X-API-Key: <ADMIN_API_KEY>
Content-Type: application/json
```

**Body:**

```json
{
  "codigo_abonado": 100,
  "monto": 19990,
  "fecha_pago": "2026-06-10T12:00:00.000Z",
  "codigo_transaccion": "EXT-0001",
  "pasarela": "servipag"
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `codigo_abonado` | number | Sí | = `id_contrato`. Identifica el contrato del reporte externo (CU-46 Excepción 1) — mismo patrón que `GET /deuda-publica/abonado` (CU-40). No acepta RUT: un RUT puede tener varios contratos y "el contrato asociado" de la spec es singular |
| `monto` | number | Sí | Debe calzar **exacto** con la factura pendiente/vencida más antigua del contrato — no hay pagos parciales en el schema (CU-46 Excepción 2) |
| `fecha_pago` | string (ISO 8601) | Sí | Fecha/hora del abono según el recaudador |
| `codigo_transaccion` | string | Sí | Código de autorización del recaudador — único (CU-45), mismo chequeo que `POST confirmar` |
| `pasarela` | string | Sí | Nombre del recaudador externo (ej. `servipag`) |

**Respuesta 201:** igual forma que `POST confirmar`.

**Errores:**

| HTTP | Causa | Excepción |
|---|---|---|
| 400 | Validation failed, o el contrato no tiene factura pendiente/vencida, o el monto no calza exacto con ella | CU-46 Excepción 2 (rechazo directo, sin incidencia — mismo criterio que la Excepción 1 de CU-44/45) |
| 401 | Falta `X-API-Key`, key inválida, o `ADMIN_API_KEY` no configurado | — |
| 409 | `codigo_transaccion` ya registrado | CU-45 |
| 422 | `codigo_abonado` no resuelve a un contrato/cliente válido — queda pendiente de revisión | CU-46 Excepción 1 |
| 500 | Falla al aplicar la transacción (crear el pago + marcar la factura pagada) | CU-46 Excepción 3 |
| 503 | No se pudo consultar el historial de pagos para verificar duplicados | CU-45 Excepción 2 |

> Nota de alcance: si un cliente tiene varios contratos y se quiere que **elija cuál pagar desde el frontend**, eso es una pantalla distinta, no parte de CU-46 — este endpoint asume que el reporte del recaudador ya trae resuelto el `codigo_abonado` (el cliente lo dio al pagar físicamente). Queda como observación para un CU futuro no cubierto en el documento de requisitos.

## 3. Consultar intentos rechazados por código duplicado (CU-45)

```
GET /api/admin/pagos/rechazados
X-API-Key: <ADMIN_API_KEY>
```

**Query params (todos opcionales):**

| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `codigo_transaccion` | string | — | Filtra por el código de transacción exacto del intento rechazado |
| `desde` | string (fecha) | — | Intentos desde esta fecha (`YYYY-MM-DD`) |
| `hasta` | string (fecha) | — | Intentos hasta esta fecha (`YYYY-MM-DD`) |
| `page` | number | 1 | Número de página |
| `limit` | number | 20 | Resultados por página (máx 100) |

**Respuesta 200:**

```json
{
  "data": [
    {
      "id_log": "10",
      "codigo_transaccion": "TX-0001",
      "id_factura": 201,
      "monto": 19990,
      "pasarela": "recaudacion-externa",
      "ip_origen": "127.0.0.1",
      "fecha": "2026-06-10T12:05:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

Lee `log_auditoria` filtrando por `accion = 'PAGO_INCIDENCIA_DUPLICADO_RECHAZADO'` — no hay una tabla propia. El filtro por `codigo_transaccion` usa un filtro JSON de Postgres sobre `valor_nuevo.payload.codigo_transaccion` (Prisma `path`/`equals`); no está ejercitado contra una base real todavía, solo con Prisma mockeado en los tests unitarios.

## Trazabilidad de incidencias

Todas las excepciones de negocio (menos la Excepción 1, ver abajo) quedan registradas en `log_auditoria` (no en una tabla dedicada — decisión explícita para no agregar schema nuevo en este incremento, ver [`CONTRIBUTING.md`](../../../CONTRIBUTING.md) para el criterio). Esto es lo que permite que, como pide CU-45, **el administrador pueda consultar el historial y verificar los intentos de registro rechazados por código duplicado** (endpoint arriba):

| `accion` | Cuándo |
|---|---|
| `PAGO_REGISTRADO` | Pago persistido correctamente |
| `PAGO_INCIDENCIA_CUENTA_NO_DETERMINADA` | CU-44 Excepción 2 — la factura no resolvió a un contrato/cliente válido |
| `PAGO_INCIDENCIA_ERROR_PERSISTENCIA` | CU-44 Excepción 3 — falló el insert en `pago` |
| `PAGO_INCIDENCIA_DUPLICADO_RECHAZADO` | CU-45 — código de transacción duplicado, detectado antes del insert o por condición de carrera |
| `PAGO_INCIDENCIA_HISTORIAL_NO_CONSULTABLE` | CU-45 Excepción 2 — falló la consulta de unicidad antes de siquiera intentar el registro |
| `PAGO_INCIDENCIA_ABONO_CLIENTE_NO_IDENTIFICADO` | CU-46 Excepción 1 — `codigo_abonado` no resolvió a un contrato/cliente válido |
| `PAGO_INCIDENCIA_ABONO_ERROR_ACTUALIZAR_SALDO` | CU-46 Excepción 3 — falló la transacción de aplicar el abono |

La Excepción 1 de CU-44/CU-45 (datos incompletos o código de transacción ausente/corrupto) no genera un registro en `log_auditoria` — `ZodValidationPipe` la rechaza con un 400 antes de que el payload llegue al service, y en ese punto no hay `entidad_afectada` real que loguear.

No hay reintento automático implementado para las Excepciones de infraestructura (CU-44 Excepción 3, CU-45 Excepción 2) — el registro en `log_auditoria` es la trazabilidad para revisión manual; una cola de reintento queda pendiente si se necesita más adelante.

## Archivos clave

| Archivo | Propósito |
|---|---|
| `src/pagos/pagos.controller.ts` | `POST /admin/pagos/confirmar`, `POST /admin/pagos/abonos-externos`, `GET /admin/pagos/rechazados` |
| `src/pagos/pagos.service.ts` | `registrarPagoConfirmado()` (CU-44), `incorporarAbonoExterno()` (CU-46), `aplicarPago()` (núcleo compartido), `getPagosRechazados()` (CU-45) |
| `src/pagos/dto/pagos.dto.ts` | Validación Zod (`RegistrarPagoDto`) |
| `src/pagos/dto/abonos-externos.dto.ts` | Validación Zod (`IncorporarAbonoExternoDto`) |
| `src/pagos/dto/pagos-rechazados.dto.ts` | Validación Zod de la query de `GET /rechazados` |

## Pendiente en este bloque

- **CU-46**: cada llamada incorpora un abono a la vez — no hay todavía un flujo de carga masiva/batch (un reporte con múltiples abonos en una sola request).
- **CU-52** (comprobante PDF) y **CU-53** (envío por correo, reusando `MailModule`): no implementados.
- **RF-33/RF-34** (dependencias declaradas de CU-45/CU-46): no encontradas en ningún doc del repo — no se documentó su contenido para no inventarlo.
- **Pantalla de "elegir contrato a pagar"**: mencionada al planificar CU-46, pero es una feature de frontend distinta — no cubierta por ningún CU del documento de requisitos.
