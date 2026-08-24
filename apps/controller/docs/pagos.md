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

| HTTP | Causa | Excepción CU-44 |
|---|---|---|
| 400 | Validation failed — payload incompleto o mal formado | Excepción 1 |
| 401 | Falta `X-API-Key`, key inválida, o `ADMIN_API_KEY` no configurado | — |
| 409 | `codigo_transaccion` ya registrado (pago duplicado) | CU-45 |
| 422 | La factura no existe o no tiene contrato/cliente asociado — no se pudo determinar a quién aplicar el pago | Excepción 2 |
| 500 | Falla al persistir el pago | Excepción 3 |

## Trazabilidad de incidencias

Las Excepciones 2 y 3 de CU-44 quedan registradas en `log_auditoria` (no en una tabla dedicada — decisión explícita para no agregar schema nuevo en este incremento, ver [`CONTRIBUTING.md`](../../../CONTRIBUTING.md) para el criterio):

| `accion` | Cuándo |
|---|---|
| `PAGO_REGISTRADO` | Pago persistido correctamente |
| `PAGO_INCIDENCIA_CUENTA_NO_DETERMINADA` | Excepción 2 — la factura no resolvió a un contrato/cliente válido |
| `PAGO_INCIDENCIA_ERROR_PERSISTENCIA` | Excepción 3 — falló el insert en `pago` |

La Excepción 1 (datos incompletos) no genera un registro en `log_auditoria` — `ZodValidationPipe` la rechaza con un 400 antes de que el payload llegue al service, y en ese punto no hay `entidad_afectada` real que loguear.

No hay reintento automático implementado para la Excepción 3 — el registro en `log_auditoria` es la trazabilidad para revisión manual; una cola de reintento queda pendiente si se necesita más adelante.

## Archivos clave

| Archivo | Propósito |
|---|---|
| `src/pagos/pagos.controller.ts` | Endpoint `POST /admin/pagos/confirmar` |
| `src/pagos/pagos.service.ts` | `registrarPagoConfirmado()` — CU-44/45, incidencias vía `log_auditoria` |
| `src/pagos/dto/pagos.dto.ts` | Validación Zod (`RegistrarPagoDto`) |

## Pendiente en este bloque

- **CU-46** (abonos de recaudación externa): este endpoint es el mecanismo de ingesta, pero no hay todavía un flujo de carga masiva/batch — cada llamada registra un pago a la vez.
- **CU-52** (comprobante PDF) y **CU-53** (envío por correo, reusando `MailModule`): no implementados.
