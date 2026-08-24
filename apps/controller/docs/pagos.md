# Pagos (Núcleo de pago) — Incremento 2

Base URL: `http://localhost:4000/api`

**Interno/Administración** — requiere `X-API-Key` (`ADMIN_API_KEY`), igual que los endpoints de `/admin`. No es consumido por el frontend de clientes.

Implementa CU-44, CU-45 y (parcialmente) CU-46 — ver [`docs/CASOS-DE-USO.md`](../../../docs/CASOS-DE-USO.md) para el detalle de la spec y las excepciones. CU-52 (comprobante PDF) y CU-53 (envío por correo) todavía no están implementados.

---

## Diseño: por qué está desacoplado de la pasarela

Este incremento no depende de ninguna pasarela de pago (Webpay/Mercado Pago son CU-42/43, Incremento 3). El único emisor de confirmaciones hoy es la recaudación externa (CU-46), operada manualmente por un administrador vía este endpoint.

`PagosService.registrarPagoConfirmado()` recibe una forma de datos neutra (monto, fecha, código de transacción, factura, pasarela/origen) para que cuando se integre una pasarela real, el adaptador de esa pasarela solo tenga que traducir sus propios códigos de error a las excepciones que ya maneja este servicio — sin tocar el núcleo.

## 1. Registrar pago confirmado (CU-44 / CU-45 / CU-46)

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

## 2. Consultar intentos rechazados por código duplicado (CU-45)

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

La Excepción 1 de CU-44/CU-45 (datos incompletos o código de transacción ausente/corrupto) no genera un registro en `log_auditoria` — `ZodValidationPipe` la rechaza con un 400 antes de que el payload llegue al service, y en ese punto no hay `entidad_afectada` real que loguear.

No hay reintento automático implementado para las Excepciones de infraestructura (CU-44 Excepción 3, CU-45 Excepción 2) — el registro en `log_auditoria` es la trazabilidad para revisión manual; una cola de reintento queda pendiente si se necesita más adelante.

## Archivos clave

| Archivo | Propósito |
|---|---|
| `src/pagos/pagos.controller.ts` | `POST /admin/pagos/confirmar`, `GET /admin/pagos/rechazados` |
| `src/pagos/pagos.service.ts` | `registrarPagoConfirmado()` y `getPagosRechazados()` — CU-44/45, incidencias vía `log_auditoria` |
| `src/pagos/dto/pagos.dto.ts` | Validación Zod (`RegistrarPagoDto`) |
| `src/pagos/dto/pagos-rechazados.dto.ts` | Validación Zod de la query de `GET /rechazados` |

## Pendiente en este bloque

- **CU-46** (abonos de recaudación externa): el endpoint de confirmar es el mecanismo de ingesta, pero no hay todavía un flujo de carga masiva/batch — cada llamada registra un pago a la vez.
- **CU-52** (comprobante PDF) y **CU-53** (envío por correo, reusando `MailModule`): no implementados.
- **RF-33** (dependencia declarada de CU-45): no encontrado en ningún doc del repo — no se documentó su contenido para no inventarlo.
